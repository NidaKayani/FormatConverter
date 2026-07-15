import { Link } from 'react-router-dom'
import Seo from '../components/Seo.jsx'

export default function NotFound() {
  return (
    <>
      <Seo
        title="Page not found"
        description="That page or conversion does not exist on FormatConvert."
        path="/404"
        noindex
      />
      <header className="header">
        <h1>404</h1>
        <p>That page (or conversion) doesn&apos;t exist.</p>
        <p>
          <Link to="/">Browse all converters →</Link>
        </p>
      </header>
    </>
  )
}
