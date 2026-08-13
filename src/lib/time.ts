/*
 * 時刻と時差の計算。画面を持たない純粋関数だけを置く。
 *
 * 日付ライブラリは使わず、Intl.DateTimeFormat に IANA タイムゾーンを渡して
 * 得たパーツから計算する。サマータイムの切り替え日は国ごとに違ううえ法律で変わるため
 * （エジプトは 2014 年に廃止して 2023 年に復活した）、自前で一覧を持つのは現実的でない。
 * ブラウザが持っている一覧に任せる。
 *
 * すべての関数が date を受け取るのは、サマータイムのせいで
 * 「東京とニューヨークの時差」が日付を決めないと定まらないため（冬 14 時間 / 夏 13 時間）。
 */

const WEEKDAY_JA: Record<string, string> = {
  Mon: '月',
  Tue: '火',
  Wed: '水',
  Thu: '木',
  Fri: '金',
  Sat: '土',
  Sun: '日',
}

export type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 日本語の曜日1文字。月・火・水… */
  weekday: string
}

function partValue(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  const found = parts.find((part) => part.type === type)
  if (!found) throw new Error(`${type} を取り出せませんでした`)
  return found.value
}

/** その場所での年月日時分秒と曜日。他の関数はすべてこれを土台にする */
export function zonedParts(tz: string, date: Date): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date)

  const weekdayEn = partValue(parts, 'weekday')

  return {
    year: Number(partValue(parts, 'year')),
    month: Number(partValue(parts, 'month')),
    day: Number(partValue(parts, 'day')),
    // 深夜 0 時が 24 と返る環境があるため 24 を 0 に寄せる
    hour: Number(partValue(parts, 'hour')) % 24,
    minute: Number(partValue(parts, 'minute')),
    second: Number(partValue(parts, 'second')),
    weekday: WEEKDAY_JA[weekdayEn] ?? weekdayEn,
  }
}

/**
 * UTC からのずれ（分）。サマータイム中はその分も含んだ値になる。
 *
 * 現地の年月日時分を UTC の時刻として組み直し、本当の時刻との差を取る。
 * 例: UTC が 7/15 0:00 のとき、マドリードは 7/15 2:00 → +120
 */
export function offMin(tz: string, date: Date): number {
  const z = zonedParts(tz, date)
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second)
  // ミリ秒を落として、差がちょうど分単位になるようにする
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000)
}

/**
 * サマータイムを除いた、その国本来の UTC からのずれ（分）。
 *
 * サマータイムは必ず時計を進める制度なので、同じ年の 1 月と 7 月を調べて
 * 小さい方を取れば元の値になる。北半球（夏に進む）でも南半球（1 月に進む）でも成り立つ。
 */
export function standardOffMin(tz: string, date: Date): number {
  const year = zonedParts(tz, date).year
  const january = offMin(tz, new Date(Date.UTC(year, 0, 15)))
  const july = offMin(tz, new Date(Date.UTC(year, 6, 15)))
  return Math.min(january, july)
}

/** 現地時刻。16:38 の形 */
export function formatLocalTime(tz: string, date: Date): string {
  const z = zonedParts(tz, date)
  return `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`
}

/** 現地の日付。8月13日（木）の形 */
export function formatLocalDate(tz: string, date: Date): string {
  const z = zonedParts(tz, date)
  return `${z.month}月${z.day}日（${z.weekday}）`
}

/**
 * その国が定めた標準時の経線（度）。東が + 、西が - 。
 * スペインなら年中 15（東経15°）。サマータイムでは動かない。
 */
export function standardMeridian(tz: string, date: Date): number {
  return (standardOffMin(tz, date) / 60) * 15
}

/**
 * 今の時計が合っている経線（度）。サマータイム中は標準時の経線より東へずれる。
 * 夏のマドリードなら 30。日の入りが遅くなる理由がこの値。
 */
export function clockMeridian(tz: string, date: Date): number {
  return (offMin(tz, date) / 60) * 15
}

/**
 * 都市の実経度と標準時の経線の差（度）。
 * + なら都市は経線より西、- なら東にある。マドリードは約 +18.7。
 */
export function meridianGap(lng: number, tz: string, date: Date): number {
  const gap = standardMeridian(tz, date) - lng
  // 経度 180 度をまたぐ都市（シドニーなど）で 300 度のような値にならないよう畳む
  return ((gap + 540) % 360) - 180
}

/** from から見た to の時差（分）。to が進んでいれば + */
export function diffMin(fromTz: string, toTz: string, date: Date): number {
  return offMin(toTz, date) - offMin(fromTz, date)
}

/**
 * 同じ瞬間に、to の日付が from より何日ずれているか。-1 / 0 / +1 を返す。
 * 日本が 8/13 の朝のとき、ニューヨークはまだ 8/12 なので -1。
 */
export function dayShift(fromTz: string, toTz: string, date: Date): number {
  const a = zonedParts(fromTz, date)
  const b = zonedParts(toTz, date)
  const dayA = Date.UTC(a.year, a.month - 1, a.day)
  const dayB = Date.UTC(b.year, b.month - 1, b.day)
  return Math.round((dayB - dayA) / 86400000)
}
