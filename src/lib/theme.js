const STORAGE_KEY = 'fc-theme'

export function getPreferredTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // ignore
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

export function applyTheme(theme) {
  const value = theme === 'light' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', value)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', value === 'light' ? '#f2f4f3' : '#101512')
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // ignore
  }
  return value
}

export function toggleTheme() {
  const next = getPreferredTheme() === 'light' ? 'dark' : 'light'
  return applyTheme(next)
}

export function initTheme() {
  return applyTheme(getPreferredTheme())
}
