import { useState, type ReactNode } from 'react'
import AppHeader from './components/AppHeader.tsx'
import GlobeStage from './components/GlobeStage.tsx'
import type { Continent } from './data/types.ts'
import ExplorePanel from './features/explore/ExplorePanel.tsx'
import ComparePanel from './features/compare/ComparePanel.tsx'
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
    compare: <ComparePanel />,
    quiz: <QuizPanel />,
    record: <RecordPanel />,
  }

  return (
    <div className={styles.app}>
      <AppHeader tab={tab} onTabChange={setTab} />

      <div className={styles.main}>
        <GlobeStage
          selectedId={selectedId}
          continent={continent}
          onSelectCity={setSelectedId}
        />
        <aside className={styles.panel}>{panels[tab]}</aside>
      </div>
    </div>
  )
}

export default App
