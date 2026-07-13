import { fetchFile } from '@ffmpeg/util'
import { getFFmpeg, assertAvFileSize, resetFFmpeg } from './engine.js'

/**
 * Video → GIF via palettegen 2-pass for better quality.
 */
export default async function videoToGif(file, options = {}, onProgress = () => {}) {
  assertAvFileSize(file)
  const from = options.from || 'mp4'
  const signal = options.signal
  if (signal?.aborted) throw new DOMException('Conversion aborted.', 'AbortError')
  const inputName = `input.${from === 'webm' ? 'webm' : from === 'mov' ? 'mov' : 'mp4'}`
  const inputData = await fetchFile(file)
  const ff = await getFFmpeg(onProgress)

  const onAbort = () => {
    resetFFmpeg()
  }
  signal?.addEventListener('abort', onAbort, { once: true })

  onProgress({ stage: 'encode', page: 0, total: 2 })
  try {
    if (signal?.aborted) throw new DOMException('Conversion aborted.', 'AbortError')
    await ff.writeFile(inputName, inputData)
    await ff.exec([
      '-i', inputName,
      '-vf', 'fps=10,scale=480:-1:flags=lanczos,palettegen',
      'palette.png',
    ])
    onProgress({ stage: 'encode', page: 1, total: 2 })
    if (signal?.aborted) throw new DOMException('Conversion aborted.', 'AbortError')
    await ff.exec([
      '-i', inputName,
      '-i', 'palette.png',
      '-lavfi', 'fps=10,scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse',
      'output.gif',
    ])
    onProgress({ stage: 'encode', page: 2, total: 2 })
    const data = await ff.readFile('output.gif')
    return new Blob([data.buffer], { type: 'image/gif' })
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
    for (const name of [inputName, 'palette.png', 'output.gif']) {
      try {
        await ff.deleteFile(name)
      } catch {
        /* ignore */
      }
    }
  }
}
