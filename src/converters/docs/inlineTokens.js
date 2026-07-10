/**
 * Shared walker that flattens marked inline tokens into styled runs
 * ({ text, bold, italic, mono, link, color }) — consumed by both the PDF
 * typesetter (mdToPdf) and the DOCX generator (mdToDocx).
 */

export function unescapeHtml(text = '') {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function inlineRuns(tokens = [], style = {}) {
  const runs = []
  for (const token of tokens) {
    switch (token.type) {
      case 'strong':
        runs.push(...inlineRuns(token.tokens, { ...style, bold: true }))
        break
      case 'em':
        runs.push(...inlineRuns(token.tokens, { ...style, italic: true }))
        break
      case 'del':
        runs.push(...inlineRuns(token.tokens, { ...style, color: [130, 135, 145] }))
        break
      case 'codespan':
        runs.push({ ...style, mono: true, text: unescapeHtml(token.text) })
        break
      case 'link':
        runs.push(...inlineRuns(token.tokens, { ...style, link: token.href }).map((r) => ({ ...r, link: token.href })))
        break
      case 'image':
        runs.push({ ...style, italic: true, color: [130, 135, 145], text: `[image: ${token.text || token.href}]` })
        break
      case 'br':
        runs.push({ ...style, text: '\n' })
        break
      case 'escape':
      case 'text':
        if (token.tokens?.length) runs.push(...inlineRuns(token.tokens, style))
        else runs.push({ ...style, text: unescapeHtml(token.text) })
        break
      case 'html':
        runs.push({ ...style, text: unescapeHtml(token.text.replace(/<[^>]*>/g, '')) })
        break
      default:
        if (token.text) runs.push({ ...style, text: unescapeHtml(token.text) })
    }
  }
  return runs
}

export function plainText(tokens = []) {
  return inlineRuns(tokens).map((r) => r.text).join('')
}
