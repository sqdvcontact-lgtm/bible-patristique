'use client'

// ── Fiche « À propos de cette traduction » ─────────────────────────────────────
//
// La fenêtre s'ouvre depuis l'encart « Traduction » du volet de lecture de la Bible
// (`EncartTraduction`), et la page « Les traductions » rend le MÊME contenu dans ses
// cartes dépliées (`AllerPlusLoinClient`) : même chargement (`useDonneesFicheTraduction`),
// même composition (`ContenuFicheTraduction`). Demande de l'auteur, 2026-09-15 : « Les
// données de la page “traduction” et les données de la fenêtre “traduction” doivent être
// les mêmes. »
//
// Elle prend le MODÈLE COMMUN des fiches (`app/components/FicheModele`, charte § 38.33) :
// cadre, en-tête, portrait, corps à deux colonnes, rubriques.
//
// Sources : `v_traductions_page` (par `trad_id`), `traductions.import_maj_le`,
// `v_chronologie_traductions_dates`, et les ouvrages cités par la famille éditoriale,
// relus en NOTICES ENTIÈRES (`chargerOuvragesCitesDeLaFamille`).
//
// Ce que les relevés de l'auteur ont fixé, et qui tient toujours (charte §§ 38.4, 38.15) :
// ⛔ ni les gravures de l'édition, ni les repères sous le nom ;
// ⛔ rien de l'atelier : ni « Vérification », ni renvoi aux conditions d'utilisation ;
// ⚠️ « Particularités » porte de la prose, et la source numérique ne donne que le nom du
//    site, qui porte le lien ;
// ⚠️ les conditions d'usage ferment la fiche, en rubrique.
//
// Ce que l'auteur a repris le 2026-09-20 :
// ⛔ AUCUN SURTITRE : la fenêtre s'appelle déjà « À propos de cette traduction », son nom
//    accessible le dit, et l'écrire au-dessus du nom de la bible ne l'apprenait à
//    personne — c'est la décision prise le même jour pour la fiche d'une œuvre ;
// ⛔ le nom se lit sur DEUX lignes : « Bible Fillion » en titre, « Latin (Vulgate) » sous
//    lui, EN VERT, comme le nom de l'auteur sur la fiche d'une œuvre ;
// ⛔ l'intitulé (« Recension de Louis-Claude Fillion (éd.) (IVe siècle) ») ne paraît plus ;
// ⛔ « Édition et état du texte » devient « Édition du texte », monte SOUS LE TITRE et
//    quitte la colonne étroite ; son détail se compose en rangées « libellé : valeur »,
//    celles de « Édition de référence » sur la fiche d'une œuvre, et un geste de copie se
//    tient contre son titre — il rend la RÉFÉRENCE composée des volumes servis ;
// ⚠️ « Ouvrages cités dans cette édition » passe en SECTION, comme sur la fiche d'une
//    œuvre : deux listes d'ouvrages ne se composent pas de deux façons (charte § 38.25.2).
//
// Ce qui l'a alignée sur les deux autres fiches, le 2026-09-24 :
// ⚠️ le blanc entre deux blocs de la colonne vaut 22 px, comme chez l'auteur et l'œuvre ;
//    il valait 14 px ici seulement. La mesure est commune (`.cs-fiche-principal`,
//    globals.css), et aucune fiche ne la réécrit pour son compte.
// ⛔ elle ne demande PAS de confirmation au clic dehors (`confirmerFermeture`) : c'est une
//    demande de la seule fiche d'une œuvre, et la fiche d'un auteur, qui fait modèle,
//    ferme au premier clic. Ce serait un changement de conduite, non de mise en forme.
//
// ⚠️ Le CONTENU est séparé de la fenêtre : `createPortal` n'existe pas au rendu serveur,
// et une planche de contrôle hors session ne pourrait pas rendre la fiche autrement.

import DOMPurify from 'dompurify'
import { useEffect, useId, useState, type ReactNode } from 'react'

