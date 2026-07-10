/**
 * Central registry of formats and conversions. Both the web UI and the SDK
 * read from here, so the supported matrix and option schemas never drift.
 *
 * Converter modules are loaded with dynamic import() so the app only pulls in
 * the code (pdf.js, jsPDF, heic decoder, ...) a given conversion needs.
 */

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
  gif:  { label: 'GIF',      kind: 'image', exts: ['gif'], mime: 'image/gif', input: true, output: false },
  svg:  { label: 'SVG',      kind: 'image', exts: ['svg'], mime: 'image/svg+xml', input: true, output: false },
  heic: { label: 'HEIC',     kind: 'image', exts: ['heic', 'heif'], mime: 'image/heic', input: true, output: false },
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

function imageOutputOptions(to) {
  if (to === 'ico') return [OPT_ICO_SIZES]
  const opts = [OPT_WIDTH]
  if (to === 'jpg' || to === 'webp') opts.push(OPT_QUALITY)
  if (to === 'jpg' || to === 'bmp') opts.push(OPT_BACKGROUND)
  return opts
}

// ---------------------------------------------------------------------------
// Conversion table
// ---------------------------------------------------------------------------

const CONVERSIONS = {}

function register(from, to, load, options = []) {
  ;(CONVERSIONS[from] ??= {})[to] = { from, to, load, options }
}

// Documents — every direction is a real parse/render, never a rename.
// PDF extraction auto-falls back to OCR for scanned documents.
register('pdf', 'txt', () => import('./docs/pdfToTxt.js'), [OPT_OCR, OPT_OCR_LANGUAGE])
register('pdf', 'md', () => import('./docs/pdfToMd.js'), [OPT_OCR, OPT_OCR_LANGUAGE])
register('pdf', 'html', () => import('./docs/pdfToHtml.js'), [OPT_OCR, OPT_OCR_LANGUAGE])
register('txt', 'pdf', () => import('./docs/textToPdf.js'), [OPT_PAGE_SIZE])
register('txt', 'md', () => import('./docs/txtToMd.js'))
register('txt', 'html', () => import('./docs/txtToHtml.js'))
register('md', 'pdf', () => import('./docs/mdToPdf.js'), [OPT_PAGE_SIZE])
register('md', 'txt', () => import('./docs/mdToTxt.js'))
register('md', 'html', () => import('./docs/mdToHtml.js'))
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
for (const from of ['png', 'jpg', 'webp', 'bmp', 'gif', 'heic']) {
  register(from, 'txt', () => import('./ocr/imageToTxt.js'), [OPT_OCR_LANGUAGE])
}

// PDF pages → raster images (zip when multi-page)
register('pdf', 'png', () => import('./images/pdfToImages.js'), [OPT_SCALE])
register('pdf', 'jpg', () => import('./images/pdfToImages.js'), [OPT_SCALE, OPT_QUALITY])

// Images — decode to canvas, transform, re-encode.
const IMAGE_INPUTS = ['png', 'jpg', 'webp', 'bmp', 'gif', 'svg', 'heic', 'ico']
const IMAGE_OUTPUTS = ['png', 'jpg', 'webp', 'bmp', 'ico']
for (const from of IMAGE_INPUTS) {
  for (const to of IMAGE_OUTPUTS) {
    if (from === to) continue
    register(from, to, () => import('./images/imageConvert.js'), imageOutputOptions(to))
  }
  register(from, 'pdf', () => import('./images/imageToPdf.js'), [OPT_PAGE_SIZE])
}

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
