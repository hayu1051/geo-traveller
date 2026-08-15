import type { City, Continent } from '../../data/types.ts'

/*
 * 都市の絞り込み。
 *
 * 検索と大陸フィルタは独立した条件で、両方指定されたら両方に合うものだけが残る。
 * 画面を持たない純粋関数なので、組み合わせの正しさをテストで確かめられる。
 */

/**
 * 検索の対象にする文字列。
 *
 * 「とうきょう」でも「Tokyo」でも「日本」でも引けるようにする。
 * 対象年齢を考えると、漢字が書けなくても読みで引けることが特に大事。
 */
function searchableText(city: City): string[] {
  return [city.nameJa, city.yomi, city.nameLocal, city.country, city.id]
}

/**
 * 都市を絞り込む。
 *
 * query が空なら検索条件なし、continent が null なら大陸の条件なしとして扱う。
 * 並び順は元の配列のまま変えない。
 */
export function filterCities(
  cities: City[],
  query: string,
  continent: Continent | null,
): City[] {
  const needle = query.trim().toLowerCase()

  return cities.filter((city) => {
    if (continent !== null && city.cont !== continent) return false
    if (needle === '') return true
    return searchableText(city).some((text) => text.toLowerCase().includes(needle))
  })
}
