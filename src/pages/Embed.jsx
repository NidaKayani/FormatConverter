import { useSearchParams } from 'react-router-dom'
import { FORMATS, getConversion } from '../converters/index.js'
import ConverterWidget from '../components/ConverterWidget.jsx'

/**
 * Chrome-less converter for embedding in an <iframe>. Configure with query
 * params: /embed?from=pdf&to=txt. On completion the result is posted to the
 * parent window as { type: 'formatconvert:result', filename, blob }.
 */
export default function Embed() {
  const [params] = useSearchParams()
  const from = params.get('from') || 'pdf'
  const to = params.get('to') || 'txt'
  const entry = getConversion(from, to)

  if (!entry) {
    return (
      <div className="embed">
        <p className="error">
          Unsupported conversion “{from} → {to}”. See /developers for the supported matrix.
        </p>
      </div>
    )
  }

  const handleResult = (result) => {
    window.parent?.postMessage(
      {
        type: 'formatconvert:result',
        from: result.from,
        to: result.to,
        filename: result.filename,
        blob: result.blob,
      },
      '*'
    )
  }

  return (
    <div className="embed">
      <p className="embed-title">
        {FORMATS[from].label} → {FORMATS[to].label}
      </p>
      <ConverterWidget key={`${from}-${to}`} from={from} to={to} onResult={handleResult} />
      <p className="embed-credit">
        Powered by{' '}
        <a href="https://formatconvert.quantumlogicslimited.com" target="_blank" rel="noreferrer">
          FormatConvert
        </a>
      </p>
    </div>
  )
}
