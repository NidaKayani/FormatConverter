import { parse as parseToml, stringify as stringifyToml } from 'smol-toml'
import { treeToTable, tableToObjects } from './tableModel.js'

export async function parseTomlFile(file) {
  const text = await file.text()
  try {
    return parseToml(text)
  } catch (e) {
    throw new Error(`Invalid TOML: ${e.message}`)
  }
}

export function tomlToTable(data) {
  return treeToTable(data, { label: 'TOML' })
}

export function valueToTomlBlob(value) {
  const text = stringifyToml(value)
  return new Blob([text.endsWith('\n') ? text : text + '\n'], {
    type: 'application/toml;charset=utf-8',
  })
}

export function tableToTomlBlob(table) {
  return valueToTomlBlob(tableToObjects(table))
}
