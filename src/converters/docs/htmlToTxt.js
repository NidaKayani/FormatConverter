const BLOCK_TAGS = new Set([
  'P', 'DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'MAIN', 'NAV',
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'TABLE', 'BLOCKQUOTE',
  'FIGURE', 'FIGCAPTION', 'ADDRESS', 'DL', 'DT', 'DD',
])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'IFRAME', 'SVG'])

/** HTML → readable plain text via a real DOM walk (not a tag strip). */
export function htmlToText(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  let out = ''

  const blockBreak = () => {
    if (out && !out.endsWith('\n\n')) out = out.replace(/[ \t]+$/, '') + (out.endsWith('\n') ? '\n' : '\n\n')
  }

  const walk = (node, pre = false) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out += pre ? node.textContent : node.textContent.replace(/\s+/g, ' ')
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(node.tagName)) return

    const tag = node.tagName
    if (tag === 'BR') {
      out += '\n'
      return
    }
    if (tag === 'HR') {
      blockBreak()
      out += '-'.repeat(40) + '\n\n'
      return
    }

    const isBlock = BLOCK_TAGS.has(tag)
    if (isBlock) blockBreak()

    if (tag === 'LI') {
      if (out && !out.endsWith('\n')) out += '\n'
      const ordered = node.parentElement?.tagName === 'OL'
      const index = ordered ? Array.prototype.indexOf.call(node.parentElement.children, node) + 1 : null
      out += ordered ? `${index}. ` : '- '
    }
    if (tag === 'TR' && out && !out.endsWith('\n')) out += '\n'
    if ((tag === 'TD' || tag === 'TH') && !/\n$| $/.test(out)) out += '\t'

    if (tag === 'PRE') {
      for (const child of node.childNodes) walk(child, true)
      out += '\n'
    } else {
      for (const child of node.childNodes) walk(child, pre)
    }

    if (tag === 'A') {
      const href = node.getAttribute('href') || ''
      const label = node.textContent.trim()
      if (href && !href.startsWith('#') && !href.startsWith('javascript:') && href !== label) {
        out += ` (${href})`
      }
    }
    if (tag === 'IMG') {
      const alt = node.getAttribute('alt')
      if (alt) out += `[image: ${alt}]`
    }
    if (isBlock) blockBreak()
  }

  walk(doc.body)
  return out
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n'
}

export default async function htmlToTxt(file) {
  const text = htmlToText(await file.text())
  return new Blob([text], { type: 'text/plain;charset=utf-8' })
}
