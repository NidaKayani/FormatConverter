import { FORMATS, getConversion, targetsFor, listConversions } from './registry.js'
import { detectFormat } from './detect.js'

export { FORMATS, targetsFor, listConversions, detectFormat, getConversion }

function baseName(name = 'converted') {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

/**
 * Convert a File/Blob to another format.
 *
 * @param {File|Blob} file  input file
 * @param {string} to       target format key, e.g. 'pdf', 'md', 'png'
 * @param {object} [options] converter options (see registry option schemas)
 * @param {object} [options.from]      source format key; auto-detected if omitted
 * @param {function} [options.onProgress] callback ({ page, total, stage })
 * @returns {Promise<{ blob: Blob, filename: string, from: string, to: string }>}
 */
export async function convert(file, to, options = {}) {
  if (!file) throw new Error('No input file given.')
  const { from: explicitFrom, onProgress, ...opts } = options

  const from = explicitFrom || (await detectFormat(file))
  if (!from || !FORMATS[from]) {
    throw new Error('Could not detect the input format. Pass options.from explicitly.')
  }
  if (!FORMATS[to]) throw new Error(`Unknown target format "${to}".`)
  if (from === to) throw new Error(`File is already ${FORMATS[to].label}.`)

  const entry = getConversion(from, to)
  if (!entry) {
    throw new Error(`Conversion ${FORMATS[from].label} → ${FORMATS[to].label} is not supported.`)
  }

  const mod = await entry.load()
  const result = await mod.default(file, { ...opts, from, to }, onProgress || (() => {}))

  // Converters return a Blob, or { blob, ext } when the container differs (e.g. zip)
  const blob = result instanceof Blob ? result : result.blob
  const ext = result instanceof Blob ? FORMATS[to].exts[0] : result.ext
  const filename = `${baseName(file.name)}.${ext}`
  return { blob, filename, from, to }
}

/**
 * Convert several files to the same target format, sequentially.
 *
 * onProgress receives { fileIndex, fileCount, file, ...perFileProgress }.
 * Returns one entry per input: { file, ok, result?, error? } — a failing file
 * doesn't abort the rest of the batch.
 */
export async function convertMany(files, to, options = {}) {
  const list = Array.from(files)
  const { onProgress, ...opts } = options
  const results = []

  for (let i = 0; i < list.length; i++) {
    const file = list[i]
    const report = (p = {}) =>
      onProgress?.({ fileIndex: i, fileCount: list.length, file, ...p })
    report()
    try {
      const result = await convert(file, to, { ...opts, onProgress: report })
      results.push({ file, ok: true, result })
    } catch (error) {
      results.push({ file, ok: false, error })
    }
  }
  return results
}

/** Bundle successful batch results into a single .zip Blob. */
export async function zipResults(results, zipName = 'converted.zip') {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()
  const used = new Set()
  for (const entry of results) {
    if (!entry.ok) continue
    let name = entry.result.filename
    // Two inputs can map to the same output name — de-duplicate
    for (let n = 2; used.has(name); n++) {
      name = entry.result.filename.replace(/(\.[^.]+)$/, `-${n}$1`)
    }
    used.add(name)
    zip.file(name, entry.result.blob)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, filename: zipName }
}
