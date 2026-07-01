# PDF to Text

A React app that extracts text from PDF files entirely in the browser. No server, no upload — pdf.js does the parsing on your machine.

## What it does

- Drag-and-drop or click to select a PDF
- Reconstructs text line by line using the PDF's actual character positions, so paragraphs and tables stay readable instead of running together
- Shows word and character counts
- Copy to clipboard or download as a `.txt` file
- Handles multi-page PDFs, with a `--- Page Break ---` marker between pages

## Setup

You need Node.js 18 or later.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

The build output lands in `dist/`. Deploy it anywhere that serves static files (Vercel, Netlify, GitHub Pages, S3).

## How the extraction works

PDF.js gives you each text fragment with its x/y coordinates on the page. Raw concatenation of those fragments scrambles multi-column layouts and tables. `reconstructPageText` in `src/App.jsx` groups fragments into lines by y-coordinate, sorts each line left to right by x-coordinate, and inserts spaces where there's an actual gap between fragments. That keeps columns and spacing closer to what you'd see in the original PDF.

Scanned PDFs (images of text, no embedded text layer) won't extract anything — this is text extraction, not OCR. If you need that, swap in `tesseract.js` for the empty-result case.

## Project structure

```
pdf-to-text/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx     # extraction logic + UI
    └── App.css
```
