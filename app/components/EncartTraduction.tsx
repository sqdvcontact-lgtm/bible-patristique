'use client'

// ── La carte « Traduction » du volet de lecture ────────────────────────────────
//
// Elle dit ce qu'on lit : le nom de la bible, qui ouvre sa fiche, le traducteur
// avec ses dates, et l'édition d'où le texte est tiré. Elle coiffe le volet de
// gauche de la page Bible (`NavLivres`), en desktop seulement — sur téléphone le
// volet est un tiroir, et la carte n'y est pas rendue.
//
// ⛔ LA CARTE NE PORTE PAS LA RÉFÉRENCE DE L'ÉDITION UTILISÉE (2026-09-03, verdict
// de l'auteur devant la carte de Fillion : « c'est ignoble ! pour les informations
// sur l'édition utilisée ; je veux seulement des informations sur la bible,
// généralistes ; et l'interligne est abominable ; prends pour modèle la page de
// lecture des œuvres des Pères »). Elle en porte la DATE, et rien d'autre :
// « D'après l'édition de 1888-1904 », la phrase même des pages de titre. Le relevé,
// lui, comptait de 93 à 348 signes ; celui de Fillion dénombrait huit volumes et six
// millésimes dans un volet de 250 pixels. Il vit dans la fiche « En savoir plus »,
// que le nom de la bible ouvre.
//
// ⚠️ ELLE EN PORTE DÉSORMAIS L'ADRESSE — le lieu, l'éditeur, les dates (demande de
// l'auteur, 2026-09-04 : « doit mentionner l'éditeur, le lieu d'édition et les dates
// d'édition »). C'est la forme normative du libellé court d'édition, `Ville,
// éditeur, année` (charte § 5), et non le relevé des tomes qui avait été chassé : la
// phrase reste une phrase, de trois mentions au plus. ⛔ Le lieu et l'éditeur ne se
// devinent pas du nom de la bible : ils viennent d'`editions_sources`, chargés par
// `app/page.tsx`, et un champ absent emporte son séparateur.
//
// ⛔ IL N'Y A PLUS DE REPÈRES — la langue, la confession et l'année alignées derrière
// des points médians (2026-09-03, demande de l'auteur : « remplace-le par un texte
// propre, comme celui qu'on trouve sur la page de titre des livres »). Ils disaient en
// télégramme ce qu'EST la bible, et jamais d'où vient le texte qu'on a sous les yeux ;
// la phrase d'édition le dit, et se lit. Langue et confession se lisent entières dans
// la fiche « En savoir plus » — et elles ne voyagent plus depuis la base à chaque
// chapitre ouvert (voir la requête des traductions, app/page.tsx).
// ⚠️ Quelle date la phrase nomme — celle de l'édition SERVIE, non de la première
// parution —, c'est `app/lib/editionTraduction.ts` qui en décide, avec ses tests.
//
// ⛔ Avec lui s'en va tout ce qu'il avait fallu bâtir pour le loger : la sonde
// invisible qui comptait ses lignes, l'observateur qui la remesurait quand le volet
// changeait de largeur, et le budget `--volet-ref-lignes` que la feuille faisait
// monter avec lui (5 lignes à 260 px, 7 à 300, 8 à 350). Cinq lignes de bibliographie
// dans un volet de lecture ne valaient pas mieux d'être mesurées : c'est le texte qui
// n'avait pas sa place, non sa mesure qui était fausse.
//
// ⚠️ LA FORME EST CELLE DU VOLET DES PAGES PATRISTIQUES, pris pour modèle à la demande
// de l'auteur : le nom en vert qui ouvre la fiche, puis ce qu'on lit à 0,8125 rem, et
// l'édition en dessous. Une seule interligne, 1,35, celle du volet d'à côté —
// l'ancienne référence se composait à 1,3 sur un œil de 0,65625 rem, si serrée qu'elle
// en devenait un pavé.
//
// ⛔ LES DEUX LIGNES SE COMPOSENT EN SANS (demande de l'auteur, 2026-09-04, citant la
// carte de Segond : « Louis Segond (1810-1885) D'après l'édition de Paris, Société
// biblique britannique et étrangère, 1910 // sans sérif »). Elles avaient pris la serif
// du volet des œuvres, dont la carte est le modèle ; mais ce volet-là surmonte un texte
// EN SERIF, et sa carte est de la même encre que ce qu'elle annonce. Ici la carte
// surmonte une LISTE DE LIVRES, qui est en sans, et le nom de la bible juste au-dessus
// l'est aussi (`NomVolet` hérite du volet). La serif y faisait donc deux régimes dans
// une carte de trois lignes. ⚠️ La divergence avec le volet des œuvres est assumée : ce
// n'est pas la même page, et c'est ce qu'elles SURMONTENT qui décide, non leur
// ressemblance.
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
import { libelleEditionTraduction } from '@/app/lib/editionTraduction'
import ModaleTraduction from '@/app/components/ModaleTraduction'
import NomVolet from '@/app/components/NomVolet'
import IconeChevron from '@/app/components/IconeChevron'
import { rendreEnrichi } from '@/app/lib/enrichissements'

