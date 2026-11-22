import { chromium } from 'playwright'
import { mkdir, readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { join } from 'node:path'

const origin = process.env.SNIPPET_TEST_URL || 'http://localhost:5173'
const shots = process.env.SNIPPET_SCREENSHOTS
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const sender = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' })
  const receiver = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await sender.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(origin)
  await page.getByRole('heading', { name: 'Send a transfer' }).waitFor()
  if (shots) {
    await mkdir(shots, { recursive: true })
    await page.screenshot({ path: join(shots, 'web-desktop.png'), fullPage: true })
  }

  await page.locator('#snippet').fill('Text-only transfer test')
  await page.getByRole('button', { name: 'Create transfer' }).click()
  await page.getByRole('heading', { name: 'Your transfer is ready' }).waitFor({ timeout: 15_000 })
  assert.match(await page.locator('.share-code').textContent(), /^\d{4}$/)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Revoke access' }).click()
  await page.getByRole('heading', { name: 'Send a transfer' }).waitFor()

  const original = Buffer.from('A tiny attachment\n')
  await page.locator('input[type=file]').setInputFiles([
    { name: 'send-snippet.txt', mimeType: 'text/plain', buffer: original },
    { name: 'empty.bin', mimeType: 'application/octet-stream', buffer: Buffer.alloc(0) },
  ])
  await page.locator('#snippet').fill('Browser transfer ☕')
  await page.getByRole('button', { name: 'Create transfer' }).click()
  await page.getByRole('heading', { name: 'Your transfer is ready' }).waitFor({ timeout: 90_000 })
  await page.getByAltText('QR code for this transfer').waitFor()
  const link = await page.getByRole('textbox', { name: 'Transfer link' }).inputValue()
  const code = await page.locator('.share-code').textContent()
  assert.match(code, /^\d{4}$/)

  const phone = await receiver.newPage()
  await phone.goto(link)
  await phone.getByText('Browser transfer ☕', { exact: true }).waitFor()
  if (shots) await phone.screenshot({ path: join(shots, 'web-mobile.png'), fullPage: true })
  const downloaded = phone.waitForEvent('download')
  await phone.getByRole('button', { name: 'Download send-snippet.txt' }).click()
  assert.deepEqual(await readFile(await (await downloaded).path()), original)
  const numericReceiver = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const codePage = await numericReceiver.newPage()
  await codePage.goto(new URL('/receive', origin).href)
  const codeInput = codePage.getByRole('textbox', { name: '4-digit code' })
  assert.equal(await codeInput.getAttribute('inputmode'), 'numeric')
  await codeInput.fill('ABCD')
  assert.equal(await codeInput.inputValue(), '')
  let lookups = 0
  codePage.on('request', request => {
    if (new URL(request.url()).pathname === '/api/receive') lookups++
  })
  await codeInput.fill(code.slice(0, 3))
  assert.equal(lookups, 0)
  const automatic = Promise.all([
    codePage.waitForEvent('download', { predicate: download => download.suggestedFilename() === 'send-snippet.txt' }),
    codePage.waitForEvent('download', { predicate: download => download.suggestedFilename() === 'empty.bin' }),
  ])
  await codeInput.press(code.at(-1))
  await codePage.getByText('Browser transfer ☕', { exact: true }).waitFor()
  const [autoFile, emptyFile] = await automatic
  assert.deepEqual(await readFile(await autoFile.path()), original)
  assert.equal((await readFile(await emptyFile.path())).length, 0)
  assert.equal(lookups, 1)

  await page.getByRole('button', { name: 'Activity' }).click()
  await page.getByRole('button', { name: 'Revoke transfer' }).waitFor()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Revoke transfer' }).click()
  await page.getByText('Transfer revoked').waitFor()
  await phone.reload()
  await phone.getByText('This transfer is unavailable.', { exact: false }).waitFor()
  assert.equal(await phone.locator('body').evaluate(el => el.scrollWidth), 390)
  assert.deepEqual(pageErrors, [])
  console.log('Browser text and file sending, QR rendering, link receive, numeric auto-receive and download, history and revoke passed.')
} finally {
  await browser.close()
}
