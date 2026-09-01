import type { Onglet } from '@/app/admin/adminTypes'

// ── LA TABLE UNIQUE DES ENTRÉES D'ADMINISTRATION ─────────────────────────────
//
// Elle sert LES DEUX listes : la barre d'onglets de la page /admin et le menu
// déroulant « Administration » de la barre du haut (celui-ci en trois exemplaires :
// desktop, panneau mobile, et le <select> mobile de la page).
//
// ⛔ Les deux listes étaient écrites SÉPARÉMENT, l'une dans `AdminClient`, l'autre
// dans `Navbar`, et elles avaient divergé : le menu comptait cinq entrées que la
// barre ignorait — Centre de contrôle, Audience, Planche des styles, Propositions
// de GPT et Bible 899. Une page d'administration qui n'est nommée que par la barre
// du haut est une page qu'on ne trouve pas quand on est DÉJÀ dans l'administration,
// où l'on cherche dans la barre d'onglets. Deux tables ne peuvent pas rester
// d'accord ; il n'y en a donc plus qu'une, et l'ordre y fait foi pour les deux.
//
// ⚠️ Ajouter une entrée ici la fait paraître PARTOUT. C'est voulu : c'est le prix
// pour que les deux listes ne redivergent jamais.

/** Les trois familles, dans leur ordre de lecture. */
export type FamilleAdmin = 'corpus' | 'communaute' | 'systeme'

// `couleur` : sur fond clair (menu déroulant, barre d'onglets).
// `couleurMobile` : variante claire, lisible sur le fond vert foncé du panneau mobile.
export const FAMILLES_ADMIN: { cle: FamilleAdmin; label: string; couleur: string; couleurMobile: string }[] = [
  { cle: 'corpus',     label: 'Corpus & catalogue', couleur: 'var(--cs-vert)',    couleurMobile: 'var(--cs-vert-clair)' },
  { cle: 'communaute', label: 'Communauté',         couleur: 'var(--cs-or)',      couleurMobile: 'var(--cs-or-clair)' },
  { cle: 'systeme',    label: 'Système & doctrine', couleur: 'var(--cs-systeme)', couleurMobile: 'var(--cs-systeme-clair)' },
]

export type EntreeAdmin = {
  href: string
  label: string
  famille: FamilleAdmin
  /** Section SERVIE par la page /admin : on y bascule sans quitter la page.
   *  Absente, l'entrée est une PAGE autonome — on s'en va (flèche dans la barre). */
  onglet?: Onglet
  /** Les deux portes par lesquelles on entre presque toujours : le menu les met en gras. */
  principal?: boolean
  /** Filet DANS une famille (sous-groupe). Les changements de famille, eux, se
   *  déduisent de l'ordre : rien à écrire pour eux. */
  filet?: boolean
}

export const ENTREES_ADMIN: EntreeAdmin[] = [
  // ── Corpus & catalogue ──────────────────────────────────────────────────────
  { href: '/admin/controle',                    label: 'Centre de contrôle',  famille: 'corpus', principal: true },
  { href: '/admin?onglet=bibliotheque',         label: 'Bibliothèque',        famille: 'corpus', principal: true, onglet: 'bibliotheque' },
  { href: '/admin?onglet=controle-oeuvres',     label: 'Contrôle œuvres',     famille: 'corpus', onglet: 'controle-oeuvres' },
  { href: '/admin?onglet=validation-notices',   label: 'Validation notices',  famille: 'corpus', onglet: 'validation-notices' },
  { href: '/admin?onglet=traductions',          label: 'Traductions',         famille: 'corpus', onglet: 'traductions' },
  { href: '/admin?onglet=evenements',           label: 'Chronologie',         famille: 'corpus', onglet: 'evenements' },
  // Bibliographie : trois écrans d'un même travail — les ouvrages cités, les maisons
  // d'édition répertoriées, le rang académique des éditeurs et des chercheurs. Ils se
  // tiennent côte à côte, après un filet, sans se fondre en un seul onglet : on passe
  // de l'un à l'autre en corrigeant la même notice, mais chacun garde sa table.
  { href: '/admin?onglet=ouvrages',             label: 'Ouvrages',            famille: 'corpus', onglet: 'ouvrages', filet: true },
  { href: '/admin?onglet=editeurs',             label: 'Éditeurs',            famille: 'corpus', onglet: 'editeurs' },
  { href: '/admin?onglet=fiabilite',            label: 'Valeur académique',   famille: 'corpus', onglet: 'fiabilite' },
  // ── Communauté ──────────────────────────────────────────────────────────────
  { href: '/admin?onglet=essais',               label: 'Essais',              famille: 'communaute', onglet: 'essais' },
  { href: '/admin?onglet=verifications',        label: 'Vérifications',       famille: 'communaute', onglet: 'verifications' },
  { href: '/admin?onglet=constituer-liens',     label: 'Constituer liens',    famille: 'communaute', onglet: 'constituer-liens' },
  { href: '/admin?onglet=moderation',           label: 'Modération',          famille: 'communaute', onglet: 'moderation' },
  { href: '/admin?onglet=propositions',         label: 'Propositions',        famille: 'communaute', onglet: 'propositions' },
  // ── Système & doctrine ──────────────────────────────────────────────────────
  // « Audience » dit ce que le site REÇOIT (visites, comptes, lectures). À ne pas
  // confondre avec « Statistiques du corpus », dans le centre de contrôle, qui dit
  // l'état du TRAVAIL. Les deux écrans sont frères et ne se recouvrent jamais.
  { href: '/admin/audience',                    label: 'Audience',            famille: 'systeme' },
  { href: '/admin?onglet=charte',               label: 'Charte IA',           famille: 'systeme', onglet: 'charte' },
  { href: '/admin?onglet=charte-accentuation',  label: 'Accentuation',        famille: 'systeme', onglet: 'charte-accentuation' },
  { href: '/admin/illustrations',               label: 'Illustrations',       famille: 'systeme' },
  { href: '/admin/styles',                      label: 'Planche des styles',  famille: 'systeme' },
  { href: '/admin/propositions-gpt',            label: 'Propositions de GPT', famille: 'systeme' },
  // Bible 899 : outil d'atelier. Il vit hors de /admin mais se cherche avec les autres.
  { href: '/manuscrits/bible-899',              label: 'Bible 899',           famille: 'systeme' },
]

/** Les entrées d'une famille, dans l'ordre de la table. */
export function entreesDeFamille(famille: FamilleAdmin): EntreeAdmin[] {
  return ENTREES_ADMIN.filter(e => e.famille === famille)
}

/** Les clés de section acceptées dans `?onglet=…`, déduites de la table. */
export const ONGLETS_VALIDES: Onglet[] = ENTREES_ADMIN
  .map(e => e.onglet)
  .filter((o): o is Onglet => o !== undefined)
