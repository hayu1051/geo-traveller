import { useState } from 'react'
import { CITIES } from '../../data/cities.ts'
import { CONTINENTS, type City, type Continent } from '../../data/types.ts'
import { formatLocalTime } from '../../lib/time.ts'
import { useNow } from '../../lib/useNow.ts'
import Furi from '../furigana/Furi.tsx'
import CityDetail from './CityDetail.tsx'
import styles from './ExplorePanel.module.css'
import { filterCities } from './search.ts'

/*
 * 探索モード。
 *
 * 検索語だけはこのコンポーネントが持つ。他が使わないので上へ渡す必要がなく、
 * タブを離れれば消えてほしい値でもある。
 * 選択中の都市と大陸は地球儀のピンにも影響するので App が持つ。
 */

type Props = {
  selectedId: string | null
  continent: Continent | null
  onSelectCity: (id: string | null) => void
  onContinentChange: (continent: Continent | null) => void
}

/**
 * 都市の一覧。
 *
 * 現地時刻を出すため 1 秒ごとに作り直される。検索欄まで巻き込まないよう、
 * useNow はこの中で呼んで再描画の範囲をここに閉じている。
 */
function CityList({ cities, onSelect }: { cities: City[]; onSelect: (id: string) => void }) {
  const now = useNow()

  if (cities.length === 0) {
    return (
      <p className={styles.emptyResult}>
        <Furi>見つかりませんでした。</Furi>
        <br />
        <Furi>ひらがなでも探せます（例: とうきょう）。</Furi>
      </p>
    )
  }

  return (
    <ul className={styles.list}>
      {cities.map((city) => (
        <li key={city.id}>
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onSelect(city.id)
            }}
          >
            <span className={styles.itemFlag}>{city.flag}</span>
            <span className={styles.itemNames}>
              <span className={styles.itemName}>
                <Furi>{city.nameJa}</Furi>
              </span>
              <span className={styles.itemSub}>
                <Furi>{city.country}</Furi>
              </span>
            </span>
            <span className={styles.itemTime}>{formatLocalTime(city.tz, now)}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ExplorePanel({ selectedId, continent, onSelectCity, onContinentChange }: Props) {
  const [query, setQuery] = useState('')

  const selected = CITIES.find((city) => city.id === selectedId)
  const results = filterCities(CITIES, query, continent)

  function handleChipClick(next: Continent | null) {
    // 同じ大陸をもう一度押したら解除する
    onContinentChange(continent === next ? null : next)
  }

  function handleSelect(id: string) {
    // 戻ったときに 1 件だけの一覧にならないよう、検索語は持ち越さない
    setQuery('')
    onSelectCity(id)
  }

  /*
   * 詳細を開いているあいだは、検索欄も大陸チップも出さない。
   * 今見ているものが 1 つに絞られている状態で、絞り込みの道具が並んでいると
   * 何を操作しているのか分かりにくい。戻るボタンで一覧へ帰る。
   */
  if (selected) {
    return (
      // key を都市 id にすると、都市を変えたときにライブ映像が作り直されて止まる
      <CityDetail
        key={selected.id}
        city={selected}
        onBack={() => {
          onSelectCity(null)
        }}
      />
    )
  }

  return (
    <div className={styles.panel}>
      <div className={styles.search}>
        <svg
          className={styles.searchIcon}
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          className={styles.searchInput}
          type="search"
          value={query}
          placeholder="都市の名前で探す"
          aria-label="都市の名前で探す"
          onChange={(event) => {
            setQuery(event.target.value)
          }}
        />
        {query !== '' && (
          <button
            type="button"
            className={styles.clear}
            aria-label="検索をやめる"
            onClick={() => {
              setQuery('')
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.chips}>
        <button
          type="button"
          className={`${styles.chip} ${continent === null ? styles.chipActive : ''}`}
          aria-pressed={continent === null}
          onClick={() => {
            handleChipClick(null)
          }}
        >
          <Furi>全部</Furi>
        </button>
        {CONTINENTS.map((name) => (
          <button
            key={name}
            type="button"
            className={`${styles.chip} ${continent === name ? styles.chipActive : ''}`}
            aria-pressed={continent === name}
            onClick={() => {
              handleChipClick(name)
            }}
          >
            {name}
          </button>
        ))}
      </div>

      <div className={styles.count}>
        {results.length}
        <Furi>件</Furi>
      </div>
      <CityList cities={results} onSelect={handleSelect} />
    </div>
  )
}

export default ExplorePanel
