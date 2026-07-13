import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

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

export default async function pageNumbersPdf(files, options = {}, onProgress = () => {}) {
  const file = files[0]
  if (!file) throw new Error('Choose a PDF to stamp.')
  const startAt = Math.max(1, Number(options.startAt) || 1)
  const template = String(options.template || '{n}').includes('{n}')
    ? String(options.template || '{n}')
    : '{n}'
  const fontSize = Math.min(24, Math.max(8, Number(options.fontSize) || 10))

  const doc = await loadPdf(file)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  onProgress({ stage: 'encode', page: 0, total: pages.length })

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const { width } = page.getSize()
    const label = template.replace(/\{n\}/g, String(startAt + i)).replace(/\{total\}/g, String(pages.length))
    const textWidth = font.widthOfTextAtSize(label, fontSize)
    page.drawText(label, {
      x: (width - textWidth) / 2,
      y: 24,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })
    onProgress({ stage: 'encode', page: i + 1, total: pages.length })
  }

  const bytes = await doc.save({ useObjectStreams: true })
  const name = (file.name || 'numbered.pdf').replace(/\.pdf$/i, '') + '-numbered.pdf'
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: name, ext: 'pdf' }
}
