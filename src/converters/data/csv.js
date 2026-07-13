import Papa from 'papaparse'
import { makeTable, tableToObjects } from './tableModel.js'

export function parseDelimited(text, delimiter) {
  const parsed = Papa.parse(text, {
    delimiter,
    header: false,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
  })
  if (parsed.errors?.length) {
    const first = parsed.errors[0]
    throw new Error(`CSV parse error${first.row != null ? ` at row ${first.row}` : ''}: ${first.message}`)
  }
  const rows = parsed.data || []
  if (!rows.length) return makeTable([], [])
  const header = rows[0].map((c) => String(c ?? ''))
  return makeTable(header, rows.slice(1))
}

export function serializeDelimited(table, delimiter) {
  const data = [table.header, ...table.rows]
  return Papa.unparse(data, { delimiter, newline: '\n' })
}

export async function fileToTable(file, delimiter) {
  return parseDelimited(await file.text(), delimiter)
}

export function tableToCsvBlob(table, delimiter = ',', mime = 'text/csv') {
  const text = serializeDelimited(table, delimiter)
  return new Blob([text], { type: `${mime};charset=utf-8` })
}

export function tableToJsonValue(table) {
  return tableToObjects(table)
}
