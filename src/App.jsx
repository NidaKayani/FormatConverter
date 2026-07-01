import { useCallback, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

function reconstructPageText(textContent) {
  const items = textContent.items.filter((item) => item.str.length > 0)
  if (items.length === 0) return ''

  const lines = []
  const Y_TOLERANCE = 3

  for (const item of items) {
    const y = item.transform[5]
    const x = item.transform[4]
    let line = lines.find((l) => Math.abs(l.y - y) < Y_TOLERANCE)
    if (!line) {
      line = { y, parts: [] }
      lines.push(line)
    }
    line.parts.push({ x, str: item.str, width: item.width })
  }

  lines.sort((a, b) => b.y - a.y)

  const pageLines = lines.map((line) => {
    line.parts.sort((a, b) => a.x - b.x)
    let text = ''
    let prevEnd = null
    for (const part of line.parts) {
      if (prevEnd !== null) {
        const gap = part.x - prevEnd
        if (gap > 2) text += ' '
      }
      text += part.str
      prevEnd = part.x + (part.width || 0)
    }
    return text
  })

  return pageLines.join('\n')
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function App() {
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [text, setText] = useState('')
  const [status, setStatus] = useState('idle') 
  const [progress, setProgress] = useState({ page: 0, total: 0 })
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const extractFromFile = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setStatus('error')
      setErrorMsg('Invalid file format. Please upload a PDF.')
      return
    }

    setFileName(file.name)
    setFileSize(file.size)
    setStatus('reading')
    setText('')
    setErrorMsg('')
    setCopied(false)

    try {
      const buffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
      const total = pdf.numPages
      setProgress({ page: 0, total })

      const pageTexts = []
      for (let pageNum = 1; pageNum <= total; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        pageTexts.push(reconstructPageText(textContent))
        setProgress({ page: pageNum, total })
      }

      setText(pageTexts.join('\n\n--- Page Break ---\n\n'))
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err.message || 'Could not read that PDF.')
    }
  }, [])

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) extractFromFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) extractFromFile(file)
  }

  const handleDownload = () => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace(/\.pdf$/i, '') + '.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const reset = () => {
    setFileName('')
    setFileSize(0)
    setText('')
    setStatus('idle')
    setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const wordCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0
  const charCount = text.length

  return (
    <div className="app">
      <header className="header">
        <img src="https://community.quantumlogicslimited.com/logo.png" alt="Quantumlogics Logo" className="logo" />
        <h1>PDF Extraction Tool</h1>
        <p>Local, in-browser processing. No data is uploaded to external servers.</p>
      </header>

      {status === 'idle' || status === 'error' ? (
        <div
          className={`dropzone ${dragActive ? 'active' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleInputChange}
            hidden
          />
          <div className="dropzone-icon">📄</div>
          <p className="dropzone-text">Drag & Drop a PDF, or click to browse</p>
          {status === 'error' && <p className="error">{errorMsg}</p>}
        </div>
      ) : (
        <div className="result">
          <div className="file-info">
            <div>
              <strong>{fileName}</strong>
              <span className="meta"> · {formatBytes(fileSize)}</span>
            </div>
            <button className="btn-link" onClick={reset}>Convert New File</button>
          </div>

          {status === 'reading' && (
            <div className="progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: progress.total
                      ? `${(progress.page / progress.total) * 100}%`
                      : '5%',
                  }}
                />
              </div>
              <p>Extracting page {progress.page} of {progress.total || '...'}</p>
            </div>
          )}

          {status === 'done' && (
            <>
              <div className="toolbar">
                <span className="meta">{wordCount} words · {charCount} characters</span>
                <div className="toolbar-actions">
                  <button className="btn" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                  <button className="btn btn-primary" onClick={handleDownload}>
                    Download .txt
                  </button>
                </div>
              </div>
              <textarea className="output" value={text} readOnly />
            </>
          )}
        </div>
      )}
    </div>
  )
}