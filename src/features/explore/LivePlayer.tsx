import { useState } from 'react'
import type { City } from '../../data/types.ts'
import Furi from '../furigana/Furi.tsx'
import styles from './LivePlayer.module.css'

/*
 * ライブ映像。
 *
 * 停止処理を書いていないのは、書かなくても止まる作りにしてあるため。
 * iframe は再生ボタンを押したあとだけ描画され、タブを切り替えると
 * 探索パネルごとアンマウントされて DOM から消える。消えれば音も止まる。
 * 「止め忘れ」が起こりうる経路を残さないのが狙い（Issue #9 の注意書き）。
 *
 * 都市を選び直したときも、親が key に都市 id を渡すことで作り直される。
 */

const THUMBNAIL_BASE = 'https://i.ytimg.com/vi/'
const EMBED_BASE = 'https://www.youtube.com/embed/'
const WATCH_BASE = 'https://www.youtube.com/watch?v='
const SEARCH_BASE = 'https://www.youtube.com/results?search_query='

type Props = {
  city: City
}

function LivePlayer({ city }: Props) {
  const [playing, setPlaying] = useState(false)

  if (city.yt === undefined) {
    const searchUrl =
      SEARCH_BASE + encodeURIComponent(`${city.nameLocal} live cam 24/7`)

    return (
      <section className={styles.live}>
        <div className={styles.header}>
          <span className={styles.caption}>
            <Furi>ライブ映像</Furi>
          </span>
        </div>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>
            <Furi>ライブカメラは準備中です</Furi>
          </div>
          <div className={styles.emptyText}>
            <Furi>この都市の配信はこれから選びます。</Furi>
            <Furi>今は</Furi> YouTube <Furi>で探せます。</Furi>
          </div>
          <a
            className={styles.searchLink}
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube<Furi>で探す</Furi> →
          </a>
        </div>
      </section>
    )
  }

  /*
   * mute=1 が要る。音つきの自動再生はブラウザに止められるので、
   * 付けないと再生ボタンを押しても何も始まらないことがある。
   * playsinline=1 はスマホで勝手に全画面にならないようにするため。
   */
  const embedUrl = `${EMBED_BASE}${city.yt}?rel=0&autoplay=1&mute=1&playsinline=1`

  return (
    <section className={styles.live}>
      <div className={styles.header}>
        <span className={styles.caption}>
            <Furi>ライブ映像</Furi>
          </span>
        <span className={styles.badge}>LIVE</span>
      </div>

      {playing ? (
        <div className={styles.frame}>
          <iframe
            className={styles.iframe}
            src={embedUrl}
            title={`${city.nameJa}のライブ映像`}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.frame} ${styles.thumbButton}`}
          style={{ backgroundImage: `url("${THUMBNAIL_BASE}${city.yt}/maxresdefault.jpg")` }}
          onClick={() => {
            setPlaying(true)
          }}
        >
          <span className={styles.playLabel}>
            ▶ <Furi>ライブを見る</Furi>
          </span>
        </button>
      )}

      <div className={styles.foot}>
        <span className={styles.note}>
          {city.ytNote !== undefined && <Furi>{city.ytNote}</Furi>}
        </span>
        <a
          className={styles.watchLink}
          href={WATCH_BASE + city.yt}
          target="_blank"
          rel="noopener noreferrer"
        >
          YouTube<Furi>で見る</Furi>
        </a>
      </div>
    </section>
  )
}

export default LivePlayer
