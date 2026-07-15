import { renderPdfPages } from '../pdfRender.js'
import { ocrCanvases } from './ocr.js'

const EMPTY_PAGE_CHARS = 20

/** Char count of extracted text on one page. */
export function pageCharCount(page) {
  return page.lines.reduce((m, line) => m + (line.text?.trim().length || 0), 0)
}

/** True when extraction found effectively no text layer (a scanned PDF). */
export function looksScanned(pages) {
  const chars = pages.reduce((n, page) => n + pageCharCount(page), 0)
  return chars < pages.length * EMPTY_PAGE_CHARS
}

/** Indices (0-based) of pages that look empty / scanned. */
export function emptyPageIndexes(pages) {
  return pages
    .map((page, i) => (pageCharCount(page) < EMPTY_PAGE_CHARS ? i : -1))
    .filter((i) => i >= 0)
}

/**
 * OCR selected pages of a PDF. `pageIndexes` is 0-based; omit to OCR all.
 * Returns one text string per page of the PDF (empty string for skipped pages
 * when `pageIndexes` is set — caller merges with extracted text).
 */
export async function ocrPdfPages(file, options, onProgress, pageIndexes = null) {
  const canvases = await renderPdfPages(file, 2, onProgress)
  if (pageIndexes == null) {
    return ocrCanvases(canvases, options, onProgress)
  }

  const selected = pageIndexes.map((i) => canvases[i]).filter(Boolean)
  if (!selected.length) return canvases.map(() => '')

  const texts = await ocrCanvases(selected, options, onProgress)
  const out = canvases.map(() => '')
  pageIndexes.forEach((pageIdx, j) => {
    out[pageIdx] = texts[j] || ''
  })
  return out
}
