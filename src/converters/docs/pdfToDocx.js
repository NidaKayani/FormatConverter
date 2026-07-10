import { pdfToMarkdown } from './pdfToMd.js'
import { markdownToDocx } from './mdToDocx.js'

/** PDF → DOCX: structured extraction to Markdown, then a real Word document. */
export default async function pdfToDocx(file, options, onProgress) {
  const md = await pdfToMarkdown(file, options, onProgress)
  return markdownToDocx(md, file.name?.replace(/\.[^.]+$/, ''))
}
