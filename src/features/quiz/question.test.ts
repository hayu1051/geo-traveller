import { describe, expect, it } from 'vitest'
import { CITIES } from '../../data/cities.ts'
import { createQuestion } from './question.ts'
import type { Rng } from './random.ts'
import {
  answersOnGlobe,
  QUIZ_KINDS,
  type QuestionOptions,
  type QuizKind,
} from './types.ts'

/*
 * 出題は乱数を使うので、1回動かして通ったからといって安心できない。
 * 「何度やっても必ずこうなる」ことを確かめたい規則は、実際の乱数で何百回か回す。
 * 「この乱数ならこうなる」ことを確かめたい規則は、決まった数を返す関数を渡す。
 */

const RUNS = 300

/** 夏の平日。ヨーロッパと北アメリカがサマータイム中の時期にあたる */
const DATE = new Date('2026-08-17T12:00:00Z')

function options(kind: QuizKind, extra: Partial<QuestionOptions> = {}): QuestionOptions {
  return {
    kind,
    cities: CITIES,
    cityId: null,
    excludeCityId: null,
    date: DATE,
    rng: Math.random,
    ...extra,
  }
}

/** 決まった数を順に返す。使い切ったら先頭に戻る */
function fixedRng(values: number[]): Rng {
  let index = 0
  return () => {
    const value = values[index % values.length] ?? 0
    index += 1
    return value
  }
}

/** 選択肢から答える種類。位置あては地球儀のピンで答えるので入らない */
const CHOICE_KINDS = QUIZ_KINDS.filter((kind) => !answersOnGlobe(kind))

