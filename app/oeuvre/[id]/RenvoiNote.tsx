'use client'

/**
 * LE RENVOI DE NOTE À NOTE — sa tête dynamique, son contrôle, et la note dépliée.
 *
 * Forme publique (charte § 13.20) :
 *   « Voir note {numéro affiché} de {titre de niveau 1} : » puis « Afficher la note visée ».
 * Au clic, la note visée se déplie SOUS le bloc qui porte le renvoi, rendue par le
 * composant ordinaire des notes. ⛔ Ce module ne l'importe pas : il le REÇOIT
 * (`rendreNote`), parce que le renvoi vit DANS une note et que l'import se nouerait en
 * cycle. C'est la même raison qui a sorti l'intitulé du sommaire d'`appelNote`.
 *
 * ⛔ RIEN DE LA TÊTE N'EST LU DANS LA RELATION. Son numéro et son titre arrivent résolus
 * par le chargeur (`renvoisNotesChargement.ts`) ; faute de tête — le volet patristique
 * n'en résout pas —, ils se demandent à la route `/api/notes/renvoi`, par l'identité de la
 * note visée et par rien d'autre.
 * ⛔ LE CONTENU SE PREND D'ABORD DANS LES NOTES QUE LA PAGE PORTE DÉJÀ
 * (`ProvisionNotesConnues`), sous la même identité ; sinon à la route. Jamais par un
 * numéro, une lettre ou une page.
 * ⛔ UNE NOTE DÉJÀ OUVERTE DANS LA CHAÎNE NE SE ROUVRE PAS (`etatDuDeploiement`) : A → B → A
 * s'arrête au second A, et la profondeur n'est qu'une sécurité de plus.
 */

import {
  Fragment, createContext, useCallback, useContext, useEffect, useId, useMemo, useState,
  type ReactNode,
} from 'react'
import type { NoteStructuree } from './oeuvreTypes'
import { intituleEnTexteNu, rendreIntituleDeSommaire } from './intituleSommaire'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import {
  LIBELLE_AFFICHER_NOTE_VISEE,
  LIBELLE_MASQUER_NOTE_VISEE,
  cleDuRenvoi,
  cleIdentiteNote,
  etatDuDeploiement,
  morceauxDeMention,
  morceauxDeTete,
  morceauxEnTexte,
  type EtatDeploiement,
  type GroupeDeRenvois,
  type IdentiteNote,
  type MorceauxTete,
  type RenvoiNoteData,
  type TeteRenvoi,
  type Verbe,
} from '@/app/lib/renvoisNotes'

/** Les signes invisibles s'écrivent par leur code : une source ne les relit pas. */
const FINE = String.fromCharCode(0x202f)
/** Deux renvois d'une même citation imprimée (« les notes V et X ») : deux injonctions. */
const ENTRE_INJONCTIONS = `${FINE}; `
/** Deux mentions dans une même phrase (« dans les notes V et X que… »). */
const ENTRE_MENTIONS = ' et '

// ── LES NOTES QUE LA PAGE PORTE DÉJÀ ─────────────────────────────────────────────

/** Les notes connues de la page, par identité (`cleIdentiteNote`). */
export type RegistreDesNotes = ReadonlyMap<string, NoteStructuree>

const NotesConnues = createContext<RegistreDesNotes | null>(null)

/** Le registre d'une page, à partir de ses notes rangées par segment puis par marqueur.
 *  ⚠️ Une note rappelée d'un segment à l'autre y paraît deux fois : la première suffit,
 *  c'est le même objet. */
export function registreDesNotes(
  sources: readonly { idTexte: string | null | undefined; notes: Record<string, Record<string, NoteStructuree>> | null | undefined }[],
): Map<string, NoteStructuree> {
  const registre = new Map<string, NoteStructuree>()
  for (const source of sources) {
    if (!source.idTexte || !source.notes) continue
    for (const parMarqueur of Object.values(source.notes)) {
      for (const note of Object.values(parMarqueur)) {
        const cle = cleIdentiteNote({ idTexte: source.idTexte, noteKey: note.noteKey })
        if (!registre.has(cle)) registre.set(cle, note)
      }
    }
  }
  return registre
}

