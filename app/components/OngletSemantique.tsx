'use client'
/**
 * L'ANNOTATION SÉMANTIQUE — outil d'administration, onglet « Sémantique » du volet de droite
 * de la page Bible, sur le modèle de l'onglet « Notes ».
 *
 * Demande de l'auteur (2026-09-21) : au clic sur un verset, les annotations qui le couvrent ;
 * au niveau du chapitre, le compte par type et la navigation entre versets annotés ; un mode
 * d'inspection qui expose identifiants, codes et provenance, et les arbitrages ouverts, à part.
 *
 * ⛔ Réservé à l'administrateur, et à lui seul : voir `semantiqueVerset.ts`.
 * ⛔ Lecture seule. Rien ici n'écrit.
 * ⚠️ La règle vit dans `semantiqueVerset.ts`, le chargement dans `/api/admin/semantique`.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import { selecteurVersetBible } from '@/app/lib/ouvrirNoteBible'
import { formaterPlageCanonique } from '@/app/lib/referencesBibliques'
import {
  LIBELLES_TYPE,
  TYPES_ANNOTATION,
  annotationsDuVerset,
  arbitragesDuVerset,
  comptesDuChapitre,
  estActive,
  libelleAnnotation,
  pointDuCreneau,
  porteeEtendue,
  trierAnnotations,
  versetsAnnotes,
  voisinAnnote,
  type AnnotationSemantique,
  type ArbitrageOuvert,
  type SemantiqueDuChapitre,
} from '@/app/lib/semantiqueVerset'
import { CompteFacette, MarqueNote, PastilleFacette, STYLE_RANG_FACETTES } from './InventaireNotes'

/** Un chapitre lu se garde le temps de la session ; un échec ne se garde pas. */
const chapitresLus = new Map<string, Promise<SemantiqueDuChapitre>>()

function chargerChapitre(livre: string, chapitre: number): Promise<SemantiqueDuChapitre> {
  const cle = `${livre}|${chapitre}`
  const deja = chapitresLus.get(cle)
  if (deja) return deja
  const promesse = (async () => {
    const reponse = await fetch(`/api/admin/semantique?livre=${livre}&chapitre=${chapitre}`, { credentials: 'same-origin', cache: 'no-store' })
    // ⚠️ Le verrou de bêta répond par une REDIRECTION vers du HTML (voir notesBibleChargement).
    if (reponse.redirected || !(reponse.headers.get('content-type') ?? '').includes('application/json')) {
      throw new Error('La session d’administration n’a pas été reconnue.')
    }
    const corps = await reponse.json() as SemantiqueDuChapitre & { erreur?: string }
    if (!reponse.ok) throw new Error(corps.erreur ?? `Lecture refusée (${reponse.status}).`)
    return corps
  })()
  chapitresLus.set(cle, promesse)
  promesse.catch(() => chapitresLus.delete(cle))
  return promesse
}

const STYLE_TEXTE: CSSProperties = {
  fontFamily: 'var(--font-source-serif), Georgia, serif',
  fontSize: '0.6875rem', lineHeight: 1.42, color: 'var(--cs-texte)', overflowWrap: 'anywhere',
}
const STYLE_DISCRET: CSSProperties = { fontSize: '0.6875rem', lineHeight: 1.4, color: 'var(--cs-texte-second)' }
const STYLE_RUBRIQUE: CSSProperties = { ...RUBRIQUE_AXE, marginTop: '14px', textTransform: 'uppercase' }

function numeroDuVerset(id: string): string {
  return String(pointDuCreneau(id)?.verset ?? id)
}

