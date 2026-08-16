/*
 * クイズの型。
 *
 * 種類は最終的に4つになる（#13 で時差、#14 で位置あて）。
 * 今は都市あてと国旗の2つ。増やすときは QUIZ_KINDS に足せば、
 * ラベルの表も Record<QuizKind, string> なので書き忘れがコンパイルエラーになる。
 */

export const QUIZ_KINDS = ['city', 'flag'] as const

export type QuizKind = (typeof QUIZ_KINDS)[number]

export const QUIZ_KIND_LABELS: Record<QuizKind, string> = {
  city: '都市あて',
  flag: '国旗',
}

export type Choice = {
  /** 選択肢を見分ける値。答え合わせは Question.answerId との一致で行う */
  id: string
  label: string
}

export type Question = {
  kind: QuizKind
  /** 問題文 */
  text: string
  /** 国旗クイズで出す絵文字。都市あてでは持たない */
  flag?: string
  choices: Choice[]
  answerId: string
  /** 答え合わせのあとに出す説明 */
  explain: string
  /**
   * この問題の題材になった都市。
   *
   * answerId とは分けてある。今の2種類では同じ値になるが、#13 の時差クイズは
   * 「何時何分か」を答えるので answerId が都市の id ではなくなる。
   * 間違えた問題を積むときと、地球儀を回すときに使うのはこちら。
   */
  cityId: string
}
