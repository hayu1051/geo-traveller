import * as THREE from 'three'
import type { LatLng } from '../lib/geo.ts'
import { latLngToVector3 } from './coords.ts'

/*
 * 比較モードの弧。A と B を結ぶ「大圏コース」を地球儀の上に描く。
 *
 * 大圏コースは球の上の最短経路で、地図（正距円筒図法）の上では曲がって見えるのに
 * 実際にはいちばん近い道になっている。東京とニューヨークを結ぶと太平洋ではなく
 * 北極の近くを通るのがそれで、飛行機が実際に飛ぶ道でもある。
 *
 * ピンと違ってこれは three.js のオブジェクトで、地球儀の group に入れる。
 * group ごと回るので、位置を毎フレーム計算し直す必要はない。
 */

/**
 * 弧を置く高さ。1 が地表。
 * わずかに浮かせないと球の面と同じ場所を取り合って、ちらついて見える。
 */
const ARC_RADIUS = 1.012

/** 弧の太さ（球の半径に対する比）。細すぎると地図の模様に紛れる */
const ARC_THICKNESS = 0.0075

/** 弧を何本の線分でつなぐか。多いほど滑らかになる */
const ARC_SEGMENTS = 128

/** 断面の丸さ。地球儀を回して横から見たときに角ばらない程度 */
const ARC_RADIAL_SEGMENTS = 6

const ARC_COLOR = '#6750a4'

export type ArcLayer = {
  /** 両端を決める。どちらかが null なら弧を消す */
  setEndpoints: (a: LatLng | null, b: LatLng | null) => void
  dispose: () => void
}

/**
 * 2 点の間を球の表面に沿ってつなぐ点を並べる。
 *
 * 直線で結んだ点を球の半径まで押し出すと、それだけで大圏コースの上に乗る。
 * 地球の中心・A・B の 3 点が作る平面から出ないので、必ず最短経路になる。
 * 点の間隔は真ん中ほど広くなるが、128 本もつなげば見た目には分からない。
 */
function arcPoints(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= ARC_SEGMENTS; i += 1) {
    const t = i / ARC_SEGMENTS
    points.push(a.clone().lerp(b, t).normalize().multiplyScalar(ARC_RADIUS))
  }
  return points
}

export function createArcLayer(group: THREE.Object3D): ArcLayer {
  const material = new THREE.MeshBasicMaterial({ color: ARC_COLOR })

  /** 今出ている弧。出ていなければ null */
  let mesh: THREE.Mesh | null = null

  function clear() {
    if (!mesh) return
    group.remove(mesh)
    // three.js は参照を切っても GPU のメモリを解放しないので、明示的に捨てる
    mesh.geometry.dispose()
    mesh = null
  }

  return {
    setEndpoints(a, b) {
      clear()
      if (!a || !b) return

      const from = latLngToVector3(a.lat, a.lng)
      const to = latLngToVector3(b.lat, b.lng)

      /*
       * 同じ都市が両端に来ると長さ 0 の弧になり、TubeGeometry が NaN を含んだ
       * 頂点を作って描画全体が消える。A と B に同じ都市は入らない作りだが、
       * 壊れ方が派手なので念のため止めておく。
       */
      if (from.distanceToSquared(to) < 1e-8) return

      /*
       * 線ではなく細い筒（チューブ）にする。
       * THREE.Line の太さ指定は多くの環境で無視され、常に 1 ピクセルになってしまい、
       * 地図の上ではほとんど見えない。
       */
      const curve = new THREE.CatmullRomCurve3(arcPoints(from, to))
      const geometry = new THREE.TubeGeometry(
        curve,
        ARC_SEGMENTS,
        ARC_THICKNESS,
        ARC_RADIAL_SEGMENTS,
        false,
      )

      mesh = new THREE.Mesh(geometry, material)
      group.add(mesh)
    },
    dispose() {
      clear()
      material.dispose()
    },
  }
}
