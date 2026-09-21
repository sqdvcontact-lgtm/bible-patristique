/**
 * LE RECUEIL DES CITATIONS d'un lecteur, composé en blocs de document Word.
 *
 * ⚠️ PUR : ni requête, ni React. La route (`app/api/compte/citations/extraction`) lit la
 * demande, ce module la met en page, `construireDocx` l'empaquette.
 *
 * La composition est celle d'un petit recueil : une page de titre, un sommaire, puis une
 * section par corpus — l'Écriture, les Pères —, un titre par livre ou par œuvre, et sous
 * chacun les passages retenus, leur repère au-dessus, le texte entre guillemets.
 *
 * ⛔ Chaque paragraphe porte un STYLE de la feuille (`ooxml.ts`), jamais une mise en forme
 * directe : c'est à cette condition que le lecteur recompose tout d'un geste dans Word.
 */

import { fragmentsEnrichis } from '@/app/lib/texteEnrichiTokens'
import { normaliserEspaces } from '@/app/lib/typographie'
import { TITRE_SECTION, type DemandeExtractionCitations } from '@/app/lib/extractionCitations'
import type { BlocDocx, MorceauDocx, StyleDocx } from './ooxml'

/** L'espace fine insécable qui tient un guillemet contre le texte qu'il encadre.
 *  ⚠️ Écrite par son point de code : tapée, elle ne se distingue pas d'une espace. */
const FINE = String.fromCharCode(0x202f)

function morceaux(texte: string): MorceauDocx[] {
  return fragmentsEnrichis(normaliserEspaces(texte))
}

function paragraphe(style: StyleDocx, texte: string): BlocDocx {
  return { type: 'paragraphe', style, morceaux: morceaux(texte) }
}

/** Le passage entre guillemets français, sans rien recomposer de son texte. */
function passage(texte: string): BlocDocx {
  return {
    type: 'paragraphe',
    style: 'Citation',
    morceaux: [{ texte: `«${FINE}` }, ...morceaux(texte), { texte: `${FINE}»` }],
  }
}

/** La date du jour en toutes lettres, dans le fuseau de Paris. */
export function dateDuRecueil(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris',
  })
}

export function composerRecueilCitations(demande: DemandeExtractionCitations, dateIso: string): BlocDocx[] {
  const blocs: BlocDocx[] = []
  const nombre = demande.sections.reduce(
    (total, s) => total + s.groupes.reduce((n, g) => n + g.citations.length, 0), 0)

  // ── La page de titre ──
  blocs.push({ type: 'paragraphe', style: 'Titre', morceaux: [{ texte: 'Citations' }], espaceAvant: Math.round(4 * 567) })
  if (demande.lecteur) blocs.push(paragraphe('Soustitre', `Recueillies par ${demande.lecteur}`))
  blocs.push(paragraphe('Frontispicemention', `${nombre} passage${nombre > 1 ? 's' : ''}`))
  blocs.push(paragraphe('Colophon', `Extrait de Corpus Scriptura le ${dateDuRecueil(dateIso)}`))

  // ── Le sommaire, dès qu'il y a plus d'un titre à y ranger ──
  const titres = demande.sections.reduce((n, s) => n + s.groupes.length, 0)
  if (demande.sections.length > 1 || titres > 1) {
    blocs.push({ type: 'paragraphe', style: 'Titresommaire', morceaux: [{ texte: 'Sommaire' }] })
    blocs.push({ type: 'sommaire', profondeur: 2 })
  }

  for (const section of demande.sections) {
    // ⚠️ `Titre1` ouvre une page : chaque corpus commence la sienne.
    blocs.push({ type: 'paragraphe', style: 'Titre1', morceaux: [{ texte: TITRE_SECTION[section.corpus] }] })
    if (section.chapeau) blocs.push(paragraphe('Chapeau', section.chapeau))

    for (const groupe of section.groupes) {
      blocs.push(paragraphe('Titre2', groupe.titre))
      if (groupe.notice) blocs.push(paragraphe('Frontispicemention', groupe.notice))
      for (const citation of groupe.citations) {
        if (citation.reference) blocs.push(paragraphe('Titre4', citation.reference))
        blocs.push(passage(citation.texte))
        if (citation.glose) blocs.push(paragraphe('Colophon', citation.glose))
      }
    }
  }
  return blocs
}
