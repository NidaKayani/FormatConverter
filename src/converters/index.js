import { FORMATS, getConversion, targetsFor, listConversions, KINDS, sourcesForKind } from './registry.js'
import { detectFormat } from './detect.js'
import { getTool, listTools as listRegisteredTools, TOOLS } from './tools.js'

export {
  FORMATS,
  KINDS,
  targetsFor,
  listConversions,
  detectFormat,
  getConversion,
  sourcesForKind,
  getTool,
  TOOLS,
}

export { getLastFFmpegLoadSource, resetFFmpeg, assertAvFileSize } from './av/engine.js'

function baseName(name = 'converted') {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(0, i) : name
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw new DOMException('Conversion aborted.', 'AbortError')
}

async function runOnMain(entry, file, from, to, opts, onProgress) {
  const mod = await entry.load()
  return mod.default(file, { ...opts, from, to }, onProgress || (() => {}))
}

async function runViaWorker(entry, file, from, to, opts, onProgress, signal) {
  throwIfAborted(signal)
  const { convertInWorker } = await import('../workers/rpc.js')
  const buffer = await file.arrayBuffer()
  throwIfAborted(signal)
  const out = await convertInWorker(
    {
      buffer,
      name: file.name || 'input',
      type: file.type || '',
      from,
      to,
      opts,
    },
    onProgress,
    signal
  )
  return { blob: new Blob([out.buffer], { type: out.type }), ext: out.ext }
}

/**
 * Convert a File/Blob to another format.
 *
 * @param {File|Blob} file  input file
 * @param {string} to       target format key, e.g. 'pdf', 'md', 'png'
 * @param {object} [options] converter options (see registry option schemas)
 * @param {string} [options.from] source format key; auto-detected if omitted
 * @param {function} [options.onProgress] callback ({ page, total, stage })
 * @param {AbortSignal} [options.signal] abort in-flight work
 * @returns {Promise<{ blob: Blob, filename: string, from: string, to: string }>}
 */
export async function convert(file, to, options = {}) {
  if (!file) throw new Error('No input file given.')
  const { from: explicitFrom, onProgress, signal, ...opts } = options
  throwIfAborted(signal)

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

  const report = onProgress || (() => {})
  const passOpts = { ...opts, signal }
  let result
  const useWorker = entry.env === 'worker' && typeof __SDK__ !== 'undefined' && !__SDK__
  if (useWorker) {
    try {
      result = await runViaWorker(entry, file, from, to, passOpts, report, signal)
    } catch (e) {
      if (e?.name === 'AbortError' || signal?.aborted) throw e
      result = await runOnMain(entry, file, from, to, passOpts, report)
    }
  } else {
    result = await runOnMain(entry, file, from, to, passOpts, report)
  }

  throwIfAborted(signal)
  const blob = result instanceof Blob ? result : result.blob
  const ext = result instanceof Blob ? FORMATS[to].exts[0] : result.ext
  const filename = `${baseName(file.name)}.${ext}`
  return { blob, filename, from, to }
}

/**
 * Convert several files to the same target format.
 *
 * @param {object} [options.concurrency] parallel workers (default 2, max 4)
 * @param {AbortSignal} [options.signal]
 * onProgress receives { fileIndex, fileCount, file, ...perFileProgress }.
 * Returns one entry per input: { file, ok, result?, error? }.
 */
export async function convertMany(files, to, options = {}) {
  const list = Array.from(files)
  const { onProgress, concurrency: rawConc, signal, ...opts } = options
  const concurrency = Math.max(1, Math.min(4, Number(rawConc) || 2))
  const results = new Array(list.length)
  let next = 0

  async function worker() {
    while (true) {
      throwIfAborted(signal)
      const i = next++
      if (i >= list.length) return
      const file = list[i]
      const report = (p = {}) =>
        onProgress?.({ fileIndex: i, fileCount: list.length, file, ...p })
      report()
      try {
        const result = await convert(file, to, { ...opts, signal, onProgress: report })
        results[i] = { file, ok: true, result }
      } catch (error) {
        if (error?.name === 'AbortError') {
          results[i] = { file, ok: false, error, aborted: true }
          throw error
        }
        results[i] = { file, ok: false, error }
      }
    }
  }

  const pool = Array.from({ length: Math.min(concurrency, list.length) }, () => worker())
  try {
    await Promise.all(pool)
  } catch (e) {
    if (e?.name === 'AbortError') {
      for (let i = 0; i < list.length; i++) {
        if (!results[i]) {
          results[i] = {
            file: list[i],
            ok: false,
            error: new DOMException('Conversion aborted.', 'AbortError'),
            aborted: true,
          }
        }
      }
      return results
    }
    throw e
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
    for (let n = 2; used.has(name); n++) {
      name = entry.result.filename.replace(/(\.[^.]+)$/, `-${n}$1`)
    }
    used.add(name)
    zip.file(name, entry.result.blob)
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  return { blob, filename: zipName }
}

/**
 * Run a multi-input tool by id.
 * @param {string} toolId
 * @param {File[]|Blob[]} files
 * @param {object} [options]
 * @returns {Promise<{ blob: Blob, filename: string, tool: string }>}
 */
export async function runTool(toolId, files, options = {}) {
  const tool = getTool(toolId)
  if (!tool) throw new Error(`Unknown tool "${toolId}".`)

  const list = Array.from(files || []).filter(Boolean)
  const { min = 1, max = Infinity, formats, ordered } = tool.inputs || {}
  if (list.length < min) {
    throw new Error(`This tool needs at least ${min} file${min === 1 ? '' : 's'}.`)
  }
  if (list.length > max) {
    throw new Error(`This tool accepts at most ${max} file${max === 1 ? '' : 's'}.`)
  }
  if (!ordered && list.length === 0) {
    throw new Error('No input files given.')
  }

  if (formats?.length) {
    for (const file of list) {
      const detected = await detectFormat(file)
      if (!formats.includes(detected)) {
        const labels = formats.map((f) => FORMATS[f]?.label || f).join(', ')
        throw new Error(`Expected ${labels} input, got ${FORMATS[detected]?.label || 'unknown'}.`)
      }
    }
  }

  const { onProgress, signal, ...opts } = options
  throwIfAborted(signal)
  const mod = await tool.load()
  const result = await mod.default(list, { ...opts, signal }, onProgress || (() => {}))
  throwIfAborted(signal)
  const blob = result instanceof Blob ? result : result.blob
  const ext = result instanceof Blob ? (FORMATS[tool.output]?.exts?.[0] || tool.output) : result.ext
  const filename = result instanceof Blob
    ? `${toolId}.${ext}`
    : (result.filename || `${toolId}.${ext}`)
  return { blob, filename, tool: toolId }
}

export function listTools() {
  return listRegisteredTools()
}
