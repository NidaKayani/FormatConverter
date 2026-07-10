import { htmlDocument, escapeHtml } from './htmlTemplate.js'

/** Plain text → HTML: blank lines split paragraphs, single newlines become <br>. */
export default async function txtToHtml(file) {
  const text = (await file.text()).replace(/\r\n/g, '\n')
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>\n')}</p>`)
    .join('\n')

  const html = htmlDocument(paragraphs, file.name?.replace(/\.[^.]+$/, ''))
  return new Blob([html], { type: 'text/html;charset=utf-8' })
}
