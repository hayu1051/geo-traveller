import { useEffect, useState, type RefObject } from 'react'
import { CITIES, findCity } from '../../data/cities.ts'
import {
  EMPTY_HISTORY,
  markAsked,
  planNext,
  recordWrong,
  type QuizHistory,
} from './history.ts'
import { createQuestion } from './question.ts'
import styles from './QuizPanel.module.css'
import { playResultSound } from './sound.ts'
import {
  answersOnGlobe,
  IDLE_QUIZ_GLOBE,
  QUIZ_KIND_LABELS,
  QUIZ_KINDS,
  type Question,
  type QuizGlobeState,
  type QuizKind,
} from './types.ts'

/*
 * クイズモード。出題 → 回答 → 正誤 → 次の問題 のループ。
 *
 * 「何を出すか」の規則は history.ts、「どう作るか」は question.ts にあり、
 * どちらも純粋関数になっている。ここが持つのは画面と、今どこまで進んだかだけ。
 *
 * 記録の保存（localStorage）は #15 で入れる。ここでは今回のぶんだけ数える。
 */

type Props = {
  /** ピンの名前を隠すか、どの都市を見せるかを地球儀へ伝える */
  onGlobeChange: (state: QuizGlobeState) => void
  /**
   * 地球儀のピンが押されたときに呼ぶ関数の置き場。
   *
   * 位置あてクイズだけは、答えが画面の中ではなく地球儀から来る。
   * 親から子へ props を渡すのとは逆向きなので、親に用意してもらった入れ物へ
   * こちらから関数を置く。GlobeStage が onSelectCity でやっているのと同じ形。
   * 出題中でなければ null を入れて、ピンを押しても何も起きないようにする。
   */
  pinAnswerRef: RefObject<((cityId: string) => void) | null>
}

type Result = {
  choiceId: string
  correct: boolean
}

/**
 * スピーカーの絵。今どちらの状態かを絵で示す（音が出ていれば波、消えていれば ✕）。
 * 動画サイトなどでよく見る形に合わせてある。
 */
function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      {/* スピーカー本体 */}
      <path d="M4 9.5h3.2L11.5 6v12L7.2 14.5H4z" fill="currentColor" />
      {on ? (
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 9.2a4 4 0 0 1 0 5.6" />
          <path d="M17.8 6.6a8 8 0 0 1 0 10.8" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m15.5 9.5 5 5" />
          <path d="m20.5 9.5-5 5" />
        </g>
      )}
    </svg>
  )
}

