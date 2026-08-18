import { useEffect, useState } from 'react'

/*
 * 1 秒ごとに進む「今」。現地時刻の表示に使う。
 *
 * 地球儀の描き直しが 60 秒に 1 回なのとは別系統。あちらは地図を 2 度描くので重いが、
 * こちらは文字列を作り直すだけなので毎秒でも問題にならない。
 *
 * 使うのは時刻を出すパネルだけにすること。App など上の方で呼ぶと、
 * 毎秒アプリ全体が再レンダリングされる。
 */

const TICK_MS = 1000

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
    }, TICK_MS)

    return () => {
      clearInterval(id)
    }
  }, [])

  return now
}
