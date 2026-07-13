import { treeToTable, tableToObjects, objectsToTable, valueToCell } from './tableModel.js'

export async function parseJson(file) {
  const text = await file.text()
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`)
  }
}

export function jsonToTable(data) {
  return treeToTable(data, { label: 'JSON' })
}

export function tableToJsonBlob(table, { pretty = true } = {}) {
  const value = tableToObjects(table)
  const text = pretty ? JSON.stringify(value, null, 2) + '\n' : JSON.stringify(value)
  return new Blob([text], { type: 'application/json;charset=utf-8' })
}

export function valueToJsonBlob(value, { pretty = true } = {}) {
  const text = pretty ? JSON.stringify(value, null, 2) + '\n' : JSON.stringify(value)
  return new Blob([text], { type: 'application/json;charset=utf-8' })
}

/** Deep-ish clone preserving types for yaml↔json. */
export function cloneValue(v) {
  return JSON.parse(JSON.stringify(v))
}

export function objectsTableRoundTrip(objects) {
  const table = objectsToTable(objects)
  // Re-stringify cells then coerce — used when going through CSV
  table.rows = table.rows.map((row) => row.map(valueToCell))
  return table
}
