import { useMemo, useSyncExternalStore } from 'react'

/*
 * CSS のメディアクエリを React から見る。
 *
 * レイアウトそのものは CSS が持つ。ここを使うのは、置き場所ではなく
 * 「出す / 出さない」を決めたいときだけにすること。幅の判定が CSS と JS の
 * 2 か所に散ると、片方だけ直したときに食い違う。
 */

/**
 * 渡したメディアクエリに今あてはまっているか。端末を回すと勝手に変わる。
 *
 * @param query 例: '(max-width: 599px)'
 */
export function useMediaQuery(query: string): boolean {
  /*
   * MediaQueryList は毎回作り直すと購読し直しになる。
   * query が変わったときだけ作る。
   */
  const [subscribe, getSnapshot] = useMemo(() => {
    const list = window.matchMedia(query)

    /*
     * メソッドではなくアロー関数の組で返す。
     * useSyncExternalStore へは関数だけを切り離して渡すので、
     * オブジェクトのメソッドにすると this を持ち出す形になってしまう。
     */
    const onSubscribe = (onChange: () => void) => {
      list.addEventListener('change', onChange)
      return () => {
        list.removeEventListener('change', onChange)
      }
    }

    return [onSubscribe, () => list.matches] as const
  }, [query])

  /*
   * useState + useEffect ではなく useSyncExternalStore を使う。
   * あちらは最初の 1 回が必ず初期値になるので、せまい画面でも
   * 「一瞬ひろい画面のつもりで描いてから直す」ちらつきが出る。
   */
  return useSyncExternalStore(subscribe, getSnapshot)
}
