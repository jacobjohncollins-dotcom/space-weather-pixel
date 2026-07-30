// Opt-in browser push notifications for storm alerts (Chunk 14, resolves the
// "push/browser notifications?" open question in Plan.md §10). Unlike
// sound.ts, permission is a persistent browser-level grant rather than a
// per-session flag — once granted, notifications work without any further
// user gesture, so this just wraps the Notification API directly instead of
// tracking its own enabled/disabled state.

export interface NotificationEngine {
  isSupported(): boolean
  getPermission(): NotificationPermission
  requestPermission(): Promise<NotificationPermission>
  notifyStormAlert(headline: string): void
}

export type NotificationCtor = Pick<
  typeof Notification,
  'permission' | 'requestPermission'
> &
  (new (title: string, options?: NotificationOptions) => Notification)

function defaultNotificationCtor(): NotificationCtor | null {
  if (typeof Notification === 'undefined') return null
  return Notification
}

export function createNotificationEngine(
  getCtor: () => NotificationCtor | null = defaultNotificationCtor,
): NotificationEngine {
  return {
    isSupported: () => getCtor() !== null,
    getPermission: () => getCtor()?.permission ?? 'denied',
    async requestPermission() {
      const Ctor = getCtor()
      if (!Ctor) return 'denied'
      return Ctor.requestPermission()
    },
    notifyStormAlert(headline: string) {
      const Ctor = getCtor()
      if (!Ctor || Ctor.permission !== 'granted') return
      new Ctor('Space Weather Alert', { body: headline })
    },
  }
}

export const notificationEngine = createNotificationEngine()
