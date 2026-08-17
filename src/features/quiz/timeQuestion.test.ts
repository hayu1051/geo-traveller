import { describe, expect, it } from 'vitest'
import { CITIES, findCity } from '../../data/cities.ts'
import type { City } from '../../data/types.ts'
import { offMin } from '../../lib/time.ts'
import type { Rng } from './random.ts'
import { START_HOURS, timeQuestion } from './timeQuestion.ts'
import type { Question } from './types.ts'

/*
 * 時差計算クイズ。答えが都市ではなく時刻なので、確かめたいのは文言より計算。
 *
 * 都市の一覧を2件に絞ると、どの都市どうしの問題になるかが決まる。
 * そのうえで乱数を決め打ちすれば「東京の9時にロンドンは何時か」を1通りに固定でき、
 * 期待する答えを手で書ける。
 *
 * 日付は固定する。ヨーロッパと北アメリカのサマータイムは3月と11月に切り替わるので、
 * new Date() のままだと同じテストが季節によって別の答えを求めてしまう。
 */

/** 夏の平日。ヨーロッパと北アメリカがサマータイム中の時期にあたる */
const DATE = new Date('2026-08-17T12:00:00Z')

/** 冬の平日。どちらもサマータイムが終わっている時期 */
const WINTER = new Date('2026-01-15T12:00:00Z')

const RUNS = 300

/*
 * 時差の種類ごとに1都市だけ残した一覧（18 件）。
 *
 * 総当たりで確かめたいのは時差の組み合わせであって都市の組み合わせではない。
 * 34 件すべてを掛け合わせると 1,000 通りを超え、その1つずつが Intl を何度も呼ぶので
 * テストが数秒かかるようになる。同じ時差の都市はまとめてよい。
 */
const BY_OFFSET: City[] = [...new Map(CITIES.map((c) => [offMin(c.tz, DATE), c])).values()]

function city(id: string): City {
  const found = findCity(id)
  if (!found) throw new Error(`${id} が都市データにありません`)
  return found
}

/** 最初だけ決まった数を返し、あとは 0.5 を返す。並べ替えの順は問わない */
function scriptedRng(values: number[]): Rng {
  let index = 0
  return () => {
    const value = values[index] ?? 0.5
    index += 1
    return value
  }
}

type AskOptions = {
  startHour: number
  flight: boolean
  date?: Date
}

/**
 * 出発都市・到着都市・出発時刻・飛行機の有無を決め打ちして1問作る。
 *
 * timeQuestion が乱数を使う順番は「出発都市 → 出発時刻 → 飛行機かどうか」。
 * 都市を2件に絞ってあるので最初の1つは何でも同じ結果になる。
 */
function ask(fromId: string, toId: string, options: AskOptions): Question {
  const from = city(fromId)
  const to = city(toId)
  const startIndex = START_HOURS.indexOf(options.startHour)
  if (startIndex === -1) throw new Error(`${String(options.startHour)}時は出題されません`)

  return timeQuestion(to, {
    kind: 'time',
    cities: [from, to],
    cityId: to.id,
    excludeCityId: null,
    date: options.date ?? DATE,
    // 添字は Math.floor(rng() * 5)。まん中の値を渡して境目を踏まないようにする
    rng: scriptedRng([0, (startIndex + 0.5) / START_HOURS.length, options.flight ? 0 : 0.99]),
  })
}

