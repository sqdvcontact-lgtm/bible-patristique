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
// ⛔ les données documentaires restent brèves, sous la forme « libellé : valeur ».
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

import BoutonCopierTexte from '@/app/components/BoutonCopierTexte'
import {
  Consulter, CorpsFiche, EnTeteFiche, ListeOuvragesCites, ModaleFiche, SectionFiche,
} from '@/app/components/FicheModele'
import { FriseAuteur } from '@/app/components/ModaleAuteur'
import NotationEdition from '@/app/components/NotationEdition'
import OngletsPage from '@/app/components/OngletsPage'
import { joindreLieux } from '@/app/lib/adresseEdition'
import { separateurAuteurs, type AuteurOeuvre } from '@/app/lib/auteursOeuvre'
import { FragmentReference } from '@/app/components/ReferenceBibliographique'
import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
import { fragmentsReferenceCanoniqueOeuvre, referenceCanoniqueOeuvre } from '@/app/lib/citation'
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

/** Une donnée documentaire sous la forme la plus courte : « libellé : valeur ». Chaque
 * ligne garde sa propre mesure, de sorte que « Français » ne s'éloigne pas de « Langue »
 * parce qu'une autre ligne porte « Texte établi par ». */
function ChampEdition({ libelle, italique = false, children }: {
  libelle: string
  italique?: boolean
  children: React.ReactNode
}) {
  if (children === null || children === undefined || children === '') return null
  return (
    <div className="cs-fiche-edition-champ">
      <dt>{libelle} :</dt>
      <dd style={{ fontStyle: italique ? 'italic' : undefined }}>{children}</dd>
    </div>
  )
}

/** La rangée dit déjà « Traduction : ». Le libellé de frontispice peut donc y perdre
 * son amorce (« Traduction par », « Traduction de », « Traduction : ») et ne garder que
 * l'information qui répond au libellé. */
