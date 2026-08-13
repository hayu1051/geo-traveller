import { useState, type ComponentType } from 'react'
import AppHeader from './components/AppHeader.tsx'
import GlobeStage from './components/GlobeStage.tsx'
import ExplorePanel from './features/explore/ExplorePanel.tsx'
import ComparePanel from './features/compare/ComparePanel.tsx'
import QuizPanel from './features/quiz/QuizPanel.tsx'
import RecordPanel from './features/record/RecordPanel.tsx'
import type { TabId } from './features/tabs.ts'
import styles from './App.module.css'

const PANELS: Record<TabId, ComponentType> = {
  explore: ExplorePanel,
  compare: ComparePanel,
  quiz: QuizPanel,
  record: RecordPanel,
}

function App() {
  const [tab, setTab] = useState<TabId>('explore')
  const Panel = PANELS[tab]

  return (
    <div className={styles.app}>
      <AppHeader tab={tab} onTabChange={setTab} />

      <div className={styles.main}>
        <GlobeStage />
        <aside className={styles.panel}>
          <Panel />
        </aside>
      </div>
    </div>
  )
}

export default App
