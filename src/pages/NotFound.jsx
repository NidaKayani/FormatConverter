import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <header className="header">
      <h1>404</h1>
      <p>That page (or conversion) doesn&apos;t exist.</p>
      <p>
        <Link to="/">Browse all converters →</Link>
      </p>
    </header>
  )
}
