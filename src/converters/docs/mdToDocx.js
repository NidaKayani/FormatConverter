import { marked } from 'marked'
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { inlineRuns, unescapeHtml } from './inlineTokens.js'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const HEADINGS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
}
const NUMBERING_REF = 'fc-numbered'

function rgb(color) {
  return color ? color.map((c) => c.toString(16).padStart(2, '0')).join('') : undefined
}

/** Styled runs (from inlineTokens.js) → docx TextRun/ExternalHyperlink children. */
function runsToDocx(runs) {
  const children = []
  for (const run of runs) {
    const pieces = String(run.text ?? '').split('\n')
    pieces.forEach((piece, i) => {
      const textRun = new TextRun({
        text: piece,
        bold: run.bold || undefined,
        italics: run.italic || undefined,
        font: run.mono ? 'Consolas' : undefined,
        color: run.link ? '1A73E8' : rgb(run.color),
        underline: run.link ? {} : undefined,
        break: i > 0 ? 1 : undefined,
      })
      if (run.link) {
        children.push(new ExternalHyperlink({ children: [textRun], link: run.link }))
      } else {
        children.push(textRun)
      }
    })
  }
  return children
}

function codeParagraphs(code) {
  return code.replace(/\n$/, '').split('\n').map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line || ' ', font: 'Consolas', size: 19 })],
        shading: { type: ShadingType.CLEAR, fill: 'F3F4F7' },
        spacing: { after: 0 },
      })
  )
}

function walk(tokens, ctx = { indent: 0, quote: false, listLevel: -1 }) {
  const out = []
  for (const token of tokens) {
    switch (token.type) {
      case 'space':
        break
      case 'heading':
        out.push(new Paragraph({ heading: HEADINGS[token.depth], children: runsToDocx(inlineRuns(token.tokens)) }))
        break
      case 'paragraph':
        out.push(
          new Paragraph({
            children: runsToDocx(inlineRuns(token.tokens, ctx.quote ? { italic: true, color: [90, 96, 110] } : {})),
            indent: ctx.indent ? { left: ctx.indent } : undefined,
            spacing: { after: 160 },
          })
        )
        break
      case 'code':
        out.push(...codeParagraphs(token.text), new Paragraph({ spacing: { after: 120 }, children: [] }))
        break
      case 'blockquote':
        out.push(...walk(token.tokens, { ...ctx, indent: ctx.indent + 360, quote: true }))
        break
      case 'list': {
        const level = Math.min(ctx.listLevel + 1, 8)
        for (const item of token.items) {
          const blocks = item.tokens || []
          let firstDone = false
          for (const block of blocks) {
            if (!firstDone && (block.type === 'text' || block.type === 'paragraph')) {
              const runs = block.tokens?.length ? inlineRuns(block.tokens) : [{ text: unescapeHtml(block.text ?? '') }]
              if (item.task) runs.unshift({ text: item.checked ? '☑ ' : '☐ ' })
              out.push(
                new Paragraph({
                  children: runsToDocx(runs),
                  ...(token.ordered
                    ? { numbering: { reference: NUMBERING_REF, level } }
                    : { bullet: { level } }),
                  spacing: { after: 80 },
                })
              )
              firstDone = true
            } else {
              out.push(...walk([block], { ...ctx, listLevel: level, indent: ctx.indent + 360 }))
            }
          }
        }
        break
      }
      case 'table': {
        const makeRow = (cells, header) =>
          new TableRow({
            tableHeader: header,
            children: cells.map(
              (cell) =>
                new TableCell({
                  shading: header ? { type: ShadingType.CLEAR, fill: 'F0F2F6' } : undefined,
                  children: [
                    new Paragraph({
                      children: runsToDocx(
                        inlineRuns(cell.tokens, header ? { bold: true } : {})
                      ),
                      spacing: { after: 0 },
                    }),
                  ],
                })
            ),
          })
        out.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [makeRow(token.header, true), ...token.rows.map((r) => makeRow(r, false))],
          }),
          new Paragraph({ spacing: { after: 160 }, children: [] })
        )
        break
      }
      case 'hr':
        out.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C8CDD7' } },
            spacing: { after: 240 },
            children: [],
          })
        )
        break
      case 'html': {
        const text = unescapeHtml(token.text.replace(/<[^>]*>/g, '')).trim()
        if (text) out.push(new Paragraph({ children: [new TextRun(text)], spacing: { after: 160 } }))
        break
      }
      case 'text':
        out.push(
          new Paragraph({
            children: runsToDocx(token.tokens?.length ? inlineRuns(token.tokens) : [{ text: unescapeHtml(token.text) }]),
            indent: ctx.indent ? { left: ctx.indent } : undefined,
            spacing: { after: 80 },
          })
        )
        break
      default:
        if (token.text) {
          out.push(new Paragraph({ children: [new TextRun(unescapeHtml(token.text))], spacing: { after: 160 } }))
        }
    }
  }
  return out
}

/** Render a Markdown string to a real .docx Blob. */
export async function markdownToDocx(md, title = 'Converted document') {
  const tokens = marked.lexer(md, { gfm: true })
  const doc = new Document({
    title,
    numbering: {
      config: [
        {
          reference: NUMBERING_REF,
          levels: [0, 1, 2, 3].map((level) => ({
            level,
            format: 'decimal',
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
      },
    },
    sections: [{ children: walk(tokens) }],
  })
  const blob = await Packer.toBlob(doc)
  return new Blob([blob], { type: DOCX_MIME })
}

export default async function mdToDocx(file) {
  const md = await file.text()
  return markdownToDocx(md, file.name?.replace(/\.[^.]+$/, ''))
}