export function ProvisionNotesConnues({ registre, children }: { registre: RegistreDesNotes; children: ReactNode }) {
  return <NotesConnues.Provider value={registre}>{children}</NotesConnues.Provider>
}

// ── LA ROUTE, POUR CE QUE LA PAGE NE PORTE PAS ───────────────────────────────────

export type ReponseRenvoi = { tete: TeteRenvoi; note: NoteStructuree | null }

function estReponseRenvoi(valeur: unknown): valeur is ReponseRenvoi {
  if (!valeur || typeof valeur !== 'object') return false
  const { tete, note } = valeur as { tete?: unknown; note?: unknown }
  if (!tete || typeof tete !== 'object' || typeof (tete as { etat?: unknown }).etat !== 'string') return false
  return note === null || (typeof note === 'object' && Array.isArray((note as { blocks?: unknown }).blocks))
}

/**
 * La tête et la note visée, demandées à la route.
 *
 * ⛔ Le verrou de bêta ne répond pas par une erreur : il REDIRIGE, et `fetch` suit — une
 * page HTML revient alors en 200. La réponse n'est donc crue que si elle n'a pas été
 * redirigée et qu'elle est du JSON (règle des routes d'administration, qui vaut ici).
 * ⚠️ Une note que ce lecteur ne peut pas lire rend 404 comme une note qui n'existe pas.
 */
export async function chargerDepuisLaRoute(cible: IdentiteNote, faire: typeof fetch = fetch): Promise<ReponseRenvoi> {
  const adresse = `/api/notes/renvoi?texte=${encodeURIComponent(cible.idTexte)}&note=${encodeURIComponent(cible.noteKey)}`
  const reponse = await faire(adresse, { cache: 'no-store', headers: { accept: 'application/json' } })
  const type = reponse.headers.get('content-type') ?? ''
  if (reponse.redirected || !type.includes('application/json')) {
    throw new Error(`réponse inattendue de la route des renvois (${reponse.status})`)
  }
  const corps: unknown = await reponse.json()
  if (reponse.status === 404) {
    const tete = estReponseRenvoi(corps) ? corps.tete : { etat: 'introuvable' as const }
    return { tete, note: null }
  }
  if (!reponse.ok) throw new Error(`la route des renvois a répondu ${reponse.status}`)
  if (!estReponseRenvoi(corps)) throw new Error('réponse de la route des renvois mal formée')
  return corps
}

/** Une demande par note visée pour la durée de la page. ⚠️ Un échec s'oublie aussitôt,
 *  pour qu'un second essai reparte ; ce n'est pas un cache partagé entre lecteurs : il vit
 *  dans l'onglet, sous la session de celui qui lit. */
const DEMANDES = new Map<string, Promise<ReponseRenvoi>>()

export function demanderLaNoteVisee(cible: IdentiteNote): Promise<ReponseRenvoi> {
  const cle = cleIdentiteNote(cible)
  const deja = DEMANDES.get(cle)
  if (deja) return deja
  const demande = chargerDepuisLaRoute(cible)
  DEMANDES.set(cle, demande)
  demande.catch(() => { if (DEMANDES.get(cle) === demande) DEMANDES.delete(cle) })
  return demande
}

function oublierLaNoteVisee(cible: IdentiteNote) {
  DEMANDES.delete(cleIdentiteNote(cible))
}

/** La tête d'un renvoi : celle du chargeur quand il l'a résolue, sinon celle de la route.
 *  `undefined` tant qu'on l'attend. */
function useTeteDuRenvoi(renvoi: RenvoiNoteData): TeteRenvoi | undefined {
  const { idTexte, noteKey } = renvoi.cible
  const cle = cleIdentiteNote(renvoi.cible)
  const aResoudre = renvoi.tete === undefined
  const [lue, setLue] = useState<{ pour: string; tete: TeteRenvoi } | null>(null)
  useEffect(() => {
    if (!aResoudre) return
    let vivant = true
    demanderLaNoteVisee({ idTexte, noteKey })
      .then(reponse => { if (vivant) setLue({ pour: `${idTexte}|${noteKey}`, tete: reponse.tete }) })
      .catch(erreur => {
        console.error(`[renvois] tête illisible (${idTexte} | ${noteKey}) :`, erreur)
        if (vivant) setLue({ pour: `${idTexte}|${noteKey}`, tete: { etat: 'erreur' } })
      })
    return () => { vivant = false }
  }, [aResoudre, idTexte, noteKey])
  if (!aResoudre) return renvoi.tete
  return lue?.pour === cle ? lue.tete : undefined
}

