export function BadgeStatutAlignement({ status, estAdmin }: { status: string | null; estAdmin: boolean }) {
  if (!estAdmin || status !== 'uncertain') return null
  return (
    <span
      data-alignement-a-relire
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid rgba(142, 102, 38, 0.32)',
        borderRadius: '999px',
        background: 'rgba(190, 145, 66, 0.09)',
        color: 'var(--cs-importance-mineur-encre)',
        fontSize: '0.6875rem',
        lineHeight: 1,
        letterSpacing: '0.04em',
        padding: '3px 7px',
      }}
    >
      à relire
    </span>
  )
}
