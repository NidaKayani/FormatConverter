import { PdfBuilder } from './pdfLayout.js'

/** Rough Markdown detection for mode: 'detect'. */
export function looksLikeMarkdown(text) {
  const lines = text.split('\n').slice(0, 80)
  let score = 0
  for (const line of lines) {
    if (/^#{1,6}\s+\S/.test(line)) score += 2
    else if (/^\s*[-*+]\s+\S/.test(line)) score += 1
    else if (/^\s*\d+\.\s+\S/.test(line)) score += 1
    else if (/^```/.test(line)) score += 2
    else if (/^\|.+\|/.test(line)) score += 1
    else if (/\[.+\]\(.+\)/.test(line)) score += 1
  }
  return score >= 3
}

function resolveMode(text, mode) {
  if (mode === 'markdown') return 'markdown'
  if (mode === 'detect' && looksLikeMarkdown(text)) return 'markdown'
  return 'plain'
}

function charIndent(line) {
  const m = line.match(/^[ \t]*/)?.[0] || ''
  let n = 0
  for (const ch of m) n += ch === '\t' ? 4 : 1
  return n
}

/**
 * Plain text → PDF with paragraph spacing, soft wrap, indentation, and options.
 */
export default async function textToPdf(file, options = {}) {
  const text = await file.text()
  const mode = resolveMode(text, options.mode || 'plain')

  if (mode === 'markdown') {
    const { markdownToPdf } = await import('./mdToPdf.js')
    return markdownToPdf(text, options)
  }

  const builder = new PdfBuilder({
    pageSize: options.pageSize,
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
    margin: options.margin,
    font: options.font,
    pageNumbers: options.pageNumbers !== false && options.pageNumbers !== 'off',
  })

  await builder.prepareFonts(text)

  if (options.title) {
    builder.writeTitle(String(options.title))
  } else if (options.titleFromFilename !== false && file.name) {
    const base = file.name.replace(/\.[^.]+$/, '').trim()
    if (base && base.toLowerCase() !== 'untitled') {
      // Only use filename as title when option is explicitly on
      if (options.titleFromFilename === true) builder.writeTitle(base)
    }
  }

  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let blankRun = 0
  const bodySize = builder.bodySize
  const paraSpace = bodySize * 0.9

  for (const line of lines) {
    if (!line.trim()) {
      blankRun++
      continue
    }
    if (blankRun > 0) {
      builder.space(Math.min(blankRun, 3) * paraSpace)
      blankRun = 0
    }

    const indentChars = charIndent(line)
    const indent = Math.min(builder.maxW * 0.4, indentChars * (bodySize * 0.5))
    const content = line.trimEnd() // keep trailing? usually drop; keep leading via indent
    const runText = line.slice(indentChars === 0 ? 0 : line.search(/\S|$/))

    builder.writeRuns([{ text: runText.length ? runText : content }], {
      size: bodySize,
      indent,
      spacingAfter: 0,
    })
  }

  return builder.finish()
}
