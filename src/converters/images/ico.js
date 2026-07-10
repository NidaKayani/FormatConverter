/**
 * Encode a canvas as a multi-size .ico file. Each size is rendered to a
 * square canvas (aspect preserved, centered, transparent padding) and stored
 * as an embedded PNG — the modern ICO layout Windows and browsers expect.
 */
export async function encodeIco(canvas, sizes = [16, 32, 48]) {
  const valid = [...new Set(sizes.map(Number).filter((n) => n > 0 && n <= 256))].sort((a, b) => a - b)
  if (valid.length === 0) throw new Error('Select at least one icon size.')

  const images = []
  for (const size of valid) {
    const square = document.createElement('canvas')
    square.width = size
    square.height = size
    const ctx = square.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const scale = Math.min(size / canvas.width, size / canvas.height)
    const w = Math.max(1, Math.round(canvas.width * scale))
    const h = Math.max(1, Math.round(canvas.height * scale))
    ctx.drawImage(canvas, (size - w) / 2, (size - h) / 2, w, h)

    const blob = await new Promise((resolve, reject) => {
      square.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed.'))), 'image/png')
    })
    images.push({ size, data: new Uint8Array(await blob.arrayBuffer()) })
  }

  const headerSize = 6 + images.length * 16
  const totalSize = headerSize + images.reduce((n, img) => n + img.data.length, 0)
  const buf = new ArrayBuffer(totalSize)
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)

  // ICONDIR
  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // type: icon
  view.setUint16(4, images.length, true)

  let offset = headerSize
  images.forEach((img, i) => {
    const entry = 6 + i * 16
    view.setUint8(entry, img.size === 256 ? 0 : img.size) // width (0 means 256)
    view.setUint8(entry + 1, img.size === 256 ? 0 : img.size)
    view.setUint8(entry + 2, 0) // palette
    view.setUint8(entry + 3, 0) // reserved
    view.setUint16(entry + 4, 1, true) // planes
    view.setUint16(entry + 6, 32, true) // bpp
    view.setUint32(entry + 8, img.data.length, true)
    view.setUint32(entry + 12, offset, true)
    bytes.set(img.data, offset)
    offset += img.data.length
  })

  return new Blob([buf], { type: 'image/x-icon' })
}
