'use client'

// ── La carte « Traduction » du volet de lecture ────────────────────────────────
//
// Elle dit ce qu'on lit : le traducteur avec ses dates, la référence de l'édition
// présentée, et le lien vers la fiche complète. Elle coiffe le volet de gauche de
// la page Bible (`NavLivres`), en desktop seulement — sur téléphone le volet est
// un tiroir, et la carte n'y est pas rendue.
//
// ⛔ LA RÉFÉRENCE D'ÉDITION NE SE COUPE JAMAIS : ELLE PARAÎT ENTIÈRE OU PAS DU TOUT
// (décision de l'auteur, 2026-09-02 : « ne pas tronquer le premier texte ; limiter
// le nombre de caractères affichés, ou même si ce paragraphe s'affiche, en fonction
// de la taille de l'écran »). Elle compte de 93 à 348 signes selon la traduction.
// Le 28 août, bornée à deux lignes dans une colonne de 180 pixels, elle n'en
// montrait qu'un cinquième, coupé au milieu d'un titre : « Texte latin en regard
// dans Louis-Claude Fillion, La Sainte Bible (texte latin… ». Le 31 août, son
// compte de lignes montait avec le volet (2, 3, 4), ce qui laissait toujours les
// plus longues coupées. Une référence tronquée n'est pas une référence courte,
// c'est une phrase cassée ; elle ne l'est plus.
//
// ⚠️ COMMENT ELLE DÉCIDE. La feuille (`globals.css`, « Ce que le volet dit de
// plus ») accorde à la référence un BUDGET de lignes qui monte avec la largeur du
// volet, `--volet-ref-lignes`. La carte compose la référence dans une SONDE
// invisible, de la largeur et de la police du texte visible, compte les lignes
// qu'elle occupe et ne rend le texte visible que s'il tient dans le budget. Une
// requête de conteneur ne sait pas compter les signes d'un texte : la mesure est
// donc ici, en JavaScript, mais la POLITIQUE (le budget, les seuils) reste dans la
// feuille, avec les autres seuils du volet. La sonde est observée
// (`ResizeObserver`) : elle change de hauteur quand le volet change de largeur,
// quand la police finit de se charger, et quand la feuille cesse de la cacher
// sous 260 px — trois cas, une seule mesure.
//
// ⚠️ Le seuil porte sur la largeur du VOLET, non sur celle de l'écran, et c'est ce
// qui rend la carte vraiment adaptable : le volet se traîne de 120 à 400 pixels à
// la main, et sa largeur au repos suit l'écran (`clamp(200px, 14vw, 320px)`). Une
// média-query n'aurait vu que le second cas. La règle est donc une REQUÊTE DE
// CONTENEUR, dans `globals.css` (`@container volet`), le volet portant
// `container-type: inline-size`.
//
// ⛔ LA CARTE NE PORTE PLUS LA NOTICE DU TRADUCTEUR (2026-09-02, demande de
// l'auteur : « n'afficher que le premier texte »). Entrée le 31 août au-dessus de
// 260 px de volet, elle vit dans la fiche « En savoir plus », d'où elle venait, et
// la carte ne porte plus qu'un texte long : la référence.
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
// ⛔ Aucun degré ne RETRANCHE quoi que ce soit à ce que la carte montrait avant :
// l'état de départ est celui du volet le plus étroit (le nom de la bible, le nom
// du traducteur et ses dates), et la référence s'y ajoute quand elle tient. Les
// blancs, eux, ne sautent pas de degré en degré : ils suivent l'échelle du volet,
// qui est continue (voir globals.css, « L'échelle du volet »).
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

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import ModaleTraduction from '@/app/components/ModaleTraduction'
import NomVolet from '@/app/components/NomVolet'

export type TraductionEncart = {
  code: string
  label: string
  auteur?: string | null
  auteurDates?: string | null
  editionRef?: string | null
  datePublication?: string | null
  confession?: string | null
  langue?: string | null
}

// La composition de la référence : la sonde et le texte visible la partagent, sans
// quoi la mesure ne dirait rien du texte. ⛔ Pas de `-webkit-line-clamp` : le texte
// visible n'est jamais coupé, c'est toute la règle.
const STYLE_REF: CSSProperties = { fontSize: '0.65625rem', color: 'var(--cs-texte-second)', lineHeight: 1.3 }

