/*
 * 太陽の位置の計算。
 *
 * 描画には触れず、数値だけを返す。ここを分けておくと、
 * 「夏至の太陽は北緯 23.4 度の真上」のような事実をテストで確かめられる。
 * 原案では paintTexture() の中に描画と混ざっていた。
 *
 * 計算は天文暦の近似式によるもので、誤差は 0.01 度ほど。
 * 地球儀の見た目には十分な精度がある。
 */

const D2R = Math.PI / 180
const R2D = 180 / Math.PI

const MS_PER_DAY = 86400000

/** 1970-01-01 00:00 UTC のユリウス日 */
const JULIAN_AT_EPOCH = 2440587.5

/** 計算の基準になる 2000-01-01 12:00 UTC のユリウス日 */
const JULIAN_AT_J2000 = 2451545.0

/**
 * 太陽が真上に来ている地点。
 * lat は季節で ±23.44 度の間を動き、lng は 1 時間に 15 度ずつ西へ動く。
 */
export type SubsolarPoint = {
  lat: number
  lng: number
}

/** 太陽直下点を求める */
export function subsolar(date: Date): SubsolarPoint {
  // 基準日からの経過日数
  const days = date.getTime() / MS_PER_DAY + JULIAN_AT_EPOCH - JULIAN_AT_J2000

  // 平均黄経と平均近点角。地球の公転は真円ではないので、この 2 つで補正する
  const meanLongitude = (280.46 + 0.9856474 * days) % 360
  const meanAnomaly = ((357.528 + 0.9856003 * days) % 360) * D2R

  // 黄道上の実際の位置
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * D2R

  // 地軸の傾き。これがあるから季節ができる
  const obliquity = (23.439 - 0.0000004 * days) * D2R

  // 赤緯。そのまま太陽直下点の緯度になる
  const lat = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude)) * R2D

  // 赤経から、そのときのグリニッジ恒星時を引くと経度になる
  const rightAscension =
    Math.atan2(Math.cos(obliquity) * Math.sin(eclipticLongitude), Math.cos(eclipticLongitude)) *
    R2D
  const siderealHours = (((18.697374558 + 24.06570982441908 * days) % 24) + 24) % 24
  const lng = ((rightAscension - siderealHours * 15 + 540) % 360) - 180

  return { lat, lng }
}

/**
 * その地点が夜かどうか。
 *
 * 地点の方向と太陽の方向の角度を見て、90 度より離れていれば夜。
 * 下の式は 2 つの方向の内積で、負なら地平線より下に太陽がある。
 */
export function isNight(lat: number, lng: number, sun: SubsolarPoint): boolean {
  return (
    Math.sin(lat * D2R) * Math.sin(sun.lat * D2R) +
      Math.cos(lat * D2R) * Math.cos(sun.lat * D2R) * Math.cos((lng - sun.lng) * D2R) <
    0
  )
}

/**
 * ある経度で、昼と夜の境目が来る緯度。
 *
 * 境界は太陽直下点からちょうど 90 度離れた円で、これを経度ごとの緯度として
 * 表したもの。地図の左端から右端まで x を動かしながらこの値を取れば、
 * 境界線をそのままなぞれる。
 */
export function terminatorLat(lng: number, sun: SubsolarPoint): number {
  return Math.atan(-Math.cos((lng - sun.lng) * D2R) / Math.tan(sun.lat * D2R)) * R2D
}
