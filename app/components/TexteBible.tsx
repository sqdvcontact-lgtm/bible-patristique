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
    <div className="flex-1 bg-white flex flex-col h-screen overflow-hidden">
      <div className="px-8 py-4 border-b border-stone-200">
        <div className="flex items-center justify-center gap-4">
          {chapitreActif > 1 ? (
            <a
              href={`/?livre=${livreActif}&chapitre=${chapitreActif - 1}`}
              className="text-stone-400 hover:text-violet-700 text-lg leading-none"
              title="Chapitre précédent"
            >
              ‹
            </a>
          ) : (
            <span className="text-stone-200 text-lg leading-none">‹</span>
          )}
          <h1 className="text-base font-medium text-stone-900">
            {nomLivre} &ndash; Chapitre {chapitreActif}
          </h1>
          <a
            href={`/?livre=${livreActif}&chapitre=${chapitreActif + 1}`}
            className="text-stone-400 hover:text-violet-700 text-lg leading-none"
            title="Chapitre suivant"
          >
            ›
          </a>
        </div>
      </div>
      <div className="overflow-y-auto flex-1 px-8 py-6 max-w-2xl mx-auto w-full">
        {versets.map(v => (
          <div
            key={v.id_verset}
            onClick={() => setVersetSelectionne(
              versetSelectionne?.id_verset === v.id_verset ? null : v
            )}
            className={`flex gap-3 py-2 px-3 rounded cursor-pointer ${
              versetSelectionne?.id_verset === v.id_verset
                ? 'bg-violet-50'
                : 'hover:bg-stone-50'
            }`}
          >
            <span className="text-xs font-medium text-stone-400 mt-1 w-5 shrink-0">
              {v.verset}
            </span>
            <p className="text-sm leading-relaxed text-stone-800">
              {v[traduction] || <span className="text-stone-300 italic">—</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}