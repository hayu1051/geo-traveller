import { useState } from 'react'
import { findCity } from '../../data/cities.ts'
import { QUIZ_KIND_LABELS, QUIZ_KINDS } from '../quiz/types.ts'
import { accuracy, type StudyRecord } from './record.ts'
import styles from './RecordPanel.module.css'

/*
 * 記録モード。ここは記録を見せるだけで、増やすことはしない。
 * 値をどう足すかは record.ts、どこに保存するかは useRecord.ts にある。
 */

type Props = {
  record: StudyRecord
  /** 見た都市をタップしたとき。探索モードへ移ってその都市を開く */
  onSelectCity: (cityId: string) => void
  onReset: () => void
}

/** 「3 / 5（60%）」の形。まだ解いていなければ「まだ」 */
function scoreText(asked: number, correct: number): string {
  const rate = accuracy(asked, correct)
  if (rate === null) return 'まだ'
  return `${String(correct)} / ${String(asked)}（${String(rate)}%）`
}

function RecordPanel({ record, onSelectCity, onReset }: Props) {
  /*
   * 消す前にひと呼吸おく。原案は押した瞬間に消えるが、
   * 何週間ぶんの記録も戻せないので、同じボタンを確認に切り替える。
   */
  const [confirming, setConfirming] = useState(false)

  const rate = accuracy(record.total, record.correct)
  const stats = [
    { label: '見た都市', value: String(record.visited.length) },
    { label: '解いた問題', value: String(record.total) },
    { label: '正解率', value: rate === null ? '—' : `${String(rate)}%` },
    { label: '最高の連続正解', value: String(record.best) },
  ]

  const visitedCities = record.visited
    .map((id) => findCity(id))
    .filter((city) => city !== undefined)

  return (
    <div className={styles.panel}>
      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.stat}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValue}>{stat.value}</div>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>クイズの種類ごと</h3>
        <div className={styles.kinds}>
          {QUIZ_KINDS.map((kind) => {
            const score = record.byKind[kind]
            const rate = accuracy(score.asked, score.correct)
            return (
              <div key={kind} className={styles.kind}>
                <div className={styles.kindHead}>
                  <span className={styles.kindName}>{QUIZ_KIND_LABELS[kind]}</span>
                  <span className={styles.kindScore}>
                    {scoreText(score.asked, score.correct)}
                  </span>
                </div>
                {/* 棒は数字のおまけ。読み上げには数字だけ届けばよい */}
                <div className={styles.bar} aria-hidden="true">
                  <div className={styles.barFill} style={{ width: `${String(rate ?? 0)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>見た都市（{visitedCities.length}）</h3>
        {visitedCities.length === 0 ? (
          <p className={styles.empty}>
            まだありません。探索モードで都市をえらぶと、ここに たまっていきます。
          </p>
        ) : (
          <div className={styles.visited}>
            {visitedCities.map((city) => (
              <button
                key={city.id}
                type="button"
                className={styles.visitedItem}
                onClick={() => {
                  onSelectCity(city.id)
                }}
              >
                <span className={styles.visitedFlag}>{city.flag}</span>
                <span className={styles.visitedName}>{city.nameJa}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        {confirming ? (
          <div className={styles.confirm}>
            <p className={styles.confirmText}>
              記録をぜんぶ消します。もとに もどせません。
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.danger}
                onClick={() => {
                  onReset()
                  setConfirming(false)
                }}
              >
                消す
              </button>
              <button
                type="button"
                className={styles.cancel}
                onClick={() => {
                  setConfirming(false)
                }}
              >
                やめる
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              setConfirming(true)
            }}
          >
            記録をリセット
          </button>
        )}
      </section>
    </div>
  )
}

export default RecordPanel
