/*
 * 地球の上の位置どうしの関係を求める。時刻もタイムゾーンも出てこない、幾何だけの計算。
 *
 * time.ts が「いつ」を扱い、こちらが「どこ」を扱う。
 * 比較モードの距離・経度差・地球儀の弧は、すべてここの関数から作る。
 */

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

/**
 * 地球の半径（km）。
 * 実際の地球は赤道方向にわずかに膨らんだ楕円体だが、その差は 0.3% ほどしかない。
 * この教材で出す「約 10,900km」のような数字には影響しないので、球として扱う。
 */
const EARTH_RADIUS_KM = 6371

export type LatLng = {
  lat: number
  lng: number
}

/**
 * 2 地点の最短距離（km）。地球の表面に沿って測る。
 *
 * ヒュベニの公式ではなく半正矢（haversine）の式を使う。
 * 2 点が地球のほぼ裏どうしになっても精度が落ちないため。
 * 東京とリオデジャネイロは 18,568km あり、地球一周の半分（20,015km）に近い。
 */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * D2R
  const dLng = (b.lng - a.lng) * D2R
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLng / 2) ** 2
  // 丸め誤差で h がわずかに 1 を超えると asin が NaN になるので抑えておく
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * 同じ向きを指す角度のうち、target にいちばん近い表し方を選ぶ。
 *
 * 角度は 360 度ずつ足し引きしても同じ向きを指す。-213.7 度と 146.3 度は
 * どちらも「東京から見たニューヨークの方角」で、西回りか東回りかが違うだけ。
 *
 * 比較モードでは実経度の差と標準時経線の差を並べて見せるので、
 * 片方が西回り・もう片方が東回りだと数字を比べられない。
 * 標準時経線の差（時差から決まるので回り方が確定している）に揃えるために使う。
 */
export function nearestEquivalentAngle(angle: number, target: number): number {
  return angle + Math.round((target - angle) / 360) * 360
}

/**
 * a から b へ、近い方に回ったときの角度差（度）。東回りが + 、西回りが - 。
 * -180 以上 180 未満に収まる。
 */
export function angleGap(from: number, to: number): number {
  return ((((to - from + 540) % 360) + 360) % 360) - 180
}

/**
 * 2 地点のちょうど真ん中（最短経路の中点）。
 *
 * 経度を単純に平均すると、太平洋をまたぐ 2 点で地球の裏側に飛ぶ。
 * いったん 3D の向きに直して足し、その向きをまた緯度経度へ戻す。
 */
export function midpoint(a: LatLng, b: LatLng): LatLng {
  const ax = Math.cos(a.lat * D2R) * Math.cos(a.lng * D2R)
  const ay = Math.cos(a.lat * D2R) * Math.sin(a.lng * D2R)
  const az = Math.sin(a.lat * D2R)
  const bx = Math.cos(b.lat * D2R) * Math.cos(b.lng * D2R)
  const by = Math.cos(b.lat * D2R) * Math.sin(b.lng * D2R)
  const bz = Math.sin(b.lat * D2R)

  const x = ax + bx
  const y = ay + by
  const z = az + bz

  return {
    lat: Math.atan2(z, Math.sqrt(x * x + y * y)) * R2D,
    lng: Math.atan2(y, x) * R2D,
  }
}

/**
 * 2 地点の間の中心角（度）。地球の中心から見て何度離れているか。
 * 0 度なら同じ場所、180 度なら地球の真裏。地球儀をどこまで引くかを決めるのに使う。
 */
export function centralAngle(a: LatLng, b: LatLng): number {
  return (distanceKm(a, b) / EARTH_RADIUS_KM) * R2D
}
