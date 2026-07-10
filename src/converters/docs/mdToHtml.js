import { marked } from 'marked'
import { htmlDocument } from './htmlTemplate.js'

export function markdownToHtmlDocument(md, title) {
  const body = marked.parse(md, { gfm: true, async: false })
  return htmlDocument(body, title)
}

export default async function mdToHtml(file) {
  const md = await file.text()
  const html = markdownToHtmlDocument(md, file.name?.replace(/\.[^.]+$/, ''))
  return new Blob([html], { type: 'text/html;charset=utf-8' })
}
