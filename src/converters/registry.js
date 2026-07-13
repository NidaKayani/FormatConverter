/**
 * Central registry of formats and conversions. Both the web UI and the SDK
 * read from here, so the supported matrix and option schemas never drift.
 *
 * Converter modules are loaded with dynamic import() so the app only pulls in
 * the code (pdf.js, jsPDF, heic decoder, ...) a given conversion needs.
 */

/** Ordered kind sections for Home and the Developers matrix. */
export const KINDS = [
  { id: 'document', label: 'Documents' },
  { id: 'image', label: 'Images' },
  { id: 'data', label: 'Data' },
  { id: 'ebook', label: 'Ebooks' },
  { id: 'subtitle', label: 'Subtitles' },
  { id: 'audio', label: 'Audio' },
  { id: 'video', label: 'Video' },
]

export const FORMATS = {
  pdf:  { label: 'PDF',      kind: 'document', exts: ['pdf'], mime: 'application/pdf', input: true, output: true },
  txt:  { label: 'Text',     kind: 'document', exts: ['txt', 'text', 'log'], mime: 'text/plain', input: true, output: true },
  md:   { label: 'Markdown', kind: 'document', exts: ['md', 'markdown', 'mdown'], mime: 'text/markdown', input: true, output: true },
  html: { label: 'HTML',     kind: 'document', exts: ['html', 'htm'], mime: 'text/html', input: true, output: true },
  docx: { label: 'Word',     kind: 'document', exts: ['docx'], mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', input: true, output: true },
  png:  { label: 'PNG',      kind: 'image', exts: ['png'], mime: 'image/png', input: true, output: true },
  jpg:  { label: 'JPEG',     kind: 'image', exts: ['jpg', 'jpeg'], mime: 'image/jpeg', input: true, output: true },
  webp: { label: 'WebP',     kind: 'image', exts: ['webp'], mime: 'image/webp', input: true, output: true },
  bmp:  { label: 'BMP',      kind: 'image', exts: ['bmp'], mime: 'image/bmp', input: true, output: true },
  ico:  { label: 'ICO',      kind: 'image', exts: ['ico'], mime: 'image/x-icon', input: true, output: true },
  gif:  { label: 'GIF',      kind: 'image', exts: ['gif'], mime: 'image/gif', input: true, output: true },
  svg:  { label: 'SVG',      kind: 'image', exts: ['svg'], mime: 'image/svg+xml', input: true, output: false },
  heic: { label: 'HEIC',     kind: 'image', exts: ['heic', 'heif'], mime: 'image/heic', input: true, output: false },
  tiff: { label: 'TIFF',     kind: 'image', exts: ['tiff', 'tif'], mime: 'image/tiff', input: true, output: true },
  avif: { label: 'AVIF',     kind: 'image', exts: ['avif'], mime: 'image/avif', input: true, output: true },
  csv:  { label: 'CSV',      kind: 'data', exts: ['csv'], mime: 'text/csv', input: true, output: true },
  tsv:  { label: 'TSV',      kind: 'data', exts: ['tsv', 'tab'], mime: 'text/tab-separated-values', input: true, output: true },
  xlsx: { label: 'Excel',    kind: 'data', exts: ['xlsx'], mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', input: true, output: true },
  json: { label: 'JSON',     kind: 'data', exts: ['json'], mime: 'application/json', input: true, output: true },
  yaml: { label: 'YAML',     kind: 'data', exts: ['yaml', 'yml'], mime: 'application/yaml', input: true, output: true },
  toml: { label: 'TOML',     kind: 'data', exts: ['toml'], mime: 'application/toml', input: true, output: true },
  xml:  { label: 'XML',      kind: 'data', exts: ['xml'], mime: 'application/xml', input: true, output: true },
  epub: { label: 'EPUB',     kind: 'ebook', exts: ['epub'], mime: 'application/epub+zip', input: true, output: true },
  srt:  { label: 'SRT',      kind: 'subtitle', exts: ['srt'], mime: 'application/x-subrip', input: true, output: true },
  vtt:  { label: 'VTT',      kind: 'subtitle', exts: ['vtt'], mime: 'text/vtt', input: true, output: true },
  ass:  { label: 'ASS',      kind: 'subtitle', exts: ['ass'], mime: 'text/x-ass', input: true, output: true },
  ssa:  { label: 'SSA',      kind: 'subtitle', exts: ['ssa'], mime: 'text/x-ssa', input: true, output: true },
  mp3:  { label: 'MP3',      kind: 'audio', exts: ['mp3'], mime: 'audio/mpeg', input: true, output: true },
  wav:  { label: 'WAV',      kind: 'audio', exts: ['wav'], mime: 'audio/wav', input: true, output: true },
  ogg:  { label: 'OGG',      kind: 'audio', exts: ['ogg', 'oga'], mime: 'audio/ogg', input: true, output: true },
  flac: { label: 'FLAC',     kind: 'audio', exts: ['flac'], mime: 'audio/flac', input: true, output: true },
  m4a:  { label: 'M4A',      kind: 'audio', exts: ['m4a'], mime: 'audio/mp4', input: true, output: true },
  mp4:  { label: 'MP4',      kind: 'video', exts: ['mp4'], mime: 'video/mp4', input: true, output: true },
  webm: { label: 'WebM',     kind: 'video', exts: ['webm'], mime: 'video/webm', input: true, output: true },
  mov:  { label: 'MOV',      kind: 'video', exts: ['mov'], mime: 'video/quicktime', input: true, output: false },
}

// ---------------------------------------------------------------------------
// Option schemas (drive both the UI options panel and the SDK docs)
// ---------------------------------------------------------------------------

const OPT_PAGE_SIZE = {
  key: 'pageSize', label: 'Page size', type: 'select', default: 'a4',
  choices: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }],
  help: 'Paper size of the generated PDF.',
}
const OPT_QUALITY = {
  key: 'quality', label: 'Quality', type: 'range', default: 0.92, min: 0.1, max: 1, step: 0.01,
  help: 'Compression quality for lossy formats (JPEG/WebP).',
}
const OPT_WIDTH = {
  key: 'width', label: 'Resize width (px)', type: 'number', default: null, min: 1, max: 16384,
  help: 'Optional output width in pixels; height scales to keep aspect ratio.',
}
const OPT_BACKGROUND = {
  key: 'background', label: 'Background', type: 'color', default: '#ffffff',
  help: 'Fill color for transparent areas (formats without alpha).',
}
const OPT_ICO_SIZES = {
  key: 'sizes', label: 'Icon sizes', type: 'multiselect', default: [16, 32, 48],
  choices: [16, 32, 48, 64, 128, 256].map((n) => ({ value: n, label: `${n}×${n}` })),
  help: 'Sizes embedded in the .ico file.',
}
const OPT_OCR_LANGUAGE = {
  key: 'ocrLanguage', label: 'OCR language', type: 'select', default: 'eng',
  choices: [
    { value: 'eng', label: 'English' },
    { value: 'spa', label: 'Spanish' },
    { value: 'fra', label: 'French' },
    { value: 'deu', label: 'German' },
    { value: 'por', label: 'Portuguese' },
    { value: 'ara', label: 'Arabic' },
    { value: 'hin', label: 'Hindi' },
    { value: 'chi_sim', label: 'Chinese (Simplified)' },
  ],
  help: 'Language of the text in the image. English is bundled; others download on first use.',
}
const OPT_OCR = {
  key: 'ocr', label: 'OCR scanned pages', type: 'select', default: 'auto',
  choices: [
    { value: 'auto', label: 'Auto (when no text layer)' },
    { value: 'off', label: 'Off' },
  ],
  help: 'Recognize text in scanned PDFs that have no embedded text.',
}
const OPT_SCALE = {
  key: 'scale', label: 'Render scale', type: 'select', default: 2,
  choices: [{ value: 1, label: '1× (72 dpi)' }, { value: 2, label: '2× (144 dpi)' }, { value: 3, label: '3× (216 dpi)' }],
  help: 'Resolution multiplier when rasterizing PDF pages.',
}
const OPT_SHEET = {
  key: 'sheet', label: 'Sheets', type: 'select', default: 'first',
  choices: [
    { value: 'first', label: 'First sheet only' },
    { value: 'all', label: 'All sheets (zip / sections)' },
  ],
  help: 'Which worksheets to include when reading an Excel workbook.',
}

