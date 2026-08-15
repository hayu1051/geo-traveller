import * as THREE from 'three'
import type { City, Continent } from '../data/types.ts'
import styles from './pins.module.css'

/*
 * 都市ピン。three.js のオブジェクトではなく、canvas の上に重ねた <button>。
 *
 * DOM にしているのは、押せること・文字が読めること・読み上げに乗ることが
 * 学習アプリでは効くため。代わりに位置は自前で計算する必要がある。
 *
 * update() は毎フレーム呼ばれる。React の再レンダリングを起こさないため、
 * ここでは state を読まず、setState() で渡された値を見る。向きは React から
 * こちらへの一方通行で、逆に戻すのは onSelect（クリックのときだけ）に限る。
 */

/** 球の裏側と判定する境目。真横（0）より少し手前で消すと、縁での重なりが減る */
const FRONT_THRESHOLD = 0.02

/** 名前を隠すとき（位置あてクイズ）に出す文字 */
const HIDDEN_LABEL = '？'

const PIN_SVG =
  '<svg viewBox="0 0 22 30" aria-hidden="true">' +
  '<path d="M11 0C4.9 0 0 4.9 0 11c0 7.8 11 19 11 19s11-11.2 11-19C22 4.9 17.1 0 11 0z"/>' +
  '</svg>'

/**
 * ピンの見た目を決める状態。React 側が持ち、変わったときだけ渡してくる。
 */
export type PinState = {
  /** 探索モードで選択中の都市 */
  selectedId: string | null
  /** 比較モードの A */
  compareAId: string | null
  /** 比較モードの B */
  compareBId: string | null
  /** 位置あてクイズの出題中は名前を隠す */
  hideNames: boolean
  /** 大陸で絞り込んでいるとき。外れた都市は薄く表示する */
  continent: Continent | null
}

export const INITIAL_PIN_STATE: PinState = {
  selectedId: null,
  compareAId: null,
  compareBId: null,
  hideNames: false,
  continent: null,
}

export type PinLayer = {
  /** 描画ループから毎フレーム呼ぶ */
  update: (width: number, height: number) => void
  setState: (state: PinState) => void
  dispose: () => void
}

export type PinLayerOptions = {
  /** ピンを載せる要素。canvas と同じ大きさであること */
  host: HTMLElement
  cities: City[]
  camera: THREE.PerspectiveCamera
  /** 地球儀の回転を持つグループ。ピンはこれと同じ向きに回る */
  group: THREE.Object3D
  onSelect: (id: string) => void
}

type Pin = {
  city: City
  el: HTMLButtonElement
  label: HTMLElement
  mark: HTMLElement
  /** 球の表面上の位置。回転前なので、都市ごとに 1 度だけ計算すればよい */
  position: THREE.Vector3
  /** 前回書き込んだ値。同じなら DOM を触らない */
  lastTransform: string
  lastClassName: string
  lastLabel: string
  lastMark: string
  lastVisible: boolean
}

/**
 * 緯度経度を球の上の 3D 座標に変換する。
 * テクスチャの貼られ方に合わせてあるので、式を変えるとピンが地図とずれる。
 */
function toVector(lat: number, lng: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  )
}

