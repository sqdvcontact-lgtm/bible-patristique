// ── LA TABLE UNIQUE DES ENTRÉES DE L'ESPACE DU LECTEUR ───────────────────────
//
// Elle sert DEUX listes : la colonne de la page /compte et le menu déroulant du
// compte, dans la barre du haut.
//
// ⛔ C'est la leçon déjà tirée pour l'administration (app/lib/adminNavigation.ts) :
// deux listes écrites séparément divergent, et une rubrique qui n'est nommée qu'à
// un endroit est une rubrique qu'on ne trouve pas depuis l'autre. Il n'y a donc
// qu'une table, et l'ordre y fait foi pour les deux.
//
// ⚠️ Chaque entrée porte une GLOSE, et ce n'est pas un ornement : la charte § 36.2
// veut qu'un menu DISE ce qu'il ouvre. « Présentation » ou « Lecture » ne
// s'expliquent pas d'eux-mêmes pour qui arrive.

/** Les deux groupes, dans leur ordre de lecture. Un filet les sépare.
 *
 *  Ils ne se distinguent pas par sujet mais par FRÉQUENCE et par nature : on revient
 *  voir où l'on en est, on ne revient pas régler son mot de passe. Les études de
 *  Restivo et van de Rijt (PLoS ONE, 2012) disent la même chose autrement : ce qui
 *  retient un lecteur fidèle et ce qui accueille un nouveau venu ne sont pas le même
 *  objet, et ne se rangent donc pas au même rayon. */
export type GroupeEspace = 'parcours' | 'reglages'

export const GROUPES_ESPACE: { cle: GroupeEspace; label: string }[] = [
  { cle: 'parcours', label: 'Mon parcours' },
  { cle: 'reglages', label: 'Réglages' },
]

export type EntreeEspace = {
  href: string
  label: string
  /** La ligne qui dit ce que la rubrique contient (charte § 36.2). */
  glose: string
  groupe: GroupeEspace
  /** Quitte l'espace : la page publique s'ouvre dans un onglet à part. */
  sortant?: boolean
}

/** Les entrées, pour un lecteur dont on connaît le pseudonyme.
 *
 *  ⚠️ Sans pseudonyme, la page publique n'a pas d'adresse : l'entrée disparaît au
 *  lieu de mener à une page introuvable. Cela n'arrive qu'entre la création du
 *  compte et le choix du pseudonyme. */
export function entreesEspace(pseudo: string | null): EntreeEspace[] {
  return [
    {
      href: '/compte',
      label: 'Où j’en suis',
      glose: 'Votre rang, vos premiers pas, ce qu’il reste à découvrir.',
      groupe: 'parcours',
    },
    ...(pseudo ? [{
      href: `/profil/${encodeURIComponent(pseudo)}`,
      label: 'Ma page publique',
      glose: 'Ce que les autres lecteurs voient de vous.',
      groupe: 'parcours' as const,
      sortant: true,
    }] : []),
    {
      href: '/compte/presentation',
      label: 'Présentation',
      glose: 'Votre portrait, votre nom, ce que vous laissez paraître.',
      groupe: 'reglages',
    },
    {
      href: '/compte/lecture',
      label: 'Lecture',
      glose: 'La traduction que vous lisez par défaut, et le thème.',
      groupe: 'reglages',
    },
    {
      href: '/compte/connexion',
      label: 'Connexion',
      glose: 'Votre adresse, votre mot de passe, la suppression du compte.',
      groupe: 'reglages',
    },
  ]
}

/** L'entrée qui correspond au chemin courant, pour la marquer dans la colonne.
 *
 *  ⛔ Ne pas se contenter d'un `startsWith` : « /compte » est le préfixe de toutes
 *  les autres rubriques, et resterait donc allumé partout. On compare le chemin
 *  exact, et l'on n'admet le préfixe que pour les rubriques qui ont des sous-pages. */
export function entreeCourante(chemin: string, pseudo: string | null): EntreeEspace | null {
  const entrees = entreesEspace(pseudo).filter(e => !e.sortant)
  return entrees.find(e => e.href === chemin)
    ?? entrees.find(e => e.href !== '/compte' && chemin.startsWith(`${e.href}/`))
    ?? null
}
