import { htmlToMarkdown } from './htmlToMd.js'
import { markdownToDocx } from './mdToDocx.js'

export default async function htmlToDocx(file) {
  const md = htmlToMarkdown(await file.text())
  return markdownToDocx(md, file.name?.replace(/\.[^.]+$/, ''))
}
