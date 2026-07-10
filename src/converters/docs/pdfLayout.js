import { jsPDF } from 'jspdf'

/**
 * A small typesetting engine on top of jsPDF used by every *→PDF document
 * converter. Handles word wrap of mixed-style runs, headings, lists, code
 * blocks, blockquotes, tables, clickable links, page breaks and page numbers.
 *
 * A "run" is { text, bold, italic, mono, link, color }.
 */

const HEADING_SIZES = { 1: 24, 2: 18, 3: 15, 4: 13, 5: 12, 6: 11 }
const BODY_SIZE = 11
const CODE_SIZE = 9.5
const LINE_GAP = 1.45

export class PdfBuilder {
  constructor({ pageSize = 'a4' } = {}) {
    this.doc = new jsPDF({ unit: 'pt', format: pageSize, compress: true })
    this.pageW = this.doc.internal.pageSize.getWidth()
    this.pageH = this.doc.internal.pageSize.getHeight()
    this.margin = 64
    this.maxW = this.pageW - this.margin * 2
    this.y = this.margin
  }

  applyStyle(run = {}, size = BODY_SIZE) {
    const family = run.mono ? 'courier' : 'helvetica'
    let style = 'normal'
    if (run.bold && run.italic) style = 'bolditalic'
    else if (run.bold) style = 'bold'
    else if (run.italic) style = 'italic'
    this.doc.setFont(family, style)
    this.doc.setFontSize(size)
    if (run.link) this.doc.setTextColor(41, 121, 255)
    else if (run.color) this.doc.setTextColor(...run.color)
    else this.doc.setTextColor(20, 20, 20)
  }

  measure(text, run, size) {
    this.applyStyle(run, size)
    return this.doc.getTextWidth(text)
  }

  ensure(height) {
    if (this.y + height > this.pageH - this.margin) {
      this.doc.addPage()
      this.y = this.margin
    }
  }

  space(pts) {
    // Vertical spacing never carries across a page break
    if (this.y > this.margin) this.y = Math.min(this.y + pts, this.pageH - this.margin)
  }

  /**
   * Wrap styled runs into lines that fit the available width.
   * Returns [[{ text, run, width }]].
   */
  wrapRuns(runs, size, availW) {
    const words = []
    for (const run of runs) {
      const pieces = String(run.text ?? '').split(/(\n)/)
      for (const piece of pieces) {
        if (piece === '\n') {
          words.push({ hardBreak: true })
          continue
        }
        for (const token of piece.split(/(\s+)/)) {
          if (!token) continue
          words.push({ text: token, run, width: this.measure(token, run, size), space: /^\s+$/.test(token) })
        }
      }
    }

    const lines = []
    let line = []
    let lineW = 0
    for (const word of words) {
      if (word.hardBreak) {
        lines.push(line)
        line = []
        lineW = 0
        continue
      }
      if (lineW + word.width > availW && line.length > 0 && !word.space) {
        lines.push(line)
        line = []
        lineW = 0
      }
      if (line.length === 0 && word.space) continue // no leading spaces
      // A single word longer than the line: hard-split by characters
      if (word.width > availW && line.length === 0) {
        let chunk = ''
        for (const ch of word.text) {
          if (this.measure(chunk + ch, word.run, size) > availW && chunk) {
            lines.push([{ text: chunk, run: word.run, width: this.measure(chunk, word.run, size) }])
            chunk = ''
          }
          chunk += ch
        }
        if (chunk) {
          line = [{ text: chunk, run: word.run, width: this.measure(chunk, word.run, size) }]
          lineW = line[0].width
        }
        continue
      }
      line.push(word)
      lineW += word.width
    }
    if (line.length > 0) lines.push(line)
    return lines.length ? lines : [[]]
  }

  /**
   * Write a block of styled runs with word wrap.
   * opts: { size, indent, spacingAfter, bulletText, bulletRun }
   */
  writeRuns(runs, opts = {}) {
    const { size = BODY_SIZE, indent = 0, spacingAfter = 8, bullet = null } = opts
    const lineH = size * LINE_GAP
    const availW = this.maxW - indent
    const lines = this.wrapRuns(runs, size, availW)

    lines.forEach((line, i) => {
      this.ensure(lineH)
      const baseline = this.y + size
      if (i === 0 && bullet) {
        this.applyStyle(bullet.run || {}, size)
        this.doc.text(bullet.text, this.margin + indent - bullet.offset, baseline)
      }
      let x = this.margin + indent
      for (const word of line) {
        if (!word.text) continue
        this.applyStyle(word.run, size)
        this.doc.text(word.text, x, baseline)
        if (word.run?.link && word.text.trim()) {
          this.doc.link(x, baseline - size, word.width, size * 1.2, { url: word.run.link })
        }
        x += word.width
      }
      this.y += lineH
    })
    this.space(spacingAfter)
  }

