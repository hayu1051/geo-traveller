import { useEffect, useRef, useState } from 'react'
import { CITIES } from '../data/cities.ts'
import type { Continent } from '../data/types.ts'
import { createGlobe, type Globe } from '../globe/globe.ts'
import GlobeLegend from './GlobeLegend.tsx'
import styles from './GlobeStage.module.css'

/** ボタン 1 回あたりのズーム量。カメラの距離を動かすので + が引き、- が寄る */
const ZOOM_STEP = 0.35

/**
 * 大陸を選んだときに向ける方角。
 * 大陸の重心ではなく、その大陸が画面に収まって見える位置を目で決めた値。
 */
const CONTINENT_VIEW: Record<Continent, { lat: number; lng: number }> = {
  アジア: { lat: 28, lng: 100 },
  ヨーロッパ: { lat: 50, lng: 12 },
  アフリカ: { lat: 2, lng: 20 },
  北アメリカ: { lat: 38, lng: -98 },
  南アメリカ: { lat: -16, lng: -60 },
  オセアニア: { lat: -25, lng: 145 },
}

/** 大陸を見るときは都市よりも引く */
const CONTINENT_ZOOM = 3.4

type Props = {
  selectedId: string | null
  continent: Continent | null
  onSelectCity: (id: string | null) => void
}

function GlobeStage({ selectedId, continent, onSelectCity }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<Globe | null>(null)
  const [spin, setSpin] = useState(true)

  /*
   * ピンのクリックで呼ぶ関数を ref に入れておく。
   *
   * 地球儀は 1 度しか作らないので、createGlobe に渡した関数はずっと使われ続ける。
   * 親から新しい関数が来ても差し替わるように、実体ではなく入れ物を渡す。
   */
  const selectRef = useRef(onSelectCity)
  useEffect(() => {
    selectRef.current = onSelectCity
  }, [onSelectCity])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const globe = createGlobe(host, {
      cities: CITIES,
      onSpinChange: setSpin,
      onSelectCity: (id) => {
        selectRef.current(id)
      },
    })
    globeRef.current = globe

    return () => {
      globe.dispose()
      globeRef.current = null
    }
  }, [])

  /*
   * ピンの見た目。選択や大陸が変わったときだけ伝える。
   * 逆に、地球儀の中で毎フレーム動いている値をここへ持ち込んではいけない。
   * state になった瞬間に 1 秒 60 回の再レンダリングが始まる。
   */
  useEffect(() => {
    globeRef.current?.setPinState({
      selectedId,
      compareAId: null,
      compareBId: null,
      hideNames: false,
      continent,
    })
  }, [selectedId, continent])

  // 都市を選んだらそこへ回す
  useEffect(() => {
    if (selectedId === null) return
    const city = CITIES.find((item) => item.id === selectedId)
    if (city) globeRef.current?.flyTo(city.lat, city.lng)
  }, [selectedId])

  // 大陸を選んだらその大陸へ回す
  useEffect(() => {
    if (continent === null) return
    const view = CONTINENT_VIEW[continent]
    globeRef.current?.flyTo(view.lat, view.lng, CONTINENT_ZOOM)
  }, [continent])

  function toggleSpin() {
    const next = !spin
    setSpin(next)
    globeRef.current?.setSpin(next)
  }

  return (
    <section className={styles.stage}>
      <div ref={hostRef} className={styles.host} />

      <GlobeLegend />

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
