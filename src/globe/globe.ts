import * as THREE from 'three'
import type { City } from '../data/types.ts'
import type { LatLng } from '../lib/geo.ts'
import { createArcLayer } from './arc.ts'
import { loadWorldShapes, type WorldShapes } from './geoData.ts'
import { paintGlobe } from './paintTexture.ts'
import { createPinLayer, type PinLayer, type PinState } from './pins.ts'

/*
 * 地球儀の描画。React の外側で動く。
 *
 * 毎フレーム走る処理なので、React の state を経由させると 1 秒に 60 回
 * 再レンダリングが起きる。そのため three.js の初期化・描画ループ・後始末を
 * ここに閉じ込め、React 側とは createGlobe が返す操作だけでやり取りする。
 *
 * 回転はカメラではなく group.rotation（yaw / pitch）で表す。
 * ズームは camera.position.z を動かす。#8 の都市ピンはこのカメラで
 * 3D 座標をスクリーン座標へ投影するので、この方式は変えないこと。
 */

/*
 * テクスチャの大きさ。横は縦の 2 倍でないと正距円筒図法として成立しない。
 * 2048 は緯線経線の文字が読める下限で、4096 にすると描き直しが目に見えて遅くなる。
 */
const TEXTURE_WIDTH = 2048
const TEXTURE_HEIGHT = 1024

const ZOOM_MIN = 1.55
const ZOOM_MAX = 6

/*
 * 最初のカメラの距離。
 * 画角 42 度なので上下に収まる限界は 21 度で、この距離だと球は 16.1 度に収まる。
 * 近づけすぎると球が画面の上下に見切れ、#8 の都市ピンも画面外に出てしまう。
 */
const ZOOM_INITIAL = 3.6

/** 自動回転の速さ（ラジアン / フレーム） */
const SPIN_SPEED = 0.0011

/** 真上・真下を越えて裏返らないよう、上下の回転を止める角度 */
const PITCH_LIMIT = 1.45

const DRAG_SENSITIVITY = 0.006
const WHEEL_SENSITIVITY = 0.0018

/*
 * ピンチ 1px あたりのズーム量。
 * 指を 200px 広げると 1.6 ぶん寄る。ズームの幅は 1.55〜6 の 4.45 しかないので、
 * これより大きくすると一度のピンチで端まで行ってしまう。
 */
const PINCH_SENSITIVITY = 0.008

/*
 * キー 1 回あたりの動く量。
 * 矢印は約 7 度で、押しっぱなしのリピートで地球儀 1 周が 2 秒ほどになる。
 */
const KEY_ROTATE = 0.12
const KEY_ZOOM = 0.3

/** 都市を選んだときに寄る距離。初期位置よりは近く、地図が読める程度 */
const FLY_TO_ZOOM = 3.0

/**
 * flyTo で 1 フレームに詰める距離の割合。
 * 残りの 12% ずつ縮めるので、最初は速く、近づくほどゆっくり止まる。
 */
const FLY_TO_EASING = 0.12

/** 目標との差がこれ以下になったら到着とみなす（ラジアン） */
const FLY_TO_ARRIVED = 0.002

/*
 * 昼夜の境界を描き直す間隔。
 *
 * 境界が動く速さは 1 分あたり経度 0.25 度で、2048px のテクスチャ上では 1.4px しかない。
 * 一方 1 回の描き直しは地図を 2 度描くので、フレームを落とすほどの重さがある。
 * 短くしても見た目は変わらず引っかかりだけ増えるため、分単位にしている。
 */
const REPAINT_INTERVAL_MS = 60000

