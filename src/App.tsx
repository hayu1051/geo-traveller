import { useRef, useState, type ReactNode } from 'react'
import AppHeader from './components/AppHeader.tsx'
import GlobeStage from './components/GlobeStage.tsx'
import SmallScreenNotice from './components/SmallScreenNotice.tsx'
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
import { useFuriganaSetting } from './features/furigana/useFuriganaSetting.ts'
import QuizPanel from './features/quiz/QuizPanel.tsx'
import { IDLE_QUIZ_GLOBE, type QuizGlobeState } from './features/quiz/types.ts'
import RecordPanel from './features/record/RecordPanel.tsx'
import { useRecord } from './features/record/useRecord.ts'
import type { TabId } from './features/tabs.ts'
import { useMediaQuery } from './lib/useMediaQuery.ts'
import styles from './App.module.css'

/*
 * スマホと判定する幅。App.module.css の full レイアウトと同じ値にすること。
 * ここがずれると、案内は出ないのにレイアウトだけスマホ用になる。
 */
const NARROW_QUERY = '(max-width: 599px)'

/*
 * 地球儀とパネルの両方が使う値だけをここで持つ。
 * 検索語のようにパネルの中だけで完結するものは、そのパネルに置いておく。
 *
 * パネルは「型」ではなく作った要素を並べている。こうするとパネルごとに
 * 違う props を渡せて、しかも Record<TabId, ...> のままなので
 * タブを増やしてパネルを書き忘れるとコンパイルエラーになる。
 */

/**
 * せまい画面で地球儀にどれだけ場所を渡すか。
 *
 * 実際に何 % にするかは CSS が持つ。ここが決めるのは「今このタブは
 * 地球儀をどれくらい要るか」だけで、幅は見ない。幅を JS で測ると、
 * 端末を回した瞬間に state と本当の幅がずれて、1 フレーム前の見た目が残る。
 */
function globeSpace(tab: TabId, quiz: QuizGlobeState): 'hidden' | 'large' | 'shown' {
  // 記録モードは地球儀を一度も使わない
  if (tab === 'record') return 'hidden'
  // 位置あての出題中。答えるのは地球儀の上なので、パネルより地球儀に場所が要る
  if (tab === 'quiz' && quiz.hideNames) return 'large'
  return 'shown'
}

function App() {
  const [tab, setTab] = useState<TabId>('explore')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [continent, setContinent] = useState<Continent | null>(null)
  const [pair, setPair] = useState<Pair>(EMPTY_PAIR)
  /** クイズが地球儀にお願いしていること（名前を隠す／正解を見せる） */
  const [quizGlobe, setQuizGlobe] = useState<QuizGlobeState>(IDLE_QUIZ_GLOBE)
  /*
   * ふりがなを出すかどうか。前に開いたときの選択を localStorage から引き継ぐ。
   *
   * ここが持つのは true / false だけ。<rt> は最初から DOM にあり、
   * data-furi を見た CSS が表示を切り替える。切り替えのたびに
   * 文字列を作り直したり、DOM をたどって書きかえたりはしない。
   */
  const { furiOn, toggle: toggleFuri } = useFuriganaSetting()

  /*
   * スマホで開いたときの案内。
   *
   * 覚えておかないので、開き直せばまた出る。localStorage に「読んだ」を
   * 残すことも考えたが、そうすると一度うっかり閉じた子には二度と届かない。
   * 止める案内ではなく、すすめる案内なので、毎回出て 1 タップで消える方を選んだ。
   */
  const narrow = useMediaQuery(NARROW_QUERY)
  const [noticeClosed, setNoticeClosed] = useState(false)

  /*
   * 位置あてクイズの解答を受け取る関数の置き場。
   *
   * 答えを判定できるのは、今どの問題を出しているか知っているクイズパネルだけ。
   * ピンが押されたことはここへ届くので、パネルが入れておいた関数へ渡す。
   * 出題中でなければ空なので、押しても何も起きない。
   */
  const pinAnswerRef = useRef<((cityId: string) => void) | null>(null)

  /** 消えない記録。localStorage との出し入れはこの中で起きる */
  const { record, visitCity, answerQuestion, reset } = useRecord()

  /*
   * 都市を開く。選ぶ道すじが 3 つ（一覧・地球儀のピン・記録の見た都市）あるので、
   * 「見た都市に加える」を書き忘れないよう 1 か所にまとめる。
   */
  function selectCity(id: string | null) {
    setSelectedId(id)
    // 閉じるときは null が来る。そのときは見た都市に触らない
    if (id !== null) visitCity(id)
  }

  /*
   * 地球儀のピンは 1 つしかないが、押したときの意味はタブで変わる。
   * 探索モードでは都市を開き、比較モードでは A / B に入れ、クイズでは解答になる。
   * 分岐をここに置くと、地球儀はタブの存在を知らずに済む。
   */
  function handlePinClick(id: string) {
    if (tab === 'quiz') pinAnswerRef.current?.(id)
    else if (tab === 'compare') setPair((prev) => choosePair(prev, id))
    else selectCity(id)
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
        onSelectCity={selectCity}
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
    quiz: (
      <QuizPanel
        onGlobeChange={setQuizGlobe}
        pinAnswerRef={pinAnswerRef}
        onAnswered={answerQuestion}
      />
    ),
    record: (
      <RecordPanel
        record={record}
        onSelectCity={(id) => {
          // 記録から都市を開いたら、見るところは探索モード
          selectCity(id)
          changeTab('explore')
        }}
        onReset={reset}
      />
    ),
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
    <div
      className={styles.app}
      data-furi={furiOn ? 'true' : 'false'}
      data-globe={globeSpace(tab, quizGlobe)}
    >
      <AppHeader
        tab={tab}
        onTabChange={changeTab}
        furiOn={furiOn}
        onFuriToggle={toggleFuri}
      />

      <div className={styles.main}>
        <GlobeStage {...globeMarks} onSelectCity={handlePinClick} />
        <aside className={styles.panel}>{panels[tab]}</aside>
      </div>

      {narrow && !noticeClosed && (
        <SmallScreenNotice
          onClose={() => {
            setNoticeClosed(true)
          }}
        />
      )}
    </div>
  )
}

export default App
