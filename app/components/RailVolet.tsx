'use client'

// ── LE RAIL D'UN VOLET REPLIÉ ─────────────────────────────────────────────────
//
// Un volet de lecture se ferme, et ce qui reste de lui est un rail : une bande de
// trente pixels, un chevron, et le NOM DE L'ACTION écrit en hauteur. Il sert les
// deux côtés de la page Bible — les livres à gauche, les commentaires à droite —
// et le volet de la Polyglotte.
//
// ⛔ IL Y AVAIT TROIS RAILS, ET DEUX D'ENTRE EUX ÉTAIENT DEVENUS INATTEIGNABLES
// (demande de l'auteur, 2026-09-04 : « remettre en place le système permettant de
// fermer un volet gauche ou droite ; existe sur le volet gauche de la Polyglotte,
// reprendre le modèle »). Les deux volets de la page Bible savaient se replier
// depuis toujours ; seule la flèche qui les repliait avait disparu, et pour une
// raison qu'aucune lecture du rendu ne montrait — voir la note de `NavLivres`.
// Trois dessins voisins pour un seul objet : celui de la Polyglotte portait le
// passage lu, celui des livres écrivait son nom de bas en haut, celui des Pères de
// haut en bas et deux crans plus petit. Un seul composant désormais.
//
// ⚠️ LE RAIL NOMME L'ACTION, NON LE CONTENU (« ajouter un titre clair sur la barre
// quand elle est fermée ; type : Ouvrir les commentaires »). « Commentaires » écrit
// sur une bande fermée décrit ce qu'on ne voit pas ; « Ouvrir les commentaires » dit
// ce qu'un clic fera. C'est la seule chose qu'un rail ait à dire.
//
// ⛔ LES DEUX RAILS D'UNE PAGE SE TOURNENT VERS SON CENTRE (demande de l'auteur,
// 2026-09-23 : « doivent être tournés vers le centre de la page — changer, donc,
// “Ouvrir les livres” de sens »). Ce qui se tourne n'est pas le sens de LECTURE mais
// l'assise des lettres : leur PIED regarde la colonne de texte, et leur tête le bord de
// l'écran. À droite, `writing-mode: vertical-rl` le fait seul ; à gauche il faut le
// demi-tour, faute de quoi le rail de gauche pose ses lettres à l'envers de son frère.
// ⚠️ Le rail de gauche se lit donc de BAS EN HAUT, et c'est la disposition ordinaire
// d'une bande latérale gauche. ⛔ Ce commentaire renverse celui du 2026-09-04, qui
// tenait les deux rails pour accordés parce qu'ils lisaient dans le même sens : lire
// dans le même sens et se tourner vers le même bord sont deux choses différentes.
//
// ⛔ ET LES DEUX RAILS N'ONT QU'UNE SEULE ÉPAISSEUR, parce qu'ils n'ont qu'un seul
// composant : trente pixels de bande, un filet d'un pixel. Une mesure écrite deux fois
// finirait par diverger, et c'est précisément ce que ce fichier a réuni.

import type { Ref } from 'react'
import IconeChevron from '@/app/components/IconeChevron'
import { SERIF } from '@/app/lib/polices'

/** ⛔ LA BANDE ET SON FILET S'ÉCRIVENT UNE FOIS, ET ILS VALENT POUR LES DEUX CÔTÉS :
 *  c'est ce qui rend impossible qu'un rail paraisse plus épais que son frère. */
const LARGEUR_RAIL = '30px'
const FILET_RAIL = '1px solid var(--cs-bord)'

/** Un rail, sur le bord qu'il occupe. Le chevron pointe VERS LA PAGE : c'est le
 *  sens dans lequel le volet va s'ouvrir. */
