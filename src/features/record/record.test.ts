import { describe, expect, it } from 'vitest'
import { CITIES } from '../../data/cities.ts'
import { QUIZ_KINDS } from '../quiz/types.ts'
import {
  accuracy,
  EMPTY_RECORD,
  markVisited,
  parseRecord,
  recordAnswer,
  VISITED_LIMIT,
  type StudyRecord,
} from './record.ts'

/*
 * 記録の計算と、保存データの検証。
 *
 * とくに parseRecord は、他人が書いた値を読む唯一の場所になる。
 * 前のバージョンが書いた形式、手で書き換えられた値、別のアプリの残骸、
 * どれも来うるものとして、思いつく壊れ方をひととおり流し込む。
 */

/** 都市データに実在する id。並びが変わっても壊れないよう先頭から取る */
const KNOWN_CITY = CITIES[0]?.id ?? 'tokyo'
const ANOTHER_CITY = CITIES[1]?.id ?? 'seoul'

describe('parseRecord', () => {
  describe('読めない値', () => {
    it('null や undefined は初期値になる', () => {
      expect(parseRecord(null)).toEqual(EMPTY_RECORD)
      expect(parseRecord(undefined)).toEqual(EMPTY_RECORD)
    })

    it('オブジェクトでなければ初期値になる', () => {
      // 「正しい JSON だが形が違う」もの。JSON.parse は通ってしまう
      for (const raw of [0, 42, 'gtt', true, [], [1, 2, 3]]) {
        expect(parseRecord(raw), JSON.stringify(raw)).toEqual(EMPTY_RECORD)
      }
    })

    it('空のオブジェクトは初期値になる', () => {
      expect(parseRecord({})).toEqual(EMPTY_RECORD)
    })
  })

  describe('項目ごとに直す', () => {
    it('1つ壊れていても、ほかの項目は残る', () => {
      /*
       * 全体を捨てる作りにすると、visited が壊れただけで
       * 何週間ぶんの成績も一緒に消えてしまう。
       */
      const record = parseRecord({ visited: 'こわれた', total: 10, correct: 7, best: 4 })
      expect(record.visited).toEqual([])
      expect(record.total).toBe(10)
      expect(record.correct).toBe(7)
      expect(record.best).toBe(4)
    })

    it('数でない値は 0 になる', () => {
      const record = parseRecord({ total: 'abc', correct: null, best: {} })
      expect(record.total).toBe(0)
      expect(record.correct).toBe(0)
      expect(record.best).toBe(0)
    })

    it('負の数と小数は 0 になる', () => {
      const record = parseRecord({ total: -5, best: 1.5 })
      expect(record.total).toBe(0)
      expect(record.best).toBe(0)
    })

    it('正解数がといた数を超えていたら、といた数に合わせる', () => {
      // このまま通すと正解率が 100% を超えて表示される
      expect(parseRecord({ total: 3, correct: 99 }).correct).toBe(3)
    })
  })

  describe('見た都市', () => {
    it('文字列だけ残す', () => {
      const record = parseRecord({ visited: [KNOWN_CITY, 42, null, {}] })
      expect(record.visited).toEqual([KNOWN_CITY])
    })

    it('今のデータに無い都市は落とす', () => {
      // 開発中に都市を入れ替えると、消えた id が保存に残る
      const record = parseRecord({ visited: [KNOWN_CITY, 'atlantis', ANOTHER_CITY] })
      expect(record.visited).toEqual([KNOWN_CITY, ANOTHER_CITY])
    })

    it('重複を取り除く', () => {
      // 数だけ増えて一覧が増えない、という食い違いを防ぐ
      const record = parseRecord({ visited: [KNOWN_CITY, KNOWN_CITY, ANOTHER_CITY] })
      expect(record.visited).toEqual([KNOWN_CITY, ANOTHER_CITY])
    })

    it('上限を超えたぶんは落とす', () => {
      const many = CITIES.map((city) => city.id)
      const record = parseRecord({ visited: [...many, ...many] })
      expect(record.visited.length).toBeLessThanOrEqual(VISITED_LIMIT)
      expect(record.visited).toEqual(many.slice(0, VISITED_LIMIT))
    })
  })

  describe('種類ごとの成績', () => {
    it('すべての種類がそろう', () => {
      // 保存に無い種類でも、表示のたびに存在を確かめずに済むようにする
      const record = parseRecord({ byKind: { city: { asked: 3, correct: 2 } } })
      for (const kind of QUIZ_KINDS) {
        expect(record.byKind[kind], kind).toBeDefined()
      }
      expect(record.byKind.city).toEqual({ asked: 3, correct: 2 })
      expect(record.byKind.flag).toEqual({ asked: 0, correct: 0 })
    })

    it('原案には無かった種類の残骸を無視する', () => {
      const record = parseRecord({ byKind: { city: { asked: 1, correct: 1 }, ufo: 999 } })
      expect(Object.keys(record.byKind).sort()).toEqual([...QUIZ_KINDS].sort())
    })

    it('中身が壊れていても 0 で埋める', () => {
      const record = parseRecord({ byKind: { city: 'こわれた', flag: { asked: -1 } } })
      expect(record.byKind.city).toEqual({ asked: 0, correct: 0 })
      expect(record.byKind.flag).toEqual({ asked: 0, correct: 0 })
    })

    it('正解数がといた数を超えていたら、といた数に合わせる', () => {
      expect(parseRecord({ byKind: { city: { asked: 2, correct: 9 } } }).byKind.city).toEqual({
        asked: 2,
        correct: 2,
      })
    })
  })

  it('自分が書き出した記録はそのまま読み戻せる', () => {
    // 保存 → 読み込み を1周させて、途中で形が変わらないことを見る
    let record: StudyRecord = EMPTY_RECORD
    record = markVisited(record, KNOWN_CITY)
    record = markVisited(record, ANOTHER_CITY)
    record = recordAnswer(record, 'city', true, 1)
    record = recordAnswer(record, 'time', false, 0)

    const parsed: unknown = JSON.parse(JSON.stringify(record))
    expect(parseRecord(parsed)).toEqual(record)
  })
})

