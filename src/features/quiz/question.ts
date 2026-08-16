import type { City } from '../../data/types.ts'
import { formatHemisphere, formatPopulation } from '../../lib/format.ts'
import { pick, sample, shuffle, type Rng } from './random.ts'
import type { Choice, Question, QuizKind } from './types.ts'

/*
 * 出題を作る。画面を持たない純粋関数。
 *
 * 都市データと乱数だけを受け取り、同じ入力からは同じ問題ができる。
 * 「選択肢に必ず答えが入っている」「同じラベルが2つ並ばない」といった規則を
 * 画面を開かずにテストで固定するため、ここに切り出してある。
 *
 * 難易度（hard）は今回入れていない。入れるときは QuestionOptions に足せば済み、
 * 呼び出し側の作りは変えなくてよい。
 */

/** 選択肢の数 */
const CHOICE_COUNT = 4

export type QuestionOptions = {
  kind: QuizKind
  cities: City[]
  /** この都市で作る。null なら選び直す。間違えた問題の再出題で使う */
  cityId: string | null
  /** 直前に出した都市。同じ問題が続かないよう候補から外す */
  excludeCityId: string | null
  rng: Rng
}

/**
 * 国名が同じ、または一方がもう一方を含むか。
 *
 * 香港の国名は「中国（香港）」で、北京の「中国」とは別の文字列。
 * そのまま選択肢に並べると、どちらも中国に見えて答えが2つある問題になってしまう。
 */
function sharesCountry(a: string, b: string): boolean {
  return a.includes(b) || b.includes(a)
}

/** 題材の都市を決める。再出題の指定があればそれを優先する */
function chooseCity(options: QuestionOptions): City {
  const { cities, cityId, excludeCityId, rng } = options

  if (cityId !== null) {
    const found = cities.find((city) => city.id === cityId)
    if (found) return found
  }

  const candidates = cities.filter((city) => city.id !== excludeCityId)
  // 都市が1件しかないときだけ候補が空になる。そのときは連続を許す
  return pick(candidates.length > 0 ? candidates : cities, rng)
}

function cityQuestion(city: City, options: QuestionOptions): Question {
  const { cities, rng } = options

  /*
   * ヒントに国名は入れない。通貨がほぼ同じ情報を持っているうえ、
   * 「円（JPY）」から日本にたどり着く方が、詳細画面で見た項目とつながる。
   */
  const text = `ここは${formatHemisphere(city.lat)}、${city.cont}にあります。人口は${formatPopulation(city.pop)}。使われているお金は ${city.cur}。どこの都市でしょう？`

  // 都市名は重複しないので、ここでは国のような絞り込みは要らない
  const others = cities.filter((other) => other.id !== city.id)
  const choices: Choice[] = shuffle(
    [city, ...sample(others, CHOICE_COUNT - 1, rng)],
    rng,
  ).map((item) => ({ id: item.id, label: item.nameJa }))

  return {
    kind: 'city',
    text,
    /*
     * ミニ豆知識をヒントとして出す。
     * 半球・大陸・人口・通貨だけでは、知らない都市になると手がかりが数字ばかりになり
     * 当てずっぽうになってしまう。その都市らしい話をひとつ添えて、考える取っかかりを作る。
     */
    hint: city.trivia,
    choices,
    answerId: city.id,
    /*
     * 豆知識はヒントとして問題側に出してあるので、ここでは繰り返さない。
     * 同じ文が画面に2つ並ぶと、どちらを読めばよいのか分からなくなる。
     * かわりに現地表記を出して、答え合わせのときに新しいことが1つ増えるようにする。
     */
    explain: `${city.nameJa}（${city.country}）です。現地では ${city.nameLocal} と書きます。`,
    cityId: city.id,
  }
}

function flagQuestion(city: City, options: QuestionOptions): Question {
  const { cities, rng } = options

  /*
   * 選択肢は国名なので、国が重なった時点で答えが決まらなくなる。
   * アメリカ合衆国はニューヨーク・ロサンゼルス・ホノルルの3都市があるため、
   * 都市をそのまま並べると同じ国名が2つ出る。国ごとに1都市へ間引く。
   */
  const seen = new Set<string>()
  const others = cities.filter((other) => {
    if (sharesCountry(other.country, city.country)) return false
    if (seen.has(other.country)) return false
    seen.add(other.country)
    return true
  })

  const choices: Choice[] = shuffle(
    [city, ...sample(others, CHOICE_COUNT - 1, rng)],
    rng,
  ).map((item) => ({ id: item.id, label: item.country }))

  return {
    kind: 'flag',
    /*
     * 「どこの国」ではなく「国・地域」と聞く。
     * 香港は国ではないので、国名を答えさせる形にすると問題が成り立たない。台湾も同じ。
     */
    text: 'この旗はどこの国・地域でしょう？',
    flag: city.flag,
    choices,
    answerId: city.id,
    explain: `${city.flag} は ${city.country} の旗。おもな都市は ${city.nameJa} です。`,
    cityId: city.id,
  }
}

export function createQuestion(options: QuestionOptions): Question {
  const city = chooseCity(options)
  return options.kind === 'city' ? cityQuestion(city, options) : flagQuestion(city, options)
}
