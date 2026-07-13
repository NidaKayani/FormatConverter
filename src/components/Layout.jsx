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
            alt="Quantumlogics logo"
            className="nav-logo"
          />
          <span>FormatConvert</span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end>
            Converters
          </NavLink>
          <NavLink to="/developers">Developer API</NavLink>
          <button
            type="button"
            className="theme-toggle"
            onClick={onToggle}
            aria-label="Toggle color theme"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </nav>

      <Outlet />
      <InstallPrompt />

      <footer className="footer">
        <p>
          FormatConvert by Quantum Logics — every conversion runs locally in your browser. Files
          never leave your machine.
        </p>
        <p>
          <Link to="/developers">Use FormatConvert in your own app →</Link>
        </p>
      </footer>
    </div>
  )
}
