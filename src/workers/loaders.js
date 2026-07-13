/**
 * Dynamic-import map for converters that may run inside convert.worker.js.
 * Keep this lean — anything listed here is pulled into the worker chunk graph.
 * Must stay in sync with registry entries that set env: 'worker'.
 */
export const WORKER_LOADERS = {
  'txt:md': () => import('../converters/docs/txtToMd.js'),
  'md:html': () => import('../converters/docs/mdToHtml.js'),
}

const DATA = ['csv', 'tsv', 'xlsx', 'json', 'yaml', 'xml']
const DATA_OUT = [...DATA, 'md', 'html', 'txt']
const loadData = () => import('../converters/data/convert.js')
for (const from of DATA) {
  for (const to of DATA_OUT) {
    if (from === to) continue
    WORKER_LOADERS[`${from}:${to}`] = loadData
  }
}

const loadSubs = () => import('../converters/subtitles/convert.js')
for (const [from, to] of [
  ['srt', 'vtt'],
  ['srt', 'txt'],
  ['vtt', 'srt'],
  ['vtt', 'txt'],
  ['txt', 'srt'],
  ['txt', 'vtt'],
]) {
  WORKER_LOADERS[`${from}:${to}`] = loadSubs
}

const loadEpubOut = () => import('../converters/ebook/epubOut.js')
WORKER_LOADERS['md:epub'] = loadEpubOut
WORKER_LOADERS['txt:epub'] = loadEpubOut
WORKER_LOADERS['html:epub'] = loadEpubOut

export function workerLoaderKey(from, to) {
  return `${from}:${to}`
}
