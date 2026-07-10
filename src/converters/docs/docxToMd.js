import { docxToHtmlBody } from './docxIn.js'
import { htmlToMarkdown } from './htmlToMd.js'

export default async function docxToMd(file) {
  const md = htmlToMarkdown(await docxToHtmlBody(file))
  return new Blob([md], { type: 'text/markdown;charset=utf-8' })
}
