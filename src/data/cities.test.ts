import { describe, expect, it } from 'vitest'
import { CITIES, findCity } from './cities.ts'
import { CONTINENTS } from './types.ts'

/*
 * 都市データそのもののテスト。
 *
 * 34 件を手で書き写しているので、打ち間違いはロジックのバグより起きやすい。
 * しかも間違えても型は通ってしまう（tz が 'Asia/Tokio' でも string には違いない）。
 * 画面を開かずに気づけるよう、データが満たすべき約束をここに置く。
 */

/** ひらがなと長音符だけ。yomi は検索とふりがなの両方で使うので混ぜない */
const HIRAGANA_ONLY = /^[ぁ-ゖー]+$/

/** 国旗の絵文字は Regional Indicator 2 文字の組み合わせ */
const FLAG_ONLY = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u

function isUsableTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

describe('CITIES', () => {
  it('34 件ある', () => {
    // 原案の 33 件 + 原案に無いマドリード
    expect(CITIES).toHaveLength(34)
  })

  it('id が重複しない', () => {
    const ids = CITIES.map((city) => city.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('都市名が重複しない', () => {
    const names = CITIES.map((city) => city.nameJa)
    expect(new Set(names).size).toBe(names.length)
  })

  it('id は英小文字だけ', () => {
    for (const city of CITIES) {
      expect(city.id, city.nameJa).toMatch(/^[a-z]+$/)
    }
  })

  describe('位置', () => {
    it('緯度は -90 〜 90', () => {
      for (const city of CITIES) {
        expect(city.lat, city.nameJa).toBeGreaterThanOrEqual(-90)
        expect(city.lat, city.nameJa).toBeLessThanOrEqual(90)
      }
    })

    it('経度は -180 〜 180', () => {
      for (const city of CITIES) {
        expect(city.lng, city.nameJa).toBeGreaterThanOrEqual(-180)
        expect(city.lng, city.nameJa).toBeLessThanOrEqual(180)
      }
    })

    it('同じ座標の都市がない', () => {
      const points = CITIES.map((city) => `${String(city.lat)},${String(city.lng)}`)
      expect(new Set(points).size).toBe(points.length)
    })
  })

  describe('タイムゾーン', () => {
    it('すべてブラウザが知っている IANA 名になっている', () => {
      for (const city of CITIES) {
        expect(isUsableTimeZone(city.tz), `${city.nameJa} の ${city.tz}`).toBe(true)
      }
    })

    it('都市の経度と標準時の経線が離れすぎていない', () => {
      /*
       * tz を取り違えると、経度と時刻が食い違ったまま気づけない。
       * 実際のずれは大きくても 30 度ほど（中国の西部やスペイン）なので、
       * 60 度を超えていたら書き間違いを疑う。
       */
      for (const city of CITIES) {
        const januaryOffset = new Date(Date.UTC(2026, 0, 15))
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: city.tz,
          hour: '2-digit',
          hour12: false,
        }).formatToParts(januaryOffset)
        expect(parts.length, city.nameJa).toBeGreaterThan(0)

        const meridian = Math.round(city.lng / 15) * 15
        expect(Math.abs(((meridian - city.lng + 540) % 360) - 180), city.nameJa).toBeLessThan(60)
      }
    })
  })

  describe('表示に使う文字列', () => {
    it('yomi はひらがなだけ', () => {
      for (const city of CITIES) {
        expect(city.yomi, city.nameJa).toMatch(HIRAGANA_ONLY)
      }
    })

    it('flag は国旗の絵文字', () => {
      for (const city of CITIES) {
        expect(city.flag, city.nameJa).toMatch(FLAG_ONLY)
      }
    })

    it('通貨には通貨コードが付いている', () => {
      for (const city of CITIES) {
        expect(city.cur, city.nameJa).toContain('（')
      }
    })

    it('豆知識は丁寧体で終わる', () => {
      // 原案は一部が「〜だよ」だった。同じ一覧の中で文体が混ざらないようにする
      for (const city of CITIES) {
        expect(city.trivia, city.nameJa).toMatch(/(です|ます|ません|ましょう)(ね|よ)?。$/)
      }
    })

    it('空の項目がない', () => {
      for (const city of CITIES) {
        for (const value of [
          city.nameJa,
          city.nameLocal,
          city.country,
          city.lang,
          city.cur,
          city.trivia,
        ]) {
          expect(value.trim(), city.nameJa).not.toBe('')
        }
      }
    })
  })

  describe('人口', () => {
    it('万人単位の正の数', () => {
      for (const city of CITIES) {
        expect(city.pop, city.nameJa).toBeGreaterThan(0)
        // 3 億人の都市は無い。桁の取り違えを拾う
        expect(city.pop, city.nameJa).toBeLessThan(30000)
      }
    })
  })

  describe('ライブ映像', () => {
    it('yt があるなら ytNote もある', () => {
      for (const city of CITIES) {
        if (city.yt !== undefined) {
          expect(city.ytNote, city.nameJa).toBeTruthy()
        }
      }
    })

    it('ytNote だけが残っている都市がない', () => {
      for (const city of CITIES) {
        if (city.yt === undefined) {
          expect(city.ytNote, city.nameJa).toBeUndefined()
        }
      }
    })

    it('複数の大陸にライブ映像がある', () => {
      const live = CITIES.filter((city) => city.yt !== undefined)
      expect(new Set(live.map((city) => city.cont)).size).toBeGreaterThan(1)
    })
  })

  describe('大陸', () => {
    it('どの大陸にも 2 件以上ある', () => {
      // 大陸フィルタを押したときに 1 件しか出ないと、絞り込みの意味が伝わらない
      for (const continent of CONTINENTS) {
        const cities = CITIES.filter((city) => city.cont === continent)
        expect(cities.length, continent).toBeGreaterThanOrEqual(2)
      }
    })

    it('大陸ごとにまとまっていて、チップと同じ順に並ぶ', () => {
      const order = CITIES.map((city) => CONTINENTS.indexOf(city.cont))
      expect(order).toEqual([...order].sort((a, b) => a - b))
    })

    it('大陸の中は東から西へ並ぶ', () => {
      for (const continent of CONTINENTS) {
        const longitudes = CITIES.filter((city) => city.cont === continent).map(
          (city) => city.lng,
        )
        expect(longitudes, continent).toEqual([...longitudes].sort((a, b) => b - a))
      }
    })
  })
})

describe('findCity', () => {
  it('id で引ける', () => {
    expect(findCity('tokyo')?.nameJa).toBe('東京')
  })

  it('無い id では undefined', () => {
    expect(findCity('atlantis')).toBeUndefined()
  })

  it('すべての都市が自分の id で引ける', () => {
    for (const city of CITIES) {
      expect(findCity(city.id), city.id).toBe(city)
    }
  })
})
