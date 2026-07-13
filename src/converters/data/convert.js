/**
 * Unified data-format converter. Dispatches on options.from / options.to.
 */
import { fileToTable, tableToCsvBlob } from './csv.js'
import { parseXlsx, tableToXlsxBlob, tablesToXlsxBlob } from './xlsx.js'
import { parseJson, jsonToTable, tableToJsonBlob, valueToJsonBlob, cloneValue } from './json.js'
import { parseYamlFile, yamlToTable, tableToYamlBlob, valueToYamlBlob } from './yaml.js'
import { parseXml, xmlToTable, tableToXmlBlob, valueToXmlBlob } from './xml.js'
import { tableToMdBlob, tableToHtmlBlob, tableToMarkdown } from './renderTable.js'
import { tableToObjects } from './tableModel.js'
import JSZip from 'jszip'

const DELIM = { csv: ',', tsv: '\t' }

async function toTable(file, from, options) {
  if (from === 'csv' || from === 'tsv') return fileToTable(file, DELIM[from])
  if (from === 'xlsx') {
    const { single } = await parseXlsx(file, { sheet: options.sheet || 'first' })
    return single
  }
  if (from === 'json') return jsonToTable(await parseJson(file))
  if (from === 'yaml') return yamlToTable(await parseYamlFile(file))
  if (from === 'xml') return xmlToTable(await parseXml(file))
  throw new Error(`Unsupported data source "${from}".`)
}

async function fromTree(file, from) {
  if (from === 'json') return parseJson(file)
  if (from === 'yaml') return parseYamlFile(file)
  if (from === 'xml') return parseXml(file)
  if (from === 'csv' || from === 'tsv') {
    return tableToObjects(await fileToTable(file, DELIM[from]))
  }
  if (from === 'xlsx') {
    const { single } = await parseXlsx(file, { sheet: 'first' })
    return tableToObjects(single)
  }
  throw new Error(`Unsupported data source "${from}".`)
}

async function multiToMarkdownZip(tables, titleBase) {
  const zip = new JSZip()
  for (const { name, table } of tables) {
    zip.file(`${name || 'sheet'}.md`, tableToMarkdown(table, name))
  }
  return { blob: await zip.generateAsync({ type: 'blob' }), ext: 'zip', filename: `${titleBase || 'sheets'}.zip` }
}

export default async function convertData(file, options = {}, onProgress = () => {}) {
  const { from, to } = options
  onProgress({ stage: 'decode' })

  const title = file.name?.replace(/\.[^.]+$/, '') || 'data'

  // Tree ↔ tree (preserve types for json/yaml/xml)
  const treeFormats = new Set(['json', 'yaml', 'xml'])
  if (treeFormats.has(from) && treeFormats.has(to) && from !== to) {
    const value = cloneValue(await fromTree(file, from))
    onProgress({ stage: 'encode' })
    if (to === 'json') return valueToJsonBlob(value)
    if (to === 'yaml') return valueToYamlBlob(value)
    if (to === 'xml') return valueToXmlBlob(value)
  }

  // Multi-sheet xlsx → zip of per-sheet outputs
  if (from === 'xlsx' && (options.sheet || 'first') === 'all') {
    const { tables } = await parseXlsx(file, { sheet: 'all' })
    onProgress({ stage: 'encode' })
    if (to === 'csv' || to === 'tsv') {
      const zip = new JSZip()
      for (const { name, table } of tables) {
        const blob = tableToCsvBlob(
          table,
          DELIM[to],
          to === 'tsv' ? 'text/tab-separated-values' : 'text/csv'
        )
        zip.file(`${name}.${to}`, blob)
      }
      return { blob: await zip.generateAsync({ type: 'blob' }), ext: 'zip' }
    }
    if (to === 'md') return multiToMarkdownZip(tables, title)
    if (to === 'json') {
      const obj = Object.fromEntries(tables.map(({ name, table }) => [name, tableToObjects(table)]))
      return valueToJsonBlob(obj)
    }
    if (to === 'xlsx') return tablesToXlsxBlob(tables)
    if (to === 'yaml') {
      const obj = Object.fromEntries(tables.map(({ name, table }) => [name, tableToObjects(table)]))
      return valueToYamlBlob(obj)
    }
  }

  const table = await toTable(file, from, options)
  onProgress({ stage: 'encode' })

  if (to === 'csv') return tableToCsvBlob(table, ',', 'text/csv')
  if (to === 'tsv') return tableToCsvBlob(table, '\t', 'text/tab-separated-values')
  if (to === 'xlsx') return tableToXlsxBlob(table)
  if (to === 'json') return tableToJsonBlob(table)
  if (to === 'yaml') return tableToYamlBlob(table)
  if (to === 'xml') return tableToXmlBlob(table)
  if (to === 'md') return tableToMdBlob(table, title)
  if (to === 'html') return tableToHtmlBlob(table, title)
  if (to === 'pdf') {
    const { markdownToPdf } = await import('../docs/mdToPdf.js')
    return markdownToPdf(tableToMarkdown(table, title), options)
  }
  if (to === 'docx') {
    const { markdownToDocx } = await import('../docs/mdToDocx.js')
    return markdownToDocx(tableToMarkdown(table, title), title)
  }
  if (to === 'txt') {
    return new Blob([tableToMarkdown(table, title)], { type: 'text/plain;charset=utf-8' })
  }

  throw new Error(`Unsupported data target "${to}".`)
}
