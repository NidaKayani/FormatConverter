import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { treeToTable, tableToObjects } from './tableModel.js'

const PARSER_OPTS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
}

const BUILDER_OPTS = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: true,
}

export async function parseXml(file) {
  const text = await file.text()
  const parser = new XMLParser(PARSER_OPTS)
  try {
    return parser.parse(text)
  } catch (e) {
    throw new Error(`Invalid XML: ${e.message}`)
  }
}

/**
 * Heuristic: find the first array-of-objects under the root for tabular export.
 */
export function xmlToTable(data) {
  const rows = findRowArray(data)
  if (!rows) {
    throw new Error(
      'Cannot convert this XML to a table — expected a repeating element list ' +
        '(e.g. <root><row>…</row><row>…</row></root>). Attributes are preserved as @_name fields ' +
        'when converting to JSON/YAML.'
    )
  }
  return treeToTable(rows.map(flattenXmlNode), { label: 'XML' })
}

function findRowArray(node, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 6) return null
  if (Array.isArray(node)) {
    if (node.length && node.every((n) => n && typeof n === 'object' && !Array.isArray(n))) return node
    return null
  }
  for (const v of Object.values(node)) {
    if (Array.isArray(v) && v.length && v.every((n) => n && typeof n === 'object' && !Array.isArray(n))) {
      return v
    }
  }
  for (const v of Object.values(node)) {
    const found = findRowArray(v, depth + 1)
    if (found) return found
  }
  return null
}

function flattenXmlNode(node) {
  const out = {}
  for (const [k, v] of Object.entries(node)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = JSON.stringify(v)
    } else {
      out[k] = v
    }
  }
  return out
}

export function valueToXmlBlob(value, rootName = 'root') {
  const builder = new XMLBuilder(BUILDER_OPTS)
  const wrapped = Array.isArray(value) ? { [rootName]: { item: value } } : { [rootName]: value }
  const body = builder.build(wrapped)
  const text = `<?xml version="1.0" encoding="UTF-8"?>\n${body}`
  return new Blob([text], { type: 'application/xml;charset=utf-8' })
}

export function tableToXmlBlob(table) {
  return valueToXmlBlob(tableToObjects(table), 'rows')
}
