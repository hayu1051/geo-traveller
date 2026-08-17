import { useEffect, useState } from 'react'
import type { QuizKind } from '../quiz/types.ts'
import {
  EMPTY_RECORD,
  markVisited,
  parseRecord,
  recordAnswer,
  STORAGE_KEY,
  type StudyRecord,
} from './record.ts'

/*
 * 記録の置き場。localStorage との出し入れと、React の state をつなぐ。
 *
 * 値の中身と計算は record.ts にあり、ここには判断が入らないようにしてある。
 * こうしておくと、テストしたいこと（壊れたデータを読んでも落ちない）は
 * ブラウザの仕組みを持ち出さずに確かめられる。
 *
 * localStorage は使えないことがある。プライベートモードや、
 * 保存できる量を使い切ったときで、どちらも例外で知らされる。
 * 記録が残らないだけでアプリは使えるので、握りつぶして先へ進む。
 */

function load(): StudyRecord {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === null) return EMPTY_RECORD

    // JSON.parse は何でも返してくるので、型を付けずに検証へ渡す
    const raw: unknown = JSON.parse(saved)
    return parseRecord(raw)
  } catch {
    return EMPTY_RECORD
  }
}

function save(record: StudyRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // 保存できなくても、今つけている記録は画面に出せる
  }
}

export type RecordStore = {
  record: StudyRecord
  /** 都市を開いた。見た都市に加える */
  visitCity: (cityId: string) => void
  /** 1問答えた。streak は答えたあとの連続正解数 */
  answerQuestion: (kind: QuizKind, correct: boolean, streak: number) => void
  /** すべて消す */
  reset: () => void
}

export function useRecord(): RecordStore {
  /*
   * 初期値を関数のまま渡す。useState(load()) と書くと、
   * 使うのは最初の1回だけなのに毎回のレンダリングで localStorage を読みに行く。
   */
  const [record, setRecord] = useState<StudyRecord>(load)

  /*
   * 変わるたびに書き出す。最初の1回は読んだものをそのまま書き戻すことになるが、
   * そのときに壊れていた項目が直った形で保存されるので、無駄ではない。
   */
  useEffect(() => {
    save(record)
  }, [record])

  return {
    record,
    visitCity: (cityId) => {
      setRecord((current) => markVisited(current, cityId))
    },
    answerQuestion: (kind, correct, streak) => {
      setRecord((current) => recordAnswer(current, kind, correct, streak))
    },
    reset: () => {
      setRecord(EMPTY_RECORD)
    },
  }
}
