import type { Ring, WorldShapes } from './geoData.ts'

/*
 * 球に貼るテクスチャを canvas に描く。
 *
 * 正距円筒図法（equirectangular）で、canvas の左端が西経 180 度、右端が東経 180 度、
 * 上端が北極、下端が南極。この形式はそのまま three.js の球に貼れる。
 *
 * 昼夜の境界は #7 でこの上に足す。ここでは昼のパレットで全面を描くだけ。
 */

export type Palette = {
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

export const DAY_PALETTE: Palette = {
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
 * 世界地図を 1 枚描く。
 * shapes が null のとき（取得に失敗したとき）は海と緯線経線だけになる。
 */
export function drawWorld(
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
