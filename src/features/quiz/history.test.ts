import { describe, expect, it } from 'vitest'
import { EMPTY_HISTORY, markAsked, planNext, recordWrong, type QuizHistory } from './history.ts'

/*
 * Issue の完了条件のうち2つが、そのままここのテストになっている。
 *
 *   間違えた問題が後でまた出てくる      → 「再出題」
 *   連続で解いても同じ問題が続けて出ない → 「連続で同じ問題を出さない」
 *
 * 再出題は 40% の確率なので、乱数を固定して「出る側」と「出ない側」を作り分ける。
 */

/** 必ず再出題される乱数（0.4 未満） */
const REASK = () => 0.1

/** 必ず新しい問題になる乱数（0.4 以上） */
const FRESH = () => 0.9

describe('recordWrong', () => {
  it('都市と種類だけを積む', () => {
    const history = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
    expect(history.wrong).toEqual([{ kind: 'city', cityId: 'tokyo' }])
  })

  it('同じ問題を2回間違えたら2回積まれる', () => {
    let history = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
    history = recordWrong(history, 'city', 'tokyo')
    expect(history.wrong).toHaveLength(2)
  })

  it('古いものが先に並ぶ', () => {
    let history = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
    history = recordWrong(history, 'flag', 'lima')
    expect(history.wrong.map((entry) => entry.cityId)).toEqual(['tokyo', 'lima'])
  })

  it('元の履歴を書き換えない', () => {
    const before = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
    recordWrong(before, 'city', 'lima')
    expect(before.wrong).toHaveLength(1)
  })
})

describe('markAsked', () => {
  it('直前に出した都市を覚える', () => {
    expect(markAsked(EMPTY_HISTORY, 'tokyo').lastCityId).toBe('tokyo')
  })

  it('間違えた問題には触らない', () => {
    const history = markAsked(recordWrong(EMPTY_HISTORY, 'city', 'lima'), 'tokyo')
    expect(history.wrong).toHaveLength(1)
  })
})

describe('planNext', () => {
  it('間違えた問題が無ければ、新しい問題になる', () => {
    const plan = planNext(EMPTY_HISTORY, 'city', REASK)
    expect(plan).toEqual({ kind: 'city', cityId: null, history: EMPTY_HISTORY })
  })

  describe('再出題', () => {
    it('積んである問題が出てくる', () => {
      const history = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
      const plan = planNext(history, 'city', REASK)
      expect(plan.cityId).toBe('tokyo')
      expect(plan.kind).toBe('city')
    })

    it('出した問題は積みから取り除かれる', () => {
      const history = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
      expect(planNext(history, 'city', REASK).history.wrong).toEqual([])
    })

    it('古いものから順に出る', () => {
      let history = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
      history = recordWrong(history, 'city', 'lima')
      const plan = planNext(history, 'city', REASK)
      expect(plan.cityId).toBe('tokyo')
      expect(plan.history.wrong).toEqual([{ kind: 'city', cityId: 'lima' }])
    })

    it('確率から外れたら新しい問題になり、積みは減らない', () => {
      const history = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
      const plan = planNext(history, 'city', FRESH)
      expect(plan.cityId).toBeNull()
      expect(plan.history.wrong).toHaveLength(1)
    })

    it('えらんでいる種類の問題だけが出てくる', () => {
      // 国旗で間違えたぶんは、都市あてを解いている間は出てこない
      const history = recordWrong(EMPTY_HISTORY, 'flag', 'tokyo')
      const plan = planNext(history, 'city', REASK)
      expect(plan.cityId).toBeNull()
      expect(plan.history.wrong).toHaveLength(1)
    })

    it('種類を切り替えると出てくる', () => {
      const history = recordWrong(EMPTY_HISTORY, 'flag', 'tokyo')
      expect(planNext(history, 'flag', REASK).cityId).toBe('tokyo')
    })

    it('解き続ければ、積んだぶんは無くなる', () => {
      let history = EMPTY_HISTORY
      for (const cityId of ['tokyo', 'lima', 'cairo']) {
        history = recordWrong(history, 'city', cityId)
      }
      for (let i = 0; i < 3; i += 1) {
        const plan = planNext(history, 'city', REASK)
        expect(plan.cityId).not.toBeNull()
        // 出した都市を「直前」にしないと、次の回で自分自身が弾かれる
        history = plan.history
      }
      expect(history.wrong).toEqual([])
    })
  })

  describe('連続で同じ問題を出さない', () => {
    it('直前に出した都市は再出題に選ばれない', () => {
      const history: QuizHistory = {
        wrong: [{ kind: 'city', cityId: 'tokyo' }],
        lastCityId: 'tokyo',
      }
      const plan = planNext(history, 'city', REASK)
      expect(plan.cityId).toBeNull()
      // 出さなかったので積みは減らない
      expect(plan.history.wrong).toHaveLength(1)
    })

    it('直前の都市を飛ばして、次の1件を出す', () => {
      const history: QuizHistory = {
        wrong: [
          { kind: 'city', cityId: 'tokyo' },
          { kind: 'city', cityId: 'lima' },
        ],
        lastCityId: 'tokyo',
      }
      const plan = planNext(history, 'city', REASK)
      expect(plan.cityId).toBe('lima')
      expect(plan.history.wrong).toEqual([{ kind: 'city', cityId: 'tokyo' }])
    })
  })

  it('元の履歴を書き換えない', () => {
    const history = recordWrong(EMPTY_HISTORY, 'city', 'tokyo')
    planNext(history, 'city', REASK)
    expect(history.wrong).toHaveLength(1)
  })
})
