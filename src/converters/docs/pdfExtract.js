import pdfjsLib from '../pdfjs.js'

const Y_TOLERANCE = 3
/** Minimum gap between part ends to insert a word space. */
const WORD_GAP = 2
/** Gap (relative to median char width) that suggests a table column. */
const TABLE_GAP_FACTOR = 3.5
/** Gap that suggests a layout column (multi-column page). */
const COLUMN_GAP_FACTOR = 8

/**
 * Extract structured text from a PDF. For each page, text fragments are
 * grouped into visual lines by y-coordinate, sorted reading-order aware
 * (column clusters when present), and annotated with font size / boldness.
 *
 * Returns [{ lines: [{ y, size, bold, text, x }] }]
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

function collectParts(textContent, page) {
  const items = textContent.items.filter((item) => item.str.length > 0)
  return items.map((item) => ({
    x: item.transform[4],
    y: item.transform[5],
    str: item.str,
    width: item.width || 0,
    size: item.height || Math.abs(item.transform[3]) || 0,
    bold: isBoldFont(item, page, textContent.styles),
  }))
}

function median(nums) {
  if (!nums.length) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Estimate typical character width from parts (for gap heuristics). */
function medianCharWidth(parts) {
  const widths = []
  for (const p of parts) {
    const len = Math.max(1, p.str.length)
    if (p.width > 0) widths.push(p.width / len)
  }
  return median(widths) || 5
}

/**
 * Detect vertical column gutters from large gaps in the distribution of
 * part center-x positions. Returns sorted split X positions (or []).
 */
function detectColumnSplits(parts, charW) {
  if (parts.length < 4) return []

  const threshold = charW * COLUMN_GAP_FACTOR
  const centers = parts
    .map((p) => p.x + (p.width || 0) / 2)
    .sort((a, b) => a - b)

  /** Find large gaps between successive x-centers across the page. */
  const candidates = []
  for (let i = 1; i < centers.length; i++) {
    const gap = centers[i] - centers[i - 1]
    if (gap < threshold) continue
    const mid = (centers[i] + centers[i - 1]) / 2
    // Prefer larger gutters; require content on both sides
    const left = parts.filter((p) => p.x + (p.width || 0) / 2 < mid).length
    const right = parts.filter((p) => p.x + (p.width || 0) / 2 >= mid).length
    if (left >= 2 && right >= 2) candidates.push({ mid, gap, left, right })
  }
  if (!candidates.length) return []

  // Keep non-overlapping gutters, largest first (typical max 3 columns)
  candidates.sort((a, b) => b.gap - a.gap)
  const splits = []
  for (const c of candidates) {
    if (splits.some((s) => Math.abs(s - c.mid) < threshold)) continue
    splits.push(c.mid)
    if (splits.length >= 3) break
  }
  return splits.sort((a, b) => a - b)
}

function assignColumn(part, splits) {
  const cx = part.x + part.width / 2
  for (let i = 0; i < splits.length; i++) {
    if (cx < splits[i]) return i
  }
  return splits.length
}

function joinPartsOnLine(parts, charW) {
  parts.sort((a, b) => a.x - b.x)
  let text = ''
  let prevEnd = null
  const tableGap = charW * TABLE_GAP_FACTOR

  for (const part of parts) {
    if (prevEnd !== null) {
      const gap = part.x - prevEnd
      if (gap > tableGap) {
        // Table-ish spacing: pad to ~4 spaces (or more for very wide gaps)
        const spaces = Math.min(16, Math.max(4, Math.round(gap / charW)))
        text += ' '.repeat(spaces)
      } else if (gap > WORD_GAP) {
        text += ' '
      }
    }
    text += part.str
    prevEnd = part.x + (part.width || 0)
  }

  const size = Math.max(...parts.map((p) => p.size), 0)
  const boldChars = parts.reduce((n, p) => n + (p.bold ? p.str.length : 0), 0)
  const nonSpace = text.replace(/\s/g, '').length
  return {
    y: median(parts.map((p) => p.y)),
    x: parts[0].x,
    text,
    size,
    bold: nonSpace > 0 && boldChars > nonSpace * 0.7,
  }
}

function buildLinesInColumn(parts, charW) {
  const lines = []
  for (const part of parts) {
    let line = lines.find((l) => Math.abs(l.y - part.y) < Y_TOLERANCE)
    if (!line) {
      line = { y: part.y, parts: [] }
      lines.push(line)
    }
    line.parts.push(part)
  }
  lines.sort((a, b) => b.y - a.y)
  return lines.map((line) => joinPartsOnLine(line.parts, charW))
}

function buildLines(textContent, page) {
  const parts = collectParts(textContent, page)
  if (!parts.length) return []

  const charW = medianCharWidth(parts)
  const splits = detectColumnSplits(parts, charW)

  if (!splits.length) {
    return buildLinesInColumn(parts, charW)
  }

  // Multi-column: read each column top→bottom, left→right
  const colCount = splits.length + 1
  const buckets = Array.from({ length: colCount }, () => [])
  for (const part of parts) {
    buckets[assignColumn(part, splits)].push(part)
  }

  const result = []
  for (const bucket of buckets) {
    if (!bucket.length) continue
    const colLines = buildLinesInColumn(bucket, charW)
    if (result.length && colLines.length) {
      // Visual separator between columns as a blank line marker (y nestled)
      const last = result[result.length - 1]
      result.push({
        y: last.y - 0.01,
        x: last.x,
        text: '',
        size: last.size,
        bold: false,
        columnBreak: true,
      })
    }
    result.push(...colLines)
  }
  return result
}

/**
 * Turn extracted pages into plain-text strings with paragraph breaks from
 * vertical gaps. Used by PDF→TXT (and available for other plain dumps).
 */
export function pagesToPlainText(pages, { pageBreaks = 'marker' } = {}) {
  const pageTexts = pages.map((page) => {
    const out = []
    let prevY = null
    let prevSize = 11
    for (const line of page.lines) {
      if (line.columnBreak || !line.text.trim()) {
        if (out.length && out[out.length - 1] !== '') out.push('')
        prevY = line.y
        continue
      }
      if (prevY !== null) {
        const gap = prevY - line.y
        const paraGap = Math.max(line.size, prevSize) * 1.7
        if (gap > paraGap && out.length && out[out.length - 1] !== '') {
          out.push('')
        }
      }
      out.push(line.text)
      prevY = line.y
      prevSize = line.size || prevSize
    }
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  })

  if (pageBreaks === false || pageBreaks === 'none') {
    return pageTexts.filter(Boolean).join('\n\n')
  }
  if (pageBreaks === 'formfeed' || pageBreaks === '\f') {
    return pageTexts.join('\f')
  }
  // default marker
  return pageTexts.join('\n\n--- Page Break ---\n\n')
}

/** Weighted-median font size of body text across pages. */
export function bodyFontSize(pages) {
  const buckets = new Map()
  for (const page of pages) {
    for (const line of page.lines) {
      if (!line.text?.trim()) continue
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
