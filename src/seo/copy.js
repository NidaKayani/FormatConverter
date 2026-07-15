export const ORIGIN = 'https://formatconvert.quantumlogicslimited.com'

export const HOME_TITLE = 'FormatConvert — Convert files in your browser'
export const HOME_DESCRIPTION =
  'Client-side file converter for documents, images, data, ebooks, subtitles, and media. Nothing uploaded. Free developer SDK.'

export const DEVELOPERS_TITLE = 'Developer API'
export const DEVELOPERS_DESCRIPTION =
  'Use FormatConvert conversions in your own site with the browser SDK — no uploads, no API keys. Convert PDF, Markdown, images, and more entirely in the browser.'

/** Pair-specific short descriptions (from-to key). */
export const DESCRIPTIONS = {
  'pdf-txt':
    'Extracts real text using character positions — column-aware reading order, paragraph gaps, and optional OCR for scanned pages.',
  'pdf-md':
    'Rebuilds document structure — font sizes become headings, bold stays bold, bullets become lists.',
  'pdf-html': 'Structured extraction rendered as a clean, styled HTML document.',
  'md-pdf':
    'Typesets headings, lists, tables, code blocks, quotes and links into a proper PDF.',
  'html-pdf': 'Renders your HTML content into a typeset, paginated PDF.',
  'txt-pdf':
    'Beautiful plain-text typesetting with font, margin, and Unicode options — or Markdown mode for structured layouts.',
  'pdf-png': 'Renders each PDF page to a high-resolution image. Multi-page PDFs download as a zip.',
  'pdf-jpg': 'Renders each PDF page to a high-resolution JPEG. Multi-page PDFs download as a zip.',
  'pdf-webp': 'Renders each PDF page to WebP. Multi-page PDFs download as a zip.',
  'pdf-avif': 'Renders each PDF page to AVIF. Multi-page PDFs download as a zip.',
  'toml-json': 'Parses TOML into structured data and serializes JSON — types preserved in your browser.',
  'json-toml': 'Converts JSON objects into TOML — entirely client-side.',
  'ass-srt': 'Converts ASS/SSA dialogue cues into standard SRT subtitles with accurate timestamps.',
  'srt-ass': 'Builds an ASS subtitle script from SRT cues for players that prefer Advanced SubStation.',
}

export const KIND_FALLBACK = {
  image: 'Full decode and re-encode with quality and size options — a true pixel-level conversion.',
  data: 'Parses your data into a tabular model (or preserves tree shape for JSON/YAML/TOML/XML) and re-serializes — entirely in your browser.',
  ebook: 'Reads or builds EPUB 3 packages with real chapter structure — nothing uploaded.',
  subtitle: 'Converts subtitle cues with accurate timestamps — SRT, VTT, ASS/SSA, and plain text.',
  audio: 'Transcodes audio with ffmpeg.wasm running locally in your browser (~31 MB engine, cached after first use).',
  video: 'Transcodes or extracts from video with ffmpeg.wasm — WebM output when libvpx is available; keep files under ~500 MB.',
  document: 'A real structural conversion, processed entirely in your browser.',
}

export function describePair(from, to, formats) {
  const key = `${from}-${to}`
  if (DESCRIPTIONS[key]) return DESCRIPTIONS[key]
  const kind = formats[from]?.kind
  if (formats[to]?.kind === 'image' || kind === 'image') return KIND_FALLBACK.image
  return KIND_FALLBACK[kind] || KIND_FALLBACK.document
}

export function ogImageUrl(path = '/') {
  if (path === '/' || path === '') return `${ORIGIN}/og/default.svg`
  const slug = path.replace(/^\//, '').replace(/\//g, '-')
  return `${ORIGIN}/og/${slug}.svg`
}

/** Shared FAQ for convert/tool landings. */
export const CONVERTER_FAQ = [
  {
    question: 'Is my file uploaded to a server?',
    answer:
      'No. FormatConvert runs entirely in your browser. Files stay on your device; nothing is sent to our servers for conversion.',
  },
  {
    question: 'What file sizes work best?',
    answer:
      'Documents and images usually work well up to tens of megabytes. Audio/video uses ffmpeg.wasm — keep media under about 500 MB when possible.',
  },
  {
    question: 'Does PDF to text work on scanned PDFs?',
    answer:
      'Yes. When a PDF has little or no text layer, auto OCR runs on empty pages (or force OCR on all pages). English is bundled; other languages download on first use.',
  },
]
