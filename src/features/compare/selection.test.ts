import { describe, expect, it } from 'vitest'
import { activateSlot, choosePair, clearSlot, EMPTY_PAIR, type Pair } from './selection.ts'

/*
 * ここでテストしているのは計算ではなく「操作したらどうなるか」の約束。
 * 画面を触らなくても規則が変わったことに気づけるよう、文章で書いてある挙動を
 * そのまま 1 件ずつ固定している。
 */

describe('choosePair', () => {
  it('最初の 1 つは A に入る', () => {
    expect(choosePair(EMPTY_PAIR, 'tokyo')).toEqual({
      aId: 'tokyo',
      bId: null,
      active: 'b',
    })
  })

  it('A が埋まったら、次のえらび中は B に移る', () => {
    expect(choosePair(EMPTY_PAIR, 'tokyo').active).toBe('b')
  })

  it('2 つめは B に入る', () => {
    const pair = choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork')
    expect(pair).toEqual({ aId: 'tokyo', bId: 'newyork', active: 'b' })
  })

  it('3 つめは A を消さず、えらび中だった B が入れ替わる', () => {
    // 原案では A に戻っていた。ここが今回変えたところ
    const pair = choosePair(
      choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork'),
      'sydney',
    )
    expect(pair).toEqual({ aId: 'tokyo', bId: 'sydney', active: 'b' })
  })

  it('何回押しても、えらび中でない方は変わらない', () => {
    let pair = choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork')
    for (const id of ['sydney', 'cairo', 'rio', 'london']) {
      pair = choosePair(pair, id)
      expect(pair.aId).toBe('tokyo')
    }
    expect(pair.bId).toBe('london')
  })

  it('A をえらび中にすれば A が入れ替わる', () => {
    const both = choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork')
    const pair = choosePair(activateSlot(both, 'a'), 'madrid')
    expect(pair).toEqual({ aId: 'madrid', bId: 'newyork', active: 'a' })
  })

  it('入っている都市をもう一度押すと外れる', () => {
    const both = choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork')
    expect(choosePair(both, 'tokyo')).toEqual({
      aId: null,
      bId: 'newyork',
      active: 'a',
    })
  })

  it('外したあと押すと、空いた枠に入る', () => {
    const both = choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork')
    const removed = choosePair(both, 'tokyo')
    expect(choosePair(removed, 'london').aId).toBe('london')
  })

  it('同じ都市が A と B に並ぶことはない', () => {
    let pair: Pair = EMPTY_PAIR
    // わざと同じ都市を混ぜながら押し続ける
    for (const id of ['tokyo', 'tokyo', 'newyork', 'newyork', 'tokyo', 'newyork']) {
      pair = choosePair(pair, id)
      if (pair.aId !== null) expect(pair.aId).not.toBe(pair.bId)
    }
  })

  it('元の値を書き換えない', () => {
    const before = choosePair(EMPTY_PAIR, 'tokyo')
    const snapshot = { ...before }
    choosePair(before, 'newyork')
    expect(before).toEqual(snapshot)
  })
})

describe('clearSlot', () => {
  it('その枠だけを空にする', () => {
    const both = choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork')
    expect(clearSlot(both, 'b')).toEqual({ aId: 'tokyo', bId: null, active: 'b' })
  })

  it('空けた枠がえらび中になる', () => {
    const both = choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork')
    expect(clearSlot(both, 'a').active).toBe('a')
  })
})

describe('activateSlot', () => {
  it('中身は変えない', () => {
    const both = choosePair(choosePair(EMPTY_PAIR, 'tokyo'), 'newyork')
    const moved = activateSlot(both, 'a')
    expect(moved.aId).toBe('tokyo')
    expect(moved.bId).toBe('newyork')
    expect(moved.active).toBe('a')
  })
})