function QuizPanel({ onGlobeChange, pinAnswerRef }: Props) {
  const [kind, setKind] = useState<QuizKind>('city')
  const [question, setQuestion] = useState<Question | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [history, setHistory] = useState<QuizHistory>(EMPTY_HISTORY)
  const [asked, setAsked] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const [soundOn, setSoundOn] = useState(true)

  function nextQuestion(nextKind: QuizKind) {
    const plan = planNext(history, nextKind, Math.random)
    const created = createQuestion({
      kind: plan.kind,
      cities: CITIES,
      cityId: plan.cityId,
      excludeCityId: history.lastCityId,
      // 出すたびに今の時刻で作り直す。サマータイムが切り替わっても答えがずれない
      date: new Date(),
      rng: Math.random,
    })

    setHistory(markAsked(plan.history, created.cityId))
    setQuestion(created)
    setResult(null)
    // 位置あてはここから名前を隠す。ほかの種類なら隠したままにしない
    onGlobeChange({ hideNames: answersOnGlobe(created.kind), focusId: null })
  }

  function answer(choiceId: string) {
    // 二度押しで記録が二重に増えないよう、答え済みなら何もしない
    if (!question || result) return

    const ok = choiceId === question.answerId
    setResult({ choiceId, correct: ok })
    if (soundOn) playResultSound(ok)

    setAsked((value) => value + 1)
    if (ok) {
      setCorrect((value) => value + 1)
      setStreak((value) => {
        const next = value + 1
        setBest((current) => Math.max(current, next))
        return next
      })
    } else {
      setStreak(0)
      setHistory((current) => recordWrong(current, question.kind, question.cityId))
    }

    /*
     * 答えたあとに正解の都市を見せる。位置と結びつけて覚えてもらう。
     * 位置あてではここで名前も戻る。押した場所と正解を見比べられるようにするため。
     */
    onGlobeChange({ hideNames: false, focusId: question.cityId })
  }

  /*
   * 地球儀のピンで答える。位置あてを出題中のときだけ受けつける。
   *
   * 置き直しに依存の配列を付けていないのは、question と result が変わるたびに
   * 中身の違う関数へ入れ替える必要があるため。タブを離れて消えるときは
   * 後片づけで空にして、もう画面に無い関数がピンから呼ばれないようにする。
   */
  useEffect(() => {
    const locating = question !== null && answersOnGlobe(question.kind) && result === null
    pinAnswerRef.current = locating ? answer : null
    return () => {
      pinAnswerRef.current = null
    }
  })

  function changeKind(nextKind: QuizKind) {
    setKind(nextKind)
    if (question) nextQuestion(nextKind)
  }

  function quit() {
    setQuestion(null)
    setResult(null)
    setAsked(0)
    setCorrect(0)
    setStreak(0)
    setBest(0)
    onGlobeChange(IDLE_QUIZ_GLOBE)
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <div className={styles.kinds}>
          {QUIZ_KINDS.map((id) => (
            <button
              key={id}
              type="button"
              className={`${styles.kind} ${kind === id ? styles.kindActive : ''}`}
              aria-pressed={kind === id}
              onClick={() => {
                changeKind(id)
              }}
            >
              {QUIZ_KIND_LABELS[id]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.sound}
          title={soundOn ? '音を消す' : '音を出す'}
          aria-label={soundOn ? '音を消す' : '音を出す'}
          onClick={() => {
            setSoundOn((value) => !value)
          }}
        >
          <SoundIcon on={soundOn} />
        </button>
      </div>

      {question === null ? (
        <div className={styles.start}>
          <p className={styles.startText}>
            {QUIZ_KIND_LABELS[kind]}クイズをはじめます。
            <br />
            まちがえた問題は、あとでもう一度出てきます。
          </p>
          <button
            type="button"
            className={styles.primary}
            onClick={() => {
              nextQuestion(kind)
            }}
          >
            はじめる
          </button>
        </div>
      ) : (
        <>
          <div className={styles.scores}>
            <div className={styles.score}>
              <div className={styles.scoreLabel}>といた数</div>
              <div className={styles.scoreValue}>{asked}</div>
            </div>
            <div className={styles.score}>
              <div className={styles.scoreLabel}>正解</div>
              <div className={styles.scoreValue}>{correct}</div>
            </div>
            <div className={styles.score}>
              <div className={styles.scoreLabel}>連続正解</div>
              <div className={styles.scoreValue}>{streak}</div>
            </div>
            <div className={styles.score}>
              <div className={styles.scoreLabel}>最高記録</div>
              <div className={styles.scoreValue}>{best}</div>
            </div>
          </div>

          <div className={styles.question}>
            {question.flag !== undefined && (
              <div className={styles.flag} role="img" aria-label="国旗">
                {question.flag}
              </div>
            )}
            <p className={styles.text}>{question.text}</p>
            {question.hint !== undefined && (
              <p className={styles.hint}>
                <span className={styles.hintLabel}>ヒント</span>
                {question.hint}
              </p>
            )}
          </div>

          {answersOnGlobe(question.kind) ? (
            /*
             * 位置あては選択肢が無い。ここを空のままにするとパネルが壊れて見えるので、
             * 選択肢と同じ場所に、今なにをすればよいかを出しておく。
             */
            <div className={result ? styles.tappedDone : styles.tapping}>
              {result === null
                ? '地球儀の ？ のピンをタップしてこたえてね'
                : `タップしたのは ${findCity(result.choiceId)?.nameJa ?? '？'} です`}
            </div>
          ) : (
            <div className={styles.choices}>
              {question.choices.map((choice) => {
                const isAnswer = choice.id === question.answerId
                const isPicked = result?.choiceId === choice.id
                const state = !result
                  ? ''
                  : isAnswer
                    ? styles.choiceCorrect
                    : isPicked
                      ? styles.choiceWrong
                      : styles.choiceMuted
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className={`${styles.choice} ${state ?? ''}`}
                    disabled={result !== null}
                    onClick={() => {
                      answer(choice.id)
                    }}
                  >
                    {choice.label}
                    {result && isAnswer && <span className={styles.mark}>正解</span>}
                    {result && isPicked && !isAnswer && (
                      <span className={styles.mark}>えらんだ答え</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {result && (
            <div className={result.correct ? styles.feedbackOk : styles.feedbackNg}>
              <div className={styles.verdict}>
                {result.correct ? '正解！' : 'ざんねん…'}
              </div>
              <p className={styles.explain}>{question.explain}</p>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={result === null}
              onClick={() => {
                nextQuestion(kind)
              }}
            >
              次の問題
            </button>
            <button type="button" className={styles.quit} onClick={quit}>
              やめる
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default QuizPanel