function imageOutputOptions(to) {
  if (to === 'ico') return [OPT_ICO_SIZES]
  const opts = [OPT_WIDTH]
  if (to === 'jpg' || to === 'webp' || to === 'avif') opts.push(OPT_QUALITY)
  if (to === 'jpg' || to === 'bmp' || to === 'gif') opts.push(OPT_BACKGROUND)
  return opts
}

// ---------------------------------------------------------------------------
// Conversion table
// ---------------------------------------------------------------------------

const CONVERSIONS = {}

/**
 * @param {string} from
 * @param {string} to
 * @param {() => Promise<{ default: Function }>} load
 * @param {object[]} [options]
 * @param {{ env?: 'main'|'worker' }} [meta]
 */
function register(from, to, load, options = [], meta = {}) {
  ;(CONVERSIONS[from] ??= {})[to] = {
    from,
    to,
    load,
    options,
    env: meta.env || 'main',
  }
}

// Documents — every direction is a real parse/render, never a rename.
// PDF extraction auto-falls back to OCR for scanned documents.
register('pdf', 'txt', () => import('./docs/pdfToTxt.js'), [OPT_OCR, OPT_OCR_LANGUAGE])
register('pdf', 'md', () => import('./docs/pdfToMd.js'), [OPT_OCR, OPT_OCR_LANGUAGE])
register('pdf', 'html', () => import('./docs/pdfToHtml.js'), [OPT_OCR, OPT_OCR_LANGUAGE])
register('txt', 'pdf', () => import('./docs/textToPdf.js'), [OPT_PAGE_SIZE])
register('txt', 'md', () => import('./docs/txtToMd.js'), [], { env: 'worker' })
register('txt', 'html', () => import('./docs/txtToHtml.js'))
register('md', 'pdf', () => import('./docs/mdToPdf.js'), [OPT_PAGE_SIZE])
register('md', 'txt', () => import('./docs/mdToTxt.js'))
register('md', 'html', () => import('./docs/mdToHtml.js'), [], { env: 'worker' })
register('html', 'pdf', () => import('./docs/htmlToPdf.js'), [OPT_PAGE_SIZE])
register('html', 'md', () => import('./docs/htmlToMd.js'))
register('html', 'txt', () => import('./docs/htmlToTxt.js'))

