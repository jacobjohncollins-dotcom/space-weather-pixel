import { describe, expect, it, vi } from 'vitest'
import { createNotificationEngine } from './notifications.ts'
import type { NotificationCtor } from './notifications.ts'

function fakeCtor(permission: NotificationPermission) {
  const instances: { title: string; options?: NotificationOptions }[] = []
  class FakeNotification {
    static permission = permission
    static requestPermission = vi.fn(async () => 'granted' as const)
    constructor(title: string, options?: NotificationOptions) {
      instances.push({ title, options })
    }
  }
  return {
    Ctor: FakeNotification as unknown as NotificationCtor,
    instances,
  }
}

describe('createNotificationEngine', () => {
  it('reports unsupported when there is no Notification global', () => {
    const engine = createNotificationEngine(() => null)
    expect(engine.isSupported()).toBe(false)
    expect(engine.getPermission()).toBe('denied')
  })

  it('reflects the underlying permission state', () => {
    const { Ctor } = fakeCtor('granted')
    const engine = createNotificationEngine(() => Ctor)
    expect(engine.isSupported()).toBe(true)
    expect(engine.getPermission()).toBe('granted')
  })

  it('does not notify when permission is only "default" (not yet granted)', () => {
    const { Ctor, instances } = fakeCtor('default')
    const engine = createNotificationEngine(() => Ctor)
    engine.notifyStormAlert('G3 storm in progress')
    expect(instances).toHaveLength(0)
  })

  it('does not notify when permission was denied', () => {
    const { Ctor, instances } = fakeCtor('denied')
    const engine = createNotificationEngine(() => Ctor)
    engine.notifyStormAlert('G3 storm in progress')
    expect(instances).toHaveLength(0)
  })

  it('fires a notification with the alert headline when permission is granted', () => {
    const { Ctor, instances } = fakeCtor('granted')
    const engine = createNotificationEngine(() => Ctor)
    engine.notifyStormAlert('G3 storm in progress')
    expect(instances).toHaveLength(1)
    expect(instances[0].options?.body).toBe('G3 storm in progress')
  })

  it('delegates requestPermission to the underlying constructor', async () => {
    const { Ctor } = fakeCtor('default')
    const engine = createNotificationEngine(() => Ctor)
    const result = await engine.requestPermission()
    expect(result).toBe('granted')
    expect(Ctor.requestPermission).toHaveBeenCalledTimes(1)
  })
})
