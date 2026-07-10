import { textToMarkdown } from './txtToMd.js'
import { markdownToDocx } from './mdToDocx.js'

export default async function txtToDocx(file) {
  const md = textToMarkdown(await file.text())
  return markdownToDocx(md, file.name?.replace(/\.[^.]+$/, ''))
}
