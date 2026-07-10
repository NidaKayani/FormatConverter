// Evaluated before any converter module (first import of the SDK entry), so
// pdf.js resolves its worker next to sdk.js on the FormatConvert origin
// instead of an asset path relative to the consuming page.
globalThis.__FORMATCONVERT_PDF_WORKER__ = new URL('pdf.worker.min.mjs', import.meta.url).href
