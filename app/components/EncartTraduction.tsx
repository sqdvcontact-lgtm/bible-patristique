'use client'

// ── La carte « Traduction » du volet de lecture ────────────────────────────────
//
// Elle dit ce qu'on lit : le nom de la bible, qui ouvre sa fiche, le traducteur
// avec ses dates, et trois repères — langue, confession, année. Elle coiffe le
// volet de gauche de
// la page Bible (`NavLivres`), en desktop seulement — sur téléphone le volet est
// un tiroir, et la carte n'y est pas rendue.
//
// ⛔ LA CARTE NE PORTE PAS LA RÉFÉRENCE DE L'ÉDITION UTILISÉE (2026-09-03, verdict
// de l'auteur devant la carte de Fillion : « c'est ignoble ! pour les informations
// sur l'édition utilisée ; je veux seulement des informations sur la bible,
// généralistes ; et l'interligne est abominable ; prends pour modèle la page de
// lecture des œuvres des Pères »). Elle porte désormais trois REPÈRES — la langue,
// la confession, l'année —, c'est-à-dire ce qu'est la bible qu'on lit, et non le
// relevé des tomes dont on l'a tirée. Ce relevé comptait de 93 à 348 signes ; celui
// de Fillion dénombrait huit volumes et six millésimes dans un volet de 250 pixels.
// Il vit dans la fiche « En savoir plus », que le nom de la bible ouvre.
//
// ⛔ Avec lui s'en va tout ce qu'il avait fallu bâtir pour le loger : la sonde
// invisible qui comptait ses lignes, l'observateur qui la remesurait quand le volet
// changeait de largeur, et le budget `--volet-ref-lignes` que la feuille faisait
// monter avec lui (5 lignes à 260 px, 7 à 300, 8 à 350). Cinq lignes de bibliographie
// dans un volet de lecture ne valaient pas mieux d'être mesurées : c'est le texte qui
// n'avait pas sa place, non sa mesure qui était fausse.
//
// ⚠️ LA FORME EST CELLE DU VOLET DES PAGES PATRISTIQUES, pris pour modèle à la demande
// de l'auteur : le nom en vert qui ouvre la fiche, puis ce qu'on lit en serif à
// 0,8125 rem, et les repères en dessous. Une seule interligne dans la carte, 1,35,
// celle du volet d'à côté — l'ancienne référence se composait à 1,3 sur un œil de
// 0,65625 rem, si serrée qu'elle en devenait un pavé.
//
// ⛔ LA CARTE NE PORTE PLUS LA NOTICE DU TRADUCTEUR (2026-09-02, demande de
// l'auteur : « n'afficher que le premier texte »). Entrée le 31 août au-dessus de
// 260 px de volet, elle vit dans la fiche « En savoir plus », d'où elle venait.
// ⚠️ La carte ne porte plus AUCUN texte long depuis le 2026-09-03 : la référence
// d'édition, seule rescapée d'alors, est partie à son tour (voir plus haut).
//
// ⛔ IL N'Y A PLUS D'ÉTIQUETTE « TRADUCTION » (2026-08-31, demande de l'auteur :
// « supprime le mot “Traduction” »). Elle a coûté deux chantiers avant de partir :
// le 30 août on y avait fait monter le lien, qui occupait une ligne entière pour
// une action secondaire quand elle en laissait les deux tiers libres ; le 31 le
// lien est devenu le NOM de la bible, et l'étiquette s'est mise à annoncer ce que
// le nom disait déjà. ⚠️ La leçon vaut d'être gardée : on condense une ligne avant
// d'avoir demandé si elle doit exister. Le volet des pages patristiques n'a jamais
// écrit « Auteur » au-dessus du nom de l'auteur ; celui-ci n'écrit plus
// « Traduction » au-dessus du nom de la bible, et les deux se ressemblent enfin.
//
// ⛔ IL N'Y A PLUS DE DEGRÉS : la carte montre les mêmes trois lignes dans un volet
// de 120 px et dans un volet de 400. Elle en avait, tant qu'elle portait un texte
// dont la longueur dépendait de la bible. Seuls les BLANCS suivent encore la
// largeur, et sans seuil : ils tiennent à l'échelle du volet, qui est continue
// (voir globals.css, « L'échelle du volet »).
//
// ⛔ LA CARTE S'OUVRE SUR LE NOM DE LA BIBLE, et c'est lui le lien (décision
// de l'auteur, 2026-08-31 : « remplacer par le nom raccourci de la traduction, par
// exemple “Bible Crampon” ; ne pas afficher “en savoir plus sur cette traduction”,
// mais ouvrir la page quand on clique sur le nom »). La carte disait deux fois la
// même chose et ne nommait jamais ce qu'on lit : « Traduction » en étiquette, un
// lien qui redisait « cette traduction », et le seul nom porté était celui du
// traducteur. Le nom de la bible tient les deux rôles à la fois — il nomme, et il
// ouvre —, et le libellé qui ne faisait que désigner le geste est parti, l'étiquette
// qui ne faisait que l'annoncer avec lui.
//
// ⚠️ La forme est celle du nom d'AUTEUR dans le volet des pages patristiques, et
// c'est le même composant (`NomVolet`) : un volet de gauche nomme ce qu'on lit,
// d'un côté l'auteur, de l'autre la bible, et il n'y a pas deux façons de le dire.
// ⛔ Rien ne paraît au survol, ni ici ni là (voir `NomVolet`).

