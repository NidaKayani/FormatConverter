/**
 * Hand-rolled postMessage RPC for the conversion worker.
 * Singleton module worker; falls back is handled by callers.
 */

let worker = null
let nextId = 1
const pending = new Map()

function ensureWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./convert.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = (e) => {
    const { id, type, result, error, progress } = e.data || {}
    const entry = pending.get(id)
    if (!entry) return
    if (type === 'progress') {
      entry.onProgress?.(progress)
      return
    }
    pending.delete(id)
    if (type === 'error') entry.reject(new Error(error || 'Worker conversion failed.'))
    else entry.resolve(result)
  }
  worker.onerror = (err) => {
    for (const [, entry] of pending) {
      entry.reject(err instanceof Error ? err : new Error(String(err?.message || err)))
    }
    pending.clear()
    worker = null
  }
  return worker
}

/**
 * Run a conversion inside the module worker.
 * @param {{ buffer: ArrayBuffer, name: string, type: string, from: string, to: string, opts: object }} payload
 * @param {(p: object) => void} [onProgress]
 * @returns {Promise<{ buffer: ArrayBuffer, type: string, ext: string }>}
 */
export function convertInWorker(payload, onProgress) {
  const w = ensureWorker()
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress })
    w.postMessage({ id, method: 'convert', payload }, [payload.buffer])
  })
}
