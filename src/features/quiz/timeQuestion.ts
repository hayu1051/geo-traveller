import type { City } from '../../data/types.ts'
import { formatClockWithDay, formatDiffText, formatLongitude } from '../../lib/format.ts'
import { distanceKm } from '../../lib/geo.ts'
import { offMin, standardMeridian, standardOffMin } from '../../lib/time.ts'
import { pick, shuffle } from './random.ts'
import { CHOICE_COUNT, type Choice, type QuestionOptions, type Question } from './types.ts'

/*
 * 時差計算クイズ。都市あて・国旗と違い、答えが都市ではなく時刻になる。
 *
 * 出す形は2つ。
 *
 *   1. 「東京が9時のとき、ロンドンは何時？」……時差をたすだけ
 *   2. 「東京を18時に出発、13時間の飛行でロンドンに着く。着くのは何時？」
 *      ……出発時刻＋飛行時間を出してから時差をたす
 *
 * 計算はすべて「その日の 0 時から数えた分数」で行う。24 時間で折り返す処理を
 * 途中に挟むと日付のずれが消えてしまい、日をまたぐ問題が作れなくなる。
 * 折り返すのは最後、文字列にするときの formatClockWithDay 1か所だけ。
 */

const MINUTES_PER_HOUR = 60

/** 出発時刻の候補。きりのよい時刻にして、たし算そのものでつまずかないようにする */
export const START_HOURS = [6, 9, 12, 15, 18]

/** 飛行機のはやさ（km/h）。おおよその巡航速度 */
const PLANE_SPEED_KMH = 850

/** 飛行時間の下限と上限（時間）。実際の路線から離れすぎない範囲に収める */
const MIN_FLIGHT_HOURS = 2
const MAX_FLIGHT_HOURS = 15

/** 飛行機の問題を出す割合 */
const FLIGHT_RATIO = 0.5

/** 正解の前後にずらしただけの誤答（分）。もっともらしい誤答が足りないときに使う */
const FILLER_GAPS = [-180, -120, -60, 60, 120, 180]

/**
 * 2都市の間の飛行時間（分）。大圏距離を巡航速度で割った、ざっくりした値。
 * 実際の路線は回り道や風で前後するが、計算問題として扱えればよいので丸める。
 */
function flightMinutes(from: City, to: City): number {
  const hours = Math.round(distanceKm(from, to) / PLANE_SPEED_KMH)
  return Math.min(Math.max(hours, MIN_FLIGHT_HOURS), MAX_FLIGHT_HOURS) * MINUTES_PER_HOUR
}

/**
 * 出発側の都市を選ぶ。
 *
 * 時差ゼロの組（東京とソウルなど）でも問題は作れてしまうが、
 * 計算するところが無くなるので避ける。候補が尽きるのは都市データが
 * 1件しかないときだけなので、そのときは同じ都市で作って落ちないようにする。
 */
function chooseFrom(to: City, options: QuestionOptions): City {
  const { cities, date, rng } = options

  const others = cities.filter((city) => city.id !== to.id)
  const shifted = others.filter((city) => offMin(city.tz, date) !== offMin(to.tz, date))
  const candidates = shifted.length > 0 ? shifted : others

  return candidates.length > 0 ? pick(candidates, rng) : to
}

/**
 * サマータイム中の都市があれば、ヒントに断りを入れる。
 *
 * ヒントは標準時の経線を手がかりにさせるが、サマータイム中の国は
 * その経線より時計が進んでいる。ひとこと足しておかないと、
 * 経線から計算した時刻と正解が食い違って見えてしまう。
 * 夏のヨーロッパは丸ごとここに当たるので、めったに起きない話ではない。
 */
function summerTimeNote(cities: City[], date: Date): string {
  const notes = cities
    .filter((city) => offMin(city.tz, date) !== standardOffMin(city.tz, date))
    .map((city) => {
      const shift = (offMin(city.tz, date) - standardOffMin(city.tz, date)) / MINUTES_PER_HOUR
      return `${city.nameJa}は ${String(shift)}時間`
    })

  if (notes.length === 0) return ''
  return `ただし今はサマータイム中で、${notes.join('、')} 経線より時計が進んでいます。`
}