function valeurTraduction(libelle: string | null | undefined): string {
  return (libelle ?? '').replace(/^Traduction\s*(?::|par\s+|de\s+)/iu, '').trim()
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
  const { oeuvre, titre, auteurs, auteurNom, versionActive, versions } = donnees

  const langueOriginale = libelleLangue(oeuvre.langue_originale)
  const dateComposition = espacerIntervallesHistoriques(formaterDateHistorique(oeuvre.date_composition))

  const traduction = valeurTraduction(versionActive?.traducteurLabel ?? libelleTrad(oeuvre.trad_auteur))
  const sourceUrl = versionActive?.sourceUrl ?? oeuvre.url_source ?? null
  // ── CE QUI DISTINGUE DEUX ÉDITIONS D'UNE MÊME ŒUVRE ───────────────────────────
  // En lecture bilingue, les deux volets portent le même titre d'œuvre : la LANGUE et le
  // savant qui a ÉTABLI le texte quand il n'est pas traduit disent ce qui change.
  // ⛔ PAS D'« INTITULÉ » (décision de l'auteur, 2026-09-20 : « Intitulé n'existe pas.
  //    On a un titre, et c'est tout »). Le titre de l'édition, quand il diffère de celui
  //    du catalogue, appartient à la barre d'onglets et au menu des éditions.
  // ⚠️ La langue ne se dit que si les éditions n'ont PAS toutes la même.
  const languesDistinctes = new Set(versions.map(v => (v.langue ?? '').trim()).filter(Boolean))
  const langue = languesDistinctes.size > 1 ? libelleLangue(versionActive?.langue) : ''
  const responsable = versionActive?.responsableEdition ?? null
  const aEdition = !!(langue || traduction || responsable || versionActive?.editionDescription
    || oeuvre.editeur || oeuvre.ville || oeuvre.date_publication || oeuvre.collection || sourceUrl)
  // Les deux notes éditoriales parlent de l'ŒUVRE, non de l'édition : elles suivent
  // donc la notice de l'édition, sous leur propre titre.
  const noteComplete = oeuvre.note_editoriale_complete?.trim() || null
  const noteComplement = oeuvre.note_editoriale_complement?.trim() || null
  const bibliographieSelective = oeuvre.bibliographie_selective?.trim() || null
  // ⛔ Ce que CETTE édition déclare : ses manuscrits, ses sigles, ses abréviations.
  //    Elle vit sur le TEXTE, non sur l’œuvre — voir `informationsComplementaires`.
  const informations = versionActive?.informationsComplementaires?.trim() || null
  const commentaire = oeuvre.commentaire_traduction?.trim() || null
  const aChrono = chrono.length > 0
  // ⛔ UNE SEULE ÉCRITURE POUR L'ÉCRAN ET POUR LE PRESSE-PAPIERS : les fragments du
  //    moteur bibliographique (charte § 47.5) se BALISENT à l'écran — d'où le titre en
  //    italiques que l'auteur demande — et se joignent en plein-texte pour la copie.
  //    Deux compositions divergeraient au premier réglage.
  const infoCitation = {
    auteur: auteurNom,
    titre,
    sousTitre: oeuvre.sous_titre,
    tradAuteur: oeuvre.trad_auteur,
    editeur: oeuvre.editeur,
    collection: oeuvre.collection,
    ville: oeuvre.ville,
    datePublication: oeuvre.date_publication,
    responsable,
  }
  const fragmentsCitation = fragmentsReferenceCanoniqueOeuvre(infoCitation)
  const referenceCanonique = referenceCanoniqueOeuvre(infoCitation)

  // Chaque auteur ouvre sa fiche ; une œuvre signée à deux les donne tous.
  const auteursLigne = auteurs.length > 0 ? auteurs.map((a, i) => (
    <Fragment key={a.id_auteur}>
      {i > 0 && <span>{separateurAuteurs(i, auteurs.length)}</span>}
      <button type="button" onClick={() => onOuvrirAuteur(a.id_auteur)} title="Voir la fiche de l’auteur"
        className="cs-fiche-lien">{a.nom}</button>
    </Fragment>
  )) : (auteurNom || null)

  return (
    <div className="cs-fiche-edition">
      <CorpsFiche
        entete={
          <div className="cs-fiche-edition-tete">
            {/* ⛔ AUCUN SURTITRE (décision de l'auteur, 2026-09-20) : la fenêtre s'appelle
                déjà « À propos de cette édition » — son nom accessible le dit —, et
                l'écrire au-dessus du titre de l'œuvre ne l'apprenait à personne. */}
            <EnTeteFiche titre={rendreTexteEnrichi(titre)} titreId={titreId}
              sousTitre={oeuvre.sous_titre ? rendreTexteEnrichi(oeuvre.sous_titre) : null}
              ligne={auteursLigne} />
            {(oeuvre.titre_original || oeuvre.genres?.length || langueOriginale || dateComposition) ? (
              <dl className="cs-fiche-edition-identite" aria-label="Repères sur l’œuvre">
                <ChampEdition libelle="Titre original" italique>{oeuvre.titre_original}</ChampEdition>
                <ChampEdition libelle={`Genre${(oeuvre.genres?.length ?? 0) > 1 ? 's' : ''}`}>
                  {oeuvre.genres?.length ? oeuvre.genres.join(', ') : null}
                </ChampEdition>
                <ChampEdition libelle="Langue originale">{langueOriginale}</ChampEdition>
                <ChampEdition libelle="Composition">{dateComposition ? rendreSiecles(dateComposition) : null}</ChampEdition>
              </dl>
            ) : null}
          </div>
        }
      /* ── LA CHRONOLOGIE, dans la colonne étroite ── Elle est celle de l'AUTEUR, et il
         n'y en a pas d'autre : douze événements sur 1 346 nomment une œuvre, un par
         œuvre. La question qu'on pose à cette fenêtre — « où ce livre tombe-t-il ? » —
         se répond là : la ligne qui nomme l'œuvre lue s'y détache. */
        complement={aChrono ? (
          <SectionFiche titre="Chronologie"><FriseAuteur evenements={chrono} oeuvreEnRelief={oeuvre.id_oeuvre} /></SectionFiche>
        ) : null}
      >
        {aEdition && (
          <SectionFiche titre="Édition de référence">
            {/* ⛔ Pas de dépli : ces rangées SONT le sujet d'une fiche qui s'appelle « À
                propos de cette édition ». */}
            <dl className="cs-fiche-edition-champs">
              <ChampEdition libelle="Langue">{langue || null}</ChampEdition>
              <ChampEdition libelle="Traduction">
                {traduction ? `${traduction}${oeuvre.trad_date ? ` (${formaterDateHistorique(oeuvre.trad_date)})` : ''}` : null}
              </ChampEdition>
              {/* Le savant qui a établi le texte d'une édition critique : « Pius Knöll (éd.) ». */}
              <ChampEdition libelle="Texte établi par">{responsable}</ChampEdition>
              <ChampEdition libelle="Édition">{versionActive?.editionDescription}</ChampEdition>
              <ChampEdition libelle="Éditeur">{formaterEditeur(oeuvre.editeur) || null}</ChampEdition>
              <ChampEdition libelle="Lieu">{joindreLieux(oeuvre.ville)}</ChampEdition>
              <ChampEdition libelle="Année">{formaterDateHistorique(oeuvre.date_publication) || null}</ChampEdition>
              <ChampEdition libelle="Collection">{oeuvre.collection}</ChampEdition>
              <ChampEdition libelle="Source"><Consulter url={sourceUrl} libelle="Consulter la source" /></ChampEdition>
            </dl>
          </SectionFiche>
        )}

        {/* ⚠️ LE GESTE SE POSE CONTRE LE TITRE, et il n'est plus qu'un pictogramme : un
            bouton encadré portant le mot « Copier » faisait, au bout de la référence, un
            second objet là où l'on n'attend qu'une marque. */}
        <SectionFiche titre="Pour citer cette œuvre" className="cs-fiche-edition-citation"
          action={<BoutonCopierTexte texte={referenceCanonique} titre="Copier la référence"
            className="cs-fiche-copier cs-cible-fine" />}>
          <p className="cs-fiche-edition-citation-texte">
            <span className={CLASSES_BIBLIOGRAPHIE.reference}>
              {fragmentsCitation.map((fragment, rang) => (
                <FragmentReference key={rang} segment={fragment} />
              ))}
            </span>
          </p>
        </SectionFiche>

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
            <NotationEdition texte={informations} resserre />
          </SectionFiche>
        )}

        {noteComplete && (
          <SectionFiche titre="Présentation">
            <NotationEdition texte={noteComplete} resserre />
          </SectionFiche>
        )}

      {/* Les points de détail de l'œuvre parcourue (note_editoriale_complement). */}
         {noteComplement && (
          <SectionFiche titre="Notes éditoriales">
            {/* ⚠️ La NOTATION du § 5.6.1, comme les informations complémentaires : une note
                éditoriale porte souvent sa bibliographie (« + » par référence). Sans marque,
                elle se rend en prose, exactement comme avant. */}
            <NotationEdition texte={noteComplement} resserre />
           </SectionFiche>
         )}

        {/* Bibliographie propre à l'œuvre : une section sœur des notes éditoriales. */}
        {bibliographieSelective && (
          <SectionFiche titre="Bibliographie sélective">
            <NotationEdition texte={bibliographieSelective} resserre />
          </SectionFiche>
        )}
        {/* —— LES OUVRAGES QUE L’ÉDITION CITE —— Une SECTION, comme la bibliographie
            sélective au-dessus (demande de l’auteur, 2026-09-20 : « la même mise en forme de
            style pour Bibliographie sélective et Ouvrages cités dans cette édition »). Elle
            fermait la fiche en rubrique, sous les deux colonnes et précédée d’un filet : deux
            listes d’ouvrages qui se suivent ne peuvent pas se composer de deux façons. */}
        {ouvragesCites && ouvragesCites.length > 0 && (
          <SectionFiche titre="Ouvrages cités dans cette édition">
            <ListeOuvragesCites notices={ouvragesCites} />
          </SectionFiche>
        )}
      </CorpsFiche>
    </div>
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
      /* ⚠️ UN CLIC DEHORS DEMANDE CONFIRMATION (décision de l'auteur, 2026-09-20). Une
         fiche d'édition s'ouvre au milieu d'une lecture, et sa mesure laisse beaucoup de
         calque autour d'elle : on la refermait d'un geste qu'on n'avait pas voulu. ⛔ La
         croix et Échap, eux, restent immédiats : ce sont des gestes qui NOMMENT la
         fermeture. */
      confirmerFermeture
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
