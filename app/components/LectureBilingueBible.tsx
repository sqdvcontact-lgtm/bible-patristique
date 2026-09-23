'use client'

import { useEstMobile } from '@/app/lib/useEstMobile'
import { POINTS_DE_RUPTURE } from '@/app/lib/pointsDeRupture'

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
import LassoTactile from './LassoTactile'
import { useSearchParams } from 'next/navigation'
import { lirePlageVersets } from '@/app/lib/bibleNavigation'
import { lireRepere, PARAMETRE_REPERE } from '@/app/lib/repriseLecture'
import { amenerAuCentre, annoncerReprise, poserEnHaut, positionDuDefileur, terminerReprise } from '@/app/lib/defilementLecture'
import { signalerProgression } from './AnnonceHautsFaits'
import { useEffect, useMemo, useRef } from 'react'
import { useCompte } from '@/app/lib/contexteCompte'
import { useSansSurvol } from '@/app/lib/useEstMobile'
import { canonIdDeLigne, prelevementDuVerset, usePrelevementsDuChapitre } from '@/app/lib/prelevementsBibliques'
import {
  compterDejaPreleves, copierLeLasso, enregistrerLeLasso, retirerDuLasso,
  type ContexteDuLasso, type PassageDuLasso,
} from '@/app/lib/prelevementsLasso'
import { texteLisibleDeLaBible } from '@/app/lib/texteLisible899'
import { ABREV_FR, estLivreNonCanonique } from '@/app/lib/bible'
import MarqueNonCanonique from './MarqueNonCanonique'
import { UNITE_VERSETS } from '@/app/lib/selectionPassages'
import { colonnesTouchees } from '@/app/lib/lasso'
import { nomLangue } from '@/app/lib/bibleModesAlternatifs'
import {
  cleDeCelluleBilingue,
  colonneDeLaCleBilingue,
  numeroCanonique,
} from '@/app/lib/bibleEditionBilingue'

// La reprise (`repere=N`) repose son verset tant que polices et gravures arrivent : la
// première seconde et demie, et seulement tant que le lecteur n'a pas bougé. Mêmes délais
// que la lecture simple (`TexteBible`).
const REPOSES_REPRISE_MS = [150, 400, 800, 1500] as const
const DUREE_REPRISE_MS = 1600

/** « le latin », mais « l’ancien français », « l’hébreu » : l'article s'élide devant une
 *  voyelle ou un h muet. */
