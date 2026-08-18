/*
 * アプリのアイコン。public/favicon.svg と同じ絵。
 * <img> で読み込まず SVG を直接置いているのは、#19 で base を設定したときに
 * 絶対パスが壊れるのを避けるため。
 */
function AppIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Geo Traveller のアイコン"
    >
      <defs>
        <clipPath id="appIconGlobe">
          <circle cx="240" cy="240" r="152" />
        </clipPath>
      </defs>
      <rect width="512" height="512" rx="114" fill="#6750A4" />
      <circle cx="240" cy="240" r="152" fill="#EADDFF" />
      <g
        clipPath="url(#appIconGlobe)"
        fill="none"
        stroke="#6750A4"
        strokeWidth="14"
        strokeLinecap="round"
      >
        <line x1="80" y1="240" x2="400" y2="240" />
        <path d="M240 88 C 300 150 300 330 240 392" />
        <path d="M240 88 C 180 150 180 330 240 392" />
        <path d="M240 88 V 392" />
        <ellipse cx="240" cy="160" rx="132" ry="34" />
        <ellipse cx="240" cy="320" rx="132" ry="34" />
      </g>
      <circle
        cx="240"
        cy="240"
        r="152"
        fill="none"
        stroke="#4F378B"
        strokeWidth="12"
      />
      <circle
        cx="374"
        cy="374"
        r="104"
        fill="#FEF7FF"
        stroke="#4F378B"
        strokeWidth="12"
      />
      <g stroke="#6750A4" strokeWidth="20" strokeLinecap="round">
        <line x1="374" y1="374" x2="374" y2="312" />
        <line x1="374" y1="374" x2="420" y2="398" />
      </g>
      <circle cx="374" cy="374" r="14" fill="#B3261E" />
    </svg>
  )
}

export default AppIcon
