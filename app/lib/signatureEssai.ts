/** LA SIGNATURE D'UNE PUBLICATION : ce qui paraît au-dessus du titre.
 *
 *  Trois façons de signer, choisies dans l'éditeur : le pseudonyme, qui est la règle ;
 *  le nom réel, quand le profil en porte un ; et rien, la publication étant alors
 *  anonyme. Deux colonnes les portent en base, `essais.afficher_nom_reel` et
 *  `essais.anonyme`, et la contrainte `essais_signature_exclusive` refuse qu'elles
 *  soient vraies ensemble.
 *
 *  ⛔ La résolution du nom vit ICI et nulle part ailleurs. Elle était recopiée dans la
 *  liste, la page et l'administration, et trois copies ne restent identiques que par
 *  accident : le jour où l'anonymat est arrivé, chacune l'aurait ignoré à sa façon.
 *
 *  ⚠️ Anonyme veut dire que RIEN ne relie la publication au compte : ni le nom, ni la
 *  marque de mécène, ni la page publique du lecteur, ni `user_id` dans ce qui part au
 *  navigateur. La base tait la colonne de son côté (vue `essais_publies`). Seule
 *  l'administration voit l'auteur, suivi de « (anonyme) », pour la modération. */

export type Signature = 'pseudonyme' | 'nom_reel' | 'anonyme'

/** Le nom qui tient lieu d'auteur quand il n'y en a pas, en liste comme en page. */
export const NOM_ANONYME = 'Anonyme'

export type ChoixSignature = { anonyme?: boolean | null; afficher_nom_reel?: boolean | null }
export type ProfilSignataire = { pseudo?: string | null; nom?: string | null; prenom?: string | null } | null | undefined

/** Les deux colonnes lues ensemble. L'anonymat l'emporte : si les deux étaient
 *  vraies, ce que la contrainte interdit, on ne montrerait pas un nom. */
export function signatureDe(e: ChoixSignature): Signature {
  if (e.anonyme) return 'anonyme'
  if (e.afficher_nom_reel) return 'nom_reel'
  return 'pseudonyme'
}

/** Les deux colonnes écrites ensemble, toujours : une seule des deux peut être vraie. */
export function colonnesSignature(s: Signature): { anonyme: boolean; afficher_nom_reel: boolean } {
  return { anonyme: s === 'anonyme', afficher_nom_reel: s === 'nom_reel' }
}

/** « Prénom Nom », ou null quand le profil n'a pas de nom. */
export function nomReel(p: ProfilSignataire): string | null {
  if (!p?.nom) return null
  return `${p.prenom ? p.prenom + ' ' : ''}${p.nom}`
}

/** Le nom sous lequel la publication paraît.
 *
 *  Anonyme → « Anonyme », quel que soit le profil. Nom réel → le nom s'il est connu,
 *  sinon le pseudonyme : un nom demandé mais absent du profil ne laisse pas la
 *  publication sans signature. Sinon le pseudonyme, ou null quand le profil n'en a
 *  pas (à l'appelant de dire ce qu'il montre alors). */
export function nomSigne(e: ChoixSignature, p: ProfilSignataire): string | null {
  const s = signatureDe(e)
  if (s === 'anonyme') return NOM_ANONYME
  if (s === 'nom_reel') {
    const n = nomReel(p)
    if (n) return n
  }
  return p?.pseudo ?? null
}
