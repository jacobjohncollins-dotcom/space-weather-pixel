import { describe, expect, it } from 'vitest'
import { bzTier, flareTier, kpTier, windTier } from './thresholds'

describe('kpTier', () => {
  it('calm below 3', () => {
    expect(kpTier(0)).toBe('calm')
    expect(kpTier(2.67)).toBe('calm')
  })
  it('unsettled 3-4', () => {
    expect(kpTier(3)).toBe('unsettled')
    expect(kpTier(4.33)).toBe('unsettled')
  })
  it('storm 5-6', () => {
    expect(kpTier(5)).toBe('storm')
    expect(kpTier(6.67)).toBe('storm')
  })
  it('severe 7+', () => {
    expect(kpTier(7)).toBe('severe')
    expect(kpTier(9)).toBe('severe')
  })
})

describe('flareTier', () => {
  it('quiet for A/B', () => {
    expect(flareTier('A1.0')).toBe('quiet')
    expect(flareTier('B5.2')).toBe('quiet')
  })
  it('small for C', () => {
    expect(flareTier('C3.1')).toBe('small')
  })
  it('strong for M', () => {
    expect(flareTier('M2.3')).toBe('strong')
  })
  it('extreme for X', () => {
    expect(flareTier('X1.0')).toBe('extreme')
  })
  it('handles lowercase and whitespace', () => {
    expect(flareTier(' x2.5')).toBe('extreme')
  })
})

describe('windTier', () => {
  it('slow below 400', () => {
    expect(windTier(0)).toBe('slow')
    expect(windTier(399)).toBe('slow')
  })
  it('moderate 400-600', () => {
    expect(windTier(400)).toBe('moderate')
    expect(windTier(600)).toBe('moderate')
  })
  it('fast above 600', () => {
    expect(windTier(601)).toBe('fast')
    expect(windTier(900)).toBe('fast')
  })
})

describe('bzTier', () => {
  it('shielded when northward or zero', () => {
    expect(bzTier(0)).toBe('shielded')
    expect(bzTier(5)).toBe('shielded')
  })
  it('ripple for mild southward', () => {
    expect(bzTier(-1)).toBe('ripple')
    expect(bzTier(-9.9)).toBe('ripple')
  })
  it('crack at -10 or below', () => {
    expect(bzTier(-10)).toBe('crack')
    expect(bzTier(-25)).toBe('crack')
  })
})
