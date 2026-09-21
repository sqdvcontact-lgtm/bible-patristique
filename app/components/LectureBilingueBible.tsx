'use client'

import { useEstMobile } from '@/app/lib/useEstMobile'

// Enveloppe de la lecture « Latin & Français » : même châssis que la lecture
// ordinaire — en-tête, navigation de chapitre, zone de défilement — pour que le
// passage d'un mode à l'autre ne déplace rien à l'écran. Le corps est rendu par
// `BibleBilingue`, et la logique d'appariement par `bibleEditionBilingue.ts`.

import { useNaviguer } from '@/app/lib/attenteNavigation'

import { BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import { BLANC_TITRE_MENU, GOUTTIERE_ACTIONS_VERSET, INTERLIGNE_TITRE_CHAPITRE } from '@/app/lib/compositionBible'
import FlecheChapitre, { type CibleChapitre } from './FlecheChapitre'
import NavigationBasChapitre from './NavigationBasChapitre'
import BibleBilingue, { type LectureBilingueProps } from './BibleBilingue'
import SelecteurTraductionBible from './SelecteurTraductionBible'
import LassoLecture from './LassoLecture'
import { signalerProgression } from './AnnonceHautsFaits'
import { useMemo, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useCompte } from '@/app/lib/contexteCompte'
import { useSansSurvol } from '@/app/lib/useEstMobile'
import { usePrelevementsDuChapitre } from '@/app/lib/prelevementsBibliques'
import { ABREV_FR } from '@/app/lib/bible'
import { citationBiblique, copierCitation } from '@/app/lib/citation'
import { referenceDesVersets, texteDesVersets, UNITE_VERSETS } from '@/app/lib/selectionPassages'
import { colonnesTouchees } from '@/app/lib/lasso'
import { nomLangue } from '@/app/lib/bibleModesAlternatifs'
import {
  cleDeCelluleBilingue,
  colonneDeLaCleBilingue,
  numeroCanonique,
} from '@/app/lib/bibleEditionBilingue'

export type LectureBilingueBibleProps = LectureBilingueProps & {
  livreActif: string
  chapitreActif: number
  nomLivre: string
  tradCode: string
  /** Toutes les bibles lisibles, pour que le menu central reste entier ici aussi. */
  traductions: readonly { code: string; label: string }[]
  traductionIndex: number
  setTraductionIndex: (index: number) => void
  /** Ouvrir une famille en regard depuis le menu central. */
  choisirEnRegard?: (index: number) => void
  /** Les chapitres voisins, adresses composées par la page (`chapitreVoisin`). */
  voisins?: { precedent: CibleChapitre | null; suivant: CibleChapitre | null }
}

export default function LectureBilingueBible({
  livreActif,
  chapitreActif,
  nomLivre,
  tradCode,
  traductions,
  traductionIndex,
  setTraductionIndex,
  choisirEnRegard,
  mobile = false,
  voisins = { precedent: null, suivant: null },
  ...contenu
}: LectureBilingueBibleProps) {
  // ⛔ Deux colonnes ne tiennent pas dans la bande 901–980 px. Le shell y reste
  //    en mode bureau (volets de 200 et 260 px ouverts), si bien que la lecture en
  //    regard se partageait environ 320 px : 140 et 180 px par colonne. Sous 980 —
  //    un seuil de la liste admise, celui du sommaire d’œuvre et du bilingue d’une
  //    œuvre — les deux colonnes s’empilent par verset, l’axe canonique restant commun.
  const colonnesEtroites = useEstMobile(980)
  // Le clic est ACQUITTÉ : la navigation passe par la provision d'attente, qui
  // allume la marque au centre de la lecture tant que la page se prépare.
  const naviguer = useNaviguer()

  // ── LE LASSO ───────────────────────────────────────────────────────────────
  // Tirer un cadre depuis le blanc sélectionne plusieurs versets, qu'on enregistre ou
  // qu'on copie d'un coup (app/components/LassoLecture.tsx).
  // ⛔ ICI, ET SEULEMENT ICI, DEUX COLONNES SE FONT FACE : un lasso tiré en travers prend
  // les deux langues, et le passage qu'on copierait n'existe nulle part. La règle du refus
  // vit dans `refusDuLasso` ; le composant la crie.
  const refDefileur = useRef<HTMLDivElement>(null)
  const { userId, exigerCompte } = useCompte()
  // ⛔ L'axe du lasso est la CAPACITÉ du pointeur : au doigt, glisser fait défiler.
  const sansSurvol = useSansSurvol()
  const [sauvegardes, setSauvegardes] = usePrelevementsDuChapitre(userId, livreActif, chapitreActif)
  const lassoActif = !mobile && !sansSurvol

  // Ce que porte chaque cellule sélectionnable, rangée par sa clé de lasso.
  // ⛔ Ne s'y sélectionne que ce qui s'enregistre un par un : un verset qui porte un texte
  // dans SA colonne et un numéro canonique. Une glose n'a pas de créneau (charte § 15.4),
  // et un créneau qu'une édition ne porte pas n'a rien à copier.
  const cellulesDuLasso = useMemo(() => {
    const table = new Map<string, { langue: string; label: string; texte: string; numero: number }>()
    for (const colonne of contenu.colonnes) {
      const code = colonne.membre.translationId
      for (const cellule of colonne.cellules) {
        if (cellule.glose || cellule.texte.trim() === '') continue
        const numero = numeroCanonique(cellule.canonId)
        if (numero === null) continue
        table.set(cleDeCelluleBilingue(code, cellule.canonId), {
          langue: nomLangue(colonne.membre.languageCode),
          label: colonne.membre.label || code,
          texte: cellule.texte,
          numero,
        })
      }
    }
    return table
  }, [contenu.colonnes])

  const cellulesChoisies = (cles: readonly string[]) => cles
    .map(cle => cellulesDuLasso.get(cle))
    .filter((c): c is NonNullable<typeof c> => c !== undefined)

  // ⛔ UNE CITATION NE MÊLE PAS DEUX LANGUES (demande de l'auteur, 20 septembre 2026).
  // ⚠️ La colonne se lit dans la CLÉ, non dans la table : une clé que la table ne connaît
  // plus (un chapitre qui vient de changer) ne doit pas faire croire à une sélection pure.
  const refusDuLasso = (cles: readonly string[]) => {
    const colonnes = colonnesTouchees(cles, colonneDeLaCleBilingue)
    if (colonnes.length < 2) return null
    const langues = colonnes.map(code => {
      const membre = contenu.colonnes.find(colonne => colonne.membre.translationId === code)?.membre
      return 'le ' + (membre ? nomLangue(membre.languageCode) : code).toLowerCase()
    })
    return {
      titre: 'Une seule traduction à la fois',
      detail: `Le lasso tient ${langues.join(' et ')} ensemble ; reprenez le geste dans une seule colonne.`,
    }
  }

  // ⚠️ Le prélèvement vise la clé NATURELLE — ce lecteur, ce chapitre, ces versets —, comme
  // en lecture simple : un verset se montre prélevé quelle que soit la colonne qu'on lit.
  const abreviationLivre = ABREV_FR[livreActif] || livreActif
  const numerosEnregistres = (cles: readonly string[]) =>
    [...new Set(cellulesChoisies(cles).map(c => c.numero).filter(n => sauvegardes.has(n)))]

  const enregistrerLasso = async (cles: readonly string[]): Promise<number | null> => {
    if (!exigerCompte('enregistrer ces versets') || !userId) return null
    const vus = new Set<number>()
    const aEcrire = cellulesChoisies(cles).filter(c => {
      if (sauvegardes.has(c.numero) || vus.has(c.numero)) return false
      vus.add(c.numero)
      return true
    })
    if (aEcrire.length === 0) return 0
    const { data, error } = await supabase.from('prelevements').insert(aEcrire.map(c => ({
      user_id: userId, type: 'biblique',
      ref_livre: nomLivre, ref_livre_abr: abreviationLivre,
      ref_chapitre: chapitreActif, ref_verset: c.numero,
      texte: c.texte, traduction: c.label,
    }))).select('id, ref_verset')
    if (error) throw error
    setSauvegardes(prev => {
      const suite = new Map(prev)
      for (const ligne of (data ?? []) as { id: string; ref_verset: number }[]) suite.set(ligne.ref_verset, ligne.id)
      return suite
    })
    signalerProgression()
    return aEcrire.length
  }

  const retirerLasso = async (cles: readonly string[]): Promise<number | null> => {
    if (!userId) return null
    const numeros = numerosEnregistres(cles)
    if (numeros.length === 0) return 0
    const { error } = await supabase.from('prelevements').delete()
      .eq('user_id', userId).eq('type', 'biblique')
      .eq('ref_livre_abr', abreviationLivre).eq('ref_chapitre', chapitreActif)
      .in('ref_verset', numeros)
    if (error) throw error
    setSauvegardes(prev => {
      const suite = new Map(prev)
      for (const n of numeros) suite.delete(n)
      return suite
    })
    return numeros.length
  }

  // La citation d'une sélection : « … » (Gn 1, 3-5.7), une élision là où un verset manque.
  const copierLasso = async (cles: readonly string[]) => {
    const choisies = cellulesChoisies(cles)
    if (choisies.length === 0) return
    await copierCitation(citationBiblique(
      texteDesVersets(choisies.map(c => ({ numero: c.numero, texte: c.texte }))),
      `${abreviationLivre || nomLivre} ${chapitreActif}, ${referenceDesVersets(choisies.map(c => c.numero))}`,
    ))
  }

  return (
    <div
      className={mobile ? 'flex flex-col' : 'flex-1 flex flex-col h-full overflow-hidden'}
      style={{
        background: 'var(--cs-fond)',
        ...(mobile
          ? { width: '100%', paddingTop: '2.875rem', paddingBottom: `calc(0.75rem + ${BANDEAU_NAV_MOBILE})` }
          : {}),
      }}
    >
      {/* ⛔ Le passage simple ↔ bilingue ne doit déplacer NI le titre NI le menu.
          L'en-tête simple se centre sur le bloc de texte de 500 px et réserve à
          droite la gouttière d'actions de 38 px : centrer ici sur toute la largeur
          décalait « Genèse ❧ Chapitre N » de 19 px au changement de lecture.
          Même gabarit, mêmes teintes, mêmes survols : seul le CORPS devient double. */}
      <div style={{ borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', padding: '14px 32px 10px' }}>
        <style>{`
          .nav-chap-arrow:hover { color: var(--cs-mention) !important; }
        `}</style>

        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            {/* Mêmes flèches qu'en lecture simple : à une borne, chevron en place, grisé, inerte. */}
            <FlecheChapitre sens="precedent" variante="entete" cible={voisins.precedent} onAller={naviguer} />
            <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'baseline', gap: '10px', lineHeight: INTERLIGNE_TITRE_CHAPITRE }}>
              <span style={{ fontSize: '1.25rem', color: 'var(--cs-encre-fonce)', letterSpacing: '0.01em' }}>{nomLivre}</span>
              <span style={{ color: '#b0a088', fontSize: '1.25rem', lineHeight: 1 }}>❧</span>
              {/* Même voix éditoriale que la lecture simple : le chapitre ne
                  redevient pas vert parce que le texte passe en deux colonnes. */}
              <span style={{ fontSize: '1.0625rem', color: 'var(--cs-mention)', fontStyle: 'italic' }}>Chapitre {chapitreActif}</span>
            </h1>
            <FlecheChapitre sens="suivant" variante="entete" cible={voisins.suivant} onAller={naviguer} />
          </div>
          <div />
        </div>

        {/* Le MÊME menu central qu'en lecture ordinaire : même axe de 500 px,
            gouttière d'actions exclue. On doit pouvoir changer de bible sans
            quitter d'abord la lecture en regard. Choisir une autre bible en sort
            d'elle-même, la famille éditoriale n'étant pas la même. */}
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: `${BLANC_TITRE_MENU} auto 0`, display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`, alignItems: 'center' }}>
          <SelecteurTraductionBible
            traductions={traductions}
            traductionIndex={traductionIndex}
            setTraductionIndex={setTraductionIndex}
            choisirEnRegard={choisirEnRegard}
            enRegard
          />
          <div />
        </div>
      </div>

      {/* Même garde que la lecture simple : la barre de défilement rétrécit la
          boîte de contenu sur certains navigateurs. Sans gouttière réservée des
          DEUX côtés, le corps bilingue glisse d'une demi-largeur de scrollbar
          par rapport à l'en-tête au moment où elle apparaît. */}
      <div
        ref={refDefileur}
        className={mobile ? '' : 'flex-1 overflow-y-auto'}
        style={{
          padding: mobile ? '1rem 1.125rem 0' : '1.5rem 2rem 3rem',
          ...(mobile ? {} : { scrollbarGutter: 'stable both-edges' }),
        }}
      >
        {/* ── L'AXE ET LA MESURE DU CORPS (2026-09-03) ──────────────────────────
            Le corps prend la mesure de la PAGE de la lecture simple, 38,75 rem, et
            non plus 52 : décision de l'auteur, « les versets dépassent trop ;
            réduire la largeur des versets bibliques, harmonieusement ». Et il se
            pose sur l'AXE DU TEXTE, celui de l'en-tête ci-dessus et de la lecture
            simple : la grille réserve à droite la gouttière d'actions de 2,375 rem
            que la lecture en regard n'a pas, pour que le corps se centre sur le
            bloc, gouttière exclue, comme le titre. Mesuré avant, sur un écran de
            2 560 px : le titre à 1 176, le corps à 1 203 — vingt-sept pixels
            d'écart, et le passage simple ↔ bilingue déplaçait le texte sans
            déplacer le titre. ⚠️ L'appareil, lui, est bordé par le fer des versets :
            voir `surMesure` (BibleBilingue) et `.cs-bible-regard` (globals.css). */}
        {/* `data-colonne-lecture` : la colonne se DÉCLARE, pour que l'encart d'une note se range
            dans la marge au lieu de couvrir le verset (`placerEnMarge`). La lecture en regard
            ne la portait pas, et ses notes s'ouvraient toutes sous leur appel. */}
        <div
          className="cs-lecture-colonne"
          data-colonne-lecture=""
          style={mobile
            ? { maxWidth: '100%', margin: '0 auto' }
            : { width: `min(calc(var(--mesure-page) + ${GOUTTIERE_ACTIONS_VERSET}), 100%)`, margin: '0 auto', display: 'grid', gridTemplateColumns: `minmax(0, var(--mesure-page)) ${GOUTTIERE_ACTIONS_VERSET}` }}
        >
          <BibleBilingue {...contenu} mobile={mobile || colonnesEtroites} />
          {/* Sous le dernier verset, les chapitres voisins, nommés (audit du 2026-09-21).
              ⚠️ Dans la PREMIÈRE colonne de la grille : la seconde est la gouttière. */}
          <div style={mobile ? undefined : { gridColumn: 1 }}>
            <NavigationBasChapitre precedent={voisins.precedent} suivant={voisins.suivant} onAller={naviguer} />
          </div>
        </div>
      </div>
      {/* ⛔ Le blanc d'où le lasso naît est le rembourrage du défileur et la gouttière
          d'actions que la grille réserve à droite : tout ce qui porte du texte ou se clique
          — une rangée, une cellule, un bloc de l'appareil — en est écarté, et le geste passe
          donc PAR-DESSUS les commentaires de Fillion sans les prendre. */}
      <LassoLecture
        zone={refDefileur}
        defileur={refDefileur}
        actif={lassoActif}
        contexte={`${livreActif}|${chapitreActif}|${tradCode}`}
        selecteurCibles="[data-lasso-cellule]"
        cleDe={element => element.getAttribute('data-lasso-cellule')}
        surbrillance={cle => `[data-lasso-cellule="${cle}"]`}
        horsLasso="[data-canon-id], [data-glose], [data-membre], .cs-bible-bloc, .cs-bible-regard"
        unite={UNITE_VERSETS}
        gouttiere={GOUTTIERE_ACTIONS_VERSET}
        refus={refusDuLasso}
        dejaEnregistres={cles => numerosEnregistres(cles).length}
        onEnregistrer={enregistrerLasso}
        onRetirer={retirerLasso}
        onCopier={copierLasso}
      />
    </div>
  )
}
