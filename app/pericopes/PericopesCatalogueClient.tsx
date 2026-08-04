'use client'

// Catalogue de toutes les péricopes, sur le modèle de la page « Histoire de l'Église » :
// volet de filtres à gauche (recherche, Testament, registre) et liste à droite, groupée
// par livre biblique (ordre canonique). Les données arrivent PRÉ-CHARGÉES du serveur
// (rendu ISR, voir app/pericopes/page.tsx) ; ce composant ne gère que l'interactivité.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { LIVRES, ABREV_FR } from '@/app/lib/bible'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { parsePointCanonique } from '@/app/lib/referencesBibliques'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import {
  chargerNoticePericope,
  libelleCategoriePericope,
  type PericopeCatalogueItem,
} from '@/app/lib/pericopes'

const FOND = '#f4f0eb'
const TEXTE2 = '#7a746d'
const BORD = '#ddd4ca'
const SEP = '#ece6db'
const VERT = 'var(--cs-vert)'
const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

const ORDRE_LIVRE: Record<string, number> = Object.fromEntries(LIVRES.map((l, i) => [l.code, i]))
const NOM_LIVRE: Record<string, string> = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))
const TESTAMENT_LIVRE: Record<string, 'AT' | 'NT' | 'AUTRES'> = Object.fromEntries(LIVRES.map(l => [l.code, l.testament]))

const TESTAMENTS: { code: 'AT' | 'NT' | 'AUTRES'; label: string }[] = [
  { code: 'AT', label: 'Ancien Testament' },
  { code: 'NT', label: 'Nouveau Testament' },
  { code: 'AUTRES', label: 'Autres écrits' },
]

