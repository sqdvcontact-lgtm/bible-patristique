'use client'

// ── La carte « Traduction » du volet de lecture ────────────────────────────────
//
// Elle dit ce qu'on lit : le traducteur avec ses dates, la référence de l'édition
// présentée, et le lien vers la fiche complète. Elle coiffe le volet de gauche de
// la page Bible (`NavLivres`), en desktop seulement — sur téléphone le volet est
// un tiroir, et la carte n'y est pas rendue.
//
// ⛔ LA RÉFÉRENCE D'ÉDITION S'EFFACE SUR UN VOLET ÉTROIT (décision de l'auteur,
// 2026-08-28). Elle compte de 163 à 348 signes selon la traduction ; bornée à deux
// lignes dans une colonne de 180 pixels, elle n'en montrait qu'un cinquième, coupé
// au milieu d'un titre, et c'est ce moignon que l'auteur a relevé : « Texte latin
// en regard dans Louis-Claude Fillion, La Sainte Bible (texte latin… ». Une
// référence tronquée n'est pas une référence courte, c'est une phrase cassée.
//
// ⚠️ Le seuil porte sur la largeur du VOLET, non sur celle de l'écran, et c'est ce
// qui rend la carte vraiment adaptable : le volet se traîne de 120 à 400 pixels à
// la main, et sa largeur au repos suit l'écran (`clamp(200px, 14vw, 320px)`). Une
// média-query n'aurait vu que le second cas. La règle est donc une REQUÊTE DE
// CONTENEUR, dans `globals.css` (`@container volet`), le volet portant
// `container-type: inline-size`.
//
// ⚠️ LE LIEN PARTAGE LA LIGNE DE L'ÉTIQUETTE (2026-08-30, condensation demandée par
// l'auteur). Il occupait une ligne entière pour une action secondaire, alors que
// « Traduction » laisse les deux tiers de la sienne libres. Le lien y monte, et la
// carte perd une ligne sans rien perdre de ce qu'elle porte.
//
// ⚠️ LA CARTE EN DIT PLUS À MESURE QUE LE VOLET S'ÉLARGIT (2026-08-31, demande de
// l'auteur : « plus de texte sur grand écran, aucun sur petit »). Elle porte quatre
// degrés, tous commandés par la largeur du VOLET dans globals.css :
//   · sous 230 px : le nom du traducteur, ses dates, un lien abrégé ;
//   · 230 : le lien reprend son libellé entier ;
//   · 260 : la référence de l'édition paraît, bornée à deux lignes, et la NOTICE
//     du traducteur avec elle — entière, six lignes lui suffisant à toute largeur ;
//   · 300 : la référence passe à trois lignes ;
//   · 350 : elle en prend quatre, et sept éditions sur neuf y tiennent entières.
// ⛔ Aucun degré ne RETRANCHE quoi que ce soit à ce que la carte montrait avant :
// l'état de départ est celui du volet le plus étroit, et tout le reste s'y ajoute.
// Les blancs, eux, ne sautent pas de degré en degré : ils suivent l'échelle du
// volet, qui est continue (voir globals.css, « L'échelle du volet »).
//
// ⚠️ IL SE TIENT CONTRE L'ÉTIQUETTE, plus petit, en italique et sans soulignement
// (2026-08-31, demande de l'auteur). Au fer à droite il tenait le bord opposé de la
// ligne et pesait autant que « Traduction » ; collé à elle, il en devient la suite.
// L'italique et le filet retiré le rendent à son rang d'action secondaire.

import { useState } from 'react'
import ModaleTraduction from '@/app/components/ModaleTraduction'
// Les notices datent volontiers (« IVe siècle ») : elles passent par le composeur
// commun, seul endroit du site qui sache poser un siècle.
import { rendreSiecles } from '@/app/lib/siecles'

export type TraductionEncart = {
  code: string
  label: string
  auteur?: string | null
  auteurDates?: string | null
  editionRef?: string | null
  // `traductions.bio_courte` : deux phrases sur le traducteur. Elle ne paraît que
  // sur un volet large, où elle tient entière (voir l'en-tête).
  bio?: string | null
  datePublication?: string | null
  confession?: string | null
  langue?: string | null
}

