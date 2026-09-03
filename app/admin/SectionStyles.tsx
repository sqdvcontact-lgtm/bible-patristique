'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { JETONS_INFO } from '@/app/lib/bibleHierarchieSemantique'
import type { NatureSegmentValide } from '@/app/lib/naturesSegments'
import {
  LIBELLE_FORME_VERS, LIBELLE_NATURE, LIBELLE_RANG, NATURES_POUR_MENU, NOTICE_NATURE,
  STYLES_BIBLE, STYLES_BIBLE_ATTRIBUABLES, STYLES_VERSET,
  libelleStyleBible, noteDuRegistre, rangFixeDuStyleBible, styleBibleEstInfo,
} from '@/app/lib/stylesLibelles'

// ── Le module « Styles » ──────────────────────────────────────────────────────
//
// Demande de l'auteur (2026-09-03) : identifier les styles sous un nom propre, et
// changer d'ici le style d'un segment, d'un bloc, d'un titre. Trois vues :
// - le CATALOGUE : chaque style, son nom, sa notice, son code et son usage ;
// - les ŒUVRES : œuvre → texte → division → segments, nature et forme au menu ;
// - la BIBLE : famille → livre → chapitre → blocs, style et rang au menu.
//
// ⛔ Le vocabulaire est clos : les menus n'offrent que ce que la base accepte, et la
// base garde le dernier mot (son message paraît sur la ligne). Les noms viennent
// d'un seul registre, `app/lib/stylesLibelles.ts`, que le contrôle des œuvres lit
// aussi. ⚠️ Un verset s'IDENTIFIE ici, il ne s'attribue pas : la prose est la seule
// forme que la donnée porte, la suscription vient du canon, et le vers attend ses
// stiques (charte § 7.4).

type Vue = 'catalogue' | 'oeuvres' | 'bible'

type Catalogue = { natures: Record<string, number>; formeVers: number; styles: Record<string, { total: number; rangs: Record<string, number> }>; inconnus: number }
type Oeuvre = { id: string; titre: string; auteur: string | null }
type Texte = { id_texte: string; titre_version: string | null; langue: string | null; is_default: boolean; is_public: boolean }
type Segment = { id: number; numero: number; reference: string; nature: string; enVers: boolean; texte: string }
type Famille = { id: string; code: string; titre: string; livres: { code: string; nom: string }[]; traduction: string | null }
type Bloc = { id: string; cle: string; kind: string; intitule: string; incipit: string; style: string; canonique: string | null; rang: string | null; famille: string | null; canon: string | null; placement: string; public: boolean }

