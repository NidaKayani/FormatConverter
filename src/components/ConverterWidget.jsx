import { useEffect, useMemo, useRef, useState } from 'react'
import { convert, convertMany, zipResults, FORMATS, getConversion } from '../converters/index.js'
import { acceptFor } from '../converters/registry.js'
import Dropzone from './Dropzone.jsx'
import ProgressBar from './ProgressBar.jsx'
import OptionsPanel from './OptionsPanel.jsx'
import ResultPanel from './ResultPanel.jsx'
import { formatBytes, downloadBlob } from '../lib/format.js'
import { pushRecent } from '../lib/recent.js'

const SOFT_WARN_BYTES = 100 * 1024 * 1024

function loadOptions(pair, schema) {
  const values = {}
  for (const opt of schema) values[opt.key] = opt.default
  try {
    const saved = JSON.parse(localStorage.getItem(`fc-options:${pair}`) || '{}')
    for (const opt of schema) {
      if (opt.key in saved) values[opt.key] = saved[opt.key]
    }
  } catch {
    // corrupted storage — defaults are fine
  }
  return values
}

function saveOptions(pair, values) {
  try {
    localStorage.setItem(`fc-options:${pair}`, JSON.stringify(values))
  } catch {
    // storage full/blocked — stickiness is best-effort
  }
}

/**
 * Full conversion flow for a fixed from→to pair. Single file: drop →
 * (options) → progress → preview/download. Multiple files: review queue →
 * per-file progress and downloads → zip-all. `initialFile` lets the Home
 * page hand a file straight in; `onResult` lets the embed page forward
 * results to its parent.
 */
