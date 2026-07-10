// Evaluated before any converter module (first import of the SDK entry), so
// runtime assets resolve against the SDK's origin instead of paths relative
// to the consuming page.
globalThis.__FORMATCONVERT_PDF_WORKER__ = new URL('pdf.worker.min.mjs', import.meta.url).href
globalThis.__FORMATCONVERT_ASSET_BASE__ = new URL('.', import.meta.url).href
