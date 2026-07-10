import { Link, NavLink, Outlet } from 'react-router-dom'

export default function Layout() {
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
        </div>
      </nav>

      <Outlet />

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
