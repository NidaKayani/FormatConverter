import { renderPdfPages } from '../pdfRender.js'
import { ocrCanvases } from './ocr.js'

/** OCR every page of a (scanned) PDF; returns one text string per page. */
export async function ocrPdfPages(file, options, onProgress) {
  const canvases = await renderPdfPages(file, 2, onProgress)
  return ocrCanvases(canvases, options, onProgress)
}

/** True when extraction found effectively no text layer (a scanned PDF). */
export function looksScanned(pages) {
  const chars = pages.reduce(
    (n, page) => n + page.lines.reduce((m, line) => m + line.text.trim().length, 0),
    0
  )
  return chars < pages.length * 20
}
