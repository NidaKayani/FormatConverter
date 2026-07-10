/** Wrap converted body HTML in a clean standalone document. */
export function htmlDocument(bodyHtml, title = 'Converted document') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { max-width: 760px; margin: 40px auto; padding: 0 20px; color: #1c1e26;
         font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  h1, h2 { border-bottom: 1px solid #e2e5ea; padding-bottom: .3em; }
  pre { background: #f4f5f8; border: 1px solid #e2e5ea; border-radius: 8px; padding: 14px 16px; overflow-x: auto; }
  code { font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; font-size: .9em; }
  :not(pre) > code { background: #f4f5f8; border-radius: 4px; padding: 1px 5px; }
  blockquote { border-left: 4px solid #c9cfdb; margin-left: 0; padding-left: 16px; color: #5a6070; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #d5dae2; padding: 6px 12px; text-align: left; }
  th { background: #f0f2f6; }
  img { max-width: 100%; }
  a { color: #1a73e8; }
  hr { border: none; border-top: 1px solid #e2e5ea; margin: 2em 0; }
</style>
</head>
<body>
${bodyHtml}
</body>
</html>
`
}

export function escapeHtml(text = '') {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
