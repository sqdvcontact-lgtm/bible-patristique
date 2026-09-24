'use client'
/**
 * L'INVENTAIRE DES NOTES D'UNE BIBLE — outil d'administration, onglet « Notes » du volet de
 * droite de la page Bible, sur le modèle de celui d'une œuvre (`OngletNotes`).
 *
 * Demande de l'auteur (2026-09-16) : « en mode admin, je veux pouvoir voir les notes
 * associées à une bible dans le volet de droite (comme pour les œuvres) ; ajoute un onglet
 * propre à l'admin avec “Pères de l'Église” ».
 *
 * ⛔ IL PORTE SUR TOUTE LA BIBLE OUVERTE, tous livres et tous chapitres, et sur elle seule :
 * voir `notesBibleInventaire.ts`.
 * Il réunit les notes de verset et celles des blocs éditoriaux d'une édition, les notes
 * éditoriales des lignes de toute bible lue au verset (`versets_v2.notes`, charte § 13.22),
 * et dit celles qui ne paraissent nulle part, avec la raison.
 *
 * ⛔ Réservé à l'administrateur : il montre `needs_review` et la matière que la page ne
 * compose pas. Ce sont des faits d'atelier, non de lecture.
 *
 * ⚠️ La règle — recensement, lieux, filtres, aperçu — vit dans `notesBibleInventaire.ts`,
 * pure et testée ; le chargement dans `notesBibleChargement.ts` ; l'ouverture d'une note
 * dans `ouvrirNoteBible.ts`. Ce composant ne fait que montrer et rendre le clic.
 */
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import { useNaviguer } from '@/app/lib/attenteNavigation'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { chargerNotesDeLaBible } from '@/app/lib/notesBibleChargement'
import { ouvrirNoteBible } from '@/app/lib/ouvrirNoteBible'
import EtatVideVolet, { MentionVide } from '@/app/components/EtatVideVolet'
import {
  cleInventaireNotesBible,
  comptesParIntituleBible,
  filtrerNotesBible,
  grouperNotesBible,
  noteSurPlace,
  recenserNotesBible,
  type ContexteNotesBible,
  type MembreLu,
  type NoteBibleRecensee,
} from '@/app/lib/notesBibleInventaire'
import {
  CompteFacette,
  LigneNoteInventaire,
  MarqueNote,
  PastilleFacette,
  STYLE_INTITULE_LIGNE_NOTE,
  STYLE_RANG_FACETTES,
} from './InventaireNotes'
import { SERIF } from '@/app/lib/polices'
import { rendreEnrichi } from '@/app/lib/enrichissements'

/** Au-delà, une note visée dans un autre chapitre n'est plus attendue : la page n'y est
 *  pas arrivée, et l'on se contente de ce qu'elle montre. Un départ à froid de la fonction
 *  coûte deux à trois secondes ; on en laisse quatre fois plus. */
const ATTENTE_APRES_NAVIGATION_MS = 12000

/** Sur place, la note est déjà là ; on laisse au tiroir d'un téléphone le temps de se
 *  refermer sur le texte. */
const ATTENTE_SUR_PLACE_MS = 400

type Etat =
  | { statut: 'attente' }
  | { statut: 'erreur'; message: string }
  | {
    statut: 'prêt'
    notes: NoteBibleRecensee[]
    membres: MembreLu[]
    /** Les bibles dont les notes éditoriales manquent au relevé. */
    echecs: { trad: string; libelle: string }[]
  }

/** ⚠️ La clé de la demande, posée AVEC le résultat : l'attente se DÉDUIT, elle ne s'allume
 *  pas dans un effet (patron de l'inventaire d'une œuvre). */
type Charge = { pour: string; etat: Etat }

