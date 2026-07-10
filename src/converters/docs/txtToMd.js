/**
 * Plain text → Markdown. A real transform, not a rename: characters that
 * Markdown would misinterpret are escaped so the document renders exactly
 * as the original text read, and whitespace is normalized.
 */
export function textToMarkdown(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  const escaped = lines.map((line) => {
    let out = line
      .replace(/\\/g, '\\\\')
      .replace(/([`*_[\]<>|])/g, '\\$1')
    // Line-leading constructs that would become headings/quotes/lists
    out = out.replace(/^(\s*)#/, '$1\\#')
    out = out.replace(/^(\s*)>/, '$1\\>')
    out = out.replace(/^(\s*)([-+])(\s)/, '$1\\$2$3')
    out = out.replace(/^(\s*)(\d+)([.)])(\s)/, '$1$2\\$3$4')
    // A leading 4-space indent would become a code block
    if (/^ {4,}\S/.test(out)) out = out.trimStart()
    return out.replace(/\s+$/, '')
  })

  // Single newlines are soft in Markdown — add trailing double-space hard
  // breaks inside paragraphs so the original line structure survives.
  const out = []
  for (let i = 0; i < escaped.length; i++) {
    const line = escaped[i]
    const next = escaped[i + 1]
    if (line && next) out.push(line + '  ')
    else out.push(line)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export default async function txtToMd(file) {
  const md = textToMarkdown(await file.text())
  return new Blob([md], { type: 'text/markdown;charset=utf-8' })
}
