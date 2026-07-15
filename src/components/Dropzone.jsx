import { useRef, useState } from 'react'

function DropIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Dropzone({ accept, hint, onFile, onFiles, multiple = false, error, compact = false }) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const pick = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean)
    if (files.length === 0) return
    if (multiple && onFiles) onFiles(files)
    else onFile(files[0])
  }

  const openPicker = () => inputRef.current?.click()

  return (
    <div
      className={`dropzone ${dragActive ? 'active' : ''} ${compact ? 'compact' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={hint || 'Choose a file to convert'}
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
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openPicker()
        }
      }}
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
      <div className="dropzone-icon">
        <DropIcon />
      </div>
      <p className="dropzone-text">{hint || 'Drag & drop a file, or click to browse'}</p>
      <p className="dropzone-subtext">
        Converted locally in your browser — nothing is uploaded.
        {multiple
          ? ' Drop multiple files to batch-convert, or paste with Ctrl+V / ⌘V.'
          : ' Paste with Ctrl+V / ⌘V when supported.'}
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
