import { CITIES, findCity } from '../../data/cities.ts'
import type { City } from '../../data/types.ts'
import {
  describeDayShift,
  formatDiffShort,
  formatDiffText,
  formatDistance,
  formatEastWestGap,
  formatHemisphere,
  formatLatitude,
  formatLongitude,
  formatMeridianGap,
  formatPopulation,
} from '../../lib/format.ts'
import { distanceKm, nearestEquivalentAngle } from '../../lib/geo.ts'
import {
  dayShift,
  diffMin,
  formatLocalDate,
  formatLocalTime,
  meridianGap,
  standardMeridian,
} from '../../lib/time.ts'
import { useNow } from '../../lib/useNow.ts'
import styles from './ComparePanel.module.css'
import type { Pair, PairSlot } from './selection.ts'

/*
 * 比較モード。2 つの都市を並べて、距離と時差の関係を見せる。
 *
 * A / B の選択は App が持つ。地球儀のピンからも都市の一覧からも同じ値を触るので、
 * どちらか一方に置くと片方が知らないままになる。
 *
 * このモードの主題は「実際の経度」と「標準時の経線」が別物だということ。
 * 2 つの差を同じ向き・同じ単位で並べて、ずれの大きさが見えるようにしてある。
 */

type Props = {
  pair: Pair
  onChooseCity: (id: string) => void
  onClearSlot: (slot: PairSlot) => void
  onActivateSlot: (slot: PairSlot) => void
}

const SLOTS: { slot: PairSlot; label: string }[] = [
  { slot: 'a', label: 'A' },
  { slot: 'b', label: 'B' },
]

/** 選んでいる途中の枠 1 つ */
function Slot({
  label,
  city,
  active,
  onActivate,
  onClear,
}: {
  label: string
  city: City | undefined
  active: boolean
  onActivate: () => void
  onClear: () => void
}) {
  const className = [styles.slot, active ? styles.slotActive : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <div className={styles.slotHead}>
        <span className={styles.slotLabel}>{label}</span>
        {active && <span className={styles.slotBadge}>えらび中</span>}
        {city && (
          <button
            type="button"
            className={styles.slotClear}
            aria-label={`${label} の ${city.nameJa} を外す`}
            onClick={onClear}
          >
            ✕
          </button>
        )}
      </div>

      {/* 中身が絵文字と名前に分かれているので、読み上げ用に枠の名前を付け直す */}
      <button
        type="button"
        className={styles.slotBody}
        aria-pressed={active}
        aria-label={`${label}：${city ? city.nameJa : 'まだえらんでいません'}`}
        onClick={onActivate}
      >
        {city ? (
          <>
            <span className={styles.slotFlag}>{city.flag}</span>
            <span className={styles.slotName}>{city.nameJa}</span>
          </>
        ) : (
          <span className={styles.slotEmpty}>まだ えらんでいません</span>
        )}
      </button>
    </div>
  )
}

/** 都市の一覧。地球儀のピンが押しにくいときのため、パネルからも選べるようにする */
function CityChoices({
  pair,
  onChoose,
}: {
  pair: Pair
  onChoose: (id: string) => void
}) {
  return (
    <div className={styles.choices}>
      <div className={styles.sectionTitle}>都市をえらぶ</div>
      <div className={styles.choiceGrid}>
        {CITIES.map((city) => {
          const mark = city.id === pair.aId ? 'A' : city.id === pair.bId ? 'B' : ''
          const className = [styles.choice, mark ? styles.choiceTaken : '']
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={city.id}
              type="button"
              className={className}
              onClick={() => {
                onChoose(city.id)
              }}
            >
              <span className={styles.choiceFlag}>{city.flag}</span>
              <span className={styles.choiceName}>{city.nameJa}</span>
              {mark && <span className={styles.choiceMark}>{mark}</span>}
            </button>
          )
        })}
      </div>
      <p className={styles.choiceHint}>
        地球儀のピンを押しても えらべます。
        <br />
        もう一度おすと 外れます。
      </p>
    </div>
  )
}

/**
 * そろった 2 都市の比べもの。
 *
 * 現地時刻を出すので 1 秒ごとに作り直される。useNow をここで呼んでいるのは、
 * 都市をえらんでいる途中の画面まで毎秒描き直さないため。
 */
