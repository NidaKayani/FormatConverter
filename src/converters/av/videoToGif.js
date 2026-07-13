import { fetchFile } from '@ffmpeg/util'
import { runFFmpeg, getFFmpeg } from './engine.js'

/**
 * Video → GIF via palettegen 2-pass for better quality.
 */
export default async function videoToGif(file, options = {}, onProgress = () => {}) {
  const from = options.from || 'mp4'
  const inputName = `input.${from === 'webm' ? 'webm' : from === 'mov' ? 'mov' : 'mp4'}`
  const inputData = await fetchFile(file)
  const ff = await getFFmpeg(onProgress)

  onProgress({ stage: 'encode', page: 0, total: 2 })
  try {
    await ff.writeFile(inputName, inputData)
    await ff.exec([
      '-i', inputName,
      '-vf', 'fps=10,scale=480:-1:flags=lanczos,palettegen',
      'palette.png',
    ])
    onProgress({ stage: 'encode', page: 1, total: 2 })
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
    const msg = e?.message || String(e)
    if (/memory|oom|out of memory/i.test(msg)) {
      throw new Error(
        'Ran out of memory converting this file. Try a smaller file (guidance: keep media under ~500 MB).'
      )
    }
    throw e
  } finally {
    for (const name of [inputName, 'palette.png', 'output.gif']) {
      try {
        await ff.deleteFile(name)
      } catch {
        /* ignore */
      }
    }
  }
}
