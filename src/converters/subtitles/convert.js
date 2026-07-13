/**
 * Hand-rolled SRT ↔ VTT ↔ plain text subtitle conversions.
 */

const TS = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/

function parseTimestamp(s) {
  const m = TS.exec(s.trim())
  if (!m) throw new Error(`Invalid timestamp: ${s}`)
  return (
    Number(m[1]) * 3600000 +
    Number(m[2]) * 60000 +
    Number(m[3]) * 1000 +
    Number(m[4])
  )
}

function formatSrt(ms) {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const milli = ms % 1000
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`
}

function formatVtt(ms) {
  return formatSrt(ms).replace(',', '.')
}

function pad(n, w = 2) {
  return String(n).padStart(w, '0')
}

export function parseSrt(text) {
  const blocks = text.replace(/\r\n/g, '\n').trim().split(/\n\s*\n/)
  const cues = []
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean)
    if (!lines.length) continue
    let i = 0
    if (/^\d+$/.test(lines[0])) i = 1
    const timing = lines[i]
    if (!timing || !timing.includes('-->')) continue
    const [startRaw, endRaw] = timing.split('-->').map((s) => s.trim())
    const start = parseTimestamp(startRaw)
    const end = parseTimestamp(endRaw.split(/\s/)[0])
    const body = lines.slice(i + 1).join('\n')
    cues.push({ start, end, text: body })
  }
  return cues
}

export function parseVtt(text) {
  let body = text.replace(/\r\n/g, '\n')
  if (/^WEBVTT/i.test(body)) {
    body = body.replace(/^WEBVTT[^\n]*\n+/, '')
  }
  // Drop NOTE / STYLE blocks lightly
  body = body.replace(/^NOTE[\s\S]*?(?=\n\n|\n*$)/gm, '')
  return parseSrt(body)
}

export function cuesToSrt(cues) {
  return (
    cues
      .map(
        (c, i) =>
          `${i + 1}\n${formatSrt(c.start)} --> ${formatSrt(c.end)}\n${c.text}\n`
      )
      .join('\n') + '\n'
  )
}

export function cuesToVtt(cues) {
  return (
    'WEBVTT\n\n' +
    cues
      .map((c) => `${formatVtt(c.start)} --> ${formatVtt(c.end)}\n${c.text}\n`)
      .join('\n') +
    '\n'
  )
}

export function cuesToTxt(cues) {
  return cues.map((c) => c.text).join('\n\n') + '\n'
}

export default async function convertSubtitles(file, options = {}) {
  const { from, to } = options
  const text = await file.text()
  let cues
  if (from === 'srt') cues = parseSrt(text)
  else if (from === 'vtt') cues = parseVtt(text)
  else if (from === 'txt') {
    // Plain text → single cue spanning 0–5s (honest minimal conversion)
    cues = [{ start: 0, end: 5000, text: text.trim() }]
  } else throw new Error(`Unsupported subtitle source ${from}`)

  if (to === 'srt') return new Blob([cuesToSrt(cues)], { type: 'application/x-subrip;charset=utf-8' })
  if (to === 'vtt') return new Blob([cuesToVtt(cues)], { type: 'text/vtt;charset=utf-8' })
  if (to === 'txt') return new Blob([cuesToTxt(cues)], { type: 'text/plain;charset=utf-8' })
  throw new Error(`Unsupported subtitle target ${to}`)
}
