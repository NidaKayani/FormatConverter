import './workerPath.js'
import * as api from '../converters/index.js'

/**
 * FormatConvert browser SDK.
 *
 * @module FormatConvert
 *
 * @example
 * import { convert } from 'https://formatconvert.quantumlogicslimited.com/sdk.js'
 * const { blob, filename } = await convert(file, 'pdf', { pageSize: 'a4' })
 */

/**
 * Convert a file to another format (input format auto-detected unless options.from is set).
 * @type {(file: File|Blob, to: string, options?: object) => Promise<{ blob: Blob, filename: string, from: string, to: string }>}
 */
export const convert = api.convert

/**
 * Convert many files; failures are per-item and do not abort the batch.
 * @type {(files: Array<File|Blob>, to: string, options?: object) => Promise<Array<{ file: File|Blob, ok: boolean, result?: object, error?: Error }>>}
 */
export const convertMany = api.convertMany

/** Zip successful convertMany results. */
export const zipResults = api.zipResults

/** Detect format from magic bytes (not file extension). */
export const detectFormat = api.detectFormat

/** List every registered { from, to, options } conversion. */
export const listConversions = api.listConversions

/** Target format ids for a source format. */
export const targetsFor = api.targetsFor

export const getConversion = api.getConversion
export const FORMATS = api.FORMATS
export const KINDS = api.KINDS

/** Multi-input tools (merge-pdf, split-pdf, …). */
export const runTool = api.runTool
export const listTools = api.listTools
export const getTool = api.getTool

export const getLastFFmpegLoadSource = api.getLastFFmpegLoadSource
export const resetFFmpeg = api.resetFFmpeg
export const assertAvFileSize = api.assertAvFileSize

// Also expose a global for consumers loading via <script type="module" src>
if (typeof window !== 'undefined') {
  window.FormatConvert = api
}
