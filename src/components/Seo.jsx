import { useEffect } from 'react'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.type = 'application/ld+json'
    el.id = id
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

/**
 * Per-route title / description / JSON-LD. Client-rendered (prerender = v4.1).
 */
export default function Seo({ title, description, breadcrumbs, jsonLd }) {
  useEffect(() => {
    const fullTitle = title.includes('FormatConvert') ? title : `${title} | FormatConvert`
    document.title = fullTitle
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:title', fullTitle)
      upsertMeta('property', 'og:description', description)
    }

    const graph = []
    if (jsonLd) graph.push(jsonLd)
    else {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FormatConvert',
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description:
          description ||
          'Convert files entirely in your browser — nothing is uploaded.',
      })
    }
    if (breadcrumbs?.length) {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.url,
        })),
      })
    }
    upsertJsonLd('fc-jsonld', graph.length === 1 ? graph[0] : graph)
  }, [title, description, breadcrumbs, jsonLd])

  return null
}
