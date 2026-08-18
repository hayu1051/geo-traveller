/*
 * 比較する 2 都市（A / B）の選び方。
 *
 * デザイン原案は「押した順に A → B と埋まり、3 つめを押すと A に戻る」だった。
 * これは押してみるまで結果が分からない。3 つめを押した子どもは B が変わると
 * 思っていることが多く、実際には A が消える。しかも取り消せない。
 *
 * そこで「次にどちらへ入るか」を状態として持ち、画面に出すことにした。
 *
 *   1. 今えらび中の枠に入る。どこに入るかは押す前から見えている
 *   2. 入れたあと、もう片方が空ならそちらへ移る。空でなければその枠に留まる
 *      → 両方埋まったあとは、押すたびに「えらび中」の枠だけが変わり続ける。
 *        押していない方が勝手に消えることは無い
 *   3. すでに入っている都市をもう一度押したら、その枠から外す
 *      → 入れるのと同じ操作で戻せる。同じ都市が A と B に並ぶことも防げる
 *
 * 画面を持たない純粋関数にしてあるので、規則そのものをテストで固定できる。
 */

export type PairSlot = 'a' | 'b'

export type Pair = {
  aId: string | null
  bId: string | null
  /** 次に都市を押したときに入る枠 */
  active: PairSlot
}

export const EMPTY_PAIR: Pair = { aId: null, bId: null, active: 'a' }

/** 都市を押したとき。ピンからでも一覧からでも同じ規則で動かす */
export function choosePair(pair: Pair, id: string): Pair {
  // すでに入っている都市なら外す。空いた枠がそのままえらび中になる
  if (id === pair.aId) return { aId: null, bId: pair.bId, active: 'a' }
  if (id === pair.bId) return { aId: pair.aId, bId: null, active: 'b' }

  if (pair.active === 'a') {
    return { aId: id, bId: pair.bId, active: pair.bId === null ? 'b' : 'a' }
  }
  return { aId: pair.aId, bId: id, active: pair.aId === null ? 'a' : 'b' }
}

/** 枠の ✕ を押したとき。空にして、その枠をえらび中にする */
export function clearSlot(pair: Pair, slot: PairSlot): Pair {
  if (slot === 'a') return { aId: null, bId: pair.bId, active: 'a' }
  return { aId: pair.aId, bId: null, active: 'b' }
}

/** 枠そのものを押したとき。中身は変えず、次の行き先だけ切り替える */
export function activateSlot(pair: Pair, slot: PairSlot): Pair {
  return { ...pair, active: slot }
}
