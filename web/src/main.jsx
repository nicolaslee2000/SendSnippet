import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowDown, ArrowDownToLine, ArrowLeftRight, ArrowRight, ArrowUpRight, Check, ChevronDown,
  Clipboard, Clock3, Code2, Copy, File, FileText, History, Link2, LoaderCircle, LockKeyhole,
  Moon, Pause, Play, Plus, QrCode, Send, Share2, Smartphone, Sun, UploadCloud, X,
} from 'lucide-react'
import QRCode from 'qrcode'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/manrope'
import './styles.css'
import {
  api, byteLength, credential, formatCode, fromHash, historyRead, historyWrite, keyPair,
  limit, sizeLabel, timeLabel, transferLabel, transferLink, uploadClient,
} from './transfer.js'

const APK = 'https://github.com/nicolaslee2000/SendSnippet/releases/latest/download/SendSnippet.apk'
const tabs = [['send', 'Send', Send], ['receive', 'Receive', ArrowDownToLine], ['activity', 'Activity', History]]
const placeholder = 'Paste a note, link, or code snippet…'

function IconButton({ icon: Icon, label, ...props }) {
  return <button type="button" className="icon-button" title={label} aria-label={label} {...props}><Icon size={18} /></button>
}
function Button({ icon: Icon, children, kind = 'secondary', ...props }) {
  return <button type="button" className={'button ' + kind} {...props}>{Icon && <Icon size={17} />}{children}</button>
}
function SectionTitle({ title, children }) {
  return <div className="section-title"><h2>{title}</h2><p>{children}</p></div>
}
function Notice({ children }) {
  return children && <p className="error" role="alert">{children}</p>
}

