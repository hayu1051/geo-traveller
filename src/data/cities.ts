import type { City } from './types.ts'

/*
 * 最小データの8件。33件への拡充は #11 で行う。
 * 数を減らすのではなく、時差の境界例を拾うように選んである（Issue #3）。
 *
 *   東京           基準（日本との時差 0）
 *   ニューヨーク    日付が前日になる
 *   ロンドン        UTC±0。時差の基準
 *   マドリード      実経度 -3.7° に対し標準時経線 15°。ずれが最大級
 *   ニューデリー    UTC+5:30。30分刻みのオフセット
 *   シドニー        南半球、日付が翌日
 *   カイロ          アフリカ、ライブ映像なし（yt 省略の検証）
 *   リオデジャネイロ 南アメリカ、南半球
 *
 * 6大陸すべてを埋めているので、大陸フィルタもこの8件で動く。
 * マドリード以外は原案から移植。マドリードは原案に無いため新規に作成した。
 */
export const CITIES: City[] = [
  {
    id: 'tokyo',
    nameJa: '東京',
    yomi: 'とうきょう',
    nameLocal: 'Tokyo',
    country: '日本',
    flag: '🇯🇵',
    lat: 35.68,
    lng: 139.69,
    pop: 3700,
    tz: 'Asia/Tokyo',
    cont: 'アジア',
    lang: '日本語',
    cur: '円（JPY）',
    trivia:
      '電車に乗る人の数が世界でいちばん多い都市です。新宿駅は「世界一いそがしい駅」としてギネス世界記録にのっています。',
    yt: 'dfVK7ld38Ys',
    ytNote: '渋谷スクランブル交差点（FNNプライムオンライン）',
  },
  {
    id: 'newyork',
    nameJa: 'ニューヨーク',
    yomi: 'にゅーよーく',
    nameLocal: 'New York',
    country: 'アメリカ合衆国',
    flag: '🇺🇸',
    lat: 40.71,
    lng: -74.01,
    pop: 1900,
    tz: 'America/New_York',
    cont: '北アメリカ',
    lang: '英語',
    cur: 'ドル（USD）',
    trivia:
      '日本との時差はおよそ14時間。日本が朝のとき、ニューヨークは前の日の夜です。',
    yt: 'z-jYdOIKcTQ',
    ytNote: 'タイムズスクエア（EarthCam）',
  },
  {
    id: 'london',
    nameJa: 'ロンドン',
    yomi: 'ろんどん',
    nameLocal: 'London',
    country: 'イギリス',
    flag: '🇬🇧',
    lat: 51.51,
    lng: -0.13,
    pop: 900,
    tz: 'Europe/London',
    cont: 'ヨーロッパ',
    lang: '英語',
    cur: 'ポンド（GBP）',
    trivia:
      '経度0度の線（本初子午線）が通る街。世界の時刻はここを基準に決められています。',
    yt: 'M3EYAY2MftI',
    ytNote: 'アビイ・ロードの横断歩道（EarthCam）',
  },
  {
    // 原案に無いため新規作成。実経度と標準時経線のずれを見せるための都市
    id: 'madrid',
    nameJa: 'マドリード',
    yomi: 'まどりーど',
    nameLocal: 'Madrid',
    country: 'スペイン',
    flag: '🇪🇸',
    lat: 40.42,
    lng: -3.7,
    pop: 670,
    tz: 'Europe/Madrid',
    cont: 'ヨーロッパ',
    lang: 'スペイン語',
    cur: 'ユーロ（EUR）',
    trivia:
      'ロンドンより西にあるのに、時計はドイツやイタリアと同じで1時間進んでいます。そのため日の入りがとても遅くなります。',
  },
  {
    id: 'delhi',
    nameJa: 'ニューデリー',
    yomi: 'にゅーでりー',
    nameLocal: 'New Delhi',
    country: 'インド',
    flag: '🇮🇳',
    lat: 28.61,
    lng: 77.21,
    pop: 3200,
    tz: 'Asia/Kolkata',
    cont: 'アジア',
    lang: 'ヒンディー語・英語',
    cur: 'ルピー（INR）',
    trivia: 'インドの時差は30分刻み。日本との差は3時間30分です。',
  },
  {
    id: 'sydney',
    nameJa: 'シドニー',
    yomi: 'しどにー',
    nameLocal: 'Sydney',
    country: 'オーストラリア',
    flag: '🇦🇺',
    lat: -33.87,
    lng: 151.21,
    pop: 530,
    tz: 'Australia/Sydney',
    cont: 'オセアニア',
    lang: '英語',
    cur: '豪ドル（AUD）',
    trivia:
      '日本より時間が進んでいて、日付が先に変わります。南半球なので、日本が冬のときは夏です。',
    yt: 'KPrrWB1eo1I',
    ytNote: 'ハーバーブリッジとオペラハウス（Sydney Live Camera）',
  },
  {
    // ライブ映像が無い都市。yt / ytNote はキーごと省略する
    id: 'cairo',
    nameJa: 'カイロ',
    yomi: 'かいろ',
    nameLocal: 'القاهرة',
    country: 'エジプト',
    flag: '🇪🇬',
    lat: 30.04,
    lng: 31.24,
    pop: 2200,
    tz: 'Africa/Cairo',
    cont: 'アフリカ',
    lang: 'アラビア語',
    cur: 'エジプトポンド（EGP）',
    trivia: 'すぐ近くにギザのピラミッドがあります。',
  },
  {
    id: 'rio',
    nameJa: 'リオデジャネイロ',
    yomi: 'りおでじゃねいろ',
    nameLocal: 'Rio de Janeiro',
    country: 'ブラジル',
    flag: '🇧🇷',
    lat: -22.91,
    lng: -43.17,
    pop: 1200,
    tz: 'America/Sao_Paulo',
    cont: '南アメリカ',
    lang: 'ポルトガル語',
    cur: 'レアル（BRL）',
    trivia:
      '南半球の都市。日本とはきっかり12時間の時差があり、昼と夜がちょうど逆になります。',
    yt: '2PJfQY9LUoU',
    ytNote: 'コパカバーナ海岸（EarthCam）',
  },
]

/** id から都市を引く。見つからなければ undefined */
export function findCity(id: string): City | undefined {
  return CITIES.find((city) => city.id === id)
}
