import { fetchFile } from '@ffmpeg/util'
import { runFFmpeg } from './engine.js'

/** Video → mp4 (H.264 + AAC) or audio extraction. */
export default async function convertVideo(file, options = {}, onProgress = () => {}) {
  const { from, to } = options
  const inputName = `input.${from === 'mov' ? 'mov' : from === 'webm' ? 'webm' : from === 'gif' ? 'gif' : 'mp4'}`
  const inputData = await fetchFile(file)
  onProgress({ stage: 'encode' })

  if (to === 'mp4') {
    const outputName = 'output.mp4'
    const args =
      from === 'gif'
        ? ['-i', inputName, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', outputName]
        : ['-i', inputName, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-movflags', 'faststart', outputName]
    return runFFmpeg(args, {
      inputName,
      inputData,
      outputName,
      outputMime: 'video/mp4',
    }, onProgress)
  }

  if (to === 'mp3' || to === 'wav') {
    const outputName = `output.${to}`
    const args =
      to === 'mp3'
        ? ['-i', inputName, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', outputName]
        : ['-i', inputName, '-vn', '-c:a', 'pcm_s16le', outputName]
    return runFFmpeg(args, {
      inputName,
      inputData,
      outputName,
      outputMime: to === 'mp3' ? 'audio/mpeg' : 'audio/wav',
    }, onProgress)
  }

  throw new Error(`Unsupported video target "${to}".`)
}