function App() {
  const [tab, setTab] = useState(location.pathname === '/receive' || fromHash() ? 'receive' : 'send')
  const [openRequest, setOpenRequest] = useState(() => fromHash() ? { id: fromHash() } : null)
  const [activity, setActivity] = useState(historyRead)
  const [toast, setToast] = useState('')
  const toastTimer = useRef()
  const [now, setNow] = useState(Date.now)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('sendsnippet.theme') || 'system' } catch { return 'system' }
  })
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    const sync = () => setOnline(navigator.onLine)
    const urlChanged = () => {
      setTab(location.pathname === '/receive' || fromHash() ? 'receive' : 'send')
      if (fromHash()) setOpenRequest({ id: fromHash() })
    }
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    window.addEventListener('popstate', urlChanged)
    return () => {
      clearInterval(timer)
      clearTimeout(toastTimer.current)
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
      window.removeEventListener('popstate', urlChanged)
    }
  }, [])

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => { historyWrite(activity) }, [activity])

  function notify(message) {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }
  async function copy(value, message = 'Copied to clipboard') {
    try {
      await navigator.clipboard.writeText(value)
      notify(message)
    } catch {
      notify('Clipboard access is unavailable. Select and copy the text manually.')
    }
  }
  function remember(transfer, owner) {
    const row = {
      id: transfer.id, expiresAt: transfer.expiresAt, label: transferLabel(transfer),
      direction: owner ? 'Sent' : 'Received', ...(owner && { owner, code: transfer.code }),
    }
    setActivity(rows => {
      const previous = rows.find(item => item.id === row.id)
      const saved = previous?.owner && !owner ? previous : row
      return [saved, ...rows.filter(item => item.id !== row.id)].slice(0, 30)
    })
  }
  function switchTab(next) {
    setTab(next)
    const url = next === 'receive' ? '/receive' : '/'
    if (location.pathname !== url || (next !== 'receive' && location.hash)) {
      window.history.replaceState(null, '', url)
    }
  }
  function open(id) {
    switchTab('receive')
    setOpenRequest({ id })
  }
  function toggleTheme() {
    const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    const next = dark ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('sendsnippet.theme', next) } catch { /* Private browsing. */ }
  }
  async function revoke(row) {
    await api('revoke', { id: row.id, owner: row.owner })
    setActivity(rows => rows.filter(item => item.id !== row.id))
    notify('Transfer revoked')
  }

  return <div className="shell">
    <header className="header">
      <a className="wordmark" href="/" onClick={event => { event.preventDefault(); switchTab('send') }}>
        <span className="brand-mark"><ArrowLeftRight size={22} strokeWidth={2.45} /></span>
        SendSnippet
      </a>
      <div className="header-actions">
        <a className="android-link" href={APK}><Smartphone size={16} /><span>Android app</span><ArrowUpRight size={13} /></a>
        <IconButton icon={theme === 'dark' ? Sun : Moon} label="Toggle color theme" onClick={toggleTheme} />
      </div>
    </header>

    <main>
      <div className="intro">
        <h1>Move files and text<br className="mobile-break" /> <span>between devices.</span></h1>
        <p>Share a code, link, or QR. No account needed.</p>
      </div>
      {!online && <p className="offline" role="status">You’re offline. Transfers will need a connection.</p>}
      <div className="layout">
        <div className="workbench">
          <nav className="tabs" aria-label="Transfer actions">
            {tabs.map(([id, label, Icon]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => switchTab(id)}>
              <Icon size={17} />{label}
            </button>)}
          </nav>
          <section hidden={tab !== 'send'}><SendPanel {...{ now, copy, notify, remember, revoke }} active={tab === 'send'} /></section>
          <section hidden={tab !== 'receive'}><ReceivePanel {...{ now, copy, notify, remember, openRequest }} /></section>
          <section hidden={tab !== 'activity'}>
            <ActivityPanel rows={activity} {...{ now, open, copy, revoke }} clear={() => setActivity([])} />
          </section>
        </div>
        <aside className="sidebar">
          <div className="illustration">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="orbit orbit-three" /><div className="orbit orbit-four" />
            <div className="art-dot art-dot-one" /><div className="art-dot art-dot-two" />
            <div className="art-card art-file"><FileText size={33} strokeWidth={1.55} /></div>
            <div className="art-card art-text"><Code2 size={36} strokeWidth={1.75} /></div>
            <div className="art-card art-arrow"><ArrowUpRight size={21} strokeWidth={2.6} /></div>
            <div className="art-caption"><h2>Ready on any device</h2><p>Open the link or enter the code on the device you’re sending to.</p></div>
          </div>
          <div className="benefits">
            <div><span className="benefit-icon"><UploadCloud size={18} /></span><p><strong>Up to 10 GiB per file</strong><small>Send multiple files in one transfer</small></p></div>
            <div><span className="benefit-icon"><Clock3 size={18} /></span><p><strong>Automatic expiry</strong><small>Choose 15 minutes, 1 hour, or 24 hours</small></p></div>
            <div><span className="benefit-icon"><Smartphone size={18} /></span><p><strong>Send from Android’s share sheet</strong><small>Files, photos, links, and selected text</small></p></div>
          </div>
        </aside>
      </div>
    </main>

    <footer>
      <span><LockKeyhole size={13} /> Anyone with the link or code can open an active transfer.</span>
      <a href="https://github.com/nicolaslee2000/SendSnippet">Source code <ArrowUpRight size={13} /></a>
    </footer>
    {toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </div>
}

