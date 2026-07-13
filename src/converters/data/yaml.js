import { parse as parseYaml, stringify as stringifyYaml } from 'yaml'
import { treeToTable, tableToObjects } from './tableModel.js'

export async function parseYamlFile(file) {
  const text = await file.text()
  try {
    return parseYaml(text)
  } catch (e) {
    throw new Error(`Invalid YAML: ${e.message}`)
  }
}

export function yamlToTable(data) {
  return treeToTable(data, { label: 'YAML' })
}

export function valueToYamlBlob(value) {
  const text = stringifyYaml(value, { lineWidth: 0 })
  return new Blob([text.endsWith('\n') ? text : text + '\n'], {
    type: 'application/yaml;charset=utf-8',
  })
}

export function tableToYamlBlob(table) {
  return valueToYamlBlob(tableToObjects(table))
}
