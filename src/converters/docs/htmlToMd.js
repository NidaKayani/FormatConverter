import TurndownService from 'turndown'
import { gfm } from 'turndown-plugin-gfm'

export function htmlToMarkdown(html) {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  })
  turndown.use(gfm) // tables, strikethrough, task lists
  turndown.remove(['script', 'style', 'noscript', 'template'])
  return turndown.turndown(html).trim() + '\n'
}

export default async function htmlToMd(file) {
  const md = htmlToMarkdown(await file.text())
  return new Blob([md], { type: 'text/markdown;charset=utf-8' })
}