function SendPanel({ active, now, copy, notify, remember, revoke }) {
  const [files, setFiles] = useState([])
  const [text, setText] = useState('')
  const [lifetime, setLifetime] = useState(60)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(null)
  const [drag, setDrag] = useState(false)
  const [result, setResult] = useState(null)
  const [paused, setPaused] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const upload = useRef()
  const job = useRef()
  const input = useRef()
  const running = useRef(false)
  const locked = !!progress || !!job.current

  function addFiles(added) {
    if (locked) return
    const next = [...files]
    let issue = ''
    let total = files.reduce((sum, file) => sum + file.size, 0)
    for (const file of added) {
      if (next.some(item => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) continue
      if (file.size > limit.file) issue = 'Each file can be up to 10 GiB.'
      else if (next.length === limit.files) issue = 'Add up to 20 files.'
      else if (total + file.size > limit.total) issue = 'One transfer can contain up to 20 GiB.'
      else {
        next.push(file)
        total += file.size
      }
    }
    setFiles(next)
    setError(issue)
  }

  useEffect(() => {
    if (!active || result || locked) return
    const paste = event => {
      if (!event.clipboardData?.files.length) return
      event.preventDefault()
      addFiles(event.clipboardData.files)
    }
    document.addEventListener('paste', paste)
    return () => document.removeEventListener('paste', paste)
  }, [active, files, locked, result])

  useEffect(() => {
    if (!progress) return
    const leaving = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', leaving)
    return () => window.removeEventListener('beforeunload', leaving)
  }, [!!progress])

  async function readClipboard() {
    try {
      const pasted = await navigator.clipboard.readText()
      if (pasted) setText(prev => prev + (prev ? '\n' : '') + pasted)
    } catch {
      notify('Clipboard access is unavailable. Use your device’s Paste command.')
    }
  }

  async function send(event) {
    event?.preventDefault()
    if (running.current || discarding) return
    setError('')
    if (byteLength(text) > limit.text) return setError('Text can be up to 64 KiB.')
    if (!text.trim() && !files.length) return setError('Add text or a file to send.')
    running.current = true
    setPaused(false)
    setProgress({ label: 'Preparing transfer…', percent: 0 })
    let sdk
    try {
      if (!job.current) job.current = await keyPair()
      const draft = job.current
      const manifest = files.map(({ name, size }) => ({ name, size }))
      const created = await api('create', { ...draft, text, files: manifest, lifetime })
      let transfer = created.transfer
      if (!transfer) {
        if (created.token) {
          sdk = await uploadClient()
          await sdk.connect(created.token)
          const total = files.reduce((sum, file) => sum + file.size, 0)
          let done = files.reduce((sum, file, i) => sum + (created.missing.includes(String(i)) ? 0 : file.size), 0)
          for (const index of created.missing) {
            const file = files[Number(index)]
            const task = sdk.begin(draft.id, index, file)
            upload.current = task
            await new Promise((resolve, reject) => task.on('state_changed', state => {
              const bytes = done + state.bytesTransferred
              setProgress({
                file: file.name, label: sizeLabel(bytes) + ' of ' + sizeLabel(total),
                percent: total ? Math.floor(bytes / total * 100) : 0,
              })
            }, reject, resolve))
            done += file.size
            upload.current = null
          }
        }
        setProgress({ label: 'Creating your share link…', percent: 100 })
        transfer = await api('complete', draft)
      }
      const row = { ...transfer, owner: draft.owner }
      remember(transfer, draft.owner)
      job.current = null
      setResult(row)
      setFiles([])
      setText('')
    } catch (err) {
      if (err.code !== 'storage/canceled') {
        setError(err.code?.startsWith('storage/') ? 'The upload was interrupted. Retry to keep any files already uploaded.' : err.message)
      }
    } finally {
      await sdk?.disconnect().catch(() => {})
      upload.current = null
      running.current = false
      setPaused(false)
      setProgress(null)
    }
  }

  async function discard() {
    if (!job.current || discarding || !window.confirm('Discard this upload?')) return
    setDiscarding(true)
    try {
      await api('revoke', job.current).catch(error => { if (error.status !== 404) throw error })
      job.current = null
      setError('')
      setFiles([])
      setText('')
    } catch (err) {
      setError(err.message)
    } finally { setDiscarding(false) }
  }
  function pause() {
    if (paused ? upload.current?.resume() : upload.current?.pause()) setPaused(value => !value)
  }

  if (result) return <SharePanel item={result} {...{ now, copy, revoke, notify }} close={() => setResult(null)} />

  return <form className="panel" onSubmit={send}>
    <SectionTitle title="Send a transfer">Add files, paste text, or send both together.</SectionTitle>
    <div className={'dropzone' + (drag ? ' dragging' : '') + (locked ? ' locked' : '')}
      onDragOver={event => { event.preventDefault(); if (!locked) setDrag(true) }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDrag(false) }}
      onDrop={event => { event.preventDefault(); setDrag(false); addFiles(event.dataTransfer.files) }}>
      <span className="drop-icon"><UploadCloud size={26} strokeWidth={1.8} /></span>
      <span className="drop-copy"><strong>Drop files here</strong><small>Up to 20 files · 20 GiB total</small></span>
      <Button icon={Plus} disabled={locked} onClick={() => input.current.click()}>Browse files</Button>
      <input ref={input} type="file" multiple hidden onChange={event => { addFiles(event.target.files); event.target.value = '' }} />
    </div>
    {!!files.length && <ul className="file-list">{files.map((file, index) => <li key={index}>
      <span className="file-icon"><File size={16} /></span>
      <div><strong>{file.name}</strong><small>{sizeLabel(file.size)}</small></div>
      <IconButton icon={X} label={'Remove ' + file.name} disabled={locked} onClick={() => setFiles(files.filter((_, i) => i !== index))} />
    </li>)}</ul>}
    <div className="field-row">
      <label htmlFor="snippet">Text snippet <small>Optional</small></label>
      <button className="plain-button" type="button" onClick={readClipboard} disabled={locked}><Clipboard size={14} /> Paste</button>
    </div>
    <textarea id="snippet" placeholder={placeholder} rows="4" disabled={locked}
      value={text} onChange={event => setText(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) send(event)
      }} />
    {byteLength(text) > limit.text && <Notice>Text can be up to 64 KiB.</Notice>}
    <Notice>{error}</Notice>
    {progress && <div className="progress" aria-live="polite">
      <div><strong>{paused ? 'Paused' : progress.file || 'Sending your transfer'}</strong><span>{progress.label}</span></div>
      <progress value={progress.percent} max="100" aria-label="Upload progress" />
    </div>}
    <div className="form-actions">
      <label className="expiry">
        <Clock3 size={17} /><span>Expires in</span>
        <select value={lifetime} onChange={event => setLifetime(Number(event.target.value))} disabled={locked}>
          <option value={15}>15 minutes</option><option value={60}>1 hour</option><option value={1440}>24 hours</option>
        </select>
        <ChevronDown size={13} />
      </label>
      <div className="action-group">
        {job.current && !progress && <Button disabled={discarding} onClick={discard}>Discard</Button>}
        {progress?.file && <>
          <Button onClick={() => upload.current?.cancel()}>Stop upload</Button>
          <Button icon={paused ? Play : Pause} onClick={pause}>{paused ? 'Resume' : 'Pause'}</Button>
        </>}
        {!progress && <Button icon={Send} kind="primary" type="submit" disabled={discarding || (!files.length && !text.trim())}>
          {job.current ? 'Retry upload' : 'Create transfer'}
        </Button>}
      </div>
    </div>
  </form>
}

