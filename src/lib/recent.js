const KEY = 'fc-recent'
const MAX = 12

export function pushRecent(from, to) {
  try {
    const list = loadRecent().filter((e) => !(e.from === from && e.to === to))
    list.unshift({ from, to, at: Date.now() })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    // ignore
  }
}

export function loadRecent() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((e) => e && typeof e.from === 'string' && typeof e.to === 'string')
  } catch {
    return []
  }
}
