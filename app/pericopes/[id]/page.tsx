'use client'

// Page d'une péricope, mise en forme sur le modèle de la page « Bible » : trois zones à
// défilement interne. À GAUCHE, un volet d'informations et d'options (registre, référence,
// appellations, occurrences, choix de la traduction) et les notices (notice, contexte).
// AU CENTRE, le texte biblique de chaque occurrence, verset par verset. À DROITE, l'apparat
// patristique (doublon du volet de la page Bible). Lecture avec la session normale.

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { formaterPlageCanonique, parsePointCanonique, nomLivreReference } from '@/app/lib/referencesBibliques'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { normaliserEspacesOriginal } from '@/app/lib/typographie'
import PanneauPatristique from '@/app/components/PanneauPatristique'
import ActionsVerset from '@/app/components/ActionsVerset'
import { ABREV_FR } from '@/app/lib/bible'
import {
  libelleCategoriePericope,
  chargerTextePericope,
  TRADUCTIONS_BIBLE,
  type VersetPericope,
} from '@/app/lib/pericopes'

type Pericope = {
  id: string; nom: string; categorie: string | null; est_collection: boolean | null
  notice: string | null; notice_contexte: string | null
  notice_exegetique: string | null; notice_theologique: string | null; notice_tradition: string | null
}

// Référence bibliographique réelle, servie par la vue « bibliographie_admissible ».
// Cette vue écarte côté base tout ouvrage scientifiquement exclu ou « à vérifier » :
// ne remontent que des liens non rejetés vers des ouvrages retenus ou secondaires.
// Aucun indice interne (score, réserve, statut) n'est exposé au lecteur.
// TODO qualification : rebasculer vers « bibliographie_publiable » (qui exige en plus
// un lien vérifié et un ouvrage éditorialement validé) une fois les liens vérifiés.
type RefBiblio = {
  rubrique: string | null; importance: string | null
  auteurs: string | null; titre: string | null; sous_titre: string | null
  directeurs: string | null; collection: string | null; numero_collection: string | null
  lieu: string | null; editeur: string | null; annee: number | null
  pages: string | null; reference_passage: string | null
}

