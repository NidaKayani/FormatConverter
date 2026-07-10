import { FORMATS } from './registry.js'

const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1']

function ascii(bytes, start, end) {
  let s = ''
  for (let i = start; i < end && i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return s
}

/**
 * Detect a file's format from magic bytes, falling back to content sniffing
 * for text formats and finally to the file extension.
 * Returns a format key from FORMATS, or null if unknown.
 */
export async function detectFormat(file) {
  const head = new Uint8Array(await file.slice(0, 512).arrayBuffer())

  if (ascii(head, 0, 5) === '%PDF-') return 'pdf'
  if (head[0] === 0x89 && ascii(head, 1, 4) === 'PNG') return 'png'
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpg'
  if (ascii(head, 0, 6) === 'GIF87a' || ascii(head, 0, 6) === 'GIF89a') return 'gif'
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') return 'webp'
  if (head[0] === 0x42 && head[1] === 0x4d) return 'bmp'
  if (head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0) return 'ico'
  if (ascii(head, 4, 8) === 'ftyp' && HEIC_BRANDS.includes(ascii(head, 8, 12).toLowerCase())) return 'heic'

  // Text-based formats: decode a chunk and sniff
  let text = ''
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(head)
  } catch {
    return fromExtension(file.name)
  }
  const trimmed = text.trimStart().toLowerCase()
  if (trimmed.startsWith('<svg') || (trimmed.startsWith('<?xml') && trimmed.includes('<svg'))) return 'svg'
  if (trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html')) return 'html'

  const byExt = fromExtension(file.name)
  if (byExt) return byExt
  // Plain readable text with no better signal
  return 'txt'
}

export function fromExtension(name = '') {
  const ext = name.toLowerCase().split('.').pop()
  for (const [key, fmt] of Object.entries(FORMATS)) {
    if (fmt.exts.includes(ext)) return key
  }
  return null
}
