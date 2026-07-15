import { extractPages, bodyFontSize } from './pdfExtract.js'

const BULLET_RE = /^\s*[•◦●▪‣·–—-]\s+(.*)$/
const NUMBERED_RE = /^\s*(\d{1,3})[.)]\s+(.*)$/

function headingLevel(line, bodySize) {
  if (!line.text.trim() || line.text.length > 120) return 0
  const ratio = line.size / bodySize
  if (ratio >= 1.9) return 1
  if (ratio >= 1.5) return 2
  if (ratio >= 1.2) return 3
  if (line.bold && ratio >= 1.05) return 4
  return 0
}

/**
 * Rebuild Markdown structure from PDF text: font-size tiers become headings,
 * bold lines become bold text, bullet/numbered glyphs become list items, and
 * vertical gaps become paragraph breaks.
 */
export async function pdfToMarkdown(file, options = {}, onProgress = () => {}) {
  const pages = await extractPages(file, onProgress)

  // Scanned / mixed PDF: OCR empty pages (or all when force / fully scanned)
  if (options.ocr !== 'off') {
    const { looksScanned, emptyPageIndexes, ocrPdfPages } = await import('../ocr/pdfOcr.js')
    const ocrMode = options.ocr ?? 'auto'
    if (ocrMode === 'force' || looksScanned(pages)) {
      const texts = await ocrPdfPages(file, options, onProgress)
      return texts.join('\n\n---\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
    }
    const empty = emptyPageIndexes(pages)
    if (empty.length) {
      const ocrTexts = await ocrPdfPages(file, options, onProgress, empty)
      for (const i of empty) {
        if (!ocrTexts[i]) continue
        pages[i] = {
          lines: ocrTexts[i]
            .split(/\n+/)
            .filter(Boolean)
            .map((text, j) => ({ y: 1000 - j * 14, text, size: 11, bold: false })),
        }
      }
    }
  }

  const bodySize = bodyFontSize(pages)
  const out = []

  for (const page of pages) {
    let prevY = null
    let prevWasBlock = true // suppress leading blank line

    for (const line of page.lines) {
      const text = line.text.trim()
      if (!text) continue

      const gap = prevY !== null ? prevY - line.y : 0
      const paragraphBreak = prevY === null || gap > line.size * 1.7

      const level = headingLevel(line, bodySize)
      const bullet = text.match(BULLET_RE)
      const numbered = text.match(NUMBERED_RE)

      if (level > 0) {
        if (!prevWasBlock) out.push('')
        out.push(`${'#'.repeat(level)} ${text}`)
        out.push('')
        prevWasBlock = true
      } else if (bullet) {
        out.push(`- ${bullet[1]}`)
        prevWasBlock = false
      } else if (numbered) {
        out.push(`${numbered[1]}. ${numbered[2]}`)
        prevWasBlock = false
      } else {
        if (paragraphBreak && !prevWasBlock) out.push('')
        out.push(line.bold ? `**${text}**` : text)
        prevWasBlock = false
      }
      prevY = line.y
    }
    out.push('')
  }

  // Collapse runs of blank lines
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export default async function pdfToMd(file, options, onProgress) {
  const md = await pdfToMarkdown(file, options, onProgress)
  return new Blob([md], { type: 'text/markdown;charset=utf-8' })
}
