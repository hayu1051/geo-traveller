import { describe, expect, it } from 'vitest'
import {
  FURI_DEFAULT,
  parseFuriSetting,
  stringifyFuriSetting,
} from './setting.ts'

/*
 * 保存された値の読み解き。
 *
 * 確かめたいのは主に「読めない値が来たとき」。localStorage は手で書きかえられるし、
 * 別のアプリが同じキーを使うこともある。何が入っていても既定に倒れて、
 * アプリが開かなくなることが無いようにしたい。
 */

describe('parseFuriSetting', () => {
  it('保存された値をそのまま読む', () => {
    expect(parseFuriSetting('true')).toBe(true)
    expect(parseFuriSetting('false')).toBe(false)
  })

  it('保存が無ければ既定', () => {
    // 初めて開いた人。ふりがなは出ている状態で始まる
    expect(parseFuriSetting(null)).toBe(FURI_DEFAULT)
  })

  it('読めない値は既定に倒す', () => {
    for (const saved of ['', 'yes', 'TRUE', '1', '0', 'null', '{"furi":true}', ' true']) {
      expect(parseFuriSetting(saved), saved).toBe(FURI_DEFAULT)
    }
  })
})

describe('stringifyFuriSetting', () => {
  it('書いた値をそのまま読み戻せる', () => {
    // 保存と読み込みが対になっていないと、次に開いたとき設定が消える
    for (const furiOn of [true, false]) {
      expect(parseFuriSetting(stringifyFuriSetting(furiOn)), String(furiOn)).toBe(furiOn)
    }
  })
})
