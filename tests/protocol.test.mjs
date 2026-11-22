import test from 'node:test'
import assert from 'node:assert/strict'
import { GIB, MAX_TEXT, SHORT_CODE_TTL, codeDeadline, disposition, idFor, makeCode, normalizeCode, validCode, validateDraft } from '../functions/protocol.js'

const owner = 'a'.repeat(43)
const draft = fields => ({ id: idFor(owner), owner, lifetime: 60, ...fields })

test('8-character codes handle similar-looking letters or separated groups', () => {
  assert.equal(normalizeCode('oh-iL 2uzv'), '0H112UZV')
  assert.equal(validCode('0H112UZV'), false)
  assert.equal(validCode(normalizeCode('oh-iL 23vz')), true)
  for (let index = 0; index < 50; index++) assert.equal(validCode(makeCode()), true)
})

test('short codes preserve leading zeros and use a separate deadline', () => {
  assert.equal(validCode('0027'), true)
  assert.equal(validCode('027'), false)
  assert.equal(validCode('1ABC'), false)
  for (let index = 0; index < 50; index++) assert.match(makeCode(4), /^\d{4}$/)
  const ready = 10_000
  const expires = ready + 60 * 60_000
  assert.equal(codeDeadline('0027', ready, expires), ready + SHORT_CODE_TTL)
  assert.equal(codeDeadline('ABCD2345', ready, expires), expires)
  assert.equal(codeDeadline('0027', ready, ready + 1000), ready + 1000)
  assert.equal(validateDraft(draft({ text: 'Hi' })).codeLength, 8)
  assert.equal(validateDraft(draft({ text: 'Hi', codeLength: 4 })).codeLength, 4)
  assert.throws(() => validateDraft(draft({ text: 'Hi', codeLength: 5 })), /code length/)
})

test('draft identity binds to the owner capability', () => {
  assert.throws(() => validateDraft({ ...draft({ text: 'Hi' }), owner: 'b'.repeat(43) }), /credentials/)
  assert.throws(() => validateDraft(draft({ text: '' })), /file to send/)
  assert.throws(() => validateDraft(draft({ text: '한'.repeat(Math.ceil(MAX_TEXT / 3)) })), /64 KiB/)
  assert.equal(validateDraft(draft({ text: '漢字\n🌿' })).text, '漢字\n🌿')
})

test('limits are enforced for files individually and together', () => {
  assert.throws(() => validateDraft(draft({ files: [{ name: 'a', size: 10 * GIB + 1 }] })), /10 GiB/)
  const files = [{ name: 'a', size: 10 * GIB }, { name: 'b', size: 10 * GIB }]
  assert.equal(validateDraft(draft({ files })).total, 20 * GIB)
  assert.throws(() => validateDraft(draft({ files: [...files, { name: 'c', size: 1 }] })), /20 GiB/)
  assert.throws(() => validateDraft(draft({ files: Array(21).fill({ name: 'empty', size: 0 }) })), /20 files/)
})

test('file names are safe in download headers', () => {
  const result = validateDraft(draft({ files: [{ name: '\n한글/"quote".txt', size: 0 }, { name: '..', size: 1 }] }))
  assert.equal(result.files[0].name, '_한글_"quote".txt')
  assert.equal(result.files[1].name, 'file-2')
  assert.match(disposition(result.files[0].name), /^attachment; filename="[^"]+"; filename\*=UTF-8''/)
  assert.doesNotMatch(disposition(result.files[0].name), /[\r\n]/)
})
