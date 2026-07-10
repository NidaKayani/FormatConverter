import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// The SDK bundle sets this global before any converter module evaluates, so the
// worker resolves against the SDK's origin instead of the app bundle's asset path.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  globalThis.__FORMATCONVERT_PDF_WORKER__ || workerUrl

export default pdfjsLib
