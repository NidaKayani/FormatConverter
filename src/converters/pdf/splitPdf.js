import { PDFDocument } from 'pdf-lib'
import JSZip from 'jszip'
import { parsePageRanges } from '../../lib/pageRanges.js'

async function loadPdf(file) {
  const bytes = await file.arrayBuffer()
  try {
    return await PDFDocument.load(bytes)
  } catch (e) {
    const msg = e?.message || String(e)
    if (/encrypt|password|encrypted/i.test(msg)) {
      throw new Error('This PDF is encrypted. Decrypt it first, then try again.')
    }
    throw new Error(`Could not read PDF: ${msg}`)
  }
}

/**
 * Split a PDF by page ranges into separate PDFs bundled in a zip.
 * Option `ranges` is a semicolon-separated list of range specs, e.g. "1-2;3;4-".
 * If omitted, each page becomes its own file.
 */
export default async function splitPdf(files, options = {}, onProgress = () => {}) {
  const file = files[0]
  if (!file) throw new Error('Choose a PDF to split.')
  const doc = await loadPdf(file)
  const count = doc.getPageCount()
  const base = (file.name || 'document').replace(/\.pdf$/i, '')

  let groups
  const raw = String(options.ranges || '').trim()
  if (raw) {
    groups = raw.split(';').map((s) => s.trim()).filter(Boolean).map((spec) => parsePageRanges(spec, count))
  } else {
    groups = Array.from({ length: count }, (_, i) => [i + 1])
  }

  const zip = new JSZip()
  for (let g = 0; g < groups.length; g++) {
    onProgress({ stage: 'extract', page: g + 1, total: groups.length })
    const out = await PDFDocument.create()
    const indices = groups[g].map((n) => n - 1)
    const pages = await out.copyPages(doc, indices)
    for (const p of pages) out.addPage(p)
    const bytes = await out.save({ useObjectStreams: true })
    const label = groups[g].length === 1 ? `page-${groups[g][0]}` : `pages-${groups[g][0]}-${groups[g][groups[g].length - 1]}`
    zip.file(`${base}-${label}.pdf`, bytes)
  }

  return {
    blob: await zip.generateAsync({ type: 'blob' }),
    filename: `${base}-split.zip`,
    ext: 'zip',
  }
}
