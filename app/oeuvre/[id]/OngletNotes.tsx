'use client'
/**
 * L'INVENTAIRE DES NOTES — outil d'administration, troisième onglet du volet de droite.
 *
 * ⛔ IL EST EXHAUSTIF SUR LE TEXTE ENTIER, non sur la division qu'on lit : c'est tout son
 * objet. Les notes sont déjà en mémoire — `chargerNotesStructurees` les lit toutes au
 * premier rendu — et la seule lecture qu'il ajoute est la PLACE de chacune, division et
 * rang de segment, que la page ne connaît que pour la division ouverte.
 *
 * ⛔ ET EN LECTURE EN REGARD, IL PORTE LES DEUX TEXTES (demande de l'auteur, 2026-09-12 :
 * « en mode latin-français, il faut afficher toutes les notes, des deux textes »). Le
 * lecteur a deux appareils sous les yeux — le *Manuel pour mon fils* de Dhuoda met 258
 * notes de la traduction en face des 1 535 de Bondurand — et l'inventaire n'en montrait
 * qu'un, sans le dire. Chaque source garde son ordre de lecture et ses divisions : le
 * latin dit « Liber I » où le français dit « Livre I ».
 *
 * ⛔ Réservé à l'administrateur. Il montre `needs_review`, les ancres orphelines et les
 * notes qu'aucune ancre ne désigne : ce sont des faits d'atelier, non de lecture.
 *
 * ⚠️ La règle — recensement, tri, filtres, aperçu — vit dans `notesInventaire.ts`, pure et
 * testée. Ce composant ne fait que la montrer et rendre le clic.
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import { surfaceDuSegment } from '@/app/lib/oeuvreSelects'
import { rendreTexteEnrichi } from './texteEnrichi'
import {
  clesDesNotes,
  comptesParIntitule,
  comptesParSource,
  filtrerNotes,
  grouperParDivision,
  ordreDivisionsDesPlaces,
  recenserSources,
  SANS_INTITULE,
  type NoteRecensee,
  type PlaceSegment,
  type SourceDeNotes,
} from './notesInventaire'
import type { NoteStructuree } from './oeuvreTypes'

/**
 * UN TEXTE dont l'inventaire relève les notes.
 *
 * ⚠️ `ordreDivisions` est FACULTATIF : le texte lu connaît le sien (c'est le sommaire),
 * le texte en regard ne l'a jamais chargé et le tire de ses propres places.
 */
export type SourceInventaire = {
  idTexte: string
  /** Le mot qui désigne ce texte au lecteur — sa langue, le plus souvent. */
  libelle: string
  notesStructurees: Record<string, Record<string, NoteStructuree>>
  ordreDivisions?: readonly string[]
  /** ⛔ L'APPARAT DE CE TEXTE NE SE COMPOSE PAS DANS LA VUE COURANTE. La lecture en
   *  regard ne rend que les deux CORPS : la vue de l'apparat, elle, est celle du texte
   *  lu. Une note du texte en regard ancrée dans son apparat se recense donc — un
   *  inventaire d'atelier est exhaustif — mais elle ne s'ouvre pas, et la ligne le dit
   *  au lieu de ne rien faire. ⚠️ Aucune note du corpus n'est dans ce cas au 12 septembre
   *  2026 : les 2 026 notes du latin des Confessions sont toutes ancrées au corps. */
  sansApparat?: boolean
}

type LigneSegment = {
  id: number
  segment_key: string | null
  ref_niv1: string | null
  ref_niv1_texte: string | null
  segment_numero: number
  espace_textuel: string | null
  nature: string | null
}

type Etat =
  | { statut: 'attente' }
  | { statut: 'erreur'; message: string }
  | { statut: 'prêt'; notes: NoteRecensee[]; sansAncre: number }

/** ⚠️ La clé de la demande, posée AVEC le résultat : l'attente se DÉDUIT, elle ne
 *  s'allume pas dans un effet (patron de la Polyglotte et de la page de recherche). */
type Charge = { pour: string; etat: Etat }

/** Ce que l'inventaire va chercher pour UNE source : la place de chaque note, et le
 *  compte de ce que le texte porte, toutes ancres confondues. */