export function avecArticle(nom: string): string {
  const bas = nom.toLowerCase()
  return /^[aeiouyhâàäéèêëîïôöûüœ]/.test(bas) ? `l’${bas}` : `le ${bas}`
}

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
  voisins?: { precedent: CibleChapitre | null; suivant: CibleChapitre | null; position?: { actuel: number; total: number } | null }
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
  const colonnesEtroites = useEstMobile(POINTS_DE_RUPTURE.moyen)
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
  // ⛔ Les gestes retiennent la clé de la liste AU DÉPART : une réponse arrivée après un
  // changement de chapitre ne s'inscrit pas dans la liste suivante (prelevementsBibliques).
  const [sauvegardes, , clePrelevementsCourante, modifierPrelevementsPour] = usePrelevementsDuChapitre(userId, livreActif, chapitreActif)
  const lassoActif = !mobile && !sansSurvol
  // ⛔ AU DOIGT, LE LASSO NAÎT D'UN APPUI LONG sur la marge d'un verset (`LassoTactile`,
  // `data-lasso-depart`) : glisser y fait défiler. La marge dit aussi la COLONNE du
  // geste, et le lasso ne retient que les cellules de celle-là : empilées, les deux langues
  // d'un verset se suivent, et un cadre tiré de haut en bas les prendrait toujours toutes
  // les deux, si bien que la règle de `refusDuLasso` refuserait chaque geste.
  const lassoTactileActif = mobile || sansSurvol
  const colonneTactile = useRef<string | null>(null)
  useEffect(() => {
    if (!lassoTactileActif) return
    const surAppui = (e: PointerEvent) => {
      const depart = (e.target as Element | null)?.closest?.('[data-lasso-depart]')
      colonneTactile.current = depart?.getAttribute('data-lasso-depart') ?? null
    }
    window.addEventListener('pointerdown', surAppui, true)
    return () => window.removeEventListener('pointerdown', surAppui, true)
  }, [lassoTactileActif])
  const cleTactile = (element: Element) => {
    const cle = element.getAttribute('data-lasso-cellule')
    if (!cle) return null
    const colonne = colonneTactile.current
    return colonne && colonneDeLaCleBilingue(cle) !== colonne ? null : cle
  }

  // ── `verset=N` ET `repere=N` (contrat partagé avec la lecture simple) ─────────────
  // `verset=N` VISE : le créneau se retient (la sélection de la page) et se pose au centre,
  // en douceur si le chapitre est déjà à l'écran. `repere=N` REND UNE PLACE : le créneau se
  // pose EN HAUT de la zone de lecture, sous les barres collantes, sans rien retenir.
  // ⚠️ La cible est `data-canon-id`, que la reprise enregistre déjà ; une glose n'en porte
  // pas. Et `verset` l'emporte quand les deux sont là.
  const searchParams = useSearchParams()
  const cleChapitre = `${livreActif}|${chapitreActif}`
  const creneau = (n: number) => refDefileur.current?.querySelector<HTMLElement>(`[data-canon-id="${livreActif}.${chapitreActif}.${n}"]`) ?? null
  // Lus par les effets sans en être des dépendances : c'est la page qui réécrit l'adresse
  // quand on retient un verset, et ce changement ne doit ni resélectionner ni défiler.
  const selectionRef = useRef(contenu.canonSelectionne ?? null)
  const selectionnerRef = useRef(contenu.onSelectionnerVerset)
  useEffect(() => {
    selectionRef.current = contenu.canonSelectionne ?? null
    selectionnerRef.current = contenu.onSelectionnerVerset
  })
  const chapitreDejaAffiche = useRef<string | null>(null)
  useEffect(() => {
    const doux = chapitreDejaAffiche.current === cleChapitre
    chapitreDejaAffiche.current = cleChapitre
    const plage = lirePlageVersets(searchParams.get('verset'))
    if (!plage) return
    let annulerDefilement: () => void = () => {}
    const minuteur = window.setTimeout(() => {
      const el = creneau(plage.debut)
      if (el) annulerDefilement = amenerAuCentre(el, { doux })
    }, doux ? 0 : 200)
    const nettoyer = () => { window.clearTimeout(minuteur); annulerDefilement() }
    if (plage.fin > plage.debut) return nettoyer
    const canonId = `${livreActif}.${chapitreActif}.${plage.debut}`
    if (selectionRef.current === canonId) { nettoyer(); return }
    // ⚠️ La sélection de la page BASCULE (un second clic relâche) : on ne l'appelle que si
    // le créneau n'est pas déjà retenu, ce qui revient à le poser.
    selectionnerRef.current?.(canonId)
    return nettoyer
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `creneau` ne lit qu'une référence
  }, [searchParams, cleChapitre])

  const repereTraite = useRef<string | null>(null)
  const repereDemande = searchParams.get('verset') ? null : lireRepere(searchParams.get(PARAMETRE_REPERE))
  useEffect(() => {
    if (repereDemande === null) return
    const cle = `${cleChapitre}|${repereDemande}|${mobile ? 1 : 0}`
    if (repereTraite.current === cle) return
    repereTraite.current = cle
    annoncerReprise(DUREE_REPRISE_MS)
    const minuteurs: number[] = []
    let posee: { el: HTMLElement; position: number } | null = null
    let fini = false
    let commence = false
    const finir = () => { if (!fini) { fini = true; terminerReprise() } }
    const poser = () => {
      const el = creneau(repereDemande)
      if (!el) return false
      poserEnHaut(el)
      posee = { el, position: positionDuDefileur(el) }
      return true
    }
    minuteurs.push(window.setTimeout(() => {
      commence = true
      if (!poser()) { finir(); return }
      REPOSES_REPRISE_MS.forEach((delai, rang) => {
        minuteurs.push(window.setTimeout(() => {
          if (fini || !posee) return
          // Le lecteur a fait défiler lui-même : c'est lui qui commande.
          if (Math.abs(positionDuDefileur(posee.el) - posee.position) > 1) { finir(); return }
          poser()
          if (rang === REPOSES_REPRISE_MS.length - 1) finir()
        }, delai))
      })
    }, 0))
    return () => {
      for (const m of minuteurs) window.clearTimeout(m)
      // ⚠️ Un démontage avant la première pose (double montage du mode strict) ne compte
      // pas pour une reprise faite : la suivante la refera, comme en lecture simple.
      if (!commence) repereTraite.current = null
      finir()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `creneau` ne lit qu'une référence
  }, [repereDemande, cleChapitre, mobile])

  // Ce que porte chaque cellule sélectionnable, rangée par sa clé de lasso.
  // ⛔ Ne s'y sélectionne que ce qui s'enregistre un par un : un verset qui porte un texte
  // dans SA colonne et un numéro canonique. Une glose n'a pas de créneau (charte § 15.4),
  // et un créneau qu'une édition ne porte pas n'a rien à copier.
  // ⛔ LE TEXTE EST CELUI QUE L'ÉCRAN MONTRE, marqueurs éditoriaux du témoin ôtés
  // (charte § 50.3) : la cellule porte le texte BRUT, et copier ou prélever emportait
  // « [lecture difficile : … ] » dans le presse-papiers et dans la base. Chaque colonne se
  // normalise selon SA traduction (`texteLisibleDeLaBible`), le témoin recomposé comme sa
  // traduction moderne.
  const cellulesDuLasso = useMemo(() => {
    const table = new Map<string, PassageDuLasso>()
    for (const colonne of contenu.colonnes) {
      const code = colonne.membre.translationId
      for (const cellule of colonne.cellules) {
        if (cellule.glose || cellule.texte.trim() === '') continue
        const numero = numeroCanonique(cellule.canonId)
        if (numero === null) continue
        table.set(cleDeCelluleBilingue(code, cellule.canonId), {
          numero,
          texte: texteLisibleDeLaBible(cellule.texte, code),
          label: colonne.membre.label || code,
          canonId: canonIdDeLigne(cellule.canonId),
        })
      }
    }
    return table
  }, [contenu.colonnes])

  const passagesDuLasso = (cles: readonly string[]): PassageDuLasso[] => cles
    .map(cle => cellulesDuLasso.get(cle))
    .filter((c): c is PassageDuLasso => c !== undefined)

  // ⛔ UNE CITATION NE MÊLE PAS DEUX LANGUES (demande de l'auteur, 20 septembre 2026).
  // ⚠️ La colonne se lit dans la CLÉ, non dans la table : une clé que la table ne connaît
  // plus (un chapitre qui vient de changer) ne doit pas faire croire à une sélection pure.
  const refusDuLasso = (cles: readonly string[]) => {
    const colonnes = colonnesTouchees(cles, colonneDeLaCleBilingue)
    if (colonnes.length < 2) return null
    const langues = colonnes.map(code => {
      const membre = contenu.colonnes.find(colonne => colonne.membre.translationId === code)?.membre
      return avecArticle(membre ? nomLangue(membre.languageCode) : code)
    })
    return {
      titre: 'Une seule traduction à la fois',
      detail: `Le lasso tient ${langues.join(' et ')} ensemble ; reprenez le geste dans une seule colonne.`,
    }
  }

  // ⚠️ Le prélèvement vise le CRÉNEAU CANONIQUE — ce lecteur, ce chapitre, ce créneau —,
  // comme en lecture simple : un verset se montre prélevé quelle que soit la colonne qu'on
  // lit, et « 8 » ne se confond pas avec la ligne propre à une édition « 8+ ».
  const abreviationLivre = ABREV_FR[livreActif] || livreActif
  // ⛔ LES TROIS GESTES VIVENT DANS `prelevementsLasso.ts` (dette levée le 2026-09-22) :
  // ils étaient recopiés mot pour mot depuis la lecture simple, et cette copie-ci avait
  // déjà divergé — elle emportait le texte BRUT du témoin.
  const contexteDuLasso = (): ContexteDuLasso => ({
    userId, nomLivre, livreAbrege: abreviationLivre, chapitre: chapitreActif,
    sauvegardes,
    // La clé de la liste au DÉPART du geste : la réponse ne s'inscrit que sous elle.
    cleDepart: clePrelevementsCourante,
    modifierPour: modifierPrelevementsPour,
    exigerCompte,
  })
  const dejaPreleves = (cles: readonly string[]) =>
    compterDejaPreleves(sauvegardes, passagesDuLasso(cles))

  // ⛔ Les gestes REFUSENT eux aussi une sélection qui mêle deux colonnes : le lasso de la
  // souris n'offre alors aucune action, mais celui du doigt n'a pas de règle de refus à lui.
  const garderUneColonne = (cles: readonly string[]) => {
    const refus = refusDuLasso(cles)
    if (refus) throw new Error(refus.titre)
  }

  const enregistrerLasso = async (cles: readonly string[]): Promise<number | null> => {
    garderUneColonne(cles)
    const faits = await enregistrerLeLasso(contexteDuLasso(), passagesDuLasso(cles))
    if (faits) signalerProgression()
    return faits
  }

  const retirerLasso = (cles: readonly string[]): Promise<number | null> => {
    garderUneColonne(cles)
    return retirerDuLasso(contexteDuLasso(), passagesDuLasso(cles))
  }

  // La citation d'une sélection : « … » (Gn 1, 3-5.7), une élision là où un verset manque.
  const copierLasso = (cles: readonly string[]) => {
    garderUneColonne(cles)
    return copierLeLasso(contexteDuLasso(), passagesDuLasso(cles))
  }

  // La copie d’une seule cellule, depuis son bouton au survol (bureau) : la citation du
  // lasso, réduite à un verset.
  const copierCellule = (cle: string) => copierLasso([cle])

  // ⛔ LE SIGNET D'UNE CELLULE (audit du 2026-09-22) : la lecture en regard chargeait les
  // prélèvements du chapitre sans jamais les MONTRER — aucun signet sur le numéro, aucun
  // geste par verset — quand la lecture simple en porte quatre. Le geste est celui du
  // lasso, réduit à une cellule : le texte et la bible mis de côté sont ceux de SA colonne,
  // et le créneau canonique est la clé, comme en lecture simple.
  const prelevementDeLaRangee = (canonId: string) => {
    // ⚠️ Un créneau sans numéro canonique n'a pas de clé sous laquelle se ranger : il ne
    // se prélève pas, et il ne se montre donc jamais prélevé.
    const numero = numeroCanonique(canonId)
    return numero === null ? null : prelevementDuVerset(sauvegardes, canonIdDeLigne(canonId), numero)
  }
  const basculerPrelevement = async (cle: string) => {
    const passage = cellulesDuLasso.get(cle)
    if (!passage) return
    const preleve = prelevementDuVerset(sauvegardes, passage.canonId, passage.numero) !== null
    if (preleve) await retirerLasso([cle])
    else await enregistrerLasso([cle])
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

        {/* ⛔ AU TÉLÉPHONE, LE TITRE EST HORS DE L'ÉCRAN, comme en lecture simple : le volet des
            livres et le bandeau du bas disent déjà le chapitre, et le bandeau porte les
            mêmes flèches. Il reste le titre de niveau 1 de la page (`.cs-hors-ecran`). */}
        {mobile && <h1 className="cs-hors-ecran">{`${nomLivre}, chapitre ${chapitreActif}`}</h1>}
        {!mobile && (
        <div style={{ width: 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
            {/* Mêmes flèches qu'en lecture simple : à une borne, chevron en place, grisé, inerte. */}
            <FlecheChapitre sens="precedent" variante="entete" cible={voisins.precedent} onAller={naviguer} />
            <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'baseline', gap: '10px', lineHeight: INTERLIGNE_TITRE_CHAPITRE }}>
              <span style={{ fontSize: '1.25rem', color: 'var(--cs-encre-fonce)', letterSpacing: '0.01em' }}>{nomLivre}{estLivreNonCanonique(livreActif) && <MarqueNonCanonique />}</span>
              <span aria-hidden="true" style={{ color: 'var(--cs-or-doux)', fontSize: '1.25rem', lineHeight: 1 }}>❧</span>
              {/* Même voix éditoriale que la lecture simple : le chapitre ne
                  redevient pas vert parce que le texte passe en deux colonnes. */}
              <span style={{ fontSize: '1.0625rem', color: 'var(--cs-mention)', fontStyle: 'italic' }}>Chapitre {chapitreActif}</span>
            </h1>
            <FlecheChapitre sens="suivant" variante="entete" cible={voisins.suivant} onAller={naviguer} />
          </div>
          <div />
        </div>
        )}

        {/* Le MÊME menu central qu'en lecture ordinaire : même axe de 500 px,
            gouttière d'actions exclue. On doit pouvoir changer de bible sans
            quitter d'abord la lecture en regard. Choisir une autre bible en sort
            d'elle-même, la famille éditoriale n'étant pas la même. */}
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: mobile ? 0 : `${BLANC_TITRE_MENU} auto 0`, display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`, alignItems: 'center' }}>
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
          <BibleBilingue {...contenu} mobile={mobile || colonnesEtroites} copierCellule={copierCellule} prelevementDe={prelevementDeLaRangee} basculerPrelevement={basculerPrelevement} />
          {/* Sous le dernier verset, les chapitres voisins, nommés (audit du 2026-09-21).
              ⚠️ Dans la PREMIÈRE colonne de la grille : la seconde est la gouttière. */}
          <div style={mobile ? undefined : { gridColumn: 1 }}>
            <NavigationBasChapitre precedent={voisins.precedent} suivant={voisins.suivant} position={voisins.position} onAller={naviguer} />
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
        dejaEnregistres={dejaPreleves}
        onEnregistrer={enregistrerLasso}
        onRetirer={retirerLasso}
        onCopier={copierLasso}
      />
      {/* Au doigt, les mêmes props que la lecture simple (`TexteBible`), la clé filtrée
          par la colonne où le geste est né (`cleTactile`). */}
      <LassoTactile
        zone={refDefileur}
        actif={lassoTactileActif}
        contexte={`${livreActif}|${chapitreActif}|${tradCode}`}
        selecteurCibles="[data-lasso-cellule]"
        cleDe={cleTactile}
        surbrillance={cle => `[data-lasso-cellule="${cle}"]`}
        unite={UNITE_VERSETS}
        dejaEnregistres={dejaPreleves}
        onEnregistrer={enregistrerLasso}
        onRetirer={retirerLasso}
        onCopier={copierLasso}
      />
    </div>
  )
}
