import { describe, expect, it } from 'vitest'
import { isNight, subsolar, terminatorLat } from './sun.ts'

/*
 * 近似式なので、値そのものではなく「天文の事実と合っているか」で確かめる。
 * 誤差は 0.1 度ほどあるので、比較にはその分の余裕を持たせている。
 */

const TOKYO = { lat: 35.68, lng: 139.65 }

/** 地軸の傾き。夏至・冬至の太陽はこの緯度の真上に来る */
const AXIAL_TILT = 23.44

describe('subsolar', () => {
  it('夏至の太陽は北回帰線の真上に来る', () => {
    const sun = subsolar(new Date('2026-06-21T12:00:00Z'))
    expect(sun.lat).toBeCloseTo(AXIAL_TILT, 1)
  })

  it('冬至の太陽は南回帰線の真上に来る', () => {
    const sun = subsolar(new Date('2026-12-21T12:00:00Z'))
    expect(sun.lat).toBeCloseTo(-AXIAL_TILT, 1)
  })

  it('春分と秋分の太陽は赤道の真上に来る', () => {
    expect(Math.abs(subsolar(new Date('2026-03-20T12:00:00Z')).lat)).toBeLessThan(1)
    expect(Math.abs(subsolar(new Date('2026-09-23T12:00:00Z')).lat)).toBeLessThan(1)
  })

  it('赤緯が地軸の傾きを超えることはない', () => {
    for (let day = 0; day < 365; day += 1) {
      const date = new Date(Date.UTC(2026, 0, 1 + day))
      expect(Math.abs(subsolar(date).lat)).toBeLessThanOrEqual(AXIAL_TILT + 0.1)
    }
  })

  it('正午の UTC には本初子午線のあたりに来る', () => {
    // 均時差があるので、ぴったり 0 度にはならず 4 度ほどずれる
    expect(Math.abs(subsolar(new Date('2026-08-15T12:00:00Z')).lng)).toBeLessThan(5)
  })

  it('6 時間で経度 90 度ぶん西へ動く', () => {
    const noon = subsolar(new Date('2026-08-15T12:00:00Z')).lng
    const evening = subsolar(new Date('2026-08-15T18:00:00Z')).lng
    expect(evening - noon).toBeCloseTo(-90, 0)
  })
})

describe('isNight', () => {
  it('日本時間の正午の東京は昼', () => {
    const sun = subsolar(new Date('2026-08-15T03:00:00Z'))
    expect(isNight(TOKYO.lat, TOKYO.lng, sun)).toBe(false)
  })

  it('日本時間の 0 時の東京は夜', () => {
    const sun = subsolar(new Date('2026-08-15T15:00:00Z'))
    expect(isNight(TOKYO.lat, TOKYO.lng, sun)).toBe(true)
  })

  it('東京が夜のとき、地球の裏側は昼', () => {
    const sun = subsolar(new Date('2026-08-15T15:00:00Z'))
    expect(isNight(-TOKYO.lat, TOKYO.lng - 180, sun)).toBe(false)
  })

  it('夏至の北極圏はどの経度でも昼になる（白夜）', () => {
    const sun = subsolar(new Date('2026-06-21T12:00:00Z'))
    for (let lng = -180; lng < 180; lng += 30) {
      expect(isNight(80, lng, sun)).toBe(false)
    }
  })

  it('夏至の南極圏はどの経度でも夜になる（極夜）', () => {
    const sun = subsolar(new Date('2026-06-21T12:00:00Z'))
    for (let lng = -180; lng < 180; lng += 30) {
      expect(isNight(-80, lng, sun)).toBe(true)
    }
  })

  it('太陽直下点は必ず昼', () => {
    const sun = subsolar(new Date('2026-08-15T07:30:00Z'))
    expect(isNight(sun.lat, sun.lng, sun)).toBe(false)
  })
})

describe('terminatorLat', () => {
  it('太陽の真下の経線では、境界は太陽から 90 度南にある', () => {
    const sun = subsolar(new Date('2026-06-21T12:00:00Z'))
    expect(terminatorLat(sun.lng, sun)).toBeCloseTo(sun.lat - 90, 3)
  })

  it('その裏側の経線では、境界は 90 度北にある', () => {
    const sun = subsolar(new Date('2026-06-21T12:00:00Z'))
    expect(terminatorLat(sun.lng + 180, sun)).toBeCloseTo(90 - sun.lat, 3)
  })

  it('境界の上は昼でも夜でもない', () => {
    const sun = subsolar(new Date('2026-08-15T07:30:00Z'))
    for (let lng = -180; lng < 180; lng += 30) {
      const lat = terminatorLat(lng, sun)
      // 境目の少し北と少し南で、昼夜が入れ替わる
      expect(isNight(lat + 0.5, lng, sun)).not.toBe(isNight(lat - 0.5, lng, sun))
    }
  })

  it('赤緯がほぼ 0 になる春分でも数値が壊れない', () => {
    const sun = subsolar(new Date('2026-03-20T14:46:00Z'))
    for (let lng = -180; lng < 180; lng += 30) {
      expect(Number.isNaN(terminatorLat(lng, sun))).toBe(false)
    }
  })
})
