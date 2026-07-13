/** Decode any supported image format into a canvas with the pixels drawn. */
export async function decodeImage(file, format) {
  let blob = file

  if (format === 'heic') {
    const heic2any = (await import('heic2any')).default
    const converted = await heic2any({ blob: file, toType: 'image/png' })
    blob = Array.isArray(converted) ? converted[0] : converted
  }

  if (format === 'tiff') {
    const { decodeTiff } = await import('./tiff.js')
    return decodeTiff(file)
  }

  if (format === 'avif') {
    const { decodeAvifFile } = await import('./avif.js')
    return decodeAvifFile(file)
  }

  if (format === 'svg') return decodeSvg(file)

  // ICO isn't supported by createImageBitmap; browsers decode it via <img>.
  if (format !== 'ico' && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob)
      return bitmapToCanvas(bitmap)
    } catch {
      // fall through to <img> decoding
    }
  }
  return imageElementToCanvas(blob)
}

function bitmapToCanvas(bitmap) {
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d').drawImage(bitmap, 0, 0)
  bitmap.close?.()
  return canvas
}

function imageElementToCanvas(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not decode this image. The file may be corrupted.'))
    }
    img.src = url
  })
}

const DEFAULT_SVG_SIZE = 1024

async function decodeSvg(file) {
  const text = await file.text()
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const svg = doc.documentElement
  if (svg.nodeName !== 'svg') throw new Error('Not a valid SVG file.')

  // SVGs without intrinsic pixel size won't rasterize — derive one
  let width = parseFloat(svg.getAttribute('width'))
  let height = parseFloat(svg.getAttribute('height'))
  if (!width || !height || /%$/.test(svg.getAttribute('width') || '')) {
    const viewBox = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number)
    if (viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
      const scale = DEFAULT_SVG_SIZE / Math.max(viewBox[2], viewBox[3])
      width = Math.round(viewBox[2] * scale)
      height = Math.round(viewBox[3] * scale)
    } else {
      width = height = DEFAULT_SVG_SIZE
    }
    svg.setAttribute('width', width)
    svg.setAttribute('height', height)
  }

  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })
  return imageElementToCanvas(blob)
}
