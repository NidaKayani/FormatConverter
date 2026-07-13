import { fetchFile } from '@ffmpeg/util'
import { runFFmpeg } from './engine.js'

const AUDIO_OUT = {
  mp3: { ext: 'mp3', mime: 'audio/mpeg', args: (inp, out) => ['-i', inp, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', out] },
  wav: { ext: 'wav', mime: 'audio/wav', args: (inp, out) => ['-i', inp, '-vn', '-c:a', 'pcm_s16le', out] },
  ogg: { ext: 'ogg', mime: 'audio/ogg', args: (inp, out) => ['-i', inp, '-vn', '-c:a', 'libvorbis', '-q:a', '4', out] },
  flac: { ext: 'flac', mime: 'audio/flac', args: (inp, out) => ['-i', inp, '-vn', '-c:a', 'flac', out] },
  m4a: { ext: 'm4a', mime: 'audio/mp4', args: (inp, out) => ['-i', inp, '-vn', '-c:a', 'aac', '-b:a', '192k', out] },
}

export default async function convertAudio(file, options = {}, onProgress = () => {}) {
  const to = options.to
  const spec = AUDIO_OUT[to]
  if (!spec) throw new Error(`Unsupported audio target "${to}".`)

  const fromExt = options.from || 'bin'
  const inputName = `input.${fromExt === 'm4a' ? 'm4a' : fromExt}`
  const outputName = `output.${spec.ext}`
  const inputData = await fetchFile(file)

  onProgress({ stage: 'encode' })
  const blob = await runFFmpeg(spec.args(inputName, outputName), {
    inputName,
    inputData,
    outputName,
    outputMime: spec.mime,
  }, onProgress)
  return blob
}
