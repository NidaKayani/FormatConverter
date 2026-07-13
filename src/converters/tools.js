/**
 * Parallel registry for multi-input tools (many→one and same-format ops).
 * Kept separate from pair conversions so convert() stays frozen.
 */

export const TOOLS = {}

/**
 * @param {string} id
 * @param {{
 *   inputs: { formats: string[], min?: number, max?: number, ordered?: boolean },
 *   output: string,
 *   load: () => Promise<{ default: Function }>,
 *   options?: object[],
 *   label: string,
 *   description: string,
 * }} def
 */
export function registerTool(id, def) {
  TOOLS[id] = { id, options: [], ...def }
}

export function getTool(id) {
  return TOOLS[id] || null
}

export function listTools() {
  return Object.values(TOOLS).map(({ id, label, description, inputs, output, options }) => ({
    id,
    label,
    description,
    inputs,
    output,
    options,
  }))
}

const OPT_PAGE_SIZE = {
  key: 'pageSize', label: 'Page size', type: 'select', default: 'a4',
  choices: [{ value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }],
  help: 'Paper size of each page in the generated PDF.',
}
const OPT_ANGLE = {
  key: 'angle', label: 'Rotation', type: 'select', default: 90,
  choices: [
    { value: 90, label: '90° clockwise' },
    { value: 180, label: '180°' },
    { value: 270, label: '270° clockwise' },
  ],
  help: 'How far to rotate every page.',
}
const OPT_PAGES = {
  key: 'pages', label: 'Pages', type: 'text', default: '1',
  placeholder: '1-3,7,9-',
  help: '1-based page ranges, e.g. 1-3,7,9-.',
}
const OPT_RANGES = {
  key: 'ranges', label: 'Split ranges', type: 'text', default: '',
  placeholder: '1-2;3;4-  (blank = one file per page)',
  help: 'Semicolon-separated ranges; each range becomes one PDF in the zip. Leave blank to split every page.',
}
const OPT_COMPRESS_MODE = {
  key: 'mode', label: 'Mode', type: 'select', default: 'lossless',
  choices: [
    { value: 'lossless', label: 'Lossless (re-save)' },
    { value: 'smaller', label: 'Smaller (lossy rasterize)' },
  ],
  help: 'Lossless rewrites the PDF structure. Smaller rasterizes pages to JPEG (quality loss).',
}

registerTool('merge-pdf', {
  label: 'Merge PDFs',
  description: 'Combine multiple PDFs into one document, in queue order.',
  inputs: { formats: ['pdf'], min: 2, max: 50, ordered: true },
  output: 'pdf',
  load: () => import('./pdf/mergePdf.js'),
})

registerTool('split-pdf', {
  label: 'Split PDF',
  description: 'Split a PDF into separate files (zip) by page or custom ranges.',
  inputs: { formats: ['pdf'], min: 1, max: 1, ordered: false },
  output: 'zip',
  options: [OPT_RANGES],
  load: () => import('./pdf/splitPdf.js'),
})

registerTool('rotate-pdf', {
  label: 'Rotate PDF',
  description: 'Rotate every page of a PDF by 90°, 180°, or 270°.',
  inputs: { formats: ['pdf'], min: 1, max: 1, ordered: false },
  output: 'pdf',
  options: [OPT_ANGLE],
  load: () => import('./pdf/rotatePdf.js'),
})

registerTool('extract-pages', {
  label: 'Extract PDF pages',
  description: 'Build a new PDF from selected page ranges.',
  inputs: { formats: ['pdf'], min: 1, max: 1, ordered: false },
  output: 'pdf',
  options: [OPT_PAGES],
  load: () => import('./pdf/extractPages.js'),
})

registerTool('compress-pdf', {
  label: 'Compress PDF',
  description: 'Shrink a PDF — lossless re-save, or lossy rasterize for smaller files.',
  inputs: { formats: ['pdf'], min: 1, max: 1, ordered: false },
  output: 'pdf',
  options: [OPT_COMPRESS_MODE],
  load: () => import('./pdf/compressPdf.js'),
})

registerTool('images-to-pdf', {
  label: 'Images to PDF',
  description: 'Combine multiple images into one multi-page PDF.',
  inputs: {
    formats: ['png', 'jpg', 'webp', 'bmp', 'gif', 'svg', 'heic', 'ico', 'tiff', 'avif'],
    min: 1,
    max: 100,
    ordered: true,
  },
  output: 'pdf',
  options: [OPT_PAGE_SIZE],
  load: () => import('./pdf/imagesToPdf.js'),
})

registerTool('images-to-gif', {
  label: 'Images to GIF',
  description: 'Combine images into an animated GIF (frame delay configurable).',
  inputs: {
    formats: ['png', 'jpg', 'webp', 'bmp', 'gif', 'svg', 'heic', 'ico', 'tiff', 'avif'],
    min: 1,
    max: 100,
    ordered: true,
  },
  output: 'gif',
  options: [
    {
      key: 'delay',
      label: 'Frame delay (ms)',
      type: 'number',
      default: 100,
      min: 20,
      max: 5000,
      help: 'Delay between frames in milliseconds.',
    },
  ],
  load: () => import('./images/gifEncode.js'),
})

registerTool('watermark-pdf', {
  label: 'Watermark PDF',
  description: 'Stamp text across every page with adjustable opacity and position.',
  inputs: { formats: ['pdf'], min: 1, max: 1, ordered: false },
  output: 'pdf',
  options: [
    { key: 'text', label: 'Watermark text', type: 'text', default: 'CONFIDENTIAL', help: 'Text drawn on each page.' },
    {
      key: 'opacity',
      label: 'Opacity',
      type: 'range',
      default: 0.25,
      min: 0.05,
      max: 1,
      step: 0.05,
      help: 'How strong the watermark appears.',
    },
    {
      key: 'position',
      label: 'Position',
      type: 'select',
      default: 'center',
      choices: [
        { value: 'center', label: 'Center (diagonal)' },
        { value: 'top-left', label: 'Top left' },
        { value: 'top-right', label: 'Top right' },
        { value: 'bottom-left', label: 'Bottom left' },
        { value: 'bottom-right', label: 'Bottom right' },
      ],
    },
  ],
  load: () => import('./pdf/watermarkPdf.js'),
})

registerTool('reorder-pdf', {
  label: 'Reorder PDF pages',
  description: 'Permute pages (e.g. 3,1,2) or reverse the whole document.',
  inputs: { formats: ['pdf'], min: 1, max: 1, ordered: false },
  output: 'pdf',
  options: [
    {
      key: 'order',
      label: 'New order',
      type: 'text',
      default: 'reverse',
      placeholder: 'reverse or 3,1,2',
      help: 'Use “reverse”, or a comma-separated list of 1-based page numbers.',
    },
  ],
  load: () => import('./pdf/reorderPdf.js'),
})

registerTool('page-numbers-pdf', {
  label: 'Page numbers',
  description: 'Stamp page numbers in the footer of every page.',
  inputs: { formats: ['pdf'], min: 1, max: 1, ordered: false },
  output: 'pdf',
  options: [
    {
      key: 'template',
      label: 'Template',
      type: 'text',
      default: '{n}',
      help: 'Use {n} for the page number and {total} for the page count.',
    },
    {
      key: 'startAt',
      label: 'Start at',
      type: 'number',
      default: 1,
      min: 1,
      help: 'Number for the first page.',
    },
  ],
  load: () => import('./pdf/pageNumbersPdf.js'),
})