type LectureNoteVisee =
  | { etat: 'attente' }
  | { etat: 'prete'; note: NoteStructuree }
  | { etat: 'introuvable' }
  | { etat: 'erreur' }

/** La note visée : dans le registre de la page, sinon à la route. ⚠️ L'attente se DÉDUIT
 *  d'une clé posée avec la réponse ; rien ne se remet à zéro dans le corps d'un effet. */
function useNoteVisee(cible: IdentiteNote, demandee: boolean): { lecture: LectureNoteVisee; reessayer: () => void } {
  const { idTexte, noteKey } = cible
  const registre = useContext(NotesConnues)
  const cle = cleIdentiteNote(cible)
  const connue = registre?.get(cle) ?? null
  const [essai, setEssai] = useState(0)
  const [lue, setLue] = useState<{ pour: string; essai: number; lecture: LectureNoteVisee } | null>(null)
  const aCharger = demandee && !connue
  useEffect(() => {
    if (!aCharger) return
    let vivant = true
    const pour = `${idTexte}|${noteKey}`
    demanderLaNoteVisee({ idTexte, noteKey })
      .then(reponse => {
        if (vivant) setLue({ pour, essai, lecture: reponse.note ? { etat: 'prete', note: reponse.note } : { etat: 'introuvable' } })
      })
      .catch(erreur => {
        console.error(`[renvois] note visée illisible (${idTexte} | ${noteKey}) :`, erreur)
        if (vivant) setLue({ pour, essai, lecture: { etat: 'erreur' } })
      })
    return () => { vivant = false }
  }, [aCharger, idTexte, noteKey, essai])
  const reessayer = useCallback(() => {
    oublierLaNoteVisee({ idTexte, noteKey })
    setEssai(n => n + 1)
  }, [idTexte, noteKey])
  if (connue) return { lecture: { etat: 'prete', note: connue }, reessayer }
  if (!lue || lue.pour !== cle || lue.essai !== essai) return { lecture: { etat: 'attente' }, reessayer }
  return { lecture: lue.lecture, reessayer }
}

// ── LA CHAÎNE DES NOTES OUVERTES, ET CE QUI EST OUVERT DANS UNE NOTE ─────────────

/** Les notes déjà ouvertes AU-DESSUS de la note rendue, par identité. ⛔ La note rendue
 *  elle-même n'y est pas : `etatDuDeploiement` l'ajoute. */
const CheminDesNotes = createContext<readonly string[]>([])

/** La chaîne posée à la main. ⚠️ La page ne s'en sert pas — un dépliage la prolonge de
 *  lui-même — mais une planche ou un test ne cliquent pas. */
export function ProvisionCheminDesNotes({ chemin, children }: { chemin: readonly string[]; children: ReactNode }) {
  return <CheminDesNotes.Provider value={chemin}>{children}</CheminDesNotes.Provider>
}

type EtatDesRenvois = {
  ouverts: ReadonlySet<string>
  basculer: (cle: string) => void
  prefixe: string
}

const RenvoisDeLaNote = createContext<EtatDesRenvois | null>(null)

/** Ce qui est déplié dans UNE note. Chaque note rendue porte le sien : une note ouverte
 *  dans une autre ne partage pas ses dépliages avec elle. ⚠️ `ouvertsInitiaux` sert les
 *  planches et les tests, qui ne cliquent pas ; la page part toujours tout fermé. */
export function ProvisionRenvois({ children, ouvertsInitiaux }: { children: ReactNode; ouvertsInitiaux?: readonly string[] }) {
  const prefixe = useId().replace(/[^A-Za-z0-9_-]/g, '')
  const [ouverts, setOuverts] = useState<ReadonlySet<string>>(() => new Set(ouvertsInitiaux ?? []))
  const basculer = useCallback((cle: string) => {
    setOuverts(avant => {
      const apres = new Set(avant)
      if (apres.has(cle)) apres.delete(cle)
      else apres.add(cle)
      return apres
    })
  }, [])
  const valeur = useMemo(() => ({ ouverts, basculer, prefixe }), [ouverts, basculer, prefixe])
  return <RenvoisDeLaNote.Provider value={valeur}>{children}</RenvoisDeLaNote.Provider>
}

