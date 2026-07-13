import { useEffect, useState } from 'react'

const SNOOZE_KEY = 'fc-install-snooze'
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

function isSnoozed() {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    return until > Date.now()
  } catch {
    return false
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onBip = (e) => {
      e.preventDefault()
      setDeferred(e)
      if (!isSnoozed()) setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  if (!visible || !deferred) return null

  const install = async () => {
    deferred.prompt()
    await deferred.userChoice
    setVisible(false)
    setDeferred(null)
  }

  const snooze = () => {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    } catch {
      // ignore
    }
    setVisible(false)
  }

  return (
    <div className="install-chip" role="status">
      <span>Install FormatConvert for offline use</span>
      <button className="btn btn-primary" type="button" onClick={install}>
        Install
      </button>
      <button className="btn-link" type="button" onClick={snooze}>
        Not now
      </button>
    </div>
  )
}
