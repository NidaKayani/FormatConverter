import { useEffect } from 'react'
import { ORIGIN, ogImageUrl } from '../seo/copy.js'

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
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

function removeRobots() {
  const el = document.head.querySelector('meta[name="robots"]')
  if (el) el.remove()
}

/**
 * Per-route title / description / Open Graph / Twitter / JSON-LD.
 * Prerender shells supply the same tags for first paint / crawlers.
 */
export default function Seo({
  title,
  description,
  path,
  breadcrumbs,
  jsonLd,
  image,
  noindex = false,
  faq,
}) {
  useEffect(() => {
    const fullTitle = title.includes('FormatConvert') ? title : `${title} | FormatConvert`
    const canonicalPath = path || (typeof window !== 'undefined' ? window.location.pathname : '/')
    const canonical = `${ORIGIN}${canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`}`
    const ogImage = image || ogImageUrl(canonicalPath)

    document.title = fullTitle
    if (description) {
      upsertMeta('name', 'description', description)
    }

    upsertLink('canonical', canonical)

    if (noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow')
    } else {
      removeRobots()
    }

    upsertMeta('property', 'og:title', fullTitle)
    if (description) upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:site_name', 'FormatConvert')

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    if (description) upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)

    const graph = []
    if (jsonLd) {
      if (Array.isArray(jsonLd)) graph.push(...jsonLd)
      else graph.push(jsonLd)
    } else {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'FormatConvert',
        url: ORIGIN,
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
    if (faq?.length) {
      graph.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      })
    }
    upsertJsonLd('fc-jsonld', graph.length === 1 ? graph[0] : graph)
  }, [title, description, path, breadcrumbs, jsonLd, image, noindex, faq])

  return null
}
