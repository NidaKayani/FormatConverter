import { defineConfig } from 'vite'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Builds the standalone developer SDK: a single self-contained ES module at
// dist/sdk.js (all converters inlined), plus the pdf.js worker beside it so
// PDF conversions work when the SDK is imported cross-origin.
export default defineConfig({
  define: {
    __SDK__: true,
  },
  plugins: [
    {
      name: 'copy-pdf-worker',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
          resolve(__dirname, 'dist/pdf.worker.min.mjs'),
        )
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    target: 'esnext',
    rollupOptions: {
      input: resolve(__dirname, 'src/sdk/entry.js'),
      preserveEntrySignatures: 'strict',
      output: {
        format: 'es',
        entryFileNames: 'sdk.js',
        codeSplitting: false,
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
