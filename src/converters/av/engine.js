/**
 * Singleton ffmpeg.wasm loader (single-thread — no COOP/COEP).
 * Downloads ~31 MB core once with byte progress, caches in IndexedDB.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { idbGet, idbSet } from '../../lib/idbCache.js'

let ffmpeg = null
let loading = null
let encodersCache = null
/** @type {'network'|'cache'|null} */
let lastLoadSource = null

const BASE = '/ffmpeg'
const IDB_WASM = 'ffmpeg-core.wasm'
const IDB_JS = 'ffmpeg-core.js'
const AV_SOFT_BYTES = 100 * 1024 * 1024
const AV_HARD_BYTES = 600 * 1024 * 1024

export function getLastFFmpegLoadSource() {
  return lastLoadSource
}

export function assertAvFileSize(file) {
  const size = file?.size || 0
  if (size > AV_HARD_BYTES) {
    throw new Error(
      'This media file is larger than 600 MB. Browser memory limits make conversion unreliable — please use a smaller file.'
    )
  }
  return size > AV_SOFT_BYTES
}

async function fetchWithProgress(url, onProgress, label) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`)
  const total = Number(res.headers.get('content-length')) || 0
  if (!res.body || !total) {
    const buf = await res.arrayBuffer()
    onProgress?.({ stage: 'engine', page: 1, total: 1, message: label })
    return buf
  }
  const reader = res.body.getReader()
  const chunks = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    onProgress?.({
      stage: 'engine',
      page: received,
      total,
      message: `Downloading conversion engine (≈31 MB, one time)… ${Math.round((received / total) * 100)}%`,
    })
  }
  const out = new Uint8Array(received)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out.buffer
}

async function loadAsset(key, url, mime, onProgress, networkLabel) {
  const cached = await idbGet(key)
  if (cached instanceof ArrayBuffer && cached.byteLength > 0) {
    onProgress?.({
      stage: 'engine',
      page: 1,
      total: 1,
      message: 'Loading cached conversion engine…',
    })
    return { buffer: cached, fromCache: true }
  }
  const buffer = await fetchWithProgress(url, onProgress, networkLabel)
  await idbSet(key, buffer)
  return { buffer, fromCache: false }
}

export async function getFFmpeg(onProgress = () => {}) {
  if (ffmpeg?.loaded) return ffmpeg
  if (loading) return loading

  loading = (async () => {
    const instance = new FFmpeg()
    instance.on('log', () => {})
    instance.on('progress', ({ progress }) => {
      if (progress >= 0 && progress <= 1) {
        onProgress({ stage: 'encode', page: Math.round(progress * 100), total: 100 })
      }
    })

    onProgress({
      stage: 'engine',
      page: 0,
      total: 1,
      message: 'Preparing conversion engine…',
    })

    const wasm = await loadAsset(
      IDB_WASM,
      `${BASE}/ffmpeg-core.wasm`,
      'application/wasm',
      onProgress,
      'Downloading conversion engine…'
    )
    const js = await loadAsset(
      IDB_JS,
      `${BASE}/ffmpeg-core.js`,
      'text/javascript',
      onProgress,
      'Downloading conversion engine…'
    )
    lastLoadSource = wasm.fromCache && js.fromCache ? 'cache' : 'network'

    const wasmURL = URL.createObjectURL(new Blob([wasm.buffer], { type: 'application/wasm' }))
    const coreURL = URL.createObjectURL(new Blob([js.buffer], { type: 'text/javascript' }))

    try {
      await instance.load({ coreURL, wasmURL })
    } catch (e) {
      URL.revokeObjectURL(wasmURL)
      URL.revokeObjectURL(coreURL)
      const msg = e?.message || String(e)
      if (/memory|oom|out of memory/i.test(msg)) {
        throw new Error(
          'Ran out of memory converting this file. Try a smaller file (guidance: keep media under ~500 MB).'
        )
      }
      throw new Error(`Could not load the conversion engine: ${msg}`)
    }

    ffmpeg = instance
    loading = null
    return ffmpeg
  })()

  try {
    return await loading
  } catch (e) {
    loading = null
    throw e
  }
}

/** Tear down the singleton (abort / OOM recovery). */
export async function resetFFmpeg() {
  loading = null
  encodersCache = null
  if (ffmpeg) {
    try {
      await ffmpeg.terminate()
    } catch {
      /* ignore */
    }
    ffmpeg = null
  }
}

/** Dump encoder list once (used to gate optional formats). */
export async function listEncoders(onProgress) {
  if (encodersCache) return encodersCache
  const ff = await getFFmpeg(onProgress)
  const lines = []
  const onLog = ({ message }) => lines.push(message)
  ff.on('log', onLog)
  await ff.exec(['-hide_banner', '-encoders'])
  ff.off('log', onLog)
  encodersCache = lines.join('\n')
  return encodersCache
}

export function hasEncoder(encodersText, name) {
  return new RegExp(`\\b${name}\\b`).test(encodersText)
}

export async function runFFmpeg(args, { inputName, inputData, outputName, outputMime, signal }, onProgress) {
  if (signal?.aborted) throw new DOMException('Conversion aborted.', 'AbortError')
  const ff = await getFFmpeg(onProgress)
  const onAbort = () => {
    resetFFmpeg()
  }
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    if (signal?.aborted) throw new DOMException('Conversion aborted.', 'AbortError')
    await ff.writeFile(inputName, inputData)
    await ff.exec(args)
    if (signal?.aborted) throw new DOMException('Conversion aborted.', 'AbortError')
    const data = await ff.readFile(outputName)
    const blob = new Blob([data.buffer], { type: outputMime })
    return blob
  } catch (e) {
    if (signal?.aborted || e?.name === 'AbortError') {
      throw new DOMException('Conversion aborted.', 'AbortError')
    }
    const msg = e?.message || String(e)
    if (/memory|oom|out of memory/i.test(msg)) {
      throw new Error(
        'Ran out of memory converting this file. Try a smaller file (guidance: keep media under ~500 MB).'
      )
    }
    throw e
  } finally {
    signal?.removeEventListener('abort', onAbort)
    try {
      await ff.deleteFile(inputName)
    } catch {
      /* ignore */
    }
    try {
      await ff.deleteFile(outputName)
    } catch {
      /* ignore */
    }
  }
}