async function situerLaSource(source: SourceInventaire): Promise<{ pour: SourceDeNotes; enBase: number | null }> {
  // ⛔ On ne charge JAMAIS tous les segments du texte : la Somme théologique en compte
  // 32 367. On ne situe que les clés qu'une ancre désigne, par lots d'octets d'adresse
  // (`lotsPourClauseIn`) — une clause `in` non découpée franchit les ~25 ko que la
  // passerelle accepte, et se fait refuser d'un « 400 » nu.
  const lignes: LigneSegment[] = []
  for (const lot of lotsPourClauseIn(clesDesNotes(source.notesStructurees))) {
    const { data, error } = await supabase
      .from('segments')
      .select('id,segment_key,ref_niv1,ref_niv1_texte,segment_numero,espace_textuel,nature')
      .eq('id_texte', source.idTexte)
      .in('segment_key', lot)
    if (error) throw error
    lignes.push(...((data ?? []) as LigneSegment[]))
  }
  // Le compte des notes que le texte porte, toutes ancres confondues : la différence
  // avec le recensement dit combien n'ont AUCUNE ancre, donc ne paraissent nulle part.
  const { count, error: erreurCompte } = await supabase
    .from('texte_notes')
    .select('note_key', { count: 'exact', head: true })
    .eq('id_texte', source.idTexte)
  if (erreurCompte) throw erreurCompte

  const places = new Map<string, PlaceSegment>()
  for (const l of lignes) {
    if (!l.segment_key) continue
    places.set(l.segment_key, {
      id: l.id,
      segmentKey: l.segment_key,
      division: (l.ref_niv1 ?? '').trim(),
      divisionTexte: l.ref_niv1_texte,
      segmentNumero: l.segment_numero,
      surface: surfaceDuSegment(l) === 'apparat' ? 'apparat' : 'corps',
    })
  }
  return {
    pour: {
      idTexte: source.idTexte,
      libelle: source.libelle,
      notesParSegment: source.notesStructurees,
      places,
      ordreDivisions: source.ordreDivisions ?? ordreDivisionsDesPlaces(places),
    },
    enBase: count,
  }
}