  writeHeading(runs, level) {
    const size = HEADING_SIZES[level] || BODY_SIZE
    this.space(level <= 2 ? 14 : 10)
    const styled = runs.map((r) => ({ ...r, bold: true }))
    this.writeRuns(styled, { size, spacingAfter: level === 1 ? 6 : 4 })
    if (level === 1 || level === 2) {
      this.ensure(8)
      this.doc.setDrawColor(200, 205, 215)
      this.doc.setLineWidth(0.75)
      this.doc.line(this.margin, this.y, this.margin + this.maxW, this.y)
      this.space(10)
    } else {
      this.space(4)
    }
  }

  writeCodeBlock(code, { indent = 0 } = {}) {
    const lineH = CODE_SIZE * 1.5
    const pad = 8
    const lines = code.replace(/\n$/, '').split('\n').flatMap((raw) => {
      this.applyStyle({ mono: true }, CODE_SIZE)
      const wrapped = this.doc.splitTextToSize(raw || ' ', this.maxW - indent - pad * 2)
      return wrapped.length ? wrapped : [' ']
    })

    for (const line of lines) {
      this.ensure(lineH + pad)
      this.doc.setFillColor(243, 244, 247)
      this.doc.rect(this.margin + indent, this.y, this.maxW - indent, lineH, 'F')
      this.applyStyle({ mono: true, color: [45, 50, 60] }, CODE_SIZE)
      this.doc.text(line, this.margin + indent + pad, this.y + CODE_SIZE + (lineH - CODE_SIZE * 1.2) / 2)
      this.y += lineH
    }
    this.space(10)
  }

  writeBlockquote(renderContents) {
    const startY = this.y
    const startPage = this.doc.getCurrentPageInfo().pageNumber
    renderContents()
    const endPage = this.doc.getCurrentPageInfo().pageNumber
    this.doc.setDrawColor(160, 170, 190)
    this.doc.setLineWidth(2.5)
    if (endPage === startPage) {
      this.doc.line(this.margin + 2, startY, this.margin + 2, this.y - 6)
    } else {
      // Quote crossed pages: draw the rule on each affected page
      for (let p = startPage; p <= endPage; p++) {
        this.doc.setPage(p)
        const from = p === startPage ? startY : this.margin
        const to = p === endPage ? this.y - 6 : this.pageH - this.margin
        this.doc.line(this.margin + 2, from, this.margin + 2, to)
      }
      this.doc.setPage(endPage)
    }
  }

  writeTable(header, rows) {
    const size = 9.5
    const pad = 6
    const lineH = size * 1.4
    const all = header ? [header, ...rows] : rows
    if (!all.length) return
    const cols = Math.max(...all.map((r) => r.length))

    // Natural column widths from content, scaled to fit the page
    const natural = new Array(cols).fill(20)
    for (const row of all) {
      row.forEach((cell, c) => {
        const w = this.measure(String(cell), { bold: row === header }, size) + pad * 2
        natural[c] = Math.max(natural[c], Math.min(w, this.maxW * 0.6))
      })
    }
    const totalNatural = natural.reduce((a, b) => a + b, 0)
    const scale = totalNatural > this.maxW ? this.maxW / totalNatural : 1
    const widths = natural.map((w) => w * scale)

    const drawRow = (row, isHeader) => {
      const style = { bold: isHeader }
      this.applyStyle(style, size)
      const cellLines = row.map((cell, c) =>
        this.doc.splitTextToSize(String(cell ?? ''), widths[c] - pad * 2)
      )
      const rowH = Math.max(1, ...cellLines.map((l) => l.length)) * lineH + pad * 2
      this.ensure(rowH)
      let x = this.margin
      this.doc.setDrawColor(205, 210, 220)
      this.doc.setLineWidth(0.5)
      for (let c = 0; c < cols; c++) {
        if (isHeader) {
          this.doc.setFillColor(238, 240, 245)
          this.doc.rect(x, this.y, widths[c], rowH, 'FD')
        } else {
          this.doc.rect(x, this.y, widths[c], rowH, 'S')
        }
        this.applyStyle(style, size)
        const linesForCell = cellLines[c] || []
        linesForCell.forEach((line, i) => {
          this.doc.text(line, x + pad, this.y + pad + size + i * lineH - (lineH - size))
        })
        x += widths[c]
      }
      this.y += rowH
    }

    if (header) drawRow(header, true)
    for (const row of rows) drawRow(row, false)
    this.space(12)
  }

  writeHr() {
    this.space(6)
    this.ensure(10)
    this.doc.setDrawColor(200, 205, 215)
    this.doc.setLineWidth(1)
    this.doc.line(this.margin, this.y, this.margin + this.maxW, this.y)
    this.space(14)
  }

  finish() {
    const total = this.doc.getNumberOfPages()
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setFontSize(9)
      this.doc.setTextColor(150, 155, 165)
      this.doc.text(`${p} / ${total}`, this.pageW / 2, this.pageH - 28, { align: 'center' })
    }
    return this.doc.output('blob')
  }
}