export type TraductionEncart = {
  code: string
  label: string
  auteur?: string | null
  auteurDates?: string | null
  datePublication?: string | null
  /** Ce que la fiche d'édition (`editions_sources`) porte de la provenance du
   *  texte : lieu, éditeur DÉJÀ NORMALISÉ, millésimes, et — pour un témoin
   *  manuscrit — son dépôt et sa cote. Voir `libelleEditionTraduction`. */
  lieuEdition?: string | null
  editeur?: string | null
  anneeEdition?: string | null
  depotManuscrit?: string | null
  coteManuscrit?: string | null
}

export default function EncartTraduction({ trad, onReduire }: {
  trad: TraductionEncart
  /** Replier le volet. Absent, la carte ne porte pas de chevron — c'est le cas du
   *  volet de la Polyglotte, qui gère son repli lui-même, et du téléphone en
   *  onglets, où les onglets font office de navigation. */
  onReduire?: () => void
}) {
  const [modaleOuverte, setModaleOuverte] = useState(false)
  // D'où vient le texte : une phrase, ou rien du tout quand la base ne donne pas
  // d'année à nommer (voir `libelleEditionTraduction`).
  const edition = libelleEditionTraduction(trad)
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
      {/* ⚠️ Une FLÈCHE COURTE suit le nom, et c'est elle qui annonce la fiche
          (2026-09-04) : elle vit dans `NomVolet`, avec sa raison.
          ⚠️ LE CHEVRON DE REPLI SE POSE AU BOUT DE CETTE LIGNE, dans le coin
          intérieur du volet (demande de l'auteur, 2026-09-04 : « pas de flèche de
          fermeture du volet de gauche sur la page Bible classique »). Il y en avait
          bien un, mais à l'autre bout du volet et au bout du champ de recherche : de
          quatorze pixels, dans l'encre la plus ténue de l'échelle, il s'y lisait comme
          une marque du CHAMP — une croix d'effacement, une loupe — et non comme un
          contrôle du volet. Le volet de droite, lui, porte le sien seul dans son
          en-tête, et on le voit. C'est ce que fait aussi le volet de la Polyglotte,
          qui est le modèle : le nom à gauche, le repli à sa droite.
          ⛔ Il ne se confond pas avec la flèche du nom : celle-ci suit le texte, à
          l'intérieur du lien ; celui-là se tient au bord de la carte, et il pointe
          vers le bord où le volet va se ranger. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <NomVolet onOuvrir={() => setModaleOuverte(true)} titre="Voir la fiche de cette traduction">{rendreEnrichi(trad.label)}</NomVolet>
        </div>
        {onReduire && (
          <button onClick={onReduire} title="Réduire le volet" aria-label="Réduire le volet"
            className="cs-volet-reduire"
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '2px', margin: '-2px', display: 'flex', alignItems: 'center' }}>
            <IconeChevron dir="left" size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
      {/* Le TRADUCTEUR, avec ses dates de vie complètes. La langue de la bible se lit
          dans la fiche « En savoir plus », que le nom ouvre.
          ⛔ Plus de repli sur `label` : le nom de la bible est écrit une ligne plus
          haut depuis le 2026-08-31, et la ligne du traducteur le redisait alors mot
          pour mot. Sans traducteur nommé, elle porte un tiret, qui dit au moins que
          la place existe et qu'on ne l'a pas remplie. */}
      <span style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.35 }}>
        {/* ⚠️ Le nom et les dates se COMPOSENT, comme dans le menu central et dans la
            fiche : « Bible française du XIIIe siècle » et « (XIIIe siècle) » y prennent
            leurs petites capitales et leur exposant. La carte les rendait bruts, à un
            centimètre d'un menu qui les compose. */}
        {trad.auteur ? rendreEnrichi(trad.auteur) : '—'}
        {trad.auteurDates && <span style={{ fontWeight: 400, color: 'var(--cs-texte-gris)' }}> {rendreEnrichi(`(${trad.auteurDates})`)}</span>}
      </span>
      {/* L'ÉDITION, dans le corps des pages de titre et le sans du volet. La phrase tient sur
          une ou deux lignes quel que soit le volet, et n'a donc ni budget ni mesure —
          c'est tout le bénéfice d'un texte court (voir l'en-tête). */}
      {edition && (
        <span style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.6875rem', color: 'var(--cs-texte-second)', lineHeight: 1.35 }}>{edition}</span>
      )}
      {modaleOuverte && <ModaleTraduction code={trad.code} nomFallback={trad.label || ''} onFermer={() => setModaleOuverte(false)} />}
    </div>
  )
}
