import { Link, useParams } from 'react-router-dom'
import { getTool } from '../converters/index.js'
import ToolWidget from '../components/ToolWidget.jsx'
import ConverterFaq from '../components/ConverterFaq.jsx'
import Seo from '../components/Seo.jsx'
import NotFound from './NotFound.jsx'
import { ORIGIN, CONVERTER_FAQ } from '../seo/copy.js'

export default function Tool() {
  const { tool: toolId } = useParams()
  const tool = toolId ? getTool(toolId) : null
  if (!tool) return <NotFound />

  const path = `/tools/${toolId}`

  return (
    <>
      <Seo
        title={tool.label}
        description={tool.description}
        path={path}
        breadcrumbs={[
          { name: 'Home', url: `${ORIGIN}/` },
          { name: tool.label, url: `${ORIGIN}${path}` },
        ]}
        faq={CONVERTER_FAQ}
      />
      <header className="header page-header">
        <p className="breadcrumb">
          <Link to="/">All converters</Link> / {tool.label}
        </p>
        <h1>{tool.label}</h1>
        <p>{tool.description}</p>
      </header>
      <ToolWidget key={toolId} toolId={toolId} />
      <ConverterFaq />
    </>
  )
}
