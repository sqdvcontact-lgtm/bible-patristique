'use client'

// Le lexique d'accentuation, tenu à la main par l'auteur : une liste alphabétique de mots,
// où l'on ajoute, corrige et retire (demande du 16 septembre 2026). Il remplace le long texte
// de la « charte d'accentuation », qu'on ne pouvait qu'éditer d'un bloc.
//
// Ce qui décide vit dans `accentuation.ts` (validation, forme fautive, ordre, recherche),
// testé ; cet écran ne fait que le rendre. Les règles qui n'étaient pas des mots sont dans la
// charte, § 3.12.

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { supabase } from '@/app/lib/supabase'
import OngletsPage from '@/app/components/OngletsPage'
import {
  LONGUEUR_MOT, LONGUEUR_NOTE, filtrerMots, formeFautive, grouperParLettre,
  type EntreeAccentuation, type MotAccentuation, type RegimeAccentuation,
} from './accentuation'

const SERIF = 'var(--font-source-serif), Georgia, serif'
const ENTREE_VIDE: EntreeAccentuation = { mot: '', faux_positif: false, note: null }

async function entetes(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const jeton = data.session?.access_token
  return { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) }
}

/** Un appel à la route ; l'erreur rendue est celle que la route a écrite pour être lue. */
async function appeler<T>(methode: 'GET' | 'POST' | 'PATCH' | 'DELETE', corps?: object): Promise<{ ok: true; donnees: T } | { ok: false; erreur: string }> {
  try {
    const res = await fetch('/api/admin/accentuation', {
      method: methode,
      headers: await entetes(),
      body: corps ? JSON.stringify(corps) : undefined,
    })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || res.redirected) return { ok: false, erreur: j.error ?? 'La liste n’a pas pu être jointe.' }
    return { ok: true, donnees: j as T }
  } catch {
    return { ok: false, erreur: 'Erreur de connexion.' }
  }
}

