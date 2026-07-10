import { docxToHtmlBody } from './docxIn.js'
import { htmlDocument } from './htmlTemplate.js'

export default async function docxToHtmlDoc(file) {
  const body = await docxToHtmlBody(file)
  const html = htmlDocument(body, file.name?.replace(/\.[^.]+$/, ''))
  return new Blob([html], { type: 'text/html;charset=utf-8' })
}
