/*
 * 出題に使う乱数。
 *
 * Math.random を直に呼ばず、関数として受け取る形にしてある。
 * こうしておくと、テストで「決まった順番の数」を渡して、
 * 「むずかしい問題では同じ大陸から選択肢が作られる」のような規則を
 * 運任せにせず確かめられる。
 */

export type Rng = () => number

/** 1つ選ぶ。空の配列は呼び出し側の間違いなので、黙って進まず止める */
export function pick<T>(items: readonly T[], rng: Rng): T {
  const item = items[Math.floor(rng() * items.length)]
  if (item === undefined) throw new Error('空の配列からは選べません')
  return item
}

/**
 * 並びをばらばらにする。
 *
 * 要素を1つずつ入れ替えていく書き方（Fisher-Yates）が定番だが、
 * この構成では配列の添字アクセスが `T | undefined` になるため、
 * 中身のある要素にも undefined の確認が要り読みにくくなる。
 * 乱数を1つ添えて並べ替える形にすると、添字を触らずに済む。
 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  return items
    .map((item) => ({ item, order: rng() }))
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.item)
}

/** ばらばらにしてから先頭から count 個。足りなければあるだけ返す */
export function sample<T>(items: readonly T[], count: number, rng: Rng): T[] {
  return shuffle(items, rng).slice(0, count)
}
