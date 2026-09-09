'use client'
/**
 * QUELS NIVEAUX DE TITRE UNE ŒUVRE PORTE VRAIMENT — la sonde, et elle est UNIQUE.
 *
 * ⛔ Le panneau de la page de lecture la faisait pour lui seul ; celui de l'administration
 * ne la faisait PAS DU TOUT et offrait cinq niveaux sans jamais regarder si l'œuvre en
 * portait un. Deux écrans qui règlent la MÊME donnée doivent la mesurer de la même façon,
 * sinon l'un grise ce que l'autre propose — et l'on ne sait plus lequel dit vrai.
 *
 * ⚠️ La RÈGLE, elle, reste dans `niveauxAffichage.ts`, avec ses tests : descendre du plus
 * haut au plus bas, en série, en s'arrêtant au premier absent. Ce module-ci ne porte que
 * la requête, et il ne peut donc pas s'éprouver sous Vitest — il ouvre le client
 * navigateur dès son import.
 */
import { supabase } from '@/app/lib/supabase'
import { limiterRequeteSegmentsALaSurface } from '@/app/lib/oeuvreSelects'
import { profondeurPresente } from './niveauxAffichage'

/**
 * La profondeur de titres RÉELLEMENT présente dans l'œuvre, ou `null` si l'on ne sait pas.
 *
 * ⛔ SUR L'ŒUVRE, NON SUR LE TEXTE LU : les quatre réglages vivent sur `oeuvres` et
 * gouvernent tous ses textes à la fois. Mesurer le seul texte ouvert griserait un niveau
 * que son voisin porte — le grec de l'Hexaéméron n'a qu'un niveau quand son français en a
 * deux, et le Morel du Discours 38 n'en a aucun quand son grec en a un.
 *
 * ⛔ `apparat_auteur` (prologue, avertissement de l'auteur) appartient au CORPS : il se lit
 * à sa place dans le texte, et `limiterRequeteSegmentsALaSurface` le sait. Ne pas refaire
 * ce filtre à la main.
 *
 * ⚠️ Une requête en échec n'est PAS un niveau absent : on rend « on ne sait pas », et
 * l'appelant ne grise alors rien du tout — c'est ce qui empêche une sonde en défaut de
 * fermer un réglage.
 */
export function chargerProfondeurPresente(idOeuvre: string): Promise<number | null> {
  return profondeurPresente(async niveau => {
    const colonne = `ref_niv${niveau}`
    const { data, error } = await limiterRequeteSegmentsALaSurface(
      supabase.from('segments').select('id').eq('id_oeuvre', idOeuvre),
      'corps',
    ).not(colonne, 'is', null).neq(colonne, '').limit(1)
    if (error) { console.error(`Sonde du niveau ${niveau} (${idOeuvre}) :`, error); return null }
    return (data?.length ?? 0) > 0
  })
}
