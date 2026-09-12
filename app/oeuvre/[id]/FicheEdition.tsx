'use client'

// ── Fiche « À propos de cette édition » ────────────────────────────────────────
//
// La fenêtre s'ouvre depuis le volet de lecture d'une œuvre patristique (« En savoir
// plus sur cette édition »). Elle reprend de la FICHE D'AUTEUR
// (`app/components/ModaleAuteur`) et de la FICHE DE TRADUCTION
// (`app/components/ModaleTraduction`) le cadre (52 rem, `--cs-fond`, rayon 12 px, croix
// collante, défilement du CONTENU et non du calque), les titres de section et la rangée
// « étiquette · valeur ».
//
// ⛔ ELLE EN REPREND AUSSI LA GÉOMÉTRIE — 1,35fr à gauche, 1fr à droite, la CHRONOLOGIE
// dans la colonne étroite —, et ce qui a changé le 2026-09-10 est ce que chaque colonne
// PORTE, non le côté de la frise. Le partage d'avant laissait la seule notice de
// l'édition à gauche et empilait la frise PUIS « L'œuvre », les notes et « Sur ce site »
// à droite : cinq rangées d'étiquettes en face de sept cents pixels de frise, la colonne
// de gauche fermée après trois lignes, et ce qu'on vient chercher dans une fiche nommée
// « À propos de cette édition » relégué sous la frise, dans la colonne la plus étroite.
// La fenêtre faisait 1 466 px de haut pour un contenu qui en demande la moitié. TOUTES
// les notices tiennent donc la colonne large, et la frise est seule dans l'étroite.
//
// ⚠️ Deux décisions INDÉPENDANTES, qu'on a d'abord confondues : quelle colonne est LARGE
// (la donnée le commande — une biographie remplit 1,35fr, dix rangées d'étiquettes non)
// et de quel CÔTÉ se tient la frise (rien dans la donnée ne le dit, la convention des
// trois fiches le fixe).
//
// ⛔ ET IL N'Y A PLUS DE PORTRAIT D'AUTEUR (même relevé). Il ouvrait la fiche d'un
// visage, quand le sujet est un LIVRE ; l'auteur se nomme sous le titre, et son nom
// ouvre sa propre fiche, où le portrait est chez lui.
//
// ⚠️ Le CONTENU est séparé de la fenêtre (`ContenuFicheEdition`), comme dans les deux
// autres : `createPortal` n'existe pas au rendu serveur, et une planche de contrôle
// hors session ne pourrait pas rendre la fiche si tout tenait dans un seul composant.

import { Z_MODALE } from '@/app/lib/empilement'
import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/app/lib/supabase'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { espacerIntervallesHistoriques, formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { libelleLangue } from '@/app/lib/langues'
import { rendreSiecles } from '@/app/lib/siecles'
import { sansPointFinal } from '@/app/lib/titres'
import OngletsPage from '@/app/components/OngletsPage'
import { separateurAuteurs, type AuteurOeuvre } from '@/app/lib/auteursOeuvre'
import {
  Consulter, FriseAuteur, LigneTech, TitreSection,
} from '@/app/components/ModaleAuteur'
import type { RangChrono } from '@/app/lib/frise'
import { libelleTrad, formaterEditeur } from './PageTitre'
import { rendreTexteEnrichi } from './texteEnrichi'
import { intituleEdition, libelleVersionComplet } from './versionTextuelle'
import type { Props, VersionTextuelle } from './oeuvreTypes'
import { verrouillerLeDefilement } from '@/app/lib/verrouDefilement'

const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

