import type { Rng } from './random.ts'
import type { QuizKind } from './types.ts'

/*
 * 出題の履歴。「次に何を出すか」を決める規則だけを持つ。
 *
 * ここで守っていることは2つ。
 *
 * 1. 間違えた問題として積むのは「都市の id」と「種類」だけ。
 *    組み立て済みの問題文や答えは保存しない。#13 の時差クイズは3月と11月の
 *    サマータイム切り替えで答えが変わるので、保存した答えは切り替え日をまたいだ
 *    時点で誤答になる。出すときに作り直せば、いつ解いても正しい。
 *
 * 2. 直前に出した都市は次に出さない。
 *
 * どちらも画面を持たない規則なので、テストで固定できる。
 */

/** 間違えた問題を再び出す確率 */
const REASK_PROBABILITY = 0.4

export type WrongEntry = {
  kind: QuizKind
  cityId: string
}

export type QuizHistory = {
  /** 間違えた問題。古いものから順に並ぶ */
  wrong: WrongEntry[]
  /** 直前に出した都市 */
  lastCityId: string | null
}

export const EMPTY_HISTORY: QuizHistory = {
  wrong: [],
  lastCityId: null,
}

/** 次に何を出すかの決定 */
export type NextPlan = {
  kind: QuizKind
  /** 再出題ならその都市。新しく選ぶなら null */
  cityId: string | null
  /** 積んである間違いから取り出したあとの履歴 */
  history: QuizHistory
}

/**
 * 次の問題を決める。
 *
 * 再出題は「今えらんでいる種類」の中からだけ選ぶ。原案は種類ごと差し替えていたが、
 * 都市あてを解いているつもりで急に国旗が出ると、何を練習しているのか分からなくなる。
 * 別の種類で間違えたぶんは、その種類に切り替えたときに出てくる。
 */
export function planNext(history: QuizHistory, kind: QuizKind, rng: Rng): NextPlan {
  const index = history.wrong.findIndex(
    (entry) => entry.kind === kind && entry.cityId !== history.lastCityId,
  )
  const entry = index === -1 ? undefined : history.wrong[index]

  if (entry === undefined || rng() >= REASK_PROBABILITY) {
    return { kind, cityId: null, history }
  }

  return {
    kind: entry.kind,
    cityId: entry.cityId,
    history: {
      ...history,
      wrong: history.wrong.filter((_, position) => position !== index),
    },
  }
}

/** 出した問題を覚える。連続で同じ都市を出さないために使う */
export function markAsked(history: QuizHistory, cityId: string): QuizHistory {
  return { ...history, lastCityId: cityId }
}

/**
 * 間違えた問題を積む。
 *
 * 同じ問題を2回間違えたら2回積まれる。減らしていないのは、
 * 苦手なものほど出てきてほしいため。再出題した時点で1つ取り除かれるので、
 * 解き続けていれば溜まりっぱなしにはならない。
 */
export function recordWrong(
  history: QuizHistory,
  kind: QuizKind,
  cityId: string,
): QuizHistory {
  return { ...history, wrong: [...history.wrong, { kind, cityId }] }
}
