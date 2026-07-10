import { docxToHtmlBody } from './docxIn.js'
import { htmlToMarkdown } from './htmlToMd.js'
import { markdownToPdf } from './mdToPdf.js'

/** DOCX → PDF: mammoth HTML, normalized through Markdown, typeset by the PDF engine. */
export default async function docxToPdf(file, options) {
  const md = htmlToMarkdown(await docxToHtmlBody(file))
  return markdownToPdf(md, options)
}