describe('timeQuestion', () => {
  describe('時差をたすだけの問題', () => {
    it('同じ日に収まる', () => {
      // 東京 +9、夏のロンドンは +1 なので 8 時間もどる
      expect(ask('tokyo', 'london', { startHour: 9, flight: false }).answerId).toBe(
        '同じ日の 01:00',
      )
    })

    it('前の日にもどる', () => {
      expect(ask('tokyo', 'london', { startHour: 6, flight: false }).answerId).toBe(
        '前の日の 22:00',
      )
    })

    it('次の日に進む', () => {
      expect(ask('london', 'tokyo', { startHour: 18, flight: false }).answerId).toBe(
        '次の日の 02:00',
      )
    })

    it('問題文に出発都市・時刻・到着都市が入る', () => {
      const question = ask('tokyo', 'london', { startHour: 9, flight: false })
      expect(question.text).toContain('東京')
      expect(question.text).toContain('9時')
      expect(question.text).toContain('ロンドン')
      expect(question.text).not.toContain('飛行')
    })
  })

  describe('飛行機の問題', () => {
    it('出発時刻＋飛行時間に時差をたす', () => {
      // 東京 → ロンドンは 9,559km。850km/h で 11 時間
      expect(ask('tokyo', 'london', { startHour: 18, flight: true }).answerId).toBe(
        '同じ日の 21:00',
      )
    })

    it('2 日あとに着くこともある', () => {
      // ロサンゼルス 18時発 + 15時間 + 時差 15時間 でちょうど 48 時間
      expect(ask('losangeles', 'singapore', { startHour: 18, flight: true }).answerId).toBe(
        '2日あとの 00:00',
      )
    })

    it('問題文に飛行時間が入る', () => {
      const question = ask('tokyo', 'london', { startHour: 18, flight: true })
      expect(question.text).toContain('11時間の飛行')
      expect(question.text).toContain('出発')
    })

    it('ヒントで計算の順番を教える', () => {
      expect(ask('tokyo', 'london', { startHour: 18, flight: true }).hint).toContain(
        '出発時刻＋飛行時間',
      )
    })
  })

  describe('30 分きざみの時差', () => {
    /*
     * ニューデリーは +5:30。時差を「時間」だけで扱っていると 30 分ぶんが消える。
     * 完了条件そのものなので、進む側・もどる側・日をまたぐ側の3通りを見る。
     */

    it('もどる向き', () => {
      expect(ask('tokyo', 'delhi', { startHour: 9, flight: false }).answerId).toBe(
        '同じ日の 05:30',
      )
    })

    it('進む向き', () => {
      expect(ask('delhi', 'tokyo', { startHour: 18, flight: false }).answerId).toBe(
        '同じ日の 21:30',
      )
    })

    it('日をまたいでも 30 分が残る', () => {
      expect(ask('delhi', 'losangeles', { startHour: 6, flight: false }).answerId).toBe(
        '前の日の 17:30',
      )
    })

    it('選択肢もすべて 30 分きざみになる', () => {
      // 正解だけ 30 分で終わっていたら、計算しなくても答えが分かってしまう
      const question = ask('tokyo', 'delhi', { startHour: 9, flight: false })
      for (const choice of question.choices) {
        expect(choice.label, choice.label).toMatch(/:30$/)
      }
    })
  })

  describe('選択肢', () => {
    it('時差を逆向きにたした答えが必ず入る', () => {
      // いちばん多いまちがい方。選んだときに解説と結びつくようにしておく
      const question = ask('tokyo', 'london', { startHour: 9, flight: false })
      const labels = question.choices.map((choice) => choice.label)
      expect(labels).toContain('同じ日の 17:00')
    })

    it('飛行機の問題では時差を忘れた答えが入る', () => {
      const question = ask('tokyo', 'london', { startHour: 18, flight: true })
      const labels = question.choices.map((choice) => choice.label)
      // 18時 + 11時間 = 次の日の 05:00
      expect(labels).toContain('次の日の 05:00')
    })

    it('どの時差の組み合わせでも 4 つそろい、重ならない', () => {
      /*
       * 誤答は「やりがちなまちがい」から作るので、時差と飛行時間の値によっては
       * 正解や他の誤答と同じ時刻になってしまう。取り除いたあとに数が足りるかを見る。
       */
      for (const from of BY_OFFSET) {
        for (const to of BY_OFFSET) {
          if (from.id === to.id) continue
          for (const startHour of [6, 18]) {
            for (const flight of [true, false]) {
              const question = ask(from.id, to.id, { startHour, flight })
              const labels = question.choices.map((choice) => choice.label)
              const where = `${from.id}→${to.id} ${String(startHour)}時`
              expect(new Set(labels).size, where).toBe(4)
              expect(labels, where).toContain(question.answerId)
            }
          }
        }
      }
    })
  })

  describe('ヒント', () => {
    it('両方の標準時の経線を出す', () => {
      const hint = ask('tokyo', 'london', { startHour: 9, flight: false }).hint ?? ''
      expect(hint).toContain('東経 135°')
      expect(hint).toContain('東経 0°')
      expect(hint).toContain('15°')
    })

    it('サマータイム中の都市があれば断りを入れる', () => {
      /*
       * ヒントは標準時の経線を手がかりにさせる。夏のロンドンは経線が東経 0° でも
       * 時計は +1 時間なので、断りが無いと計算が合わなくなる。
       */
      const hint = ask('tokyo', 'london', { startHour: 9, flight: false }).hint ?? ''
      expect(hint).toContain('サマータイム')
      expect(hint).toContain('ロンドンは 1時間')
      expect(hint).not.toContain('東京は')
    })

    it('サマータイムが無い時期には断りを入れない', () => {
      const hint =
        ask('tokyo', 'london', { startHour: 9, flight: false, date: WINTER }).hint ?? ''
      expect(hint).not.toContain('サマータイム')
    })

    it('冬は経線どおりの時差になる', () => {
      // 冬のロンドンは +0。東経 135° との差 135° はちょうど 9 時間
      expect(
        ask('tokyo', 'london', { startHour: 9, flight: false, date: WINTER }).answerId,
      ).toBe('同じ日の 00:00')
    })
  })

  describe('解説', () => {
    it('時差と答えを言う', () => {
      const explain = ask('tokyo', 'london', { startHour: 9, flight: false }).explain
      expect(explain).toContain('ロンドンは 東京より 8時間 遅れています')
      expect(explain).toContain('同じ日の 01:00')
    })

    it('飛行機では途中の時刻も見せる', () => {
      const explain = ask('tokyo', 'london', { startHour: 18, flight: true }).explain
      // 出発地の時計で何時になるかを一度出してから、時差をたす
      expect(explain).toContain('次の日の 05:00')
      expect(explain).toContain('同じ日の 21:00')
    })
  })

  describe('出発側の都市の選び方', () => {
    it('時差が同じ都市は相手にしない', () => {
      // ソウルは東京と同じ +9。組にすると計算するところが無くなる
      const cities = [city('tokyo'), city('seoul'), city('london')]
      for (let i = 0; i < RUNS; i += 1) {
        const question = timeQuestion(city('tokyo'), {
          kind: 'time',
          cities,
          cityId: 'tokyo',
          excludeCityId: null,
          date: DATE,
          rng: Math.random,
        })
        expect(question.text).not.toContain('ソウル')
        expect(question.text).toContain('ロンドン')
      }
    })

    it('題材は答える側の都市になる', () => {
      // 間違えたときに積まれるのも、地球儀が回るのもこちら
      expect(ask('tokyo', 'london', { startHour: 9, flight: false }).cityId).toBe('london')
    })

    it('相手がいなくても落ちない', () => {
      // 都市が1件だけの一覧。ありえないが、pick が空の配列で止まらないことを見る
      const question = timeQuestion(city('tokyo'), {
        kind: 'time',
        cities: [city('tokyo')],
        cityId: 'tokyo',
        excludeCityId: null,
        date: DATE,
        rng: Math.random,
      })
      expect(question.choices).toHaveLength(4)
    })
  })

  describe('出題の範囲', () => {
    it('出発時刻はきりのよい時刻だけ', () => {
      for (let i = 0; i < RUNS; i += 1) {
        const question = timeQuestion(city('london'), {
          kind: 'time',
          cities: CITIES,
          cityId: 'london',
          excludeCityId: null,
          date: DATE,
          rng: Math.random,
        })
        const hour = /(\d+)時/.exec(question.text)?.[1]
        expect(START_HOURS.map(String), question.text).toContain(hour)
      }
    })

    it('飛行時間は 2 〜 15 時間に収まる', () => {
      for (const from of CITIES) {
        for (const to of CITIES) {
          if (from.id === to.id) continue
          const question = ask(from.id, to.id, { startHour: 9, flight: true })
          const hours = Number(/(\d+)時間の飛行/.exec(question.text)?.[1])
          expect(hours, `${from.id}→${to.id}`).toBeGreaterThanOrEqual(2)
          expect(hours, `${from.id}→${to.id}`).toBeLessThanOrEqual(15)
        }
      }
    })

    it('答えが時差の計算と一致する（飛行機なし）', () => {
      /*
       * 期待値を手で書くのは代表的な組だけなので、残りは別の道すじで確かめる。
       * ここでは offMin を直に引いて、出題の中の計算と突き合わせる。
       */
      for (const from of BY_OFFSET) {
        for (const to of BY_OFFSET) {
          if (from.id === to.id) continue
          const question = ask(from.id, to.id, { startHour: 12, flight: false })
          const diff = offMin(to.tz, DATE) - offMin(from.tz, DATE)
          const total = 12 * 60 + diff
          const hour = Math.floor((((total % 1440) + 1440) % 1440) / 60)
          const minute = ((total % 60) + 60) % 60
          expect(question.answerId, `${from.id}→${to.id}`).toContain(
            `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          )
        }
      }
    })
  })
})
