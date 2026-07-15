import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { getPreferredTheme, initTheme, toggleTheme } from '../lib/theme.js'
import InstallPrompt from './InstallPrompt.jsx'

export default function Layout() {
  const [theme, setTheme] = useState(() => getPreferredTheme())

  useEffect(() => {
    setTheme(initTheme())
  }, [])

  const onToggle = () => setTheme(toggleTheme())

  return (
    <div className="app">
      <nav className="nav">
        <Link to="/" className="nav-brand">
          <img
            src="https://community.quantumlogicslimited.com/logo.png"
            alt=""
            className="nav-logo"
          />
          <span>FormatConvert</span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end>
            Convert
          </NavLink>
          <NavLink to="/developers">Developers</NavLink>
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggle}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </nav>

      <Outlet />
      <InstallPrompt />

      <footer className="footer">
        <p>
          FormatConvert by Quantum Logics — conversions run entirely in your browser. Files never
          leave your machine.
        </p>
        <p>
          <Link to="/developers">Embed the SDK in your app →</Link>
        </p>
      </footer>
    </div>
  )
}
