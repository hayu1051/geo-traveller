import Furi from '../features/furigana/Furi.tsx'
import { TAB_IDS, TAB_LABELS, type TabId } from '../features/tabs.ts'
import AppIcon from './AppIcon.tsx'
import styles from './AppHeader.module.css'

type Props = {
  tab: TabId
  onTabChange: (tab: TabId) => void
  furiOn: boolean
  onFuriToggle: () => void
}

function AppHeader({ tab, onTabChange, furiOn, onFuriToggle }: Props) {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <AppIcon size={20} />
        </span>
        <span className={styles.brandName}>Geo Traveller</span>
      </div>

      <nav className={styles.nav}>
        {TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.tab}
            aria-current={id === tab ? 'page' : undefined}
            onClick={() => {
              onTabChange(id)
            }}
          >
            <span>
              <Furi>{TAB_LABELS[id]}</Furi>
            </span>
            {id === tab && <span className={styles.indicator} />}
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />

      {/*
        ふりがなの出し入れ。

        ラベルは「ふりがな」で固定し、入 / 切はスイッチの形で見せる。
        文字を「つける」「けす」と入れかえると、押すたびにボタンの幅が変わって
        続けて押したときに指がずれる。状態を絵で示せば幅は動かない。

        role="switch" はチェックボックスと同じ「入 / 切」を表す役割で、
        読み上げが「ふりがな、オン」のように読んでくれる。
        ラベル自体にふりがなは付けない。行の高さが変わってヘッダーが揺れるため。
      */}
      <button
        type="button"
        className={styles.furi}
        role="switch"
        aria-checked={furiOn}
        onClick={onFuriToggle}
      >
        <span className={styles.furiLabel}>ふりがな</span>
        <span className={styles.furiTrack} aria-hidden="true">
          <span className={styles.furiKnob} />
        </span>
      </button>
    </header>
  )
}

export default AppHeader