import { useState } from 'react'
import ModaleTraduction from '@/app/components/ModaleTraduction'
import NomVolet from '@/app/components/NomVolet'

export type TraductionEncart = {
  code: string
  label: string
  auteur?: string | null
  auteurDates?: string | null
  datePublication?: string | null
  confession?: string | null
  langue?: string | null
}

/** Un REPÈRE tient en un mot ou deux : « Français », « Catholique », « 1888 - 1904 ».
 *  Les champs de la base y mêlent parfois la précision d'un érudit — une révision
 *  annoncée après un point-virgule, une composition datée en douze mots. La carte
 *  garde la tête de la phrase, et ne la retient que si elle tient dans un repère ;
 *  la fiche « En savoir plus » porte le reste, entier. Ainsi la Bible du XIIIe
 *  siècle, qui date sa composition en une phrase, ne montre pas d'année ici, et
 *  aucune bible n'impose sa longueur aux autres.
 */
const REPERE_MAX = 32
function repere(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const tete = valeur.split(';')[0].trim()
  return tete.length > 0 && tete.length <= REPERE_MAX ? tete : null
}

export default function EncartTraduction({ trad }: { trad: TraductionEncart }) {
  const [modaleOuverte, setModaleOuverte] = useState(false)
  // Ce que la bible EST, en trois faits que le lecteur peut retenir. Le point
  // médian ne sépare que ce qui existe : une bible sans confession déclarée ne
  // montre pas de blanc entre deux points.
  const reperes = [repere(trad.langue), repere(trad.confession), repere(trad.datePublication)].filter(Boolean).join(' · ')
  return (
    // ⚠️ Plus de `minHeight` : la carte valait 6,75 rem pour ne jamais faire bouger
    // la mise en page, ce qui laissait un blanc de deux lignes dès que la référence
    // s'effaçait. Elle prend la hauteur de ce qu'elle porte, et plus rien ne la fait
    // varier — ce qu'elle porte ne dépend plus de la largeur du volet.
    <div className="cs-volet-carte" style={{ flexShrink: 0, boxSizing: 'border-box', overflow: 'hidden', padding: 'calc(var(--volet-air) + 1px) calc(var(--volet-gouttiere) + 2px)', borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', display: 'flex', flexDirection: 'column', gap: 'var(--volet-air-fin)' }}>
      {/* Le NOM de la bible ouvre la carte, et il en est la première ligne — plus de
          rangée partagée avec une étiquette, puisqu'il n'y a plus d'étiquette.
          ⚠️ Le nom est donc un enfant DIRECT du flex en colonne : il s'y étire sur la
          largeur de la carte et s'écrête par la fin quand elle ne suffit pas (« Traduction
          officielle liturgi… »), ce qui vaut mieux qu'un nom qui déborde une carte en
          `overflow: hidden`, où il serait coupé net, sans point de suspension.
          ⛔ Plus de libellé écrit en DEUX formes que la largeur choisissait : un nom
          n'a pas de forme courte. C'est le libellé « En savoir plus sur cette
          traduction », mesuré le 30 août à 218 pixels de volet, qui appelait ce
          dispositif ; il est parti avec lui, et le seuil de 230 dans globals.css
          avec les deux. */}
      <NomVolet onOuvrir={() => setModaleOuverte(true)} titre="Voir la fiche de cette traduction">{trad.label}</NomVolet>
      {/* Le TRADUCTEUR, avec ses dates de vie complètes. La langue se lit une ligne
          plus bas, parmi les repères.
          ⛔ Plus de repli sur `label` : le nom de la bible est écrit une ligne plus
          haut depuis le 2026-08-31, et la ligne du traducteur le redisait alors mot
          pour mot. Sans traducteur nommé, elle porte un tiret, qui dit au moins que
          la place existe et qu'on ne l'a pas remplie. */}
      <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.35 }}>
        {trad.auteur || '—'}
        {trad.auteurDates && <span style={{ fontWeight: 400, color: 'var(--cs-texte-gris)' }}> ({trad.auteurDates})</span>}
      </span>
      {/* Les REPÈRES : la langue, la confession, l'année. Ils tiennent sur une ou deux
          lignes quel que soit le volet, et n'ont donc ni budget ni mesure — c'est tout
          le bénéfice d'un texte court (voir l'en-tête). */}
      {reperes && (
        <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', lineHeight: 1.35 }}>{reperes}</span>
      )}
      {modaleOuverte && <ModaleTraduction code={trad.code} nomFallback={trad.label || ''} onFermer={() => setModaleOuverte(false)} />}
    </div>
  )
}
