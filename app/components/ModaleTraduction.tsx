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
// ⛔ « Édition et état du texte » vit sous la chronologie, sa référence en TÊTE, ses
//    rangées réduites à ce que la référence ne dit pas ;
// ⛔ rien de l'atelier : ni « Vérification », ni renvoi aux conditions d'utilisation ;
// ⚠️ « Particularités » porte de la prose, et la source numérique ne donne que le nom du
//    site, qui porte le lien ;
// ⚠️ deux rubriques ferment la fiche : les ouvrages cités (repliés au-delà de dix), puis
//    les conditions d'usage.
//
// ⚠️ Le CONTENU est séparé de la fenêtre : `createPortal` n'existe pas au rendu serveur,
// et une planche de contrôle hors session ne pourrait pas rendre la fiche autrement.

import DOMPurify from 'dompurify'
import { useEffect, useId, useState, type ReactNode } from 'react'

import {
  Consulter, CorpsFiche, EnTeteFiche, ListeOuvragesCites, ModaleFiche, PortraitFiche,
  RangeeEmpilee, RubriqueFiche, SectionFiche,
} from '@/app/components/FicheModele'
import { FriseAuteur } from '@/app/components/ModaleAuteur'
import { FragmentReference } from '@/app/components/ReferenceBibliographique'
import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
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
import { segmentsReferenceEdition } from '@/app/lib/referenceEditionServie'
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

