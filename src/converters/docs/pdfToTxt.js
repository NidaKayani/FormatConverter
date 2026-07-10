import { extractPages } from './pdfExtract.js'

export default async function pdfToTxt(file, options, onProgress) {
  const pages = await extractPages(file, onProgress)

  let pageTexts = pages.map((page) => page.lines.map((l) => l.text).join('\n'))

  // Scanned PDF (no text layer): fall back to OCR unless disabled
  if (options.ocr !== 'off') {
    const { looksScanned, ocrPdfPages } = await import('../ocr/pdfOcr.js')
    if (looksScanned(pages)) {
      pageTexts = await ocrPdfPages(file, options, onProgress)
    }
  }

  const text = pageTexts.join('\n\n--- Page Break ---\n\n')
  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}