import BoutonCopierTexte from '@/app/components/BoutonCopierTexte'
import {
  ChampFiche, Consulter, CorpsFiche, EnTeteFiche, ListeOuvragesCites, ModaleFiche,
  PortraitFiche, RubriqueFiche, SectionFiche,
} from '@/app/components/FicheModele'
import LivresDisponiblesTraduction from '@/app/components/LivresDisponiblesTraduction'
import { FriseAuteur } from '@/app/components/ModaleAuteur'
import { joindreLieux } from '@/app/lib/adresseEdition'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { indexEditeursNavigateur, useEditeursCharges } from '@/app/lib/editeurs'
import { joindreEditeurs } from '@/app/lib/editeursNormalisation'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { type RangChrono, estUrl } from '@/app/lib/frise'
import { chargerOuvragesCitesDeLaFamille } from '@/app/lib/ouvragesCitesChargement'
import {
  portraitTraduction, styleImagePortrait, type PositionsPhotoTraduction,
} from '@/app/lib/portraitTraduction'
import type { NoticeBibliographique } from '@/app/lib/referenceBibliographique'
import {
  mentionEditionAComposer, texteReferenceEdition, type EditionServie,
} from '@/app/lib/referenceEditionServie'
import { sieclesEnHtml } from '@/app/lib/siecles'
import { libelleSourceNumerique } from '@/app/lib/sourceNumerique'
import { supabase } from '@/app/lib/supabase'
import { normaliserEspaces } from '@/app/lib/typographie'

/** Fiche de présentation — la vue porte déjà l'édition source jointe. */
export type InfoTrad = {
  trad_id: string; nom: string | null; type_objet: string | null; auteur: string | null
  responsable_edition: string | null; dates: string | null; bio_courte: string | null
  date_publication: string | null; confession: string | null; langue: string | null
  commentaire_editorial: string | null
  photo: string | null; photo_encart: string | null; photo_position: PositionsPhotoTraduction
  schema_numerotation: string | null
  licence_traduction: string | null; mention_obligatoire: string | null
  titre_edition: string | null; sous_titre_edition: string | null
  editeur: string | null; annee_edition: string | null; lieu_edition: string | null
  source_type: string | null; source_numerique_nom: string | null; source_numerique_url: string | null
  graphie: string | null; particularites: string | null
  /** « Édition révisée » : la mention de la page de titre. */
  mention_edition: string | null
  /** Le dépôt et la cote d'un TÉMOIN MANUSCRIT — la cote fait le manuscrit. */
  depot_manuscrit: string | null; cote_manuscrit: string | null
  /** Combien de volumes l'édition compte. */
  nombre_tomes: number | null
  /** La dernière reprise du corpus de cette traduction. ⚠️ Elle vit dans `traductions`,
   *  non dans la vue : la page la montrait, la fenêtre l'ignorait. */
  import_maj_le: string | null
}

/**
 * Le NOM d'une bible se lit sur DEUX lignes : « Bible Fillion – Latin (Vulgate) » donne
 * « Bible Fillion » pour titre et « Latin (Vulgate) » pour QUALITÉ, sous lui, en vert
 * (demande de l'auteur, 2026-09-20).
 *
 * ⚠️ Le tiret SÉPARE, il ne compose pas : on ne coupe que sur un tiret CERNÉ D'ESPACES —
 * demi-cadratin ou cadratin —, jamais sur le trait d'union d'un nom composé
 * (« Bar-le-Duc ») ni sur un tiret collé.
 * ⛔ La coupure se fait au PREMIER séparateur, et les deux morceaux doivent porter
 * quelque chose : un nom qui n'en a pas reste entier, et rien ne paraît sous lui.
 */
const SEPARATEUR_NOM = new RegExp(
  `\\s[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]\\s`,
)

