'use client'

// ── Fiche auteur EN FENÊTRE ────────────────────────────────────────────────────
// Ce n'est plus une page mais une fenêtre modale, ouvrable depuis plusieurs endroits
// (Bibliothèque, résultats de recherche, fiche d'une édition…). Elle se ferme d'un clic
// sur la croix ou hors du cadre, ou par Échap.
//
// ⛔ Elle prend le MODÈLE COMMUN des fiches (`app/components/FicheModele`, charte
// § 38.33) : le cadre, l'en-tête, le portrait, le corps à deux colonnes et les titres de
// section ne s'écrivent plus ici. Ce fichier ne porte que ce qui appartient à un
// auteur : ses données, sa frise, la liste de ses œuvres et le pied de sa fiche.

import Link from 'next/link'
import FilAriane from '@/app/components/FilAriane'
import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import {
  ChampFiche, CorpsFiche, EnTeteFiche, ModaleFiche, PortraitFiche, SectionFiche, TitreSection,
  useColonneCommune,
} from '@/app/components/FicheModele'
import HistoricalDate from '@/app/components/HistoricalDate'
import ReferenceBibliographique from '@/app/components/ReferenceBibliographique'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { chargerAuteursParOeuvre, libelleAuteurs, type AuteurOeuvre } from '@/app/lib/auteursOeuvre'
import { LIVRES } from '@/app/lib/bible'
import { espacerIntervallesHistoriques, formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { type RangChrono, cleTypeAffichage, coulType, LIB_TYPE } from '@/app/lib/frise'
import { libelleLangue } from '@/app/lib/langues'
import { colonneDesDates, ordonnerOeuvresAuteur, type CelluleDeDate } from '@/app/lib/listeOeuvresAuteur'
import { noticeDuCatalogue } from '@/app/lib/noticeOeuvre'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import type { NoticeBibliographique } from '@/app/lib/referenceBibliographique'
import { chargerNoticesBibliographiques } from '@/app/lib/referencesBibliographiquesChargement'
import { rendreSiecles } from '@/app/lib/siecles'
import { supabase } from '@/app/lib/supabase'
import { rendreMarquesNote } from '@/app/lib/texteEnrichiEssai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERIF = 'var(--font-source-serif), Georgia, serif'

type OeuvreResumee = {
  id_oeuvre: string; titre: string; sous_titre: string | null
  trad_auteur: string | null; editeur: string | null
  ville: string | null; acces_public?: boolean | null
  date_composition_affichage_courte: string | null
  date_composition_precision_affichage: string | null
  composition_debut_annee: number | null
  auteurs?: AuteurOeuvre[]
}
type AuteurPhotoPos = { x: number; y: number; scale: number; scaleX?: number; scaleY?: number }
type Auteur = {
  id_auteur: string; nom: string; nom_original: string | null
  titre: string | null; dates: string | null; siecle: number | null
  traditions: string[] | null; note_biographique: string | null
  note_theologique: string | null; langue_principale: string | null
  anecdotes: string | null; influence: string | null
  photo_position?: unknown
  oeuvres: OeuvreResumee[]
}

// ── Le pied de fiche : ce que la base savait déjà et que la fenêtre taisait ─────
// Trois renseignements SECONDAIRES, et qui doivent le rester : l'empreinte de
// l'auteur dans l'Écriture, les éditions françaises répertoriées qui ne sont pas
// encore ici, et les ouvrages savants qui l'éditent. Chacun ne paraît que s'il a
// quelque chose à dire ; le pied entier disparaît si les trois se taisent.
type EmpreinteLivre = { livre: string; liens: number; versets: number }
type Empreinte = { liens: number; versets: number; livres: number; tete: EmpreinteLivre[] }
type EditionCataloguee = {
  id: number; titre_stable: string | null
  traducteur: string | null; collection_nom: string | null
  lieu_edition: string | null; editeur: string | null
  annee_edition: number | null; date_edition_affichage_courte: string | null
}
type PiedFiche = {
  empreinte: Empreinte | null
  editions: EditionCataloguee[]; nbEditions: number
  /** Des NOTICES du moteur, non des lignes brutes : la composition vient de lui. */
  ouvrages: NoticeBibliographique[]; nbOuvrages: number
}
const PIED_VIDE: PiedFiche = { empreinte: null, editions: [], nbEditions: 0, ouvrages: [], nbOuvrages: 0 }

/** La part d'un filet, mesurée sur le PREMIER livre. Un plancher de 6 % garde une
 *  trace visible au dernier rang : un filet de moins d'un pixel n'est pas un filet. */
function partDuFilet(liens: number, tete: number): number {
  if (tete <= 0) return 0
  return Math.max(6, Math.round((liens / tete) * 100))
}

const POS_DEFAUT: AuteurPhotoPos = { x: 50, y: 24, scale: 1, scaleX: 1, scaleY: 1 }

/** Les auteurs d'une œuvre écrite à plusieurs, en mention discrète après le titre.
 *  Rien pour une œuvre à auteur unique : la fiche répéterait son propre nom. */
function MentionCoAuteurs({ auteurs }: { auteurs?: AuteurOeuvre[] }) {
  if (!auteurs || auteurs.length < 2) return null
  return (
    <span style={{ marginLeft: '7px', fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', whiteSpace: 'normal' }}>
      {libelleAuteurs(auteurs)}
    </span>
  )
}
function parsePhotoPos(raw: unknown): AuteurPhotoPos {
  const r = raw as { x?: unknown; fiche?: Partial<AuteurPhotoPos> } | null | undefined
  const src = (r && typeof r.x === 'number' ? r : r?.fiche) as Partial<AuteurPhotoPos> | undefined
  return {
    x: typeof src?.x === 'number' ? src.x : POS_DEFAUT.x,
    y: typeof src?.y === 'number' ? src.y : POS_DEFAUT.y,
    scale: typeof src?.scale === 'number' ? src.scale : POS_DEFAUT.scale,
    scaleX: typeof src?.scaleX === 'number' ? src.scaleX : POS_DEFAUT.scaleX,
    scaleY: typeof src?.scaleY === 'number' ? src.scaleY : POS_DEFAUT.scaleY,
  }
}
function stylePhoto(pos: AuteurPhotoPos): CSSProperties {
  return {
    objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`,
    transform: `scale(${pos.scale}) scaleX(${pos.scaleX ?? 1}) scaleY(${pos.scaleY ?? 1})`,
    transformOrigin: `${pos.x}% ${pos.y}%`,
  }
}

// ── Frise agrégée de l'auteur ──────────────────────────────────────────────────
// Trois brins, distingués par la couleur du point : Vie (le parcours de l'auteur),
// Œuvre (compositions), Contexte (arrière-plan ecclésial et politique). Le type
// vient de `type_affichage` dans la vue ; il n'est plus déduit ici.
// ⚠️ Elle sert aussi la fiche d'une TRADUCTION et celle d'une ÉDITION : le composant
// reste ici, avec la frise dont il est né, et les deux autres fiches l'importent.

// Puce pleine, à la couleur du type d'événement (Vie, Œuvre, Contexte).
function stylePuce(type: string | null) {
  return { background: coulType(type), border: '1.5px solid var(--cs-fond)' }
}

// Chronologie d'un auteur : une SEULE frise mêlant vie, œuvres et contexte,
// dans l'ordre éditorial de la vue (`ordre_affichage`, jamais recalculé ici).
// Les trois types se distinguent par la puce et une nuance typographique, sans
// blocs colorés qui rompraient l'homogénéité.
/**
 * ⚠️ `oeuvreEnRelief` sert la fiche d’une ŒUVRE, qui montre la chronologie de son
 * AUTEUR : la ligne où l’œuvre est nommée s’y détache, sinon la fiche ne répondrait
 * pas à la question qu’on lui pose — où ce livre tombe-t-il dans cette vie. C’est le
 * marqueur de l’entrée active du sommaire, et rien de plus : l’accent et la graisse.
 */
export function FriseAuteur({ evenements, oeuvreEnRelief = null }: { evenements: RangChrono[]; oeuvreEnRelief?: string | null }) {
  const [ouverts, setOuverts] = useState<Set<number>>(new Set())
  if (!evenements.length) return null
  // ⚠️ La CLÉ, non la valeur : la vue des traductions écrit « édition » et
  // « réception » avec leurs accents, et les brins sont nommés sans.
  const presents = new Set(evenements.map(a => cleTypeAffichage(a.type_affichage)))
  const brins = ['formation', 'edition', 'reception', 'vie', 'œuvre', 'contexte'].filter(t => presents.has(t))
  const basculer = (k: number) => setOuverts(prev => { const s = new Set(prev); if (s.has(k)) s.delete(k); else s.add(k); return s })
  return (
    <div>
      {/* Légende : seulement les brins effectivement présents (auteur OU traduction), et
          jamais quand un seul brin est présent (une légende à une entrée n'apprend rien).
          ⚠️ Elle sert aussi les TRADUCTIONS depuis le 2026-09-04 : leurs trois brins —
          formation, édition, réception — ne se devinent pas plus que ceux d'un auteur. */}
      {brins.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', marginBottom: '13px', justifyContent: 'flex-start' }}>
          {brins.map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-second)' }}>
              <span aria-hidden style={{ width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, ...stylePuce(t) }} />
              {LIB_TYPE[t] ?? t}
            </span>
          ))}
        </div>
      )}
      {/* Trois colonnes : date | rail (avec la puce) | intitulé. Le point est aligné
          sur la première ligne. Un clic sur l'intitulé déplie le détail. */}
      {/* `align-items: start` (et non baseline) : un titre sur deux lignes exposerait, en
          baseline, la ligne de base de sa DERNIÈRE ligne — la date « tombait » alors d'une
          ligne et se désalignait de la puce. En start, date, puce et titre partagent la
          première ligne. */}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'max-content 16px 1fr', columnGap: '9px', rowGap: 0, alignItems: 'start' }}>
        {evenements.map((a, i) => {
          const type = a.type_affichage
          const contexte = type === 'contexte'
          // Plus d'italique « par défaut » sur les œuvres : le romain convient, l'italique
          // ne provient que du balisage *…* dans le titre. Le contexte reste en italique.
          const italique = contexte
          const enRelief = !!oeuvreEnRelief && a.oeuvre_id === oeuvreEnRelief
          const encre = enRelief ? 'var(--cs-vert)' : contexte ? 'var(--cs-texte-gris)' : 'var(--cs-encre)'
          const dernier = i === evenements.length - 1
          const cle = a.association_id
          const ouvert = ouverts.has(cle)
          const aDetail = !!a.notice
          const pb = dernier && !ouvert ? '0' : '10px'
          return (
            <li key={cle} style={{ display: 'contents' }}>
              <span style={{ fontFamily: SERIF, fontSize: '0.71875rem', color: contexte ? 'var(--cs-date-douce)' : 'var(--cs-date)', textAlign: 'right', whiteSpace: 'nowrap', lineHeight: 1.18, paddingBottom: pb }}><HistoricalDate value={a.date_affichage_courte} variant="short" /></span>
              {/* Rail + puce. La puce est dimensionnée et positionnée en `em` (relatifs à
                  la taille du titre) : elle suit la police fluide et reste alignée sur la
                  première ligne, quelle que soit l'échelle de l'écran. */}
              <div style={{ position: 'relative', alignSelf: 'stretch', fontSize: '0.6875rem' }}>
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', transform: 'translateX(-50%)', background: 'var(--cs-bord-clair)' }} />
                <div aria-hidden style={{ position: 'absolute', left: '50%', top: '0.6em', width: '0.82em', height: '0.82em', borderRadius: '50%', transform: 'translate(-50%, -50%)', boxSizing: 'border-box', ...stylePuce(type) }} />
              </div>
              <div style={{ paddingBottom: pb, fontSize: '0.6875rem', lineHeight: 1.18 }}>
                {aDetail ? (
                  <button onClick={() => basculer(cle)} aria-expanded={ouvert}
                    style={{ display: 'inline', textAlign: 'left', background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer', fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '1em', lineHeight: 'inherit', color: encre, fontWeight: enRelief ? 600 : undefined, fontStyle: italique ? 'italic' : 'normal' }}>
                    {rendreMarquesNote(a.titre)}
                  </button>
                ) : (
                  <span style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '1em', lineHeight: 'inherit', color: encre, fontWeight: enRelief ? 600 : undefined, fontStyle: italique ? 'italic' : 'normal' }}>
                    {rendreMarquesNote(a.titre)}
                  </span>
                )}
                {ouvert && (
                  <div style={{ margin: '3px 0 1px' }}>
                    {a.notice && <DetailChrono>{rendreMarquesNote(a.notice)}</DetailChrono>}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ⚠️ Court, mais JUSTIFIÉ : la césure n'est pas affaire de longueur. Dès qu'un texte
// est justifié, toute ligne pleine étire ses espaces sans borne si rien ne les remplit —
// deux lignes suffisent à le voir (audit de densité, 2026-09-05).
function DetailChrono({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.6875rem', lineHeight: 1.3, letterSpacing: '-0.005em', color: 'var(--cs-texte-gris)', margin: '0 0 2px', textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto', WebkitHyphens: 'auto' } as CSSProperties}>
      {label && <span style={{ color: 'var(--cs-texte-doux)' }}>{label} : </span>}{children}
    </p>
  )
}

// ── Pied de fiche ──────────────────────────────────────────────────────────────
// ⚠️ Ses valeurs sont plus petites et plus pâles que la fiche : c'est un pied, non une
// quatrième section. Ses TITRES, eux, prennent le titre de section commun aux trois
// fiches (2026-09-15, « toutes doivent être sur le même modèle »). Rien n'y est
// cliquable : ce sont des renseignements, pas une navigation.
const NOM_LIVRE: Record<string, string> = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))
const nombreFr = (n: number) => n.toLocaleString('fr-FR')

function PiedDeFiche({ pied }: { pied: PiedFiche }) {
  const empreinte = pied.empreinte && pied.empreinte.liens > 0 ? pied.empreinte : null
  const aEditions = pied.nbEditions > 0
  const aOuvrages = pied.nbOuvrages > 0
  if (!empreinte && !aEditions && !aOuvrages) return null

  return (
    <section aria-label="Renseignements complémentaires"
      style={{ display: 'flow-root', marginTop: '26px', paddingTop: '15px', borderTop: '1px solid var(--cs-fond-doux)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11.5rem, 1fr))', gap: '18px 26px', alignItems: 'start' }}>

        {empreinte && (
          <div style={{ minWidth: 0 }}>
            <TitreSection>Livres les plus commentés</TitreSection>
            {/* ⛔ AUCUN NOMBRE. Un compte nu (« Genèse 3 106 ») ne dit pas ce qu'il
                compte, et le mot juste — renvoi, passage, citation — demanderait une
                phrase que ce pied ne peut pas porter (relevé de l'auteur, 2026-09-06 :
                « c'est pas clair »). Un filet dit la PART, qui est la seule chose qu'on
                veut savoir ici : ce que cet auteur lit le plus. Le compte exact reste à
                l'infobulle, pour qui le cherche. */}
            {/* ⛔ Le filet se pose DANS SON RAIL (globals.css) : nu, il se lisait comme
                un soulignement du nom, et le premier livre, à pleine largeur, comme une
                règle de tableau. Le rail est le tout ; le filet en est la part. */}
            <ul className="cs-fiche-empreinte">
              {empreinte.tete.map(l => (
                <li key={l.livre} title={`${nombreFr(l.liens)} renvois, sur ${nombreFr(l.versets)} versets`} style={{ minWidth: 0 }}>
                  <span className="cs-fiche-empreinte-nom">{NOM_LIVRE[l.livre] ?? l.livre}</span>
                  {/* ⚠️ La part se mesure sur le PREMIER livre, non sur le total : les
                      six premiers d'Augustin ne font que la moitié de ses renvois, et
                      des filets tous ténus ne classeraient plus rien. */}
                  <span aria-hidden="true" className="cs-fiche-empreinte-rail">
                    <span className="cs-fiche-empreinte-part"
                      style={{ width: `${partDuFilet(l.liens, empreinte.tete[0]?.liens ?? l.liens)}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {aEditions && (
          <div style={{ minWidth: 0 }}>
            <TitreSection>Éditions répertoriées</TitreSection>
            {/* ⛔ La notice se compose par le MOTEUR bibliographique, comme partout
                ailleurs sur le site (charte § 47.5) : ordre, liants et ponctuation
                viennent de lui, et `noticeDuCatalogue` ne fait que nommer les champs.
                ⚠️ `avecAuteur={false}` : la fiche porte déjà le nom en tête. */}
            <ul className="cs-apparat-bibliographie cs-apparat-bibliographie--sans-hote pied-biblio"
              style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {pied.editions.map(e => (
                <li key={e.id} className="cs-apparat-bibliographie__entree">
                  <ReferenceBibliographique
                    notice={noticeDuCatalogue({
                      id: e.id, titreStable: e.titre_stable, traducteur: e.traducteur,
                      collection: e.collection_nom, lieu: e.lieu_edition, editeur: e.editeur,
                      dateAffichee: e.date_edition_affichage_courte, annee: e.annee_edition,
                    })}
                    avecAuteur={false}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        {aOuvrages && (
          <div style={{ minWidth: 0 }}>
            <TitreSection>Éditions savantes</TitreSection>
            {/* ⛔ Ce sont de vraies notices d'`ouvrages_bibliographiques` : elles se
                composent par le moteur depuis leurs AUTORITÉS, jamais par un titre et
                une année recollés. */}
            <ul className="cs-apparat-bibliographie cs-apparat-bibliographie--sans-hote pied-biblio"
              style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {pied.ouvrages.map(notice => (
                <li key={notice.id} className="cs-apparat-bibliographie__entree">
                  <ReferenceBibliographique notice={notice} avecAuteur={false} />
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </section>
  )
}

/** La cellule de date d'une œuvre, dans la liste de la fiche. Une date qui redit celle de
 *  la rangée précédente ne s'écrit pas (`colonneDesDates`) ; elle reste dite à la synthèse
 *  vocale, qui lit chaque rangée pour elle-même. La précision, quand la vue en porte une,
 *  va au libellé qu'on voit. */
function CelluleDate({ cellule, precision, encre, encreVide }: {
  cellule: CelluleDeDate; precision: string | null; encre: string; encreVide: string
}) {
  const { libelle, repete } = cellule
  return (
    <span data-fiche-colonne="" title={!repete && precision ? precision : undefined}
      style={{ fontFamily: SERIF, fontSize: '0.71875rem', color: libelle ? encre : encreVide, fontStyle: libelle ? 'normal' : 'italic' }}>
      {repete ? <span className="cs-hors-ecran">{libelle || 'Date inconnue'}</span>
        : libelle ? <HistoricalDate value={libelle} variant="short" /> : 'Date inconnue'}
    </span>
  )
}

function Contenu({ auteur, onClose, evenements, pied, titreId }: {
  auteur: Auteur; onClose: () => void; evenements: RangChrono[]; pied: PiedFiche; titreId: string
}) {
  const listeOeuvresRef = useRef<HTMLUListElement>(null)
  const datesAuteur = espacerIntervallesHistoriques(formaterDateHistorique(auteur.dates))
  // ⛔ LES REPÈRES SE RANGENT EN CHAMPS, comme sur la fiche d'une œuvre et sur celle
  // d'une bible : « libellé : valeur », une donnée par ligne (demande de l'auteur,
  // 2026-09-20 : « ça fait merdier »). Ils tenaient sur deux lignes de capitales
  // espacées, séparées de points médians, et l'on y lisait « Vers 160 · Latin » d'un
  // trait, sans que rien dise ce que chaque mot était.
  const langueAuteur = libelleLangue(auteur.langue_principale)
  const traditions = (auteur.traditions ?? []).filter(Boolean)
  const aReperes = Boolean(datesAuteur || langueAuteur || traditions.length > 0)

  // L'ordre et la colonne des dates viennent de `listeOeuvresAuteur` (charte § 38.33.1) :
  // les œuvres datées d'abord, puis les périodes, puis les mentions qu'on ne sait pas
  // dater, et une date qui redit celle de la rangée précédente se tait.
  const oeuvresPresentes = ordonnerOeuvresAuteur(auteur.oeuvres.filter(estOeuvrePubliee))
  const oeuvresAbsentes = ordonnerOeuvresAuteur(auteur.oeuvres.filter(o => !estOeuvrePubliee(o)))
  const datesPresentes = colonneDesDates(oeuvresPresentes)
  const datesAbsentes = colonneDesDates(oeuvresAbsentes)
  const aOeuvres = oeuvresPresentes.length > 0 || oeuvresAbsentes.length > 0
  const anecdotes = auteur.anecdotes?.trim() || null
  const influence = auteur.influence?.trim() || null
  const initiales = auteur.nom.split(/\s+/).map(m => m[0]).filter(Boolean).slice(0, 2).join('')

  // La colonne des dates est COMMUNE à toutes les rangées, et mesurée : voir
  // `useColonneCommune` — une grille alignait les titres, mais se rangeait tout entière
  // à côté de la chronologie.
  useColonneCommune(listeOeuvresRef, `${auteur.id_auteur}·${oeuvresPresentes.length}·${oeuvresAbsentes.length}`)

  return (
    <CorpsFiche
      className="cs-fiche-auteur"
      portrait={
        <PortraitFiche
          src={`${SUPABASE_URL}/storage/v1/object/public/auteurs/${auteur.id_auteur}.jpg`}
          styleImage={stylePhoto(parsePhotoPos(auteur.photo_position))}
          initiales={initiales}
          cle={`${auteur.id_auteur}·${auteur.nom}`} />
      }
      entete={
        /* ⛔ AUCUN SURTITRE (décision de l'auteur, 2026-09-20) : la fenêtre s'appelle déjà
           « À propos de cet auteur » — son nom accessible le dit —, et l'écrire au-dessus
           du nom ne l'apprenait à personne. Les deux autres fiches s'en étaient déjà
           défaites ; celle-ci reprend leur modèle jusqu'au bout. */
        <div className="cs-fiche-tete">
          <EnTeteFiche titre={auteur.nom} titreId={titreId} sousTitre={auteur.nom_original} />
          {aReperes ? (
            <dl className="cs-fiche-identite" aria-label="Repères sur l’auteur">
              <ChampFiche libelle="Dates">{datesAuteur ? rendreSiecles(datesAuteur) : null}</ChampFiche>
              <ChampFiche libelle="Langue">{langueAuteur || null}</ChampFiche>
              {/* Les traditions se séparent d'une virgule, non d'un point médian : c'est
                  une énumération, et elle est déjà nommée par son libellé. */}
              <ChampFiche libelle={`Tradition${traditions.length > 1 ? 's' : ''}`}>
                {traditions.length > 0 ? rendreSiecles(traditions.join(', ')) : null}
              </ChampFiche>
            </dl>
          ) : null}
        </div>
      }
      complement={evenements.length > 0 ? (
        <SectionFiche titre="Chronologie"><FriseAuteur evenements={evenements} /></SectionFiche>
      ) : null}
      /* Le pied court sous les DEUX colonnes : il ne relève ni de la vie ni de la
         chronologie, et il se tait tant qu'il n'a rien à dire. */
      pied={<PiedDeFiche pied={pied} />}
    >
      {auteur.note_biographique && (
        <SectionFiche titre="Vie"><p className="cs-notice-prose">{rendreEnrichi(auteur.note_biographique)}</p></SectionFiche>
      )}
      {/* ⚠️ Les anecdotes font 373 signes en médiane, soit cinq à six lignes : de la
          prose, justifiée et césurée comme sa voisine. ⚠️ En BLOC QUI FAIT CONTEXTE
          (globals.css) : à côté du portrait, son filet se poserait sous lui. */}
      {anecdotes && <p className="cs-fiche-anecdote cs-notice-italique">{rendreEnrichi(anecdotes)}</p>}
      {auteur.note_theologique && (
        <SectionFiche titre="Pensée"><p className="cs-notice-prose">{rendreEnrichi(auteur.note_theologique)}</p></SectionFiche>
      )}
      {influence && (
        <SectionFiche titre="Postérité"><p className="cs-notice-prose">{rendreEnrichi(influence)}</p></SectionFiche>
      )}
      {/* Les œuvres closent la colonne, dégagées du portrait : une fiche à courte
          biographie ne les rentre pas de cent quarante pixels. Contenu harmonisé avec la
          Chronologie : « année · titre » comme « année · événement ». */}
      {aOeuvres && (
        <SectionFiche titre="Œuvres" className="cs-fiche-section--degagee">
          <ul ref={listeOeuvresRef} className="cs-fiche-liste-colonne">
            {oeuvresPresentes.map((o, rang) => (
              <li key={o.id_oeuvre} className="cs-fiche-rangee-colonne">
                <CelluleDate cellule={datesPresentes[rang]} precision={o.date_composition_precision_affichage} encre="var(--cs-date)" encreVide="var(--cs-date-douce)" />
                {/* Œuvre disponible : titre en teinte sobre (pas vert), cliquable vers l'œuvre. */}
                <span style={{ lineHeight: 1.38 }}>
                  <Link href={`/oeuvre/${o.id_oeuvre}`} onClick={onClose} className="cs-fiche-oeuvre"
                    style={{ fontFamily: SERIF, fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.38 }}>{o.titre}</Link>
                  {/* Œuvre écrite à plusieurs : la fiche dit avec qui, sinon l'auteur
                      paraîtrait la signer seul. */}
                  <MentionCoAuteurs auteurs={o.auteurs} />
                </span>
              </li>
            ))}
            {oeuvresAbsentes.map((o, rang) => (
              <li key={o.id_oeuvre} className="cs-fiche-rangee-colonne">
                <CelluleDate cellule={datesAbsentes[rang]} precision={o.date_composition_precision_affichage} encre="var(--cs-date-douce)" encreVide="var(--cs-date-douce)" />
                {/* Œuvre répertoriée mais pas encore disponible : estompée, non cliquable. */}
                <span className="cs-fiche-oeuvre--absente" title="Œuvre répertoriée, pas encore disponible" style={{ lineHeight: 1.38 }}>
                  <span style={{ fontFamily: SERIF, fontSize: '0.78125rem', color: 'var(--cs-texte-doux)' }}>{o.titre}</span>
                  <MentionCoAuteurs auteurs={o.auteurs} />
                  <span style={{ marginLeft: '7px', fontSize: '0.625rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-texte-second)' }}>répertoriée</span>
                </span>
              </li>
            ))}
          </ul>
        </SectionFiche>
      )}
    </CorpsFiche>
  )
}

/**
 * `filAriane` : la fiche est ouverte par sa PROPRE ROUTE (`/auteur/[id]`), et elle y
 * porte le fil d'Ariane de la page. ⛔ Il vivait dans le gabarit de la route, donc SOUS
 * le voile de la fenêtre (audit ergonomique du 2026-09-21) : une ligne grisée, derrière
 * le calque, qu'on ne pouvait ni lire ni suivre. Il se pose désormais dans la fenêtre,
 * en tête, et ne paraît pas quand la fiche s'ouvre par-dessus une autre page.
 */
export default function ModaleAuteur({ id, onClose, filAriane = false }: { id: string | null; onClose: () => void; filAriane?: boolean }) {
  const titreId = useId()
  const [auteur, setAuteur] = useState<Auteur | null>(null)
  const [evenements, setEvenements] = useState<RangChrono[]>([])
  const [pied, setPied] = useState<PiedFiche>(PIED_VIDE)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!id) { setAuteur(null); setEvenements([]); setErreur(false); return }
    setAuteur(null); setEvenements([]); setErreur(false)
    // Les œuvres de l'auteur, CO-SIGNATURES COMPRISES : la liste vient des couples
    // (œuvre, auteur), et non du seul `id_auteur` de l'œuvre, qui n'en porte que
    // le premier. Si cette lecture échoue, on retombe sur l'ancien filtre plutôt
    // que d'afficher une fiche sans œuvre.
    chargerAuteursParOeuvre(supabase).then(auteursParOeuvre => {
      const idsDeLAuteur = Object.entries(auteursParOeuvre)
        .filter(([, auteurs]) => auteurs.some(a => a.id_auteur === id))
        .map(([idOeuvre]) => idOeuvre)
      const COLONNES = 'id_oeuvre, titre, sous_titre, trad_auteur, editeur, ville, acces_public, date_composition_affichage_courte, date_composition_precision_affichage, composition_debut_annee'
      const requeteOeuvres = idsDeLAuteur.length > 0
        ? supabase.from('v_oeuvres_dates').select(COLONNES).in('id_oeuvre', idsDeLAuteur)
        : supabase.from('v_oeuvres_dates').select(COLONNES).eq('id_auteur', id)
      return Promise.all([
        supabase.from('auteurs')
          .select('id_auteur, nom, nom_original, titre, dates, siecle, traditions, photo_position, note_biographique, note_theologique, langue_principale, anecdotes, influence')
          .eq('id_auteur', id).maybeSingle(),
        requeteOeuvres,
        Promise.resolve(auteursParOeuvre),
      ])
    }).then(([auteurResultat, oeuvresResultat, auteursParOeuvre]) => {
      if (auteurResultat.error || oeuvresResultat.error || !auteurResultat.data) { setErreur(true); return }
      const oeuvres = (oeuvresResultat.data ?? []).map(o => ({ ...o, auteurs: auteursParOeuvre[o.id_oeuvre] ?? [] }))
      setAuteur({ ...auteurResultat.data, oeuvres } as Auteur)
    })
    // Frise : la vue porte déjà l'ordre éditorial, la date rédigée, le type et
    // les sources. Les associations masquées en sont exclues à la source.
    supabase.from('v_chronologie_auteurs_dates').select('*')
      .eq('auteur_id', id).order('ordre_affichage')
      .then(({ data }) => setEvenements((data ?? []) as RangChrono[]))
  }, [id])

  // ── Le pied de fiche, EN SECONDE VAGUE ───────────────────────────────────────
  // ⛔ Il ne retarde pas la fiche : la notice, les œuvres et la frise partent seules
  // dans l'effet ci-dessus, et ces trois lectures viennent après, chacune tombant si
  // elle échoue. Une fenêtre d'auteur ne doit pas attendre un renseignement de pied.
  useEffect(() => {
    if (!id) { setPied(PIED_VIDE); return }
    let annule = false
    setPied(PIED_VIDE)
    Promise.all([
      // L'empreinte biblique passe par une fonction : l'agrégat est impossible en
      // PostgREST, et les politiques de `segments` et `liens_bibliques` sont des EXISTS
      // corrélés qu'un agrégat paierait 67 734 fois (voir la migration).
      supabase.rpc('empreinte_biblique_auteur', { p_id_auteur: id, p_limite: 6 }),
      // Le catalogue : MÊME garde que la Bibliothèque — pas encore sur le site, non
      // refusée. Trois titres suffisent, le compte exact vient de l'en-tête.
      supabase.from('v_catalogue_notices_dates')
        .select('id, titre_stable, traducteur, collection_nom, lieu_edition, editeur, annee_edition, date_edition_affichage_courte', { count: 'exact' })
        .eq('id_auteur', id).eq('presence_sur_le_site', false).eq('refuse_admin', false)
        .order('titre_stable').limit(3),
      // La bibliographie : l'auteur ancien y est la SOURCE, jamais le contributeur
      // savant. Même garde d'admissibilité que la page de péricope
      // (`bibliographie_admissible`) : ni rejeté, et retenu ou secondaire.
      // ⚠️ L'OUVRAGE est la table de tête, et la table des contributeurs n'est qu'une
      // jointure de filtrage : c'est la seule façon de trier et de compter sur les
      // colonnes de l'ouvrage. Prendre les contributeurs pour tête laissait le tri à
      // une ressource embarquée, où PostgREST ne range QUE l'embarqué — et l'on tirait
      // trois ouvrages au hasard. Les deux tables tiennent en mille lignes : le piège
      // du `!inner` sur `segments` (charte) ne s'applique pas ici.
      supabase.from('ouvrages_bibliographiques')
        .select('id, ouvrage_contributeurs_scientifiques!inner(auteur_id, role_contributeur)', { count: 'exact' })
        .eq('ouvrage_contributeurs_scientifiques.auteur_id', id)
        .eq('ouvrage_contributeurs_scientifiques.role_contributeur', 'auteur_source')
        .neq('statut_editorial', 'rejete')
        .in('statut_scientifique', ['retenu', 'secondaire'])
        .order('annee', { ascending: false, nullsFirst: false })
        .limit(3),
    ]).then(async ([empreinteRes, catalogueRes, biblioRes]) => {
      if (annule) return
      const brut = empreinteRes.data as Empreinte | null
      // ⚠️ Une SECONDE lecture, et elle ne part que s'il y a des ouvrages : la notice
      // complète vit dans `v_references_bibliographiques`, avec ses autorités résolues.
      // La première requête ne sert plus qu'à choisir LESQUELS.
      const idsOuvrages = biblioRes.error ? [] : ((biblioRes.data ?? []) as { id: number }[]).map(o => o.id)
      let notices: NoticeBibliographique[] = []
      if (idsOuvrages.length > 0) {
        try {
          const table = await chargerNoticesBibliographiques(supabase, idsOuvrages)
          notices = idsOuvrages.map(i => table.get(i)).filter((n): n is NoticeBibliographique => !!n)
        } catch (err) {
          console.error('[fiche auteur] bibliographie savante illisible', err)
        }
      }
      if (annule) return
      setPied({
        empreinte: empreinteRes.error ? null : brut,
        editions: catalogueRes.error ? [] : ((catalogueRes.data ?? []) as EditionCataloguee[]),
        nbEditions: catalogueRes.error ? 0 : (catalogueRes.count ?? 0),
        ouvrages: notices,
        nbOuvrages: notices.length === 0 ? 0 : (biblioRes.count ?? 0),
      })
    })
    return () => { annule = true }
  }, [id])

  if (!id) return null

  return (
    <ModaleFiche titreId={titreId} libelle="À propos de cet auteur" onFermer={onClose}>
      {erreur ? (
        <p style={{ fontFamily: SERIF, fontSize: '1rem', color: 'var(--cs-texte-doux)', textAlign: 'center', margin: '30px 0' }}>Auteur introuvable</p>
      ) : !auteur || auteur.id_auteur !== id ? (
        <MotAttente centre marge="30px 0" />
      ) : (
        <>
          {filAriane && (
            <FilAriane
              elements={[{ nom: 'Patristique', url: '/bibliotheque' }, { nom: auteur.nom, url: `/auteur/${auteur.id_auteur}` }]}
              style={{ padding: '0 0 0.75rem' }}
            />
          )}
          <Contenu auteur={auteur} onClose={onClose} evenements={evenements} pied={pied} titreId={titreId} />
        </>
      )}
    </ModaleFiche>
  )
}
