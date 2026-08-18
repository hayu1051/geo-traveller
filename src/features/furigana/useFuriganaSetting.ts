import { useEffect, useState } from 'react'
import {
  FURI_DEFAULT,
  FURI_STORAGE_KEY,
  parseFuriSetting,
  stringifyFuriSetting,
} from './setting.ts'

/*
 * ふりがなの設定の置き場。localStorage との出し入れと React の state をつなぐ。
 *
 * 値の読み解きは setting.ts にあり、ここには判断を入れない。
 * useRecord.ts と同じ組み立てにそろえてある。
 *
 * localStorage は使えないことがある。プライベートモードや、
 * 保存できる量を使い切ったときで、どちらも例外で知らされる。
 * 設定が残らないだけでアプリは使えるので、握りつぶして先へ進む。
 */

function load(): boolean {
  try {
    return parseFuriSetting(localStorage.getItem(FURI_STORAGE_KEY))
  } catch {
    return FURI_DEFAULT
  }
}

function save(furiOn: boolean): void {
  try {
    localStorage.setItem(FURI_STORAGE_KEY, stringifyFuriSetting(furiOn))
  } catch {
    // 保存できなくても、今の画面の出し入れはできる
  }
}

export type FuriganaSetting = {
  furiOn: boolean
  toggle: () => void
}

export function useFuriganaSetting(): FuriganaSetting {
  /*
   * 初期値を関数のまま渡す。
   *
   * useEffect であとから読むと、最初の1フレームだけ既定の ON で描いてから
   * OFF に変わり、開くたびにルビがちらつく。ここで読めば、
   * 最初の描画から保存された状態になる。
   *
   * useState(load()) と書いてもいけない。使うのは最初の1回だけなのに、
   * 毎回のレンダリングで localStorage を読みに行く。
   */
  const [furiOn, setFuriOn] = useState(load)

  useEffect(() => {
    save(furiOn)
  }, [furiOn])

  return {
    furiOn,
    toggle: () => {
      setFuriOn((value) => !value)
    },
  }
}
