/*
 * 画面に出す文字列を作る。
 *
 * time.ts との境目は「タイムゾーンと日付が要るかどうか」。
 * その時点の時差が何分かを求めるのは time.ts、求まった分数を
 * 「日本より13時間遅れています」に直すのはここ。
 * こちらは数値しか受け取らないので、いつのどこの話でも同じように使える。
 *
 * 対象は小学生〜中学生なので、語彙をやさしく保つこと。
 */

const MINUTES_PER_HOUR = 60

/** 時差の説明文。「日本より 13時間 遅れています」の形 */
export function formatDiffText(minutes: number, baseLabel: string): string {
  if (minutes === 0) return `${baseLabel}と同じ時刻です`

  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / MINUTES_PER_HOUR)
  const rest = abs % MINUTES_PER_HOUR
  const amount = `${String(hours)}時間${rest ? `${String(rest)}分` : ''}`

  return `${baseLabel}より ${amount} ${minutes > 0 ? '進んでいます' : '遅れています'}`
}

/**
 * 時差の見出し。「+9h」「−3.5h」「±0h」の形。
 *
 * 30 分ちょうどのずれ（インドなど）は 3.5 と小数で書く方が直感的なので分けている。
 * それ以外の半端な分（ネパールの 45 分など）は 5:45 のように時計と同じ書き方にする。
 */
export function formatDiffShort(minutes: number): string {
  const sign = minutes > 0 ? '+' : minutes < 0 ? '−' : '±'
  const abs = Math.abs(minutes)
  const hours = Math.floor(abs / MINUTES_PER_HOUR)
  const rest = abs % MINUTES_PER_HOUR

  if (rest === 0) return `${sign}${String(hours)}h`
  if (rest === 30) return `${sign}${String(hours)}.5h`
  return `${sign}${String(hours)}:${String(rest).padStart(2, '0')}h`
}

/** 経度。「東経 139.7°」の形 */
export function formatLongitude(degrees: number): string {
  const rounded = Math.round(degrees * 10) / 10
  return `${rounded >= 0 ? '東経' : '西経'} ${String(Math.abs(rounded))}°`
}

/** 緯度。「北緯 35.7°」の形 */
export function formatLatitude(degrees: number): string {
  const rounded = Math.round(degrees * 10) / 10
  return `${rounded >= 0 ? '北緯' : '南緯'} ${String(Math.abs(rounded))}°`
}

/**
 * 都市の位置が標準時の経線からどれだけ離れているかの説明。
 *
 * このアプリの主題のひとつ。「時計が合わせてある経線」と「実際に住んでいる場所」は
 * 別物で、離れているほど日の出や日の入りの時刻が時計とずれる。
 */
export function formatMeridianGap(degrees: number): string {
  const rounded = Math.round(degrees)
  if (Math.abs(rounded) <= 1) return 'ほぼぴったり'
  return `経線より${rounded > 0 ? '西' : '東'}に ${String(Math.abs(rounded))}°`
}

/** 人口。データは万人単位なので「約 3,700万人」になる */
export function formatPopulation(inTenThousands: number): string {
  return `約 ${inTenThousands.toLocaleString('ja-JP')}万人`
}

export type Phase = {
  /** 朝・昼・夜・深夜 */
  label: string
  /** 何時ごろを指すかの補足 */
  note: string
}

/**
 * その時刻が 1 日のどのあたりか。
 * 実際に日が出ているかではなく、時計の上での区切り。
 * 「同じ 8 時でも国によって朝だったり夜だったり」を伝えるのが目的。
 */
export function describePhase(hour: number): Phase {
  if (hour >= 5 && hour < 11) return { label: '朝', note: '朝5時〜11時ごろ' }
  if (hour >= 11 && hour < 17) return { label: '昼', note: '昼11時〜17時ごろ' }
  if (hour >= 17 && hour < 22) return { label: '夜', note: '夜17時〜22時ごろ' }
  return { label: '深夜', note: '深夜22時〜朝5時ごろ' }
}
