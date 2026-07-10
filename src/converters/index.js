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
