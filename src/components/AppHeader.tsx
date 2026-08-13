import { TAB_IDS, TAB_LABELS, type TabId } from '../features/tabs.ts'
import AppIcon from './AppIcon.tsx'
import styles from './AppHeader.module.css'

type Props = {
  tab: TabId
  onTabChange: (tab: TabId) => void
}

function AppHeader({ tab, onTabChange }: Props) {
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
            <span>{TAB_LABELS[id]}</span>
            {id === tab && <span className={styles.indicator} />}
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />
    </header>
  )
}

export default AppHeader
