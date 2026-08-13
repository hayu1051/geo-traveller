export const CONTINENTS = [
  'アジア',
  'ヨーロッパ',
  'アフリカ',
  '北アメリカ',
  '南アメリカ',
  'オセアニア',
] as const

export type Continent = (typeof CONTINENTS)[number]

/*
 * フィールド名はデザイン原案（Geo Traveller.dc.html）の CITIES に合わせている。
 * lng / pop / cont のような短い名前は読みやすさでは不利だが、原案からロジックを
 * 移植するときに書き換えが要らない利点を取った。
 */
export type City = {
  id: string
  /** 日本語の都市名。画面に出る名前 */
  nameJa: string
  /** ふりがな用の読み。ひらがな（#16 と検索で使う） */
  yomi: string
  /** 現地表記。東京なら Tokyo、カイロなら القاهرة */
  nameLocal: string
  country: string
  /** 国旗の絵文字 */
  flag: string
  /** 緯度。北が + 、南が - */
  lat: number
  /** 経度。東が + 、西が - 。都市の「実際の」経度で、標準時の経線とは別物 */
  lng: number
  /** 都市圏の人口（万人） */
  pop: number
  /** IANA タイムゾーン。Intl.DateTimeFormat にそのまま渡す */
  tz: string
  cont: Continent
  lang: string
  cur: string
  /** 豆知識。探索モードで表示する */
  trivia: string
  /** ライブ映像の YouTube ID。無い都市ではキーごと省略する */
  yt?: string
  /** ライブ映像の説明。yt があるときだけ持つ */
  ytNote?: string
}
