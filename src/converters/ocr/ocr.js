/**
 * OCR via tesseract.js, fully self-hosted from /tesseract/ (worker, wasm
 * cores, English traineddata) so no text or pixels ever leave the browser.
 * Non-English languages stream from the tesseract.js data CDN on first use.
 */

function assetBase() {
  const base = globalThis.__FORMATCONVERT_ASSET_BASE__ || window.location.origin + '/'
  return new URL('tesseract/', base)
}

/**
 * Recognize text in a list of canvases. A single worker is created, reused
 * for every page, and always terminated afterwards.
 */
export async function ocrCanvases(canvases, options = {}, onProgress = () => {}) {
  const lang = options.ocrLanguage || 'eng'
  const { createWorker } = await import('tesseract.js')
  const base = assetBase()

  // The SDK may run cross-origin, where `new Worker(url)` is blocked — a
  // blob: worker has an opaque origin and may importScripts absolute URLs.
  let workerPath = new URL('worker.min.js', base).href
  let blobUrl = null
  try {
    const src = await (await fetch(workerPath)).blob()
    blobUrl = URL.createObjectURL(src)
    workerPath = blobUrl
  } catch {
    // fall back to the direct URL (same-origin case always works)
  }

  const langPath =
    lang === 'eng'
      ? new URL('lang', base).href
      : `https://cdn.jsdelivr.net/npm/@tesseract.js-data/${lang}/4.0.0_best_int`

  const worker = await createWorker(lang, 1, {
    workerPath,
    corePath: new URL('core', base).href,
    langPath,
    gzip: true,
  })

  try {
    const texts = []
    for (let i = 0; i < canvases.length; i++) {
      onProgress({ page: i + 1, total: canvases.length, stage: 'ocr' })
      const { data } = await worker.recognize(canvases[i])
      texts.push((data.text || '').trim())
    }
    return texts
  } finally {
    await worker.terminate()
    if (blobUrl) URL.revokeObjectURL(blobUrl)
  }
}