/**
 * Dit si la référence tient ENTIÈRE dans le budget de lignes que la feuille accorde
 * au volet (`--volet-ref-lignes`). `sonde` se pose sur un bloc invisible qui porte
 * le même texte, dans la même police et la même largeur que le texte visible.
 *
 * ⚠️ `false` au départ, donc au rendu serveur : la référence paraît après la
 * première mesure, sous `useLayoutEffect`, avant que l'écran ne soit peint. Un
 * départ à `true` aurait montré la référence entière puis l'aurait retirée, et la
 * liste des livres aurait sauté sous l'œil du lecteur.
 * ⚠️ Sous 260 px la feuille cache tout le bloc (`display: none`) : la sonde mesure
 * 0 et la réponse est `false`, ce qui ne change rien à ce qu'on voit ; quand le
 * volet repasse le seuil, la sonde reprend une hauteur, l'observateur le voit, et
 * la mesure se refait.
 */
function useReferenceEntiere(texte: string | null | undefined) {
  const sonde = useRef<HTMLSpanElement>(null)
  const [tient, setTient] = useState(false)
  useLayoutEffect(() => {
    const el = sonde.current
    if (!el) return
    const mesurer = () => {
      const hauteur = el.getBoundingClientRect().height
      if (hauteur === 0) { setTient(false); return }
      const style = getComputedStyle(el)
      const interligne = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3
      const budget = parseInt(style.getPropertyValue('--volet-ref-lignes'), 10) || 0
      setTient(Math.round(hauteur / interligne) <= budget)
    }
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(el)
    return () => observateur.disconnect()
  }, [texte])
  return { sonde, tient }
}

export default function EncartTraduction({ trad }: { trad: TraductionEncart }) {
  const [modaleOuverte, setModaleOuverte] = useState(false)
  const { sonde, tient: referenceTient } = useReferenceEntiere(trad.editionRef)
  return (
    // ⚠️ Plus de `minHeight` : la carte valait 6,75 rem pour ne jamais faire bouger
    // la mise en page, ce qui laissait un blanc de deux lignes dès que la référence
    // s'efface. Elle prend maintenant la hauteur de ce qu'elle porte, et rien ne
    // bouge pour autant — la référence ne paraît ou ne disparaît qu'au geste
    // délibéré de redimensionner le volet.
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
      {/* Le TRADUCTEUR, avec ses dates de vie complètes, puis la référence complète de
          l'édition présentée (ville, éditeur, date). La langue n'est pas indiquée ici.
          ⛔ Plus de repli sur `label` : le nom de la bible est écrit une ligne plus
          haut depuis le 2026-08-31, et la ligne du traducteur le redisait alors mot
          pour mot. Sans traducteur nommé, elle porte un tiret, qui dit au moins que
          la place existe et qu'on ne l'a pas remplie. */}
      <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.22 }}>
        {trad.auteur || '—'}
        {trad.auteurDates && <span style={{ fontWeight: 400, color: 'var(--cs-texte-gris)' }}> ({trad.auteurDates})</span>}
      </span>
      {/* La RÉFÉRENCE D'ÉDITION, entière ou absente (voir l'en-tête). Le bloc porte
          deux fois le texte : la SONDE, toujours rendue mais sans hauteur ni
          visibilité, que la mesure lit ; et le texte VISIBLE, rendu seulement quand
          la mesure a dit qu'il tient. Sous 260 px de volet, la feuille cache le
          bloc entier (`cs-volet-ref`), sonde comprise. */}
      {trad.editionRef && (
        <div className="cs-volet-ref">
          {referenceTient && <span style={STYLE_REF}>{trad.editionRef}</span>}
          <div aria-hidden style={{ height: 0, overflow: 'hidden', visibility: 'hidden' }}>
            <span ref={sonde} style={{ ...STYLE_REF, display: 'block' }}>{trad.editionRef}</span>
          </div>
        </div>
      )}
      {modaleOuverte && <ModaleTraduction code={trad.code} nomFallback={trad.label || ''} onFermer={() => setModaleOuverte(false)} />}
    </div>
  )
}