export function createPinLayer(options: PinLayerOptions): PinLayer {
  const { host, cities, camera, group, onSelect } = options

  const layer = document.createElement('div')
  layer.className = styles.layer ?? ''
  host.appendChild(layer)

  let state: PinState = INITIAL_PIN_STATE

  /*
   * 見た目（色・ラベル・A/B の文字）を作り直す必要があるか。
   * これらは選択が変わったときしか変わらないので、毎フレーム組み立てない。
   * 位置と違って、裏側のピンも対象にする。表に回ってきた時点では手遅れになるため。
   */
  let appearanceDirty = true

  const pins: Pin[] = cities.map((city) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.innerHTML = PIN_SVG

    const mark = document.createElement('em')
    mark.className = styles.mark ?? ''
    el.appendChild(mark)

    const label = document.createElement('b')
    label.className = styles.label ?? ''
    label.textContent = city.nameJa
    el.appendChild(label)

    el.addEventListener('click', (event) => {
      event.stopPropagation()
      onSelect(city.id)
    })

    layer.appendChild(el)

    return {
      city,
      el,
      label,
      mark,
      position: toVector(city.lat, city.lng),
      lastTransform: '',
      lastClassName: '',
      lastLabel: '',
      lastMark: '',
      lastVisible: true,
    }
  })

  /*
   * 計算に使い回す入れ物。毎フレーム new すると 1 秒あたり数千個のゴミになるので、
   * 最初に作って中身だけ入れ替える。
   */
  const worldPosition = new THREE.Vector3()
  const toCamera = new THREE.Vector3()
  const surfaceNormal = new THREE.Vector3()

  function classNameFor(pin: Pin): string {
    const names = [styles.pin]
    if (pin.city.id === state.compareAId) names.push(styles.compareA)
    else if (pin.city.id === state.compareBId) names.push(styles.compareB)
    else if (pin.city.id === state.selectedId) names.push(styles.selected)
    if (state.continent !== null && pin.city.cont !== state.continent) {
      names.push(styles.dimmed)
    }
    return names.filter(Boolean).join(' ')
  }

  function labelFor(pin: Pin): string {
    if (state.hideNames) return HIDDEN_LABEL
    if (pin.city.id === state.compareAId) return `${pin.city.nameJa}（A）`
    if (pin.city.id === state.compareBId) return `${pin.city.nameJa}（B）`
    return pin.city.nameJa
  }

  function markFor(pin: Pin): string {
    if (pin.city.id === state.compareAId) return 'A'
    if (pin.city.id === state.compareBId) return 'B'
    return ''
  }

  function applyAppearance(pin: Pin): void {
    const className = classNameFor(pin)
    if (className !== pin.lastClassName) {
      pin.el.className = className
      pin.lastClassName = className
    }

    const label = labelFor(pin)
    if (label !== pin.lastLabel) {
      pin.label.textContent = label
      pin.el.setAttribute('aria-label', label)
      pin.lastLabel = label
    }

    const mark = markFor(pin)
    if (mark !== pin.lastMark) {
      pin.mark.textContent = mark
      pin.lastMark = mark
    }
  }

  function update(width: number, height: number): void {
    for (const pin of pins) {
      if (appearanceDirty) applyAppearance(pin)

      // 地球儀の回転をピンにも適用して、今どこにあるかを求める
      worldPosition.copy(pin.position).applyMatrix4(group.matrixWorld)

      /*
       * 表か裏かの判定。球の中心から見た向き（＝表面の法線）と、
       * そこからカメラへ向かう向きの角度を見る。90 度以上開いていれば裏側。
       */
      surfaceNormal.copy(worldPosition).normalize()
      toCamera.copy(camera.position).sub(worldPosition).normalize()
      const visible = surfaceNormal.dot(toCamera) > FRONT_THRESHOLD

      if (visible !== pin.lastVisible) {
        pin.el.style.display = visible ? 'block' : 'none'
        pin.lastVisible = visible
      }
      if (!visible) continue

      // 3D 座標をカメラで投影すると -1〜1 の値になるので、画面の px に直す
      worldPosition.project(camera)
      const x = (worldPosition.x * 0.5 + 0.5) * width
      const y = (-worldPosition.y * 0.5 + 0.5) * height

      const transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      if (transform !== pin.lastTransform) {
        pin.el.style.transform = transform
        pin.lastTransform = transform
      }
    }

    appearanceDirty = false
  }

  return {
    update,
    setState(next: PinState) {
      state = next
      appearanceDirty = true
    },
    dispose() {
      layer.remove()
    },
  }
}
