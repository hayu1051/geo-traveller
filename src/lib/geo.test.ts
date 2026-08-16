import { describe, expect, it } from 'vitest'
import {
  angleGap,
  centralAngle,
  distanceKm,
  midpoint,
  nearestEquivalentAngle,
} from './geo.ts'

/*
 * 期待値は「地球はこういう形をしている」という事実から取っている。
 * 距離の実測値は国土地理院・NOAA などが公開している値とおおむね一致する。
 */

const TOKYO = { lat: 35.68, lng: 139.69 }
const NEWYORK = { lat: 40.71, lng: -74.01 }
const LONDON = { lat: 51.51, lng: -0.13 }
const MADRID = { lat: 40.42, lng: -3.7 }
const SYDNEY = { lat: -33.87, lng: 151.21 }
const RIO = { lat: -22.91, lng: -43.17 }

/** 地球一周の半分。これより長い最短距離は存在しない */
const HALF_CIRCUMFERENCE_KM = 20015

describe('distanceKm', () => {
  it('同じ場所どうしは 0', () => {
    expect(distanceKm(TOKYO, TOKYO)).toBe(0)
  })

  it('東京とニューヨークは約 10,850km', () => {
    expect(distanceKm(TOKYO, NEWYORK)).toBeCloseTo(10850, -2)
  })

  it('東京とシドニーは約 7,826km', () => {
    expect(distanceKm(TOKYO, SYDNEY)).toBeCloseTo(7826, -2)
  })

  it('ロンドンとマドリードは約 1,263km', () => {
    expect(distanceKm(LONDON, MADRID)).toBeCloseTo(1263, -2)
  })

  it('どちらから測っても同じ', () => {
    expect(distanceKm(TOKYO, RIO)).toBeCloseTo(distanceKm(RIO, TOKYO), 6)
  })

  it('地球一周の半分を超えない', () => {
    // 東京の真裏は南アメリカの沖。ほぼ限界まで離れている組み合わせになる
    expect(distanceKm(TOKYO, RIO)).toBeLessThan(HALF_CIRCUMFERENCE_KM)
  })

  it('地球の真裏どうしは一周の半分になる', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(
      HALF_CIRCUMFERENCE_KM,
      -2,
    )
  })

  it('赤道上の経度 1 度は約 111km', () => {
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111, 0)
  })

  it('緯度 1 度は場所によらず約 111km', () => {
    // 経線はどこでも同じ大きさの円なので、高緯度でも間隔は変わらない
    expect(distanceKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111, 0)
    expect(distanceKm({ lat: 60, lng: 30 }, { lat: 61, lng: 30 })).toBeCloseTo(111, 0)
  })
})

describe('nearestEquivalentAngle', () => {
  it('target に近ければそのまま返す', () => {
    expect(nearestEquivalentAngle(-213.7, -210)).toBeCloseTo(-213.7, 6)
  })

  it('360 度ずらした方が近ければ、ずらして返す', () => {
    // 東回りの 146.3 度と西回りの -213.7 度は同じ向き。標準時経線の -210 度に揃える
    expect(nearestEquivalentAngle(146.3, -210)).toBeCloseTo(-213.7, 6)
  })

  it('ずらしても向きは変わらない', () => {
    const moved = nearestEquivalentAngle(146.3, -210)
    expect(Math.abs(moved - 146.3) % 360).toBeCloseTo(0, 6)
  })

  it('target が 0 なら -180 〜 180 に収まる', () => {
    expect(nearestEquivalentAngle(350, 0)).toBeCloseTo(-10, 6)
    expect(nearestEquivalentAngle(-350, 0)).toBeCloseTo(10, 6)
  })
})

describe('angleGap', () => {
  it('東へ回る方が近ければ +', () => {
    expect(angleGap(0, 30)).toBeCloseTo(30, 6)
  })

  it('西へ回る方が近ければ -', () => {
    expect(angleGap(0, -30)).toBeCloseTo(-30, 6)
  })

  it('経度 180 度をまたぐときは近い方を選ぶ', () => {
    // 170 度から -170 度へは、東へ 20 度で着く。西へ 340 度ではない
    expect(angleGap(170, -170)).toBeCloseTo(20, 6)
  })

  it('東京からニューヨークは東回りで 146.3 度', () => {
    expect(angleGap(TOKYO.lng, NEWYORK.lng)).toBeCloseTo(146.3, 6)
  })
})

describe('midpoint', () => {
  it('赤道上では経度の平均になる', () => {
    const mid = midpoint({ lat: 0, lng: 0 }, { lat: 0, lng: 90 })
    expect(mid.lat).toBeCloseTo(0, 6)
    expect(mid.lng).toBeCloseTo(45, 6)
  })

  it('経度 180 度をまたいでも地球の裏へ飛ばない', () => {
    // 単純に平均すると 0 度（アフリカ沖）になってしまう場所
    const mid = midpoint({ lat: 0, lng: 170 }, { lat: 0, lng: -170 })
    expect(Math.abs(mid.lng)).toBeCloseTo(180, 6)
  })

  it('東京とニューヨークの中間は北極の近くになる', () => {
    // 最短経路は太平洋の横断ではなく北回り。中間点はアラスカの北あたり
    const mid = midpoint(TOKYO, NEWYORK)
    expect(mid.lat).toBeGreaterThan(60)
  })

  it('中間点は両側から同じ距離にある', () => {
    const mid = midpoint(TOKYO, SYDNEY)
    expect(distanceKm(TOKYO, mid)).toBeCloseTo(distanceKm(SYDNEY, mid), 3)
  })
})

describe('centralAngle', () => {
  it('同じ場所どうしは 0 度', () => {
    expect(centralAngle(TOKYO, TOKYO)).toBe(0)
  })

  it('地球の真裏どうしは 180 度', () => {
    expect(centralAngle({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(180, 6)
  })

  it('東京とニューヨークは約 97.6 度', () => {
    expect(centralAngle(TOKYO, NEWYORK)).toBeCloseTo(97.6, 1)
  })
})
