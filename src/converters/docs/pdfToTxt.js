import { extractPages, pagesToPlainText } from './pdfExtract.js'

function normalizePageBreaks(value) {
  if (value === false || value === 'none' || value === 'off') return 'none'
  if (value === 'formfeed' || value === '\f' || value === 'ff') return 'formfeed'
  return 'marker'
}

export default async function pdfToTxt(file, options = {}, onProgress) {
  const pages = await extractPages(file, onProgress)
  const pageBreaks = normalizePageBreaks(options.pageBreaks)

  let pageTexts = pages.map((page) => {
    const one = pagesToPlainText([page], { pageBreaks: 'none' })
    return one
  })

  const ocrMode = options.ocr ?? 'auto'
  if (ocrMode !== 'off') {
    const { looksScanned, emptyPageIndexes, ocrPdfPages } = await import('../ocr/pdfOcr.js')

    if (ocrMode === 'force') {
      pageTexts = await ocrPdfPages(file, options, onProgress)
    } else if (looksScanned(pages)) {
      // Entire document is scanned — OCR everything
      pageTexts = await ocrPdfPages(file, options, onProgress)
    } else {
      // Mixed: only OCR pages with almost no text layer
      const empty = emptyPageIndexes(pages)
      if (empty.length) {
        const ocrTexts = await ocrPdfPages(file, options, onProgress, empty)
        pageTexts = pageTexts.map((t, i) => (ocrTexts[i] ? ocrTexts[i] : t))
      }
    }
  }

  let text
  if (pageBreaks === 'none') {
    text = pageTexts.filter(Boolean).join('\n\n')
  } else if (pageBreaks === 'formfeed') {
    text = pageTexts.join('\f')
  } else {
    text = pageTexts.join('\n\n--- Page Break ---\n\n')
  }

  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}
