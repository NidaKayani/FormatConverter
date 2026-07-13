import { useEffect, useMemo, useState } from 'react'
import { runTool, FORMATS, getTool } from '../converters/index.js'
import Dropzone from './Dropzone.jsx'
import ProgressBar from './ProgressBar.jsx'
import OptionsPanel from './OptionsPanel.jsx'
import ResultPanel from './ResultPanel.jsx'
import { formatBytes } from '../lib/format.js'

function loadOptions(toolId, schema) {
  const values = {}
  for (const opt of schema) values[opt.key] = opt.default
  try {
    const saved = JSON.parse(localStorage.getItem(`fc-tool-options:${toolId}`) || '{}')
    for (const opt of schema) {
      if (opt.key in saved) values[opt.key] = saved[opt.key]
    }
  } catch {
    // corrupted storage — defaults are fine
  }
  return values
}

function saveOptions(toolId, values) {
  try {
    localStorage.setItem(`fc-tool-options:${toolId}`, JSON.stringify(values))
  } catch {
    // storage full/blocked — stickiness is best-effort
  }
}

function acceptForFormats(formats) {
  return formats
    .flatMap((key) => {
      const fmt = FORMATS[key]
      if (!fmt) return []
      return [fmt.mime, ...fmt.exts.map((e) => `.${e}`)]
    })
    .join(',')
}

/**
 * Multi-input tool flow with an ordered file queue (move up/down).
 */
export default function ToolWidget({ toolId, initialFiles = null }) {
  const tool = getTool(toolId)
  const schema = tool?.options || []
  const ordered = tool?.inputs?.ordered !== false
  const formats = tool?.inputs?.formats || []

  const [files, setFiles] = useState([])
  const [options, setOptions] = useState(() => loadOptions(toolId, schema))
  const [status, setStatus] = useState('idle') // idle | ready | converting | done | error
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const hint = useMemo(() => {
    const labels = formats.map((f) => FORMATS[f]?.label || f).join(', ')
    const min = tool?.inputs?.min || 1
    return `Drag & drop ${labels} files (${min}+), or click to browse`
  }, [formats, tool])

  const run = async (theFiles, opts) => {
    setStatus('converting')
    setProgress(null)
    setError('')
    saveOptions(toolId, opts)
    try {
      const res = await runTool(toolId, theFiles, { ...opts, onProgress: setProgress })
      setResult(res)
      setStatus('done')
    } catch (err) {
      setError(err.message || 'Tool failed.')
      setStatus('error')
    }
  }

  const handleFiles = (incoming) => {
    const next = ordered ? [...files, ...incoming] : incoming
    setFiles(next)
    setResult(null)
    setStatus('ready')
  }

  useEffect(() => {
    if (initialFiles?.length) handleFiles(initialFiles)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles])

  const move = (index, dir) => {
    const j = index + dir
    if (j < 0 || j >= files.length) return
    const next = files.slice()
    ;[next[index], next[j]] = [next[j], next[index]]
    setFiles(next)
  }

  const removeAt = (index) => {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    if (!next.length) setStatus('idle')
  }

  const reset = () => {
    setFiles([])
    setResult(null)
    setError('')
    setStatus('idle')
  }

  const min = tool?.inputs?.min || 1
  const canRun = files.length >= min

  return (
    <div className="widget">
      {(status === 'idle' || status === 'error') && (
        <Dropzone
          accept={acceptForFormats(formats)}
          hint={hint}
          onFile={(f) => handleFiles([f])}
          onFiles={handleFiles}
          multiple
          error={error}
        />
      )}

      {status === 'ready' && files.length > 0 && (
        <div className="result">
          <div className="file-info">
            <div>
              <strong>{files.length} file{files.length === 1 ? '' : 's'}</strong>
            </div>
            <button className="btn-link" onClick={reset}>
              Clear
            </button>
          </div>
          <ul className="queue">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="queue-row">
                <span className="queue-name">
                  {ordered ? `${i + 1}. ` : ''}
                  {f.name}
                </span>
                <span className="meta">{formatBytes(f.size)}</span>
                {ordered && (
                  <span className="queue-actions">
                    <button className="btn-link" type="button" onClick={() => move(i, -1)} disabled={i === 0}>
                      Up
                    </button>
                    <button
                      className="btn-link"
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === files.length - 1}
                    >
                      Down
                    </button>
                    <button className="btn-link" type="button" onClick={() => removeAt(i)}>
                      Remove
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="meta">
            <button className="btn-link" type="button" onClick={() => setStatus('idle')}>
              Add more files
            </button>
          </p>
          <OptionsPanel schema={schema} values={options} onChange={setOptions} />
          <div className="toolbar-actions" style={{ justifyContent: 'flex-end', display: 'flex' }}>
            <button
              className="btn btn-primary"
              disabled={!canRun}
              onClick={() => run(files, options)}
            >
              {tool.label}
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
