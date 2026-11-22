const GIB = 1024 ** 3
export const limit = { file: 10 * GIB, total: 20 * GIB, files: 20, text: 64 * 1024 }
export const byteLength = text => new TextEncoder().encode(text).length
const HISTORY = 'sendsnippet.activity.v1'
const linkPattern = /^[\w-]{32}$/
const codePattern = /^[0-9A-HJKMNP-TV-Z]{8}$/

export async function api(operation, payload, signal) {
  const response = await fetch('/api/' + operation, payload === undefined ? { signal } : {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal,
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !Object.keys(result).length) {
    const error = new Error(result.error || 'Could not connect to SendSnippet. Try again.')
    error.status = response.status
    throw error
  }
  return result
}

let sdkPromise
export function uploadClient() {
  if (!sdkPromise) sdkPromise = loadUploadClient().catch(error => {
    sdkPromise = undefined
    throw error
  })
  return sdkPromise
}
async function loadUploadClient() {
  const [config, { initializeApp }, a, s] = await Promise.all([
    api('config'), import('firebase/app'), import('firebase/auth'), import('firebase/storage'),
  ])
  const app = initializeApp(config)
  const auth = a.initializeAuth(app, { persistence: a.inMemoryPersistence })
  const storage = s.getStorage(app)
  if (config.emulator) {
    a.connectAuthEmulator(auth, 'http://' + location.hostname + ':9189', { disableWarnings: true })
    s.connectStorageEmulator(storage, location.hostname, 9198)
  }
  storage.maxUploadRetryTime = 90_000
  return {
    connect: token => a.signInWithCustomToken(auth, token),
    disconnect: () => a.signOut(auth),
    begin: (id, index, file) => s.uploadBytesResumable(
      s.ref(storage, 'sendsnippet-v2/' + id + '/' + index), file, {
        contentType: 'application/octet-stream',
      }),
  }
}

function encodeKey(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
export async function keyPair() {
  const owner = encodeKey(crypto.getRandomValues(new Uint8Array(32)))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(owner))
  return { id: encodeKey(new Uint8Array(digest, 0, 24)), owner }
}
export const transferLink = id => location.origin + '/receive#' + id
export const formatCode = value => value ? value.slice(0, 4) + ' ' + value.slice(4) : ''
export const fromHash = () => linkPattern.test(location.hash.slice(1)) ? location.hash.slice(1) : ''

export function credential(value) {
  const entry = value.trim()
  if (entry.includes('://')) {
    try {
      const link = new URL(entry)
      const id = link.hash.slice(1)
      if ((link.origin === location.origin ||
           ['https://sendsnippet.web.app', 'https://sendsnippet.firebaseapp.com'].includes(link.origin))
          && link.pathname === '/receive' && linkPattern.test(id)) return { id }
    } catch {
      // Malformed links use the same validation message as malformed codes.
    }
  } else {
    const code = entry.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
    if (codePattern.test(code)) return { code }
  }
  throw new Error('Enter an 8-character code or paste a SendSnippet link.')
}

export function sizeLabel(bytes) {
  if (bytes < 1024) return bytes + ' B'
  const index = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)))
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(bytes / 1024 ** index)
    + ' ' + ['B', 'KiB', 'MiB', 'GiB'][index]
}

export function timeLabel(expires, now) {
  const seconds = Math.max(0, Math.ceil((expires - now) / 1000))
  if (!seconds) return 'Expired'
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours) return hours + 'h ' + (minutes % 60) + 'm left'
  return minutes ? minutes + 'm ' + (seconds % 60) + 's left' : seconds + 's left'
}

export function historyRead() {
  try {
    const data = JSON.parse(localStorage.getItem(HISTORY))
    return Array.isArray(data) ? data.filter(row => row && linkPattern.test(row.id)).slice(0, 30) : []
  } catch { return [] }
}
export function historyWrite(rows) {
  try { localStorage.setItem(HISTORY, JSON.stringify(rows.slice(0, 30))) } catch { /* Private browsing. */ }
}

export function transferLabel(transfer) {
  if (transfer.files.length === 1) return transfer.files[0].name
  if (transfer.files.length > 1) return transfer.files.length + ' files' + (transfer.text ? ' + text' : '')
  return 'Text snippet'
}