// Word documents — mammoth on the way in, the docx generator on the way out
register('docx', 'pdf', () => import('./docs/docxToPdf.js'), [OPT_PAGE_SIZE])
register('docx', 'md', () => import('./docs/docxToMd.js'))
register('docx', 'txt', () => import('./docs/docxToTxt.js'))
register('docx', 'html', () => import('./docs/docxToHtmlDoc.js'))
register('md', 'docx', () => import('./docs/mdToDocx.js'))
register('txt', 'docx', () => import('./docs/txtToDocx.js'))
register('html', 'docx', () => import('./docs/htmlToDocx.js'))
register('pdf', 'docx', () => import('./docs/pdfToDocx.js'), [OPT_OCR, OPT_OCR_LANGUAGE])

// OCR: photos/scans → text
for (const from of ['png', 'jpg', 'webp', 'bmp', 'gif', 'heic', 'tiff', 'avif']) {
  register(from, 'txt', () => import('./ocr/imageToTxt.js'), [OPT_OCR_LANGUAGE])
}

// PDF pages → raster images (zip when multi-page)
register('pdf', 'png', () => import('./images/pdfToImages.js'), [OPT_SCALE])
register('pdf', 'jpg', () => import('./images/pdfToImages.js'), [OPT_SCALE, OPT_QUALITY])
register('pdf', 'webp', () => import('./images/pdfToImages.js'), [OPT_SCALE, OPT_QUALITY])
register('pdf', 'avif', () => import('./images/pdfToImages.js'), [OPT_SCALE, OPT_QUALITY])

// Images — decode to canvas, transform, re-encode.
const IMAGE_INPUTS = ['png', 'jpg', 'webp', 'bmp', 'gif', 'svg', 'heic', 'ico', 'tiff', 'avif']
const IMAGE_OUTPUTS = ['png', 'jpg', 'webp', 'bmp', 'ico', 'gif', 'tiff', 'avif']
for (const from of IMAGE_INPUTS) {
  for (const to of IMAGE_OUTPUTS) {
    if (from === to) continue
    register(from, to, () => import('./images/imageConvert.js'), imageOutputOptions(to))
  }
  register(from, 'pdf', () => import('./images/imageToPdf.js'), [OPT_PAGE_SIZE])
}

