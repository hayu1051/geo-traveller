import { findCity } from '../../data/cities.ts'
import { QUIZ_KINDS, type QuizKind } from '../quiz/types.ts'

/*
 * 学習の記録。画面も localStorage も知らない、値と計算だけの層。
 *
 * 保存と読み込みは useRecord.ts が受け持つ。ここを分けてあるのは、
 * 「保存データが壊れていてもアプリが落ちない」を確かめたいため。
 * localStorage を触る関数の中に検証を書くと、壊れたデータを流し込むテストのたびに
 * ブラウザの仕組みを差し替える仕掛けが要る。parseRecord をただの関数にしておけば、
 * parseRecord(null) と呼ぶだけで済む。
 *
 * 型の名前が StudyRecord なのは、Record が TypeScript の組み込みの型と
 * ぶつかるため。この中でも Record<QuizKind, ...> として使っている。
 */

/** localStorage に使うキー。原案から変えない */
export const STORAGE_KEY = 'gtt-v1'

/** 見た都市の一覧に残す数。古いものから落ちる */
export const VISITED_LIMIT = 40

/** クイズの種類ごとの成績 */
export type KindScore = {
  /** といた数 */
  asked: number
  /** 正解した数 */
  correct: number
}

export type StudyRecord = {
  /** 見た都市の id。新しい順 */
  visited: string[]
  /** 解いた問題数 */
  total: number
  /** 正解した数 */
  correct: number
  /** 最高の連続正解 */
  best: number
  byKind: Record<QuizKind, KindScore>
}

/*
 * 種類ごとの入れ物。QUIZ_KINDS から作らず1つずつ書いているのは、
 * クイズの種類が増えたときにここでコンパイルエラーを出すため。
 * 作れてしまうと、新しい種類だけ成績が数えられないまま気づけない。
 */
function emptyByKind(): Record<QuizKind, KindScore> {
  return {
    city: { asked: 0, correct: 0 },
    flag: { asked: 0, correct: 0 },
    time: { asked: 0, correct: 0 },
    locate: { asked: 0, correct: 0 },
  }
}

export const EMPTY_RECORD: StudyRecord = {
  visited: [],
  total: 0,
  correct: 0,
  best: 0,
  byKind: emptyByKind(),
}

/* ---------- 保存データの検証 ---------- */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 0 以上の整数だけ通す。小数・負の数・数でないものは 0 にする */
function toCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return 0
  return value
}

/**
 * 見た都市の一覧を組み直す。
 *
 * 今のデータに無い id は落とす。開発中に都市を入れ替えているので、
 * 残しておくと「見た都市 12」と出るのに一覧には 10 個しか並ばない、
 * という食い違いが起きる。重複も同じ理由でここで取り除く。
 */
function toVisited(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  const visited: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    if (visited.includes(item)) continue
    if (!findCity(item)) continue
    visited.push(item)
    if (visited.length >= VISITED_LIMIT) break
  }
  return visited
}

function toKindScore(value: unknown): KindScore {
  if (!isObject(value)) return { asked: 0, correct: 0 }
  const asked = toCount(value.asked)
  // 正解数がといた数を超えていたら、正解率が 100% を超えてしまう
  return { asked, correct: Math.min(toCount(value.correct), asked) }
}

function toByKind(value: unknown): Record<QuizKind, KindScore> {
  const byKind = emptyByKind()
  if (!isObject(value)) return byKind

  for (const kind of QUIZ_KINDS) {
    byKind[kind] = toKindScore(value[kind])
  }
  return byKind
}

/**
 * 保存されていた値から記録を組み直す。
 *
 * 受け取るのは JSON.parse の結果、つまり何が入っているか分からない値。
 * 項目ごとに確かめて、通らなかったものは初期値に落とす。
 * 全体を捨てずに項目ごとに直すのは、1つ壊れただけで
 * 今までの記録が丸ごと消えるのを避けるため。
 */
export function parseRecord(raw: unknown): StudyRecord {
  if (!isObject(raw)) return EMPTY_RECORD

  const total = toCount(raw.total)
  return {
    visited: toVisited(raw.visited),
    total,
    correct: Math.min(toCount(raw.correct), total),
    best: toCount(raw.best),
    byKind: toByKind(raw.byKind),
  }
}

/* ---------- 記録の更新 ---------- */

/**
 * 見た都市に加える。すでに入っていれば何もしない。
 *
 * 並べ替えないのは、一覧が「見た順」のまま動かない方が探しやすいため。
 * 同じものを返すのは、変わっていないのに保存と再描画が走らないようにするため。
 */
export function markVisited(record: StudyRecord, cityId: string): StudyRecord {
  if (record.visited.includes(cityId)) return record
  return {
    ...record,
    visited: [cityId, ...record.visited].slice(0, VISITED_LIMIT),
  }
}

/**
 * 1問ぶんの結果を足す。
 *
 * streak は答えたあとの連続正解数。最高記録はここから更新する。
 * クイズ画面が持っている「このかい」の数とは別で、こちらは消さない限り残る。
 */
export function recordAnswer(
  record: StudyRecord,
  kind: QuizKind,
  correct: boolean,
  streak: number,
): StudyRecord {
  const entry = record.byKind[kind]
  const byKind = { ...record.byKind }
  byKind[kind] = {
    asked: entry.asked + 1,
    correct: entry.correct + (correct ? 1 : 0),
  }

  return {
    visited: record.visited,
    total: record.total + 1,
    correct: record.correct + (correct ? 1 : 0),
    best: Math.max(record.best, streak),
    byKind,
  }
}

/* ---------- 表示に使う計算 ---------- */

/** 正解率（%）。1問も解いていなければ null */
export function accuracy(asked: number, correct: number): number | null {
  if (asked === 0) return null
  return Math.round((correct / asked) * 100)
}