/** L'identifiant du volet déplié d'un renvoi. ⚠️ Assaini : une clé de bloc porte des
 *  deux-points, et un identifiant se relit mieux sans. */
function idDuDepliage(prefixe: string, renvoi: RenvoiNoteData): string {
  const bloc = renvoi.blocId.replace(/[^A-Za-z0-9_-]/g, '')
  return `renvoi-${prefixe}-${bloc}-${renvoi.rang}`
}

// ── LA TÊTE ───────────────────────────────────────────────────────────────────

function MorceauxRendus({ morceaux }: { morceaux: MorceauxTete }) {
  return (
    <>
      {morceaux.avantTitre}
      {morceaux.titre === null ? null : rendreIntituleDeSommaire(morceaux.titre)}
      {morceaux.apresTitre}
    </>
  )
}

function ArretDuRenvoi({ etat }: { etat: Exclude<EtatDeploiement, 'libre'> }) {
  return (
    <span className="cs-renvoi-arret" data-renvoi-arret={etat}>
      {etat === 'cycle' ? 'note déjà ouverte plus haut' : 'trop de notes ouvertes l’une dans l’autre'}
    </span>
  )
}

/** « Voir note 10 de Seconde catéchèse : Afficher la note visée ». */
function TeteEtControle({ renvoi, verbe }: { renvoi: RenvoiNoteData; verbe: Verbe }) {
  const tete = useTeteDuRenvoi(renvoi)
  const chemin = useContext(CheminDesNotes)
  const etatDesRenvois = useContext(RenvoisDeLaNote)
  const cle = cleDuRenvoi(renvoi)
  const ouvert = etatDesRenvois?.ouverts.has(cle) ?? false
  const deploiement = etatDuDeploiement(chemin, renvoi)
  const introuvable = tete?.etat === 'introuvable'
  return (
    <span
      className="cs-renvoi-tete"
      data-renvoi-cible={renvoi.cible.noteKey}
      data-renvoi-tete={tete?.etat ?? 'attente'}
    >
      <MorceauxRendus morceaux={morceauxDeTete(tete, verbe, !introuvable)} />
      {introuvable || !etatDesRenvois ? null : (
        <>
          {' '}
          {deploiement === 'libre' ? (
            <button
              type="button"
              className="cs-lien-phrase cs-renvoi-controle"
              aria-expanded={ouvert}
              // ⚠️ `aria-controls` ne désigne que ce qui EXISTE : le volet n'est rendu
              // qu'ouvert (règle de `NoteDuVolet`).
              aria-controls={ouvert ? idDuDepliage(etatDesRenvois.prefixe, renvoi) : undefined}
              onClick={event => { event.stopPropagation(); etatDesRenvois.basculer(cle) }}
            >
              {ouvert ? LIBELLE_MASQUER_NOTE_VISEE : LIBELLE_AFFICHER_NOTE_VISEE}
            </button>
          ) : <ArretDuRenvoi etat={deploiement} />}
        </>
      )}
    </span>
  )
}

/** « note 10 de Seconde catéchèse » : ce que la phrase garde d'un `inline_mention`. */
function MentionDuRenvoi({ renvoi }: { renvoi: RenvoiNoteData }) {
  const tete = useTeteDuRenvoi(renvoi)
  return (
    <span className="cs-renvoi-mention" data-renvoi-cible={renvoi.cible.noteKey} data-renvoi-tete={tete?.etat ?? 'attente'}>
      <MorceauxRendus morceaux={morceauxDeMention(tete)} />
    </span>
  )
}

/**
 * La citation imprimée, remplacée DANS le texte du bloc.
 *
 * `note_preview` : la tête et son contrôle prennent la place de la citation.
 * `inline_mention` : la phrase garde une mention dynamique, et la tête se pose sous le
 * bloc (`RenvoisSousLeBloc`). ⛔ Dans les deux cas, la forme imprimée ne paraît plus : elle
 * reste en provenance dans `source_citation`.
 */
