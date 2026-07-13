import { escapeHtml } from '../docs/htmlTemplate.js'
import { htmlDocument } from '../docs/htmlTemplate.js'

/** Render a table IR as a GFM markdown table. */
export function tableToMarkdown(table, title) {
  const { header, rows } = table
  if (!header.length) return title ? `# ${title}\n\n_(empty table)_\n` : '_(empty table)_\n'

  const esc = (c) => String(c ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
  const head = `| ${header.map(esc).join(' | ')} |`
  const sep = `| ${header.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${header.map((_, i) => esc(row[i])).join(' | ')} |`).join('\n')
  const block = `${head}\n${sep}\n${body}\n`
  return title ? `# ${title}\n\n${block}` : block
}

export function tableToHtmlDocument(table, title = 'Table') {
  const { header, rows } = table
  let body = '<table>\n<thead><tr>'
  for (const h of header) body += `<th>${escapeHtml(h)}</th>`
  body += '</tr></thead>\n<tbody>\n'
  for (const row of rows) {
    body += '<tr>'
    for (let i = 0; i < header.length; i++) body += `<td>${escapeHtml(row[i] ?? '')}</td>`
    body += '</tr>\n'
  }
  body += '</tbody>\n</table>'
  return htmlDocument(body, title)
}

export function tableToHtmlBlob(table, title) {
  return new Blob([tableToHtmlDocument(table, title)], { type: 'text/html;charset=utf-8' })
}

export function tableToMdBlob(table, title) {
  return new Blob([tableToMarkdown(table, title)], { type: 'text/markdown;charset=utf-8' })
}