function SharePanel({ item, now, copy, notify, revoke, close }) {
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [revoking, setRevoking] = useState(false)
  const link = transferLink(item.id)
  const expired = item.expiresAt <= now
  useEffect(() => {
    let active = true
    QRCode.toDataURL(link, { width: 250, margin: 2, color: { dark: '#211a3c', light: '#ffffff' } })
      .then(value => { if (active) setQr(value) }).catch(() => {})
    return () => { active = false }
  }, [link])

  async function share() {
    try { await navigator.share({ title: 'SendSnippet', url: link }) }
    catch (err) { if (err.name !== 'AbortError') notify('Sharing is unavailable. Use Copy link instead.') }
  }
  async function remove() {
    if (!window.confirm('Revoke access to this transfer?')) return
    setRevoking(true)
    try {
      await revoke(item)
      close()
    } catch (err) { setError(err.message) }
    finally { setRevoking(false) }
  }

  return <div className="panel">
    <SectionTitle title={expired ? 'Transfer expired' : 'Your transfer is ready'}>
      {transferLabel(item)} · {timeLabel(item.expiresAt, now)}
    </SectionTitle>
    {!expired && <>
      <div className="share-card">
        <div>
          <span className="field-label">Receive code</span>
          <div className="share-code">{formatCode(item.code)}</div>
          <Button icon={Copy} onClick={() => copy(formatCode(item.code), 'Code copied')}>Copy code</Button>
        </div>
        {qr && <img src={qr} alt="QR code for this transfer" />}
      </div>
      <div className="share-link">
        <input aria-label="Transfer link" readOnly value={link} onFocus={event => event.target.select()} />
        <Button icon={Link2} onClick={() => copy(link, 'Link copied')}>Copy link</Button>
        {!!navigator.share && <IconButton icon={Share2} label="Share transfer" onClick={share} />}
      </div>
    </>}
    <Notice>{error}</Notice>
    <div className="form-actions">
      <Button onClick={remove} disabled={revoking}>Revoke access</Button>
      <Button kind="primary" icon={Plus} onClick={close}>New transfer</Button>
    </div>
  </div>
}

