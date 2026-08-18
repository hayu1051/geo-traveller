import { describe, expect, it } from 'vitest'
import {
  clockMeridian,
  dayShift,
  diffMin,
  formatLocalDate,
  formatLocalTime,
  meridianGap,
  offMin,
  standardMeridian,
  standardOffMin,
  zonedParts,
} from './time.ts'

/*
 * 日付は必ず固定する。「今」を使うと、夏に書いたテストが冬に落ちる。
 * 東京とニューヨークの時差は冬 14 時間・夏 13 時間で、どちらも正しい。
 */
const WINTER = new Date('2026-01-15T00:00:00Z')
const SUMMER = new Date('2026-07-15T00:00:00Z')

const TOKYO = 'Asia/Tokyo'
const NEW_YORK = 'America/New_York'
const LONDON = 'Europe/London'
const MADRID = 'Europe/Madrid'
const DELHI = 'Asia/Kolkata'
const SYDNEY = 'Australia/Sydney'

describe('offMin', () => {
  it('サマータイムのない都市は冬も夏も同じ', () => {
    expect(offMin(TOKYO, WINTER)).toBe(540)
    expect(offMin(TOKYO, SUMMER)).toBe(540)
  })

  it('ニューデリーは 30 分刻みの +5:30', () => {
    expect(offMin(DELHI, WINTER)).toBe(330)
    expect(offMin(DELHI, SUMMER)).toBe(330)
  })

  it('北半球はサマータイムで夏に 1 時間進む', () => {
    expect(offMin(NEW_YORK, WINTER)).toBe(-300)
    expect(offMin(NEW_YORK, SUMMER)).toBe(-240)
    expect(offMin(LONDON, WINTER)).toBe(0)
    expect(offMin(LONDON, SUMMER)).toBe(60)
  })

  it('南半球は逆で、1 月の方が進んでいる', () => {
    expect(offMin(SYDNEY, WINTER)).toBe(660)
    expect(offMin(SYDNEY, SUMMER)).toBe(600)
  })
})

describe('standardOffMin', () => {
  it('サマータイムを除いた本来の値を返す', () => {
    // マドリードは中央ヨーロッパ時間の +1:00。夏に +2:00 になっても変わらない
    expect(standardOffMin(MADRID, WINTER)).toBe(60)
    expect(standardOffMin(MADRID, SUMMER)).toBe(60)
    // シドニーは +10:00。1 月が +11:00 でも引きずられない
    expect(standardOffMin(SYDNEY, WINTER)).toBe(600)
    expect(standardOffMin(SYDNEY, SUMMER)).toBe(600)
  })
})

describe('経線', () => {
  it('標準時の経線はサマータイムで動かない', () => {
    expect(standardMeridian(MADRID, WINTER)).toBe(15)
    expect(standardMeridian(MADRID, SUMMER)).toBe(15)
    expect(standardMeridian(LONDON, SUMMER)).toBe(0)
  })

  it('今の時計が合っている経線はサマータイムで東へずれる', () => {
    expect(clockMeridian(MADRID, WINTER)).toBe(15)
    expect(clockMeridian(MADRID, SUMMER)).toBe(30)
    expect(clockMeridian(LONDON, SUMMER)).toBe(15)
  })

  it('マドリードは実経度 -3.7 に対し標準時経線 15 で、約 18.7 度のずれ', () => {
    expect(meridianGap(-3.7, MADRID, WINTER)).toBeCloseTo(18.7, 5)
    expect(meridianGap(-3.7, MADRID, SUMMER)).toBeCloseTo(18.7, 5)
  })

  it('東京はほぼぴったり', () => {
    // 標準時経線 135 に対し実経度 139.69
    expect(meridianGap(139.69, TOKYO, WINTER)).toBeCloseTo(-4.69, 5)
  })

  it('経度 180 度の近くでも折り返さない', () => {
    // シドニーは実経度 151.21、標準時経線 150
    expect(meridianGap(151.21, SYDNEY, WINTER)).toBeCloseTo(-1.21, 5)
  })
})

describe('diffMin', () => {
  it('東京とニューヨークの時差は冬 14 時間・夏 13 時間', () => {
    expect(diffMin(TOKYO, NEW_YORK, WINTER)).toBe(-840)
    expect(diffMin(TOKYO, NEW_YORK, SUMMER)).toBe(-780)
  })

  it('ニューデリーとの時差は 30 分刻みになる', () => {
    expect(diffMin(TOKYO, DELHI, WINTER)).toBe(-210)
  })

  it('シドニーは日本より進んでいる', () => {
    expect(diffMin(TOKYO, SYDNEY, WINTER)).toBe(120)
    expect(diffMin(TOKYO, SYDNEY, SUMMER)).toBe(60)
  })

  it('切り替え日のずれで、3 月はロンドンとニューヨークの時差が普段と違う', () => {
    // アメリカは 3 月第 2 日曜、EU は 3 月最終日曜に切り替わる。
    // その間だけ 4 時間になり、前後は 5 時間
    const between = new Date('2026-03-20T12:00:00Z')
    const after = new Date('2026-04-10T12:00:00Z')
    expect(diffMin(LONDON, NEW_YORK, between)).toBe(-240)
    expect(diffMin(LONDON, NEW_YORK, after)).toBe(-300)
  })
})

describe('dayShift', () => {
  it('日本の朝、ニューヨークはまだ前日', () => {
    // 日本時間 1/15 9:00
    const morning = new Date('2026-01-15T00:00:00Z')
    expect(dayShift(TOKYO, NEW_YORK, morning)).toBe(-1)
  })

  it('日本の夜、シドニーは日付が変わっている', () => {
    // 日本時間 1/15 23:00 → シドニーは 1/16 1:00
    const night = new Date('2026-01-15T14:00:00Z')
    expect(dayShift(TOKYO, SYDNEY, night)).toBe(1)
  })

  it('同じ日ならずれは 0', () => {
    const noon = new Date('2026-01-15T03:00:00Z')
    expect(dayShift(TOKYO, DELHI, noon)).toBe(0)
  })
})

describe('表示の整形', () => {
  it('現地時刻は 2 桁ゼロ埋め', () => {
    // UTC 1/15 0:00 → 東京は 9:00、ニューデリーは 5:30
    expect(formatLocalTime(TOKYO, WINTER)).toBe('09:00')
    expect(formatLocalTime(DELHI, WINTER)).toBe('05:30')
  })

  it('現地の日付は曜日つき', () => {
    expect(formatLocalDate(TOKYO, WINTER)).toBe('1月15日（木）')
    // 同じ瞬間でもニューヨークは前日
    expect(formatLocalDate(NEW_YORK, WINTER)).toBe('1月14日（水）')
  })
})

describe('zonedParts', () => {
  it('日をまたぐ瞬間の時刻を 0 時として返す', () => {
    // 東京の 1/16 0:00 ちょうど
    const midnight = new Date('2026-01-15T15:00:00Z')
    const z = zonedParts(TOKYO, midnight)
    expect(z.hour).toBe(0)
    expect(z.day).toBe(16)
  })
})
