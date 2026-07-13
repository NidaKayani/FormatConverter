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
  if (head[0] === 0x42 && head[1] === 0x4d) return 'bmp'
  if (head[0] === 0 && head[1] === 0 && head[2] === 1 && head[3] === 0) return 'ico'
  if (ascii(head, 4, 8) === 'ftyp' && HEIC_BRANDS.includes(ascii(head, 8, 12).toLowerCase())) return 'heic'

  // Zip container: DOCX / XLSX / EPUB
  if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) {
    try {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(file)
      if (zip.file('word/document.xml')) return 'docx'
      if (zip.file('xl/workbook.xml')) return 'xlsx'
      const mimeEntry = zip.file('mimetype')
      if (mimeEntry) {
        const mime = await mimeEntry.async('string')
        if (mime.includes('application/epub+zip')) return 'epub'
      }
    } catch {
      // not a readable zip
    }
    return null
  }

  // TIFF (little / big endian)
  if (
    (head[0] === 0x49 && head[1] === 0x49 && head[2] === 0x2a && head[3] === 0x00) ||
    (head[0] === 0x4d && head[1] === 0x4d && head[2] === 0x00 && head[3] === 0x2a)
  ) {
    return 'tiff'
  }

  // AVIF (ISO BMFF)
  if (ascii(head, 4, 8) === 'ftyp' && /avif|avis/i.test(ascii(head, 8, 16))) return 'avif'

  // Audio / video magic
  if (ascii(head, 0, 3) === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)) return 'mp3'
  if (ascii(head, 0, 4) === 'fLaC') return 'flac'
  if (ascii(head, 0, 4) === 'OggS') return 'ogg'
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WAVE') return 'wav'
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') return 'webp'
  // EBML → WebM/Matroska
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return 'webm'
  if (ascii(head, 4, 8) === 'ftyp') {
    const brand = ascii(head, 8, 12).toLowerCase()
    // Prefer audio brands as m4a; qt → mov; else mp4
    if (brand.startsWith('m4a') || brand.startsWith('m4b') || brand.startsWith('m4p')) return 'm4a'
    if (brand === 'qt  ' || brand.startsWith('qt')) return 'mov'
    if (['isom', 'mp41', 'mp42', 'avc1', 'iso2', 'iso5'].includes(brand) || brand.includes('mp4')) {
      const brands = ascii(head, 8, 32).toLowerCase()
      if (brands.includes('m4a') && !brands.includes('avc1')) return 'm4a'
      return 'mp4'
    }
  }

  // Text-based formats: decode a chunk and sniff
  let text = ''
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(head)
  } catch {
    return fromExtension(file.name)
  }
  const trimmed = text.trimStart()
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('<svg') || (lower.startsWith('<?xml') && lower.includes('<svg'))) return 'svg'
  if (lower.startsWith('<!doctype html') || lower.startsWith('<html')) return 'html'
  if (lower.startsWith('<?xml')) return 'xml'
  if (/^webvtt/i.test(trimmed)) return 'vtt'
  if (
    /^\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/m.test(trimmed) ||
    /^\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/m.test(trimmed)
  ) {
    return 'srt'
  }

  // Strict JSON: full-parse only under 1MB
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && file.size <= 1_000_000) {
    try {
      JSON.parse(await file.text())
      return 'json'
    } catch {
      // fall through
    }
  }

  // csv / tsv / yaml: extension only (too ambiguous by content)
  const byExt = fromExtension(file.name)
  if (byExt === 'csv' || byExt === 'tsv' || byExt === 'yaml') return byExt
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
