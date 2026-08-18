import Furi from '../features/furigana/Furi.tsx'
import { LEGEND_COLORS } from '../globe/paintTexture.ts'
import { PIN_PATH_D } from '../globe/pins.ts'
import styles from './GlobeLegend.module.css'

/*
 * 地球儀の色が何を表しているかの説明。
 *
 * 色は CSS に書き写さず paintTexture.ts から受け取る。同じ色を 2 か所に書くと、
 * 地図の配色を変えたときに凡例だけ古い色のまま残る。
 */

const SWATCHES: { color: string; label: string }[] = [
  { color: LEGEND_COLORS.nightOcean, label: '夜の海' },
  { color: LEGEND_COLORS.dayOcean, label: '昼の海' },
  { color: LEGEND_COLORS.terminator, label: '昼と夜の境目' },
  { color: LEGEND_COLORS.equator, label: '赤道' },
]

function GlobeLegend() {
  return (
    <div className={styles.legend}>
      {/*
        使いかたは端末で変わる。指で触る端末にはホイールが無いので、
        ホイールと書いてあると拡大する方法が一生見つからない。

        両方を書いておいて、CSS がその端末に合う方だけを出す。
        JS で 1 つに決めてしまうと、マウスと指の両方が使えるノート PC で
        どちらかが嘘になる。
      */}
      <p className={styles.hint}>
        <span className={styles.hintMouse}>
          <Furi>ドラッグで回転</Furi> / <Furi>ホイールで拡大</Furi>
        </span>
        <span className={styles.hintTouch}>
          <Furi>指で回転</Furi> / <Furi>つまんで拡大</Furi>
        </span>
      </p>

      <ul className={styles.items}>
        {SWATCHES.map((swatch) => (
          <li key={swatch.label} className={styles.item}>
            <span
              className={styles.swatch}
              style={{ background: swatch.color }}
              aria-hidden="true"
            />
            <Furi>{swatch.label}</Furi>
          </li>
        ))}

        <li className={styles.item}>
          <svg className={styles.pinIcon} viewBox="0 0 22 30" aria-hidden="true">
            <path d={PIN_PATH_D} />
            <circle cx="11" cy="10.5" r="3" />
          </svg>
          <Furi>ライブ映像あり</Furi>
        </li>
      </ul>
    </div>
  )
}

export default GlobeLegend
