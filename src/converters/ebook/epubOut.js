import JSZip from 'jszip'
import { marked } from 'marked'
import {
  buildContainerXml,
  buildNavXhtml,
  buildOpf,
  wrapChapterXhtml,
} from './opf.js'

function splitChaptersFromHtml(html) {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] || html
  const parts = body.split(/<h1\b[^>]*>/i)
  if (parts.length <= 1) {
    return [{ title: 'Chapter 1', html: body.trim() }]
  }
  const chapters = []
  // parts[0] is preamble before first h1
  if (parts[0].trim()) {
    chapters.push({ title: 'Introduction', html: parts[0].trim() })
  }
  for (let i = 1; i < parts.length; i++) {
    const chunk = parts[i]
    const titleMatch = /^([^<]*)<\/h1>([\s\S]*)$/i.exec(chunk)
    if (titleMatch) {
      chapters.push({
        title: titleMatch[1].replace(/<[^>]+>/g, '').trim() || `Chapter ${i}`,
        html: `<h1>${titleMatch[1]}</h1>${titleMatch[2]}`.trim(),
      })
    } else {
      chapters.push({ title: `Chapter ${i}`, html: `<h1></h1>${chunk}`.trim() })
    }
  }
  return chapters.length ? chapters : [{ title: 'Chapter 1', html: body.trim() }]
}

async function sourceToHtml(file, from) {
  if (from === 'html') return file.text()
  if (from === 'md') {
    const md = await file.text()
    const body = marked.parse(md, { gfm: true, async: false })
    return `<!doctype html><html><body>${body}</body></html>`
  }
  if (from === 'txt') {
    const text = await file.text()
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const paras = escaped
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
      .join('\n')
    return `<!doctype html><html><body>${paras}</body></html>`
  }
  if (from === 'docx') {
    const { default: docxToHtmlDoc } = await import('../docs/docxToHtmlDoc.js')
    const blob = await docxToHtmlDoc(file)
    return blob.text()
  }
  throw new Error(`Cannot build EPUB from ${from}.`)
}

/** Build a valid EPUB 3 (mimetype stored first uncompressed). */
export default async function epubOut(file, options = {}, onProgress = () => {}) {
  onProgress({ stage: 'decode' })
  const from = options.from
  const html = await sourceToHtml(file, from)
  const title = file.name?.replace(/\.[^.]+$/, '') || 'Document'
  const chapters = splitChaptersFromHtml(html).map((c, i) => ({
    ...c,
    href: `chap${i + 1}.xhtml`,
  }))

  onProgress({ stage: 'encode' })
  const zip = new JSZip()
  // EPUB requires mimetype as first entry, stored (no compression)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file('META-INF/container.xml', buildContainerXml())
  zip.file('OEBPS/content.opf', buildOpf({ title, chapters }))
  zip.file('OEBPS/nav.xhtml', buildNavXhtml(title, chapters))
  for (const c of chapters) {
    zip.file(`OEBPS/${c.href}`, wrapChapterXhtml(c.title, c.html))
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  })
  return blob
}
