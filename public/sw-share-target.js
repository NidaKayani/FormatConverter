/* Share target handler injected into the generated service worker.
 * POST /share-target → stash file in Cache Storage → 303 to /?share-target=1
 */
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'POST' || url.pathname !== '/share-target') return

  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData()
        const file = form.get('file') || form.get('media') || form.get('shared_file')
        if (file && typeof file === 'object' && file.size != null) {
          const cache = await caches.open('share-target')
          await cache.put(
            'shared',
            new Response(file, {
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'X-Filename': file.name || 'shared',
              },
            })
          )
        }
      } catch {
        // best-effort
      }
      return Response.redirect('/?share-target=1', 303)
    })()
  )
})