function ReceivePanel({ now, copy, notify, remember, openRequest }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [item, setItem] = useState(null)
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [downloads, setDownloads] = useState([])
  const request = useRef()

  async function receive(input) {
    request.current?.abort()
    const signal = new AbortController()
    request.current = signal
    setError('')
    setItem(null)
    setBusy(true)
    try {
      const args = typeof input === 'string' ? credential(input) : input
      const result = await api('receive', args, signal.signal)
      if (signal.signal.aborted) return
      setItem(result)
      remember(result)
      window.history.replaceState(null, '', '/receive#' + result.id)
    } catch (err) {
      if (!signal.signal.aborted) setError(err.message)
    } finally {
      if (!signal.signal.aborted) setBusy(false)
    }
  }
  useEffect(() => {
    if (openRequest) receive(openRequest)
    return () => request.current?.abort()
  }, [openRequest])

  async function download(file) {
    setDownloads(list => [...list, file.id])
    setError('')
    try {
      const { url } = await api('ticket', { id: item.id, file: file.id })
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      link.click()
      notify('Download requested')
    } catch (err) { setError(err.message) }
    finally { setDownloads(list => list.filter(id => id !== file.id)) }
  }
  function saveText() {
    const url = URL.createObjectURL(new Blob([item.text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'snippet.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return <div className="panel">
    <SectionTitle title="Receive a transfer">Enter the receive code, paste a link, or scan its QR.</SectionTitle>
    <form className="receive-form" onSubmit={event => { event.preventDefault(); receive(value) }}>
      <label className="field-label" htmlFor="receive-code">Code or link</label>
      <div className="receive-entry">
        <input id="receive-code" placeholder="ABCD 1234" value={value} maxLength="300"
          onChange={event => setValue(event.target.value)} spellCheck="false" autoComplete="off" autoCapitalize="characters" />
        <IconButton icon={QrCode} label="Scan QR code" onClick={() => setScanning(true)} />
      </div>
      <Button kind="primary" type="submit" icon={busy ? LoaderCircle : ArrowDown} disabled={busy || !value.trim()}>
        {busy ? 'Looking up transfer…' : 'Receive transfer'}
      </Button>
    </form>
    <Notice>{error}</Notice>
    {item && <div className="received">
      <div className="receive-summary">
        <div><strong>{transferLabel(item)}</strong><span>{timeLabel(item.expiresAt, now)}</span></div>
        {item.expiresAt > now && <IconButton icon={Link2} label="Copy transfer link" onClick={() => copy(transferLink(item.id), 'Link copied')} />}
      </div>
      {item.text && <>
        <pre>{item.text}</pre>
        <div className="action-group">
          <Button icon={Copy} onClick={() => copy(item.text, 'Text copied')}>Copy text</Button>
          <Button icon={ArrowDownToLine} onClick={saveText}>Save .txt</Button>
        </div>
      </>}
      {!!item.files.length && <ul className="file-list">{item.files.map(file => <li key={file.id}>
        <span className="file-icon"><File size={16} /></span>
        <div><strong>{file.name}</strong><small>{sizeLabel(file.size)}</small></div>
        <IconButton icon={ArrowDownToLine} label={'Download ' + file.name}
          disabled={item.expiresAt <= now || downloads.includes(file.id)} onClick={() => download(file)} />
      </li>)}</ul>}
    </div>}
    {scanning && <Scanner close={() => setScanning(false)} select={input => {
      setValue(input)
      setScanning(false)
      receive(input)
    }} />}
  </div>
}

function Scanner({ close, select }) {
  const dialog = useRef()
  const video = useRef()
  const [error, setError] = useState('')
  useEffect(() => {
    dialog.current.showModal()
    let stream, frame, stopped = false
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is unavailable on this device.')
        const [{ default: scan }, camera] = await Promise.all([
          import('jsqr'), navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } }),
        ])
        stream = camera
        if (stopped) return camera.getTracks().forEach(track => track.stop())
        const player = video.current
        player.srcObject = stream
        await player.play()
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        let last = 0
        function read(now) {
          if (stopped) return
          if (now - last > 170 && player.videoWidth) {
            last = now
            canvas.width = Math.min(600, player.videoWidth)
            canvas.height = Math.round(canvas.width * player.videoHeight / player.videoWidth)
            context.drawImage(player, 0, 0, canvas.width, canvas.height)
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
            const value = scan(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'dontInvert' })?.data
            if (value) {
              try { credential(value); select(value); return }
              catch { setError('Point your camera at a SendSnippet QR code.') }
            }
          }
          frame = requestAnimationFrame(read)
        }
        frame = requestAnimationFrame(read)
      } catch {
        if (!stopped) setError('Camera access is unavailable. Paste the link or enter the code instead.')
      }
    }
    start()
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      stream?.getTracks().forEach(track => track.stop())
    }
  }, [])
  return <dialog ref={dialog} className="scanner" onCancel={close}>
    <div><h2>Scan a transfer QR</h2><IconButton icon={X} label="Close scanner" onClick={close} /></div>
    <video ref={video} playsInline muted aria-label="Camera preview" />
    <Notice>{error}</Notice>
  </dialog>
}

