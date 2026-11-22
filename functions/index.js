import express from 'express'
import { pipeline } from 'node:stream/promises'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { onRequest } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { error as logError, warn } from 'firebase-functions/logger'
import { ApiError, DAY, GIB, disposition, hash, makeCode, normalizeCode,
  ownerMatches, validCode, validFile, validId, validOwner, validateDraft } from './protocol.js'

const PROJECT = process.env.GCLOUD_PROJECT || 'sendsnippet'
const BUCKET = 'sendsnippet-transfer-eu'
const REGION = 'europe-west1'
const EMULATOR = process.env.FUNCTIONS_EMULATOR === 'true'
const GRACE = 20 * 60_000
const MISSING = 'This transfer is unavailable. It may have expired, been removed, or still be uploading.'
const runtime = PROJECT === 'sendsnippet'
  ? { serviceAccount: 'sendsnippet-transfer@sendsnippet.iam.gserviceaccount.com' }
  : {}
const firebase = initializeApp({ projectId: PROJECT, storageBucket: BUCKET })
const db = getFirestore(firebase)
const auth = getAuth(firebase)
const bucket = getStorage(firebase).bucket()
const transfers = db.collection('ssTransfers')
const codes = db.collection('ssCodes')
const quotas = db.collection('ssQuota')
const object = (id, file) => bucket.file('sendsnippet-v2/' + id + '/' + file)
const app = express()
app.disable('x-powered-by')
app.use((req, res, next) => {
  res.set('Cache-Control', 'private, no-store')
  res.set('Referrer-Policy', 'no-referrer')
  next()
})

function quotaRefs(req, group, now, window) {
  const period = Math.floor(now / window)
  const ip = hash(period + ':' + (req.ip || 'unknown')).slice(0, 32)
  return [quotas.doc(group + '-' + period + '-' + ip), quotas.doc(group + '-' + period)]
}

function charge(tx, snap, bytes, maxCount, maxBytes, expires) {
  const count = (snap.get('count') ?? 0) + 1
  const total = (snap.get('bytes') ?? 0) + bytes
  if (count > maxCount || total > maxBytes) {
    throw new ApiError(429, 'The transfer limit has been reached. Try again later.')
  }
  tx.set(snap.ref, { count, bytes: total, purgeAt: Timestamp.fromMillis(expires) })
}

async function limitAccess(req, group, perIp, global, bytes = 0, maxBytes = Infinity) {
  const now = Date.now()
  const window = group === 'download' ? DAY : 10 * 60_000
  const expires = (Math.floor(now / window) + 1) * window + GRACE
  await db.runTransaction(async tx => {
    const [ip, all] = await tx.getAll(...quotaRefs(req, group, now, window))
    charge(tx, ip, bytes, perIp, Infinity, expires)
    charge(tx, all, bytes, global, maxBytes, expires)
  })
}

function ownerArgs(body) {
  if (!validId(body?.id) || !validOwner(body?.owner)) throw new ApiError(400, 'Invalid transfer credentials.')
  return transfers.doc(body.id)
}

function owned(snap, owner) {
  const data = snap.data()
  if (!data || !ownerMatches(owner, data.ownerHash)) throw new ApiError(404, MISSING)
  return data
}

function current(data) {
  if (!data || data.expiresAt <= Date.now() || !['draft', 'ready'].includes(data.state)) {
    throw new ApiError(404, MISSING)
  }
  return data
}

function receipt(id, data, sender = false) {
  const item = { id, text: data.text, files: data.files, expiresAt: data.expiresAt }
  return sender ? { ...item, code: data.code } : item
}

async function uploadState(id, data) {
  if (data.state === 'ready') return { transfer: receipt(id, data, true) }
  const missing = await missingFiles(id, data.files)
  const token = missing.length ? await auth.createCustomToken('ss-' + id, {
    ssId: id, ssUntil: data.expiresAt,
    ssSizes: Object.fromEntries(data.files.map(file => [file.id, file.size])),
  }) : null
  return { missing, token }
}

