/**
 * Lazy-load and register Noto Sans with a jsPDF document for Unicode text.
 * Fonts live under /fonts/ (copied by scripts/copy-assets.mjs).
 */

const FONT_FILES = {
  normal: { file: 'NotoSans-Regular.ttf', vfs: 'NotoSans-Regular.ttf' },
  bold: { file: 'NotoSans-Bold.ttf', vfs: 'NotoSans-Bold.ttf' },
}

const cache = new Map()
const registered = new WeakSet()

async function fetchFont(file) {
  if (cache.has(file)) return cache.get(file)
  const res = await fetch(`/fonts/${file}`)
  if (!res.ok) throw new Error(`Font ${file} not found (${res.status})`)
  const buf = await res.arrayBuffer()
  // jsPDF VFS expects a binary string
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  cache.set(file, binary)
  return binary
}

/** Register NotoSans on this doc if not already. */
export async function ensureNotoFont(doc) {
  if (registered.has(doc)) return 'NotoSans'
  for (const [style, meta] of Object.entries(FONT_FILES)) {
    const binary = await fetchFont(meta.file)
    doc.addFileToVFS(meta.vfs, binary)
    doc.addFont(meta.vfs, 'NotoSans', style)
  }
  // italic / bolditalic fall back to normal/bold (Noto italic not bundled)
  doc.addFont(FONT_FILES.normal.vfs, 'NotoSans', 'italic')
  doc.addFont(FONT_FILES.bold.vfs, 'NotoSans', 'bolditalic')
  registered.add(doc)
  return 'NotoSans'
}

/** True if text has chars outside Latin-1 that standard PDF fonts can't draw well. */
export function needsUnicodeFont(text) {
  for (const ch of String(text ?? '')) {
    const code = ch.codePointAt(0)
    if (code > 0xff) return true
  }
  return false
}
