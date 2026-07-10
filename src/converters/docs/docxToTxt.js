import { docxToHtmlBody } from './docxIn.js'
import { htmlToText } from './htmlToTxt.js'

export default async function docxToTxt(file) {
  const text = htmlToText(await docxToHtmlBody(file))
  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}
