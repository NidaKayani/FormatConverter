import { useRef, useState } from 'react'

export default function Dropzone({ accept, hint, onFile, error, compact = false }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const pick = (file) => {
    if (file) onFile(file)
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
        pick(e.dataTransfer.files?.[0])
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
        hidden
      />
      <div className="dropzone-icon">📄</div>
      <p className="dropzone-text">{hint || 'Drag & drop a file, or click to browse'}</p>
      <p className="dropzone-subtext">Converted locally in your browser — nothing is uploaded.</p>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
