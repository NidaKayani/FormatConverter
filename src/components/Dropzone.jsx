import { useRef, useState } from 'react'

export default function Dropzone({ accept, hint, onFile, onFiles, multiple = false, error, compact = false }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const pick = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean)
    if (files.length === 0) return
    if (multiple && onFiles) onFiles(files)
    else onFile(files[0])
  }

  return (
    <div
      className={`dropzone ${dragActive ? 'active' : ''} ${compact ? 'compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        pick(e.dataTransfer.files)
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = ''
        }}
        hidden
      />
      <div className="dropzone-icon">📄</div>
      <p className="dropzone-text">{hint || 'Drag & drop a file, or click to browse'}</p>
      <p className="dropzone-subtext">
        Converted locally in your browser — nothing is uploaded.
        {multiple ? ' Drop multiple files to batch-convert, or paste with Ctrl+V.' : ''}
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