export default function OngletNotesBible({ contexte, onCompte, onAvantOuvrir }: {
  contexte: ContexteNotesBible
  /** Le nombre de notes de la bible, pour la ligne de compte de l'onglet ; `null` sur un échec.
   *  ⚠️ Rappel STABLE : il est dans les dépendances du chargement. */
  onCompte?: (pour: string, n: number | null) => void
  /** Ce que la page fait avant de montrer une note : refermer le tiroir d'un téléphone. */
  onAvantOuvrir?: () => void
}) {
  const naviguer = useNaviguer()
  const [charge, setCharge] = useState<Charge | null>(null)
  const [recherche, setRecherche] = useState('')
  const [intitule, setIntitule] = useState<string | null>(null)
  const [membre, setMembre] = useState<string | null>(null)
  const [aRelire, setARelire] = useState(false)
  const [absentes, setAbsentes] = useState(false)
  const [courante, setCourante] = useState<string | null>(null)

  const { familleId, bibles } = contexte
  const cleDemande = cleInventaireNotesBible({ familleId, bibles })
  // ⚠️ La bible entière compte des milliers de notes : la recherche se diffère, pour que la
  // frappe ne attende pas le filtrage et le rendu de la liste.
  const rechercheDifferee = useDeferredValue(recherche)

  useEffect(() => {
    let annule = false
    chargerNotesDeLaBible(supabase, { familleId, bibles })
      .then(releve => {
        if (annule) return
        const notes = recenserNotesBible(releve)
        setCharge({
          pour: cleDemande,
          etat: { statut: 'prêt', notes, membres: releve.membres, echecs: releve.echecsEditoriaux },
        })
        onCompte?.(cleDemande, notes.length)
      })
      .catch((erreur: unknown) => {
        console.error(`Inventaire des notes bibliques illisible (${cleDemande}) :`, erreur)
        if (annule) return
        setCharge({ pour: cleDemande, etat: { statut: 'erreur', message: 'Les notes n’ont pas pu être relevées.' } })
        onCompte?.(cleDemande, null)
      })
    return () => { annule = true }
  }, [cleDemande, familleId, bibles, onCompte])

  const etat = useMemo<Etat>(() => (charge?.pour === cleDemande ? charge.etat : { statut: 'attente' }), [charge, cleDemande])
  // ⚠️ Mémorisée : une liste vide fabriquée à chaque rendu ferait recalculer les facettes et
  // les filtres à chaque frappe.
  const toutes = useMemo(() => (etat.statut === 'prêt' ? etat.notes : []), [etat])
  const membres = useMemo(() => (etat.statut === 'prêt' ? etat.membres : []), [etat])
  const echecs = etat.statut === 'prêt' ? etat.echecs : []
  const facettes = useMemo(() => comptesParIntituleBible(toutes), [toutes])
  const retenues = useMemo(
    () => filtrerNotesBible(toutes, { texte: rechercheDifferee, intitule, membre, aRelire, absentes }),
    [toutes, rechercheDifferee, intitule, membre, aRelire, absentes],
  )
  const groupes = useMemo(() => grouperNotesBible(retenues), [retenues])
  const nbARelire = useMemo(() => toutes.filter(n => n.aRelire).length, [toutes])
  const nbAbsentes = useMemo(() => toutes.filter(n => n.lieu.genre === 'absent').length, [toutes])
  const filtre = Boolean(recherche.trim()) || intitule !== null || membre !== null || aRelire || absentes
  // ⚠️ Le nom d'une bible ne paraît que s'il DISTINGUE : en lecture ordinaire il n'y a
  // qu'un appareil.
  const plusieursBibles = membres.length > 1

  // ⚠️ Stable tant que la page ne change pas : les lignes sont mémorisées, et un rappel neuf
  // à chaque frappe les ferait toutes redessiner.
  const aller = useCallback((note: NoteBibleRecensee) => {
    const { lieu } = note
    if (lieu.genre === 'absent') return
    setCourante(note.cle)
    onAvantOuvrir?.()
    const surPlace = noteSurPlace(lieu, contexte)
    if (!surPlace) {
      naviguer(lieu.genre === 'piece' ? contexte.adresseDeLaPiece(lieu.cle) : contexte.adresseDuChapitre(lieu.livre, lieu.chapitre))
    }
    ouvrirNoteBible({
      noteId: note.cle,
      canonId: lieu.genre === 'chapitre' ? lieu.canonId : null,
      attendreMs: surPlace ? ATTENTE_SUR_PLACE_MS : ATTENTE_APRES_NAVIGATION_MS,
    })
  }, [contexte, naviguer, onAvantOuvrir])

  if (etat.statut === 'attente') return <MotAttente anneau />
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
          placeholder="Rechercher une note, un verset (3, 12)…"
          aria-label="Chercher dans les notes de la bible"
          className="cs-volet-recherche"
          style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.71875rem', color: 'var(--cs-texte)' }}
        />

        {/* ⚠️ La BIBLE se choisit sur son propre rang : c'est une question d'un autre ordre
            que le type d'une note. Une note commune à l'édition répond aux deux. */}
        {plusieursBibles && (
          <div style={STYLE_RANG_FACETTES}>
            <PastilleFacette actif={membre === null} onClick={() => setMembre(null)}>
              {membres.length === 2 ? 'Les deux bibles' : 'Toutes les bibles'} <CompteFacette n={toutes.length} />
            </PastilleFacette>
            {membres.map(m => (
              <PastilleFacette key={m.id} actif={membre === m.id} onClick={() => setMembre(membre === m.id ? null : m.id)}>
                {m.libelle} <CompteFacette n={toutes.filter(n => n.membre === null || n.membre.id === m.id).length} />
              </PastilleFacette>
            ))}
          </div>
        )}

        {/* ⚠️ Une facette dit ce qu'elle AJOUTERAIT : les comptes se prennent sur le
            recensement entier, jamais sur la liste déjà filtrée. */}
        <div style={STYLE_RANG_FACETTES}>
          <PastilleFacette actif={intitule === null} onClick={() => setIntitule(null)}>
            Toutes <CompteFacette n={toutes.length} />
          </PastilleFacette>
          {facettes.map(f => (
            <PastilleFacette key={f.intitule} actif={intitule === f.intitule} onClick={() => setIntitule(intitule === f.intitule ? null : f.intitule)}>
              {f.intitule} <CompteFacette n={f.n} />
            </PastilleFacette>
          ))}
          <PastilleFacette actif={aRelire} onClick={() => setARelire(!aRelire)} alerte>
            À relire <CompteFacette n={nbARelire} />
          </PastilleFacette>
          <PastilleFacette actif={absentes} onClick={() => setAbsentes(!absentes)} alerte>
            Ne paraissent pas <CompteFacette n={nbAbsentes} />
          </PastilleFacette>
        </div>

        <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', margin: '8px 0 0', lineHeight: 1.4 }}>
          {filtre
            ? `${retenues.length} note${retenues.length > 1 ? 's' : ''} sur ${toutes.length}`
            : `${toutes.length} note${toutes.length > 1 ? 's' : ''} dans cette bible`}
          {nbAbsentes > 0 && (
            <>
              {' · '}
              <span style={{ color: 'var(--cs-danger-fonce)' }}>
                {nbAbsentes} ne paraî{nbAbsentes > 1 ? 'ssent' : 't'} nulle part
              </span>
            </>
          )}
        </p>
        {/* ⚠️ Un relevé incomplet le DIT : un inventaire qui tait ce qu'il n'a pas pu lire
            se lit comme un livre sans notes. */}
        {echecs.map(echec => (
          <p key={echec.trad} role="alert" style={{ fontSize: '0.6875rem', color: 'var(--cs-danger-fonce)', margin: '4px 0 0', lineHeight: 1.4 }}>
            Les notes éditoriales de {rendreEnrichi(echec.libelle)} n’ont pas pu être relevées.
          </p>
        ))}
      </div>

      <div className="cs-defilement-discret" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 0 16px' }}>
        {retenues.length === 0 && (
          <EtatVideVolet>
            <MentionVide>{toutes.length === 0 ? 'Aucune note dans cette bible.' : 'Aucune note ne correspond aux filtres retenus.'}</MentionVide>
          </EtatVideVolet>
        )}
        {groupes.map(groupe => (
          // ⚠️ Des milliers de lignes : un chapitre hors de la vue ne se compose pas.
          <section key={groupe.cle} style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 320px' }}>
            <p style={{ ...RUBRIQUE_AXE, margin: '12px 0 4px', color: groupe.genre === 'absent' ? 'var(--cs-danger-fonce)' : RUBRIQUE_AXE.color }}>
              {groupe.titre}
            </p>
            {groupe.notes.map(note => (
              <LigneNoteBible
                key={note.cle}
                note={note}
                courante={note.cle === courante}
                nommerLaBible={plusieursBibles}
                onAller={aller}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

const LigneNoteBible = memo(function LigneNoteBible({ note, courante, nommerLaBible, onAller }: {
  note: NoteBibleRecensee
  courante: boolean
  nommerLaBible: boolean
  onAller: (note: NoteBibleRecensee) => void
}) {
  const { lieu } = note
  const atteignable = lieu.genre !== 'absent'
  // ⚠️ Une note de bloc dit son intitulé sur une ligne à part ; les autres, leur verset.
  const ou = note.origine !== 'bloc' && note.reperes ? `, ${note.reperes}` : ''
  const nom = note.numero === null ? 'la note' : `la note ${note.numero}`
  return (
    <LigneNoteInventaire
      numero={note.numero}
      courante={courante}
      atteignable={atteignable}
      nomAccessible={atteignable
        ? `Ouvrir ${nom}${ou} dans le texte`
        : `${nom.charAt(0).toUpperCase()}${nom.slice(1)}${ou}. ${lieu.raison}`}
      infobulle={atteignable ? undefined : lieu.raison}
      onClick={() => onAller(note)}
      entete={<>
        {note.origine !== 'bloc' && note.reperes && (
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-texte)', fontVariantNumeric: 'tabular-nums' }}>
            {note.reperes}
          </span>
        )}
        <span style={STYLE_INTITULE_LIGNE_NOTE}>{note.intitule}</span>
        {nommerLaBible && note.membre && <MarqueNote>{note.membre.libelle}</MarqueNote>}
        {note.aRelire && <MarqueNote alerte>à relire</MarqueNote>}
        {!atteignable && <MarqueNote alerte>absente</MarqueNote>}
        {note.origine === 'bloc' && note.reperes && (
          <span style={{
            flexBasis: '100%', fontFamily: SERIF, fontStyle: 'italic',
            fontSize: '0.6875rem', lineHeight: 1.3, color: 'var(--cs-texte-second)',
          }}>
            {note.reperes}
          </span>
        )}
      </>}
    >
      {note.apercu
        ? rendreTexteEnrichi(note.apercu)
        : <em style={{ color: 'var(--cs-texte-second)' }}>note sans texte</em>}
    </LigneNoteInventaire>
  )
})
