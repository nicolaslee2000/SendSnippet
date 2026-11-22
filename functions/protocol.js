import { createHash, randomInt, timingSafeEqual } from 'node:crypto'

export const GIB = 1024 ** 3
export const MAX_FILE = 10 * GIB
export const MAX_TOTAL = 20 * GIB
export const MAX_FILES = 20
export const MAX_TEXT = 64 * 1024
export const DAY = 86_400_000
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const LIFETIMES = new Set([15, 60, 1440])

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export const hash = value => createHash('sha256').update(value).digest('hex')
export const idFor = owner => createHash('sha256').update(owner).digest().subarray(0, 24).toString('base64url')
export const validId = value => typeof value === 'string' && /^[\w-]{32}$/.test(value)
export const validOwner = value => typeof value === 'string' && /^[\w-]{43}$/.test(value)
export const validFile = value => typeof value === 'string' && /^(0|[1-9][0-9]?)$/.test(value)
export const normalizeCode = value => typeof value === 'string'
  ? value.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  : ''
export const validCode = value => value.length === 8 && [...value].every(c => CODE_ALPHABET.includes(c))
export const makeCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(32)]).join('')
export const ownerMatches = (value, digest) => validOwner(value) &&
  timingSafeEqual(Buffer.from(hash(value), 'hex'), Buffer.from(digest, 'hex'))

export function validateDraft(body) {
  const { id, owner, files = [], text = '', lifetime } = body ?? {}
  if (!validId(id) || !validOwner(owner) || idFor(owner) !== id) throw new ApiError(400, 'Invalid transfer credentials.')
  if (!LIFETIMES.has(lifetime)) throw new ApiError(400, 'Choose 15 minutes, 1 hour, or 24 hours.')
  if (!Array.isArray(files) || files.length > MAX_FILES) throw new ApiError(400, 'Add up to 20 files.')
  if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_TEXT) {
    throw new ApiError(400, 'Text can be up to 64 KiB.')
  }
  if (!text.trim() && !files.length) throw new ApiError(400, 'Add text or a file to send.')

  let total = 0
  const manifest = files.map((file, index) => {
    if (typeof file?.name !== 'string' || !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE) {
      throw new ApiError(400, 'Each file can be up to 10 GiB.')
    }
    const name = Array.from(file.name.toWellFormed().replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069/\\]/g, '_').trim())
      .slice(0, 160).join('')
    total += file.size
    return { id: String(index), name: name && name !== '.' && name !== '..' ? name : 'file-' + (index + 1), size: file.size }
  })
  if (total > MAX_TOTAL) throw new ApiError(400, 'One transfer can contain up to 20 GiB.')
  return { id, owner, text: text.toWellFormed(), lifetime, files: manifest, total }
}

export function disposition(name) {
  const fallback = name.replace(/[^\x20-\x7e]|["\\%]/g, '_')
  const encoded = encodeURIComponent(name).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))
  return 'attachment; filename="' + fallback + '"; filename*=UTF-8' + "''" + encoded
}
