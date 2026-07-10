import { htmlToMarkdown } from './htmlToMd.js'
import { markdownToPdf } from './mdToPdf.js'

/** HTML → PDF: normalize through Markdown, then typeset with the PDF engine. */
export default async function htmlToPdf(file, options) {
  const md = htmlToMarkdown(await file.text())
  return markdownToPdf(md, options)
}