/** Intitulé juste selon le type d'objet (jamais la valeur technique brute). */
function intituleTraduction(i: InfoTrad): string | null {
  const a = i.auteur?.trim() || null
  if (i.type_objet === 'edition_critique') { const r = i.responsable_edition?.trim() || a; return r ? `Édition critique établie par ${r}` : null }
  if (i.type_objet === 'recension') return a ? `Recension de ${a}` : null
  if (i.type_objet === 'traduction') return a ? `Traduction de ${a}` : null
  return a
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
 * ⛔ C'EST UNE FONCTION, ET NON UN COMPOSANT : `RangeeEmpilee` se tait sur un enfant
 * FAUX, et un élément de composant est toujours vrai, fût-il rendu à `null`.
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
  const intitule = intituleTraduction(i)
  const licenceDP = (i.licence_traduction ?? '').toLowerCase().includes('domaine public')
  // ⛔ Une licence RÉDIGÉE se rend telle quelle, jamais rabattue sur la formule du
  // domaine public : la réserve qu'elle porte tomberait avec elle.
  const licenceTexte = (i.licence_traduction ?? '').trim()
  const licenceDetaillee = licenceTexte.toLowerCase() === 'domaine public'
    ? 'Le texte de cette édition relève du domaine public : il se lit, se cite et se reproduit librement.'
    : licenceTexte
      ? (licenceDP ? licenceTexte : `Le texte de cette édition est diffusé sous la mention « ${licenceTexte} ».`)
      : 'Les droits sur le texte de cette édition ne sont pas précisés.'
  const portrait = portraitTraduction(i)
  const miseAJour = dateMiseAJour(i.import_maj_le)

  // La RÉFÉRENCE des volumes servis, composée champ par champ. ⚠️ L'ÉDITEUR y prend sa
  // forme normalisée ; tant que le cache n'est pas prêt, la forme brute — jamais un vide.
  const referenceEdition = segmentsReferenceEdition({
    titreEdition: i.titre_edition, sousTitreEdition: i.sous_titre_edition,
    mentionEdition: i.mention_edition,
    lieuEdition: i.lieu_edition, editeur: joindreEditeurs(i.editeur, indexEditeurs),
    anneeEdition: i.annee_edition, nombreTomes: i.nombre_tomes,
    depotManuscrit: i.depot_manuscrit, coteManuscrit: i.cote_manuscrit,
  })

  const aChrono = chrono.length > 0
  const aEdition = referenceEdition.length > 0 || !!(i.source_numerique_nom
    || i.source_numerique_url || i.graphie || numerotation || i.particularites || miseAJour)
  const sousTitre = intitule ? rendreEnrichi(i.dates ? `${intitule} (${i.dates})` : intitule) : null

  return (
    <CorpsFiche
      portrait={portrait ? (
        <PortraitFiche src={portrait.url} styleImage={styleImagePortrait(portrait)} cle={i.trad_id ?? nomFallback} />
      ) : null}
      entete={surPage ? (
        <EnTeteFiche sousTitre={sousTitre} />
      ) : (
        <EnTeteFiche surtitre="À propos de cette traduction" titre={rendreEnrichi(i.nom || nomFallback)}
          titreId={titreId} sousTitre={sousTitre} />
      )}
      complement={info !== null && (aChrono || aEdition) ? (
        <>
          {aChrono && <SectionFiche titre="Chronologie"><FriseAuteur evenements={chrono} /></SectionFiche>}
          {aEdition && (
            <SectionFiche titre="Édition et état du texte">
              {referenceEdition.length > 0 && (
                <div className={`${CLASSES_BIBLIOGRAPHIE.bloc} ${CLASSES_BIBLIOGRAPHIE.sansHote}`} style={{ marginBottom: '7px' }}>
                  <ul className={CLASSES_BIBLIOGRAPHIE.liste}>
                    <li className={CLASSES_BIBLIOGRAPHIE.entree}>
                      {referenceEdition.map((segment, rang) => (
                        <FragmentReference key={rang} segment={segment} />
                      ))}
                    </li>
                  </ul>
                </div>
              )}
              <RangeeEmpilee c="Source numérique">{sourceNumerique(i.source_numerique_nom, i.source_numerique_url)}</RangeeEmpilee>
              <RangeeEmpilee c="Graphie">{enProse(i.graphie)}</RangeeEmpilee>
              <RangeeEmpilee c="Numérotation">{numerotation}</RangeeEmpilee>
              {/* ⚠️ « PARTICULARITÉS » PORTE DE LA PROSE : l'interligne et la césure d'un
                  paragraphe, en SPAN (la valeur d'une rangée en est un), sans
                  justification (la colonne ne porte qu'une quarantaine de signes). */}
              <RangeeEmpilee c="Particularités">{i.particularites
                ? <span style={{ display: 'block', lineHeight: 1.5, hyphens: 'auto' }}>{enProse(i.particularites)}</span>
                : null}</RangeeEmpilee>
              <RangeeEmpilee c="Texte mis à jour le">{miseAJour}</RangeeEmpilee>
            </SectionFiche>
          )}
        </>
      ) : null}
      suite={info !== null ? (
        <>
          {/* ── LES OUVRAGES QUE L'ÉDITION CITE ── « Je veux qu'on constitue une nouvelle
              rubrique contenant, proprement, tous les ouvrages cités dans l'édition
              utilisée […] Si cette rubrique est vide, elle ne doit pas apparaître »
              (2026-09-04). Composés par le moteur bibliographique, en notices entières,
              et repliés au-delà de dix (2026-09-15). */}
          {ouvragesCites.length > 0 && (
            <RubriqueFiche titre="Ouvrages cités dans cette édition">
              <ListeOuvragesCites notices={ouvragesCites} />
            </RubriqueFiche>
          )}
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
              autorisation préalable ; une citation reprise publiquement garde la mention de sa
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
          {i.bio_courte && <p className="cs-fiche-bio">{enProse(i.bio_courte)}</p>}
          {/* Notice éditoriale : HTML (h2/p/em/ul/li) composé par la feuille — titres de
              section en sérif italique, prose en sans justifiée. */}
          {i.commentaire_editorial && (
            <div className="cs-fiche-notice"
              dangerouslySetInnerHTML={{ __html: noticeEditorialeEnHtml(i.commentaire_editorial) }} />
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
