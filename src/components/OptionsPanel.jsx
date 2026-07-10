export default function OptionsPanel({ schema, values, onChange }) {
  if (!schema?.length) return null

  const set = (key, value) => onChange({ ...values, [key]: value })

  return (
    <div className="options">
      {schema.map((opt) => (
        <label key={opt.key} className="option" title={opt.help}>
          <span className="option-label">{opt.label}</span>
          {opt.type === 'select' && (
            <select
              value={String(values[opt.key])}
              onChange={(e) => {
                const raw = e.target.value
                const choice = opt.choices.find((c) => String(c.value) === raw)
                set(opt.key, choice ? choice.value : raw)
              }}
            >
              {opt.choices.map((c) => (
                <option key={String(c.value)} value={String(c.value)}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
          {opt.type === 'range' && (
            <span className="option-range">
              <input
                type="range"
                min={opt.min}
                max={opt.max}
                step={opt.step}
                value={values[opt.key]}
                onChange={(e) => set(opt.key, Number(e.target.value))}
              />
              <span className="meta">{Math.round(values[opt.key] * 100)}%</span>
            </span>
          )}
          {opt.type === 'number' && (
            <input
              type="number"
              min={opt.min}
              max={opt.max}
              placeholder="original"
              value={values[opt.key] ?? ''}
              onChange={(e) => set(opt.key, e.target.value ? Number(e.target.value) : null)}
            />
          )}
          {opt.type === 'color' && (
            <input
              type="color"
              value={values[opt.key]}
              onChange={(e) => set(opt.key, e.target.value)}
            />
          )}
          {opt.type === 'multiselect' && (
            <span className="option-checks">
              {opt.choices.map((c) => (
                <label key={String(c.value)} className="check">
                  <input
                    type="checkbox"
                    checked={(values[opt.key] || []).includes(c.value)}
                    onChange={(e) => {
                      const current = values[opt.key] || []
                      set(
                        opt.key,
                        e.target.checked
                          ? [...current, c.value]
                          : current.filter((v) => v !== c.value)
                      )
                    }}
                  />
                  {c.label}
                </label>
              ))}
            </span>
          )}
        </label>
      ))}
    </div>
  )
}