function cleTri(item: PericopeCatalogueItem): number {
  const p = parsePointCanonique(item.canon_debut)
  return (p?.chapitre ?? 0) * 1000 + (p?.verset ?? 0)
}
function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Référence SANS le nom du livre (celui-ci est déjà l'intertitre du groupe) :
// « 3, 1-24 », « 18, 16 - 19, 29 ». Mêmes conventions d'espaces que la référence complète.
function refDansLivre(debut: string, fin: string | null): string {
  const d = parsePointCanonique(debut)
  if (!d || d.chapitre == null) return ''
  const f = fin ? parsePointCanonique(fin) : d
  const cv = (p: { chapitre: number | null; verset: number | null }) =>
    p.verset != null ? `${p.chapitre}, ${p.verset}` : `${p.chapitre}`
  const debutTxt = cv(d)
  if (!f || (f.chapitre === d.chapitre && f.verset === d.verset)) return debutTxt
  if (f.chapitre === d.chapitre) return f.verset != null ? `${debutTxt}-${f.verset}` : debutTxt
  return f.verset != null ? `${debutTxt} - ${f.chapitre}, ${f.verset}` : `${debutTxt} - ${f.chapitre}`
}

// ── Composants de filtre, repris de la page Histoire ─────────────────────────
function GroupeFiltre({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '13px', paddingTop: '13px', borderTop: `1px solid ${SEP}` }}>
      <div style={{ fontFamily: SANS, fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', marginBottom: '8px' }}>{label}</div>
      {children}
    </div>
  )
}
function LigneCase({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={actif} style={{
      display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'none', border: 'none', borderLeft: `2px solid ${actif ? VERT : 'transparent'}`,
      padding: '2px 0 2px 9px', margin: 0,
      fontFamily: SERIF, fontSize: '0.76rem', lineHeight: 1.35,
      color: actif ? VERT : '#8a8278', fontWeight: actif ? 600 : 400,
      transition: 'color 0.12s, border-color 0.12s',
    }}>{children}</button>
  )
}
function LigneCompte({ actif, onClick, label, n }: { actif: boolean; onClick: () => void; label: string; n: number }) {
  return (
    <LigneCase actif={actif} onClick={onClick}>
      <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <span style={{ fontFamily: SANS, fontSize: '0.62rem', color: actif ? VERT : 'var(--cs-texte-second)' }}>{n}</span>
      </span>
    </LigneCase>
  )
}

export default function PericopesCatalogueClient({ items }: { items: PericopeCatalogueItem[] }) {
  const mobile = useEstMobile(900)
  const [q, setQ] = useState('')
  const [testaments, setTestaments] = useState<Set<string>>(new Set())
  const [registres, setRegistres] = useState<Set<string>>(new Set())
  const [panneauOuvert, setPanneauOuvert] = useState(false)

  const compteTestament = useMemo(() => {
    const c: Record<string, number> = { AT: 0, NT: 0, AUTRES: 0 }
    for (const it of items) c[TESTAMENT_LIVRE[it.livre] ?? 'AUTRES']++
    return c
  }, [items])

  const registresPresents = useMemo(() => {
    const compte = new Map<string, number>()
    for (const it of items) compte.set(it.categorie, (compte.get(it.categorie) ?? 0) + 1)
    return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
  }, [items])

  // Recherche : titre d'abord, puis appellations (ex. « baleine » → « Jonas et le grand
  // poisson »). Quand le match ne vient PAS du titre, on note l'appellation trouvée.
  const { itemsFiltres, viaAppellation } = useMemo(() => {
    const qn = sansAccents(q.trim())
    const via: Record<string, string> = {}
    const list = items.filter(it => {
      if (testaments.size && !testaments.has(TESTAMENT_LIVRE[it.livre] ?? 'AUTRES')) return false
      if (registres.size && !registres.has(it.categorie)) return false
      if (!qn) return true
      if (sansAccents(it.nom).includes(qn)) return true
      const alias = it.appellations.find(a => sansAccents(a).includes(qn))
      if (alias) { via[it.id] = alias; return true }
      return false
    })
    return { itemsFiltres: list, viaAppellation: via }
  }, [items, q, testaments, registres])

  const groupes = useMemo(() => {
    const parLivre = new Map<string, PericopeCatalogueItem[]>()
    for (const it of itemsFiltres) {
      const list = parLivre.get(it.livre) ?? []
      list.push(it)
      parLivre.set(it.livre, list)
    }
    return [...parLivre.entries()]
      .sort((a, b) => (ORDRE_LIVRE[a[0]] ?? 9999) - (ORDRE_LIVRE[b[0]] ?? 9999))
      .map(([livre, list]) => ({ livre, list: list.sort((a, b) => cleTri(a) - cleTri(b)) }))
  }, [itemsFiltres])

  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const s = new Set(set)
    if (s.has(val)) s.delete(val); else s.add(val)
    setter(s)
  }
  const reinitialiser = () => { setQ(''); setTestaments(new Set()); setRegistres(new Set()) }
  const filtresActifs = !!q || testaments.size > 0 || registres.size > 0

  // Index des livres : saut doux vers le groupe correspondant. En mobile, on referme
  // d'abord le panneau de filtres pour dégager la liste.
  const allerAuLivre = (code: string) => {
    if (mobile) setPanneauOuvert(false)
    requestAnimationFrame(() => {
      document.getElementById(`livre-${code}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  // Notices dépliées à la demande (survol « Développer la notice »). Le catalogue ne
  // charge pas les notices d'emblée : on les récupère une fois, au premier dépli.
  const [notices, setNotices] = useState<Record<string, 'load' | 'err' | { notice: string | null; contexte: string | null }>>({})
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set())
  const basculerNotice = async (id: string) => {
    setOuvertes(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
    if (notices[id]) return
    setNotices(prev => ({ ...prev, [id]: 'load' }))
    try {
      const n = await chargerNoticePericope(id)
      setNotices(prev => ({ ...prev, [id]: { notice: n.notice, contexte: n.contexte } }))
    } catch {
      setNotices(prev => ({ ...prev, [id]: 'err' }))
    }
  }

  const contenuFiltres = (
    <>
      <div style={{ position: 'relative', marginTop: '2px' }}>
        <input value={q} onChange={e => setQ(e.target.value)} type="text"
          placeholder="Rechercher une péricope…" aria-label="Rechercher une péricope"
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: SERIF, fontSize: '0.76rem', padding: '7px 10px 7px 28px', borderRadius: '6px', border: `1px solid ${BORD}`, background: '#fff', color: 'var(--cs-texte)', outline: 'none' }} />
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none" style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
          <circle cx="5.5" cy="5.5" r="4.5" stroke="#2a2520" strokeWidth="1.2" />
          <line x1="9" y1="9" x2="12" y2="12" stroke="#2a2520" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {q && (
          <button onClick={() => setQ('')} aria-label="Effacer la recherche"
            style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: TEXTE2, fontSize: '0.8rem', lineHeight: 1, padding: 0 }}>✕</button>
        )}
      </div>

      {groupes.length > 0 && (
        <GroupeFiltre label="Aller à un livre">
          {/* Testaments séparés ; abréviations en sans, alignées en colonnes, sans cadres. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {TESTAMENTS.map(grp => {
              const livres = groupes.filter(g => (TESTAMENT_LIVRE[g.livre] ?? 'AUTRES') === grp.code)
              if (livres.length === 0) return null
              return (
                <div key={grp.code}>
                  <p style={{ fontFamily: SANS, fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', margin: '0 0 6px' }}>{grp.label}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px 8px' }}>
                    {livres.map(g => (
                      <button key={g.livre} onClick={() => allerAuLivre(g.livre)}
                        title={NOM_LIVRE[g.livre] ?? g.livre}
                        style={{ fontFamily: SANS, fontSize: '0.68rem', color: '#6f665b', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => (e.currentTarget.style.color = VERT)}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6f665b')}>
                        {ABREV_FR[g.livre] ?? g.livre}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </GroupeFiltre>
      )}

      <GroupeFiltre label="Testament">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {TESTAMENTS.filter(t => compteTestament[t.code] > 0).map(t => (
            <LigneCompte key={t.code} actif={testaments.has(t.code)} onClick={() => toggle(testaments, t.code, setTestaments)} label={t.label} n={compteTestament[t.code]} />
          ))}
        </div>
      </GroupeFiltre>

      {registresPresents.length > 0 && (
        <GroupeFiltre label="Registre">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {registresPresents.map(([cat, n]) => (
              <LigneCompte key={cat} actif={registres.has(cat)} onClick={() => toggle(registres, cat, setRegistres)} label={libelleCategoriePericope(cat)} n={n} />
            ))}
          </div>
        </GroupeFiltre>
      )}

      {filtresActifs && (
        <button onClick={reinitialiser}
          style={{ marginTop: '14px', width: '100%', padding: '6px 9px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${BORD}`, background: '#fff', color: 'var(--cs-texte-second)', fontFamily: SERIF, fontSize: '0.76rem' }}>
          Réinitialiser les filtres
        </button>
      )}
    </>
  )

  return (
    <main style={{ background: FOND, minHeight: 'calc(100vh - 3.5rem)' }}>
      <style>{`
        /* En-tête de livre : au fer à gauche, prolongé d'un filet qui s'estompe. */
        .peri-livre-tete { display: flex; align-items: baseline; gap: 11px; margin: 0 0 6px; }
        .peri-livre-tete h2 {
          font-family: ${SERIF}; font-size: 1rem; font-weight: 600; color: #2f4034;
          margin: 0; white-space: nowrap; letter-spacing: 0.01em;
        }
        .peri-livre-tete .rule { flex: 1; height: 1px; align-self: center; background: linear-gradient(to right, #d8cfbf, transparent); }
        .peri-livre-tete .n { font-family: ${SANS}; font-size: 0.6rem; color: #8a8272; flex-shrink: 0; }

        /* Entrée : titre serif à gauche, référence dorée à droite (comme la table d'un
           livre) ; en dessous, registre en petit gris et « notice » révélé au survol. Les
           blocs sont compacts mais espacés (row-gap de la grille). */
        .peri-bloc { position: relative; break-inside: avoid; }
        .peri-entree {
          display: block; text-decoration: none; color: inherit;
          padding: 2px 2px 2px 0; border-radius: 5px; transition: background 0.14s ease;
        }
        .peri-entree:hover { background: rgba(var(--cs-vert-rgb),0.045); }
        .peri-l1 { display: flex; align-items: baseline; gap: 10px; }
        .peri-titre { flex: 1; min-width: 0; font-family: ${SERIF}; font-size: 0.88rem; font-weight: 500; color: #26302a; line-height: 1.26; }
        .peri-ens { margin-left: 5px; font-family: ${SERIF}; font-style: italic; font-size: 0.66rem; font-weight: 400; color: #a99f92; }
        .peri-ref { flex-shrink: 0; font-family: ${SERIF}; font-size: 0.73rem; color: #b08f48; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .peri-l2 { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: 1px; min-height: 0.9rem; }
        .peri-reg { font-family: ${SANS}; font-size: 0.53rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cs-texte-second); }
        /* « Notice » = une flèche descendante discrète (trait + triangle), révélée au
           survol et retournée quand la notice est ouverte. */
        .peri-notice-lien {
          flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
          background: none; border: none; padding: 2px 3px; cursor: pointer; line-height: 0;
          color: #b0975a; opacity: 0; transition: opacity 0.15s ease, color 0.12s ease;
        }
        .peri-notice-lien svg { display: block; transition: transform 0.18s ease; }
        .peri-entree:hover .peri-notice-lien,
        .peri-notice-lien:focus-visible { opacity: 1; }
        .peri-notice-lien:hover { color: #7a6030; }
        .peri-notice-lien[aria-expanded="true"] { opacity: 1; color: #7a6030; }
        .peri-notice-lien[aria-expanded="true"] svg { transform: rotate(180deg); }
        @media (hover: none) { .peri-notice-lien { opacity: 0.55; } }
        .peri-via { display: block; margin-top: 2px; font-family: ${SERIF}; font-style: italic; font-size: 0.65rem; color: #a08f5f; }
        .peri-notice {
          font-family: ${SERIF}; font-size: 0.76rem; line-height: 1.5; color: #55504a;
          margin: 3px 0 2px; padding: 6px 0 1px; border-top: 1px dashed ${SEP};
        }
        .peri-notice .ctx { display: block; margin-top: 4px; font-style: italic; color: #8a8278; font-size: 0.7rem; }
      `}</style>
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'stretch', width: '100%' }}>

        {/* ── Volet des filtres (repliable en mobile). ── */}
        <aside style={{
          flexShrink: 0, width: mobile ? '100%' : '15.5rem',
          position: mobile ? 'static' : 'sticky', top: '3.5rem',
          height: mobile ? 'auto' : 'calc(100vh - 3.5rem)',
          display: 'flex', flexDirection: 'column',
          background: '#fbf8f3',
          borderRight: mobile ? 'none' : `1px solid ${BORD}`,
          borderBottom: mobile ? `1px solid ${BORD}` : 'none',
        }}>
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORD}`, padding: '13px 15px 13px' }}>
            <p style={{ fontFamily: SANS, fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#b0a088', margin: '0 0 4px' }}>Catalogue</p>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: '1.05rem', fontWeight: 600, color: VERT, lineHeight: 1.15, letterSpacing: '0.01em' }}>Les péricopes</h1>
            {/* Chapeau : la définition, puis une ligne d'accroche en italique pour le
                rythme. Énumération par deux-points (pas d'incise entre tirets). */}
            <p style={{ margin: '8px 0 0', fontFamily: SERIF, fontSize: '0.72rem', lineHeight: 1.55, color: '#6f6a62' }}>
              Une péricope est un passage biblique formant une unité de sens :{' '}
              <span style={{ fontStyle: 'italic', color: '#8a7f70' }}>récit, parabole, discours ou psaume</span>.
            </p>
            <p style={{ margin: '5px 0 0', fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.68rem', lineHeight: 1.4, color: '#a99f92' }}>
              Ce catalogue les rassemble, livre après livre.
            </p>
          </div>

          {mobile ? (
            <>
              <button onClick={() => setPanneauOuvert(o => !o)} aria-expanded={panneauOuvert} aria-controls="pericopes-filtres"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 15px', border: 'none', borderBottom: panneauOuvert ? `1px solid ${SEP}` : 'none', background: 'transparent', cursor: 'pointer', fontFamily: SERIF, fontSize: '0.8rem', color: '#5a5044' }}>
                <span>Filtres{filtresActifs ? ' (actifs)' : ''}</span>
                <span aria-hidden style={{ color: TEXTE2, fontSize: '0.7rem' }}>{panneauOuvert ? '▲' : '▼'}</span>
              </button>
              {panneauOuvert && <div id="pericopes-filtres" style={{ padding: '0 15px 18px' }}>{contenuFiltres}</div>}
            </>
          ) : (
            <div id="pericopes-filtres" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 15px 22px' }}>
              {contenuFiltres}
            </div>
          )}
        </aside>

        {/* ── Liste ── */}
        <section style={{ flex: 1, minWidth: 0, padding: mobile ? '16px 14px 56px' : '16px 32px 64px' }}>
          <div style={{ maxWidth: '39rem', margin: '0 auto' }}>

            {groupes.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '20px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0 }}>Aucune péricope ne correspond aux filtres retenus.</p>
                {filtresActifs && (
                  <button onClick={reinitialiser}
                    style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', border: `1px solid ${BORD}`, background: '#fff', color: 'var(--cs-texte-second)', fontFamily: SERIF, fontSize: '0.78rem' }}>
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                {groupes.map(g => (
                  <div key={g.livre} id={`livre-${g.livre}`} style={{ scrollMarginTop: 'calc(3.5rem + 12px)' }}>
                    {/* En-tête de livre au fer à gauche, prolongé d'un filet. */}
                    <div className="peri-livre-tete">
                      <h2>{NOM_LIVRE[g.livre] ?? g.livre}</h2>
                      <span className="rule" aria-hidden="true" />
                      <span className="n">{g.list.length}</span>
                    </div>
                    {/* Deux colonnes par livre (une seule en mobile). Chaque entrée mène à sa
                        page ; « notice » déplie la notice en place. Blocs compacts, espacés. */}
                    <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', columnGap: '3.5rem', rowGap: '9px', alignItems: 'start' }}>
                      {g.list.map(it => {
                        const ouverte = ouvertes.has(it.id)
                        const notice = notices[it.id]
                        const via = viaAppellation[it.id]
                        return (
                          <div key={it.id} className="peri-bloc">
                            <Link href={`/pericopes/${it.id}`} className="peri-entree">
                              <div className="peri-l1">
                                <span className="peri-titre">
                                  {rendreTexteEnrichi(it.nom)}
                                  {it.est_collection && <span className="peri-ens">ensemble</span>}
                                </span>
                                <span className="peri-ref">{refDansLivre(it.canon_debut, it.canon_fin)}</span>
                              </div>
                              <div className="peri-l2">
                                <span className="peri-reg">{libelleCategoriePericope(it.categorie)}</span>
                                <button type="button" className="peri-notice-lien" aria-expanded={ouverte}
                                  aria-label={ouverte ? 'Masquer la notice' : 'Afficher la notice'} title={ouverte ? 'Masquer la notice' : 'Afficher la notice'}
                                  onClick={e => { e.preventDefault(); e.stopPropagation(); void basculerNotice(it.id) }}>
                                  <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden="true">
                                    <path d="M5 1.4V6.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
                                    <path d="M5 10.4 1.9 6.4H8.1L5 10.4Z" fill="currentColor" />
                                  </svg>
                                </button>
                              </div>
                              {via && <span className="peri-via">trouvé via «&#8239;{via}&#8239;»</span>}
                            </Link>
                            {ouverte && (
                              <div className="peri-notice">
                                {notice === undefined || notice === 'load' ? 'Chargement de la notice…'
                                  : notice === 'err' ? 'La notice n’a pas pu être chargée.'
                                  : (notice.notice || notice.contexte) ? (
                                    <>
                                      {notice.notice && <span>{rendreTexteEnrichi(notice.notice)}</span>}
                                      {notice.contexte && <span className="ctx">{rendreTexteEnrichi(notice.contexte)}</span>}
                                    </>
                                  ) : 'Aucune notice pour cette péricope.'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