describe('createQuestion', () => {
  describe('どの種類でも成り立つこと', () => {
    it('問題文と解説が空にならない', () => {
      for (const kind of QUIZ_KINDS) {
        for (let i = 0; i < RUNS; i += 1) {
          const question = createQuestion(options(kind))
          expect(question.text.length, kind).toBeGreaterThan(0)
          expect(question.explain.length, kind).toBeGreaterThan(0)
        }
      }
    })

    it('題材の都市が実在する', () => {
      for (const kind of QUIZ_KINDS) {
        for (let i = 0; i < RUNS; i += 1) {
          const question = createQuestion(options(kind))
          expect(CITIES.some((city) => city.id === question.cityId), kind).toBe(true)
        }
      }
    })
  })

  describe('選択肢から答える種類で成り立つこと', () => {
    it('選択肢は必ず4つ', () => {
      for (const kind of CHOICE_KINDS) {
        for (let i = 0; i < RUNS; i += 1) {
          expect(createQuestion(options(kind)).choices, kind).toHaveLength(4)
        }
      }
    })

    it('選択肢の中に必ず答えがある', () => {
      for (const kind of CHOICE_KINDS) {
        for (let i = 0; i < RUNS; i += 1) {
          const question = createQuestion(options(kind))
          const ids = question.choices.map((choice) => choice.id)
          expect(ids, kind).toContain(question.answerId)
        }
      }
    })

    it('同じラベルが2つ並ばない', () => {
      // 国旗クイズはラベルが国名。アメリカ合衆国の都市が3件あるので重なりうる
      for (const kind of CHOICE_KINDS) {
        for (let i = 0; i < RUNS; i += 1) {
          const labels = createQuestion(options(kind)).choices.map((choice) => choice.label)
          expect(new Set(labels).size, `${kind}: ${labels.join(' / ')}`).toBe(labels.length)
        }
      }
    })

    it('同じ選択肢が2つ並ばない', () => {
      for (const kind of CHOICE_KINDS) {
        for (let i = 0; i < RUNS; i += 1) {
          const ids = createQuestion(options(kind)).choices.map((choice) => choice.id)
          expect(new Set(ids).size, kind).toBe(ids.length)
        }
      }
    })
  })

  describe('連続で同じ問題が出ない', () => {
    it('excludeCityId の都市は題材にならない', () => {
      for (let i = 0; i < RUNS; i += 1) {
        const question = createQuestion(options('city', { excludeCityId: 'tokyo' }))
        expect(question.cityId).not.toBe('tokyo')
      }
    })

    it('都市が1件しかないときは、やむを得ず同じ都市を出す', () => {
      const only = CITIES.filter((city) => city.id === 'tokyo')
      const question = createQuestion(
        options('city', { cities: only, excludeCityId: 'tokyo' }),
      )
      expect(question.cityId).toBe('tokyo')
    })
  })

  describe('再出題', () => {
    it('cityId を指定すると、その都市の問題になる', () => {
      for (const kind of QUIZ_KINDS) {
        expect(createQuestion(options(kind, { cityId: 'madrid' })).cityId, kind).toBe('madrid')
      }
    })

    it('都市を答える種類では、答えがその都市の id になる', () => {
      // 時差計算だけは答えが時刻の文字列なので、ここには含めない
      for (const kind of ['city', 'flag', 'locate'] as const) {
        expect(createQuestion(options(kind, { cityId: 'madrid' })).answerId, kind).toBe('madrid')
      }
    })

    it('存在しない id を渡されたら、選び直す', () => {
      const question = createQuestion(options('city', { cityId: 'atlantis' }))
      expect(CITIES.some((city) => city.id === question.cityId)).toBe(true)
    })

    it('同じ都市でも、選択肢は毎回作り直される', () => {
      // 答えを保存せず作り直す方式なので、並びが固定されないことを確かめる
      const labels = new Set<string>()
      for (let i = 0; i < RUNS; i += 1) {
        labels.add(
          createQuestion(options('city', { cityId: 'tokyo' }))
            .choices.map((choice) => choice.label)
            .join(','),
        )
      }
      expect(labels.size).toBeGreaterThan(1)
    })
  })

  describe('都市あて', () => {
    it('ヒントに大陸・半球・人口・通貨が入る', () => {
      const question = createQuestion(options('city', { cityId: 'tokyo' }))
      expect(question.text).toContain('北半球')
      expect(question.text).toContain('アジア')
      expect(question.text).toContain('3,700万人')
      expect(question.text).toContain('円（JPY）')
    })

    it('ヒントに国名を出さない', () => {
      // 通貨とほぼ同じ情報になるうえ、答えがそのまま分かってしまう
      const question = createQuestion(options('city', { cityId: 'tokyo' }))
      expect(question.text).not.toContain('日本')
    })

    it('選択肢は都市名', () => {
      const question = createQuestion(options('city', { cityId: 'tokyo' }))
      const answer = question.choices.find((choice) => choice.id === question.answerId)
      expect(answer?.label).toBe('東京')
    })

    it('ヒントにミニ豆知識がそのまま出る', () => {
      // 文面そのものは cities.test.ts で見る。ここで確かめるのは受け渡しだけ
      for (const city of CITIES) {
        expect(createQuestion(options('city', { cityId: city.id })).hint, city.nameJa).toBe(
          city.trivia,
        )
      }
    })

    it('解説に都市名・国名・現地表記が入る', () => {
      const question = createQuestion(options('city', { cityId: 'cairo' }))
      expect(question.explain).toContain('カイロ')
      expect(question.explain).toContain('エジプト')
      expect(question.explain).toContain('القاهرة')
    })

    it('ヒントと同じ文を解説で繰り返さない', () => {
      // 同じ文が画面に2つ並ぶと、どちらを読めばよいのか分からなくなる
      for (const city of CITIES) {
        const question = createQuestion(options('city', { cityId: city.id }))
        expect(question.explain, city.nameJa).not.toContain(question.hint)
      }
    })

    it('国旗は持たない', () => {
      expect(createQuestion(options('city')).flag).toBeUndefined()
    })
  })

  describe('国旗', () => {
    it('その都市の国旗を出す', () => {
      expect(createQuestion(options('flag', { cityId: 'tokyo' })).flag).toBe('🇯🇵')
    })

    it('選択肢は国名', () => {
      const question = createQuestion(options('flag', { cityId: 'tokyo' }))
      const answer = question.choices.find((choice) => choice.id === question.answerId)
      expect(answer?.label).toBe('日本')
    })

    it('答えと同じ国の都市は選択肢に出さない', () => {
      // ニューヨークが答えのとき、ロサンゼルスとホノルルも「アメリカ合衆国」になる
      for (let i = 0; i < RUNS; i += 1) {
        const question = createQuestion(options('flag', { cityId: 'newyork' }))
        const wrong = question.choices.filter((choice) => choice.id !== question.answerId)
        expect(wrong.every((choice) => choice.label !== 'アメリカ合衆国')).toBe(true)
      }
    })

    it('「中国」と「中国（香港）」を並べない', () => {
      // 文字列は違うが、どちらも中国に見えるので答えが2つある問題になってしまう
      for (let i = 0; i < RUNS; i += 1) {
        for (const cityId of ['beijing', 'hongkong']) {
          const labels = createQuestion(options('flag', { cityId })).choices.map(
            (choice) => choice.label,
          )
          expect(labels.filter((label) => label.includes('中国')), cityId).toHaveLength(1)
        }
      }
    })

    it('ヒントは付かない', () => {
      // 旗そのものが手がかりなので、豆知識を足すと答えが分かってしまう
      expect(createQuestion(options('flag')).hint).toBeUndefined()
    })

    it('解説に国旗・国名・都市名が入る', () => {
      const question = createQuestion(options('flag', { cityId: 'sydney' }))
      expect(question.explain).toContain('🇦🇺')
      expect(question.explain).toContain('オーストラリア')
      expect(question.explain).toContain('シドニー')
    })
  })

  describe('位置あて', () => {
    it('選択肢を作らない', () => {
      // 答えるのは地球儀のピン。画面に選択肢が出ると押すところが2か所になる
      for (let i = 0; i < RUNS; i += 1) {
        expect(createQuestion(options('locate')).choices).toEqual([])
      }
    })

    it('答えはその都市の id', () => {
      // ピンを押すと都市の id が渡ってくるので、そのまま照らし合わせられる形にする
      expect(createQuestion(options('locate', { cityId: 'lima' })).answerId).toBe('lima')
    })

    it('問題文に都市名と国名を出す', () => {
      const question = createQuestion(options('locate', { cityId: 'lima' }))
      expect(question.text).toContain('リマ')
      expect(question.text).toContain('ペルー')
    })

    it('ヒントは大陸だけ', () => {
      /*
       * 半球や人口まで出すと当てられてしまう。
       * どのあたりを探せばよいかだけ伝えて、位置は思い出してもらう。
       */
      const question = createQuestion(options('locate', { cityId: 'lima' }))
      expect(question.hint).toBe('この都市は 南アメリカ にあります。')
    })

    it('解説に緯度と経度を出す', () => {
      const question = createQuestion(options('locate', { cityId: 'lima' }))
      expect(question.explain).toContain('南緯')
      expect(question.explain).toContain('西経')
    })

    it('国旗は持たない', () => {
      expect(createQuestion(options('locate')).flag).toBeUndefined()
    })

    it('どの都市でも問題文と解説が作れる', () => {
      for (const city of CITIES) {
        const question = createQuestion(options('locate', { cityId: city.id }))
        expect(question.text, city.nameJa).toContain(city.nameJa)
        expect(question.explain, city.nameJa).toContain(city.nameJa)
      }
    })
  })

  describe('乱数を固定したとき', () => {
    it('同じ乱数からは同じ問題ができる', () => {
      const first = createQuestion(options('city', { rng: fixedRng([0.1, 0.42, 0.77, 0.05]) }))
      const second = createQuestion(options('city', { rng: fixedRng([0.1, 0.42, 0.77, 0.05]) }))
      expect(second).toEqual(first)
    })

    it('乱数が常に0でも壊れない', () => {
      const question = createQuestion(options('flag', { rng: () => 0 }))
      expect(question.choices).toHaveLength(4)
      expect(question.choices.map((choice) => choice.id)).toContain(question.answerId)
    })
  })
})
