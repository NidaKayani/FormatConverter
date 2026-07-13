import { PDFDocument, degrees } from 'pdf-lib'

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

export default async function rotatePdf(files, options = {}, onProgress = () => {}) {
  const file = files[0]
  if (!file) throw new Error('Choose a PDF to rotate.')
  const angle = Number(options.angle) || 90
  if (![90, 180, 270].includes(angle)) throw new Error('Angle must be 90, 180, or 270.')

  const doc = await loadPdf(file)
  const pages = doc.getPages()
  onProgress({ stage: 'encode', page: 0, total: pages.length })
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const current = page.getRotation().angle || 0
    page.setRotation(degrees((current + angle) % 360))
    onProgress({ stage: 'encode', page: i + 1, total: pages.length })
  }

  const bytes = await doc.save({ useObjectStreams: true })
  const name = (file.name || 'rotated.pdf').replace(/\.pdf$/i, '') + '-rotated.pdf'
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: name, ext: 'pdf' }
}
