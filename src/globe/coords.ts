import * as THREE from 'three'

/*
 * 緯度経度と、three.js の 3D 座標の橋渡し。
 *
 * この式はテクスチャの貼られ方（正距円筒図法を球にそのまま巻く）と
 * 対になっている。片方だけ変えると、ピンや弧が地図の上でずれる。
 * ピン（pins.ts）と大圏コースの弧（arc.ts）が同じ約束で動くよう、ここに 1 つだけ置く。
 */

/**
 * 緯度経度を球の上の位置に直す。
 * radius は球からの高さ。1 が地表で、大きいほど浮く。
 */
export function latLngToVector3(lat: number, lng: number, radius = 1): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180
  return new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta) * radius,
    Math.cos(phi) * radius,
    Math.sin(phi) * Math.sin(theta) * radius,
  )
}
