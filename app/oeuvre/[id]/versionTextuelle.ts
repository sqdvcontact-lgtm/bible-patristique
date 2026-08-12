import type { VersionTextuelle } from './oeuvreTypes'

const EDITION_RE = /\b((?:premi(?:è|e)re|deuxi(?:è|e)me|troisi(?:è|e)me|quatri(?:è|e)me|cinqui(?:è|e)me|sixi(?:è|e)me|septi(?:è|e)me|huiti(?:è|e)me|neuvi(?:è|e)me|dixi(?:è|e)me)\s+édition[^,]*)/iu

function capitaleInitiale(texte: string) {
  return texte ? `${texte.charAt(0).toLocaleUpperCase('fr-FR')}${texte.slice(1)}` : texte
}

export function labelCourtVersion(version: Pick<VersionTextuelle, 'traducteur' | 'titre' | 'anneeEdition'>) {
  const nom = version.traducteur?.trim()
  const personne = nom?.split(/\s+/u).at(-1) || version.titre
  return [personne, version.anneeEdition].filter(Boolean).join(' ')
}

export function libelleTraducteurVersion(
  version: Pick<VersionTextuelle, 'titre' | 'traducteur'>,
) {
  const traducteur = version.traducteur?.trim()
  if (!traducteur) return null
  const echappe = traducteur.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
  const correspondance = version.titre.match(new RegExp(`^(Traduction\\s+(?:de|par)\\s+${echappe})(?:[,.:]|$)`, 'iu'))
  return correspondance?.[1] ?? null
}

export function decomposerEdition(
  editionLabel: string | null,
  anneeEdition: number | null,
) {
  const brut = editionLabel?.trim() ?? ''
  if (!brut) return {
    editionDescription: null,
    publicationLabel: null,
    ville: null,
    editeur: null,
    annee: anneeEdition ? String(anneeEdition) : null,
  }

  const edition = brut.match(EDITION_RE)?.[1]?.trim() ?? null
  const sansEdition = edition
    ? brut.replace(new RegExp(`\\s*,?\\s*${edition.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\s*,?`, 'iu'), ', ')
    : brut
  const nettoye = sansEdition
    .replace(/\s*,\s*,+/gu, ', ')
    .replace(/^\s*,|,\s*$/gu, '')
    .trim()
  const morceaux = nettoye.split(/\s*,\s*/u).filter(Boolean)
  const anneeTrouvee = morceaux.at(-1)?.match(/^\d{4}$/u)?.[0] ?? null
  const annee = anneeTrouvee ?? (anneeEdition ? String(anneeEdition) : null)
  if (anneeTrouvee) morceaux.pop()
  const ville = morceaux.shift() ?? null
  const editeur = morceaux.length ? morceaux.join(', ') : null
  const publicationLabel = [ville, editeur, annee].filter(Boolean).join(', ')

  return {
    editionDescription: edition ? capitaleInitiale(edition) : null,
    publicationLabel: publicationLabel || null,
    ville,
    editeur,
    annee,
  }
}
