import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    __SDK__: false,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg'],
      manifest: {
        name: 'FormatConvert',
        short_name: 'FormatConvert',
        description:
          'Convert PDF, Word, Markdown, HTML, text and images — entirely in your browser.',
        theme_color: '#090a0f',
        background_color: '#090a0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [
              {
                name: 'file',
                accept: ['*/*'],
              },
            ],
          },
        },
      },
      workbox: {
        importScripts: ['sw-share-target.js'],
        globPatterns: ['**/*.{js,css,html,mjs,png,svg,ico}'],
        // OCR / AVIF / ffmpeg assets cache on first use; sdk + convert.worker stay off precache
        globIgnores: ['tesseract/**', 'wasm/**', 'ffmpeg/**', 'sdk.js', 'assets/convert.worker-*.js'],
        maximumFileSizeToCacheInBytes: 2.5 * 1024 * 1024,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/tesseract/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-assets',
              expiration: { maxEntries: 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/ffmpeg/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ffmpeg-assets',
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/@tesseract\.js-data\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ocr-languages',
              expiration: { maxEntries: 10 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-fonts',
              expiration: { maxEntries: 8 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/community\.quantumlogicslimited\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'brand-assets',
              expiration: { maxEntries: 5 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@jsquash/avif', '@ffmpeg/ffmpeg', '@ffmpeg/util'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
})
