/**
 * Minimal OPF / container helpers for EPUB 3.
 */

export function parseContainerRootfile(xml) {
  const m = /full-path=["']([^"']+)["']/.exec(xml)
  if (!m) throw new Error('Invalid EPUB: missing rootfile in META-INF/container.xml')
  return m[1]
}

export function parseOpf(opfXml) {
  const spine = []
  const manifest = new Map()
  for (const m of opfXml.matchAll(/<item\b[^>]*>/gi)) {
    const tag = m[0]
    const id = /id=["']([^"']+)["']/i.exec(tag)?.[1]
    const href = /href=["']([^"']+)["']/i.exec(tag)?.[1]
    const media = /media-type=["']([^"']+)["']/i.exec(tag)?.[1]
    if (id && href) manifest.set(id, { href, media })
  }
  for (const m of opfXml.matchAll(/<itemref\b[^>]*idref=["']([^"']+)["'][^>]*>/gi)) {
    spine.push(m[1])
  }
  const title = /<dc:title[^>]*>([^<]*)<\/dc:title>/i.exec(opfXml)?.[1]?.trim() || 'Untitled'
  return { spine, manifest, title }
}

export function buildContainerXml(opfPath = 'OEBPS/content.opf') {
  return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="${opfPath}" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
`
}

export function buildOpf({ title, chapters }) {
  const manifestItems = chapters
    .map(
      (c, i) =>
        `    <item id="chap${i + 1}" href="${c.href}" media-type="application/xhtml+xml"/>`
    )
    .join('\n')
  const spineItems = chapters.map((_, i) => `    <itemref idref="chap${i + 1}"/>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="uid" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:${crypto.randomUUID?.() || 'formatconvert'}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
${manifestItems}
  </manifest>
  <spine>
${spineItems}
  </spine>
</package>
`
}

export function buildNavXhtml(title, chapters) {
  const lis = chapters
    .map((c, i) => `      <li><a href="${c.href}">${escapeXml(c.title || `Chapter ${i + 1}`)}</a></li>`)
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
<head><title>${escapeXml(title)}</title><meta charset="utf-8"/></head>
<body>
  <nav epub:type="toc"><ol>
${lis}
  </ol></nav>
</body>
</html>
`
}

export function wrapChapterXhtml(title, bodyHtml) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head><title>${escapeXml(title)}</title><meta charset="utf-8"/></head>
<body>
${bodyHtml}
</body>
</html>
`

}

function escapeXml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