// ⛔ `Z_MODALE`, ET NON LE RANG DES FENÊTRES DE PAGE. L'échelle le dit déjà en toutes
// lettres : une modale « couvre le tiroir d'où elle s'ouvre, et à Z_FENETRE elle s'y
// cacherait ». Sur un téléphone, tout ce qui ouvre cette fenêtre vit DANS le tiroir du
// volet (Z_TIROIR, 2401) : à 1200 elle s'ouvrait derrière le sommaire qui venait de la
// demander. Relevé de l'auteur, 2026-09-09, sur la fiche d'édition ; les quatre autres
// fenêtres de la page portaient le même défaut, trouvées en corrigeant celle-là.
// ⚠️ La fiche d'AUTEUR, qu'on ouvre depuis celle-ci en cliquant un nom, porte le MÊME
// rang et passe par-dessus par l'ordre du document, qui suffit : la seconde est portée
// plus tard. ⛔ Ne pas inventer un rang « au-dessus des modales ».
const Z_FICHE = Z_MODALE

/** Tout ce que la fiche a besoin de savoir. Les données lui arrivent chargées : la
 *  page de lecture les a déjà, et la fiche n'en redemande aucune au serveur, sauf la
 *  chronologie de l'auteur, qui n'appartient à la page à aucun autre titre. */
export type DonneesEdition = {
  oeuvre: Props['oeuvre']
  /** Titre de CATALOGUE. La composition du frontispice (`titre_affichage`) ne vaut
   *  que pour la page de titre ; partout ailleurs, c'est lui qui nomme l'œuvre. */
  titre: string
  auteurs: AuteurOeuvre[]
  /** Repli quand la liste des auteurs n'a pas été fournie : le nom composé, non cliquable. */
  auteurNom: string
  versionActive: VersionTextuelle | null
  versions: VersionTextuelle[]
  /** Un texte en langue originale se lit-il en regard du français ? */
  aTexteOriginal: boolean
}

// ⛔ TOUTES LES NOTICES SE COMPOSENT DE LA MÊME FAÇON, en rangées « étiquette · valeur »
// (`LigneTech`). Elles employaient DEUX formes — la rangée côte à côte dans la colonne
// large, la rangée empilée (`RangeeEmpilee`) dans l'étroite — parce que 8,5 rem
// d'étiquette ne tiennent pas dans une colonne de trois cents pixels. Les notices
// occupant désormais la colonne LARGE, la seconde forme n'a plus d'objet ici, et la
// fiche cesse de se lire comme deux documents cousus.
//
// ⚠️ `RangeeEmpilee` demeure dans `ModaleAuteur` : la fiche de traduction s'en sert.

const STYLES_FICHE = `
  .fiche-edition-prose { font-family: ${SANS}; font-size: 0.75rem; line-height: 1.5; color: var(--cs-texte); text-align: justify; hyphens: auto; margin: 0; white-space: pre-line; }
  .fiche-edition-notices { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
  .fiche-edition-grille { display: flex; flex-direction: column; gap: 18px; }
  .fiche-edition-chrono { min-width: 0; }
  /* ⛔ EXACTEMENT LA GÉOMÉTRIE DES DEUX AUTRES FICHES : 1,35fr à gauche, 1fr à droite,
     filet au flanc de la colonne large, et la CHRONOLOGIE dans l'étroite, à DROITE. Ce
     qui devait changer était la LARGEUR — les notices ne tiennent pas dans trois cents
     pixels —, non le CÔTÉ de la frise, que rien dans la donnée ne commande et que la
     convention du site fixe (relevé de l'auteur, 2026-09-10 : « pourquoi la chronologie
     est à gauche alors que, partout ailleurs, elle est à droite ? »).
     ⚠️ L'ordre du DOCUMENT est celui de l'écran ET celui du téléphone : les notices
     d'abord. Aucun placement explicite, donc, et l'empilement mobile est le bon sans
     qu'on ait rien à défaire. */
  .fiche-edition-grille--deux { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 26px; align-items: start; }
  .fiche-edition-grille--deux > .fiche-edition-notices { border-right: 1px solid var(--cs-fond-doux); padding-right: 24px; }
  @media (max-width: 640px) {
    .fiche-edition-calque { padding: 14px 8px !important; }
    .fiche-edition-cadre { padding: 22px 15px 20px !important; border-radius: 8px !important; }
    /* ⚠️ L'alignement REVIENT À « stretch » : la règle de grille pose « start », qu'aucune
       des déclarations ci-dessous ne remplace et qui, en colonne de flex, aligne sur l'axe
       TRANSVERSAL — la frise s'y réduisait à son contenu (485 px pour 830 offerts), et son
       fer cessait de répondre à celui des notices. */
    .fiche-edition-grille--deux { display: flex !important; flex-direction: column; gap: 18px; align-items: stretch; }
    .fiche-edition-grille--deux > .fiche-edition-notices { border-right: none; padding-right: 0; }
    .fiche-edition-grille--deux > .fiche-edition-chrono { padding-top: 16px; border-top: 1px solid var(--cs-fond-doux); }
    /* Sur téléphone, 8,5 rem d'étiquette ne laissent plus rien à la valeur. */
    .fiche-edition-cadre .cs-fiche-cle { width: 6rem !important; }
  }
`

