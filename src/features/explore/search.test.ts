import { describe, expect, it } from 'vitest'
import { CITIES } from '../../data/cities.ts'
import { filterCities } from './search.ts'

const ids = (cities: { id: string }[]) => cities.map((city) => city.id)

describe('filterCities', () => {
  it('条件が無ければ全件そのまま返す', () => {
    expect(filterCities(CITIES, '', null)).toHaveLength(CITIES.length)
  })

  it('元の並び順を変えない', () => {
    expect(ids(filterCities(CITIES, '', null))).toEqual(ids(CITIES))
  })

  describe('検索', () => {
    it('漢字の都市名で引ける', () => {
      expect(ids(filterCities(CITIES, '東京', null))).toEqual(['tokyo'])
    })

    it('ひらがなの読みで引ける', () => {
      expect(ids(filterCities(CITIES, 'とうきょう', null))).toEqual(['tokyo'])
    })

    it('現地表記で引ける', () => {
      expect(ids(filterCities(CITIES, 'Tokyo', null))).toEqual(['tokyo'])
    })

    it('国名で引ける', () => {
      expect(ids(filterCities(CITIES, 'イギリス', null))).toEqual(['london'])
    })

    it('大文字と小文字を区別しない', () => {
      expect(ids(filterCities(CITIES, 'LONDON', null))).toEqual(['london'])
    })

    it('前後の空白は無視する', () => {
      expect(ids(filterCities(CITIES, '  東京  ', null))).toEqual(['tokyo'])
    })

    it('途中の一致でも拾う', () => {
      expect(ids(filterCities(CITIES, 'ヨーク', null))).toEqual(['newyork'])
    })

    it('見つからなければ空になる', () => {
      expect(filterCities(CITIES, 'ここには無い都市', null)).toEqual([])
    })
  })

  describe('大陸フィルタ', () => {
    it('指定した大陸だけが残る', () => {
      const asia = filterCities(CITIES, '', 'アジア')
      expect(asia.length).toBeGreaterThan(0)
      expect(asia.every((city) => city.cont === 'アジア')).toBe(true)
    })

    it('6 大陸すべてに最低 1 件ある', () => {
      const continents = [
        'アジア',
        'ヨーロッパ',
        'アフリカ',
        '北アメリカ',
        '南アメリカ',
        'オセアニア',
      ] as const
      for (const continent of continents) {
        expect(filterCities(CITIES, '', continent).length).toBeGreaterThan(0)
      }
    })
  })

  describe('検索と大陸フィルタの組み合わせ', () => {
    it('両方に合うものだけが残る', () => {
      expect(ids(filterCities(CITIES, '東京', 'アジア'))).toEqual(['tokyo'])
    })

    it('片方だけ合っても残らない', () => {
      // 東京はアジアなので、ヨーロッパで絞ると消える
      expect(filterCities(CITIES, '東京', 'ヨーロッパ')).toEqual([])
    })

    it('検索語が空なら、その大陸の都市が 1 件も落ちない', () => {
      const expected = ids(CITIES.filter((city) => city.cont === 'ヨーロッパ'))
      expect(ids(filterCities(CITIES, '', 'ヨーロッパ'))).toEqual(expected)
    })
  })
})
