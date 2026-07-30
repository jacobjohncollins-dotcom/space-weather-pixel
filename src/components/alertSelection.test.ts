import { describe, expect, it } from 'vitest'
import { latestAlert } from './alertSelection.ts'
import type { SpaceWeatherAlert } from '../data/types.ts'

function alert(
  productId: string,
  issueDatetime: string,
  message = 'test alert',
): SpaceWeatherAlert {
  return { productId, issueDatetime, message }
}

describe('latestAlert', () => {
  it('returns null for no alerts', () => {
    expect(latestAlert(null)).toBeNull()
    expect(latestAlert([])).toBeNull()
  })

  it('returns the only alert when there is one', () => {
    const a = alert('1', '2024-05-10 00:05:00.000')
    expect(latestAlert([a])).toEqual(a)
  })

  it('picks the most recently issued alert regardless of array order', () => {
    const older = alert('1', '2024-05-10 00:05:00.000')
    const newer = alert('2', '2024-05-11 12:00:00.000')
    expect(latestAlert([older, newer])).toEqual(newer)
    expect(latestAlert([newer, older])).toEqual(newer)
  })
})
