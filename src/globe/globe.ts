import * as THREE from 'three'

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

/** 単色の球の色。#6 で世界地図のテクスチャに置き換わる */
const SPHERE_COLOR = 0xa9d6e8

const ZOOM_MIN = 1.55
const ZOOM_MAX = 6
const ZOOM_INITIAL = 2.6

/** 自動回転の速さ（ラジアン / フレーム） */
const SPIN_SPEED = 0.0011

/** 真上・真下を越えて裏返らないよう、上下の回転を止める角度 */
const PITCH_LIMIT = 1.45

const DRAG_SENSITIVITY = 0.006
const WHEEL_SENSITIVITY = 0.0018

export type Globe = {
  /** 自動回転の ON / OFF */
  setSpin: (spin: boolean) => void
  /** ズーム。+ で引き、- で寄る */
  zoomBy: (delta: number) => void
  /** 描画ループを止めて three.js の資源を解放する */
  dispose: () => void
}

export type GlobeOptions = {
  /** ドラッグで自動回転が解除されたときに呼ばれる。React 側のボタン表示を合わせるため */
  onSpinChange?: (spin: boolean) => void
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
  // これが無いとスマホでドラッグがページのスクロールに奪われる
  canvas.style.touchAction = 'none'
  host.appendChild(canvas)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100)
  camera.position.set(0, 0, ZOOM_INITIAL)

  const group = new THREE.Group()
  group.rotation.order = 'XYZ'
  scene.add(group)

  const geometry = new THREE.SphereGeometry(1, 72, 54)
  const material = new THREE.MeshBasicMaterial({ color: SPHERE_COLOR })
  group.add(new THREE.Mesh(geometry, material))

  const view = { yaw: 0, pitch: 0, zoom: ZOOM_INITIAL }
  let spin = true

  // ----- 操作 -----

  let drag: { x: number; y: number } | null = null

  function onPointerDown(event: PointerEvent) {
    drag = { x: event.clientX, y: event.clientY }
    canvas.setPointerCapture(event.pointerId)
    canvas.style.cursor = 'grabbing'
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag) return
    view.yaw += (event.clientX - drag.x) * DRAG_SENSITIVITY
    view.pitch += (event.clientY - drag.y) * DRAG_SENSITIVITY
    view.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, view.pitch))
    drag = { x: event.clientX, y: event.clientY }

    // 手で回している間は自動回転を止める
    if (spin) {
      spin = false
      options.onSpinChange?.(false)
    }
  }

  function onPointerUp() {
    drag = null
    canvas.style.cursor = 'grab'
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault()
    zoomBy(event.deltaY * WHEEL_SENSITIVITY)
  }

  function zoomBy(delta: number) {
    view.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, view.zoom + delta))
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  // ----- 大きさの追従 -----

  const resizeObserver = new ResizeObserver(() => {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(host)

  // ----- 描画ループ -----

  let raf = 0

  function loop() {
    raf = requestAnimationFrame(loop)
    if (spin) view.yaw += SPIN_SPEED
    group.rotation.y = view.yaw
    group.rotation.x = view.pitch
    camera.position.z = view.zoom
    renderer.render(scene, camera)
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
      spin = next
    },
    zoomBy,
    dispose() {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      canvas.remove()
    },
  }
}
