const STAGE_LABELS = {
  extract: 'Extracting page',
  render: 'Rendering page',
  ocr: 'Recognizing text — page',
  decode: 'Decoding image…',
  encode: 'Encoding output…',
}

export default function ProgressBar({ progress }) {
  const { page = 0, total = 0, stage, fileIndex, fileCount, file } = progress || {}
  const pct = total ? (page / total) * 100 : undefined
  let label =
    total > 0
      ? `${STAGE_LABELS[stage] || 'Processing page'} ${page} of ${total}`
      : STAGE_LABELS[stage] || 'Converting…'
  if (fileCount > 1) {
    label = `File ${fileIndex + 1} of ${fileCount} (${file?.name}) — ${label}`
  }

  return (
    <div className="progress">
      <div className="progress-bar">
        <div
          className={`progress-fill ${pct === undefined ? 'indeterminate' : ''}`}
          style={{ width: pct === undefined ? '40%' : `${pct}%` }}
        />
      </div>
      <p>{label}</p>
    </div>
  )
}