async function missingFiles(id, files) {
  const checked = await Promise.all(files.map(async file => {
    try {
      const [meta] = await object(id, file.id).getMetadata()
      return Number(meta.size) === file.size && meta.contentType === 'application/octet-stream' ? null : file.id
    } catch (err) {
      if (Number(err.code) === 404) return file.id
      throw err
    }
  }))
  return checked.filter(id => id !== null)
}

async function create(req) {
  const { id, owner, text, lifetime, files, total } = validateDraft(req.body)
  const ref = transfers.doc(id)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode()
    const codeRef = codes.doc(code)
    const now = Date.now()
    const data = await db.runTransaction(async tx => {
      const [existing, reservation, ip, global] = await tx.getAll(ref, codeRef, ...quotaRefs(req, 'send', now, DAY))
      if (existing.exists) return current(owned(existing, owner))
      if (reservation.exists) return null
      const quotaExpires = (Math.floor(now / DAY) + 1) * DAY + GRACE
      charge(tx, ip, total, 35, 50 * GIB, quotaExpires)
      charge(tx, global, total, 1200, 200 * GIB, quotaExpires)
      const expiresAt = now + (files.length ? DAY : lifetime * 60_000)
      const transfer = {
        state: files.length ? 'draft' : 'ready', code, text, files, lifetime,
        ownerHash: hash(owner), expiresAt, purgeAt: Timestamp.fromMillis(expiresAt + GRACE),
      }
      tx.create(ref, transfer)
      tx.create(codeRef, { id })
      return transfer
    })
    if (data) return uploadState(id, data)
  }
  throw new ApiError(503, 'Could not reserve a code. Try again.')
}

async function complete(req) {
  const ref = ownerArgs(req.body)
  const data = current(owned(await ref.get(), req.body.owner))
  if (data.state === 'ready') return receipt(ref.id, data, true)
  if ((await missingFiles(ref.id, data.files)).length) {
    throw new ApiError(409, 'Some files are still uploading. Resume the transfer and try again.')
  }
  await Promise.all(data.files.map(file => object(ref.id, file.id).setMetadata({
    cacheControl: 'private, no-store',
    contentEncoding: null,
    metadata: { firebaseStorageDownloadTokens: null },
  })))
  return db.runTransaction(async tx => {
    const latest = current(owned(await tx.get(ref), req.body.owner))
    if (latest.state === 'ready') return receipt(ref.id, latest, true)
    const expiresAt = Date.now() + latest.lifetime * 60_000
    tx.update(ref, { state: 'ready', expiresAt, purgeAt: Timestamp.fromMillis(expiresAt + GRACE) })
    return receipt(ref.id, { ...latest, expiresAt }, true)
  })
}

async function findTransfer(body) {
  const code = normalizeCode(body?.code)
  let id = body?.id
  if (!validId(id) && validCode(code)) id = (await codes.doc(code).get()).get('id')
  if (!validId(id)) throw new ApiError(404, MISSING)
  const data = (await transfers.doc(id).get()).data()
  if (data?.state !== 'ready' || data.expiresAt <= Date.now()) throw new ApiError(404, MISSING)
  return [id, data]
}

async function receive(req) {
  await limitAccess(req, 'receive', 120, 12_000)
  const [id, data] = await findTransfer(req.body)
  return receipt(id, data)
}

async function ticket(req) {
  if (!validFile(req.body?.file) || !validId(req.body?.id)) throw new ApiError(400, 'Choose a file to download.')
  const [id, data] = await findTransfer(req.body)
  const file = data.files.find(file => file.id === req.body.file)
  if (!file) throw new ApiError(404, 'This file is unavailable.')
  await limitAccess(req, 'download', 500, 8000, file.size, 800 * GIB)
  if (EMULATOR) return { url: '/api/local-file/' + id + '/' + file.id }
  const [url] = await object(id, file.id).getSignedUrl({
    version: 'v4', action: 'read', expires: Math.min(Date.now() + 15 * 60_000, data.expiresAt),
    responseDisposition: disposition(file.name),
    responseType: 'application/octet-stream',
  })
  return { url }
}