export default function SectionAccentuation() {
  const [mots, setMots] = useState<MotAccentuation[] | null>(null)
  const [erreurChargement, setErreurChargement] = useState('')
  const [nouveau, setNouveau] = useState<EntreeAccentuation>(ENTREE_VIDE)
  const [erreurAjout, setErreurAjout] = useState('')
  const [edition, setEdition] = useState<MotAccentuation | null>(null)
  const [erreurEdition, setErreurEdition] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [recherche, setRecherche] = useState('')
  const [regime, setRegime] = useState<RegimeAccentuation>('tous')

  const charger = useCallback(async () => {
    const r = await appeler<{ mots: MotAccentuation[] }>('GET')
    if (r.ok) { setMots(r.donnees.mots); setErreurChargement('') }
    else { setMots(avant => avant ?? []); setErreurChargement(r.erreur) }
  }, [])

  useEffect(() => { void charger() }, [charger])

  const ajouter = async () => {
    if (!nouveau.mot.trim() || occupe) return
    setOccupe(true); setErreurAjout('')
    const r = await appeler<{ mot: MotAccentuation }>('POST', nouveau)
    setOccupe(false)
    if (!r.ok) { setErreurAjout(r.erreur); return }
    setMots(avant => [...(avant ?? []), r.donnees.mot])
    setNouveau(avant => ({ ...ENTREE_VIDE, faux_positif: avant.faux_positif }))
  }

  const enregistrer = async () => {
    if (!edition || occupe) return
    setOccupe(true); setErreurEdition('')
    const r = await appeler<{ mot: MotAccentuation }>('PATCH', edition)
    setOccupe(false)
    if (!r.ok) { setErreurEdition(r.erreur); return }
    setMots(avant => (avant ?? []).map(m => (m.id === r.donnees.mot.id ? r.donnees.mot : m)))
    setEdition(null)
  }

  const retirer = async (m: MotAccentuation) => {
    if (occupe || !window.confirm(`Retirer « ${m.mot} » de la liste ?`)) return
    setOccupe(true); setErreurChargement('')
    const r = await appeler<{ ok: true }>('DELETE', { id: m.id })
    setOccupe(false)
    if (!r.ok) { setErreurChargement(r.erreur); return }
    setMots(avant => (avant ?? []).filter(x => x.id !== m.id))
    if (edition?.id === m.id) setEdition(null)
  }

  const ouvrirEdition = (m: MotAccentuation) => { setEdition({ ...m }); setErreurEdition('') }

  const liste = useMemo(() => mots ?? [], [mots])
  const nbFaux = liste.filter(m => m.faux_positif).length
  const visibles = useMemo(() => filtrerMots(liste, recherche, regime), [liste, recherche, regime])
  const groupes = useMemo(() => grouperParLettre(visibles), [visibles])

  const surEntree = (action: () => void, annuler?: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); action() }
    if (e.key === 'Escape' && annuler) { e.preventDefault(); annuler() }
  }

  return (
    <section>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.1875rem', fontWeight: 500, color: 'var(--cs-encre-fonce)', margin: '0 0 6px' }}>
        Accentuation
      </h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, margin: '0 0 4px', maxWidth: '46rem' }}>
        Les mots dont une lettre doit porter l’accent que l’édition ou l’OCR a perdu, et ceux qu’un contrôle croirait fautifs
        mais qu’il faut laisser tels quels. On n’y inscrit que ce qu’une passe de correction a réellement rencontré.
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', lineHeight: 1.5, margin: '0 0 18px', maxWidth: '46rem' }}>
        On écrit le mot juste, et la forme fautive s’en déduit : « Élie » donne « Elie ». Un faux positif se garde sans accent
        (« Esther », « Ecce »). Les règles générales sont dans la charte, aux §§ 3.2 et 3.12.
      </p>

      {/* ── Ajouter ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '6px' }}>
        <input value={nouveau.mot} onChange={e => setNouveau(n => ({ ...n, mot: e.target.value }))}
          onKeyDown={surEntree(() => void ajouter())} maxLength={LONGUEUR_MOT}
          placeholder="Nouveau mot, ex. Élie" aria-label="Nouveau mot" style={{ ...CHAMP, width: '13rem' }} />
        <input value={nouveau.note ?? ''} onChange={e => setNouveau(n => ({ ...n, note: e.target.value }))}
          onKeyDown={surEntree(() => void ajouter())} maxLength={LONGUEUR_NOTE}
          placeholder="Note facultative" aria-label="Note du nouveau mot" style={{ ...CHAMP, flex: '1 1 14rem', minWidth: '10rem' }} />
        <label style={ETIQUETTE_CASE}>
          <input type="checkbox" checked={nouveau.faux_positif} onChange={e => setNouveau(n => ({ ...n, faux_positif: e.target.checked }))} />
          faux positif, sans accent
        </label>
        <button onClick={() => void ajouter()} disabled={occupe || !nouveau.mot.trim()} className="btn-vert" style={BOUTON}>
          Ajouter
        </button>
      </div>
      {erreurAjout && <p role="alert" style={ERREUR}>{erreurAjout}</p>}

      {/* ── Chercher, filtrer ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap', margin: '18px 0 10px' }}>
        <input type="search" value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Rechercher un mot ou une note" aria-label="Rechercher dans la liste" style={{ ...CHAMP, width: '16rem' }} />
        <OngletsPage<RegimeAccentuation>
          nature="filtres"
          intitule="Régime des mots"
          onglets={[
            { cle: 'tous', libelle: `Tous (${liste.length})` },
            { cle: 'accentuer', libelle: `À accentuer (${liste.length - nbFaux})` },
            { cle: 'faux_positif', libelle: `Faux positifs (${nbFaux})` },
          ]}
          actif={regime}
          choisir={setRegime}
          style={{ flex: '1 1 20rem', maxWidth: '30rem', marginLeft: 0, marginRight: 0 }}
        />
      </div>

      {erreurChargement && <p role="alert" style={ERREUR}>{erreurChargement}</p>}

      {mots === null ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', fontStyle: 'italic' }}>Chargement…</p>
      ) : (
        <>
          <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)', margin: '0 0 6px' }}>
            {visibles.length === liste.length
              ? `${liste.length} mot${liste.length > 1 ? 's' : ''}`
              : `${visibles.length} mot${visibles.length > 1 ? 's' : ''} sur ${liste.length}`}
          </p>
          {groupes.length > 1 && (
            <nav aria-label="Lettres" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', margin: '0 0 8px' }}>
              {groupes.map(g => (
                <a key={g.lettre} href={`#accentuation-${g.lettre}`} style={{ fontFamily: SERIF, fontSize: '0.875rem', color: 'var(--cs-vert)', textDecoration: 'none', padding: '1px 6px', border: '1px solid var(--cs-bord-clair)', borderRadius: '4px' }}>
                  {g.lettre}
                </a>
              ))}
            </nav>
          )}
          {visibles.length === 0 && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', fontStyle: 'italic', padding: '12px 0' }}>
              {liste.length === 0 ? 'La liste est vide.' : 'Aucun mot ne répond à la recherche.'}
            </p>
          )}
          {groupes.map(g => (
            <div key={g.lettre} id={`accentuation-${g.lettre}`} style={{ scrollMarginTop: '5rem' }}>
              <h3 style={{ fontFamily: SERIF, fontSize: '1.0625rem', fontWeight: 500, color: 'var(--cs-vert)', margin: '16px 0 2px', paddingBottom: '2px', borderBottom: '1px solid var(--cs-bord)' }}>
                {g.lettre}
              </h3>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {g.mots.map(m => edition?.id === m.id ? (
                  <li key={m.id} style={{ ...LIGNE, flexWrap: 'wrap', background: 'var(--cs-fond-clair)' }}>
                    <input value={edition.mot} onChange={e => setEdition({ ...edition, mot: e.target.value })} autoFocus
                      onKeyDown={surEntree(() => void enregistrer(), () => setEdition(null))} maxLength={LONGUEUR_MOT}
                      aria-label="Mot" style={{ ...CHAMP, width: '11rem' }} />
                    <input value={edition.note ?? ''} onChange={e => setEdition({ ...edition, note: e.target.value })}
                      onKeyDown={surEntree(() => void enregistrer(), () => setEdition(null))} maxLength={LONGUEUR_NOTE}
                      placeholder="Note facultative" aria-label="Note" style={{ ...CHAMP, flex: '1 1 14rem', minWidth: '10rem' }} />
                    <label style={ETIQUETTE_CASE}>
                      <input type="checkbox" checked={edition.faux_positif} onChange={e => setEdition({ ...edition, faux_positif: e.target.checked })} />
                      faux positif
                    </label>
                    <button onClick={() => void enregistrer()} disabled={occupe || !edition.mot.trim()} className="btn-vert" style={BOUTON}>Enregistrer</button>
                    <button onClick={() => setEdition(null)} disabled={occupe} className="btn-gris" style={BOUTON}>Annuler</button>
                    {erreurEdition && <p role="alert" style={{ ...ERREUR, flexBasis: '100%', margin: 0 }}>{erreurEdition}</p>}
                  </li>
                ) : (
                  <li key={m.id} style={LIGNE}>
                    <span style={{ flex: '0 0 auto', minWidth: '9rem' }}>
                      <span style={{ fontFamily: SERIF, fontSize: '0.9375rem', color: 'var(--cs-texte-fort)' }}>{m.mot}</span>
                      {' '}
                      <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-second)' }}>{precision(m)}</span>
                    </span>
                    <span style={{ flex: '1 1 12rem', fontSize: '0.75rem', color: 'var(--cs-texte-second)', lineHeight: 1.45 }}>{m.note}</span>
                    <span style={{ display: 'flex', gap: '6px', flex: '0 0 auto' }}>
                      <button onClick={() => ouvrirEdition(m)} disabled={occupe} className="btn-gris" style={BOUTON_LIGNE}>Modifier</button>
                      <button onClick={() => void retirer(m)} disabled={occupe} className="btn-rouge" style={BOUTON_LIGNE}
                        aria-label={`Retirer ${m.mot}`} title="Retirer de la liste">✕</button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  )
}

/** Ce qui suit le mot : la faute qu'il corrige, ou la marque du faux positif. */
function precision(m: MotAccentuation): string {
  if (m.faux_positif) return 'sans accent'
  const fautive = formeFautive(m.mot)
  return fautive ? `et non ${fautive}` : ''
}

const CHAMP: CSSProperties = {
  font: 'inherit', fontSize: '0.8125rem', padding: '6px 9px', border: '1px solid var(--cs-bord)',
  borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box',
}
const BOUTON: CSSProperties = { font: 'inherit', fontSize: '0.78125rem', fontWeight: 500, padding: '6px 14px', borderRadius: '4px', cursor: 'pointer' }
const BOUTON_LIGNE: CSSProperties = { font: 'inherit', fontSize: '0.71875rem', padding: '2px 9px', borderRadius: '4px', cursor: 'pointer' }
const ETIQUETTE_CASE: CSSProperties = { fontSize: '0.75rem', color: 'var(--cs-texte-second)', display: 'flex', alignItems: 'center', gap: '5px' }
const LIGNE: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px', padding: '5px 4px', borderBottom: '1px solid var(--cs-bord-clair)' }
const ERREUR: CSSProperties = { fontSize: '0.75rem', color: 'var(--cs-danger)', margin: '4px 0 0' }
