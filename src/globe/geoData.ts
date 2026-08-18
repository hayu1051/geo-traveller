import { feature, mesh } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Geometry, Position } from 'geojson'

/*
 * 地図データの取得。ビルドには含めず、実行時に CDN から取る。
 *
 * 取得した JSON は unknown で入ってくる。ESLint が型情報を使う設定
 * （recommendedTypeChecked）なので、any のまま扱うと no-unsafe-* に引っかかる。
 * このファイルが「外の世界の形の分からないデータ」と「自前の型」の境界になる。
 */

const COUNTRIES_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
const NATURAL_EARTH_BASE =
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/'

export type GeoPoint = { lng: number; lat: number }

/** 閉じた輪、または一本の線 */
export type Ring = GeoPoint[]

export type WorldShapes = {
  /** 陸地。1 つの島や大陸が「外周 + 穴」のリング配列になる */
  land: Ring[][]
  /** 国境の線 */
  borders: Ring[]
  /** 湖とカスピ海。陸の上に海の色で塗る */
  water: Ring[]
}

function asTopology(value: unknown): Topology {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('objects' in value) ||
    !('arcs' in value)
  ) {
    throw new Error('TopoJSON の形をしていません')
  }
  return value as Topology
}

function asGeoJson(value: unknown): { features: { geometry: Geometry | null }[] } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('features' in value) ||
    !Array.isArray(value.features)
  ) {
    throw new Error('GeoJSON の FeatureCollection ではありません')
  }
  return value as { features: { geometry: Geometry | null }[] }
}

/**
 * 経度の飛びをならす。
 *
 * 地図データは経度 180 度で -180 に折り返すため、そのまま描くと
 * 太平洋を横切る線が画面を突っ切ってしまう。前の点から 180 度以上離れたら
 * 360 度ずらして、連続した値になるようにする。
 */
function normalizeRing(positions: Position[]): Ring {
  const ring: Ring = []
  let prev: number | null = null

  for (const position of positions) {
    const rawLng = position[0]
    const lat = position[1]
    if (rawLng === undefined || lat === undefined) continue

    let lng = rawLng
    if (prev !== null) {
      while (lng - prev > 180) lng -= 360
      while (prev - lng > 180) lng += 360
    }
    prev = lng
    ring.push({ lng, lat })
  }

  return ring
}

function collectPolygons(geometry: Geometry | null, out: Ring[][]): void {
  if (!geometry) return

  if (geometry.type === 'Polygon') {
    out.push(geometry.coordinates.map(normalizeRing))
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      out.push(polygon.map(normalizeRing))
    }
  } else if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries) collectPolygons(child, out)
  }
}

/** ポリゴンの外周だけを取り出す。湖は穴を持たないので外周で足りる */
function collectOuterRings(geometry: Geometry | null, out: Ring[]): void {
  const polygons: Ring[][] = []
  collectPolygons(geometry, polygons)
  for (const rings of polygons) {
    const outer = rings[0]
    if (outer) out.push(outer)
  }
}

/**
 * カスピ海かどうか。
 *
 * Natural Earth では、カスピ海は湖ではなく海のデータの中に
 * 独立したポリゴンとして入っている。海全体を塗ると陸ごと消えてしまうので、
 * 位置で内陸のものだけを拾う。
 */
function isInlandSea(ring: Ring): boolean {
  if (ring.length === 0) return false
  const lngs = ring.map((p) => p.lng)
  const lats = ring.map((p) => p.lat)
  return (
    Math.min(...lngs) > 40 &&
    Math.max(...lngs) < 60 &&
    Math.min(...lats) > 30 &&
    Math.max(...lats) < 50
  )
}

async function fetchJson(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`${url} が ${String(response.status)} を返しました`)
  return response.json()
}

/** 国境（TopoJSON）を取得して、陸地と国境線に分ける */
async function loadLand(
  signal: AbortSignal,
): Promise<Pick<WorldShapes, 'land' | 'borders'>> {
  const topology = asTopology(await fetchJson(COUNTRIES_URL, signal))
  const countries = topology.objects.countries
  if (!countries) throw new Error('countries が入っていません')

  const collection = countries as GeometryCollection
  const land: Ring[][] = []
  for (const feat of feature(topology, collection).features) {
    collectPolygons(feat.geometry, land)
  }

  // 隣り合う国どうしで共有している辺だけを取り出すと国境線になる
  const borderMesh = mesh(topology, collection, (a, b) => a !== b)
  const borders = borderMesh.coordinates.map(normalizeRing)

  return { land, borders }
}

/** 湖（GeoJSON）とカスピ海を取得する */
async function loadWater(signal: AbortSignal): Promise<Ring[]> {
  const [lakes, ocean] = await Promise.all([
    fetchJson(`${NATURAL_EARTH_BASE}ne_110m_lakes.geojson`, signal),
    fetchJson(`${NATURAL_EARTH_BASE}ne_110m_ocean.geojson`, signal),
  ])

  const water: Ring[] = []
  for (const feat of asGeoJson(lakes).features) {
    collectOuterRings(feat.geometry, water)
  }

  const oceanRings: Ring[] = []
  for (const feat of asGeoJson(ocean).features) {
    collectOuterRings(feat.geometry, oceanRings)
  }
  water.push(...oceanRings.filter(isInlandSea))

  return water
}

/**
 * 地図データをまとめて取得する。
 *
 * 湖の取得だけ失敗しても、陸と国境が描ければ地図として成立するので
 * その場合は water を空にして返す。両方失敗したときは呼び出し側で
 * 緯線経線だけの表示にフォールバックする。
 */
export async function loadWorldShapes(signal: AbortSignal): Promise<WorldShapes> {
  const { land, borders } = await loadLand(signal)
  const water = await loadWater(signal).catch(() => [])
  return { land, borders, water }
}
