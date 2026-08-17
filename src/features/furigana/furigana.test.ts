import { describe, expect, it } from 'vitest'
import { CITIES } from '../../data/cities.ts'
import { createQuestion } from '../quiz/question.ts'
import { QUIZ_KINDS } from '../quiz/types.ts'
import { furiganaWords, splitFurigana, UNLISTED_KANJI } from './furigana.ts'

/*
 * ふりがなの切り分け。
 *
 * 出しても間違っていたら意味が無いので、確かめたいのは主に「出さない」判断の方。
 * 熟語を1文字だけ切っていないか、長い語より短い語を先に取っていないか。
 */

const KANJI = /[一-鿿]/

/** 切り分けた結果を「都市(とし)は」の形にする。読みまで一目で見える */
function show(text: string): string {
  return splitFurigana(text)
    .map((segment) => (segment.yomi === null ? segment.text : `${segment.text}(${segment.yomi})`))
    .join('')
}

describe('splitFurigana', () => {
  it('もとの文字列を組み立て直せる', () => {
    // 何よりこれが崩れると、画面の文が変わってしまう
    for (const text of ['都市をえらぶ', '16:38', '', 'ABC', '東京（日本）はどこでしょう？']) {
      expect(splitFurigana(text).map((s) => s.text).join(''), text).toBe(text)
    }
  })

  it('漢字が無ければ、そのまま1つのかたまりで返す', () => {
    expect(splitFurigana('16:38')).toEqual([{ text: '16:38', yomi: null }])
  })

  it('見出し語に読みが付く', () => {
    expect(show('この都市は')).toBe('この都市(とし)は')
  })

  it('1つの文にいくつでも付く', () => {
    expect(show('現地の時刻と時差')).toBe('現地(げんち)の時刻(じこく)と時差(じさ)')
  })

  describe('長い語を先に取る', () => {
    it('日本語を「日本」と「語」に割らない', () => {
      expect(show('日本語')).toBe('日本語(にほんご)')
    })

    it('大都市を「大」と「都市」に割らない', () => {
      expect(show('大都市')).toBe('大都市(だいとし)')
    })

    it('都市はそのまま取れる', () => {
      expect(show('都市')).toBe('都市(とし)')
    })
  })

  describe('1文字の見出し語', () => {
    it('となりが漢字なら見送る', () => {
      // 「約」に「やく」を付ける表があっても、熟語の一部なら手を出さない
      expect(show('予約')).toBe('予約')
    })

    it('ひらがなにはさまれていれば取る', () => {
      expect(show('約 3,700万人')).toBe('約(やく) 3,700万人(まんにん)')
    })

    it('すでに拾った語の直後なら取る', () => {
      /*
       * 「高」の前は「一」だが、それは「世界一」として読みが付いている。
       * 熟語を切っているわけではないので見送らない。
       */
      expect(show('世界一高いビル')).toBe('世界一(せかいいち)高(たか)いビル')
    })

    it('直後から別の見出し語が始まるなら取る', () => {
      expect(show('昔東西に分かれていた街')).toBe(
        '昔(むかし)東西(とうざい)に分かれ(わかれ)ていた街(まち)',
      )
    })
  })

  describe('読みが割れる漢字', () => {
    it('「日」だけでは読みを付けない', () => {
      // 「8月13日」にち と「次の日」ひ を1つの読みでは書けない
      expect(show('8月13日（木）')).toBe('8月13日（木）')
    })

    it('「次の日」はまとまりで取る', () => {
      expect(show('次の日の 02:00')).toBe('次の日(つぎのひ)の 02:00')
    })

    it('「同じ日の」と「同じ日付」を取り違えない', () => {
      // 「同じ日」で切ると、日付が「日」＋「付」に割れて読めなくなる
      expect(show('同じ日の 21:00')).toBe('同じ日の(おなじひの) 21:00')
      expect(show('ロンドンも 同じ日付です')).toBe('ロンドンも 同じ(おなじ)日付(ひづけ)です')
    })

    it('曜日の漢字には付けない', () => {
      // 「金」を「かね」にすると（金）が読めなくなる。「お金」はまとまりで取る
      expect(show('（金）')).toBe('（金）')
      expect(show('使われているお金は')).toBe('使(つか)われているお金(おかね)は')
    })
  })
})

describe('対応表', () => {
  const words = furiganaWords()

  it('見出し語が重複しない', () => {
    expect(new Set(words).size).toBe(words.length)
  })

  it('見出し語に正規表現の記号が入っていない', () => {
    // 表をつないで正規表現にするので、記号が混ざると意図しない形になる
    for (const word of words) {
      expect(word, word).not.toMatch(/[.*+?^${}()|[\]\\]/)
    }
  })

  it('どの見出し語にも漢字が入っている', () => {
    // ひらがなだけの見出しは、ふりがなを付ける相手がいない
    for (const word of words) {
      expect(KANJI.test(word), word).toBe(true)
    }
  })

  it('読みがひらがなかカタカナだけ', () => {
    for (const word of words) {
      expect(show(word), word).toMatch(/\(([ぁ-ゖァ-ヺー]+)\)/)
    }
  })
})

describe('画面に出る文字列', () => {
  /*
   * 完了条件の「全画面の漢字にふりがなが付く」を、データの側から押さえる。
   * 都市を足したときに新しい漢字が入ってきたら、ここで気づける。
   */

  function uncoveredKanji(text: string): string[] {
    const found: string[] = []
    for (const segment of splitFurigana(text)) {
      if (segment.yomi !== null) continue
      for (const char of segment.text) {
        if (KANJI.test(char) && !UNLISTED_KANJI.includes(char)) found.push(char)
      }
    }
    return found
  }

  it('都市データのすべての漢字に読みがある', () => {
    for (const city of CITIES) {
      for (const text of [city.nameJa, city.country, city.lang, city.cur, city.trivia]) {
        expect(uncoveredKanji(text), `${city.nameJa}: ${text}`).toEqual([])
      }
    }
  })

  it('ライブ映像の説明にも読みがある', () => {
    for (const city of CITIES) {
      if (city.ytNote === undefined) continue
      expect(uncoveredKanji(city.ytNote), city.nameJa).toEqual([])
    }
  })

  it('クイズの問題文・ヒント・解説に読みがある', () => {
    const date = new Date('2026-08-17T12:00:00Z')
    for (const kind of QUIZ_KINDS) {
      for (const city of CITIES) {
        const question = createQuestion({
          kind,
          cities: CITIES,
          cityId: city.id,
          excludeCityId: null,
          date,
          rng: Math.random,
        })
        for (const text of [question.text, question.hint ?? '', question.explain]) {
          expect(uncoveredKanji(text), `${kind} / ${city.nameJa}: ${text}`).toEqual([])
        }
      }
    }
  })
})
