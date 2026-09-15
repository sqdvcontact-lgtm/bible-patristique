'use client'

// ── Fiche « À propos de cette édition » ────────────────────────────────────────
//
// La fenêtre s'ouvre depuis le volet de lecture d'une œuvre patristique. Elle prend le
// MODÈLE COMMUN des fiches (`app/components/FicheModele`, charte § 38.33) : cadre,
// en-tête, corps à deux colonnes, sections, rubriques.
//
// Ce que les relevés de l'auteur ont fixé, et qui tient toujours (charte § 38.25) :
// ⛔ toutes les notices tiennent la colonne LARGE, et la CHRONOLOGIE de l'auteur est
//    seule à droite, dans l'étroite — la convention des trois fiches ;
// ⛔ aucun portrait : le sujet de cette fiche est un LIVRE, et le nom de l'auteur ouvre
//    sa propre fiche, où le portrait est chez lui ;
// ⛔ une seule forme de rangée (`LigneTech`).
//
// ⚠️ Elle porte aussi les OUVRAGES CITÉS dans l'édition (demande de l'auteur, 2026-09-15 :
// « Fenêtre “En savoir plus sur cette œuvre” : ajouter les ouvrages cités dans
// l'œuvre »), lus dans les notes et l'apparat du TEXTE de chaque volet
// (`chargerOuvragesCitesDuTexte`), et repliés au-delà de dix.
//
// ⚠️ Le CONTENU est séparé de la fenêtre (`ContenuFicheEdition`) : `createPortal`
// n'existe pas au rendu serveur, et une planche de contrôle hors session ne pourrait
// pas rendre la fiche autrement.

import { Fragment, useEffect, useId, useRef, useState } from 'react'

import {
  Consulter, CorpsFiche, EnTeteFiche, LigneTech, ListeOuvragesCites, ModaleFiche, RubriqueFiche, SectionFiche,
} from '@/app/components/FicheModele'
import { FriseAuteur } from '@/app/components/ModaleAuteur'
import NotationEdition from '@/app/components/NotationEdition'
import OngletsPage from '@/app/components/OngletsPage'
import { joindreLieux } from '@/app/lib/adresseEdition'
import { separateurAuteurs, type AuteurOeuvre } from '@/app/lib/auteursOeuvre'
import { espacerIntervallesHistoriques, formaterDateHistorique } from '@/app/lib/datesHistoriques'
import type { RangChrono } from '@/app/lib/frise'
import { libelleLangue } from '@/app/lib/langues'
import { chargerOuvragesCitesDuTexte } from '@/app/lib/ouvragesCitesChargement'
import type { NoticeBibliographique } from '@/app/lib/referenceBibliographique'
import { rendreSiecles } from '@/app/lib/siecles'
import { supabase } from '@/app/lib/supabase'
import { sansPointFinal } from '@/app/lib/titres'
import { libelleTrad, formaterEditeur } from './PageTitre'
import { rendreTexteEnrichi } from './texteEnrichi'
import { intituleEdition, libelleVersionComplet } from './versionTextuelle'
import type { Props, VersionTextuelle } from './oeuvreTypes'

/** Tout ce que la fiche a besoin de savoir. Les données lui arrivent chargées : la
 *  page de lecture les a déjà, et la fiche ne redemande au serveur que la chronologie
 *  de l'auteur et les ouvrages cités, qui n'appartiennent à la page à aucun autre titre. */
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

/** Millésime de l'édition en ligne, comme au colophon de la page de titre. ⛔ Pas la
 *  date au jour : `date_mise_en_ligne` a été estampillée en lot sur une partie du
 *  corpus, et une date précise y donnerait à croire à une précision qu'elle n'a pas. */
function anneeEnLigne(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const annee = new Date(valeur).getFullYear()
  return Number.isFinite(annee) ? String(annee) : null
}

/**
 * Le contenu de la fiche : l'en-tête et toutes les notices dans la colonne large, la
 * chronologie dans l'étroite, les ouvrages cités en rubrique de clôture.
 */