/**
 * 誤答の時刻を作る。正解と重なるもの、同じ文字列になるものは落とす。
 *
 * 時差が 12 時間ちょうどの組では「逆向きにたした」答えが正解と同じ時計の読みになるが、
 * 日付のことばが付いているので別の文字列になり、選択肢としては成り立つ。
 */
function wrongLabels(totals: number[], answer: string): string[] {
  const seen = new Set([answer])
  const labels: string[] = []

  for (const total of totals) {
    const label = formatClockWithDay(total)
    if (seen.has(label)) continue
    seen.add(label)
    labels.push(label)
  }

  return labels
}

export function timeQuestion(to: City, options: QuestionOptions): Question {
  const { date, rng } = options

  const from = chooseFrom(to, options)
  const diff = offMin(to.tz, date) - offMin(from.tz, date)
  const startMin = pick(START_HOURS, rng) * MINUTES_PER_HOUR
  const flightMin = rng() < FLIGHT_RATIO ? flightMinutes(from, to) : 0
  const answerMin = startMin + flightMin + diff

  /*
   * 誤答は「やりがちな計算まちがい」をそのまま並べる。
   * 適当にずらした時刻より、選んでしまったときに自分のつまずきが分かる。
   * とくに時差を逆向きにたす間違いは多いので、どちらの形でも必ず入れる。
   */
  const mistakes =
    flightMin > 0
      ? [
          startMin + flightMin, // 時差を足し忘れた
          startMin + flightMin - diff, // 時差を逆向きに足した
          startMin + diff, // 飛行時間を足し忘れた
        ]
      : [startMin - diff] // 時差を逆向きに足した

  const fillers = shuffle(FILLER_GAPS, rng).map((gap) => answerMin + gap)
  const answer = formatClockWithDay(answerMin)
  const wrong = wrongLabels([...mistakes, ...fillers], answer).slice(0, CHOICE_COUNT - 1)

  const choices: Choice[] = shuffle([answer, ...wrong], rng).map((time) => ({
    id: time,
    label: time,
  }))

  const startHour = String(startMin / MINUTES_PER_HOUR)
  const flightHours = String(flightMin / MINUTES_PER_HOUR)
  /** 「ロンドンは 東京より 9時間 遅れています」 */
  const diffText = `${to.nameJa}は ${formatDiffText(diff, from.nameJa)}`

  return {
    kind: 'time',
    text:
      flightMin > 0
        ? `飛行機で ${from.nameJa}を現地時間の${startHour}時に出発し、${flightHours}時間の飛行で ${to.nameJa}に着きます。着くのは現地時間で何時でしょう？`
        : `${from.nameJa}が${startHour}時のとき、${to.nameJa}は何時でしょう？`,
    hint:
      (flightMin > 0 ? '「出発時刻＋飛行時間」を出してから、時差をたしましょう。' : '') +
      `${from.nameJa}の標準時の経線は ${formatLongitude(standardMeridian(from.tz, date))}、${to.nameJa}は ${formatLongitude(standardMeridian(to.tz, date))}。経線が15°ちがうと、時刻は1時間ずれます。` +
      summerTimeNote([from, to], date),
    choices,
    answerId: answer,
    explain:
      flightMin > 0
        ? `出発の${startHour}時に飛行時間${flightHours}時間をたすと、${from.nameJa}の時刻で ${formatClockWithDay(startMin + flightMin)}。${diffText}。だから答えは ${answer} です。`
        : `${diffText}。だから答えは ${answer} です。`,
    /*
     * 題材の都市は答える側にする。間違えたときに積まれるのも、
     * 答え合わせのあと地球儀が回るのもこちら。
     */
    cityId: to.id,
  }
}