async function jeton(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}
async function lire<T>(params: Record<string, string>): Promise<T> {
  const res = await fetch(`/api/admin/styles?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${await jeton()}` } })
  if (!res.ok || res.redirected) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Lecture impossible.') }
  return res.json() as Promise<T>
}
async function ecrire<T>(corps: object): Promise<T> {
  const res = await fetch('/api/admin/styles', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` }, body: JSON.stringify(corps) })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || res.redirected) throw new Error(j.error ?? 'L’enregistrement a échoué.')
  return j as T
}

const SERIF = 'var(--font-source-serif), Georgia, serif'
const champ: React.CSSProperties = {
  font: 'inherit', fontSize: '0.8125rem', padding: '5px 8px', border: '1px solid var(--cs-bord)',
  borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', outline: 'none',
}
const code: React.CSSProperties = { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: '0.6875rem', color: 'var(--cs-texte-doux)' }
const tete: React.CSSProperties = { fontSize: '0.625rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-gris)', fontWeight: 600, textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--cs-bord)' }
const cellule: React.CSSProperties = { padding: '6px 8px', borderBottom: '1px solid var(--cs-bord-clair)', verticalAlign: 'top', fontSize: '0.8125rem', color: 'var(--cs-texte)' }
const lien: React.CSSProperties = { fontSize: '0.6875rem', color: 'var(--cs-vert)', textDecoration: 'none', whiteSpace: 'nowrap' }

function Titre({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontFamily: SERIF, fontSize: '0.9375rem', fontWeight: 500, color: 'var(--cs-encre)', margin: '22px 0 8px' }}>{children}</h3>
}
function Etat({ texte, erreur }: { texte?: string; erreur?: string }) {
  if (erreur) return <span style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)' }}>{erreur}</span>
  if (texte) return <span style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)' }}>{texte}</span>
  return null
}

// ── Le catalogue ──────────────────────────────────────────────────────────────
function VueCatalogue() {
  const [cat, setCat] = useState<Catalogue | null>(null)
  const [erreur, setErreur] = useState('')
  useEffect(() => { lire<Catalogue>({ vue: 'catalogue' }).then(setCat).catch((e: Error) => setErreur(e.message)) }, [])
  const n = (v: number | undefined) => (v ?? 0).toLocaleString('fr-FR')
  return (
    <div>
      {erreur && <Etat erreur={erreur} />}
      <Titre>Segments d’une œuvre — la nature</Titre>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead><tr><th style={tete}>Nom</th><th style={tete}>Ce que c’est</th><th style={tete}>Code</th><th style={{ ...tete, textAlign: 'right' }}>Segments</th></tr></thead>
        <tbody>
          {NATURES_POUR_MENU.map(({ code: c, libelle }) => (
            <tr key={c}>
              <td style={{ ...cellule, whiteSpace: 'nowrap', fontWeight: 500 }}>{libelle}</td>
              <td style={{ ...cellule, color: 'var(--cs-texte-second)' }}>{NOTICE_NATURE[c as NatureSegmentValide]}</td>
              <td style={{ ...cellule, ...code }}>{c}</td>
              <td style={{ ...cellule, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cat ? n(cat.natures[c]) : '…'}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...cellule, whiteSpace: 'nowrap', fontWeight: 500 }}>{LIBELLE_FORME_VERS.libelle}</td>
            <td style={{ ...cellule, color: 'var(--cs-texte-second)' }}>{LIBELLE_FORME_VERS.notice} Une FORME, qui se cumule avec la nature.</td>
            <td style={{ ...cellule, ...code }}>segment_metadata.forme</td>
            <td style={{ ...cellule, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cat ? n(cat.formeVers) : '…'}</td>
          </tr>
        </tbody>
      </table>

      <Titre>Appareil d’une bible — le style et son rang</Titre>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead><tr><th style={tete}>Nom</th><th style={tete}>Ce que c’est</th><th style={tete}>Code</th><th style={{ ...tete, textAlign: 'right' }}>Blocs publics</th></tr></thead>
        <tbody>
          {Object.entries(STYLES_BIBLE).map(([c, s]) => {
            const fixe = rangFixeDuStyleBible(c)
            const usage = cat?.styles[c]
            const rangs = usage ? Object.entries(usage.rangs).sort().map(([r, k]) => `${r} ${n(k)}`).join(' · ') : ''
            return (
              <tr key={c}>
                <td style={{ ...cellule, whiteSpace: 'nowrap', fontWeight: 500 }} title={noteDuRegistre(c)}>{s.libelle}{fixe && <span style={{ ...code, marginLeft: 6 }}>{fixe}</span>}</td>
                <td style={{ ...cellule, color: 'var(--cs-texte-second)' }}>{s.notice}{!fixe && c !== 'note_verset' && <span style={{ display: 'block', ...code, marginTop: 2 }}>rang à déclarer : {JETONS_INFO.map((j) => `${j} ${LIBELLE_RANG[j]}`).join(' · ')}</span>}</td>
                <td style={{ ...cellule, ...code }}>{c}</td>
                <td style={{ ...cellule, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{cat ? n(usage?.total) : '…'}{rangs && <span style={{ display: 'block', ...code }}>{rangs}</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {cat && cat.inconnus > 0 && <p style={{ fontSize: '0.75rem', color: 'var(--cs-danger)', margin: '6px 0 0' }}>{cat.inconnus} bloc(s) portent un style que le registre ne connaît pas : ils ne sont pas rendus.</p>}

      <Titre>Versets</Titre>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead><tr><th style={tete}>Nom</th><th style={tete}>Ce que c’est</th><th style={tete}>Code</th></tr></thead>
        <tbody>
          {STYLES_VERSET.map((s) => (
            <tr key={s.code}><td style={{ ...cellule, whiteSpace: 'nowrap', fontWeight: 500 }}>{s.libelle}</td><td style={{ ...cellule, color: 'var(--cs-texte-second)' }}>{s.notice}</td><td style={{ ...cellule, ...code }}>{s.code}</td></tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', margin: '8px 0 0', maxWidth: '46rem' }}>
        Un verset s’identifie ici et ne s’attribue pas encore : la prose est la seule forme que la donnée porte, et le vers attend que les stiques du Psautier soient dans la donnée.
      </p>
    </div>
  )
}

// ── Les œuvres ────────────────────────────────────────────────────────────────
function VueOeuvres() {
  const [oeuvres, setOeuvres] = useState<Oeuvre[]>([])
  const [oeuvre, setOeuvre] = useState('')
  const [textes, setTextes] = useState<Texte[]>([])
  const [texte, setTexte] = useState('')
  const [divisions, setDivisions] = useState<string[]>([])
  const [sansDivision, setSansDivision] = useState(0)
  const [division, setDivision] = useState<string | null>(null)
  const [segments, setSegments] = useState<Segment[] | null>(null)
  const [etats, setEtats] = useState<Record<number, { texte?: string; erreur?: string }>>({})
  const [erreur, setErreur] = useState('')

  useEffect(() => { lire<{ oeuvres: Oeuvre[] }>({ vue: 'oeuvres' }).then((r) => setOeuvres(r.oeuvres)).catch((e: Error) => setErreur(e.message)) }, [])
  useEffect(() => {
    setTextes([]); setTexte(''); setDivisions([]); setDivision(null); setSegments(null)
    if (!oeuvre) return
    lire<{ textes: Texte[] }>({ vue: 'textes', oeuvre }).then((r) => { setTextes(r.textes); setTexte(r.textes[0]?.id_texte ?? '') }).catch((e: Error) => setErreur(e.message))
  }, [oeuvre])
  useEffect(() => {
    setDivisions([]); setDivision(null); setSegments(null)
    if (!oeuvre || !texte) return
    lire<{ divisions: string[]; sansDivision: number }>({ vue: 'divisions', oeuvre, texte }).then((r) => { setDivisions(r.divisions); setSansDivision(r.sansDivision); setDivision(r.divisions[0] ?? (r.sansDivision > 0 ? '' : null)) }).catch((e: Error) => setErreur(e.message))
  }, [oeuvre, texte])
  useEffect(() => {
    setSegments(null)
    if (!oeuvre || !texte || division === null) return
    lire<{ segments: Segment[] }>({ vue: 'segments', oeuvre, texte, niv1: division }).then((r) => setSegments(r.segments)).catch((e: Error) => setErreur(e.message))
  }, [oeuvre, texte, division])

  const changer = useCallback(async (s: Segment, patch: { nature?: string; enVers?: boolean }) => {
    setEtats((e) => ({ ...e, [s.id]: { texte: '…' } }))
    try {
      const r = await ecrire<{ nature: string; enVers: boolean }>({ cible: 'segment', id: s.id, ...patch })
      setSegments((liste) => (liste ?? []).map((x) => x.id === s.id ? { ...x, nature: r.nature, enVers: r.enVers } : x))
      setEtats((e) => ({ ...e, [s.id]: { texte: 'enregistré' } }))
    } catch (err) {
      setEtats((e) => ({ ...e, [s.id]: { erreur: (err as Error).message } }))
    }
  }, [])

  return (
    <div>
      {erreur && <p><Etat erreur={erreur} /></p>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '14px 0' }}>
        <select value={oeuvre} onChange={(e) => setOeuvre(e.target.value)} style={{ ...champ, maxWidth: '24rem' }} aria-label="Œuvre">
          <option value="">Œuvre…</option>
          {oeuvres.map((o) => <option key={o.id} value={o.id}>{o.auteur ? `${o.auteur} — ` : ''}{o.titre}</option>)}
        </select>
        {textes.length > 1 && (
          <select value={texte} onChange={(e) => setTexte(e.target.value)} style={{ ...champ, maxWidth: '18rem' }} aria-label="Texte">
            {textes.map((t) => <option key={t.id_texte} value={t.id_texte}>{t.titre_version ?? t.id_texte}{t.langue ? ` (${t.langue})` : ''}{t.is_default ? ' · par défaut' : ''}</option>)}
          </select>
        )}
        {(divisions.length > 0 || sansDivision > 0) && (
          <select value={division ?? ''} onChange={(e) => setDivision(e.target.value)} style={{ ...champ, maxWidth: '18rem' }} aria-label="Division">
            {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            {sansDivision > 0 && <option value="">(sans division · {sansDivision})</option>}
          </select>
        )}
      </div>
      {segments && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={{ ...tete, textAlign: 'right' }}>N°</th><th style={tete}>Réf.</th><th style={tete}>Texte</th><th style={tete}>Nature</th><th style={tete}>{LIBELLE_FORME_VERS.libelle}</th><th style={tete}></th></tr></thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.id}>
                <td style={{ ...cellule, textAlign: 'right', ...code }}>{s.numero}</td>
                <td style={{ ...cellule, ...code, whiteSpace: 'nowrap' }}>{s.reference}</td>
                <td style={{ ...cellule, fontFamily: SERIF }}>{s.texte}</td>
                <td style={{ ...cellule, whiteSpace: 'nowrap' }}>
                  <select value={s.nature} onChange={(e) => void changer(s, { nature: e.target.value })} style={{ ...champ, padding: '3px 6px', fontSize: '0.75rem' }} aria-label="Nature">
                    {NATURES_POUR_MENU.filter((n) => n.code !== 'separateur' || s.nature === 'separateur').map((n) => <option key={n.code} value={n.code}>{n.libelle}</option>)}
                    {!(s.nature in LIBELLE_NATURE) && <option value={s.nature}>{s.nature}</option>}
                  </select>
                </td>
                <td style={{ ...cellule, textAlign: 'center' }}><input type="checkbox" checked={s.enVers} onChange={(e) => void changer(s, { enVers: e.target.checked })} aria-label="En vers" /></td>
                <td style={{ ...cellule, whiteSpace: 'nowrap' }}>
                  <a href={`/oeuvre/${oeuvre}?texte=${encodeURIComponent(texte)}&segment=${s.id}`} target="_blank" rel="noreferrer" style={lien}>voir</a>
                  {' '}<Etat {...etats[s.id]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {segments && segments.length === 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun segment dans cette division.</p>}
    </div>
  )
}

// ── La Bible ──────────────────────────────────────────────────────────────────
function VueBible() {
  const [familles, setFamilles] = useState<Famille[]>([])
  const [famille, setFamille] = useState('')
  const [livre, setLivre] = useState('')
  const [chapitre, setChapitre] = useState(1)
  const [blocs, setBlocs] = useState<Bloc[] | null>(null)
  const [etats, setEtats] = useState<Record<string, { texte?: string; erreur?: string }>>({})
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  useEffect(() => {
    lire<{ familles: Famille[] }>({ vue: 'bible-livres' }).then((r) => { setFamilles(r.familles); setFamille(r.familles[0]?.id ?? ''); setLivre(r.familles[0]?.livres[0]?.code ?? '') }).catch((e: Error) => setErreur(e.message))
  }, [])
  const f = familles.find((x) => x.id === famille)

  const charger = useCallback(async () => {
    if (!famille || !livre) return
    setOccupe(true); setErreur(''); setBlocs(null)
    try { setBlocs((await lire<{ blocs: Bloc[] }>({ vue: 'bible-blocs', famille, livre, chapitre: String(chapitre) })).blocs) }
    catch (e) { setErreur((e as Error).message) }
    setOccupe(false)
  }, [famille, livre, chapitre])

  const changer = useCallback(async (b: Bloc, style: string, rang: string | null) => {
    setEtats((e) => ({ ...e, [b.id]: { texte: '…' } }))
    try {
      const r = await ecrire<{ style: string; rang: string | null; canonique: string | null }>({ cible: 'bloc', id: b.id, style, rang })
      setBlocs((liste) => (liste ?? []).map((x) => x.id === b.id ? { ...x, style: r.style, canonique: r.canonique, rang: r.rang } : x))
      setEtats((e) => ({ ...e, [b.id]: { texte: 'enregistré' } }))
    } catch (err) {
      setEtats((e) => ({ ...e, [b.id]: { erreur: (err as Error).message } }))
    }
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '14px 0' }}>
        {familles.length > 1 && (
          <select value={famille} onChange={(e) => { setFamille(e.target.value); setLivre(familles.find((x) => x.id === e.target.value)?.livres[0]?.code ?? '') }} style={{ ...champ, maxWidth: '20rem' }} aria-label="Édition">
            {familles.map((x) => <option key={x.id} value={x.id}>{x.titre}</option>)}
          </select>
        )}
        {familles.length === 1 && <span style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)' }}>{familles[0].titre}</span>}
        <select value={livre} onChange={(e) => setLivre(e.target.value)} style={{ ...champ, maxWidth: '14rem' }} aria-label="Livre">
          {(f?.livres ?? []).map((l) => <option key={l.code} value={l.code}>{l.nom}</option>)}
        </select>
        <label style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)', display: 'flex', alignItems: 'center', gap: 6 }}>
          chapitre <input type="number" min={1} value={chapitre} onChange={(e) => setChapitre(Math.max(1, Number(e.target.value) || 1))} style={{ ...champ, width: '4.5rem' }} onKeyDown={(e) => { if (e.key === 'Enter') void charger() }} />
        </label>
        <button onClick={() => void charger()} disabled={occupe || !livre} style={{ ...champ, cursor: 'pointer', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', border: 'none' }}>Charger</button>
        {erreur && <Etat erreur={erreur} />}
      </div>
      {blocs && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={tete}>Ancre</th><th style={tete}>Bloc</th><th style={tete}>Style</th><th style={tete}>Rang</th><th style={tete}></th></tr></thead>
          <tbody>
            {blocs.map((b) => {
              const info = styleBibleEstInfo(b.canonique ?? b.style)
              const styleMenu = b.canonique ?? b.style
              return (
                <tr key={b.id} style={{ opacity: b.public ? 1 : 0.6 }}>
                  <td style={{ ...cellule, ...code, whiteSpace: 'nowrap' }}>{b.canon ?? '—'}<span style={{ display: 'block' }}>{b.placement}</span></td>
                  <td style={{ ...cellule, fontFamily: SERIF }}>
                    {b.intitule && <span style={{ fontWeight: 500 }}>{b.intitule} </span>}
                    <span style={{ color: b.intitule ? 'var(--cs-texte-second)' : 'inherit' }}>{b.incipit}</span>
                    <span style={{ display: 'block', ...code }}>{b.cle}{b.canonique && b.canonique !== b.style ? ` · ${b.style} → ${b.canonique}` : ''}</span>
                  </td>
                  <td style={{ ...cellule, whiteSpace: 'nowrap' }}>
                    <select value={STYLES_BIBLE_ATTRIBUABLES.includes(styleMenu) ? styleMenu : ''} onChange={(e) => { const s = e.target.value; void changer(b, s, styleBibleEstInfo(s) ? (b.rang && (JETONS_INFO as readonly string[]).includes(b.rang) ? b.rang : 'I5') : null) }} style={{ ...champ, padding: '3px 6px', fontSize: '0.75rem' }} aria-label="Style">
                      {!STYLES_BIBLE_ATTRIBUABLES.includes(styleMenu) && <option value="">{b.style}</option>}
                      {STYLES_BIBLE_ATTRIBUABLES.map((c) => <option key={c} value={c}>{libelleStyleBible(c)}</option>)}
                    </select>
                  </td>
                  <td style={{ ...cellule, whiteSpace: 'nowrap' }}>
                    {info ? (
                      <select value={b.rang ?? ''} onChange={(e) => void changer(b, styleMenu, e.target.value)} style={{ ...champ, padding: '3px 6px', fontSize: '0.75rem' }} aria-label="Rang">
                        {JETONS_INFO.map((j) => <option key={j} value={j}>{j} · {LIBELLE_RANG[j]}</option>)}
                      </select>
                    ) : <span style={code}>{b.rang ?? '—'}</span>}
                  </td>
                  <td style={{ ...cellule, whiteSpace: 'nowrap' }}>
                    {f?.traduction && <a href={`/?livre=${livre}&chapitre=${chapitre}&trad=${f.traduction}`} target="_blank" rel="noreferrer" style={lien}>voir</a>}
                    {' '}<Etat {...etats[b.id]} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {blocs && blocs.length === 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun bloc de l’appareil dans ce chapitre.</p>}
    </div>
  )
}

export default function SectionStyles() {
  const [vue, setVue] = useState<Vue>('catalogue')
  const onglet = (v: Vue, label: string) => (
    <button onClick={() => setVue(v)} style={{ font: 'inherit', fontSize: '0.8125rem', padding: '6px 12px', border: 'none', borderBottom: vue === v ? '2px solid var(--cs-vert)' : '2px solid transparent', background: 'transparent', color: vue === v ? 'var(--cs-vert)' : 'var(--cs-texte-second)', fontWeight: vue === v ? 600 : 400, cursor: 'pointer' }}>{label}</button>
  )
  return (
    <section>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.1875rem', fontWeight: 500, color: 'var(--cs-encre-fonce)', margin: '0 0 6px' }}>Styles</h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, margin: '0 0 12px', maxWidth: '46rem' }}>
        Chaque style sous son nom propre, ce qu’il est, et ce qu’il sert. Depuis les vues « Œuvres » et « Bible », le style d’un segment ou d’un bloc se change au menu ; la base vérifie et répond sur la ligne.
        La <a href="/admin/styles" style={{ color: 'var(--cs-vert)' }}>planche des styles</a> montre chacun d’eux composé.
      </p>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--cs-bord)', marginBottom: 4 }}>
        {onglet('catalogue', 'Catalogue')}{onglet('oeuvres', 'Œuvres')}{onglet('bible', 'Bible')}
      </div>
      {vue === 'catalogue' && <VueCatalogue />}
      {vue === 'oeuvres' && <VueOeuvres />}
      {vue === 'bible' && <VueBible />}
    </section>
  )
}