describe('markVisited', () => {
  it('新しいものが先頭に来る', () => {
    const record = markVisited(markVisited(EMPTY_RECORD, KNOWN_CITY), ANOTHER_CITY)
    expect(record.visited).toEqual([ANOTHER_CITY, KNOWN_CITY])
  })

  it('すでに見た都市なら、そのまま同じ記録を返す', () => {
    /*
     * 中身が同じ新しい入れ物ではなく、まったく同じものを返す。
     * こうしておくと、開き直すたびに保存と再描画が走るのを止められる。
     */
    const record = markVisited(EMPTY_RECORD, KNOWN_CITY)
    expect(markVisited(record, KNOWN_CITY)).toBe(record)
  })

  it('上限を超えたら古いものから落ちる', () => {
    let record: StudyRecord = EMPTY_RECORD
    for (const city of CITIES) record = markVisited(record, city.id)
    // 都市は 34 件なので、上限まで足りるよう作り話の id も足す
    for (let i = 0; i < 20; i += 1) record = markVisited(record, `extra${String(i)}`)

    expect(record.visited).toHaveLength(VISITED_LIMIT)
    expect(record.visited[0]).toBe('extra19')
  })

  it('もとの記録を書きかえない', () => {
    const before = markVisited(EMPTY_RECORD, KNOWN_CITY)
    markVisited(before, ANOTHER_CITY)
    expect(before.visited).toEqual([KNOWN_CITY])
  })
})

describe('recordAnswer', () => {
  it('正解すると、といた数と正解数がどちらも増える', () => {
    const record = recordAnswer(EMPTY_RECORD, 'city', true, 1)
    expect(record.total).toBe(1)
    expect(record.correct).toBe(1)
    expect(record.byKind.city).toEqual({ asked: 1, correct: 1 })
  })

  it('間違えると、といた数だけ増える', () => {
    const record = recordAnswer(EMPTY_RECORD, 'flag', false, 0)
    expect(record.total).toBe(1)
    expect(record.correct).toBe(0)
    expect(record.byKind.flag).toEqual({ asked: 1, correct: 0 })
  })

  it('答えた種類だけが増える', () => {
    const record = recordAnswer(EMPTY_RECORD, 'locate', true, 1)
    expect(record.byKind.locate.asked).toBe(1)
    expect(record.byKind.city.asked).toBe(0)
    expect(record.byKind.flag.asked).toBe(0)
    expect(record.byKind.time.asked).toBe(0)
  })

  it('最高の連続正解が更新される', () => {
    let record = recordAnswer(EMPTY_RECORD, 'city', true, 3)
    expect(record.best).toBe(3)

    // 連続が途切れても最高記録は下がらない
    record = recordAnswer(record, 'city', false, 0)
    expect(record.best).toBe(3)

    record = recordAnswer(record, 'city', true, 5)
    expect(record.best).toBe(5)
  })

  it('見た都市には触らない', () => {
    const before = markVisited(EMPTY_RECORD, KNOWN_CITY)
    expect(recordAnswer(before, 'city', true, 1).visited).toBe(before.visited)
  })

  it('もとの記録を書きかえない', () => {
    const before = recordAnswer(EMPTY_RECORD, 'city', true, 1)
    recordAnswer(before, 'city', true, 2)
    expect(before.total).toBe(1)
    expect(before.byKind.city.asked).toBe(1)
  })
})

describe('accuracy', () => {
  it('1問も解いていなければ null', () => {
    // 0% と「まだ解いていない」は別のこと。画面で書き分けられるようにする
    expect(accuracy(0, 0)).toBeNull()
  })

  it('割り切れないときは四捨五入する', () => {
    expect(accuracy(3, 2)).toBe(67)
    expect(accuracy(3, 1)).toBe(33)
  })

  it('全問正解は 100', () => {
    expect(accuracy(7, 7)).toBe(100)
  })
})
