'use client'

// ── « TRADUCTIONS AFFICHÉES » : les colonnes du tableau, dites dans le volet ──────────
// Demande de l'auteur, 2026-09-23 : « créer, dans le volet de gauche, une nouvelle section
// qui affiche toutes les traductions sélectionnées avec les principales informations
// éditoriales ; en cliquant sur le titre de la traduction, on ouvre sa notice ».
//
// ⛔ Rien n'y est recomposé : la ligne d'édition est celle de la carte de la Bible
// classique (`libelleEditionTraduction`), l'éditeur passe par `joindreEditeurs`, le nom se
// compose par `rendreEnrichi`, et la notice est la fenêtre des autres pages
// (`ModaleTraduction`), chargée seulement au clic.
// ⚠️ Les dates d'un éditeur scientifique (« Louis-Claude Fillion (éd.) ») sont celles du
// TEXTE qu'il édite : la carte les tait, ce volet aussi.

import dynamic from 'next/dynamic'
import { useState } from 'react'
import NomVolet from '@/app/components/NomVolet'
import { libelleEditionTraduction } from '@/app/lib/editionTraduction'
import { joindreEditeurs } from '@/app/lib/editeursNormalisation'
import { indexEditeursNavigateur, useEditeursCharges } from '@/app/lib/editeurs'
import { rendreEnrichi } from '@/app/lib/enrichissements'

const ModaleTraduction = dynamic(() => import('@/app/components/ModaleTraduction'), { ssr: false })

/** Ce que la page sait d'une bible pour la présenter : notice et fiche d'édition. */
export type FicheTraductionPoly = {
  auteur: string | null
  dates: string | null
  datePublication: string | null
  lieuEdition: string | null
  editeur: string | null
  anneeEdition: string | null
  depotManuscrit: string | null
  coteManuscrit: string | null
}

/** Une colonne du tableau : `code` désigne la notice, `variante` l'état du texte lu. */
export type ColonneAffichee = { cle: string; code: string; nom: string; variante?: string }

const LIGNE: React.CSSProperties = {
  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
  fontSize: '0.6875rem', lineHeight: 1.3, color: 'var(--cs-texte-second)',
}

export default function TraductionsAffichees({ colonnes, fiches }: {
  colonnes: ColonneAffichee[]
  fiches: Map<string, FicheTraductionPoly>
}) {
  // Le cache des éditeurs répertoriés : le crochet en déclenche le chargement.
  useEditeursCharges()
  const index = indexEditeursNavigateur()
  const [ouverte, setOuverte] = useState<{ code: string; nom: string } | null>(null)
  if (colonnes.length === 0) return null
  return (
    <div style={{ flexShrink: 0, background: 'var(--cs-fond-clair)', borderRight: '1px solid var(--cs-bord)', borderBottom: '1px solid var(--cs-bord)', padding: '8px 14px 9px' }}>
      <span style={{ display: 'block', fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '6px' }}>
        Traductions affichées
      </span>
      {/* ⚠️ La liste se borne et défile en dedans : elle partage la hauteur du volet avec la
          liste des livres, qui reste l'objet principal. */}
      <ol className="cs-defilement-discret" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '32vh', overflowY: 'auto' }}>
        {colonnes.map(c => {
          const f = fiches.get(c.code)
          const datesDuTexte = /\(éd\.\)\s*$/.test(f?.auteur ?? '')
          const auteur = f?.auteur ? (f.dates && !datesDuTexte ? `${f.auteur} (${f.dates})` : f.auteur) : null
          const edition = f ? libelleEditionTraduction({
            datePublication: f.datePublication, lieuEdition: f.lieuEdition,
            editeur: joindreEditeurs(f.editeur, index), anneeEdition: f.anneeEdition,
            depotManuscrit: f.depotManuscrit, coteManuscrit: f.coteManuscrit,
          }) : null
          return (
            <li key={c.cle} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <NomVolet onOuvrir={() => setOuverte({ code: c.code, nom: c.nom })} titre={`Voir la notice : ${c.nom}`}>
                {rendreEnrichi(c.nom)}
              </NomVolet>
              {c.variante && <span style={{ ...LIGNE, fontStyle: 'italic' }}>{c.variante}</span>}
              {auteur && <span style={LIGNE}>{rendreEnrichi(auteur)}</span>}
              {edition && <span style={{ ...LIGNE, color: 'var(--cs-texte-gris)' }}>{rendreEnrichi(edition)}</span>}
            </li>
          )
        })}
      </ol>
      {ouverte && <ModaleTraduction code={ouverte.code} nomFallback={ouverte.nom} onFermer={() => setOuverte(null)} />}
    </div>
  )
}
