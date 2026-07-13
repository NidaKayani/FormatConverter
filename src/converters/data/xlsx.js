import * as XLSX from 'xlsx'
import { makeTable, tableToObjects } from './tableModel.js'

function sheetToTable(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' })
  if (!rows.length) return makeTable([], [])
  const header = rows[0].map((c) => String(c ?? ''))
  return makeTable(header, rows.slice(1))
}

/**
 * @param {File|Blob} file
 * @param {{ sheet?: 'first'|'all' }} [options]
 * @returns {Promise<{ tables: { name: string, table: object }[], single: object|null }>}
 */
export async function parseXlsx(file, { sheet = 'first' } = {}) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  if (!wb.SheetNames.length) return { tables: [], single: makeTable([], []) }

  const tables = wb.SheetNames.map((name) => ({
    name,
    table: sheetToTable(wb.Sheets[name]),
  }))

  if (sheet === 'all') return { tables, single: null }
  return { tables: [tables[0]], single: tables[0].table }
}

export function tableToXlsxBlob(table, sheetName = 'Sheet1') {
  const aoa = [table.header, ...table.rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || 'Sheet1')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function tablesToXlsxBlob(tables) {
  const wb = XLSX.utils.book_new()
  for (const { name, table } of tables) {
    const aoa = [table.header, ...table.rows]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, String(name || 'Sheet').slice(0, 31))
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([out], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function tableToJsonValue(table) {
  return tableToObjects(table)
}