export function nomEtQualite(nom: string): { nom: string; qualite: string | null } {
  const trouve = SEPARATEUR_NOM.exec(nom)
  if (!trouve) return { nom, qualite: null }
  const titre = nom.slice(0, trouve.index).trim()
  const qualite = nom.slice(trouve.index + trouve[0].length).trim()
  return titre && qualite ? { nom: titre, qualite } : { nom, qualite: null }
}

/**
 * La PROSE d'un champ de la base — notice, graphie, particularités.
 * ⚠️ Ces champs sont saisis à l'espace ordinaire : la norme française se pose au RENDU
 * (charte § 3.2). `normaliserEspaces` CONVERTIT le type d'une espace déjà présente, elle
 * n'en ajoute jamais.
 * ⚠️ Exportée pour l'aperçu d'administration, qui compose la biographie comme la page.
 */
export const enProse = (t: string | null | undefined) => rendreEnrichi(t ? normaliserEspaces(t) : t)

/**
 * La source numérique : son NOM porte le lien, et il n'y a rien d'autre.
 * ⚠️ Le nom se rend TOUJOURS, lien ou pas ; sans nom, c'est l'HÔTE de l'adresse.
 * ⛔ Ne donner que le NOM DU SITE (`app/lib/sourceNumerique.ts`).
 * ⛔ C'EST UNE FONCTION, ET NON UN COMPOSANT : `ChampFiche` se tait sur un enfant NUL, et
 * un élément de composant n'est jamais nul, fût-il rendu à `null`.
 */
function sourceNumerique(nom: string | null, url: string | null): ReactNode {
  const libelle = libelleSourceNumerique(nom, url)
  if (!libelle) return null
  return estUrl(url) ? <Consulter url={url} libelle={libelle} /> : libelle
}

/** Libellé lisible du schéma de numérotation stocké en base. */
const NUMEROTATION_LABEL: Record<string, string> = {
  vulgate: 'Vulgate (latine)', hebreu: 'Hébraïque', grec: 'Grecque', septante: 'Septante (grecque)',
}

// ⚠️ Écrites en points de code, jamais tapées : une fine insécable ne se distingue pas
// d'une espace ordinaire à la lecture, et le dépôt en a déjà perdu ainsi.
const FINE = String.fromCharCode(0x202f)
const INSEC = String.fromCharCode(0x00a0)

// Passe typographique française sur la prose éditoriale : espaces fines insécables
// (avant ; ! ? et à l'intérieur des guillemets), insécable avant « : », et siècles
// composés par la source unique. Ordre important : on pose les espaces AVANT d'injecter
// les <span>/<sup> des siècles, dont le style contient des « : ».
function formaterProse(html: string): string {
  const s = html
    .replace(/\s*([;!?])/g, `${FINE}$1`)
    .replace(/\s*:/g, `${INSEC}:`)
    .replace(/«\s*/g, `«${FINE}`)
    .replace(/\s*»/g, `${FINE}»`)
  return sieclesEnHtml(s)
}

/**
 * La NOTICE ÉDITORIALE d'une traduction, en HTML assaini : ses paragraphes (un texte
 * brut est coupé à ses sauts de ligne), sa typographie et ses siècles.
 * ⛔ Une seule écriture, pour la fiche et pour l'aperçu d'administration : un aperçu qui
 * recompose de son côté finit toujours par ne plus montrer ce que le lecteur lit.
 */
export function noticeEditorialeEnHtml(texte: string): string {
  const html = /^\s*<(p|h[1-6]|div|ul|ol|blockquote)[\s>]/i.test(texte)
    ? texte
    : texte.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => `<p>${l}</p>`).join('')
  return DOMPurify.sanitize(formaterProse(html))
}

