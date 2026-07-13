import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './App.css'
import * as converters from './converters/index.js'
import { initTheme } from './lib/theme.js'

initTheme()

// App-bundled API (worker-enabled). Distinct from window.FormatConvert (/sdk.js).
window.__FormatConvertApp = converters

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)