// Normalisation typographique d'affichage : apostrophe droite ' → apostrophe courbe ’
// (certaines données, notamment des titres/appellations, portent des apostrophes plates).
// Apostrophe typographique + règles d'espacement de la charte (§3.2) : fine insécable avant
// : ; ! ? et autour des guillemets. `normaliserEspacesOriginal` AJOUTE l'espace (les notices,
// texte éditorial saisi, ne l'ont pas), de façon idempotente.
function typo(s: string): string { return normaliserEspacesOriginal(s.replace(/'/g, '’')) }
type Occurrence = {
  id: number; livre: string; canon_id_debut: string; canon_id_fin: string | null
  niveau: number; est_principale: boolean; fiabilite: string | null
}
type Variante = { id: number; nom: string; usage_recherche: string | null }

const FOND = 'var(--cs-fond)'
const PANEL = 'var(--cs-fond-clair)'
const BORD = 'var(--cs-bord)'
const SEP = 'var(--cs-bord-clair)'
const VERT = 'var(--cs-vert)'
const TEXTE = 'var(--cs-texte-fort)'
const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

function Etat({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: FOND, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <p style={{ color: 'var(--cs-texte-doux)', fontSize: '0.9rem' }}>{children}</p>
    </main>
  )
}

// Contexte d'actions passé aux versets (identité du lecteur + prélèvements).
type CtxActions = {
  livre: string
  tradLabel: string
  userId: string | null
  prelevements: Map<string, string>
  onPreleve: (cle: string, id: string) => void
  onRetire: (cle: string) => void
}

function BlocVersets({ vs, ctx }: { vs: VersetPericope[]; ctx: CtxActions }) {
  const multiChapitres = new Set(vs.map(v => v.chapitre)).size > 1
  const abr = ABREV_FR[ctx.livre] ?? ctx.livre
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {vs.map((v, i) => {
        const nouveauChapitre = multiChapitres && (i === 0 || v.chapitre !== vs[i - 1].chapitre)
        const cle = `${abr}|${v.chapitre}|${v.verset}`
        return (
          <div key={v.id_verset} className="peri-verset-row">
            {nouveauChapitre && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: i === 0 ? '0 0 8px' : '15px 0 8px' }}>
                <span style={{ fontFamily: SANS, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-etiquette)', whiteSpace: 'nowrap' }}>Chapitre {v.chapitre}</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--cs-bord)' }} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', columnGap: '10px', alignItems: 'start' }}>
              {/* Numéro centré verticalement sur la PREMIÈRE ligne du verset (boîte à la hauteur
                  d'une ligne, contenu centré) — plutôt qu'aligné sur la ligne de base. */}
              <span style={{ fontFamily: SANS, fontSize: '0.625rem', fontWeight: 600, color: 'var(--cs-texte-faible)', minWidth: '1.1rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: 'calc(0.875rem * 1.55)', lineHeight: 1 }}>{v.verset}</span>
              <p style={{ fontFamily: SANS, fontSize: '0.875rem', lineHeight: 1.55, color: TEXTE, margin: 0, textAlign: 'justify' }}>
                {rendreTexteEnrichi(String(v.texte))}
              </p>
              {/* Boutons d'action centrés en face de cette même première ligne. */}
              <span style={{ display: 'flex', alignItems: 'center', height: 'calc(0.875rem * 1.55)' }}>
                <ActionsVerset
                  idVerset={v.id_verset} refAffichee={`${abr} ${v.chapitre}, ${v.verset}`}
                  nomLivre={nomLivreReference(ctx.livre)} refLivreAbr={abr}
                  chapitre={v.chapitre} verset={v.verset} texte={String(v.texte)}
                  tradLabel={ctx.tradLabel} userId={ctx.userId}
                  prelevementId={ctx.prelevements.get(cle) ?? null}
                  onPreleve={ctx.onPreleve} onRetire={ctx.onRetire} />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Sélecteur de traduction : menu déroulant sobre (sur le modèle des autres menus du site).
function SelecteurTraduction({ trad, setTrad }: { trad: string; setTrad: (c: string) => void }) {
  const [ouvert, setOuvert] = useState(false)
  const active = TRADUCTIONS_BIBLE.find(t => t.code === trad) ?? TRADUCTIONS_BIBLE[0]
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} aria-haspopup="listbox"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%', fontFamily: SANS, fontSize: '0.76rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: `1px solid ${BORD}`, borderRadius: '6px', padding: '6px 10px', cursor: 'pointer' }}>
        {active.nom}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ opacity: 0.5, flexShrink: 0, transform: ouvert ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {ouvert && (
        <>
          <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
          <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: 'var(--cs-surface)', border: `1px solid ${BORD}`, borderRadius: '8px', boxShadow: '0 10px 28px rgba(45,35,25,0.14)', overflow: 'hidden', padding: '4px' }}>
            {TRADUCTIONS_BIBLE.map(t => {
              const actif = t.code === trad
              return (
                <button key={t.code} role="option" aria-selected={actif} onClick={() => { setTrad(t.code); setOuvert(false) }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', textAlign: 'left', fontFamily: SANS, fontSize: '0.75rem', color: actif ? VERT : 'var(--cs-texte)', fontWeight: actif ? 600 : 400, background: actif ? 'rgba(var(--cs-vert-rgb),0.08)' : 'transparent', border: 'none', borderRadius: '5px', padding: '6px 9px', cursor: 'pointer' }}
                  onMouseEnter={e => { if (!actif) e.currentTarget.style.background = 'rgba(var(--cs-vert-rgb),0.05)' }}
                  onMouseLeave={e => { if (!actif) e.currentTarget.style.background = 'transparent' }}>
                  <span>{t.nom}</span>
                  {actif && <span aria-hidden="true" style={{ color: VERT, fontSize: '0.72rem' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export default function PericopePage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const mobile = useEstMobile(900)
  const [etat, setEtat] = useState<'chargement' | 'ok' | 'introuvable' | 'erreur'>('chargement')
  const [peri, setPeri] = useState<Pericope | null>(null)
  const [occurrences, setOccurrences] = useState<Occurrence[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [biblio, setBiblio] = useState<RefBiblio[]>([])
  const [trad, setTrad] = useState<string>('TR0001')
  const [textes, setTextes] = useState<Record<number, VersetPericope[]>>({})
  const [texteLoading, setTexteLoading] = useState(false)
  const [voletMobile, setVoletMobile] = useState<'livres' | 'commentaires' | null>('commentaires')
  const [userId, setUserId] = useState<string | null>(null)
  const [prelevements, setPrelevements] = useState<Map<string, string>>(new Map())

  const principale = useMemo(
    () => occurrences.find(o => o.est_principale) ?? occurrences[0] ?? null,
    [occurrences],
  )

  // Bibliographie groupée par rubrique (contexte, exégèse, théologie, tradition),
  // ordonnée par importance (principale avant complémentaire) puis année descendante.
  const groupesBiblio = useMemo(() => {
    const ORDRE_RUB: Record<string, number> = { contexte: 0, exegese: 1, theologie: 2, tradition: 3 }
    const LABEL_RUB: Record<string, string> = { contexte: 'Contexte', exegese: 'Exégèse', theologie: 'Théologie', tradition: 'Réception et tradition' }
    const impRang = (v: string | null) => (v === 'principale' ? 0 : v === 'complementaire' ? 1 : 2)
    const parRub = new Map<string, RefBiblio[]>()
    for (const r of biblio) {
      const cle = r.rubrique ?? ''
      const groupe = parRub.get(cle) ?? []
      groupe.push(r)
      parRub.set(cle, groupe)
    }
    return [...parRub.entries()]
      .sort((a, b) => (ORDRE_RUB[a[0]] ?? 9) - (ORDRE_RUB[b[0]] ?? 9))
      .map(([cle, refs]) => ({
        cle,
        label: LABEL_RUB[cle] ?? '',
        refs: [...refs].sort((x, y) => impRang(x.importance) - impRang(y.importance) || (y.annee ?? 0) - (x.annee ?? 0)),
      }))
  }, [biblio])

  useEffect(() => {
    if (!id) return
    let annule = false
    ;(async () => {
      try {
        const { data: p, error } = await supabase
          .from('pericopes')
          .select('id, nom, categorie, est_collection, notice, notice_contexte, notice_exegetique, notice_theologique, notice_tradition')
          .eq('id', id).maybeSingle()
        if (annule) return
        // Distinguer une panne (error) d'une péricope réellement absente (data null) :
        // afficher « introuvable » sur une simple erreur réseau était trompeur.
        if (error) { setEtat('erreur'); return }
        if (!p) { setEtat('introuvable'); return }
        const [{ data: occ }, { data: noms }, { data: refs }] = await Promise.all([
          supabase.from('pericope_occurrences')
            .select('id, livre, canon_id_debut, canon_id_fin, niveau, est_principale, fiabilite')
            .eq('pericope_id', id)
            .order('est_principale', { ascending: false }).order('niveau').order('id'),
          supabase.from('pericope_noms')
            .select('id, nom, usage_recherche, est_principal, ordre')
            .eq('pericope_id', id).eq('visible_public', true).eq('est_principal', false)
            .order('ordre'),
          supabase.from('bibliographie_admissible')
            .select('rubrique, importance, auteurs, titre, sous_titre, directeurs, collection, numero_collection, lieu, editeur, annee, pages, reference_passage')
            .eq('pericope_id', id),
        ])
        if (annule) return
        setPeri(p as Pericope)
        setOccurrences((occ ?? []) as Occurrence[])
        setVariantes((noms ?? []) as Variante[])
        setBiblio((refs ?? []) as RefBiblio[])
        setEtat('ok')
      } catch {
        if (!annule) setEtat('erreur')
      }
    })()
    return () => { annule = true }
  }, [id])

  useEffect(() => {
    if (!occurrences.length) { setTextes({}); return }
    let annule = false
    const ctrl = new AbortController()
    setTexteLoading(true)
    Promise.all(occurrences.map(async o => {
      const vs = await chargerTextePericope(o.livre, o.canon_id_debut, o.canon_id_fin, trad, ctrl.signal)
      return [o.id, vs] as const
    }))
      .then(paires => { if (!annule) { setTextes(Object.fromEntries(paires)); setTexteLoading(false) } })
      .catch(err => { if (annule || err?.name === 'AbortError') return; setTextes({}); setTexteLoading(false) })
    return () => { annule = true; ctrl.abort() }
  }, [occurrences, trad])

  // Session + prélèvements bibliques du lecteur pour les versets affichés (clé
  // « abréviation|chapitre|verset »), afin de montrer d'emblée les versets déjà prélevés.
  useEffect(() => {
    let annule = false
    supabase.auth.getSession().then(({ data }) => {
      if (annule) return
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (!uid || occurrences.length === 0) { setPrelevements(new Map()); return }
      const abrs = [...new Set(occurrences.map(o => ABREV_FR[o.livre] ?? o.livre))]
      supabase.from('prelevements').select('id, ref_livre_abr, ref_chapitre, ref_verset')
        .eq('user_id', uid).eq('type', 'biblique').in('ref_livre_abr', abrs)
        .then(({ data: lignes }) => {
          if (annule) return
          const m = new Map<string, string>()
          ;(lignes ?? []).forEach((r: { id: string; ref_livre_abr: string; ref_chapitre: number; ref_verset: number }) =>
            m.set(`${r.ref_livre_abr}|${r.ref_chapitre}|${r.ref_verset}`, r.id))
          setPrelevements(m)
        })
    })
    return () => { annule = true }
  }, [occurrences])

  const onPreleve = (cle: string, id: string) => setPrelevements(prev => new Map(prev).set(cle, id))
  const onRetire = (cle: string) => setPrelevements(prev => { const n = new Map(prev); n.delete(cle); return n })

  if (etat === 'chargement') return <Etat>Chargement…</Etat>
  if (etat === 'erreur') return (
    <Etat>
      <span>Le chargement a échoué.{' '}
        <button onClick={() => location.reload()} style={{ color: 'var(--cs-vert)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', font: 'inherit' }}>
          Réessayer
        </button>
      </span>
    </Etat>
  )
  if (etat === 'introuvable' || !peri) return <Etat>Péricope introuvable.</Etat>

  const categorie = libelleCategoriePericope(peri.categorie)
  const tradActive = TRADUCTIONS_BIBLE.find(t => t.code === trad) ?? TRADUCTIONS_BIBLE[0]
  const langAttr = tradActive.langue === 'la' ? 'la' : tradActive.langue === 'grc' ? 'grc' : 'fr'
  const chapPrincipale = principale ? (parsePointCanonique(principale.canon_id_debut)?.chapitre ?? 1) : 1
  const ctxBase = { tradLabel: tradActive.nom, userId, prelevements, onPreleve, onRetire }

  // ── Volet gauche : apparat patristique (doublon du volet de la page Bible) ──
  const panneauPatristique = principale ? (
    <PanneauPatristique
      verset={null}
      livreActif={principale.livre}
      chapitreActif={chapPrincipale}
      nomLivre={nomLivreReference(principale.livre)}
      plage={{ livre: principale.livre, canonDebut: principale.canon_id_debut, canonFin: principale.canon_id_fin }}
      refAffichee={formaterPlageCanonique(principale.canon_id_debut, principale.canon_id_fin)}
      mobile={mobile}
      presentation={mobile ? 'inline' : 'drawer'}
      barreMobile={false}
      voletMobile={voletMobile}
      setVoletMobile={setVoletMobile}
    />
  ) : null

  // ── Centre : titre + texte de chaque occurrence ──
  const centre = (
    <div style={{ maxWidth: '40rem', margin: '0 auto', padding: mobile ? '0' : '4px 4px 40px' }}>
      <style>{`
        .peri-verset-row .bouton-action-verset { opacity: 0; }
        .peri-verset-row:hover .bouton-action-verset { opacity: 1 !important; }
        @media (hover: none) { .peri-verset-row .bouton-action-verset { opacity: 1 !important; } }
      `}</style>
      <header style={{ textAlign: 'center', paddingBottom: '1rem', marginBottom: '1.3rem', borderBottom: `1px solid ${SEP}` }}>
        {categorie && (
          <p style={{ fontFamily: SANS, fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-etiquette)', margin: '0 0 7px' }}>
            {categorie}{peri.est_collection ? ' · Ensemble' : ''}
          </p>
        )}
        <h1 style={{ fontFamily: SERIF, fontSize: mobile ? '1.55rem' : '1.85rem', fontWeight: 500, color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.13, textWrap: 'balance' } as React.CSSProperties}>{rendreTexteEnrichi(typo(peri.nom))}</h1>
        {principale && (
          <p style={{ fontFamily: SERIF, fontSize: '0.92rem', color: 'var(--cs-texte-second)', margin: '6px 0 0' }}>
            {formaterPlageCanonique(principale.canon_id_debut, principale.canon_id_fin)}
          </p>
        )}
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {occurrences.map(o => {
          const vs = (textes[o.id] ?? []).filter(v => v.texte && v.texte.trim())
          return (
            <div key={o.id} lang={langAttr}>
              {occurrences.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '9px', marginBottom: '7px', paddingBottom: '4px', borderBottom: `1px solid ${SEP}` }}>
                  <span style={{ fontFamily: SERIF, fontSize: '0.86rem', fontWeight: 600, color: 'var(--cs-encre)' }}>{formaterPlageCanonique(o.canon_id_debut, o.canon_id_fin)}</span>
                  {o.est_principale && <span style={{ fontFamily: SANS, fontSize: '0.53rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cs-vert)' }}>principale</span>}
                  {o.fiabilite && <span style={{ fontFamily: SANS, fontSize: '0.65rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>{o.fiabilite}</span>}
                </div>
              )}
              {texteLoading ? (
                <p style={{ fontFamily: SANS, fontSize: '0.82rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', margin: 0 }}>Chargement du texte…</p>
              ) : vs.length === 0 ? (
                <p style={{ fontFamily: SANS, fontSize: '0.82rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0 }}>Texte indisponible dans cette traduction.</p>
              ) : <BlocVersets vs={vs} ctx={{ ...ctxBase, livre: o.livre }} />}
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Volet droit : informations, options (traduction), notices ──
  const voletDroit = (
    <div style={{ padding: mobile ? '16px 2px 4px' : '18px 18px 40px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* Informations */}
      <section>
        <p style={{ fontFamily: SANS, fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 8px' }}>Informations</p>
        <dl style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '7px' }}>
          {categorie && <LigneInfo label="Registre">{categorie}{peri.est_collection ? ' · Ensemble' : ''}</LigneInfo>}
          {principale && <LigneInfo label="Référence">{formaterPlageCanonique(principale.canon_id_debut, principale.canon_id_fin)}</LigneInfo>}
          {variantes.length > 0 && (
            <LigneInfo label="Appellations">
              {variantes.map((v, i) => <span key={v.id}>{i > 0 ? ' · ' : ''}{rendreTexteEnrichi(typo(v.nom))}</span>)}
            </LigneInfo>
          )}
        </dl>
        {occurrences.length > 1 && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ fontFamily: SANS, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 5px' }}>Occurrences</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {occurrences.map(o => (
                <li key={o.id} style={{ fontFamily: SANS, fontSize: '0.76rem', color: 'var(--cs-texte)', display: 'flex', alignItems: 'baseline', gap: '7px' }}>
                  <span>{formaterPlageCanonique(o.canon_id_debut, o.canon_id_fin)}</span>
                  {o.est_principale && <span style={{ fontFamily: SANS, fontSize: '0.5rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-vert)' }}>princ.</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Options : choix de la traduction (menu déroulant) */}
      <section style={{ borderTop: `1px solid ${SEP}`, paddingTop: '14px' }}>
        <p style={{ fontFamily: SANS, fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 8px' }}>Traduction</p>
        <SelecteurTraduction trad={trad} setTrad={setTrad} />
      </section>

      {/* Notices — toutes les catégories rédigées, denses, suivies des notes bibliographiques. */}
      {(peri.notice || peri.notice_contexte || peri.notice_exegetique || peri.notice_theologique || peri.notice_tradition) && (
        <section style={{ borderTop: `1px solid ${SEP}`, paddingTop: '14px' }}>
          <p style={{ fontFamily: SANS, fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 8px' }}>Notice</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {peri.notice && (
              <p style={{ fontFamily: SANS, fontSize: '0.8rem', color: 'var(--cs-texte)', lineHeight: 1.4, textAlign: 'justify', hyphens: 'auto', wordSpacing: '-0.03em', letterSpacing: '-0.01em', margin: 0 } as React.CSSProperties}>{rendreTexteEnrichi(typo(peri.notice))}</p>
            )}
            {([
              { label: 'Contexte', v: peri.notice_contexte },
              { label: 'Lecture exégétique', v: peri.notice_exegetique },
              { label: 'Lecture théologique', v: peri.notice_theologique },
              { label: 'Réception et tradition', v: peri.notice_tradition },
            ] as const).filter(b => b.v).map(b => (
              <div key={b.label}>
                <p style={{ fontFamily: SANS, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 3px' }}>{b.label}</p>
                <p style={{ fontFamily: SANS, fontSize: '0.78rem', color: 'var(--cs-texte)', lineHeight: 1.4, textAlign: 'justify', hyphens: 'auto', wordSpacing: '-0.03em', letterSpacing: '-0.01em', margin: 0 } as React.CSSProperties}>{rendreTexteEnrichi(typo(b.v as string))}</p>
              </div>
            ))}
          </div>

        </section>
      )}

      {/* Bibliographie : liste SIMPLE et élégante des ouvrages (vue bibliographie_admissible,
          qui écarte les exclus/à vérifier). Au plus bref : pas de regroupement par discipline,
          pas de renvoi de passage. Les groupes sont aplatis puis dédupliqués. */}
      {groupesBiblio.length > 0 && (
        <section style={{ borderTop: `1px solid ${SEP}`, paddingTop: '14px' }}>
          <p style={{ fontFamily: SANS, fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 10px' }}>Bibliographie</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {(() => {
              const vus = new Set<string>()
              return groupesBiblio.flatMap(g => g.refs).filter(r => {
                const cle = `${r.auteurs ?? r.directeurs ?? ''}|${r.titre ?? ''}|${r.annee ?? ''}`
                if (vus.has(cle)) return false
                vus.add(cle); return true
              })
            })().map((r, i) => (
              <li key={i} style={{ fontFamily: SANS, fontSize: '0.72rem', color: 'var(--cs-texte-second)', lineHeight: 1.45 }}>
                <ReferenceBiblio r={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )

  if (mobile) {
    // Empilé : titre + texte, puis infos/options/notices, puis apparat patristique.
    return (
      <main style={{ background: FOND, minHeight: 'calc(100vh - 3.5rem)', padding: '1.5rem 1.1rem 3rem' }}>
        <div style={{ maxWidth: '44rem', margin: '0 auto' }}>
          {centre}
          <div style={{ marginTop: '1.5rem', background: PANEL, border: `1px solid ${BORD}`, borderRadius: '10px' }}>{voletDroit}</div>
          <div style={{ marginTop: '1.5rem', border: `1px solid ${BORD}`, borderRadius: '10px', overflow: 'hidden', background: 'var(--cs-surface)' }}>{panneauPatristique}</div>
        </div>
      </main>
    )
  }

  // Desktop : trois zones à défilement interne, comme la page Bible.
  return (
    <main style={{ background: FOND }}>
      <div style={{ display: 'flex', height: `calc(100dvh - ${HAUTEUR_NAVBAR})`, overflow: 'hidden' }}>
        {/* Gauche : informations, options, notices */}
        <aside style={{ width: '20rem', flexShrink: 0, height: '100%', overflowY: 'auto', background: PANEL, borderRight: `1px solid ${BORD}` }}>{voletDroit}</aside>
        {/* Centre : le texte défile */}
        <section style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '1.75rem 2rem 3rem' }}>{centre}</section>
        {/* Droite : apparat patristique (poignée et repli sur son bord gauche : c'est son côté naturel) */}
        <div style={{ flexShrink: 0, height: '100%', borderLeft: `1px solid ${BORD}` }}>{panneauPatristique}</div>
      </div>
    </main>
  )
}

function LigneInfo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '5.5rem 1fr', columnGap: '10px', alignItems: 'baseline' }}>
      <dt style={{ fontFamily: SANS, fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.03em', color: 'var(--cs-texte-doux)' }}>{label}</dt>
      <dd style={{ fontFamily: SANS, fontSize: '0.8rem', color: 'var(--cs-texte)', margin: 0, lineHeight: 1.4 }}>{children}</dd>
    </div>
  )
}

// Une référence bibliographique rendue « à la scientifique » : auteurs, titre en
// italique, sous-titre, collection, lieu, éditeur, année ; le passage couvert en note.
function ReferenceBiblio({ r }: { r: RefBiblio }) {
  const gens = r.auteurs || (r.directeurs ? `${r.directeurs} (dir.)` : null)
  const lieuEd = [r.lieu, r.editeur].filter(Boolean).join(', ')
  return (
    <>
      {gens && <span>{typo(gens)}, </span>}
      <em style={{ fontStyle: 'italic', color: 'var(--cs-texte)' }}>{typo(r.titre ?? '')}</em>
      {r.sous_titre && <span>. {typo(r.sous_titre)}</span>}
      {r.collection && <span>, coll. «&#8239;{typo(r.collection)}&#8239;»{r.numero_collection ? `, ${r.numero_collection}` : ''}</span>}
      {lieuEd && <span>, {typo(lieuEd)}</span>}
      {r.annee && <span>, {r.annee}</span>}
      <span>.</span>
      {r.pages && <span style={{ color: 'var(--cs-texte-faible)' }}> {typo(r.pages)}</span>}
    </>
  )
}