/** Millésime de l'édition en ligne, comme au colophon de la page de titre. ⛔ Pas la
 *  date au jour : `date_mise_en_ligne` a été estampillée en lot sur une partie du
 *  corpus, et une date précise y donnerait à croire à une précision qu'elle n'a pas. */
function anneeEnLigne(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const annee = new Date(valeur).getFullYear()
  return Number.isFinite(annee) ? String(annee) : null
}

/**
 * Le contenu de la fiche : un en-tête pleine mesure, puis toutes les notices dans la
 * colonne large et la chronologie dans l'étroite, à droite.
 */
export function ContenuFicheEdition({ donnees, chrono = [], onOuvrirAuteur }: {
  donnees: DonneesEdition
  /** La chronologie de l'AUTEUR, où l'œuvre lue se reconnaît (voir plus bas). */
  chrono?: RangChrono[]
  onOuvrirAuteur: (idAuteur: string) => void
}) {
  const { oeuvre, titre, auteurs, auteurNom, versionActive, versions, aTexteOriginal } = donnees

  // Repères de l'œuvre, sur une seule ligne d'étiquettes : c'est la place que la fiche
  // d'auteur donne aux dates, à la langue et aux traditions.
  const reperes = [
    libelleLangue(oeuvre.langue_originale),
    espacerIntervallesHistoriques(formaterDateHistorique(oeuvre.date_composition)),
  ].filter(Boolean).join(' · ')

  const traducteur = versionActive?.traducteurLabel ?? libelleTrad(oeuvre.trad_auteur)
  const sourceUrl = versionActive?.sourceUrl ?? oeuvre.url_source ?? null
  // ── CE QUI DISTINGUE DEUX ÉDITIONS D'UNE MÊME ŒUVRE ───────────────────────────
  // En lecture bilingue, les deux volets portent le même titre d'œuvre et la même ligne
  // de repères : sans ces trois rangées, le lecteur passait de l'un à l'autre sans voir
  // ce qui change. L'INTITULÉ propre de l'édition, sa LANGUE, et le savant qui a ÉTABLI
  // le texte quand il n'est pas traduit.
  const intitule = intituleEdition(versionActive, titre)
  // ⚠️ La langue ne se dit que si les éditions n'ont PAS toutes la même : sur deux
  // traductions françaises (Boèce), la rangée répéterait « Français » de part et d'autre.
  const languesDistinctes = new Set(versions.map(v => (v.langue ?? '').trim()).filter(Boolean))
  const langue = languesDistinctes.size > 1 ? libelleLangue(versionActive?.langue) : ''
  const responsable = versionActive?.responsableEdition ?? null
  // ⚠️ `nb_signes` mesure le texte PAR DÉFAUT de l'œuvre. Sur une autre édition du
  // même texte, il dirait la longueur d'un texte qu'on ne lit pas : on se tait alors.
  const etendue = (!versionActive || versionActive.isDefault) && oeuvre.nb_signes
    ? `${oeuvre.nb_signes.toLocaleString('fr-FR')} signes` : null
  const autresVersions = versions.filter(v => v.idTexte !== versionActive?.idTexte)
  const enLigne = anneeEnLigne(oeuvre.date_mise_en_ligne)

  const aEdition = !!(intitule || langue || traducteur || responsable || versionActive?.editionDescription
    || oeuvre.editeur || oeuvre.ville || oeuvre.date_publication || oeuvre.collection || sourceUrl)
  // Les deux notes éditoriales parlent de l'ŒUVRE, non de l'édition : elles suivent
  // donc la notice de l'édition, sous leur propre titre. La substance d'abord, les
  // points de détail ensuite.
  const noteComplete = oeuvre.note_editoriale_complete?.trim() || null
  const noteComplement = oeuvre.note_editoriale_complement?.trim() || null
  // ⛔ Ce que CETTE édition déclare : ses manuscrits, ses sigles, ses abréviations.
  //    Elle vit sur le TEXTE, non sur l’œuvre — voir `informationsComplementaires`.
  const informations = versionActive?.informationsComplementaires?.trim() || null
  const commentaire = oeuvre.commentaire_traduction?.trim() || null
  const aOeuvre = !!(oeuvre.titre_original || (oeuvre.genres && oeuvre.genres.length) || noteComplete)
  const aSite = !!(enLigne || etendue || autresVersions.length || aTexteOriginal)
  const aNotices = aEdition || commentaire || informations || aOeuvre || noteComplement || aSite
  const aChrono = chrono.length > 0
  const aColonnes = aChrono && aNotices

  const notices = (
    <div className="fiche-edition-notices">
      {aEdition && (
        <section>
          <TitreSection>Édition de référence</TitreSection>
          {/* ⛔ Pas de dépli ici, à la différence de la fiche de traduction : ces
              rangées SONT le sujet d'une fiche qui s'appelle « À propos de cette
              édition », et l'on ne range pas derrière une flèche ce qu'on est venu
              chercher. */}
          <LigneTech c="Intitulé">
            {intitule ? <span style={{ fontStyle: 'italic' }}>{intitule}</span> : null}
          </LigneTech>
          <LigneTech c="Langue">{langue || null}</LigneTech>
          <LigneTech c="Traducteur">
            {traducteur ? `${traducteur}${oeuvre.trad_date ? ` (${formaterDateHistorique(oeuvre.trad_date)})` : ''}` : null}
          </LigneTech>
          {/* Le savant qui a établi le texte d'une édition critique : « Pius Knöll (éd.) ».
              Ce n'est pas un traducteur, et c'est ce que le volet latin ne disait pas. */}
          <LigneTech c="Texte établi par">{responsable}</LigneTech>
          <LigneTech c="Édition">{versionActive?.editionDescription}</LigneTech>
          {/* Éditeur, lieu et année sur trois lignes distinctes, comme dans la fiche
              de traduction : une ligne « Publication » les recollait en une chaîne
              où l'on ne savait plus lequel des trois manquait. */}
          <LigneTech c="Éditeur">{formaterEditeur(oeuvre.editeur) || null}</LigneTech>
          <LigneTech c="Lieu">{oeuvre.ville}</LigneTech>
          <LigneTech c="Année">{formaterDateHistorique(oeuvre.date_publication) || null}</LigneTech>
          <LigneTech c="Collection">{oeuvre.collection}</LigneTech>
          <LigneTech c="Source"><Consulter url={sourceUrl} libelle="Consulter la source" /></LigneTech>
        </section>
      )}

      {/* Commentaire public de l'édition : la même prose qu'au frontispice, à sa
          place ici, sous les rangées qu'elle explique. */}
      {commentaire && (
        <section>
          <TitreSection>Cette édition</TitreSection>
          <p className="fiche-edition-prose">{sansPointFinal(commentaire)}</p>
        </section>
      )}

      {/* ⛔ CE QUE L’ÉDITION DÉCLARE POUR QU’ON LA LISE — ses manuscrits et leurs sigles,
          ses abréviations, ses conventions de transcription. Elle suit « Cette édition »,
          dont elle est le détail, et précède « L’œuvre », qui change de sujet.
          ⚠️ Elle ne paraît QUE remplie : une rubrique vide promettrait un appareil que
          l’édition n’a pas déclaré. */}
      {informations && (
        <section>
          <TitreSection>Informations complémentaires</TitreSection>
          <div className="fiche-edition-prose">{rendreTexteEnrichi(informations)}</div>
        </section>
      )}

      {aOeuvre && (
        <section>
          <TitreSection>L’œuvre</TitreSection>
          <LigneTech c="Titre original">
            {oeuvre.titre_original ? <span style={{ fontStyle: 'italic' }}>{oeuvre.titre_original}</span> : null}
          </LigneTech>
          <LigneTech c={`Genre${(oeuvre.genres?.length ?? 0) > 1 ? 's' : ''}`}>
            {oeuvre.genres?.length ? oeuvre.genres.join(', ') : null}
          </LigneTech>
          {/* Ce que l'œuvre EST : son intérêt, sa substance (note_editoriale_complete). */}
          {noteComplete && (
            <div className="fiche-edition-prose" style={{ marginTop: '8px' }}>{rendreTexteEnrichi(noteComplete)}</div>
          )}
        </section>
      )}

      {/* Les points de détail de l'œuvre parcourue (note_editoriale_complement) : un
          chapitre déplacé ou refondu, une attribution discutée, une transmission
          lacunaire. Rubrique à part : on la cherche quand quelque chose étonne. */}
      {noteComplement && (
        <section>
          <TitreSection>Notes éditoriales</TitreSection>
          <div className="fiche-edition-prose">{rendreTexteEnrichi(noteComplement)}</div>
        </section>
      )}

      {aSite && (
        <section>
          <TitreSection>Sur ce site</TitreSection>
          <LigneTech c="Édition en ligne">{enLigne}</LigneTech>
          <LigneTech c="Étendue">{etendue}</LigneTech>
          <LigneTech c="Lecture">{aTexteOriginal ? 'Texte original en regard' : null}</LigneTech>
          {/* Les autres éditions du même texte se choisissent dans le volet de lecture ;
              la fiche dit seulement qu'elles existent, et lesquelles. */}
          <LigneTech c={`Autre${autresVersions.length > 1 ? 's' : ''} édition${autresVersions.length > 1 ? 's' : ''}`}>
            {autresVersions.length ? autresVersions.map(v => (
              <span key={v.idTexte} style={{ display: 'block' }}>{libelleVersionComplet(v)}</span>
            )) : null}
          </LigneTech>
        </section>
      )}
    </div>
  )

  return (
    <>
      {/* En-tête pleine mesure : le titre de l'œuvre, son sous-titre, ses auteurs et la
          ligne de repères. ⛔ Aucun portrait : le sujet de cette fiche est un LIVRE. */}
      <header style={{ minWidth: 0, marginBottom: '16px' }}>
        <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cs-vert)', margin: '0 0 5px', textTransform: 'uppercase' }}>À propos de cette édition</p>
        <h2 id="fiche-edition-titre" style={{ fontFamily: SERIF, fontSize: '1.4375rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.12 }}>
          {rendreTexteEnrichi(titre)}
        </h2>
        {oeuvre.sous_titre && (
          <p style={{ fontFamily: SERIF, fontSize: '0.78125rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', margin: '2px 0 0', lineHeight: 1.3 }}>
            {rendreTexteEnrichi(oeuvre.sous_titre)}
          </p>
        )}
        {/* Chaque auteur ouvre sa fiche ; une œuvre signée à deux les donne tous. */}
        <p style={{ fontFamily: SERIF, fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: '4px 0 0', lineHeight: 1.3 }}>
          {auteurs.length > 0 ? auteurs.map((a, i) => (
            <Fragment key={a.id_auteur}>
              {i > 0 && <span>{separateurAuteurs(i, auteurs.length)}</span>}
              <button onClick={() => onOuvrirAuteur(a.id_auteur)} title="Voir la fiche de l’auteur"
                style={{ font: 'inherit', color: 'var(--cs-vert)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', textUnderlineOffset: '2px' }}
                onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'currentcolor')}
                onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}>{a.nom}</button>
            </Fragment>
          )) : auteurNom}
        </p>
        {reperes && (
          <p style={{ fontFamily: SANS, fontSize: '0.59375rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '8px 0 0', lineHeight: 1.4 }}>
            {rendreSiecles(reperes)}
          </p>
        )}
      </header>

      {/* ── LES NOTICES, puis LA CHRONOLOGIE dans la colonne étroite ───────────────
          La frise est celle de l'AUTEUR, et il n'y en a pas d'autre : douze événements
          sur 1 346 nomment une œuvre, un par œuvre, et une frise d'un point n'est pas
          une frise. Mais la question qu'on pose à cette fenêtre — « où ce livre
          tombe-t-il ? » — se répond précisément là : la ligne qui nomme l'œuvre lue s'y
          détache, entre la naissance et la mort de celui qui l'a écrite.
          ⚠️ Elle ne paraît pas quand l'auteur n'en a pas ; les notices prennent alors
          toute la mesure plutôt que de laisser une colonne vide à côté d'elles. */}
      <div className={`fiche-edition-grille${aColonnes ? ' fiche-edition-grille--deux' : ''}`}>
        {notices}
        {aChrono && (
          <div className="fiche-edition-chrono">
            <TitreSection>Chronologie</TitreSection>
            <FriseAuteur evenements={chrono} oeuvreEnRelief={oeuvre.id_oeuvre} />
          </div>
        )}
      </div>

      <style>{STYLES_FICHE}</style>
    </>
  )
}

