import { useEffect, useMemo, useState } from 'react'
import { downloadBlob, formatBytes } from '../lib/format.js'

export default function ResultPanel({ result, onReset }) {
  const { blob, filename } = result
  const isText = blob.type.startsWith('text/') || blob.type === 'application/json'
  const isImage = blob.type.startsWith('image/') && blob.type !== 'image/x-icon'
  const isPdf = blob.type === 'application/pdf'

  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const objectUrl = useMemo(
    () => (isImage || isPdf ? URL.createObjectURL(blob) : null),
    [blob, isImage, isPdf]
  )

  useEffect(() => {
    if (isText) blob.text().then(setText)
  }, [blob, isText])

  useEffect(() => () => objectUrl && URL.revokeObjectURL(objectUrl), [objectUrl])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="toolbar">
        <span className="meta">
          {filename} · {formatBytes(blob.size)}
        </span>
        <div className="toolbar-actions">
          {isText && (
            <button className="btn" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button className="btn btn-primary" onClick={() => downloadBlob(blob, filename)}>
            Download {filename.split('.').pop().toUpperCase()}
          </button>
        </div>
      </div>

      {isText && <textarea className="output" value={text} readOnly />}
      {isImage && (
        <div className="preview-frame">
          <img src={objectUrl} alt="Converted output" className="preview-image" />
        </div>
      )}
      {isPdf && <iframe src={objectUrl} title="Converted PDF" className="preview-pdf" />}
      {!isText && !isImage && !isPdf && (
        <p className="meta preview-note">
          Ready to download{blob.type === 'application/zip' ? ' — pages are bundled in a .zip.' : '.'}
        </p>
      )}

      <p className="convert-again">
        <button className="btn-link" onClick={onReset}>
          Convert another file
        </button>
      </p>
    </>
  )
}
