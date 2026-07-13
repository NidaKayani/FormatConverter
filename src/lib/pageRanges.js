/**
 * Parse page-range strings like "1-3,7,9-" into 1-based page numbers.
 * @param {string} input
 * @param {number} pageCount total pages in the document
 * @returns {number[]} unique sorted 1-based page numbers
 */
export function parsePageRanges(input, pageCount) {
  if (pageCount < 1) throw new Error('Document has no pages.')
  const raw = String(input ?? '').trim()
  if (!raw) throw new Error('Enter a page range (e.g. 1-3,7,9-).')

  const pages = new Set()
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  if (!parts.length) throw new Error('Enter a page range (e.g. 1-3,7,9-).')

  for (const part of parts) {
    if (!/^\d+(-\d*)?$/.test(part)) {
      throw new Error(`Invalid page range "${part}". Use forms like 1, 2-5, or 9-.`)
    }
    if (part.includes('-')) {
      const [a, b] = part.split('-')
      const start = Number(a)
      const end = b === '' ? pageCount : Number(b)
      if (!Number.isInteger(start) || start < 1) {
        throw new Error(`Invalid start page in "${part}".`)
      }
      if (!Number.isInteger(end) || end < start) {
        throw new Error(`Invalid end page in "${part}".`)
      }
      for (let p = start; p <= Math.min(end, pageCount); p++) pages.add(p)
    } else {
      const n = Number(part)
      if (!Number.isInteger(n) || n < 1 || n > pageCount) {
        throw new Error(`Page ${part} is out of range (1–${pageCount}).`)
      }
      pages.add(n)
    }
  }

  if (!pages.size) throw new Error('No pages matched that range.')
  return [...pages].sort((a, b) => a - b)
}