export default function OngletNotes({
  sources,
  noteCourante,
  onAller,
}: {
  /** Les textes à relever, dans l'ordre où le lecteur voit ses colonnes. */
  sources: readonly SourceInventaire[]
  /** La note qu'on vient d'ouvrir, pour la marquer dans la liste. ⚠️ C'est le COUPLE
   *  (texte, clé) qui fait l'identité : deux textes peuvent numéroter leurs notes de la
   *  même façon. */
  noteCourante: { idTexte: string; cle: string } | null
  onAller: (note: NoteRecensee) => void
}) {
  const [charge, setCharge] = useState<Charge | null>(null)
  const [recherche, setRecherche] = useState('')
  const [intitule, setIntitule] = useState<string | null>(null)
  const [sourceRetenue, setSourceRetenue] = useState<string | null>(null)
  const [aRevoir, setARevoir] = useState(false)
  const [sansPlace, setSansPlace] = useState(false)

  const cleDemande = useMemo(
    () => sources.map(s => `${s.idTexte}|${clesDesNotes(s.notesStructurees).length}`).join('§'),
    [sources],
  )

  useEffect(() => {
    let annule = false
    const lire = async () => {
      const situees = await Promise.all(sources.map(situerLaSource))
      const notes = recenserSources(situees.map(s => s.pour))
      const recensees = new Map(comptesParSource(notes).map(c => [c.source.idTexte, c.n]))
      const sansAncre = situees.reduce((total, s) => {
        const vues = recensees.get(s.pour.idTexte) ?? 0
        return total + Math.max(0, (s.enBase ?? vues) - vues)
      }, 0)
      return { notes, sansAncre }
    }

    lire()
      .then(r => { if (!annule) setCharge({ pour: cleDemande, etat: { statut: 'prêt', ...r } }) })
      .catch((erreur: unknown) => {
        console.error(`Inventaire des notes illisible (${cleDemande}) :`, erreur)
        if (!annule) setCharge({ pour: cleDemande, etat: { statut: 'erreur', message: 'Les notes n’ont pas pu être relevées.' } })
      })
    return () => { annule = true }
  }, [cleDemande, sources])

  const etat = useMemo<Etat>(() => (charge?.pour === cleDemande ? charge.etat : { statut: 'attente' }), [charge, cleDemande])
  // ⚠️ Mémorisée : une liste vide fabriquée à chaque rendu ferait recalculer les facettes
  // et les filtres à chaque frappe, sur des milliers de notes.
  const toutes = useMemo(() => (etat.statut === 'prêt' ? etat.notes : []), [etat])
  const facettes = useMemo(() => comptesParIntitule(toutes), [toutes])
  const facettesTexte = useMemo(() => comptesParSource(toutes), [toutes])
  const retenues = useMemo(
    () => filtrerNotes(toutes, { texte: recherche, intitule, source: sourceRetenue, aRevoir, sansPlace }),
    [toutes, recherche, intitule, sourceRetenue, aRevoir, sansPlace],
  )
  const groupes = useMemo(() => grouperParDivision(retenues), [retenues])
  const filtre = Boolean(recherche.trim()) || intitule !== null || sourceRetenue !== null || aRevoir || sansPlace
  // ⚠️ Le libellé d'un texte ne paraît que s'il DISTINGUE : en lecture ordinaire il n'y
  // a qu'un appareil, et le nommer sur chaque rubrique ne renseignerait personne.
  const plusieursTextes = sources.length > 1
  const apparatHorsVue = useMemo(
    () => new Set(sources.filter(s => s.sansApparat).map(s => s.idTexte)),
    [sources],
  )

  if (etat.statut === 'attente') return <MotAttente />
  if (etat.statut === 'erreur') {
    return (
      <p role="alert" style={{ fontSize: '0.6875rem', lineHeight: 1.5, color: 'var(--cs-danger-fonce)', padding: '12px 0' }}>
        {etat.message}
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div style={{ flexShrink: 0, padding: '10px 0 8px', borderBottom: '1px solid var(--cs-fond-doux)' }}>
        <input
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          placeholder="Chercher une note, ou son numéro…"
          aria-label="Chercher dans les notes"
          className="cs-volet-recherche"
          style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.71875rem', color: 'var(--cs-texte)' }}
        />

        {/* ⚠️ Le TEXTE se choisit sur son propre rang : c'est une question d'un autre
            ordre que le type d'une note, et les mêler ferait deux axes dans un rang. */}
        {plusieursTextes && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
            <Pastille actif={sourceRetenue === null} onClick={() => setSourceRetenue(null)}>
              {sources.length === 2 ? 'Les deux textes' : 'Tous les textes'} <Compte n={toutes.length} />
            </Pastille>
            {facettesTexte.map(f => (
              <Pastille key={f.source.idTexte} actif={sourceRetenue === f.source.idTexte} onClick={() => setSourceRetenue(sourceRetenue === f.source.idTexte ? null : f.source.idTexte)}>
                {f.source.libelle} <Compte n={f.n} />
              </Pastille>
            ))}
          </div>
        )}

        {/* ⚠️ Une facette dit ce qu'elle AJOUTERAIT : les comptes se prennent sur le
            recensement entier, jamais sur la liste déjà filtrée. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
          <Pastille actif={intitule === null} onClick={() => setIntitule(null)}>
            Toutes <Compte n={toutes.length} />
          </Pastille>
          {facettes.map(f => (
            <Pastille key={f.intitule} actif={intitule === f.intitule} onClick={() => setIntitule(intitule === f.intitule ? null : f.intitule)}>
              {f.intitule === SANS_INTITULE ? 'Sans type' : f.intitule} <Compte n={f.n} />
            </Pastille>
          ))}
          <Pastille actif={aRevoir} onClick={() => setARevoir(!aRevoir)} alerte>
            À relire <Compte n={toutes.filter(n => n.aRevoir).length} />
          </Pastille>
          <Pastille actif={sansPlace} onClick={() => setSansPlace(!sansPlace)} alerte>
            Ancre orpheline <Compte n={toutes.filter(n => !n.place).length} />
          </Pastille>
        </div>

        <p style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-second)', margin: '8px 0 0', lineHeight: 1.4 }}>
          {filtre
            ? `${retenues.length} note${retenues.length > 1 ? 's' : ''} sur ${toutes.length}`
            : `${toutes.length} note${toutes.length > 1 ? 's' : ''} dans ${plusieursTextes ? (sources.length === 2 ? 'les deux textes' : 'ces textes') : 'ce texte'}`}
          {etat.sansAncre > 0 && (
            <>
              {' · '}
              <span style={{ color: 'var(--cs-danger-fonce)' }}>
                {etat.sansAncre} sans aucune ancre, donc jamais affichée{etat.sansAncre > 1 ? 's' : ''}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="cs-defilement-discret" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 0 16px' }}>
        {retenues.length === 0 && (
          <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', padding: '14px 0' }}>
            Aucune note ne correspond aux filtres retenus.
          </p>
        )}
        {groupes.map(groupe => (
          // ⛔ La clé du groupe est le couple (texte, division), jamais la division seule :
          // les « Prolégomènes » de Dhuoda s'écrivent ainsi des deux côtés.
          <section key={groupe.cle}>
            <p style={{ ...RUBRIQUE_AXE, margin: '12px 0 4px' }}>
              {plusieursTextes && (
                <span style={{ color: 'var(--cs-texte-faible)' }}>{groupe.source.libelle} · </span>
              )}
              {groupe.division || 'Sans division'}
            </p>
            {groupe.notes.map(note => (
              <LigneNote
                key={`${note.source.idTexte}|${note.cle}`}
                note={note}
                courante={note.cle === noteCourante?.cle && note.source.idTexte === noteCourante.idTexte}
                horsVue={note.place?.surface === 'apparat' && apparatHorsVue.has(note.source.idTexte)}
                onAller={onAller}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function Compte({ n }: { n: number }) {
  return <span style={{ color: 'var(--cs-texte-doux)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
}

function Pastille({ actif, alerte, onClick, children }: {
  actif: boolean
  alerte?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const teinte = alerte ? 'var(--cs-danger-fonce)' : 'var(--cs-vert)'
  return (
    <button type="button" onClick={onClick} aria-pressed={actif}
      style={{
        fontSize: '0.625rem', lineHeight: 1.2, padding: '4px 8px', borderRadius: '4px',
        border: `1px solid ${actif ? teinte : 'var(--cs-bord)'}`,
        background: actif ? 'var(--cs-vert-pale)' : 'var(--cs-surface)',
        color: actif ? teinte : 'var(--cs-texte-second)',
        cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'baseline',
      }}>
      {children}
    </button>
  )
}

/**
 * Une note de l'inventaire.
 *
 * ⛔ C'est un BOUTON, non un bloc cliquable : le clavier l'atteint, et le nom accessible
 * dit où il mène. Le site en compte assez de l'autre sorte (77 relevés à l'audit du
 * 2 septembre 2026) pour ne pas en ajouter un.
 */
function LigneNote({ note, courante, horsVue, onAller }: {
  note: NoteRecensee
  courante: boolean
  /** Sa place existe, mais la vue courante ne la compose pas : le bouton se tait. */
  horsVue?: boolean
  onAller: (note: NoteRecensee) => void
}) {
  const atteignable = note.place !== null && !horsVue
  const pourquoiMuet = note.place === null
    ? 'Cette note n’est ancrée sur aucun segment retrouvé'
    : 'L’apparat du texte en regard ne se lit pas dans cette vue'
  return (
    <button
      type="button"
      disabled={!atteignable}
      onClick={() => onAller(note)}
      aria-label={atteignable ? `Ouvrir la note ${note.numero} dans le texte` : `Note ${note.numero} — ${pourquoiMuet}`}
      title={atteignable ? undefined : pourquoiMuet}
      style={{
        display: 'grid', gridTemplateColumns: '2.25rem minmax(0, 1fr)', gap: '8px',
        width: '100%', textAlign: 'left', alignItems: 'baseline',
        padding: '6px 8px 7px', borderRadius: '4px',
        border: 'none', background: courante ? 'var(--cs-vert-pale)' : 'none',
        cursor: atteignable ? 'pointer' : 'default',
        opacity: atteignable ? 1 : 0.55,
        borderBottom: '1px solid var(--cs-fond-doux)',
      }}>
      <span style={{
        fontSize: '0.6875rem', fontWeight: 600, textAlign: 'right',
        color: courante ? 'var(--cs-vert)' : 'var(--cs-texte-second)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {note.numero}
      </span>
      <span style={{ display: 'block', minWidth: 0 }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'baseline', marginBottom: '2px' }}>
          {note.intitule && (
            <span style={{ fontSize: '0.5625rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-texte-second)' }}>
              {note.intitule}
            </span>
          )}
          {note.place?.surface === 'apparat' && (
            <Marque>apparat</Marque>
          )}
          {note.aRevoir && <Marque alerte>à relire</Marque>}
          {!note.place && <Marque alerte>orpheline</Marque>}
        </span>
        <span style={{
          display: 'block', fontFamily: 'var(--font-source-serif), Georgia, serif',
          fontSize: '0.6875rem', lineHeight: 1.42, color: 'var(--cs-texte)',
          overflowWrap: 'anywhere',
        }}>
          {note.apercu
            ? rendreTexteEnrichi(note.apercu)
            : <em style={{ color: 'var(--cs-texte-doux)' }}>note sans texte</em>}
        </span>
      </span>
    </button>
  )
}

function Marque({ alerte, children }: { alerte?: boolean; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase',
      padding: '1px 5px', borderRadius: '4px',
      border: `1px solid ${alerte ? 'var(--cs-danger-bord)' : 'var(--cs-bord)'}`,
      color: alerte ? 'var(--cs-danger-fonce)' : 'var(--cs-texte-second)',
    }}>
      {children}
    </span>
  )
}
