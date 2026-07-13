import { Link, useParams } from 'react-router-dom'
import { getTool } from '../converters/index.js'
import ToolWidget from '../components/ToolWidget.jsx'
import Seo from '../components/Seo.jsx'
import NotFound from './NotFound.jsx'

const ORIGIN = 'https://formatconvert.quantumlogicslimited.com'

export default function Tool() {
  const { tool: toolId } = useParams()
  const tool = toolId ? getTool(toolId) : null
  if (!tool) return <NotFound />

  return (
    <>
      <Seo
        title={tool.label}
        description={tool.description}
        breadcrumbs={[
          { name: 'Home', url: `${ORIGIN}/` },
          { name: tool.label, url: `${ORIGIN}/tools/${toolId}` },
        ]}
      />
      <header className="header">
        <p className="breadcrumb">
          <Link to="/">All converters</Link> / {tool.label}
        </p>
        <h1>{tool.label}</h1>
        <p>{tool.description}</p>
      </header>
      <ToolWidget key={toolId} toolId={toolId} />
    </>
  )
}
