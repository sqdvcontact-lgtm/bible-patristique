'use client'

type Props = {
  actif: boolean
  onToggle: () => void
  size?: number
  style?: React.CSSProperties
  title?: string
}

export default function EtoileFavori({ actif, onToggle, size = 16, style, title }: Props) {
  return (
    <button
      onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle() }}
      title={title ?? (actif ? 'Retirer des favoris' : 'Ajouter aux favoris')}
      className="etoile-favori"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '2px', lineHeight: 1, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center',
        color: actif ? '#c8933a' : '#c0b8ae',
        transition: 'color 0.15s, transform 0.12s',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = actif ? '#a07028' : '#8a7a5e'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.18)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = actif ? '#c8933a' : '#c0b8ae'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
    >
      <svg width={size} height={size} viewBox="0 0 16 16" fill={actif ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={actif ? 0 : 1.4} strokeLinejoin="round">
        <path d="M8 1.5l1.854 3.756 4.146.603-3 2.924.708 4.131L8 10.765l-3.708 1.949.708-4.131-3-2.924 4.146-.603z"/>
      </svg>
    </button>
  )
}
