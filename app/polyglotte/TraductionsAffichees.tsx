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
import { texteReferenceEdition } from '@/app/lib/referenceEditionServie'
import { MentionCopiee, useMentionCopiee } from '@/app/components/MentionCopiee'
import { SANS } from '@/app/lib/polices'
import { STYLE_RUBRIQUE } from '@/app/lib/hierarchieTitres'

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
  /** Ce que la référence des volumes demande en plus (voir `texteReferenceEdition`). */
  titreEdition: string | null
  sousTitreEdition: string | null
  mentionEdition: string | null
  nombreTomes: number | null
}

/** Une colonne du tableau : `code` désigne la notice, `variante` l'état du texte lu. */
export type ColonneAffichee = { cle: string; code: string; nom: string; variante?: string }

const LIGNE: React.CSSProperties = {
  fontFamily: SANS,
  fontSize: '0.6875rem', lineHeight: 1.3, color: 'var(--cs-texte-second)',
  overflowWrap: 'break-word', hyphens: 'auto',
}

/** Un auteur qui n’est pas une personne (« Tradition latine, principalement hiéronymienne »,
 *  pour la Vulgate) ne se dit pas dans le volet (demande de l’auteur, 2026-09-23) : la
 *  notice le garde, où il se lit comme une provenance et non comme un nom. */
const AUTEUR_TU = /^Tradition/

export default function TraductionsAffichees({ colonnes, fiches }: {
  colonnes: ColonneAffichee[]
  fiches: Map<string, FicheTraductionPoly>
}) {
  // Le cache des éditeurs répertoriés : le crochet en déclenche le chargement.
  useEditeursCharges()
  const index = indexEditeursNavigateur()
  const [ouverte, setOuverte] = useState<{ code: string; nom: string } | null>(null)
  const { mention, signaler } = useMentionCopiee()
  // ⛔ Même geste que la carte de la Bible classique (`EncartTraduction`) : la ligne
  // d’édition, cliquée, met la RÉFÉRENCE des volumes dans le presse-papiers, sans indice
  // autre que le curseur. ⚠️ Le point du clic se prend avant la promesse.
  const copier = (e: React.MouseEvent, reference: string) => {
    const point = { clientX: e.clientX, clientY: e.clientY }
    // ⚠️ Hors contexte sûr, `navigator.clipboard` manque : l'optionnel rendait `undefined`,
    // et `.then` sur lui levait une TypeError.
    if (!navigator.clipboard) { console.error('[volet] presse-papiers indisponible'); return }
    navigator.clipboard.writeText(reference).then(() => signaler(point), (erreur: unknown) => {
      console.error('[volet] référence non copiée :', erreur)
    })
  }
  if (colonnes.length === 0) return null
  return (
    // ⛔ LA SECTION NE DONNE PAS SA LARGEUR AU VOLET (relevé de l'auteur, 2026-09-23 : « cette
    // sélection déborde ! »). Le volet est une colonne flexible sans largeur propre, qui prend
    // celle de son enfant le plus large : une ligne d'édition longue l'élargissait d'autant.
    // `contain: inline-size` retire le contenu du calcul, et la section s'étire à la largeur que
    // les autres blocs donnent au volet ; ses lignes s'y enroulent.
    <div style={{ flexShrink: 0, contain: 'inline-size', minWidth: 0, background: 'var(--cs-fond-clair)', borderRight: '1px solid var(--cs-bord)', borderBottom: '1px solid var(--cs-bord)', padding: '8px var(--volet-gouttiere) 9px' }}>
      <span style={{ ...STYLE_RUBRIQUE, display: 'block', marginBottom: '6px' }}>
        Traductions affichées
      </span>
      {/* ⚠️ La liste se borne et défile en dedans : elle partage la hauteur du volet avec la
          liste des livres, qui reste l'objet principal. */}
      <ol className="cs-defilement-discret" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '32vh', overflowY: 'auto' }}>
        {colonnes.map(c => {
          const f = fiches.get(c.code)
          const datesDuTexte = /\(éd\.\)\s*$/.test(f?.auteur ?? '')
          const auteur = f?.auteur && !AUTEUR_TU.test(f.auteur) ? (f.dates && !datesDuTexte ? `${f.auteur} (${f.dates})` : f.auteur) : null
          const edition = f ? libelleEditionTraduction({
            datePublication: f.datePublication, lieuEdition: f.lieuEdition,
            editeur: joindreEditeurs(f.editeur, index), anneeEdition: f.anneeEdition,
            depotManuscrit: f.depotManuscrit, coteManuscrit: f.coteManuscrit,
          }) : null
          const reference = f ? texteReferenceEdition({
            titreEdition: f.titreEdition, sousTitreEdition: f.sousTitreEdition, mentionEdition: f.mentionEdition,
            lieuEdition: f.lieuEdition, editeur: joindreEditeurs(f.editeur, index), anneeEdition: f.anneeEdition,
            nombreTomes: f.nombreTomes, depotManuscrit: f.depotManuscrit, coteManuscrit: f.coteManuscrit,
          }) : null
          return (
            <li key={c.cle} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <NomVolet onOuvrir={() => setOuverte({ code: c.code, nom: c.nom })} titre={`Voir la fiche : ${c.nom}`}>
                {rendreEnrichi(c.nom)}
              </NomVolet>
              {c.variante && <span style={{ ...LIGNE, fontStyle: 'italic' }}>{c.variante}</span>}
              {auteur && <span style={LIGNE}>{rendreEnrichi(auteur)}</span>}
              {edition && (reference
                ? (
                  <button type="button" onClick={e => copier(e, reference)}
                    aria-label={`Copier la référence bibliographique\u00A0: ${c.nom}`}
                    style={{ ...LIGNE, color: 'var(--cs-texte-gris)', display: 'block', width: '100%', textAlign: 'left',
                      background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}>
                    {rendreEnrichi(edition)}
                  </button>
                )
                : <span style={{ ...LIGNE, color: 'var(--cs-texte-gris)' }}>{rendreEnrichi(edition)}</span>)}
            </li>
          )
        })}
      </ol>
      <span className="cs-hors-ecran" role="status">{mention ? 'Référence bibliographique copiée' : ''}</span>
      <MentionCopiee mention={mention}>Référence bibliographique copiée</MentionCopiee>
      {ouverte && <ModaleTraduction code={ouverte.code} nomFallback={ouverte.nom} onFermer={() => setOuverte(null)} />}
    </div>
  )
}
