import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FORMATS, targetsFor, detectFormat } from '../converters/index.js'
import { setPendingFile } from '../lib/pendingFile.js'
import { formatBytes } from '../lib/format.js'
import Dropzone from '../components/Dropzone.jsx'

const DOC_SOURCES = ['pdf', 'txt', 'md', 'html']
const IMAGE_SOURCES = ['png', 'jpg', 'webp', 'gif', 'svg', 'bmp', 'heic', 'ico']

function SourceCard({ from }) {
  const targets = targetsFor(from)
  if (!targets.length) return null
  return (
    <div className="card">
      <div className="card-title">
        {FORMATS[from].label}
        <span className="card-arrow">→</span>
      </div>
      <div className="card-targets">
        {targets.map((to) => (
          <Link key={to} to={`/convert/${from}-to-${to}`} className="chip">
            {FORMATS[to].label}
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [detected, setDetected] = useState(null) // { file, from, targets }
  const [error, setError] = useState('')

  const handleFile = async (file) => {
    setError('')
    try {
      const from = await detectFormat(file)
      const targets = from ? targetsFor(from) : []
      if (!from || targets.length === 0) {
        setError('Sorry, that file type is not supported yet.')
        return
      }
      setDetected({ file, from, targets })
    } catch {
      setError('Could not read that file.')
    }
  }

  const go = (to) => {
    setPendingFile(detected.file)
    navigate(`/convert/${detected.from}-to-${to}`)
  }

  return (
    <>
      <header className="header">
        <h1>Convert any file. Right in your browser.</h1>
        <p>
          PDF, Markdown, HTML, text, and eight image formats — real parsing and rendering, with
          nothing uploaded to any server.
        </p>
      </header>

      {!detected ? (
        <Dropzone
          hint="Drop any file here — we'll detect its format"
          onFile={handleFile}
          error={error}
        />
      ) : (
        <div className="result detect-panel">
          <div className="file-info">
            <div>
              <strong>{detected.file.name}</strong>
              <span className="meta">
                {' '}
                · {formatBytes(detected.file.size)} · detected as {FORMATS[detected.from].label}
              </span>
            </div>
            <button className="btn-link" onClick={() => setDetected(null)}>
              Choose another file
            </button>
          </div>
          <p className="detect-label">Convert to:</p>
          <div className="card-targets">
            {detected.targets.map((to) => (
              <button key={to} className="chip chip-button" onClick={() => go(to)}>
                {FORMATS[to].label}
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="section">
        <h2>Documents</h2>
        <div className="cards">
          {DOC_SOURCES.map((from) => (
            <SourceCard key={from} from={from} />
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Images</h2>
        <div className="cards">
          {IMAGE_SOURCES.map((from) => (
            <SourceCard key={from} from={from} />
          ))}
        </div>
      </section>
    </>
  )
}