function dateMiseAJour(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const date = new Date(valeur)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export type DonneesFicheTraduction = {
  /** `null` tant que la notice n'est pas arrivée. */
  info: InfoTrad | null
  chrono: RangChrono[]
  ouvragesCites: NoticeBibliographique[]
}

/**
 * Les DONNÉES d'une fiche de traduction, pour la fenêtre comme pour la page.
 *
 * ⛔ Chaque réponse est retenue AVEC le code auquel elle appartient, et ne se lit que
 * pour lui : la même fiche peut changer de traduction sans être remontée, et une réponse
 * tardive ne doit pas s'afficher sous la suivante. Rien ne se remet à zéro dans le corps
 * d'un effet.
 */
export function useDonneesFicheTraduction(code: string): DonneesFicheTraduction {
  const [info, setInfo] = useState<{ pour: string; valeur: InfoTrad } | null>(null)
  const [chrono, setChrono] = useState<{ pour: string; valeur: RangChrono[] } | null>(null)
  const [ouvrages, setOuvrages] = useState<{ pour: string; valeur: NoticeBibliographique[] } | null>(null)

  useEffect(() => {
    let annule = false
    // Source unique : la vue de présentation, chargée par trad_id — et la date de la
    // dernière reprise du corpus, que la vue ne porte pas.
    Promise.all([
      supabase.from('v_traductions_page').select('*').eq('trad_id', code).maybeSingle(),
      supabase.from('traductions').select('import_maj_le').eq('trad_id', code).maybeSingle(),
    ]).then(([page, traduction]) => {
      if (annule) return
      if (page.error) console.error('[fiche traduction] notice illisible', page.error)
      const base = (page.data as InfoTrad | null) ?? ({} as InfoTrad)
      const majLe = traduction.error ? null : ((traduction.data as { import_maj_le: string | null } | null)?.import_maj_le ?? null)
      setInfo({ pour: code, valeur: { ...base, import_maj_le: majLe } })
    })
    // ⚠️ La vue en `_dates`, jamais `v_chronologie_traductions` : elle seule porte
    // `date_affichage_courte`, et c'est ce manque qui laissait la colonne des dates VIDE
    // sur toute chronologie de traduction.
    supabase.from('v_chronologie_traductions_dates').select('*').eq('trad_id', code).order('ordre_affichage')
      .then(({ data, error }) => {
        if (annule) return
        if (error) console.error('[fiche traduction] chronologie illisible', error)
        setChrono({ pour: code, valeur: (data ?? []) as unknown as RangChrono[] })
      })
    // Les ouvrages cités appartiennent à la FAMILLE ÉDITORIALE, non à la traduction :
    // une édition bilingue les cite une fois pour ses deux textes.
    chargerOuvragesCitesDeLaFamille(supabase, code)
      .then(notices => { if (!annule) setOuvrages({ pour: code, valeur: notices }) })
      .catch(erreur => {
        console.error('[fiche traduction] ouvrages cités illisibles', erreur)
        if (!annule) setOuvrages({ pour: code, valeur: [] })
      })
    return () => { annule = true }
  }, [code])

  return {
    info: info?.pour === code ? info.valeur : null,
    chrono: chrono?.pour === code ? chrono.valeur : [],
    ouvragesCites: ouvrages?.pour === code ? ouvrages.valeur : [],
  }
}

/**
 * Le contenu de la fiche. Les données lui arrivent chargées ; `info` à `null` vaut « on
 * charge encore ».
 * ⚠️ `surPage` : la page « Les traductions » la rend sous un bandeau qui nomme déjà la
 * traduction — ni surtitre ni titre, mais tout le reste, à l'identique.
 */
export function ContenuFicheTraduction({ info, chrono, ouvragesCites, nomFallback, titreId, surPage = false }: {
  info: InfoTrad | null
  chrono: RangChrono[]
  /** Les ouvrages cités dans l'édition. Vides, la rubrique ne paraît pas. */
  ouvragesCites: readonly NoticeBibliographique[]
  nomFallback: string
  titreId?: string
  surPage?: boolean
}) {
  // Le cache des éditeurs répertoriés : le crochet déclenche son chargement et provoque
  // un rendu quand il est prêt, l'index se lit ensuite en mémoire.
  useEditeursCharges()
  const indexEditeurs = indexEditeursNavigateur()

  const i = info ?? ({} as InfoTrad)

  // Numérotation de la Vulgate : jamais affichée (elle va de soi pour un texte établi sur
  // la Vulgate, et n'apporte rien au lecteur).
  const numerotation = (i.schema_numerotation && i.schema_numerotation !== 'vulgate')
    ? (NUMEROTATION_LABEL[i.schema_numerotation] ?? i.schema_numerotation) : null
  const licenceDP = (i.licence_traduction ?? '').toLowerCase().includes('domaine public')
  // ⛔ Une licence RÉDIGÉE se rend telle quelle, jamais rabattue sur la formule du
  // domaine public : la réserve qu'elle porte tomberait avec elle.
  const licenceTexte = (i.licence_traduction ?? '').trim()
  const licenceDetaillee = licenceTexte.toLowerCase() === 'domaine public'
    ? 'Le texte de cette édition relève du domaine public\u00A0: il se lit, se cite et se reproduit librement.'
    : licenceTexte
      ? (licenceDP ? licenceTexte : `Le texte de cette édition est diffusé sous la mention « ${licenceTexte} ».`)
      : 'Les droits sur le texte de cette édition ne sont pas précisés.'
  const portrait = portraitTraduction(i)
  const miseAJour = dateMiseAJour(i.import_maj_le)

  // L'ÉDITION SERVIE, champ par champ. ⚠️ L'ÉDITEUR y prend sa forme normalisée ; tant que
  // le cache n'est pas prêt, la forme brute — jamais un vide.
  const editeurCompose = joindreEditeurs(i.editeur, indexEditeurs)
  const edition: EditionServie = {
    titreEdition: i.titre_edition, sousTitreEdition: i.sous_titre_edition,
    mentionEdition: i.mention_edition,
    lieuEdition: i.lieu_edition, editeur: editeurCompose,
    anneeEdition: i.annee_edition, nombreTomes: i.nombre_tomes,
    depotManuscrit: i.depot_manuscrit, coteManuscrit: i.cote_manuscrit,
  }
  // ⛔ La référence composée ne paraît plus À L'ÉCRAN, mais elle ne disparaît pas pour
  //    autant : c'est elle que le geste de copie rend, telle qu'on la cite (charte § 47.1).
  const referenceACopier = texteReferenceEdition(edition)
  // ⚠️ La mention d'édition se TAIT quand elle n'apprend rien — un témoin manuscrit n'en a
  //    pas, et une mention que le titre porte déjà ne se redit pas. La règle est celle de
  //    la référence composée, et il n'y en a qu'une (`mentionEditionAComposer`).
  const mentionEdition = mentionEditionAComposer(edition)
  // ⚠️ « 1 vol. » ne s'écrit pas : un volume unique est le cas ordinaire.
  const tomes = typeof i.nombre_tomes === 'number' && i.nombre_tomes > 1 ? `${i.nombre_tomes} vol.` : null
  // ⛔ Un TÉMOIN MANUSCRIT se nomme par son dépôt ET sa cote : la cote fait le manuscrit,
  //    et le dépôt seul ne désigne rien.
  const cote = i.cote_manuscrit?.trim() || null

  const { nom: nomPrincipal, qualite } = nomEtQualite((i.nom || nomFallback).trim())

  const aChrono = chrono.length > 0
  const aEdition = !!(i.titre_edition || i.sous_titre_edition || mentionEdition
    || i.responsable_edition || joindreLieux(i.lieu_edition) || editeurCompose
    || i.annee_edition || tomes || cote || i.source_numerique_nom || i.source_numerique_url
    || i.graphie || numerotation || i.particularites || miseAJour)

  return (
    <CorpsFiche
      portrait={portrait ? (
        <PortraitFiche src={portrait.url} styleImage={styleImagePortrait(portrait)} cle={i.trad_id ?? nomFallback} />
      ) : null}
      entete={surPage ? null : (
        /* ⛔ AUCUN SURTITRE : la fenêtre s'appelle déjà « À propos de cette traduction »
           (son nom accessible le dit), et la page « Les traductions » porte un bandeau qui
           nomme déjà la bible — d'où l'en-tête ABSENT en `surPage`. */
        <EnTeteFiche titre={rendreEnrichi(nomPrincipal)} titreId={titreId}
          ligne={qualite ? <span className="cs-fiche-langue">{rendreEnrichi(qualite)}</span> : null} />
      )}
      complement={info !== null && aChrono ? (
        <SectionFiche titre="Chronologie"><FriseAuteur evenements={chrono} /></SectionFiche>
      ) : null}
      suite={info !== null ? (
        <>
          {/* ── CONDITIONS D'USAGE ── La licence dit ce que le TEXTE permet ; la
              transcription, la structuration, les alignements et les liens ne sont pas
              libres pour autant. ⛔ La formule dit en deux paragraphes le § 6 des
              conditions d'utilisation, qui fait foi, et n'y renvoie plus. */}
          <RubriqueFiche titre="Conditions d’usage">
            <p className="cs-notice-prose">
              {licenceDetaillee}
              {i.mention_obligatoire ? ` ${i.mention_obligatoire}` : ''}
            </p>
            <p className="cs-notice-prose">
              La transcription, la structuration des données, la segmentation, les alignements
              et les liens établis entre versets et textes patristiques constituent en revanche
              un travail éditorial original, protégé par le droit d’auteur. Toute reproduction
              substantielle de cette structuration à des fins commerciales est soumise à
              autorisation préalable&#8239;; une citation reprise publiquement garde la mention de sa
              source.
            </p>
          </RubriqueFiche>
        </>
      ) : null}
    >
      {info === null ? (
        <MotAttente centre marge="30px 0" />
      ) : (
        <>
          {/* ── L'ÉDITION D'OÙ LE TEXTE EST TIRÉ ── Elle vivait sous la chronologie, dans la
              colonne étroite, et donnait sa référence composée en une ligne. L'auteur l'a
              voulue SOUS LE TITRE et dans la forme de « Édition de référence » sur la fiche
              d'une œuvre : « libellé : valeur », une donnée par ligne (2026-09-20).
              ⛔ La référence composée ne se perd pas : le geste de copie, contre le titre de
              la section, la rend telle qu'on la cite. */}
          {aEdition && (
            /* ⛔ ELLE HABILLE LE PORTRAIT, elle ne se range plus dessous (reprise de
               l'auteur, 2026-09-23 : « il faut le placer, comme avant, à droite de
               l'illustration »). Le dégagement (`cs-fiche-section--degagee`) laissait un
               grand blanc à droite du portrait, puis la liste entière sous lui.
               ⛔ C'EST LA FORME DES RANGÉES QUI LE PERMET : une rangée en FLEX est un
               CONTEXTE DE FORMATAGE, et se range ENTIÈRE là où elle tient — d'où les deux
               fers qui avaient fait dégager la section. Rendues en BLOC, leurs LIGNES se
               raccourcissent le long du flottant et reprennent la pleine mesure sous lui :
               c'est l'habillage ordinaire, et le fer de chaque ligne est celui de la
               colonne de texte (`cs-fiche-champs--habille`, globals.css). */
            <SectionFiche titre="Édition du texte"
              action={referenceACopier ? (
                <BoutonCopierTexte texte={referenceACopier} titre="Copier la référence"
                  mention="Référence bibliographique copiée" className="cs-fiche-copier cs-cible-fine" />
              ) : null}>
              <dl className="cs-fiche-champs cs-fiche-champs--habille">
                <ChampFiche libelle="Titre" italique>{enProse(i.titre_edition)}</ChampFiche>
                <ChampFiche libelle="Sous-titre" italique>{enProse(i.sous_titre_edition)}</ChampFiche>
                {/* ⚠️ L'ordre est celui de la fiche d'une œuvre et d'une notice : le
                    responsable du texte, puis la mention d'édition, puis l'adresse. */}
                <ChampFiche libelle="Texte établi par">{enProse(i.responsable_edition)}</ChampFiche>
                <ChampFiche libelle="Édition">{mentionEdition}</ChampFiche>
                <ChampFiche libelle="Lieu">{joindreLieux(i.lieu_edition)}</ChampFiche>
                <ChampFiche libelle="Dépôt">{cote ? i.depot_manuscrit : null}</ChampFiche>
                <ChampFiche libelle="Cote">{cote}</ChampFiche>
                <ChampFiche libelle="Éditeur">{editeurCompose}</ChampFiche>
                <ChampFiche libelle="Année">{i.annee_edition}</ChampFiche>
                <ChampFiche libelle="Volumes">{tomes}</ChampFiche>
                <ChampFiche libelle="Source">{sourceNumerique(i.source_numerique_nom, i.source_numerique_url)}</ChampFiche>
                <ChampFiche libelle="Graphie">{enProse(i.graphie)}</ChampFiche>
                <ChampFiche libelle="Numérotation">{numerotation}</ChampFiche>
                {/* ⚠️ « PARTICULARITÉS » PORTE DE LA PROSE : l'interligne et la césure d'un
                    paragraphe, portés par `cs-fiche-champs--habille` sur la rangée entière.
                    ⛔ PLUS DE BLOC DANS LA VALEUR : la rangée est devenue une LIGNE DE
                    TEXTE, et un enfant de bloc y rouvrirait un second fer — exactement ce
                    que l'auteur a refusé le 2026-09-23. */}
                <ChampFiche libelle="Particularités">{enProse(i.particularites)}</ChampFiche>
                <ChampFiche libelle="Texte mis à jour le">{miseAJour}</ChampFiche>
              </dl>
            </SectionFiche>
          )}
          {/* ── LES LIVRES PORTÉS ── Une bible partielle les liste, une complète se tait
              (2026-09-24, voir `LivresDisponiblesTraduction`). */}
          {i.trad_id && <LivresDisponiblesTraduction code={i.trad_id} />}
          {i.bio_courte && <p className="cs-fiche-bio">{enProse(i.bio_courte)}</p>}
          {/* Notice éditoriale : HTML (h2/p/em/ul/li) composé par la feuille — titres de
              section en sérif italique, prose en sans justifiée. */}
          {i.commentaire_editorial && (
            <div className="cs-fiche-notice"
              dangerouslySetInnerHTML={{ __html: noticeEditorialeEnHtml(i.commentaire_editorial) }} />
          )}
          {/* ── LES OUVRAGES QUE L'ÉDITION CITE ── « Je veux qu'on constitue une nouvelle
              rubrique contenant, proprement, tous les ouvrages cités dans l'édition
              utilisée […] Si cette rubrique est vide, elle ne doit pas apparaître »
              (2026-09-04). Composés par le moteur bibliographique, en notices entières, et
              repliés au-delà de dix (2026-09-15).
              ⛔ Une SECTION, comme sur la fiche d'une œuvre (2026-09-20) : deux listes
              d'ouvrages ne peuvent pas se composer de deux façons. */}
          {ouvragesCites.length > 0 && (
            <SectionFiche titre="Ouvrages cités dans cette édition">
              <ListeOuvragesCites notices={ouvragesCites} />
            </SectionFiche>
          )}
        </>
      )}
    </CorpsFiche>
  )
}

export default function ModaleTraduction({ code, nomFallback, onFermer }: { code: string; nomFallback: string; onFermer: () => void }) {
  const titreId = useId()
  const { info, chrono, ouvragesCites } = useDonneesFicheTraduction(code)
  return (
    <ModaleFiche titreId={titreId} libelle="À propos de cette traduction" onFermer={onFermer}>
      <ContenuFicheTraduction info={info} chrono={chrono} ouvragesCites={ouvragesCites}
        nomFallback={nomFallback} titreId={titreId} />
    </ModaleFiche>
  )
}
