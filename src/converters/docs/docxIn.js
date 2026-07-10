/** DOCX → HTML body via mammoth; every docx→* conversion starts here. */
export async function docxToHtmlBody(file) {
  const mammoth = (await import('mammoth')).default
  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.convertToHtml({ arrayBuffer })
  if (!value?.trim()) throw new Error('This Word document appears to be empty.')
  return value
}
