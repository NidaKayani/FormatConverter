/**
 * Module worker that runs DOM-free converters off the main thread.
 * Uses the lean WORKER_LOADERS map — never the full registry.
 */
import { WORKER_LOADERS, workerLoaderKey } from './loaders.js'

const DEFAULT_EXT = {
  md: 'md',
  html: 'html',
  txt: 'txt',
  csv: 'csv',
  tsv: 'tsv',
  json: 'json',
  yaml: 'yaml',
  xml: 'xml',
  xlsx: 'xlsx',
}

self.onmessage = async (e) => {
  const { id, method, payload } = e.data || {}
  if (method !== 'convert' || !payload) return

  try {
    const { buffer, name, type, from, to, opts } = payload
    const load = WORKER_LOADERS[workerLoaderKey(from, to)]
    if (!load) throw new Error(`Worker cannot run ${from} → ${to}.`)

    const file = new File([buffer], name || 'input', { type: type || 'application/octet-stream' })
    const mod = await load()
    const onProgress = (p = {}) => self.postMessage({ id, type: 'progress', progress: p })
    const result = await mod.default(file, { ...opts, from, to }, onProgress)

    const blob = result instanceof Blob ? result : result.blob
    const ext = result instanceof Blob ? (DEFAULT_EXT[to] || to) : result.ext
    const outBuf = await blob.arrayBuffer()
    self.postMessage(
      { id, type: 'result', result: { buffer: outBuf, type: blob.type, ext } },
      [outBuf]
    )
  } catch (err) {
    self.postMessage({
      id,
      type: 'error',
      error: err?.message || String(err),
    })
  }
}