function ActivityPanel({ rows, now, open, copy, revoke, clear }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  async function remove(row) {
    if (!window.confirm('Revoke access to this transfer?')) return
    setBusy(row.id)
    setError('')
    try { await revoke(row) }
    catch (err) { setError(err.message) }
    finally { setBusy('') }
  }
  return <div className="panel">
    <SectionTitle title="Recent transfers">Activity is saved on this device.</SectionTitle>
    {!rows.length ? <div className="empty"><History size={27} /><p>Transfers you send or receive will appear here.</p></div> :
      <>
        <ul className="file-list activity-list">{rows.map(row => <li key={row.id}>
          <span className="file-icon">{row.direction === 'Sent' ? <Send size={16} /> : <ArrowDownToLine size={16} />}</span>
          <div><strong>{row.label}</strong><small>{row.direction} · {timeLabel(row.expiresAt, now)}</small></div>
          {row.expiresAt > now && <>
            <IconButton icon={Copy} label="Copy link" onClick={() => copy(transferLink(row.id), 'Link copied')} />
            <IconButton icon={ArrowRight} label="Open transfer" onClick={() => open(row.id)} />
            {row.owner && <IconButton icon={X} label="Revoke transfer" disabled={busy === row.id} onClick={() => remove(row)} />}
          </>}
        </li>)}</ul>
        <Button onClick={() => { if (window.confirm('Clear local transfer activity?')) clear() }}>Clear activity</Button>
      </>}
    <Notice>{error}</Notice>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
