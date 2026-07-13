import { PDFDocument } from 'pdf-lib'

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

export default async function mergePdf(files, _options = {}, onProgress = () => {}) {
  if (!files?.length) throw new Error('Add at least one PDF to merge.')
  const out = await PDFDocument.create()
  for (let i = 0; i < files.length; i++) {
    onProgress({ stage: 'extract', page: i + 1, total: files.length, file: files[i], fileIndex: i, fileCount: files.length })
    const doc = await loadPdf(files[i])
    const pages = await out.copyPages(doc, doc.getPageIndices())
    for (const p of pages) out.addPage(p)
  }
  const bytes = await out.save({ useObjectStreams: true })
  return {
    blob: new Blob([bytes], { type: 'application/pdf' }),
    filename: 'merged.pdf',
    ext: 'pdf',
  }
}
