import { useRef, useState, type ReactNode } from 'react'
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
import { IDLE_QUIZ_GLOBE, type QuizGlobeState } from './features/quiz/types.ts'
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
  /** クイズが地球儀にお願いしていること（名前を隠す／正解を見せる） */
  const [quizGlobe, setQuizGlobe] = useState<QuizGlobeState>(IDLE_QUIZ_GLOBE)

  /*
   * 位置あてクイズの解答を受け取る関数の置き場。
   *
   * 答えを判定できるのは、今どの問題を出しているか知っているクイズパネルだけ。
   * ピンが押されたことはここへ届くので、パネルが入れておいた関数へ渡す。
   * 出題中でなければ空なので、押しても何も起きない。
   */
  const pinAnswerRef = useRef<((cityId: string) => void) | null>(null)

  /*
   * 地球儀のピンは 1 つしかないが、押したときの意味はタブで変わる。
   * 探索モードでは都市を開き、比較モードでは A / B に入れ、クイズでは解答になる。
   * 分岐をここに置くと、地球儀はタブの存在を知らずに済む。
   */
  function handlePinClick(id: string) {
    if (tab === 'quiz') pinAnswerRef.current?.(id)
    else if (tab === 'compare') setPair((prev) => choosePair(prev, id))
    else setSelectedId(id)
  }

  /*
   * タブを移ると、表示していないパネルは DOM ごと消える。
   * クイズパネルが消えても、そこから受け取った「名前を隠して」は残ってしまうので、
   * ここで取り下げる。これが無いと、位置あての出題中にタブを移って戻ったとき、
   * まだ始めていない画面なのに名前が隠れたままになる。
   */
  function changeTab(next: TabId) {
    setTab(next)
    if (next !== 'quiz') setQuizGlobe(IDLE_QUIZ_GLOBE)
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
    quiz: <QuizPanel onGlobeChange={setQuizGlobe} pinAnswerRef={pinAnswerRef} />,
    record: <RecordPanel />,
  }

  /*
   * 地球儀に伝える印は、今そのタブで意味のあるものだけにする。
   *
   * 比較モードで探索モードの選択が紫のまま残っていると、A・B の印と混ざって
   * どれが比べられている都市なのか分からなくなる。
   * クイズモードで指すのは、答え合わせが済んだ正解の都市だけ。出題中は何も指さない。
   *
   * 名前を隠すのもクイズタブのときだけにしてある。こう書いておくと、
   * 位置あてを出題したままタブを移ってクイズパネルが消えても、
   * 隠したままの合図がどこにも残らない。
   */
  const globeMarks =
    tab === 'compare'
      ? {
          selectedId: null,
          continent: null,
          compareAId: pair.aId,
          compareBId: pair.bId,
          hideNames: false,
        }
      : tab === 'quiz'
        ? {
            selectedId: quizGlobe.focusId,
            continent: null,
            compareAId: null,
            compareBId: null,
            hideNames: quizGlobe.hideNames,
          }
        : { selectedId, continent, compareAId: null, compareBId: null, hideNames: false }

  return (
    <div className={styles.app}>
      <AppHeader tab={tab} onTabChange={changeTab} />

      <div className={styles.main}>
        <GlobeStage {...globeMarks} onSelectCity={handlePinClick} />
        <aside className={styles.panel}>{panels[tab]}</aside>
      </div>
    </div>
  )
}

export default App
