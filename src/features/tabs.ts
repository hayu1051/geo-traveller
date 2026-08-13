export const TAB_IDS = ['explore', 'compare', 'quiz', 'record'] as const

export type TabId = (typeof TAB_IDS)[number]

export const TAB_LABELS: Record<TabId, string> = {
  explore: '探索',
  compare: '比較',
  quiz: 'クイズ',
  record: '記録',
}
