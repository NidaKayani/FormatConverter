import pdfjsLib from './pdfjs.js'

/** Render every page of a PDF to a canvas at the given scale. */
export async function renderPdfPages(file, scale = 2, onProgress = () => {}) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const total = pdf.numPages
  const canvases = []

  for (let pageNum = 1; pageNum <= total; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvasContext: ctx, viewport }).promise
    canvases.push(canvas)
    onProgress({ page: pageNum, total, stage: 'render' })
  }
  return canvases
}