function Comparison({ a, b }: { a: City; b: City }) {
  const now = useNow()

  const diff = diffMin(a.tz, b.tz, now)
  const shift = dayShift(a.tz, b.tz, now)

  /*
   * 標準時の経線の差。時差から決まるので、東回りか西回りかが最初から定まっている。
   * 東京とニューヨークなら「西へ 210 度」で、これが時差 14 時間ぶんにあたる。
   */
  const meridianDiff = standardMeridian(b.tz, now) - standardMeridian(a.tz, now)

  /*
   * 実際の経度の差。
   *
   * こちらは東回りにも西回りにも書けてしまうので、標準時の経線の差と
   * 同じ回り方に揃える。揃えないと「西へ 210 度」と「東へ 146 度」が並び、
   * 2 つの数字を比べられなくなる。
   */
  const lngDiff = nearestEquivalentAngle(b.lng - a.lng, meridianDiff)

  const km = distanceKm(a, b)

  const headline = [
    { key: '2都市の距離', value: formatDistance(km), note: '地球の表面にそった最短の道' },
    { key: '今の時差', value: formatDiffShort(diff), note: formatDiffText(diff, a.nameJa) },
    {
      key: '実際の経度の違い',
      value: formatEastWestGap(lngDiff),
      note: `${a.nameJa}から見た${b.nameJa}の向き`,
    },
    {
      key: '標準時の経線の違い',
      value: formatEastWestGap(meridianDiff),
      note: '15°で 1時間',
    },
  ]

  const rows: { key: string; a: string; b: string }[] = [
    { key: '現地の時刻', a: formatLocalTime(a.tz, now), b: formatLocalTime(b.tz, now) },
    { key: '現地の日付', a: formatLocalDate(a.tz, now), b: formatLocalDate(b.tz, now) },
    { key: '実際の経度', a: formatLongitude(a.lng), b: formatLongitude(b.lng) },
    {
      key: '標準時の経線',
      a: formatLongitude(standardMeridian(a.tz, now)),
      b: formatLongitude(standardMeridian(b.tz, now)),
    },
    {
      key: '経線とのずれ',
      a: formatMeridianGap(meridianGap(a.lng, a.tz, now)),
      b: formatMeridianGap(meridianGap(b.lng, b.tz, now)),
    },
    { key: '緯度', a: formatLatitude(a.lat), b: formatLatitude(b.lat) },
    { key: '半球', a: formatHemisphere(a.lat), b: formatHemisphere(b.lat) },
    { key: '人口', a: formatPopulation(a.pop), b: formatPopulation(b.pop) },
    { key: '大陸', a: a.cont, b: b.cont },
    { key: '言語', a: a.lang, b: b.lang },
    { key: '通貨', a: a.cur, b: b.cur },
  ]

  return (
    <>
      <div className={styles.headline}>
        {headline.map((item) => (
          <div key={item.key} className={styles.headlineCell}>
            <div className={styles.caption}>{item.key}</div>
            <div className={styles.headlineValue}>{item.value}</div>
            <div className={styles.headlineNote}>{item.note}</div>
          </div>
        ))}
      </div>

      <section className={styles.dayShift}>
        <div className={styles.sectionTitle}>日付のずれ</div>
        <p className={styles.dayShiftLead}>
          {a.nameJa}が {formatLocalDate(a.tz, now)} のとき、{describeDayShift(shift, b.nameJa)}。
        </p>
        <p className={styles.dayShiftText}>
          地球は西から東へ回っているので、東にある場所ほど先に朝がきます。
          だから東へ進むほど時計は進み、ぐるっと一周すると 24 時間も進んでしまいます。
          そうならないように、太平洋の上に「日付変更線」が引いてあります。
          この線をまたぐと、時計はそのままで日付だけが 1 日ずれます。
          {shift !== 0 &&
            `${a.nameJa}と${b.nameJa}は この線をはさんだ反対がわにあるので、同じ時刻でも日付が違います。`}
        </p>
      </section>

      <section className={styles.table}>
        <div className={styles.sectionTitle}>くらべてみる</div>
        <div className={styles.tableHead}>
          <span />
          <span className={styles.tableCityA}>
            {a.flag} {a.nameJa}
          </span>
          <span className={styles.tableCityB}>
            {b.flag} {b.nameJa}
          </span>
        </div>
        {rows.map((row) => (
          <div key={row.key} className={styles.tableRow}>
            <span className={styles.tableKey}>{row.key}</span>
            <span className={styles.tableValue}>{row.a}</span>
            <span className={styles.tableValue}>{row.b}</span>
          </div>
        ))}
      </section>
    </>
  )
}

function ComparePanel({ pair, onChooseCity, onClearSlot, onActivateSlot }: Props) {
  const a = pair.aId === null ? undefined : findCity(pair.aId)
  const b = pair.bId === null ? undefined : findCity(pair.bId)

  return (
    <div className={styles.panel}>
      <div className={styles.slots}>
        {SLOTS.map(({ slot, label }) => (
          <Slot
            key={slot}
            label={label}
            city={slot === 'a' ? a : b}
            active={pair.active === slot}
            onActivate={() => {
              onActivateSlot(slot)
            }}
            onClear={() => {
              onClearSlot(slot)
            }}
          />
        ))}
      </div>

      {/*
       * 2 都市そろったら、都市の一覧は出さない。
       *
       * 選び終えたあとの一覧は使い道が無いのに 34 件ぶんの高さがあり、
       * 比べたい中身がその上に押し上げられてしまう。
       * 入れ替えたくなったら枠の ✕ で空ければ、また一覧が出る。
       * 地球儀のピンはいつでも押せるので、選び直す道が塞がることはない。
       */}
      {a && b ? (
        <Comparison a={a} b={b} />
      ) : (
        <>
          <p className={styles.lead}>2つの都市をえらぶと、距離と時差のかんけいが出ます。</p>
          <CityChoices pair={pair} onChoose={onChooseCity} />
        </>
      )}
    </div>
  )
}

export default ComparePanel
