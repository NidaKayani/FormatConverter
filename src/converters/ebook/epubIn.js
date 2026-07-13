import JSZip from 'jszip'
import { parseContainerRootfile, parseOpf } from './opf.js'

function dirname(path) {
  const i = path.lastIndexOf('/')
  return i >= 0 ? path.slice(0, i + 1) : ''
}

function resolveHref(baseDir, href) {
  const cleaned = href.replace(/^\.\//, '')
  if (!baseDir) return cleaned
  const parts = (baseDir + cleaned).split('/')
  const out = []
  for (const p of parts) {
    if (p === '..') out.pop()
    else if (p && p !== '.') out.push(p)
  }
  return out.join('/')
}

/** Strip scripts and dangerous bits from XHTML before feeding HTML pipeline. */
function sanitizeXhtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

/**
 * EPUB → concatenated sanitized HTML document string + title.
 */
export async function epubToHtmlParts(file) {
  const zip = await JSZip.loadAsync(file)
  const mime = await zip.file('mimetype')?.async('string')
  if (mime && !mime.includes('application/epub+zip')) {
    throw new Error('Not a valid EPUB (bad mimetype).')
  }
  const container = await zip.file('META-INF/container.xml')?.async('string')
  if (!container) throw new Error('Invalid EPUB: missing META-INF/container.xml')
  const opfPath = parseContainerRootfile(container)
  const opfXml = await zip.file(opfPath)?.async('string')
  if (!opfXml) throw new Error('Invalid EPUB: missing OPF package document')
  const { spine, manifest, title } = parseOpf(opfXml)
  const base = dirname(opfPath)

  const bodies = []
  for (const id of spine) {
    const item = manifest.get(id)
    if (!item) continue
    if (item.media && !item.media.includes('html') && !item.media.includes('xml')) continue
    const path = resolveHref(base, item.href)
    const xhtml = await zip.file(path)?.async('string')
    if (!xhtml) continue
    const cleaned = sanitizeXhtml(xhtml)
    const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(cleaned)?.[1] || cleaned
    bodies.push(body.trim())
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body>
${bodies.join('\n<hr/>\n')}
</body></html>`
  return { html, title }
}

export default async function epubIn(file, options = {}, onProgress = () => {}) {
  onProgress({ stage: 'decode' })
  const { html, title } = await epubToHtmlParts(file)
  const { to } = options
  onProgress({ stage: 'encode' })

  if (to === 'html') {
    return new Blob([html], { type: 'text/html;charset=utf-8' })
  }
  if (to === 'txt') {
    const { default: htmlToTxt } = await import('../docs/htmlToTxt.js')
    return htmlToTxt(new File([html], `${title}.html`), options, onProgress)
  }
  if (to === 'md') {
    const { default: htmlToMd } = await import('../docs/htmlToMd.js')
    return htmlToMd(new File([html], `${title}.html`), options, onProgress)
  }
  if (to === 'pdf') {
    const { default: htmlToPdf } = await import('../docs/htmlToPdf.js')
    return htmlToPdf(new File([html], `${title}.html`), options, onProgress)
  }
  if (to === 'docx') {
    const { default: htmlToDocx } = await import('../docs/htmlToDocx.js')
    return htmlToDocx(new File([html], `${title}.html`), options, onProgress)
  }
  throw new Error(`EPUB → ${to} is not supported.`)
}
