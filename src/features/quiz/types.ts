import type { City } from '../../data/types.ts'
import type { Rng } from './random.ts'

/*
 * クイズの型。
 *
 * 種類は最終的に4つになる（#14 で位置あて）。
 * 増やすときは QUIZ_KINDS に足せば、ラベルの表も Record<QuizKind, string> なので
 * 書き忘れがコンパイルエラーになる。createQuestion の switch も同じように怒られる。
 */

export const QUIZ_KINDS = ['city', 'flag', 'time'] as const

export type QuizKind = (typeof QUIZ_KINDS)[number]

export const QUIZ_KIND_LABELS: Record<QuizKind, string> = {
  city: '都市あて',
  flag: '国旗',
  time: '時差計算',
}

/** 選択肢の数 */
export const CHOICE_COUNT = 4

export type Choice = {
  /** 選択肢を見分ける値。答え合わせは Question.answerId との一致で行う */
  id: string
  label: string
}

export type Question = {
  kind: QuizKind
  /** 問題文 */
  text: string
  /**
   * 追加のヒント。都市あてでミニ豆知識、時差計算で標準時の経線を出す。
   * 問題文と分けてあるのは、画面で小さく別行に置いて「おまけの手がかり」に見せるため。
   */
  hint?: string
  /** 国旗クイズで出す絵文字。ほかの種類では持たない */
  flag?: string
  choices: Choice[]
  answerId: string
  /** 答え合わせのあとに出す説明 */
  explain: string
  /**
   * この問題の題材になった都市。
   *
   * answerId とは分けてある。都市あてと国旗では同じ値になるが、時差計算は
   * 「何時何分か」を答えるので answerId が時刻の文字列になる。
   * 間違えた問題を積むときと、地球儀を回すときに使うのはこちら。
   */
  cityId: string
}

export type QuestionOptions = {
  kind: QuizKind
  cities: City[]
  /** この都市で作る。null なら選び直す。間違えた問題の再出題で使う */
  cityId: string | null
  /** 直前に出した都市。同じ問題が続かないよう候補から外す */
  excludeCityId: string | null
  /**
   * いつの時点で解いているか。時差計算がサマータイムを見るために要る。
   *
   * 引数で受け取っているのは、テストで日付を固定するため。
   * ここで new Date() を呼んでしまうと、3月と11月の切り替え日をまたいだ瞬間に
   * テストの結果が変わってしまう。
   */
  date: Date
  rng: Rng
}