/** Les métadonnées d'atelier, en paires clé / valeur ; une valeur vide ne s'écrit pas. */
function Inspection({ champs }: { champs: [string, ReactNode][] }) {
  const pleins = champs.filter(([, v]) => v !== null && v !== undefined && v !== '')
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1px 8px', margin: '6px 0 0', fontSize: '0.6875rem', lineHeight: 1.4, color: 'var(--cs-texte-second)', fontVariantNumeric: 'tabular-nums' }}>
      {pleins.map(([k, v]) => (
        <div key={k} style={{ display: 'contents' }}>
          <dt style={{ color: 'var(--cs-texte-doux)' }}>{k}</dt>
          <dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function dateCourte(iso: string | null): string | null {
  return iso ? iso.slice(0, 10) : null
}

function LigneAnnotation({ a, inspection }: { a: AnnotationSemantique; inspection: boolean }) {
  const active = estActive(a)
  return (
    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--cs-bord)', opacity: active ? 1 : 0.6 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', alignItems: 'baseline' }}>
        <span style={{ ...STYLE_TEXTE, fontWeight: 600 }}>{libelleAnnotation(a)}</span>
        {a.importance && <MarqueNote>{a.importance}</MarqueNote>}
        {a.autorite?.typeLibelle && <MarqueNote>{a.autorite.typeLibelle}</MarqueNote>}
        {a.litteraire && <MarqueNote>{a.litteraire.categorie}</MarqueNote>}
        <MarqueNote alerte={a.certitude === 'disputee'}>{a.certitude}</MarqueNote>
        {!active && <MarqueNote alerte>{a.cycleVie}</MarqueNote>}
      </div>
      {porteeEtendue(a.portee) && (
        <div style={{ ...STYLE_DISCRET, marginTop: '2px' }}>
          Portée : {formaterPlageCanonique(a.portee.debut, a.portee.fin)}        </div>
      )}
      {a.autorite && a.autorite.formes.length > 0 && (
        <div style={{ ...STYLE_DISCRET, marginTop: '2px' }}>
          Formes : {a.autorite.formes.map(f => `${f.forme} (${f.langue})`).join(', ')}
        </div>
      )}
      {a.justification && <p style={{ ...STYLE_TEXTE, margin: '4px 0 0' }}>{a.justification}</p>}
      {inspection && (
        <Inspection champs={[
          ['annotation', `#${a.id}`],
          ['portée', `#${a.portee.id} · ${a.portee.debut}${porteeEtendue(a.portee) ? ` → ${a.portee.fin}` : ''}`],
          ['note de portée', a.portee.note],
          ['concept', a.concept ? `${a.concept.code} · #${a.concept.id} · ${a.concept.categorie} · ${a.concept.statut} · ${a.concept.versionCode}` : null],
          ['autorité', a.autorite ? `${a.autorite.typeCode} · ${a.autorite.id} · ${a.autorite.validation} · ${a.autorite.cycleVie}` : null],
          ['formes', a.autorite && a.autorite.formes.length > 0 ? a.autorite.formes.map(f => `${f.forme} [${f.langue}, ${f.typeForme}]`).join(' ; ') : null],
          ['littéraire', a.litteraire ? `${a.litteraire.code} · ${a.litteraire.versionCode}` : null],
          ['niveau', a.niveauSemantique],
          ['provenance', a.provenance],
          ['validation', a.validation],
          ['cycle de vie', a.cycleVie],
          ['confiance', a.confianceTechnique !== null ? String(a.confianceTechnique) : null],
          ['créé par', a.creePar],
          ['validé par', a.validePar ? `${a.validePar} (${dateCourte(a.valideLe)})` : null],
          ['créé le', dateCourte(a.creeLe)],
          ['mis à jour', dateCourte(a.misAJour)],
        ]} />
      )}
    </li>
  )
}

function LigneArbitrage({ a }: { a: ArbitrageOuvert }) {
  return (
    <li style={{ padding: '8px 0', borderBottom: '1px solid var(--cs-danger-bord)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 6px', alignItems: 'baseline' }}>
        <MarqueNote alerte>arbitrage #{a.id}</MarqueNote>
        <MarqueNote>{a.systeme}</MarqueNote>
        {a.portee && <span style={STYLE_DISCRET}>{formaterPlageCanonique(a.portee.debut, a.portee.fin)}</span>}
      </div>
      <p style={{ ...STYLE_TEXTE, margin: '4px 0 0' }}>{a.formulationProposee}</p>
      <p style={{ ...STYLE_DISCRET, margin: '4px 0 0' }}>Besoin documentaire : {a.besoinDocumentaire}</p>
      <Inspection champs={[
        ['portée', a.portee ? `#${a.portee.id}` : null],
        ['voisins', a.identifiantsVoisins.length > 0 ? JSON.stringify(a.identifiantsVoisins) : null],
        ['provenance', a.provenance],
        ['sources', a.sourcesNote],
        ['ouvert le', dateCourte(a.creeLe)],
      ]} />
    </li>
  )
}

type Etat =
  | { pour: string; donnees: SemantiqueDuChapitre; erreur: null }
  | { pour: string; donnees: null; erreur: string }

export default function OngletSemantique({ livre, chapitre, verset, onChoisirVerset, onCompte }: {
  livre: string
  chapitre: number
  /** Le créneau choisi (`GEN.1.1`), ou `null` pour le chapitre. */
  verset: string | null
  onChoisirVerset: (creneau: string) => void
  /** Le chiffre de l'onglet : ce qui couvre le verset choisi, ou le chapitre entier. */
  onCompte: (pour: string, n: number | null) => void
}) {
  const cle = `${livre}|${chapitre}`
  const [etat, setEtat] = useState<Etat | null>(null)
  const [inspection, setInspection] = useState(false)
  useEffect(() => {
    let vivant = true
    chargerChapitre(livre, chapitre).then(
      donnees => { if (vivant) setEtat({ pour: cle, donnees, erreur: null }) },
      (erreur: unknown) => { if (vivant) setEtat({ pour: cle, donnees: null, erreur: erreur instanceof Error ? erreur.message : String(erreur) }) },
    )
    return () => { vivant = false }
  }, [cle, livre, chapitre])

  const courant = etat?.pour === cle ? etat : null
  const donnees = courant?.donnees ?? null
  const annotes = useMemo(() => donnees ? versetsAnnotes(donnees) : [], [donnees])
  const comptes = useMemo(() => donnees ? comptesDuChapitre(donnees.annotations) : null, [donnees])
  const duVerset = useMemo(
    () => donnees && verset ? trierAnnotations(annotationsDuVerset(donnees.annotations, verset, inspection)) : [],
    [donnees, verset, inspection],
  )
  const arbitrages = useMemo(() => donnees ? arbitragesDuVerset(donnees.arbitrages, verset) : [], [donnees, verset])
  const inactives = donnees ? donnees.annotations.filter(a => !estActive(a)).length : 0

  const compte = !courant ? undefined
    : courant.erreur !== null ? null
    : verset ? duVerset.filter(estActive).length
    : comptes ? comptes.concept + comptes.autorite + comptes.litteraire : 0
  const pourCompte = `${cle}|${verset ?? ''}`
  useEffect(() => { if (compte !== undefined) onCompte(pourCompte, compte) }, [compte, pourCompte, onCompte])

  const aller = (creneau: string | null) => {
    if (!creneau) return
    onChoisirVerset(creneau)
    const selecteur = selecteurVersetBible(creneau)
    const cible = selecteur ? document.querySelector<HTMLElement>(selecteur) : null
    cible?.scrollIntoView({ block: 'center' })
  }

  if (!courant) return <MotAttente marge="16px 0">Lecture de l’annotation…</MotAttente>
  if (courant.erreur !== null || !donnees || !comptes) {
    return <p style={{ ...STYLE_DISCRET, color: 'var(--cs-danger-fonce)', marginTop: '12px' }}>{courant.erreur}</p>
  }

  const precedent = voisinAnnote(annotes, verset, -1)
  const suivant = voisinAnnote(annotes, verset, 1)
  const parType = TYPES_ANNOTATION.map(type => ({ type, liste: duVerset.filter(a => a.type === type) }))

  return (
    <div style={{ paddingBottom: '16px' }}>
      {/* ── Le chapitre ── */}
      <span style={STYLE_RUBRIQUE}>Chapitre {chapitre}</span>
      <div style={{ ...STYLE_DISCRET, fontVariantNumeric: 'tabular-nums' }}>
        {TYPES_ANNOTATION.map((type, i) => (
          <span key={type}>{i > 0 ? ' · ' : ''}{LIBELLES_TYPE[type]} <CompteFacette n={comptes[type]} /></span>
        ))}
      </div>
      <div style={STYLE_RANG_FACETTES}>
        <PastilleFacette actif={inspection} onClick={() => setInspection(v => !v)}>Inspection</PastilleFacette>
        {inspection && (
          <span style={{ ...STYLE_DISCRET, alignSelf: 'center' }}>
            {inactives} inactive{inactives > 1 ? 's' : ''} · {donnees.arbitrages.length} arbitrage{donnees.arbitrages.length > 1 ? 's' : ''} ouvert{donnees.arbitrages.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <span style={STYLE_RUBRIQUE}>Versets annotés ({annotes.length})</span>
      {annotes.length === 0 ? (
        <p style={STYLE_DISCRET}>Aucune annotation active dans ce chapitre.</p>
      ) : (
        <div style={STYLE_RANG_FACETTES}>
          {annotes.map(id => (
            <PastilleFacette key={id} actif={id === verset} onClick={() => aller(id)}>{numeroDuVerset(id)}</PastilleFacette>
          ))}
        </div>
      )}

      {/* ── Le verset ── */}
      {verset === null ? (
        <p style={{ ...STYLE_DISCRET, marginTop: '14px' }}>Choisissez un verset pour lire ses annotations.</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px' }}>
            <span style={{ ...STYLE_TEXTE, fontWeight: 600, flex: 1 }}>{formaterPlageCanonique(verset)}</span>
            <PastilleFacette actif={false} onClick={() => aller(precedent)}>‹ préc.</PastilleFacette>
            <PastilleFacette actif={false} onClick={() => aller(suivant)}>suiv. ›</PastilleFacette>
          </div>
          {duVerset.length === 0 && <p style={STYLE_DISCRET}>Aucune annotation ne couvre ce verset.</p>}
          {parType.filter(g => g.liste.length > 0).map(({ type, liste }) => (
            <section key={type}>
              <span style={STYLE_RUBRIQUE}>{LIBELLES_TYPE[type]} ({liste.length})</span>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {liste.map(a => <LigneAnnotation key={a.id} a={a} inspection={inspection} />)}
              </ul>
            </section>
          ))}
        </>
      )}

      {/* ── Les arbitrages ouverts : hors des annotations actives, en inspection seulement ── */}
      {inspection && arbitrages.length > 0 && (
        <section style={{ marginTop: '18px', paddingTop: '4px', borderTop: '2px solid var(--cs-danger-bord)' }}>
          <span style={{ ...STYLE_RUBRIQUE, color: 'var(--cs-danger-fonce)' }}>
            Arbitrages ouverts {verset ? 'sur ce verset' : 'du chapitre'} ({arbitrages.length})
          </span>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {arbitrages.map(a => <LigneArbitrage key={a.id} a={a} />)}
          </ul>
        </section>
      )}
    </div>
  )
}
