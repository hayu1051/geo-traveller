import type { Ring, WorldShapes } from './geoData.ts'
import { isNight, subsolar, terminatorLat, type SubsolarPoint } from './sun.ts'

/*
 * 球に貼るテクスチャを canvas に描く。
 *
 * 正距円筒図法（equirectangular）で、canvas の左端が西経 180 度、右端が東経 180 度、
 * 上端が北極、下端が南極。この形式はそのまま three.js の球に貼れる。
 *
 * 世界地図を描く drawWorld は色の組（パレット）を受け取るだけで、昼夜を知らない。
 * paintGlobe が昼の色で 1 回、夜側だけを切り抜いて夜の色でもう 1 回呼ぶ。
 */

type Palette = {
  ocean: string
  land: string
  coast: string
  border: string
  /** 30 度ごとの太い緯線経線 */
  grid: string
  /** 15 度ごとの細い緯線経線 */
  gridMinor: string
  label: string
  labelHalo: string
  equator: string
}

const DAY_PALETTE: Palette = {
  ocean: '#a9d6e8',
  land: '#d9cfb4',
  coast: '#20505e',
  border: 'rgba(32,60,72,0.55)',
  grid: 'rgba(32,60,72,0.22)',
  gridMinor: 'rgba(32,60,72,0.10)',
  label: 'rgba(32,60,72,0.66)',
  labelHalo: 'rgba(255,255,255,0.5)',
  equator: 'rgba(214,40,40,0.85)',
}

const NIGHT_PALETTE: Palette = {
  ocean: '#141d4e',
  land: '#4a5480',
  coast: '#a8b4d8',
  border: 'rgba(255,255,255,0.4)',
  grid: 'rgba(255,255,255,0.20)',
  gridMinor: 'rgba(255,255,255,0.10)',
  label: 'rgba(255,255,255,0.66)',
  labelHalo: 'rgba(10,16,45,0.5)',
  equator: 'rgba(255,82,82,0.9)',
}

/** 昼夜の境界線の色。CSS の --primary と同じ紫 */
const TERMINATOR_COLOR = '#6750a4'

/*
 * 凡例に出す色。
 * 地図の塗りと必ず同じ値になるよう、CSS へ書き写さずここから配る。
 */
export const LEGEND_COLORS = {
  nightOcean: NIGHT_PALETTE.ocean,
  dayOcean: DAY_PALETTE.ocean,
  terminator: TERMINATOR_COLOR,
  equator: DAY_PALETTE.equator,
}

const TERMINATOR_WIDTH = 4

/**
 * 境界線をなぞるときの横方向の間隔（px）。
 * 境界はゆるやかな曲線なので、8px ごとに点を取れば折れ線でも滑らかに見える。
 */
const TERMINATOR_STEP = 8

/*
 * 地図データは経度の飛びをならしてあるため ±180 をはみ出す点がある
 * （実測で -181.4 〜 190.1）。左右にずらして 3 回描くことで端を欠けさせない。
 */
const WRAP_SHIFTS = [-360, 0, 360]

/**
 * 南極の塗り足し。
 * world-atlas のデータは南緯 85.6 度までしか無く、そのままだと南極の下が海になる。
 */
const ANTARCTIC_FILL_LAT = -83

function toX(lng: number, width: number): number {
  return ((lng + 180) / 360) * width
}

function toY(lat: number, height: number): number {
  return ((90 - lat) / 180) * height
}

