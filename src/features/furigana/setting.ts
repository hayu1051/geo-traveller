/*
 * ふりがなを出すかどうかの設定。
 *
 * 保存された文字列を読み解くところだけを、ブラウザから切り離して置いている。
 * localStorage を触る側（useFuriganaSetting.ts）に検証を書くと、
 * 「壊れた値でも落ちない」を確かめるのにブラウザの仕組みが要る。
 */

/**
 * localStorage に使うキー。
 *
 * 記録の `gtt-v1` とは分けてある。あちらは見た都市や正解数で、
 * `parseRecord` が中身を検証している。そこへ表示の設定を混ぜると、
 * 記録の検証コードが設定のことまで知ることになる。
 */
export const FURI_STORAGE_KEY = 'gtt-furi-v1'

/**
 * 保存が無いときの値。
 *
 * 小学生から使うので、何もしなければふりがなが出る側に倒す。
 */
export const FURI_DEFAULT = true

/**
 * 保存されていた文字列を true / false に直す。
 *
 * 読めない値は既定に倒す。手で書きかえられることも、古い形式が残っていることも
 * ありうるので、「読めなければ既定」で通す。ここで例外を投げると、
 * 一度おかしな値が入っただけでアプリが開かなくなる。
 */
export function parseFuriSetting(saved: string | null): boolean {
  if (saved === 'true') return true
  if (saved === 'false') return false
  return FURI_DEFAULT
}

/** 保存する形。読む側と対にしておく */
export function stringifyFuriSetting(furiOn: boolean): string {
  return furiOn ? 'true' : 'false'
}
