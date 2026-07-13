import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'

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

function posFor(page, position, fontSize, textWidth) {
  const { width, height } = page.getSize()
  const margin = 36
  switch (position) {
    case 'top-left':
      return { x: margin, y: height - margin - fontSize }
    case 'top-right':
      return { x: Math.max(margin, width - margin - textWidth), y: height - margin - fontSize }
    case 'bottom-left':
      return { x: margin, y: margin }
    case 'bottom-right':
      return { x: Math.max(margin, width - margin - textWidth), y: margin }
    case 'center':
    default:
      return { x: (width - textWidth) / 2, y: (height - fontSize) / 2 }
  }
}

export default async function watermarkPdf(files, options = {}, onProgress = () => {}) {
  const file = files[0]
  if (!file) throw new Error('Choose a PDF to watermark.')
  const text = String(options.text || 'CONFIDENTIAL').trim() || 'CONFIDENTIAL'
  const opacity = Math.min(1, Math.max(0.05, Number(options.opacity) || 0.25))
  const position = options.position || 'center'
  const fontSize = Math.min(72, Math.max(10, Number(options.fontSize) || 48))

  const doc = await loadPdf(file)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const pages = doc.getPages()
  onProgress({ stage: 'encode', page: 0, total: pages.length })

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]
    const textWidth = font.widthOfTextAtSize(text, fontSize)
    const { x, y } = posFor(page, position, fontSize, textWidth)
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
      opacity,
      rotate: position === 'center' ? degrees(-30) : degrees(0),
    })
    onProgress({ stage: 'encode', page: i + 1, total: pages.length })
  }

  const bytes = await doc.save({ useObjectStreams: true })
  const name = (file.name || 'watermarked.pdf').replace(/\.pdf$/i, '') + '-watermarked.pdf'
  return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: name, ext: 'pdf' }
}
