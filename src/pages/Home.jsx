import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FORMATS, targetsFor, detectFormat, KINDS, sourcesForKind, listTools, listConversions } from '../converters/index.js'
import { setPendingFile } from '../lib/pendingFile.js'
import { formatBytes } from '../lib/format.js'
import { loadRecent } from '../lib/recent.js'
import Dropzone from '../components/Dropzone.jsx'
import Seo from '../components/Seo.jsx'
import { HOME_TITLE, HOME_DESCRIPTION } from '../seo/copy.js'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [detected, setDetected] = useState(null)
  const [error, setError] = useState('')
  const tools = listTools()
  const pairCount = listConversions().length
  const formatCount = Object.keys(FORMATS).filter((k) => FORMATS[k].input).length
  const [recent, setRecent] = useState(() => loadRecent())

  useEffect(() => {
    setRecent(loadRecent())
  }, [])

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

  useEffect(() => {
    if (searchParams.get('share-target') !== '1') return
    ;(async () => {
      try {
        const cache = await caches.open('share-target')
        const res = await cache.match('shared')
        if (res) {
          const buf = await res.arrayBuffer()
          const name = res.headers.get('X-Filename') || 'shared'
          const type = res.headers.get('Content-Type') || 'application/octet-stream'
          await cache.delete('shared')
          await handleFile(new File([buf], name, { type }))
        }
      } catch {
        // ignore
      } finally {
        const next = new URLSearchParams(searchParams)
        next.delete('share-target')
        setSearchParams(next, { replace: true })
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const go = (to) => {
    setPendingFile(detected.file)
    navigate(`/convert/${detected.from}-to-${to}`)
  }

  return (
    <>
      <Seo title={HOME_TITLE} description={HOME_DESCRIPTION} path="/" />
      <header className="header">
        <h1>Convert any file. Right in your browser.</h1>
        <p>
          {formatCount} formats and {pairCount}+ conversion pairs — documents, images, data, ebooks,
          subtitles, and media. Real parsing and rendering, with nothing uploaded to any server.
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

      {recent.length > 0 && (
        <section className="section" data-kind="recent">
          <h2>Recent conversions</h2>
          <div className="card-targets">
            {recent.map((e) => (
              <Link key={`${e.from}-${e.to}`} to={`/convert/${e.from}-to-${e.to}`} className="chip">
                {FORMATS[e.from]?.label || e.from} → {FORMATS[e.to]?.label || e.to}
              </Link>
            ))}
          </div>
        </section>
      )}

      {KINDS.map((kind) => {
        const sources = sourcesForKind(kind.id)
        if (!sources.length) return null
        return (
          <section key={kind.id} className="section" data-kind={kind.id}>
            <h2>{kind.label}</h2>
            <div className="cards">
              {sources.map((from) => (
                <SourceCard key={from} from={from} />
              ))}
            </div>
          </section>
        )
      })}

      {tools.length > 0 && (
        <section className="section" data-kind="tools">
          <h2>Tools</h2>
          <div className="cards">
            {tools.map((t) => (
              <div key={t.id} className="card">
                <div className="card-title">{t.label}</div>
                <p className="meta">{t.description}</p>
                <div className="card-targets">
                  <Link to={`/tools/${t.id}`} className="chip">
                    Open tool
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
