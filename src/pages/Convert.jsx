import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FORMATS, getConversion } from '../converters/index.js'
import { takePendingFile } from '../lib/pendingFile.js'
import ConverterWidget from '../components/ConverterWidget.jsx'
import ConverterFaq from '../components/ConverterFaq.jsx'
import Seo from '../components/Seo.jsx'
import NotFound from './NotFound.jsx'
import { ORIGIN, CONVERTER_FAQ, describePair } from '../seo/copy.js'

export default function Convert() {
  const { pair } = useParams()
  const match = /^([a-z0-9]+)-to-([a-z0-9]+)$/.exec(pair || '')
  const from = match?.[1]
  const to = match?.[2]
  const entry = from && to ? getConversion(from, to) : null

  const initialFile = useMemo(() => takePendingFile(), [])

  if (!entry) return <NotFound />

  const title = `${FORMATS[from].label} to ${FORMATS[to].label}`
  const description = describePair(from, to, FORMATS)
  const path = `/convert/${from}-to-${to}`

  return (
    <>
      <Seo
        title={`${title} Converter`}
        description={description}
        path={path}
        breadcrumbs={[
          { name: 'Home', url: `${ORIGIN}/` },
          { name: title, url: `${ORIGIN}${path}` },
        ]}
        faq={CONVERTER_FAQ}
      />
      <header className="header page-header">
        <p className="breadcrumb">
          <Link to="/">All converters</Link> / {title}
        </p>
        <h1>{title} Converter</h1>
        <p>{description}</p>
        {FORMATS[from].kind === 'image' && to === 'pdf' && (
          <p className="meta">
            <Link to="/tools/images-to-pdf">Combine into one PDF instead →</Link>
          </p>
        )}
      </header>
      <ConverterWidget key={pair} from={from} to={to} initialFile={initialFile} />
      <ConverterFaq />
    </>
  )
}