function tracePath(
  ctx: CanvasRenderingContext2D,
  ring: Ring,
  shift: number,
  width: number,
  height: number,
): void {
  ring.forEach((point, index) => {
    const x = toX(point.lng + shift, width)
    const y = toY(point.lat, height)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
}

function drawLand(
  ctx: CanvasRenderingContext2D,
  shapes: WorldShapes,
  palette: Palette,
  width: number,
  height: number,
): void {
  ctx.fillStyle = palette.land
  ctx.strokeStyle = palette.coast
  ctx.lineWidth = 2

  for (const rings of shapes.land) {
    for (const shift of WRAP_SHIFTS) {
      ctx.beginPath()
      for (const ring of rings) {
        tracePath(ctx, ring, shift, width, height)
        ctx.closePath()
      }
      ctx.fill()
      ctx.stroke()
    }
  }

  ctx.fillStyle = palette.land
  const top = toY(ANTARCTIC_FILL_LAT, height)
  ctx.fillRect(0, top, width, height - top)
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  shapes: WorldShapes,
  palette: Palette,
  width: number,
  height: number,
): void {
  ctx.fillStyle = palette.ocean
  ctx.strokeStyle = palette.coast
  ctx.lineWidth = 2

  for (const ring of shapes.water) {
    for (const shift of WRAP_SHIFTS) {
      ctx.beginPath()
      tracePath(ctx, ring, shift, width, height)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }
}

function drawBorders(
  ctx: CanvasRenderingContext2D,
  shapes: WorldShapes,
  palette: Palette,
  width: number,
  height: number,
): void {
  ctx.strokeStyle = palette.border
  ctx.lineWidth = 1.4

  for (const ring of shapes.borders) {
    for (const shift of WRAP_SHIFTS) {
      ctx.beginPath()
      tracePath(ctx, ring, shift, width, height)
      ctx.stroke()
    }
  }
}

function drawGraticule(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  width: number,
  height: number,
): void {
  for (let lat = -75; lat <= 75; lat += 15) {
    if (lat === 0) continue
    const major = lat % 30 === 0
    ctx.strokeStyle = major ? palette.grid : palette.gridMinor
    ctx.lineWidth = major ? 2 : 1.2
    const y = toY(lat, height)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  for (let lng = -180; lng <= 180; lng += 15) {
    const major = lng % 30 === 0
    ctx.strokeStyle = major ? palette.grid : palette.gridMinor
    ctx.lineWidth = major ? 2 : 1.2
    const x = toX(lng, width)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
}

function drawLabels(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  width: number,
  height: number,
): void {
  ctx.fillStyle = palette.label
  ctx.strokeStyle = palette.labelHalo
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '700 18px Roboto, "Noto Sans JP", sans-serif'
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'

  const label = (text: string, lat: number, lng: number, dx: number, dy: number) => {
    const x = toX(lng, width) + dx
    const y = toY(lat, height) + dy
    // 高緯度ほど球に貼ると横に縮むので、その分だけ広げて読みやすさを保つ
    const stretch = Math.min(2.2, 1 / Math.max(0.45, Math.cos((lat * Math.PI) / 180)))
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(stretch, 1)
    ctx.strokeText(text, 0, 0)
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }

  for (let lng = -180; lng <= 180; lng += 30) {
    label(`${String(Math.abs(lng))}°`, 0, lng, 0, 22)
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    if (lat === 0) continue
    for (const lng of [0, -180]) {
      label(`${String(Math.abs(lat))}°`, lat, lng, 22, -12)
    }
  }
}

/**
 * 昼夜の境目を、地図の左端から右端まで折れ線でなぞる。
 * 線を引くときと、夜側を切り抜くときの両方で使う。
 */
function traceTerminator(
  ctx: CanvasRenderingContext2D,
  sun: SubsolarPoint,
  width: number,
  height: number,
): void {
  ctx.beginPath()
  for (let x = 0; x <= width; x += TERMINATOR_STEP) {
    const lng = -180 + (x / width) * 360
    const y = toY(terminatorLat(lng, sun), height)
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
}

/**
 * 世界地図を 1 枚描く。
 * shapes が null のとき（取得に失敗したとき）は海と緯線経線だけになる。
 */
function drawWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: Palette,
  shapes: WorldShapes | null,
): void {
  ctx.fillStyle = palette.ocean
  ctx.fillRect(0, 0, width, height)

  if (shapes) {
    drawLand(ctx, shapes, palette, width, height)
    drawWater(ctx, shapes, palette, width, height)
    drawBorders(ctx, shapes, palette, width, height)
  }

  drawGraticule(ctx, palette, width, height)
  drawLabels(ctx, palette, width, height)

  ctx.strokeStyle = palette.equator
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(0, height / 2)
  ctx.lineTo(width, height / 2)
  ctx.stroke()
}

/**
 * 地球儀のテクスチャを 1 枚ぶん描く。
 *
 * 昼と夜で色を変えるが、地図そのものは 2 通り持たない。
 * 昼の色で全面を描いたあと、夜側だけを切り抜いて夜の色で描き直す。
 * ctx.clip() を呼ぶと、以降の描画はその形の内側にしか出なくなる。
 */
export function paintGlobe(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  shapes: WorldShapes | null,
  date: Date,
): void {
  const sun = subsolar(date)

  drawWorld(ctx, width, height, DAY_PALETTE, shapes)

  /*
   * 夜側の切り抜き。
   *
   * 境界の線だけでは領域にならないので、線の端から地図の上辺（または下辺）へ
   * 回り込んで閉じる。どちらへ回るかは、極が夜になっているかで決まる。
   * 夏の北極は 1 日中昼なので、そのときは下辺、つまり南側が夜になる。
   */
  const northIsDark = isNight(89, sun.lng, sun)

  ctx.save()
  traceTerminator(ctx, sun, width, height)
  if (northIsDark) {
    ctx.lineTo(width, 0)
    ctx.lineTo(0, 0)
  } else {
    ctx.lineTo(width, height)
    ctx.lineTo(0, height)
  }
  ctx.closePath()
  ctx.clip()
  drawWorld(ctx, width, height, NIGHT_PALETTE, shapes)
  ctx.restore()

  // 境界線そのものを上描きする
  ctx.strokeStyle = TERMINATOR_COLOR
  ctx.lineWidth = TERMINATOR_WIDTH
  traceTerminator(ctx, sun, width, height)
  ctx.stroke()
}
