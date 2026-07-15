import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  FORMATS,
  targetsFor,
  detectFormat,
  KINDS,
  sourcesForKind,
  listTools,
  listConversions,
} from '../converters/index.js'
import { setPendingFile } from '../lib/pendingFile.js'
import { formatBytes } from '../lib/format.js'
import { loadRecent } from '../lib/recent.js'
import Dropzone from '../components/Dropzone.jsx'
import Seo from '../components/Seo.jsx'
import { HOME_TITLE, HOME_DESCRIPTION } from '../seo/copy.js'

const CHIP_PREVIEW = 6

function FormatCard({ from }) {
  const targets = targetsFor(from)
  const [expanded, setExpanded] = useState(false)
  if (!targets.length) return null
  const visible = expanded ? targets : targets.slice(0, CHIP_PREVIEW)
  const hidden = targets.length - visible.length

  return (
    <div className="format-card card">
      <div className="format-card-title">
        {FORMATS[from].label}
        <span>→</span>
      </div>
      <div className="format-card-targets card-targets">
        {visible.map((to) => (
          <Link key={to} to={`/convert/${from}-to-${to}`}>
            {FORMATS[to].label}
          </Link>
        ))}
        {!expanded && hidden > 0 && (
          <button type="button" className="chip" onClick={() => setExpanded(true)}>
            +{hidden} more
          </button>
        )}
        {expanded && targets.length > CHIP_PREVIEW && (
          <button type="button" className="chip" onClick={() => setExpanded(false)}>
            Less
          </button>
        )}
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

  const kindSections = KINDS.map((kind) => ({
    ...kind,
    sources: sourcesForKind(kind.id),
  })).filter((k) => k.sources.length)

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
    <div className="home">
      <Seo title={HOME_TITLE} description={HOME_DESCRIPTION} path="/" />

      <section className="home-hero">
        <p className="home-kicker">Quantum Logics</p>
        <h1 className="home-brand">FormatConvert</h1>
        <p className="home-lede">
          Convert files in your browser. Nothing is uploaded — every conversion stays on your device.
        </p>
        <p className="home-stats">
          {formatCount} formats · {pairCount} conversion pairs
        </p>
      </section>

      <div className="home-drop">
        {!detected ? (
          <Dropzone
            hint="Drop a file to get started"
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
                  · {formatBytes(detected.file.size)} · {FORMATS[detected.from].label}
                </span>
              </div>
              <button type="button" className="btn-link" onClick={() => setDetected(null)}>
                Choose another
              </button>
            </div>
            <p className="detect-label">Convert to</p>
            <div className="card-targets">
              {detected.targets.map((to) => (
                <button key={to} type="button" className="chip" onClick={() => go(to)}>
                  {FORMATS[to].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="recent-strip" aria-label="Recent conversions">
          {recent.map((e) => (
            <Link key={`${e.from}-${e.to}`} to={`/convert/${e.from}-to-${e.to}`}>
              {FORMATS[e.from]?.label || e.from} → {FORMATS[e.to]?.label || e.to}
            </Link>
          ))}
        </div>
      )}

      <section className="home-browse">
        <nav className="kind-tabs" aria-label="Format categories">
          {kindSections.map((kind) => (
            <a key={kind.id} href={`#kind-${kind.id}`}>
              {kind.label}
            </a>
          ))}
          {tools.length > 0 && <a href="#kind-tools">Tools</a>}
        </nav>

        {kindSections.map((kind) => (
          <div key={kind.id} className="format-block" id={`kind-${kind.id}`} data-kind={kind.id}>
            <h2>{kind.label}</h2>
            <div className="format-grid">
              {kind.sources.map((from) => (
                <FormatCard key={from} from={from} />
              ))}
            </div>
          </div>
        ))}

        {tools.length > 0 && (
          <div className="format-block" id="kind-tools" data-kind="tools">
            <h2>Tools</h2>
            <div className="tool-grid">
              {tools.map((t) => (
                <Link key={t.id} to={`/tools/${t.id}`} className="tool-tile">
                  <strong>{t.label}</strong>
                  <span>{t.description}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
