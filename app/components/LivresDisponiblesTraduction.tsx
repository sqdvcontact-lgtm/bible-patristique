'use client'

// ── « Livres disponibles » sur la fiche d'une traduction ───────────────────────
//
// Demande de l'auteur (2026-09-24) : la notice de la Bible du XIIIe siècle doit lister
// « clairement » les livres qu'elle porte. La règle vaut pour TOUTE bible partielle : le
// lecteur apprend dans la fiche ce que la navigation ne lui montrait qu'en grisant.
//
// ⛔ UNE BIBLE COMPLÈTE NE LISTE RIEN : soixante-treize noms qui disent « tout » n'apprennent
//    rien. La section ne paraît que si un testament porté a un trou (`livresParTestament`).
// ⛔ LA LISTE SE LIT AUX MÊMES SOURCES QUE LA NAVIGATION (`BibleLayout`) : `livres_bible899`
//    pour le témoin 899, `livres_par_traduction` pour les bibles au verset, les divisions
//    éditoriales pour les autres. Deux juges de la présence d'un livre se contrediraient.
// ⚠️ Un échec de lecture TAIT la section, jamais une liste vide qui dirait la bible sans livre.

import { useEffect, useState } from 'react'

import { ChampFiche, SectionFiche } from '@/app/components/FicheModele'
import { LIVRES, type LivreBible } from '@/app/lib/bible'
import { livresDisponibles899, TRAD_ID_BIBLE899 } from '@/app/lib/bible899'
import { livresDisponiblesEditoriaux } from '@/app/lib/bibleEditorial'
import { supabase } from '@/app/lib/supabase'

async function lireLivres(code: string): Promise<Set<string>> {
  if (code === TRAD_ID_BIBLE899) return livresDisponibles899(supabase)
  const { data, error } = await supabase.from('livres_par_traduction').select('livre').eq('trad_id', code)
  if (error) throw new Error(`Livres de ${code} illisibles : ${error.message}`)
  const livres = new Set<string>()
  for (const ligne of (data ?? []) as { livre: string | null }[]) if (ligne.livre) livres.add(ligne.livre)
  return livres.size > 0 ? livres : livresDisponiblesEditoriaux(supabase, code)
}

const GROUPES: { testament: LivreBible['testament']; libelle: string }[] = [
  { testament: 'AT', libelle: 'Ancien Testament' },
  { testament: 'NT', libelle: 'Nouveau Testament' },
  { testament: 'AUTRES', libelle: 'Autres écrits' },
]

/** Les deutérocanoniques : une bible protestante (Segond) ne les porte pas, et n'en est pas moins complète. */
const DEUTEROCANONIQUES: ReadonlySet<string> = new Set(['TOB', 'JDT', '1MA', '2MA', 'WIS', 'SIR', 'BAR'])

/**
 * Les livres portés, par testament et dans l'ordre du canon ; `null` pour une bible complète.
 * ⛔ COMPLÈTE s'entend DANS SON CANON (2026-09-24) : un testament absent en entier (la
 *    Septante n'a pas de Nouveau Testament) ou les seuls deutérocanoniques manquants (la
 *    Segond) ne font pas une bible partielle. Seul un trou dans un testament porté l'est.
 */
export function livresParTestament(portes: ReadonlySet<string>): { libelle: string; noms: string[] }[] | null {
  if (portes.size === 0) return null
  const troue = (['AT', 'NT'] as const).some(t => {
    const attendus = LIVRES.filter(l => l.testament === t && l.canonique !== false && !DEUTEROCANONIQUES.has(l.code))
    return attendus.some(l => portes.has(l.code)) && attendus.some(l => !portes.has(l.code))
  })
  if (!troue) return null
  return GROUPES
    .map(g => ({ libelle: g.libelle, noms: LIVRES.filter(l => l.testament === g.testament && portes.has(l.code)).map(l => l.nom) }))
    .filter(g => g.noms.length > 0)
}

export default function LivresDisponiblesTraduction({ code }: { code: string }) {
  const [livres, setLivres] = useState<{ pour: string; valeur: Set<string> } | null>(null)

  useEffect(() => {
    let annule = false
    lireLivres(code)
      .then(valeur => { if (!annule) setLivres({ pour: code, valeur }) })
      .catch(erreur => console.error('[fiche traduction] livres illisibles', erreur))
    return () => { annule = true }
  }, [code])

  const groupes = livres?.pour === code ? livresParTestament(livres.valeur) : null
  if (!groupes) return null
  const total = groupes.reduce((n, g) => n + g.noms.length, 0)
  return (
    <SectionFiche titre="Livres disponibles">
      <p className="cs-notice-prose">
        Cette traduction ne couvre pas toute la Bible&#8239;: {total === 1 ? 'un livre se lit' : `${total} livres se lisent`} sur le site.
      </p>
      <dl className="cs-fiche-champs">
        {groupes.map(g => (
          <ChampFiche key={g.libelle} libelle={g.libelle}>{g.noms.join(', ')}</ChampFiche>
        ))}
      </dl>
    </SectionFiche>
  )
}