export type Globe = {
  /** 自動回転の ON / OFF */
  setSpin: (spin: boolean) => void
  /** ズーム。+ で引き、- で寄る */
  zoomBy: (delta: number) => void
  /** 指定した緯度経度が正面に来るまで、なめらかに回す */
  flyTo: (lat: number, lng: number, zoom?: number) => void
  /** ピンの見た目を更新する。選択が変わったときだけ呼ぶ */
  setPinState: (state: PinState) => void
  /** 比較モードの弧。片方でも null なら消える */
  setCompareArc: (a: LatLng | null, b: LatLng | null) => void
  /** 描画ループを止めて three.js の資源を解放する */
  dispose: () => void
}

export type GlobeOptions = {
  /** ドラッグで自動回転が解除されたときに呼ばれる。React 側のボタン表示を合わせるため */
  onSpinChange?: (spin: boolean) => void
  /** ピンを出す都市。渡さなければピンは出ない */
  cities?: City[]
  /** ピンが押されたときに呼ばれる */
  onSelectCity?: (id: string) => void
}

export function createGlobe(host: HTMLElement, options: GlobeOptions = {}): Globe {
  const width = host.clientWidth || 800
  const height = host.clientHeight || 600

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(width, height)

  const canvas = renderer.domElement
  canvas.style.cursor = 'grab'
  canvas.style.display = 'block'
  /*
   * これが無いとスマホでドラッグがページのスクロールに奪われる。
   * none にすると 2 本指のピンチもブラウザに取られなくなるので、
   * 画面ごと拡大されずに地球儀のズームとして受け取れる。
   */
  canvas.style.touchAction = 'none'

  /*
   * キーボードでも回せるように、tab で止まる場所にする。
   * canvas はもともと操作できる要素ではないので、何ができるかを自分で名乗る。
   */
  canvas.tabIndex = 0
  canvas.setAttribute('role', 'application')
  canvas.setAttribute(
    'aria-label',
    '地球儀。矢印キーで回して、+ と - で近づいたり遠ざかったりできます',
  )

  host.appendChild(canvas)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
  camera.position.set(0, 0, ZOOM_INITIAL)

  const group = new THREE.Group()
  group.rotation.order = 'XYZ'
  scene.add(group)

  // ----- テクスチャ -----

  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = TEXTURE_WIDTH
  textureCanvas.height = TEXTURE_HEIGHT
  const textureCtx = textureCanvas.getContext('2d')

  const texture = new THREE.CanvasTexture(textureCanvas)
  // これが無いと色が沈んで見える
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4

  let shapes: WorldShapes | null = null
  let lastPaint = 0

  function paint() {
    if (!textureCtx) return
    paintGlobe(textureCtx, TEXTURE_WIDTH, TEXTURE_HEIGHT, shapes, new Date())
    texture.needsUpdate = true
    lastPaint = performance.now()
  }

  const geometry = new THREE.SphereGeometry(1, 72, 54)
  const material = new THREE.MeshBasicMaterial({ map: texture })
  group.add(new THREE.Mesh(geometry, material))

  // 取得を待たずに緯線経線だけの状態を先に出す
  paint()

  /*
   * 地図データの取得。失敗しても緯線経線だけの表示が残るので、
   * 画面が真っ白になることはない。
   */
  const abort = new AbortController()
  loadWorldShapes(abort.signal)
    .then((loaded) => {
      shapes = loaded
      paint()
    })
    .catch(() => {
      // オフラインや CDN 障害。フォールバックのまま続ける
    })

  const view = { yaw: 0, pitch: 0, zoom: ZOOM_INITIAL }
  let spin = true

  /** flyTo の行き先。到着するか、手で操作されたら null に戻る */
  let target: { yaw: number; pitch: number; zoom: number } | null = null

  // ----- 比較モードの弧 -----

  /*
   * group に入れているので、地球儀を回すと弧も一緒に回る。
   * ピンのように毎フレーム位置を計算し直す必要は無い。
   */
  const arcLayer = createArcLayer(group)

  // ----- 都市ピン -----

  /*
   * ピンの投影に使うので、今の表示サイズを持っておく。
   * 毎フレーム getBoundingClientRect() で測るとレイアウト計算が走るため、
   * ResizeObserver が教えてくれる値を覚えておいて使い回す。
   */
  let viewWidth = width
  let viewHeight = height

  const pinLayer: PinLayer | null = options.cities
    ? createPinLayer({
        host,
        cities: options.cities,
        camera,
        group,
        onSelect: options.onSelectCity ?? (() => undefined),
      })
    : null

  // ----- 操作 -----

  /** 手で動かしたら自動回転はやめる。ボタンの表示も合わせる */
  function stopSpin() {
    if (!spin) return
    spin = false
    options.onSpinChange?.(false)
  }

  /*
   * 触れている指。
   *
   * 1 本なら回転、2 本ならピンチでズームになるので、本数を数える必要がある。
   * マウスも 1 本の指として同じ道を通る。
   */
  const pointers = new Map<number, { x: number; y: number }>()

  /** 直前のピンチの指の間隔（px）。指が 2 本そろっていない間は null */
  let pinchGap: number | null = null

  /** 今そろっている 2 本の指の間隔。2 本ないときは null */
  function currentGap(): number | null {
    const [a, b] = [...pointers.values()]
    if (!a || !b) return null
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  function onPointerDown(event: PointerEvent) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    canvas.setPointerCapture(event.pointerId)
    canvas.style.cursor = 'grabbing'
    pinchGap = currentGap()
  }

  function onPointerMove(event: PointerEvent) {
    const before = pointers.get(event.pointerId)
    // 押していない指の通過。マウスを乗せているだけのときはここで抜ける
    if (!before) return
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    // 手で動かし始めたら、都市へ向かう動きは止めて操作を優先する
    target = null
    stopSpin()

    /*
     * 指が 2 本あるときはズームだけにして、回転は混ぜない。
     * 両方いっぺんに効かせると、寄せたつもりが地球儀ごと傾いてしまう。
     */
    const gap = currentGap()
    if (gap !== null) {
      if (pinchGap !== null) zoomBy((pinchGap - gap) * PINCH_SENSITIVITY)
      pinchGap = gap
      return
    }

    view.yaw += (event.clientX - before.x) * DRAG_SENSITIVITY
    view.pitch += (event.clientY - before.y) * DRAG_SENSITIVITY
    view.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, view.pitch))
  }

  function onPointerUp(event: PointerEvent) {
    pointers.delete(event.pointerId)
    /*
     * 2 本から 1 本になった直後は、残った指の位置が古いままのことがある。
     * その差をそのまま回転に使うと画面が飛ぶので、間隔を捨てて測り直させる。
     */
    pinchGap = null
    if (pointers.size === 0) canvas.style.cursor = 'grab'
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()
    zoomBy(event.deltaY * WHEEL_SENSITIVITY)
  }

  /*
   * キーボードでの操作。
   *
   * 向きはドラッグと同じにしてある。→ を押すと、指で右へ引いたときと同じ向きに回る。
   * 「地球儀をつかんで動かす」の感覚をキーでもそのまま使えるようにするため。
   */
  function onKeyDown(event: KeyboardEvent) {
    let yaw = 0
    let pitch = 0
    let zoom = 0

    switch (event.key) {
      case 'ArrowLeft':
        yaw = -KEY_ROTATE
        break
      case 'ArrowRight':
        yaw = KEY_ROTATE
        break
      case 'ArrowUp':
        pitch = -KEY_ROTATE
        break
      case 'ArrowDown':
        pitch = KEY_ROTATE
        break
      // JIS 配列の + は Shift + ; だが、event.key には '+' として届く
      case '+':
      case '=':
        zoom = -KEY_ZOOM
        break
      case '-':
        zoom = KEY_ZOOM
        break
      default:
        return
    }

    // 矢印キーはふつうページを送る。地球儀が受け取ったぶんは渡さない
    event.preventDefault()

    if (zoom !== 0) {
      zoomBy(zoom)
      return
    }

    target = null
    stopSpin()
    view.yaw += yaw
    view.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, view.pitch + pitch))
  }

  function zoomBy(delta: number) {
    // 手でズームしたら、都市へ向かう動きは止める
    target = null
    view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, view.zoom + delta))
  }

  /**
   * 指定した場所を正面に持ってくる。
   *
   * 瞬間移動させず、毎フレーム少しずつ近づける。子どもが「今どこからどこへ動いたか」を
   * 目で追えることが大事なので、途中経過が見える方式にしている。
   */
  function flyTo(lat: number, lng: number, zoom = FLY_TO_ZOOM) {
    /*
     * 緯度経度を回転角に直す。テクスチャの貼り方に合わせてあるので、
     * coords.ts の latLngToVector3 と同じ約束で動いている。
     */
    let yaw = (-(lng + 90) * Math.PI) / 180
    const pitch = (lat * Math.PI) / 180

    /*
     * 近い方へ回す。
     * 今 170 度、目標が -170 度のとき、そのまま補間すると 340 度ぶん逆回りしてしまう。
     * 差が半周を超えないところまで 360 度ずつ足し引きしておく。
     */
    while (yaw - view.yaw > Math.PI) yaw -= 2 * Math.PI
    while (view.yaw - yaw > Math.PI) yaw += 2 * Math.PI

    target = { yaw, pitch, zoom: Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom)) }

    // 動いている最中に自動回転が混ざると、いつまでも着かない
    if (spin) {
      spin = false
      options.onSpinChange?.(false)
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('keydown', onKeyDown)

  // ----- 大きさの追従 -----

  const resizeObserver = new ResizeObserver(() => {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    viewWidth = w
    viewHeight = h
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(host)

  // ----- 描画ループ -----

  let raf = 0

  function loop(now: number) {
    raf = requestAnimationFrame(loop)

    // 昼夜の境界を進める。描き直しは重いので毎フレームはやらない
    if (now - lastPaint > REPAINT_INTERVAL_MS) paint()

    if (target) {
      // 残りの差を毎フレーム一定の割合だけ詰める。近づくほど遅くなる
      view.yaw += (target.yaw - view.yaw) * FLY_TO_EASING
      view.pitch += (target.pitch - view.pitch) * FLY_TO_EASING
      view.zoom += (target.zoom - view.zoom) * FLY_TO_EASING
      if (Math.abs(target.yaw - view.yaw) < FLY_TO_ARRIVED) target = null
    } else if (spin) {
      view.yaw += SPIN_SPEED
    }

    group.rotation.y = view.yaw
    group.rotation.x = view.pitch
    camera.position.z = view.zoom
    renderer.render(scene, camera)

    /*
     * ピンの更新は render のあと。
     * render の中で group と camera の行列が今のフレームの値に更新されるので、
     * 先に呼ぶと 1 フレーム前の位置にピンが出て、回転中にずれて見える。
     */
    pinLayer?.update(viewWidth, viewHeight)
  }

  function start() {
    if (raf) return
    raf = requestAnimationFrame(loop)
  }

  function stop() {
    if (!raf) return
    cancelAnimationFrame(raf)
    raf = 0
  }

  // 他のタブを見ている間は描く意味が無いので止める
  function onVisibilityChange() {
    if (document.visibilityState === 'visible') start()
    else stop()
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  start()

  return {
    setSpin(next: boolean) {
      // 自動回転を戻したいときも、飛んでいる途中なら打ち切る
      if (next) target = null
      spin = next
    },
    zoomBy,
    flyTo,
    setPinState(state: PinState) {
      pinLayer?.setState(state)
    },
    setCompareArc: arcLayer.setEndpoints,
    dispose() {
      stop()
      abort.abort()
      arcLayer.dispose()
      pinLayer?.dispose()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('keydown', onKeyDown)
      geometry.dispose()
      material.dispose()
      texture.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