// Data formats — tabular IR + tree bridging.
// xlsx stays on main (SheetJS is heavy); other data pairs use the worker.
const DATA = ['csv', 'tsv', 'xlsx', 'json', 'yaml', 'toml', 'xml']
const DATA_DOC_OUT = ['md', 'html', 'txt', 'pdf', 'docx']
const loadData = () => import('./data/convert.js')
for (const from of DATA) {
  for (const to of DATA) {
    if (from === to) continue
    const opts = from === 'xlsx' ? [OPT_SHEET] : []
    const env = from === 'xlsx' || to === 'xlsx' ? 'main' : 'worker'
    register(from, to, loadData, opts, { env })
  }
  for (const to of DATA_DOC_OUT) {
    const opts = from === 'xlsx' ? [OPT_SHEET] : []
    if (to === 'pdf') opts.push(OPT_PAGE_SIZE)
    const env = from === 'xlsx' || to === 'pdf' || to === 'docx' ? 'main' : 'worker'
    register(from, to, loadData, opts, { env })
  }
}

// Ebooks
register('epub', 'html', () => import('./ebook/epubIn.js'))
register('epub', 'md', () => import('./ebook/epubIn.js'))
register('epub', 'txt', () => import('./ebook/epubIn.js'))
register('epub', 'pdf', () => import('./ebook/epubIn.js'), [OPT_PAGE_SIZE])
register('epub', 'docx', () => import('./ebook/epubIn.js'))
register('md', 'epub', () => import('./ebook/epubOut.js'), [], { env: 'worker' })
register('txt', 'epub', () => import('./ebook/epubOut.js'), [], { env: 'worker' })
register('html', 'epub', () => import('./ebook/epubOut.js'), [], { env: 'worker' })
register('docx', 'epub', () => import('./ebook/epubOut.js'))

// Subtitles
const SUBS = ['srt', 'vtt', 'ass', 'ssa', 'txt']
const loadSubs = () => import('./subtitles/convert.js')
for (const from of SUBS) {
  for (const to of SUBS) {
    if (from === to) continue
    // plain txt ↔ txt is not a conversion
    if (from === 'txt' && to === 'txt') continue
    register(from, to, loadSubs, [], { env: 'worker' })
  }
}

// Audio (ffmpeg.wasm — main thread; ffmpeg owns its worker)
const AUDIO = ['mp3', 'wav', 'ogg', 'flac', 'm4a']
for (const from of AUDIO) {
  for (const to of AUDIO) {
    if (from === to) continue
    register(from, to, () => import('./av/audio.js'))
  }
}

// Video — inputs mp4/webm/mov/gif → mp4 / webm / gif / audio extract
const VIDEO_IN = ['mp4', 'webm', 'mov']
const VIDEO_AUDIO_OUT = ['mp3', 'wav', 'ogg', 'flac', 'm4a']
for (const from of VIDEO_IN) {
  register(from, 'mp4', () => import('./av/video.js'))
  register(from, 'webm', () => import('./av/video.js'))
  register(from, 'gif', () => import('./av/videoToGif.js'))
  for (const to of VIDEO_AUDIO_OUT) {
    register(from, to, () => import('./av/video.js'))
  }
}
register('gif', 'mp4', () => import('./av/video.js'))
register('gif', 'webm', () => import('./av/video.js'))

export function getConversion(from, to) {
  return CONVERSIONS[from]?.[to] || null
}

export function targetsFor(from) {
  return Object.keys(CONVERSIONS[from] || {})
}

/** Flat list of every supported conversion pair. */
export function listConversions() {
  const list = []
  for (const from of Object.keys(CONVERSIONS)) {
    for (const to of Object.keys(CONVERSIONS[from])) {
      list.push({ from, to, options: CONVERSIONS[from][to].options })
    }
  }
  return list
}

export function acceptFor(from) {
  const fmt = FORMATS[from]
  return [fmt.mime, ...fmt.exts.map((e) => `.${e}`)].join(',')
}

/** Input format keys that have at least one conversion, for a given kind. */
export function sourcesForKind(kindId) {
  return Object.keys(FORMATS).filter(
    (key) => FORMATS[key].kind === kindId && FORMATS[key].input && targetsFor(key).length > 0
  )
}
