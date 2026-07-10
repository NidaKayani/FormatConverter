import { PdfBuilder } from './pdfLayout.js'

/**
 * Plain text → PDF preserving the original line and paragraph structure:
 * every source line keeps its own line, blank lines become paragraph spacing.
 */
export default async function textToPdf(file, options) {
  const text = await file.text()
  const builder = new PdfBuilder({ pageSize: options.pageSize })

  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let blankRun = 0
  for (const line of lines) {
    if (!line.trim()) {
      blankRun++
      continue
    }
    if (blankRun > 0) builder.space(Math.min(blankRun, 2) * 10)
    blankRun = 0
    builder.writeRuns([{ text: line }], { spacingAfter: 0 })
  }

  return builder.finish()
}
