/**
 * Encode a canvas as a 24-bit uncompressed BMP (BITMAPINFOHEADER, BGR,
 * bottom-up rows padded to 4 bytes). Written by hand — browsers can't
 * encode BMP via canvas.toBlob.
 */
export function encodeBmp(canvas) {
  const { width, height } = canvas
  const pixels = canvas.getContext('2d').getImageData(0, 0, width, height).data

  const rowSize = Math.ceil((width * 3) / 4) * 4
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize

  const buf = new ArrayBuffer(fileSize)
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42) // 'B'
  view.setUint8(1, 0x4d) // 'M'
  view.setUint32(2, fileSize, true)
  view.setUint32(10, 54, true) // pixel data offset

  // BITMAPINFOHEADER
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // positive = bottom-up
  view.setUint16(26, 1, true) // planes
  view.setUint16(28, 24, true) // bpp
  view.setUint32(34, pixelDataSize, true)
  view.setInt32(38, 2835, true) // 72 dpi in px/m
  view.setInt32(42, 2835, true)

  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 4
    let dst = 54 + y * rowSize
    for (let x = 0; x < width; x++) {
      const src = srcRow + x * 4
      bytes[dst++] = pixels[src + 2] // B
      bytes[dst++] = pixels[src + 1] // G
      bytes[dst++] = pixels[src] // R
    }
  }

  return new Blob([buf], { type: 'image/bmp' })
}
