import { useEffect, useRef, useState } from 'react'
import { CITIES } from '../data/cities.ts'
import { createGlobe, type Globe } from '../globe/globe.ts'
import styles from './GlobeStage.module.css'

/** ボタン 1 回あたりのズーム量。カメラの距離を動かすので + が引き、- が寄る */
const ZOOM_STEP = 0.35

function GlobeStage() {
  const hostRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<Globe | null>(null)
  const [spin, setSpin] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const globe = createGlobe(host, {
      cities: CITIES,
      onSpinChange: setSpin,
      onSelectCity: setSelectedId,
    })
    globeRef.current = globe

    return () => {
      globe.dispose()
      globeRef.current = null
    }
  }, [])

  /*
   * 選択が変わったときだけ地球儀へ伝える。
   * 逆に、地球儀の中で毎フレーム動いている値をここへ持ち込んではいけない。
   * state になった瞬間に 1 秒 60 回の再レンダリングが始まる。
   */
  useEffect(() => {
    globeRef.current?.setPinState({
      selectedId,
      compareAId: null,
      compareBId: null,
      hideNames: false,
    })
  }, [selectedId])

  function toggleSpin() {
    const next = !spin
    setSpin(next)
    globeRef.current?.setSpin(next)
  }

  return (
    <section className={styles.stage}>
      <div ref={hostRef} className={styles.host} />

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.control}
          onClick={() => globeRef.current?.zoomBy(-ZOOM_STEP)}
          aria-label="拡大"
        >
          +
        </button>
        <button
          type="button"
          className={styles.control}
          onClick={() => globeRef.current?.zoomBy(ZOOM_STEP)}
          aria-label="縮小"
        >
          −
        </button>
        <button
          type="button"
          className={`${styles.control} ${styles.controlText}`}
          onClick={toggleSpin}
          aria-pressed={spin}
        >
          {spin ? '停止' : '回す'}
        </button>
      </div>
    </section>
  )
}

export default GlobeStage
