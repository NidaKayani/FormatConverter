import { useEffect, useMemo, useState } from 'react'
import { convert, convertMany, zipResults, FORMATS, getConversion } from '../converters/index.js'
import { acceptFor } from '../converters/registry.js'
import Dropzone from './Dropzone.jsx'
import ProgressBar from './ProgressBar.jsx'
import OptionsPanel from './OptionsPanel.jsx'
import ResultPanel from './ResultPanel.jsx'
import { formatBytes, downloadBlob } from '../lib/format.js'

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

  const hint = useMemo(
    () =>
      single
        ? `Drag & drop a ${FORMATS[from].label} file, or click to browse`
        : `Drag & drop ${FORMATS[from].label} files, or click to browse`,
    [from, single]
  )

  const run = async (theFiles, opts) => {
    setStatus('converting')
    setProgress(null)
    setError('')
    saveOptions(pair, opts)
    try {
      if (theFiles.length === 1) {
        const res = await convert(theFiles[0], to, { ...opts, onProgress: setProgress })
        setResult(res)
        setStatus('done')
        onResult?.(res)
      } else {
        const results = await convertMany(theFiles, to, { ...opts, onProgress: setProgress })
        setBatch(results)
        setStatus('done')
      }
    } catch (err) {
      setError(err.message || 'Conversion failed.')
      setStatus('error')
    }
  }

  const handleFiles = (theFiles) => {
    setFiles(theFiles)
    setResult(null)
    setBatch(null)
    if (schema.length > 0 || theFiles.length > 1) setStatus('ready')
    else run(theFiles, options)
  }

  useEffect(() => {
    if (initialFile) handleFiles([initialFile])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile])

  const reset = () => {
    setFiles([])
    setResult(null)
    setBatch(null)
    setError('')
    setStatus('idle')
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
          {files.length > 1 && (
            <ul className="queue">
              {files.map((f, i) => (
                <li key={i} className="queue-row">
                  <span className="queue-name">{f.name}</span>
                  <span className="meta">{formatBytes(f.size)}</span>
                </li>
              ))}
            </ul>
          )}
          <OptionsPanel schema={schema} values={options} onChange={setOptions} />
          <div className="toolbar-actions" style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <button className="btn btn-primary" onClick={() => run(files, options)}>
              Convert {files.length > 1 ? `${files.length} files ` : ''}to {FORMATS[to].label}
            </button>
          </div>
        </div>
      )}

      {status === 'converting' && (
        <div className="result">
          <ProgressBar progress={progress} />
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
