import pdfjsLib from '../pdfjs.js'

const Y_TOLERANCE = 3

/**
 * Extract structured text from a PDF. For each page, text fragments are
 * grouped into visual lines by y-coordinate, sorted left-to-right, and
 * annotated with font size / boldness so callers can rebuild structure
 * (paragraphs, headings, lists) instead of dumping a scrambled stream.
 *
 * Returns [{ lines: [{ y, size, bold, text }] }]
 */
export async function extractPages(file, onProgress = () => {}) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const total = pdf.numPages
  const pages = []

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    pages.push({ lines: buildLines(textContent, page) })
    onProgress({ page: pageNum, total, stage: 'extract' })
  }
  return pages
}

function isBoldFont(item, page, styles) {
  const style = styles?.[item.fontName]
  if (style?.fontFamily && /bold/i.test(style.fontFamily)) return true
  try {
    const font = page.commonObjs.get(item.fontName)
    if (font?.name && /bold|black|heavy/i.test(font.name)) return true
  } catch {
    // font object not resolved yet — fall through
  }
  return false
}

function buildLines(textContent, page) {
  const items = textContent.items.filter((item) => item.str.length > 0)
  const lines = []

  for (const item of items) {
    const y = item.transform[5]
    const x = item.transform[4]
    let line = lines.find((l) => Math.abs(l.y - y) < Y_TOLERANCE)
    if (!line) {
      line = { y, parts: [] }
      lines.push(line)
    }
    line.parts.push({
      x,
      str: item.str,
      width: item.width,
      size: item.height || Math.abs(item.transform[3]) || 0,
      bold: isBoldFont(item, page, textContent.styles),
    })
  }

  lines.sort((a, b) => b.y - a.y)

  return lines.map((line) => {
    line.parts.sort((a, b) => a.x - b.x)
    let text = ''
    let prevEnd = null
    for (const part of line.parts) {
      if (prevEnd !== null && part.x - prevEnd > 2) text += ' '
      text += part.str
      prevEnd = part.x + (part.width || 0)
    }
    const size = Math.max(...line.parts.map((p) => p.size))
    const boldChars = line.parts.reduce((n, p) => n + (p.bold ? p.str.length : 0), 0)
    return {
      y: line.y,
      text,
      size,
      bold: boldChars > text.replace(/\s/g, '').length * 0.7,
    }
  })
}

/** Weighted-median font size of body text across pages. */
export function bodyFontSize(pages) {
  const buckets = new Map()
  for (const page of pages) {
    for (const line of page.lines) {
      const key = Math.round(line.size * 2) / 2
      buckets.set(key, (buckets.get(key) || 0) + line.text.length)
    }
  }
  let best = 11
  let bestCount = -1
  for (const [size, count] of buckets) {
    if (count > bestCount) {
      best = size
      bestCount = count
    }
  }
  return best || 11
}
