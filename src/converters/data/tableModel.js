/**
 * Tabular intermediate representation used by all data converters.
 * { header: string[], rows: string[][] }
 */

export function makeTable(header = [], rows = []) {
  return {
    header: header.map((h) => String(h ?? '')),
    rows: rows.map((row) => header.map((_, i) => stringifyCell(row[i]))),
  }
}

function stringifyCell(v) {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/**
 * Convert a JSON/YAML/XML tree into a table when the shape is tabular.
 * Accepts:
 *   - array of plain objects (union of keys → header)
 *   - array of arrays (first row optional header if all strings and option says so)
 *   - { header, rows } already
 * Throws with an actionable message otherwise.
 */
export function treeToTable(data, { label = 'data' } = {}) {
  if (data && typeof data === 'object' && Array.isArray(data.header) && Array.isArray(data.rows)) {
    return makeTable(data.header, data.rows)
  }

  if (!Array.isArray(data)) {
    throw new Error(
      `Cannot convert this ${label} to a table — expected an array of objects (or array of arrays). ` +
        `Nested/scalar ${label} has no tabular shape. Try converting to YAML or JSON instead.`
    )
  }

  if (data.length === 0) return makeTable([], [])

  if (Array.isArray(data[0])) {
    const header = data[0].map((c, i) => String(c ?? `col${i + 1}`))
    const rows = data.slice(1)
    return makeTable(header, rows)
  }

  if (data.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    const keys = []
    const seen = new Set()
    for (const row of data) {
      for (const k of Object.keys(row)) {
        if (!seen.has(k)) {
          seen.add(k)
          keys.push(k)
        }
      }
    }
    const rows = data.map((row) => keys.map((k) => row[k]))
    return makeTable(keys, rows)
  }

  throw new Error(
    `Cannot convert this ${label} to a table — array items must be objects with fields, or arrays of cells.`
  )
}

/** Table → array of objects (for JSON/YAML). */
export function tableToObjects(table) {
  const { header, rows } = table
  return rows.map((row) => {
    const obj = {}
    header.forEach((h, i) => {
      obj[h || `col${i + 1}`] = coerceScalar(row[i])
    })
    return obj
  })
}

/** Best-effort: numbers and booleans from string cells when round-tripping. */
export function coerceScalar(v) {
  if (v == null) return ''
  if (typeof v !== 'string') return v
  const t = v.trim()
  if (t === '') return ''
  if (t === 'true') return true
  if (t === 'false') return false
  if (t === 'null') return null
  if (/^-?\d+$/.test(t)) {
    const n = Number(t)
    if (Number.isSafeInteger(n)) return n
  }
  if (/^-?\d+\.\d+$/.test(t)) {
    const n = Number(t)
    if (!Number.isNaN(n)) return n
  }
  return v
}

/** Preserve typed values when serializing objects → table cells. */
export function valueToCell(v) {
  if (v == null) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function objectsToTable(objects) {
  return treeToTable(objects)
}
