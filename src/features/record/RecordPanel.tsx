import { useState } from 'react'
import { findCity } from '../../data/cities.ts'
import { QUIZ_KIND_LABELS, QUIZ_KINDS } from '../quiz/types.ts'
import Furi from '../furigana/Furi.tsx'
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
            <div className={styles.statLabel}>
              <Furi>{stat.label}</Furi>
            </div>
            <div className={styles.statValue}>{stat.value}</div>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Furi>クイズの種類ごと</Furi>
        </h3>
        <div className={styles.kinds}>
          {QUIZ_KINDS.map((kind) => {
            const score = record.byKind[kind]
            const rate = accuracy(score.asked, score.correct)
            return (
              <div key={kind} className={styles.kind}>
                <div className={styles.kindHead}>
                  <span className={styles.kindName}>
                    <Furi>{QUIZ_KIND_LABELS[kind]}</Furi>
                  </span>
                  <span className={styles.kindScore}>
                    <Furi>{scoreText(score.asked, score.correct)}</Furi>
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
        <h3 className={styles.sectionTitle}>
          <Furi>見た都市</Furi>（{visitedCities.length}）
        </h3>
        {visitedCities.length === 0 ? (
          <p className={styles.empty}>
            <Furi>まだありません。探索モードで都市をえらぶと、ここに たまっていきます。</Furi>
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
                <span className={styles.visitedName}>
                  <Furi>{city.nameJa}</Furi>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        {confirming ? (
          <div className={styles.confirm}>
            <p className={styles.confirmText}>
              <Furi>記録をぜんぶ消します。もとに もどせません。</Furi>
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
                <Furi>消す</Furi>
              </button>
              <button
                type="button"
                className={styles.cancel}
                onClick={() => {
                  setConfirming(false)
                }}
              >
                <Furi>やめる</Furi>
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
            <Furi>記録をリセット</Furi>
          </button>
        )}
      </section>
    </div>
  )
}

export default RecordPanel
