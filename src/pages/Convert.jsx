import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FORMATS, getConversion } from '../converters/index.js'
import { takePendingFile } from '../lib/pendingFile.js'
import ConverterWidget from '../components/ConverterWidget.jsx'
import Seo from '../components/Seo.jsx'
import NotFound from './NotFound.jsx'

const ORIGIN = 'https://formatconvert.quantumlogicslimited.com'

const DESCRIPTIONS = {
  'pdf-txt': 'Extracts real text using each character’s position on the page, so columns, tables and paragraphs stay readable.',
  'pdf-md': 'Rebuilds document structure — font sizes become headings, bold stays bold, bullets become lists.',
  'pdf-html': 'Structured extraction rendered as a clean, styled HTML document.',
  'md-pdf': 'Typesets headings, lists, tables, code blocks, quotes and links into a proper PDF.',
  'html-pdf': 'Renders your HTML content into a typeset, paginated PDF.',
  'txt-pdf': 'Preserves your exact line and paragraph structure with clean typesetting.',
  'pdf-png': 'Renders each PDF page to a high-resolution image. Multi-page PDFs download as a zip.',
  'pdf-jpg': 'Renders each PDF page to a high-resolution JPEG. Multi-page PDFs download as a zip.',
  'pdf-webp': 'Renders each PDF page to WebP. Multi-page PDFs download as a zip.',
  'pdf-avif': 'Renders each PDF page to AVIF. Multi-page PDFs download as a zip.',
  'toml-json': 'Parses TOML into structured data and serializes JSON — types preserved in your browser.',
  'json-toml': 'Converts JSON objects into TOML — entirely client-side.',
  'ass-srt': 'Converts ASS/SSA dialogue cues into standard SRT subtitles with accurate timestamps.',
  'srt-ass': 'Builds an ASS subtitle script from SRT cues for players that prefer Advanced SubStation.',
}

const KIND_FALLBACK = {
  image: 'Full decode and re-encode with quality and size options — a true pixel-level conversion.',
  data: 'Parses your data into a tabular model (or preserves tree shape for JSON/YAML/TOML/XML) and re-serializes — entirely in your browser.',
  ebook: 'Reads or builds EPUB 3 packages with real chapter structure — nothing uploaded.',
  subtitle: 'Converts subtitle cues with accurate timestamps — SRT, VTT, ASS/SSA, and plain text.',
  audio: 'Transcodes audio with ffmpeg.wasm running locally in your browser (~31 MB engine, cached after first use).',
  video: 'Transcodes or extracts from video with ffmpeg.wasm — WebM output when libvpx is available; keep files under ~500 MB.',
  document: 'A real structural conversion, processed entirely in your browser.',
}

function describe(from, to) {
  const key = `${from}-${to}`
  if (DESCRIPTIONS[key]) return DESCRIPTIONS[key]
  const kind = FORMATS[from].kind
  if (FORMATS[to].kind === 'image' || kind === 'image') return KIND_FALLBACK.image
  return KIND_FALLBACK[kind] || KIND_FALLBACK.document
}

export default function Convert() {
  const { pair } = useParams()
  const match = /^([a-z0-9]+)-to-([a-z0-9]+)$/.exec(pair || '')
  const from = match?.[1]
  const to = match?.[2]
  const entry = from && to ? getConversion(from, to) : null

  const initialFile = useMemo(() => takePendingFile(), [])

  if (!entry) return <NotFound />

  const title = `${FORMATS[from].label} to ${FORMATS[to].label}`
  const description = describe(from, to)

  return (
    <>
      <Seo
        title={`${title} Converter`}
        description={description}
        breadcrumbs={[
          { name: 'Home', url: `${ORIGIN}/` },
          { name: title, url: `${ORIGIN}/convert/${from}-to-${to}` },
        ]}
      />
      <header className="header">
        <p className="breadcrumb">
          <Link to="/">All converters</Link> / {title}
        </p>
        <h1>{title} Converter</h1>
        <p>{description}</p>
        {FORMATS[from].kind === 'image' && to === 'pdf' && (
          <p className="meta">
            <Link to="/tools/images-to-pdf">Combine into one PDF instead →</Link>
          </p>
        )}
      </header>
      <ConverterWidget key={pair} from={from} to={to} initialFile={initialFile} />
    </>
  )
}