/**
 * UN VOLET de la fiche : une édition, et le nom qu'elle prend dans la barre.
 *
 * ⛔ La fiche en reçoit une LISTE, et non une édition (demande de l'auteur,
 * 2026-09-08 : « quand on est en mode Latin & Français, afficher les deux œuvres dans
 * deux onglets différents »). En lecture bilingue, DEUX éditions sont à l'écran — la
 * traduction et l'original —, et la fiche n'en montrait qu'une : celle qu'on lisait
 * « principalement », c'est-à-dire un choix que le lecteur n'a pas fait. Il pouvait
 * lire le latin de Knöll pendant que la fiche lui parlait de la traduction de Moreau,
 * sans qu'un mot le lui dise.
 *
 * ⚠️ Un seul volet ne pose AUCUNE barre : une barre d'un onglet annonce un choix
 * qu'elle n'offre pas. C'est la règle du site, celle qui a déjà emporté le sommaire
 * sans matière à sommer et la rubrique « Du même auteur » à une seule œuvre.
 */
export type VoletFiche = { cle: string; libelle: string; donnees: DonneesEdition }

export default function FicheEdition({ volets, onOuvrirAuteur, onFermer }: {
  volets: readonly VoletFiche[]
  onOuvrirAuteur: (idAuteur: string) => void
  onFermer: () => void
}) {
  const [chrono, setChrono] = useState<RangChrono[]>([])
  const [voletActif, setVoletActif] = useState(volets[0]?.cle ?? '')
  const volet = volets.find(v => v.cle === voletActif) ?? volets[0]
  const donnees = volet?.donnees
  // ⚠️ La FRISE est celle de l'AUTEUR, non de l'édition : elle ne change pas d'un
  // onglet à l'autre, et se charge donc une fois pour la fiche.
  // ⛔ La lecture de `photo_position` est partie avec le portrait : c'était le seul
  // renseignement que la page de lecture n'avait pas, et plus rien ne le demande.
  const idAuteurChrono = volets[0]?.donnees.auteurs[0]?.id_auteur ?? null

  // La chronologie de l'auteur, dans laquelle l'œuvre lue se reconnaît.
  // ⛔ La VUE, jamais `evenements` ni `auteurs_evenements` : elle porte déjà l'ordre
  //    éditorial, la date rédigée, le type d'affichage et les sources (charte § 26).
  // ⚠️ `v_chronologie_auteurs_DATES`, comme la fiche d'auteur : c'est elle qui porte
  //    la date courte, dont la colonne des dates de la frise dépend.
  useEffect(() => {
    if (!idAuteurChrono) return
    let annule = false
    supabase.from('v_chronologie_auteurs_dates').select('*')
      .eq('auteur_id', idAuteurChrono).order('ordre_affichage')
      .then(({ data, error }) => {
        // Une frise absente n'empêche pas de lire la fiche : on la journalise et l'on
        // se tait, plutôt que de fermer une fenêtre pour un ornement.
        if (error) { console.error('[fiche œuvre] chronologie illisible', error); return }
        if (!annule) setChrono((data ?? []) as RangChrono[])
      })
    return () => { annule = true }
  }, [idAuteurChrono])

  // Échap ferme ; le défilement de fond est gelé tant que la fenêtre est ouverte.
  // ⚠️ C'est le CONTENU de la boîte qui défile, jamais le calque : sur un écran court,
  // une boîte qui remonte se fait couper au ras de la barre de navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    const relacher = verrouillerLeDefilement()
    return () => { document.removeEventListener('keydown', onKey); relacher() }
  }, [onFermer])

  if (typeof document === 'undefined' || !donnees) return null

  return createPortal(
    /* ⛔ Le calque part de HAUTEUR_NAVBAR, jamais d'un nombre de pixels : la barre
       mesure 56 px à la racine 16 et 77 à la racine 22, si bien qu'un `top: 48` faisait
       remonter le voile DERRIÈRE elle sur un grand écran (charte, § Responsive). */
    <div onClick={onFermer} className="fiche-edition-calque"
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'var(--cs-calque-modale)', zIndex: Z_FICHE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflow: 'hidden' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="fiche-edition-titre" onClick={e => e.stopPropagation()} className="fiche-edition-cadre"
        style={{ position: 'relative', width: '100%', maxWidth: '52rem', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--cs-fond)', borderRadius: '12px', border: '1px solid var(--cs-bord-clair)', boxShadow: 'var(--cs-ombre-modale)', padding: '30px 34px 28px' }}>
        <button onClick={onFermer} aria-label="Fermer" className="cs-cible-fine" title="Fermer"
          style={{ position: 'sticky', float: 'right', top: '0', marginRight: '-6px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        {/* ⛔ LA BARRE D'ONGLETS DU SITE, jamais une barre recomposée en styles en ligne :
            c'est ainsi que six barres en étaient venues à six dessins (voir
            `OngletsPage`). Elle prend la mesure de ce qu'elle commande — la fiche —, et
            se pose au-dessus d'elle avec un blanc, non collée à son titre. */}
        {volets.length > 1 && (
          <OngletsPage
            intitule="Édition à consulter"
            onglets={volets.map(v => ({ cle: v.cle, libelle: v.libelle }))}
            actif={volet.cle}
            choisir={setVoletActif}
            style={{ maxWidth: '22rem', marginBottom: '20px' }}
          />
        )}
        <ContenuFicheEdition donnees={donnees} chrono={chrono} onOuvrirAuteur={onOuvrirAuteur} />
      </div>
    </div>,
    document.body,
  )
}
