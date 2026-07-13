/**
 * Singleton ffmpeg.wasm loader (single-thread — no COOP/COEP).
 * Downloads ~31 MB core once with byte progress, then caches via blob URLs.
 */
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpeg = null
let loading = null
let encodersCache = null

const BASE = '/ffmpeg'

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
      message: 'Downloading conversion engine (≈31 MB, one time)…',
    })

    // Prefetch wasm with ReadableStream progress, then hand blob URLs to ffmpeg
    const wasmBuf = await fetchWithProgress(
      `${BASE}/ffmpeg-core.wasm`,
      onProgress,
      'Downloading conversion engine…'
    )
    const wasmBlob = new Blob([wasmBuf], { type: 'application/wasm' })
    const wasmURL = URL.createObjectURL(wasmBlob)
    const coreURL = await toBlobURL(`${BASE}/ffmpeg-core.js`, 'text/javascript')

    try {
      await instance.load({ coreURL, wasmURL })
    } catch (e) {
      URL.revokeObjectURL(wasmURL)
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

export async function runFFmpeg(args, { inputName, inputData, outputName, outputMime }, onProgress) {
  const ff = await getFFmpeg(onProgress)
  try {
    await ff.writeFile(inputName, inputData)
    await ff.exec(args)
    const data = await ff.readFile(outputName)
    const blob = new Blob([data.buffer], { type: outputMime })
    return blob
  } catch (e) {
    const msg = e?.message || String(e)
    if (/memory|oom|out of memory/i.test(msg)) {
      throw new Error(
        'Ran out of memory converting this file. Try a smaller file (guidance: keep media under ~500 MB).'
      )
    }
    throw e
  } finally {
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
