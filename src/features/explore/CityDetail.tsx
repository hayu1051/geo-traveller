import type { City } from '../../data/types.ts'
import {
  describePhase,
  formatDiffShort,
  formatDiffText,
  formatLatitude,
  formatLongitude,
  formatMeridianGap,
  formatPopulation,
} from '../../lib/format.ts'
import {
  diffMin,
  formatLocalDate,
  formatLocalTime,
  meridianGap,
  standardMeridian,
  zonedParts,
} from '../../lib/time.ts'
import { useNow } from '../../lib/useNow.ts'
import styles from './CityDetail.module.css'

/*
 * 選んだ都市の「今」。
 *
 * 現在時刻を出すので 1 秒ごとに作り直される。useNow をこのコンポーネントで
 * 呼んでいるのは、都市を選んでいないときや検索欄を打っているときに
 * 毎秒の再レンダリングを起こさないため。
 */

/** 時差の基準。このアプリは日本の子ども向けなので日本に固定する */
const BASE_TZ = 'Asia/Tokyo'
const BASE_LABEL = '日本'

type Props = {
  city: City
  onBack: () => void
}

function CityDetail({ city, onBack }: Props) {
  const now = useNow()

  const diff = diffMin(BASE_TZ, city.tz, now)
  const phase = describePhase(zonedParts(city.tz, now).hour)

  /*
   * 「実際の経度」と「標準時の経線」を並べて出すのがこの画面の主題。
   * マドリードは西経 3.7 度にありながら時計は東経 15 度に合わせてあり、
   * その 19 度のずれが日の入りの遅さになって現れる。まとめてはいけない。
   */
  const facts: { key: string; value: string }[] = [
    { key: '人口', value: formatPopulation(city.pop) },
    { key: '緯度', value: formatLatitude(city.lat) },
    { key: '実際の経度', value: formatLongitude(city.lng) },
    { key: '標準時の経線', value: formatLongitude(standardMeridian(city.tz, now)) },
    { key: '経線とのずれ', value: formatMeridianGap(meridianGap(city.lng, city.tz, now)) },
    { key: '大陸', value: city.cont },
    { key: '言語', value: city.lang },
    { key: '通貨', value: city.cur },
  ]

  return (
    <div className={styles.detail}>
      <div className={styles.head}>
        <div className={styles.flag}>{city.flag}</div>
        <div className={styles.names}>
          <h2 className={styles.nameJa}>{city.nameJa}</h2>
          <div className={styles.nameSub}>
            {city.nameLocal} ・ {city.country}
          </div>
        </div>
        <button type="button" className={styles.back} onClick={onBack}>
          戻る
        </button>
      </div>

      <div className={styles.clock}>
        <div className={styles.clockCell}>
          <div className={styles.caption}>現地の時刻</div>
          <div className={styles.time}>{formatLocalTime(city.tz, now)}</div>
          <div className={styles.date}>{formatLocalDate(city.tz, now)}</div>
        </div>
        <div className={styles.clockCell}>
          <div>
            <div className={styles.caption}>日本との時差</div>
            <div className={styles.diffNum}>{formatDiffShort(diff)}</div>
          </div>
          <div className={styles.diffText}>{formatDiffText(diff, BASE_LABEL)}</div>
        </div>
      </div>

      <div className={styles.phase}>
        <span className={styles.phaseLabel}>今は {phase.label}</span>
        <span className={styles.phaseNote}>{phase.note}</span>
      </div>

      <div className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact.key} className={styles.fact}>
            <div className={styles.factKey}>{fact.key}</div>
            <div className={styles.factValue}>{fact.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.trivia}>
        <div className={styles.triviaTitle}>ミニ豆知識</div>
        <p className={styles.triviaText}>{city.trivia}</p>
      </div>
    </div>
  )
}

export default CityDetail
