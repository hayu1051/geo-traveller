import { describe, expect, it } from 'vitest'
import {
  describePhase,
  formatDiffShort,
  formatDiffText,
  formatLatitude,
  formatLongitude,
  formatMeridianGap,
  formatPopulation,
} from './format.ts'

describe('formatDiffText', () => {
  it('差が無いときは進み遅れを言わない', () => {
    expect(formatDiffText(0, '日本')).toBe('日本と同じ時刻です')
  })

  it('進んでいる側', () => {
    expect(formatDiffText(60, '日本')).toBe('日本より 1時間 進んでいます')
  })

  it('遅れている側', () => {
    expect(formatDiffText(-780, '日本')).toBe('日本より 13時間 遅れています')
  })

  it('30 分刻みの時差も分まで言う', () => {
    expect(formatDiffText(-210, '日本')).toBe('日本より 3時間30分 遅れています')
  })

  it('基準は日本以外にもできる', () => {
    expect(formatDiffText(60, '東京')).toBe('東京より 1時間 進んでいます')
  })
})

describe('formatDiffShort', () => {
  it('ちょうどの時間', () => {
    expect(formatDiffShort(540)).toBe('+9h')
    expect(formatDiffShort(-300)).toBe('−5h')
  })

  it('差が無いときは ± を使う', () => {
    expect(formatDiffShort(0)).toBe('±0h')
  })

  it('30 分は小数で書く', () => {
    expect(formatDiffShort(330)).toBe('+5.5h')
    expect(formatDiffShort(-210)).toBe('−3.5h')
  })

  it('30 分以外の半端は時計と同じ書き方にする', () => {
    // ネパールの UTC+5:45
    expect(formatDiffShort(345)).toBe('+5:45h')
  })
})

describe('formatLongitude', () => {
  it('東西を切り替える', () => {
    expect(formatLongitude(139.69)).toBe('東経 139.7°')
    expect(formatLongitude(-74.01)).toBe('西経 74°')
  })

  it('本初子午線は東経あつかい', () => {
    expect(formatLongitude(0)).toBe('東経 0°')
  })
})

describe('formatLatitude', () => {
  it('南北を切り替える', () => {
    expect(formatLatitude(35.68)).toBe('北緯 35.7°')
    expect(formatLatitude(-33.87)).toBe('南緯 33.9°')
  })
})

describe('formatMeridianGap', () => {
  it('1 度以内はぴったりとみなす', () => {
    expect(formatMeridianGap(0)).toBe('ほぼぴったり')
    expect(formatMeridianGap(-1)).toBe('ほぼぴったり')
  })

  it('経線より西にある都市', () => {
    // マドリードは西経 3.7 度にあるのに、時計は東経 15 度に合わせてある
    expect(formatMeridianGap(18.7)).toBe('経線より西に 19°')
  })

  it('経線より東にある都市', () => {
    expect(formatMeridianGap(-4.7)).toBe('経線より東に 5°')
  })
})

describe('formatPopulation', () => {
  it('万人単位のまま桁区切りを入れる', () => {
    expect(formatPopulation(3700)).toBe('約 3,700万人')
    expect(formatPopulation(560)).toBe('約 560万人')
  })
})

describe('describePhase', () => {
  it('時刻ごとの区切り', () => {
    expect(describePhase(5).label).toBe('朝')
    expect(describePhase(10).label).toBe('朝')
    expect(describePhase(11).label).toBe('昼')
    expect(describePhase(16).label).toBe('昼')
    expect(describePhase(17).label).toBe('夜')
    expect(describePhase(21).label).toBe('夜')
    expect(describePhase(22).label).toBe('深夜')
    expect(describePhase(0).label).toBe('深夜')
    expect(describePhase(4).label).toBe('深夜')
  })

  it('0 時から 23 時まで、どの時刻でも必ずどれかに入る', () => {
    for (let hour = 0; hour < 24; hour += 1) {
      expect(describePhase(hour).label).not.toBe('')
      expect(describePhase(hour).note).not.toBe('')
    }
  })
})
