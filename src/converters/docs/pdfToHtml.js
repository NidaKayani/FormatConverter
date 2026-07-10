import { pdfToMarkdown } from './pdfToMd.js'
import { markdownToHtmlDocument } from './mdToHtml.js'

/** PDF → HTML: structured extraction to Markdown, then rendered to a styled document. */
export default async function pdfToHtml(file, options, onProgress) {
  const md = await pdfToMarkdown(file, options, onProgress)
  const html = markdownToHtmlDocument(md, file.name?.replace(/\.[^.]+$/, ''))
  return new Blob([html], { type: 'text/html;charset=utf-8' })
}
