import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FORMATS, getConversion } from '../converters/index.js'
import { takePendingFile } from '../lib/pendingFile.js'
import ConverterWidget from '../components/ConverterWidget.jsx'
import NotFound from './NotFound.jsx'

const DESCRIPTIONS = {
  'pdf-txt': 'Extracts real text using each character’s position on the page, so columns, tables and paragraphs stay readable.',
  'pdf-md': 'Rebuilds document structure — font sizes become headings, bold stays bold, bullets become lists.',
  'pdf-html': 'Structured extraction rendered as a clean, styled HTML document.',
  'md-pdf': 'Typesets headings, lists, tables, code blocks, quotes and links into a proper PDF.',
  'html-pdf': 'Renders your HTML content into a typeset, paginated PDF.',
  'txt-pdf': 'Preserves your exact line and paragraph structure with clean typesetting.',
  'pdf-png': 'Renders each PDF page to a high-resolution image. Multi-page PDFs download as a zip.',
  'pdf-jpg': 'Renders each PDF page to a high-resolution image. Multi-page PDFs download as a zip.',
}

export default function Convert() {
  const { pair } = useParams()
  const match = /^([a-z]+)-to-([a-z]+)$/.exec(pair || '')
  const from = match?.[1]
  const to = match?.[2]
  const entry = from && to ? getConversion(from, to) : null

  // Read the handed-off file exactly once per mount
  const initialFile = useMemo(() => takePendingFile(), [])

  if (!entry) return <NotFound />

  const title = `${FORMATS[from].label} to ${FORMATS[to].label}`
  const description =
    DESCRIPTIONS[`${from}-${to}`] ||
    (FORMATS[from].kind === 'image' || FORMATS[to].kind === 'image'
      ? 'Full decode and re-encode with quality and size options — a true pixel-level conversion.'
      : 'A real structural conversion, processed entirely in your browser.')

  return (
    <>
      <header className="header">
        <p className="breadcrumb">
          <Link to="/">All converters</Link> / {title}
        </p>
        <h1>{title} Converter</h1>
        <p>{description}</p>
      </header>
      <ConverterWidget key={pair} from={from} to={to} initialFile={initialFile} />
    </>
  )
}