export function RenvoisDansLeTexte({ groupe, verbe }: { groupe: GroupeDeRenvois; verbe: Verbe }) {
  const mention = groupe.mode === 'inline_mention'
  return (
    <span className="cs-renvoi" data-renvoi-mode={groupe.mode}>
      {groupe.renvois.map((renvoi, rang) => (
        <Fragment key={cleDuRenvoi(renvoi)}>
          {rang === 0 ? null : mention ? ENTRE_MENTIONS : ENTRE_INJONCTIONS}
          {mention
            ? <MentionDuRenvoi renvoi={renvoi} />
            : <TeteEtControle renvoi={renvoi} verbe={rang === 0 ? verbe : 'voir'} />}
        </Fragment>
      ))}
    </span>
  )
}

// ── SOUS LE BLOC : les têtes des mentions, et les notes dépliées ──────────────────

function capitale(texte: string): string {
  return texte.charAt(0).toUpperCase() + texte.slice(1)
}

function DepliageDuRenvoi({ renvoi, id, rendreNote }: {
  renvoi: RenvoiNoteData
  id: string
  rendreNote: (note: NoteStructuree) => ReactNode
}) {
  const chemin = useContext(CheminDesNotes)
  const deploiement = etatDuDeploiement(chemin, renvoi)
  const { lecture, reessayer } = useNoteVisee(renvoi.cible, deploiement === 'libre')
  const tete = useTeteDuRenvoi(renvoi)
  const cheminSuivant = useMemo(() => [...chemin, cleIdentiteNote(renvoi.source)], [chemin, renvoi.source])
  const nom = capitale(morceauxEnTexte(morceauxDeMention(tete), intituleEnTexteNu))
  let contenu: ReactNode = null
  if (deploiement !== 'libre') contenu = <p className="cs-renvoi-etat"><ArretDuRenvoi etat={deploiement} /></p>
  else if (lecture.etat === 'attente') contenu = <div role="status"><MotAttente marge={0}>Chargement de la note visée…</MotAttente></div>
  else if (lecture.etat === 'erreur') {
    contenu = (
      <p className="cs-renvoi-etat" role="alert">
        La note visée n’a pas pu être chargée.{' '}
        <button type="button" className="cs-lien-phrase" onClick={event => { event.stopPropagation(); reessayer() }}>Réessayer</button>
      </p>
    )
  } else if (lecture.etat === 'introuvable') contenu = <p className="cs-renvoi-etat">La note visée est introuvable.</p>
  else contenu = <CheminDesNotes.Provider value={cheminSuivant}>{rendreNote(lecture.note)}</CheminDesNotes.Provider>
  return (
    <div
      id={id}
      role="region"
      aria-label={nom}
      className="cs-renvoi-depliage"
      data-renvoi-cible={renvoi.cible.noteKey}
      data-renvoi-lecture={deploiement === 'libre' ? lecture.etat : deploiement}
    >
      {contenu}
    </div>
  )
}

/**
 * Sous le bloc qui porte les renvois, dans l'ordre de lecture : la tête de chaque
 * `inline_mention`, toujours ; la note dépliée de chaque renvoi ouvert.
 */
export function RenvoisSousLeBloc({ renvois, rendreNote }: {
  renvois: readonly RenvoiNoteData[]
  rendreNote: (note: NoteStructuree) => ReactNode
}) {
  const etatDesRenvois = useContext(RenvoisDeLaNote)
  const ordonnes = [...renvois].sort((a, b) => a.rang - b.rang)
  const visibles = ordonnes.filter(renvoi =>
    renvoi.mode === 'inline_mention' || (etatDesRenvois?.ouverts.has(cleDuRenvoi(renvoi)) ?? false))
  if (visibles.length === 0 || !etatDesRenvois) return null
  return (
    <>
      {visibles.map(renvoi => {
        const cle = cleDuRenvoi(renvoi)
        return (
          <Fragment key={cle}>
            {renvoi.mode === 'inline_mention' ? (
              <p className="cs-renvoi-ligne"><TeteEtControle renvoi={renvoi} verbe="Voir" /></p>
            ) : null}
            {etatDesRenvois.ouverts.has(cle) ? (
              <DepliageDuRenvoi renvoi={renvoi} id={idDuDepliage(etatDesRenvois.prefixe, renvoi)} rendreNote={rendreNote} />
            ) : null}
          </Fragment>
        )
      })}
    </>
  )
}
