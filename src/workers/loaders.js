/**
 * Dynamic-import map for converters that may run inside convert.worker.js.
 * Keep this lean — anything listed here is pulled into the worker chunk graph.
 * Must stay in sync with registry entries that set env: 'worker'.
 *
 * Rules: only DOM-free modules. Never add xlsx/SheetJS, pdf.js, canvas, ffmpeg,
 * turndown, or mammoth here.
 */
export const WORKER_LOADERS = {
  'txt:md': () => import('../converters/docs/txtToMd.js'),
  'md:html': () => import('../converters/docs/mdToHtml.js'),
}

// xlsx intentionally omitted — runs on main thread
const DATA = ['csv', 'tsv', 'json', 'yaml', 'toml', 'xml']
const DATA_OUT = [...DATA, 'md', 'html', 'txt']
const loadData = () => import('../converters/data/convert.js')
for (const from of DATA) {
  for (const to of DATA_OUT) {
    if (from === to) continue
    WORKER_LOADERS[`${from}:${to}`] = loadData
  }
}

const loadSubs = () => import('../converters/subtitles/convert.js')
const SUBS = ['srt', 'vtt', 'ass', 'ssa', 'txt']
for (const from of SUBS) {
  for (const to of SUBS) {
    if (from === to) continue
    WORKER_LOADERS[`${from}:${to}`] = loadSubs
  }
}

const loadEpubOut = () => import('../converters/ebook/epubOut.js')
WORKER_LOADERS['md:epub'] = loadEpubOut
WORKER_LOADERS['txt:epub'] = loadEpubOut
WORKER_LOADERS['html:epub'] = loadEpubOut

export function workerLoaderKey(from, to) {
  return `${from}:${to}`
}