export default function EncartTraduction({ trad }: { trad: TraductionEncart }) {
  const [modaleOuverte, setModaleOuverte] = useState(false)
  return (
    // ⚠️ Plus de `minHeight` : la carte valait 6,75 rem pour ne jamais faire bouger
    // la mise en page, ce qui laissait un blanc de deux lignes dès que la référence
    // s'efface. Elle prend maintenant la hauteur de ce qu'elle porte, et rien ne
    // bouge pour autant — la référence ne paraît ou ne disparaît qu'au geste
    // délibéré de redimensionner le volet.
    <div className="cs-volet-carte" style={{ flexShrink: 0, boxSizing: 'border-box', overflow: 'hidden', padding: 'calc(var(--volet-air) + 1px) calc(var(--volet-gouttiere) + 2px)', borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', display: 'flex', flexDirection: 'column', gap: 'var(--volet-air-fin)' }}>
      {/* ⚠️ Alignement sur la LIGNE DE BASE, non sur le milieu : l'étiquette pèse 8
          pixels et le lien 8,5, et deux boîtes centrées l'une sur l'autre feraient
          flotter le plus petit des deux au-dessus de la ligne de l'autre.
          ⚠️ Le lien ne se laisse PAS comprimer (`flexShrink: 0`) : la carte est en
          `overflow: hidden`, un lien rétréci s'y couperait au lieu de déborder, et
          le défaut ne se verrait donc que sur une largeur de volet particulière. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'calc(var(--volet-air-fin) + 3px)' }}>
        <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--cs-etiquette)' }}>Traduction</span>
        {/* ⚠️ Le libellé se raccourcit avec le volet : « En savoir plus sur cette
            traduction » réclamait 218 pixels de volet pour tenir à côté de l'étiquette
            (mesuré à 9,5 px ; il en demande moins depuis qu'il est tombé à 8,5, et le
            seuil de 230 lui fait désormais une marge). Les deux formes sont écrites,
            et la requête de conteneur n'en montre qu'une — un libellé ne se coupe pas
            en JavaScript, sinon il faudrait mesurer à chaque rendu. */}
        <button onClick={() => setModaleOuverte(true)} style={{ flexShrink: 0, fontSize: '0.53125rem', fontStyle: 'italic', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0 }}>
          <span className="cs-volet-lien-long">En savoir plus sur cette traduction</span>
          <span className="cs-volet-lien-court">En savoir plus</span>
        </button>
      </div>
      {/* Auteur avec ses dates de vie complètes, puis la référence complète de l'édition
          présentée (ville, éditeur, date). La langue n'est pas indiquée ici. */}
      <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.22 }}>
        {trad.auteur || trad.label || '—'}
        {trad.auteurDates && <span style={{ fontWeight: 400, color: 'var(--cs-texte-gris)' }}> ({trad.auteurDates})</span>}
      </span>
      {/* Div BLOC volontaire : `-webkit-line-clamp` sur un enfant DIRECT du flex serait
          neutralisé (blockification). Sur un volet large, la référence est bornée à
          deux lignes ; sur un volet étroit, elle s'efface tout à fait, et la fiche
          « En savoir plus » la donne entière dans les deux cas. */}
      {trad.editionRef && (
        <div className="cs-volet-ref">
          <span style={{ display: '-webkit-box', WebkitLineClamp: 'var(--volet-ref-lignes, 2)', WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.65625rem', color: 'var(--cs-texte-second)', lineHeight: 1.3 }}>{trad.editionRef}</span>
        </div>
      )}
      {/* La NOTICE du traducteur — deux phrases, en italique comme dans la fiche
          « En savoir plus », d'où elle vient. Elle ne paraît qu'au-dessus de 260 px
          de volet (`cs-volet-bio`, éteinte par défaut dans globals.css) : c'est la
          largeur au-dessous de laquelle la plus longue des neuf ne tient plus en
          six lignes, et une notice coupée en son milieu vaut moins que pas de
          notice du tout. La mesure est dans globals.css, avec le seuil.
          ⚠️ Même construction que la référence, et pour la même raison : la boîte
          extérieure est un BLOC, car `-webkit-line-clamp` posé sur un enfant direct
          du flex serait neutralisé (blockification). */}
      {trad.bio && (
        <div className="cs-volet-bio">
          <span style={{ display: '-webkit-box', WebkitLineClamp: 'var(--volet-bio-lignes, 4)', WebkitBoxOrient: 'vertical', overflow: 'hidden', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.625rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.45 }}>{rendreSiecles(trad.bio)}</span>
        </div>
      )}
      {modaleOuverte && <ModaleTraduction code={trad.code} nomFallback={trad.label || ''} onFermer={() => setModaleOuverte(false)} />}
    </div>
  )
}