async function deleteFiles(id, data) {
  await Promise.all(data.files.map(file => object(id, file.id).delete({ ignoreNotFound: true })))
}

async function revoke(req) {
  const ref = ownerArgs(req.body)
  const data = await db.runTransaction(async tx => {
    const latest = owned(await tx.get(ref), req.body.owner)
    if (latest.state === 'revoked') return latest
    const now = Date.now()
    tx.update(ref, { state: 'revoked', text: '', expiresAt: now, purgeAt: Timestamp.fromMillis(now + GRACE) })
    return latest
  })
  try {
    await deleteFiles(ref.id, data)
  } catch (err) {
    warn('Immediate file removal deferred to cleanup.', { id: ref.id, code: err.code })
  }
  return { revoked: true }
}

const operations = { create, complete, receive, ticket, revoke }
app.get('/api/config', (req, res) => {
  res.json({
    projectId: PROJECT, storageBucket: BUCKET, emulator: EMULATOR,
    apiKey: EMULATOR ? 'local-development' : 'AIzaSyB1flKNwt9Qq6ZZ-vcNYxCyZJ7onC9TMcU',
  })
})
app.post('/api/:operation', async (req, res) => {
  if (!req.is('application/json') || Number(req.get('content-length')) > 450_000) {
    throw new ApiError(400, 'Expected a JSON request up to 450 KB.')
  }
  const operation = req.params.operation
  if (!Object.hasOwn(operations, operation)) throw new ApiError(404, 'Unknown request.')
  res.json(await operations[operation](req))
})
if (EMULATOR) {
  app.get('/api/local-file/:id/:file', async (req, res) => {
    await pipeline((await localDownload(req, res)), res)
  })
}

async function localDownload(req, res) {
  const [id, data] = await findTransfer(req.params)
  const file = data.files.find(file => file.id === req.params.file)
  if (!file) throw new ApiError(404, 'This file is unavailable.')
  res.set({
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': disposition(file.name),
    'Content-Length': String(file.size),
  })
  return object(id, file.id).createReadStream()
}

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err instanceof ApiError) return res.status(err.status).json({ error: err.message })
  logError('SendSnippet request failed', { operation: req.params?.operation, code: err.code, name: err.name })
  res.status(500).json({ error: 'Could not connect to the transfer service. Try again.' })
})

export const transferApi = onRequest({ ...runtime, region: REGION, timeoutSeconds: 60, maxInstances: 8 }, app)

export const cleanTransfers = onSchedule({
  ...runtime, region: REGION, schedule: 'every 15 minutes', timeoutSeconds: 540, maxInstances: 1,
}, async () => {
  const now = Timestamp.now()
  const [expired, staleQuotas] = await Promise.all([
    transfers.where('purgeAt', '<=', now).orderBy('purgeAt').limit(350).get(),
    quotas.where('purgeAt', '<=', now).orderBy('purgeAt').limit(400).get(),
  ])
  for (let start = 0; start < expired.size; start += 8) {
    await Promise.allSettled(expired.docs.slice(start, start + 8).map(async snap => {
      const data = snap.data()
      try {
        await deleteFiles(snap.id, data)
        if (data.files.length) {
          await auth.deleteUser('ss-' + snap.id).catch(err => {
            if (err.code !== 'auth/user-not-found') throw err
          })
        }
        const batch = db.batch()
        batch.delete(snap.ref, { lastUpdateTime: snap.updateTime })
        batch.delete(codes.doc(data.code))
        await batch.commit()
      } catch (err) {
        warn('Cleanup will retry this transfer.', { id: snap.id, code: err.code })
      }
    }))
  }
  if (!staleQuotas.empty) {
    const batch = db.batch()
    for (const snap of staleQuotas.docs) batch.delete(snap.ref)
    await batch.commit()
  }
})
