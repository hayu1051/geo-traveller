import { useState, type ReactNode } from 'react'
import AppHeader from './components/AppHeader.tsx'
import GlobeStage from './components/GlobeStage.tsx'
import type { Continent } from './data/types.ts'
import ExplorePanel from './features/explore/ExplorePanel.tsx'
import ComparePanel from './features/compare/ComparePanel.tsx'
import {
  activateSlot,
  choosePair,
  clearSlot,
  EMPTY_PAIR,
  type Pair,
} from './features/compare/selection.ts'
import QuizPanel from './features/quiz/QuizPanel.tsx'
import RecordPanel from './features/record/RecordPanel.tsx'
import type { TabId } from './features/tabs.ts'
import styles from './App.module.css'

/*
 * 地球儀とパネルの両方が使う値だけをここで持つ。
 * 検索語のようにパネルの中だけで完結するものは、そのパネルに置いておく。
 *
 * パネルは「型」ではなく作った要素を並べている。こうするとパネルごとに
 * 違う props を渡せて、しかも Record<TabId, ...> のままなので
 * タブを増やしてパネルを書き忘れるとコンパイルエラーになる。
 */

function App() {
  const [tab, setTab] = useState<TabId>('explore')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [continent, setContinent] = useState<Continent | null>(null)
  const [pair, setPair] = useState<Pair>(EMPTY_PAIR)

  /*
   * 地球儀のピンは 1 つしかないが、押したときの意味はタブで変わる。
   * 探索モードでは都市を開き、比較モードでは A / B に入れる。
   * 分岐をここに置くと、地球儀はタブの存在を知らずに済む。
   */
  function handlePinClick(id: string) {
    if (tab === 'compare') setPair((prev) => choosePair(prev, id))
    else setSelectedId(id)
  }

  /*
   * 表示するのは 1 つだけ。残りは要素が作られるだけで描画されない。
   * タブを離れたパネルは DOM から消えるので、ライブ映像も一緒に止まる。
   */
  const panels: Record<TabId, ReactNode> = {
    explore: (
      <ExplorePanel
        selectedId={selectedId}
        continent={continent}
        onSelectCity={setSelectedId}
        onContinentChange={setContinent}
      />
    ),
    compare: (
      <ComparePanel
        pair={pair}
        onChooseCity={(id) => {
          setPair((prev) => choosePair(prev, id))
        }}
        onClearSlot={(slot) => {
          setPair((prev) => clearSlot(prev, slot))
        }}
        onActivateSlot={(slot) => {
          setPair((prev) => activateSlot(prev, slot))
        }}
      />
    ),
    quiz: <QuizPanel />,
    record: <RecordPanel />,
  }

  /*
   * 地球儀に伝える印は、今そのタブで意味のあるものだけにする。
   * 比較モードで探索モードの選択が紫のまま残っていると、A・B の印と混ざって
   * どれが比べられている都市なのか分からなくなる。
   */
  const isCompare = tab === 'compare'

  return (
    <div className={styles.app}>
      <AppHeader tab={tab} onTabChange={setTab} />

      <div className={styles.main}>
        <GlobeStage
          selectedId={isCompare ? null : selectedId}
          continent={isCompare ? null : continent}
          compareAId={isCompare ? pair.aId : null}
          compareBId={isCompare ? pair.bId : null}
          onSelectCity={handlePinClick}
        />
        <aside className={styles.panel}>{panels[tab]}</aside>
      </div>
    </div>
  )
}

export default App
