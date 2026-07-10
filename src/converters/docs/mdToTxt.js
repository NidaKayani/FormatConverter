import { marked } from 'marked'

function unescapeHtml(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/** Inline tokens → readable plain text (links become "text (url)"). */
function inlineText(tokens = []) {
  let out = ''
  for (const token of tokens) {
    switch (token.type) {
      case 'strong':
      case 'em':
      case 'del':
        out += inlineText(token.tokens)
        break
      case 'codespan':
        out += unescapeHtml(token.text)
        break
      case 'link': {
        const label = inlineText(token.tokens)
        out += label === token.href || token.href.startsWith('mailto:') ? label : `${label} (${token.href})`
        break
      }
      case 'image':
        out += `[image: ${token.text || token.href}]`
        break
      case 'br':
        out += '\n'
        break
      default:
        if (token.tokens?.length) out += inlineText(token.tokens)
        else out += unescapeHtml(token.text ?? '')
    }
  }
  return out
}

function indentBlock(text, prefix) {
  return text
    .split('\n')
    .map((l) => (l ? prefix + l : l))
    .join('\n')
}

function renderBlocks(tokens, depth = 0) {
  const out = []
  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        break
      case 'heading': {
        const text = inlineText(token.tokens)
        out.push(text)
        if (token.depth === 1) out.push('='.repeat(Math.min(text.length, 78)))
        else if (token.depth === 2) out.push('-'.repeat(Math.min(text.length, 78)))
        out.push('')
        break
      }
      case 'paragraph':
        out.push(inlineText(token.tokens), '')
        break
      case 'code':
        out.push(indentBlock(token.text, '    '), '')
        break
      case 'blockquote':
        out.push(indentBlock(renderBlocks(token.tokens).trimEnd(), '> '), '')
        break
      case 'list': {
        let n = Number(token.start) || 1
        for (const item of token.items) {
          const marker = token.ordered ? `${n++}. ` : '- '
          const check = item.task ? (item.checked ? '[x] ' : '[ ] ') : ''
          const body = renderBlocks(item.tokens, depth + 1).trimEnd()
          const [first = '', ...rest] = body.split('\n')
          out.push(' '.repeat(depth * 2) + marker + check + first)
          for (const line of rest) out.push(' '.repeat(depth * 2 + marker.length) + line)
        }
        out.push('')
        break
      }
      case 'table': {
        const header = token.header.map((c) => inlineText(c.tokens))
        const rows = token.rows.map((row) => row.map((c) => inlineText(c.tokens)))
        const widths = header.map((h, i) =>
          Math.max(h.length, ...rows.map((r) => (r[i] || '').length))
        )
        const fmt = (row) => row.map((c, i) => String(c ?? '').padEnd(widths[i])).join('  ').trimEnd()
        out.push(fmt(header))
        out.push(widths.map((w) => '-'.repeat(w)).join('  '))
        for (const row of rows) out.push(fmt(row))
        out.push('')
        break
      }
      case 'hr':
        out.push('-'.repeat(40), '')
        break
      case 'html': {
        const text = unescapeHtml(token.text.replace(/<[^>]*>/g, '')).trim()
        if (text) out.push(text, '')
        break
      }
      case 'text':
        out.push(token.tokens?.length ? inlineText(token.tokens) : unescapeHtml(token.text))
        break
      default:
        if (token.text) out.push(unescapeHtml(token.text), '')
    }
  }
  return out.join('\n')
}

export function markdownToText(md) {
  const tokens = marked.lexer(md, { gfm: true })
  return renderBlocks(tokens).replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export default async function mdToTxt(file) {
  const text = markdownToText(await file.text())
  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}
