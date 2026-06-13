'use client'

type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  trad_lsg: string; trad_crampon: string
  trad_vulgate: string; trad_sacy: string
}

type Props = {
  versets: Verset[]
  traduction: 'trad_sacy' | 'trad_lsg' | 'trad_crampon' | 'trad_vulgate'
  livreActif: string
  chapitreActif: number
  nomLivre: string
  versetSelectionne: Verset | null
  setVersetSelectionne: (v: Verset | null) => void
}

export default function TexteBible({
  versets, traduction, livreActif, chapitreActif, nomLivre,
  versetSelectionne, setVersetSelectionne
}: Props) {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden" style={{ background: '#f7f4ef' }}>
      {/* En-tête chapitre */}
      <div className="px-8 py-3 border-b" style={{ borderColor: '#d6d0c4', background: '#f7f4ef' }}>
        <div className="flex items-center justify-center gap-4">
          {chapitreActif > 1 ? (
            <a
              href={`/?livre=${livreActif}&chapitre=${chapitreActif - 1}`}
              className="text-lg leading-none transition-colors"
              style={{ color: '#9a958d' }}
              title="Chapitre précédent"
            >
              ‹
            </a>
          ) : (
            <span className="text-lg leading-none" style={{ color: '#d6d0c4' }}>‹</span>
          )}
          <h1 style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: '1.05rem',
            fontWeight: 'normal',
            color: '#2a3d30',
            letterSpacing: '0.01em',
          }}>
            {nomLivre} &ndash; Chapitre {chapitreActif}
          </h1>
          <a
            href={`/?livre=${livreActif}&chapitre=${chapitreActif + 1}`}
            className="text-lg leading-none transition-colors"
            style={{ color: '#9a958d' }}
            title="Chapitre suivant"
          >
            ›
          </a>
        </div>
      </div>

      {/* Corps — versets */}
      <div className="overflow-y-auto flex-1 px-8 py-5 max-w-2xl mx-auto w-full">
        <style>{`
          .verset-row { display: flex; gap: 10px; padding: 3px 8px; border-radius: 4px; cursor: pointer; }
          .verset-row:hover { background: rgba(61,107,79,0.05); }
          .verset-row--actif { background: rgba(61,107,79,0.10) !important; }
          .nav-chap-arrow:hover { color: #3d6b4f !important; }
        `}</style>
        {versets.map(v => (
          <div
            key={v.id_verset}
            onClick={() => setVersetSelectionne(
              versetSelectionne?.id_verset === v.id_verset ? null : v
            )}
            className={`verset-row${versetSelectionne?.id_verset === v.id_verset ? ' verset-row--actif' : ''}`}
          >
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              color: '#b0a89e',
              marginTop: '3px',
              width: '16px',
              flexShrink: 0,
              lineHeight: 1.6,
            }}>
              {v.verset}
            </span>
            <p style={{
              fontSize: '0.84rem',
              lineHeight: '1.55',
              color: '#1e1a16',
              margin: 0,
            }}>
              {v[traduction] || <span style={{ color: '#d6d0c4', fontStyle: 'italic' }}>—</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}