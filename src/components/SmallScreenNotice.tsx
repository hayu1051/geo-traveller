import { useEffect, useRef } from 'react'
import Furi from '../features/furigana/Furi.tsx'
import styles from './SmallScreenNotice.module.css'

/*
 * スマホで開いたときの案内。
 *
 * 止めるのではなく、すすめるだけにしてある。スマホしか持っていない子を
 * 閉め出すと、そもそもこのアプリに触れなくなる。
 * 「使えるが、こちらの方が見やすい」と伝えて、あとは本人に選ばせる。
 *
 * 出すかどうかを決めるのは App。ここは中身だけを持つ。
 */

/** 見出しと dialog を結ぶ id。読み上げが何のダイアログか言えるようにする */
const TITLE_ID = 'small-screen-notice-title'

type Props = {
  onClose: () => void
}

function SmallScreenNotice({ onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // 開いたらボタンに焦点を移す。Enter だけで閉じられる
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    /*
     * Escape は画面のどこを触っていても効いてほしいので、
     * カードではなく document で受ける。
     */
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-labelledby={TITLE_ID}>
      <div className={styles.card}>
        {/*
          言うことが端末で変わる。
          指で触る端末なら「もっと大きい端末で」だが、パソコンで窓を狭めている人に
          それを言っても仕方がない。その人に必要なのは「窓を広げて」の一言。
          どちらを出すかは CSS が選ぶ。GlobeLegend の使いかたの表示と同じ作り。
        */}
        <h2 className={styles.title} id={TITLE_ID}>
          <span className={styles.touch}>
            <Furi>タブレット・パソコンでの利用を推奨します</Furi>
          </span>
          <span className={styles.mouse}>
            <Furi>ウィンドウの幅を広げると見やすくなります</Furi>
          </span>
        </h2>

        <p className={styles.text}>
          <Furi>画面が狭いため、地球儀のピンが押しにくくなります。</Furi>
        </p>
        <p className={styles.text}>
          <span className={styles.touch}>
            <Furi>タブレットやパソコンで開くと、地球儀が大きく表示され、見やすくなります。</Furi>
          </span>
          <span className={styles.mouse}>
            <Furi>ウィンドウを広げると、地球儀が大きく表示され、見やすくなります。</Furi>
          </span>
        </p>

        <button ref={closeRef} type="button" className={styles.close} onClick={onClose}>
          <Furi>このまま使う</Furi>
        </button>
      </div>
    </div>
  )
}

export default SmallScreenNotice