export default function RailVolet({ cote, libelle, complement, onOuvrir, fond, ref }: {
  /** Le bord de la page où le volet vit. */
  cote: 'gauche' | 'droite'
  /** L'ACTION, jamais le contenu : « Ouvrir les commentaires ». */
  libelle: string
  /** Ce que le volet portait et que la page ne dit plus — le passage lu sur la
   *  Polyglotte. ⚠️ Il se compose un rang sous le libellé, dans le sérif de
   *  lecture : ce n'est pas une seconde action, c'est un repère. */
  complement?: string | null
  onOuvrir: () => void
  /** ⚠️ Le fond du rail est celui du volet qu'il REMPLACE, sans quoi la teinte change au
   *  repli : le fond clair à gauche, la surface à droite. Une page dont le volet de droite
   *  porte le fond clair (la publication) le dit. */
  fond?: 'clair' | 'surface'
  /** Le rail, pour qu'une page lui rende le foyer quand elle replie son volet. */
  ref?: Ref<HTMLButtonElement>
}) {
  const gauche = cote === 'gauche'
  // ⛔ Les lettres se tournent vers la colonne de texte : voir l'en-tête. Le demi-tour
  // ne porte que sur le TEXTE — le chevron, lui, pointe déjà vers la page.
  const versLeCentre = gauche ? 'rotate(180deg)' : undefined
  const surface = (fond ?? (gauche ? 'clair' : 'surface')) === 'surface'
  return (
    <button
      ref={ref}
      onClick={onOuvrir}
      title={libelle}
      aria-label={libelle}
      aria-expanded={false}
      className={surface ? 'cs-rail-volet cs-rail-volet--surface' : 'cs-rail-volet'}
      style={{
        width: LARGEUR_RAIL, flexShrink: 0, height: '100%',
        border: 'none',
        [gauche ? 'borderRight' : 'borderLeft']: FILET_RAIL,
        cursor: 'pointer', color: 'var(--cs-texte-doux)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        // Le chevron se pose EN HAUT du rail, là où l'œil arrive, et non au milieu
        // d'une bande qui fait toute la hauteur de l'écran.
        justifyContent: 'flex-start', paddingTop: '12px',
        overflow: 'hidden',
      }}>
      <IconeChevron dir={gauche ? 'right' : 'left'} taille="0.875rem" strokeWidth={1.5} />
      {/* ⚠️ LE TEXTE SE CENTRE DANS LA HAUTEUR, le chevron restant en tête (demande de
          l'auteur, 2026-09-04 : « centrer verticalement le texte ; réduire un peu la
          taille de police »). Un rail fait toute la hauteur de la lecture : le libellé
          posé sous le chevron pendait en haut d'une bande de huit cents pixels, quand un
          dos de livre porte son titre au milieu. ⛔ Le chevron, lui, ne descend pas avec
          lui : il est là où l'œil arrive, et c'est la cible qu'on vise.
          ⚠️ Le groupe se centre d'un bloc — libellé ET complément —, sans quoi le repère
          de la Polyglotte se détacherait du nom qu'il accompagne. */}
      <span style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '10px',
      }}>
        {/* ⚠️ Le libellé prend l'encre du texte gris et non celle du texte faible : sur
            une bande de trente pixels, il est le seul contenu, et il doit se lire sans
            qu'on s'en approche. */}
        <span aria-hidden style={{
          writingMode: 'vertical-rl', transform: versLeCentre,
          // ⚠️ UN RANG DE CORPS DE PLUS (2026-09-23) : le libellé valait 10,5 px, sous
          // le plancher de 11 que la charte donne au texte — et une capitale espacée
          // couchée sur trente pixels est ce qui se lit le moins bien du site. La chasse
          // s'ouvre d'autant : à 0,12 em les capitales se touchaient presque.
          fontSize: '0.6875rem', letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '58%',
        }}>
          {libelle}
        </span>
        {complement && (
          <span aria-hidden style={{
            writingMode: 'vertical-rl', transform: versLeCentre,
            fontFamily: SERIF,
            fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', letterSpacing: '0.04em',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '32%',
          }}>
            {complement}
          </span>
        )}
      </span>
    </button>
  )
}