export function ContenuFicheEdition({ donnees, chrono = [], onOuvrirAuteur, ouvragesCites = null, titreId }: {
  donnees: DonneesEdition
  /** La chronologie de l'AUTEUR, où l'œuvre lue se reconnaît (voir plus bas). */
  chrono?: RangChrono[]
  onOuvrirAuteur: (idAuteur: string) => void
  /** Les ouvrages cités par CETTE édition ; `null` tant qu'ils ne sont pas lus. */
  ouvragesCites?: readonly NoticeBibliographique[] | null
  titreId?: string
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
  // de repères : l'INTITULÉ propre de l'édition, sa LANGUE, et le savant qui a ÉTABLI
  // le texte quand il n'est pas traduit, disent ce qui change.
  const intitule = intituleEdition(versionActive, titre)
  // ⚠️ La langue ne se dit que si les éditions n'ont PAS toutes la même.
  const languesDistinctes = new Set(versions.map(v => (v.langue ?? '').trim()).filter(Boolean))
  const langue = languesDistinctes.size > 1 ? libelleLangue(versionActive?.langue) : ''
  const responsable = versionActive?.responsableEdition ?? null
  // ⚠️ `nb_signes` mesure le texte PAR DÉFAUT de l'œuvre : sur une autre édition du
  // même texte, il dirait la longueur d'un texte qu'on ne lit pas.
  const etendue = (!versionActive || versionActive.isDefault) && oeuvre.nb_signes
    ? `${oeuvre.nb_signes.toLocaleString('fr-FR')} signes` : null
  const autresVersions = versions.filter(v => v.idTexte !== versionActive?.idTexte)
  const enLigne = anneeEnLigne(oeuvre.date_mise_en_ligne)

  const aEdition = !!(intitule || langue || traducteur || responsable || versionActive?.editionDescription
    || oeuvre.editeur || oeuvre.ville || oeuvre.date_publication || oeuvre.collection || sourceUrl)
  // Les deux notes éditoriales parlent de l'ŒUVRE, non de l'édition : elles suivent
  // donc la notice de l'édition, sous leur propre titre.
  const noteComplete = oeuvre.note_editoriale_complete?.trim() || null
  const noteComplement = oeuvre.note_editoriale_complement?.trim() || null
  // ⛔ Ce que CETTE édition déclare : ses manuscrits, ses sigles, ses abréviations.
  //    Elle vit sur le TEXTE, non sur l’œuvre — voir `informationsComplementaires`.
  const informations = versionActive?.informationsComplementaires?.trim() || null
  const commentaire = oeuvre.commentaire_traduction?.trim() || null
  const aOeuvre = !!(oeuvre.titre_original || (oeuvre.genres && oeuvre.genres.length) || noteComplete)
  const aSite = !!(enLigne || etendue || autresVersions.length || aTexteOriginal)
  const aChrono = chrono.length > 0

  // Chaque auteur ouvre sa fiche ; une œuvre signée à deux les donne tous.
  const auteursLigne = auteurs.length > 0 ? auteurs.map((a, i) => (
    <Fragment key={a.id_auteur}>
      {i > 0 && <span>{separateurAuteurs(i, auteurs.length)}</span>}
      <button type="button" onClick={() => onOuvrirAuteur(a.id_auteur)} title="Voir la fiche de l’auteur"
        className="cs-fiche-lien">{a.nom}</button>
    </Fragment>
  )) : (auteurNom || null)

  return (
    <CorpsFiche
      entete={
        <EnTeteFiche surtitre="À propos de cette édition" titre={rendreTexteEnrichi(titre)} titreId={titreId}
          sousTitre={oeuvre.sous_titre ? rendreTexteEnrichi(oeuvre.sous_titre) : null}
          ligne={auteursLigne} reperes={reperes ? rendreSiecles(reperes) : null} />
      }
      /* ── LA CHRONOLOGIE, dans la colonne étroite ── Elle est celle de l'AUTEUR, et il
         n'y en a pas d'autre : douze événements sur 1 346 nomment une œuvre, un par
         œuvre. La question qu'on pose à cette fenêtre — « où ce livre tombe-t-il ? » —
         se répond là : la ligne qui nomme l'œuvre lue s'y détache. */
      complement={aChrono ? (
        <SectionFiche titre="Chronologie"><FriseAuteur evenements={chrono} oeuvreEnRelief={oeuvre.id_oeuvre} /></SectionFiche>
      ) : null}
      suite={ouvragesCites && ouvragesCites.length > 0 ? (
        <RubriqueFiche titre="Ouvrages cités dans cette édition">
          <ListeOuvragesCites notices={ouvragesCites} />
        </RubriqueFiche>
      ) : null}
    >
      {aEdition && (
        <SectionFiche titre="Édition de référence">
          {/* ⛔ Pas de dépli : ces rangées SONT le sujet d'une fiche qui s'appelle « À
              propos de cette édition ». */}
          <LigneTech c="Intitulé">
            {intitule ? <span style={{ fontStyle: 'italic' }}>{intitule}</span> : null}
          </LigneTech>
          <LigneTech c="Langue">{langue || null}</LigneTech>
          <LigneTech c="Traducteur">
            {traducteur ? `${traducteur}${oeuvre.trad_date ? ` (${formaterDateHistorique(oeuvre.trad_date)})` : ''}` : null}
          </LigneTech>
          {/* Le savant qui a établi le texte d'une édition critique : « Pius Knöll (éd.) ». */}
          <LigneTech c="Texte établi par">{responsable}</LigneTech>
          <LigneTech c="Édition">{versionActive?.editionDescription}</LigneTech>
          {/* Éditeur, lieu et année sur trois lignes distinctes : une ligne « Publication »
              les recollait en une chaîne où l'on ne savait plus lequel des trois manquait. */}
          <LigneTech c="Éditeur">{formaterEditeur(oeuvre.editeur) || null}</LigneTech>
          {/* Plusieurs lieux se joignent comme dans toute adresse du site (`joindreLieux`). */}
          <LigneTech c="Lieu">{joindreLieux(oeuvre.ville)}</LigneTech>
          <LigneTech c="Année">{formaterDateHistorique(oeuvre.date_publication) || null}</LigneTech>
          <LigneTech c="Collection">{oeuvre.collection}</LigneTech>
          <LigneTech c="Source"><Consulter url={sourceUrl} libelle="Consulter la source" /></LigneTech>
        </SectionFiche>
      )}

      {/* Commentaire public de l'édition : la même prose qu'au frontispice. */}
      {commentaire && (
        <SectionFiche titre="Cette édition">
          <p className="cs-notice-prose">{sansPointFinal(commentaire)}</p>
        </SectionFiche>
      )}

      {/* ⛔ CE QUE L’ÉDITION DÉCLARE POUR QU’ON LA LISE — manuscrits et sigles,
          abréviations, conventions de transcription (charte § 5.6.1). Elle ne paraît QUE
          remplie : une rubrique vide promettrait un appareil que l’édition n’a pas
          déclaré. */}
      {informations && (
        <SectionFiche titre="Informations complémentaires">
          <NotationEdition texte={informations} />
        </SectionFiche>
      )}

      {aOeuvre && (
        <SectionFiche titre="L’œuvre">
          <LigneTech c="Titre original">
            {oeuvre.titre_original ? <span style={{ fontStyle: 'italic' }}>{oeuvre.titre_original}</span> : null}
          </LigneTech>
          <LigneTech c={`Genre${(oeuvre.genres?.length ?? 0) > 1 ? 's' : ''}`}>
            {oeuvre.genres?.length ? oeuvre.genres.join(', ') : null}
          </LigneTech>
          {/* Ce que l'œuvre EST : son intérêt, sa substance (note_editoriale_complete). */}
          {noteComplete && (
            <div className="cs-notice-prose" style={{ marginTop: '8px' }}>{rendreTexteEnrichi(noteComplete)}</div>
          )}
        </SectionFiche>
      )}

      {/* Les points de détail de l'œuvre parcourue (note_editoriale_complement). */}
      {noteComplement && (
        <SectionFiche titre="Notes éditoriales">
          <div className="cs-notice-prose">{rendreTexteEnrichi(noteComplement)}</div>
        </SectionFiche>
      )}

      {aSite && (
        <SectionFiche titre="Sur ce site">
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
        </SectionFiche>
      )}
    </CorpsFiche>
  )
}

/**
 * UN VOLET de la fiche : une édition, et le nom qu'elle prend dans la barre.
 *
 * ⛔ La fiche en reçoit une LISTE, et non une édition (demande de l'auteur,
 * 2026-09-08 : « quand on est en mode Latin & Français, afficher les deux œuvres dans
 * deux onglets différents »). ⚠️ Un seul volet ne pose AUCUNE barre : une barre d'un
 * onglet annonce un choix qu'elle n'offre pas.
 */
export type VoletFiche = { cle: string; libelle: string; donnees: DonneesEdition }

export default function FicheEdition({ volets, onOuvrirAuteur, onFermer }: {
  volets: readonly VoletFiche[]
  onOuvrirAuteur: (idAuteur: string) => void
  onFermer: () => void
}) {
  const titreId = useId()
  const [chrono, setChrono] = useState<RangChrono[]>([])
  const [voletActif, setVoletActif] = useState(volets[0]?.cle ?? '')
  const [ouvragesParTexte, setOuvragesParTexte] = useState<Record<string, NoticeBibliographique[]>>({})
  // Les textes déjà demandés : on ne relit pas les ouvrages d'un volet qu'on rouvre.
  const demandesRef = useRef(new Set<string>())
  const volet = volets.find(v => v.cle === voletActif) ?? volets[0]
  const donnees = volet?.donnees
  // ⚠️ La FRISE est celle de l'AUTEUR, non de l'édition : elle ne change pas d'un onglet
  // à l'autre, et se charge donc une fois pour la fiche.
  const idAuteurChrono = volets[0]?.donnees.auteurs[0]?.id_auteur ?? null
  // ⚠️ Les OUVRAGES CITÉS, eux, appartiennent au TEXTE de chaque volet : les notes du
  // latin de Knöll ne sont pas celles de la traduction d'Arnauld d'Andilly.
  const idTexte = donnees?.versionActive?.idTexte ?? null

  // La chronologie de l'auteur, dans laquelle l'œuvre lue se reconnaît.
  // ⛔ La VUE, jamais `evenements` ni `auteurs_evenements` (charte § 26), et la vue en
  //    `_dates`, comme la fiche d'auteur : c'est elle qui porte la date courte.
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

  useEffect(() => {
    if (!idTexte || demandesRef.current.has(idTexte)) return
    demandesRef.current.add(idTexte)
    chargerOuvragesCitesDuTexte(supabase, idTexte)
      .then(notices => setOuvragesParTexte(prev => ({ ...prev, [idTexte]: notices })))
      .catch(erreur => {
        // Une rubrique absente n'empêche pas de lire la fiche ; la demande s'oublie, pour
        // qu'une réouverture la retente.
        demandesRef.current.delete(idTexte)
        console.error('[fiche œuvre] ouvrages cités illisibles', erreur)
      })
  }, [idTexte])

  if (!donnees) return null

  return (
    <ModaleFiche
      titreId={titreId}
      libelle="À propos de cette édition"
      onFermer={onFermer}
      /* ⛔ LA BARRE D'ONGLETS DU SITE, jamais une barre recomposée en styles en ligne
         (voir `OngletsPage`). Elle prend la mesure de ce qu'elle commande et se pose
         au-dessus de la fiche avec un blanc. */
      avantCorps={volets.length > 1 ? (
        <OngletsPage
          intitule="Édition à consulter"
          onglets={volets.map(v => ({ cle: v.cle, libelle: v.libelle }))}
          actif={volet.cle}
          choisir={setVoletActif}
          style={{ maxWidth: '22rem', marginBottom: '20px' }}
        />
      ) : null}
    >
      <ContenuFicheEdition donnees={donnees} chrono={chrono} onOuvrirAuteur={onOuvrirAuteur}
        ouvragesCites={idTexte ? ouvragesParTexte[idTexte] ?? null : null} titreId={titreId} />
    </ModaleFiche>
  )
}
