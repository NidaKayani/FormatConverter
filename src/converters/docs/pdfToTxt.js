import { extractPages } from './pdfExtract.js'

export default async function pdfToTxt(file, options, onProgress) {
  const pages = await extractPages(file, onProgress)
  const pageTexts = pages.map((page) => page.lines.map((l) => l.text).join('\n'))
  const text = pageTexts.join('\n\n--- Page Break ---\n\n')
  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}