export default function ConverterWidget({ from, to, initialFile = null, onResult, single = false }) {
  const pair = `${from}-${to}`
  const entry = getConversion(from, to)
  const schema = entry?.options || []

  const [files, setFiles] = useState([])
  const [options, setOptions] = useState(() => loadOptions(pair, schema))
  const [status, setStatus] = useState('idle') // idle | ready | converting | done | error
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null) // single-file result
  const [batch, setBatch] = useState(null) // convertMany() results
  const [error, setError] = useState('')
  const [parallel, setParallel] = useState(true)
  const abortRef = useRef(null)

  const hint = useMemo(
    () =>
      single
        ? `Drag & drop a ${FORMATS[from].label} file, or click to browse`
        : `Drag & drop ${FORMATS[from].label} files, or click to browse`,
    [from, single]
  )

  const largeWarn = useMemo(
    () => files.some((f) => (f.size || 0) > SOFT_WARN_BYTES),
    [files]
  )

  const run = async (theFiles, opts) => {
    setStatus('converting')
    setProgress(null)
    setError('')
    saveOptions(pair, opts)
    const ac = new AbortController()
    abortRef.current = ac
    try {
      if (theFiles.length === 1) {
        const res = await convert(theFiles[0], to, {
          ...opts,
          onProgress: setProgress,
          signal: ac.signal,
        })
        pushRecent(from, to)
        setResult(res)
        setStatus('done')
        onResult?.(res)
      } else {
        const results = await convertMany(theFiles, to, {
          ...opts,
          onProgress: setProgress,
          signal: ac.signal,
          concurrency: parallel ? 2 : 1,
        })
        if (results.some((r) => r.ok)) pushRecent(from, to)
        setBatch(results)
        setStatus('done')
      }
    } catch (err) {
      if (err?.name === 'AbortError' || ac.signal.aborted) {
        setError('Conversion cancelled.')
        setStatus('error')
        return
      }
      setError(err.message || 'Conversion failed.')
      setStatus('error')
    } finally {
      abortRef.current = null
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
  }

  const handleFiles = (theFiles) => {
    setFiles(theFiles)
    setResult(null)
    setBatch(null)
    if (schema.length > 0 || theFiles.length > 1 || theFiles.some((f) => (f.size || 0) > SOFT_WARN_BYTES)) {
      setStatus('ready')
    } else run(theFiles, options)
  }

  useEffect(() => {
    if (initialFile) handleFiles([initialFile])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile])

  // Paste support: Ctrl+V an image or text straight into the converter
  useEffect(() => {
    if (status !== 'idle' && status !== 'error') return
    const onPaste = (e) => {
      const items = Array.from(e.clipboardData?.items || [])
      const fileItem = items.find((i) => i.kind === 'file')
      if (fileItem) {
        const f = fileItem.getAsFile()
        if (f) {
          const ext = FORMATS[from].exts[0]
          handleFiles([f.name ? f : new File([f], `pasted.${ext}`, { type: f.type })])
          return
        }
      }
      const text = e.clipboardData?.getData('text')
      const isTextFormat = ['txt', 'md', 'html'].includes(from)
      if (text?.trim() && isTextFormat) {
        handleFiles([
          new File([text], `pasted.${FORMATS[from].exts[0]}`, { type: FORMATS[from].mime }),
        ])
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from])

  const reset = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setFiles([])
    setResult(null)
    setBatch(null)
    setError('')
    setStatus('idle')
  }

  const moveFile = (index, dir) => {
    setFiles((prev) => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  const removeFile = (index) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) {
        setStatus('idle')
        return []
      }
      return next
    })
  }

  const downloadAll = async () => {
    const zip = await zipResults(batch, `formatconvert-${to}.zip`)
    downloadBlob(zip.blob, zip.filename)
  }

  const okCount = batch ? batch.filter((r) => r.ok).length : 0

  return (
    <div className="widget">
      {(status === 'idle' || status === 'error') && (
        <Dropzone
          accept={acceptFor(from)}
          hint={hint}
          onFile={(f) => handleFiles([f])}
          onFiles={handleFiles}
          multiple={!single}
          error={error}
        />
      )}

      {status === 'ready' && files.length > 0 && (
        <div className="result">
          <div className="file-info">
            <div>
              {files.length === 1 ? (
                <>
                  <strong>{files[0].name}</strong>
                  <span className="meta"> · {formatBytes(files[0].size)}</span>
                </>
              ) : (
                <strong>{files.length} files</strong>
              )}
            </div>
            <button className="btn-link" onClick={reset}>
              Choose other files
            </button>
          </div>
          {largeWarn && (
            <p className="meta" role="status">
              Large file detected (over 100 MB). Conversion may be slow or run out of memory in the browser.
            </p>
          )}
          {files.length > 1 && (
            <>
              <ul className="queue">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="queue-row">
                    <span className="queue-name">{f.name}</span>
                    <span className="meta">{formatBytes(f.size)}</span>
                    <span className="queue-actions">
                      <button type="button" className="btn-link" onClick={() => moveFile(i, -1)} disabled={i === 0}>
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => moveFile(i, 1)}
                        disabled={i === files.length - 1}
                      >
                        Down
                      </button>
                      <button type="button" className="btn-link" onClick={() => removeFile(i)}>
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <label className="meta" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={parallel}
                  onChange={(e) => setParallel(e.target.checked)}
                />
                Convert up to 2 files in parallel
              </label>
              <div style={{ marginTop: '0.5rem' }}>
                <Dropzone
                  accept={acceptFor(from)}
                  hint="Add more files"
                  onFile={(f) => setFiles((prev) => [...prev, f])}
                  onFiles={(more) => setFiles((prev) => [...prev, ...more])}
                  multiple
                  compact
                />
              </div>
            </>
          )}
          <OptionsPanel schema={schema} values={options} onChange={setOptions} />
          <div className="toolbar-actions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" onClick={() => run(files, options)}>
              Convert {files.length > 1 ? `${files.length} files ` : ''}to {FORMATS[to].label}
            </button>
          </div>
        </div>
      )}

      {status === 'converting' && (
        <div className="result">
          <ProgressBar progress={progress} />
          <div className="toolbar-actions" style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <button type="button" className="btn" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="result">
          <ResultPanel result={result} onReset={reset} />
        </div>
      )}

      {status === 'done' && batch && (
        <div className="result">
          <div className="toolbar">
            <span className="meta">
              {okCount} of {batch.length} files converted
            </span>
            {okCount > 1 && (
              <button className="btn btn-primary" onClick={downloadAll}>
                Download all (.zip)
              </button>
            )}
          </div>
          <ul className="queue">
            {batch.map((entry, i) => (
              <li key={i} className="queue-row">
                <span className="queue-name">
                  {entry.ok ? '✅' : '⚠️'} {entry.file.name}
                </span>
                {entry.ok ? (
                  <button
                    className="btn-link"
                    onClick={() => downloadBlob(entry.result.blob, entry.result.filename)}
                  >
                    Download {entry.result.filename.split('.').pop().toUpperCase()}
                  </button>
                ) : (
                  <span className="error queue-error">{entry.error?.message || 'failed'}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="convert-again">
            <button className="btn-link" onClick={reset}>
              Convert more files
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
