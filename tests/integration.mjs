import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { idFor } from '../functions/protocol.js'
import { initializeApp, deleteApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithCustomToken } from 'firebase/auth'
import { connectStorageEmulator, getStorage, ref, uploadBytes, uploadBytesResumable } from 'firebase/storage'

const base = process.env.SNIPPET_TEST_URL || 'http://127.0.0.1:5075'
const config = await fetch(base + '/api/config').then(r => r.json())
const app = initializeApp(config)
const auth = getAuth(app)
const storage = getStorage(app)
if (config.emulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9189', { disableWarnings: true })
  connectStorageEmulator(storage, '127.0.0.1', 9198)
}
const secret = n => randomBytes(n).toString('base64url')
const credentials = () => {
  const owner = secret(32)
  return { id: idFor(owner), owner }
}
const metadata = { contentType: 'application/octet-stream' }
async function call(operation, body, status = 200) {
  const response = await fetch(base + '/api/' + operation, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const json = await response.json()
  assert.equal(response.status, status, operation + ' ' + JSON.stringify(json))
  return json
}

const one = credentials()
const two = credentials()
const short = credentials()
try {
  const body = { ...one, lifetime: 15, text: 'A snippet with UTF-8 → 한글\n\nMore text' }
  const text = (await call('create', body)).transfer
  assert.equal((await call('create', body)).transfer.code, text.code)
  assert.equal((await call('receive', { code: text.code.slice(0, 4) + ' ' + text.code.slice(4).toLowerCase() })).text, body.text)
  await call('revoke', { ...one, owner: secret(32) }, 404)
  await call('revoke', one)
  await call('receive', { id: one.id }, 404)
  console.log('Text, code normalization, idempotency and owner-only revoke passed.')

  const shortText = 'Four-digit code and full-length link'
  const sendAt = Date.now()
  const { transfer } = await call('create', { ...short, codeLength: 4, lifetime: 60, text: shortText })
  assert.match(transfer.code, /^\d{4}$/)
  assert.ok(transfer.codeExpiresAt > sendAt + 290_000 && transfer.codeExpiresAt <= Date.now() + 300_000)
  assert.equal((await call('receive', { code: transfer.code })).text, shortText)
  if (config.emulator) {
    const document = 'http://127.0.0.1:8187/v1/projects/demo-sendsnippet/databases/(default)/documents/ssTransfers/' + short.id
    const patched = await fetch(document + '?updateMask.fieldPaths=codeExpiresAt', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields: { codeExpiresAt: { integerValue: String(Date.now() - 1000) } } }),
    })
    assert.equal(patched.status, 200)
    await call('receive', { code: transfer.code }, 404)
  }
  assert.equal((await call('receive', { id: short.id })).text, shortText)
  console.log('Four-digit codes and separate link expiry passed.')

  const size = 6 * 1024 ** 2 + 7
  const content = randomBytes(size)
  const { token, missing } = await call('create', { ...two, lifetime: 60, codeLength: 4,
    text: 'Two files with a note', files: [{ name: 'test 한글.bin', size }, { name: 'empty.txt', size: 0 }],
  })
  assert.deepEqual(missing, ['0', '1'])
  await call('receive', { id: two.id }, 404)
  await call('complete', two, 409)
  await signInWithCustomToken(auth, token)
  const parent = 'sendsnippet-v2/' + two.id
  await assert.rejects(uploadBytes(ref(storage, parent + '/2'), new Uint8Array(1), metadata), { code: 'storage/unauthorized' })
  await assert.rejects(uploadBytes(ref(storage, parent + '/1'), new Uint8Array(1), metadata), { code: 'storage/unauthorized' })
  await uploadBytesResumable(ref(storage, parent + '/0'), content, metadata)
  await uploadBytesResumable(ref(storage, parent + '/1'), new Uint8Array(), metadata)
  const done = await call('complete', two)
  assert.match(done.code, /^\d{4}$/)
  assert.ok(done.codeExpiresAt > Date.now() + 290_000)
  assert.deepEqual((await call('complete', two)).files, done.files)
  const received = await call('receive', { code: done.code })
  assert.equal(received.text, 'Two files with a note')
  assert.equal(received.files[0].name, 'test 한글.bin')
  for (const [i, expected] of [[0, content], [1, Buffer.alloc(0)]]) {
    const { url } = await call('ticket', { id: received.id, file: String(i) })
    const response = await fetch(new URL(url, base))
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-disposition'), /^attachment;/)
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), expected)
  }
  await call('revoke', two)
  await call('ticket', { id: two.id, file: '0' }, 404)
  console.log('Multi-file resumable upload, empty file, storage rule checks, verified downloads and revoke passed.')
} finally {
  await Promise.allSettled([call('revoke', one), call('revoke', two), call('revoke', short)])
  await deleteApp(app)
}
