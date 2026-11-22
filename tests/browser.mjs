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
  await phone.locator('#receive-code').fill(code)
  await phone.getByRole('button', { name: 'Receive transfer' }).click()
  await phone.getByText('Browser transfer ☕', { exact: true }).waitFor()

  await page.getByRole('button', { name: 'Activity' }).click()
  await page.getByRole('button', { name: 'Revoke transfer' }).waitFor()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Revoke transfer' }).click()
  await page.getByText('Transfer revoked').waitFor()
  await phone.reload()
  await phone.getByText('This transfer is unavailable.', { exact: false }).waitFor()
  assert.equal(await phone.locator('body').evaluate(el => el.scrollWidth), 390)
  assert.deepEqual(pageErrors, [])
  console.log('Browser send, QR rendering, mobile link, code lookup, file download, activity and revoke passed.')
} finally {
  await browser.close()
}
