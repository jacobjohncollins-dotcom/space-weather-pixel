// Opt-in storm alert push notifications (Chunk 14). Renders nothing if the
// browser has no Notification API. Once granted, permission is a persistent
// browser-level state — there's no programmatic way to revoke it from the
// page, so a "denied"/"granted" state just reflects what the browser already
// decided rather than something this button can toggle back off.

import { useState } from 'react'
import { notificationEngine } from '../scene/notifications.ts'

export function NotificationToggle({ className = '' }: { className?: string }) {
  const [permission, setPermission] = useState<NotificationPermission>(
    notificationEngine.getPermission(),
  )

  if (!notificationEngine.isSupported()) return null

  async function handleClick() {
    if (permission !== 'default') return
    setPermission(await notificationEngine.requestPermission())
  }

  const label =
    permission === 'granted'
      ? '🔔 alerts on'
      : permission === 'denied'
        ? '🔕 alerts blocked'
        : '🔕 enable alerts'

  const ariaLabel =
    permission === 'granted'
      ? 'Storm alert notifications are enabled'
      : permission === 'denied'
        ? 'Storm alert notifications are blocked in your browser settings'
        : 'Enable storm alert notifications'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={permission !== 'default'}
      aria-label={ariaLabel}
      className={`border-2 border-slate-700 bg-slate-900/90 px-2 py-1 font-mono text-xs text-slate-300 hover:text-cyan-300 disabled:opacity-60 disabled:hover:text-slate-300 ${className}`}
    >
      {label}
    </button>
  )
}
