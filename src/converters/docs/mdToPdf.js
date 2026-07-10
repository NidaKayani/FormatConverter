import { marked } from 'marked'
import { PdfBuilder } from './pdfLayout.js'
import { inlineRuns, plainText, unescapeHtml } from './inlineTokens.js'

function renderTokens(builder, tokens, ctx = { indent: 0, quote: false }) {
  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        break
      case 'heading':
        builder.writeHeading(inlineRuns(token.tokens), token.depth)
        break
      case 'paragraph': {
        const runs = inlineRuns(token.tokens, ctx.quote ? { color: [90, 96, 110], italic: true } : {})
        builder.writeRuns(runs, { indent: ctx.indent, spacingAfter: 10 })
        break
      }
      case 'code':
        builder.writeCodeBlock(token.text, { indent: ctx.indent })
        break
      case 'blockquote':
        builder.writeBlockquote(() => {
          renderTokens(builder, token.tokens, { indent: ctx.indent + 16, quote: true })
        })
        break
      case 'list': {
        let n = Number(token.start) || 1
        for (const item of token.items) {
          const bulletText = token.ordered ? `${n++}.` : '•'
          renderListItem(builder, item, bulletText, ctx)
        }
        builder.space(4)
        break
      }
      case 'table': {
        const header = token.header.map((c) => plainText(c.tokens))
        const rows = token.rows.map((row) => row.map((c) => plainText(c.tokens)))
        builder.writeTable(header, rows)
        break
      }
      case 'hr':
        builder.writeHr()
        break
      case 'html': {
        const text = unescapeHtml(token.text.replace(/<[^>]*>/g, '')).trim()
        if (text) builder.writeRuns([{ text }], { indent: ctx.indent })
        break
      }
      case 'text': {
        const runs = token.tokens?.length ? inlineRuns(token.tokens) : [{ text: unescapeHtml(token.text) }]
        builder.writeRuns(runs, { indent: ctx.indent, spacingAfter: 4 })
        break
      }
      default:
        if (token.text) builder.writeRuns([{ text: unescapeHtml(token.text) }], { indent: ctx.indent })
    }
  }
}

function renderListItem(builder, item, bulletText, ctx) {
  const indent = ctx.indent + 18
  const blocks = item.tokens || []
  let first = true
  const checkbox = item.task ? (item.checked ? '[x] ' : '[ ] ') : ''

  for (const block of blocks) {
    if (first && (block.type === 'text' || block.type === 'paragraph')) {
      const runs = block.tokens?.length ? inlineRuns(block.tokens) : [{ text: unescapeHtml(block.text) }]
      if (checkbox) runs.unshift({ text: checkbox, mono: true })
      builder.writeRuns(runs, {
        indent,
        spacingAfter: 3,
        bullet: { text: bulletText, offset: 14, run: { color: [90, 96, 110] } },
      })
      first = false
    } else {
      renderTokens(builder, [block], { ...ctx, indent })
      first = false
    }
  }
  if (blocks.length === 0) {
    builder.writeRuns([{ text: '' }], { indent, spacingAfter: 3, bullet: { text: bulletText, offset: 14 } })
  }
}

/** Render a Markdown string to a styled PDF Blob. */
export function markdownToPdf(md, options = {}) {
  const tokens = marked.lexer(md, { gfm: true })
  const builder = new PdfBuilder({ pageSize: options.pageSize })
  renderTokens(builder, tokens)
  return builder.finish()
}

export default async function mdToPdf(file, options) {
  const md = await file.text()
  return markdownToPdf(md, options)
}
