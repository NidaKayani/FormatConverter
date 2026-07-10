import { useEffect, useMemo, useState } from 'react'
import { convert, FORMATS, getConversion } from '../converters/index.js'
import { acceptFor } from '../converters/registry.js'
import Dropzone from './Dropzone.jsx'
import ProgressBar from './ProgressBar.jsx'
import OptionsPanel from './OptionsPanel.jsx'
import ResultPanel from './ResultPanel.jsx'
import { formatBytes } from '../lib/format.js'

function defaultsFor(schema) {
  const values = {}
  for (const opt of schema) values[opt.key] = opt.default
  return values
}

/**
 * Full conversion flow for a fixed from→to pair: drop file → (options) →
 * progress → preview/download. `initialFile` lets the Home page hand a file
 * straight in; `onResult` lets the embed page forward results to its parent.
 */
export default function ConverterWidget({ from, to, initialFile = null, onResult }) {
  const entry = getConversion(from, to)
  const schema = entry?.options || []

  const [file, setFile] = useState(initialFile)
  const [options, setOptions] = useState(() => defaultsFor(schema))
  const [status, setStatus] = useState('idle') // idle | ready | converting | done | error
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const hint = useMemo(
    () => `Drag & drop a ${FORMATS[from].label} file, or click to browse`,
    [from]
  )

  const run = async (theFile, opts) => {
    setStatus('converting')
    setProgress(null)
    setError('')
    try {
      const res = await convert(theFile, to, {
        ...opts,
        onProgress: (p) => setProgress(p),
      })
      setResult(res)
      setStatus('done')
      onResult?.(res)
    } catch (err) {
      setError(err.message || 'Conversion failed.')
      setStatus('error')
    }
  }

  const handleFile = (theFile) => {
    setFile(theFile)
    setResult(null)
    if (schema.length > 0) setStatus('ready')
    else run(theFile, options)
  }

  useEffect(() => {
    if (initialFile) handleFile(initialFile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile])

  const reset = () => {
    setFile(null)
    setResult(null)
    setError('')
    setStatus('idle')
  }

  return (
    <div className="widget">
      {(status === 'idle' || status === 'error') && (
        <Dropzone accept={acceptFor(from)} hint={hint} onFile={handleFile} error={error} />
      )}

      {status === 'ready' && file && (
        <div className="result">
          <div className="file-info">
            <div>
              <strong>{file.name}</strong>
              <span className="meta"> · {formatBytes(file.size)}</span>
            </div>
            <button className="btn-link" onClick={reset}>
              Choose another file
            </button>
          </div>
          <OptionsPanel schema={schema} values={options} onChange={setOptions} />
          <div className="toolbar-actions" style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <button className="btn btn-primary" onClick={() => run(file, options)}>
              Convert to {FORMATS[to].label}
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
    </div>
  )
}
