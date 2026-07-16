'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Statut = 'à faire' | 'en cours' | 'fait'

interface Tache {
  id: number
  titre: string
  description: string | null
  categorie: string
  priorite: number
  statut: Statut
  position: number | null
}

const PRIORITES: Record<number, { label: string; court: string; couleur: string }> = {
  1: { label: 'Critique', court: 'P1', couleur: '#b00020' },
  2: { label: 'Haute',    court: 'P2', couleur: '#c05600' },
  3: { label: 'Moyenne',  court: 'P3', couleur: '#2a6640' },
  4: { label: 'Basse',    court: 'P4', couleur: '#5b6b7a' },
  5: { label: 'Un jour',  court: 'P5', couleur: '#8a8378' },
}

const STATUTS: Statut[] = ['à faire', 'en cours', 'fait']

const ORDRE_CATEGORIES = [
  'Œuvres & segments', 'Audit technique', 'Bible & Œuvre', 'Admin',
  'Général & charte', 'Traductions', 'Notifications', 'Essais',
  'Jeu & Quiz', 'Idées & long terme',
]

export default function SectionTaches() {
  const [taches, setTaches] = useState<Tache[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [recherche, setRecherche] = useState('')
  const [filtreCat, setFiltreCat] = useState<string>('Toutes')
  const [filtreStatut, setFiltreStatut] = useState<'tous' | Statut>('tous')
  const [masquerFaites, setMasquerFaites] = useState(true)
  const [tri, setTri] = useState<'priorite' | 'categorie'>('categorie')

  const [enEdition, setEnEdition] = useState<number | null>(null)
  const [aConfirmerSuppr, setAConfirmerSuppr] = useState<number | null>(null)
  const [deplie, setDeplie] = useState<Set<number>>(new Set())
  const [formOuvert, setFormOuvert] = useState(false)

  async function charger() {
    setChargement(true)
    const { data, error } = await supabase
      .from('taches')
      .select('id, titre, description, categorie, priorite, statut, position')
      .order('priorite', { ascending: true })
      .order('position', { ascending: true })
    if (error) setErreur(error.message)
    else setTaches((data as Tache[]) ?? [])
    setChargement(false)
  }

  useEffect(() => { charger() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function flash(txt: string) {
    setMessage(txt)
    window.setTimeout(() => setMessage(null), 2600)
  }

  async function patch(id: number, champs: Partial<Tache>) {
    const avant = taches
    setTaches((t) => t.map((x) => (x.id === id ? { ...x, ...champs } : x)))
    const { error } = await supabase.from('taches').update({ ...champs, maj_le: new Date().toISOString() }).eq('id', id)
    if (error) { setTaches(avant); setErreur('Modification refusée : ' + error.message) }
  }

  async function supprimer(id: number) {
    const avant = taches
    setTaches((t) => t.filter((x) => x.id !== id))
    setAConfirmerSuppr(null)
    const { error } = await supabase.from('taches').delete().eq('id', id)
    if (error) { setTaches(avant); setErreur('Suppression refusée : ' + error.message) }
    else flash('Tâche supprimée.')
  }

  async function ajouter(nouv: Omit<Tache, 'id' | 'position'>) {
    const maxPos = Math.max(0, ...taches.map((t) => t.position ?? 0))
    const { data, error } = await supabase.from('taches')
      .insert({ ...nouv, position: maxPos + 10 })
      .select('id, titre, description, categorie, priorite, statut, position')
      .single()
    if (error) { setErreur('Ajout refusé : ' + error.message); return }
    setTaches((t) => [...t, data as Tache])
    setFormOuvert(false)
    flash('Tâche ajoutée.')
  }

  function envoyerAClaude(t: Tache) {
    const texte = `Traite ce point de la to-do Corpus Scriptura.\n\nTitre : ${t.titre}\nCatégorie : ${t.categorie} — Priorité ${PRIORITES[t.priorite]?.court} (${PRIORITES[t.priorite]?.label})\n\nDétail : ${t.description ?? '—'}`
    navigator.clipboard?.writeText(texte).then(
      () => { patch(t.id, { statut: 'en cours' }); flash('Consigne copiée — colle-la dans Claude (tâche passée « en cours »).') },
      () => flash('Copie impossible : sélectionne le texte manuellement.')
    )
  }

  const categories = useMemo(() => {
    const set = new Set(taches.map((t) => t.categorie))
    return Array.from(set).sort((a, b) => (ORDRE_CATEGORIES.indexOf(a) + 1 || 99) - (ORDRE_CATEGORIES.indexOf(b) + 1 || 99))
  }, [taches])

  const visibles = useMemo(() => {
    const r = recherche.trim().toLowerCase()
    return taches.filter((t) => {
      if (masquerFaites && t.statut === 'fait') return false
      if (filtreStatut !== 'tous' && t.statut !== filtreStatut) return false
      if (filtreCat !== 'Toutes' && t.categorie !== filtreCat) return false
      if (r && !(t.titre.toLowerCase().includes(r) || (t.description ?? '').toLowerCase().includes(r))) return false
      return true
    })
  }, [taches, recherche, filtreCat, filtreStatut, masquerFaites])

  const groupes = useMemo(() => {
    if (tri === 'priorite') {
      const tries = [...visibles].sort((a, b) => a.priorite - b.priorite || (a.position ?? 0) - (b.position ?? 0))
      return [{ titre: 'Par priorité', items: tries }]
    }
    return categories
      .map((cat) => ({ titre: cat, items: visibles.filter((t) => t.categorie === cat).sort((a, b) => a.priorite - b.priorite || (a.position ?? 0) - (b.position ?? 0)) }))
      .filter((g) => g.items.length > 0)
  }, [visibles, categories, tri])

  const stats = useMemo(() => {
    const total = taches.length
    const faites = taches.filter((t) => t.statut === 'fait').length
    const cours = taches.filter((t) => t.statut === 'en cours').length
    return { total, faites, cours, reste: total - faites }
  }, [taches])

  return (
    <div className="cs-taches">
      <style>{CSS}</style>

      <header className="cs-head">
        <h1>À faire</h1>
        <div className="cs-stats">
          <span><b>{stats.reste}</b> restantes</span>
          <span><b>{stats.cours}</b> en cours</span>
          <span><b>{stats.faites}</b> faites</span>
        </div>
      </header>

      {(erreur || message) && (
        <div className={'cs-toast ' + (erreur ? 'err' : 'ok')} onClick={() => { setErreur(null); setMessage(null) }}>
          {erreur ?? message}<span className="cs-toast-x">✕</span>
        </div>
      )}

      <div className="cs-toolbar">
        <input className="cs-search" placeholder="Rechercher une tâche…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        <select className="cs-select" value={filtreCat} onChange={(e) => setFiltreCat(e.target.value)}>
          <option>Toutes</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="cs-seg">
          {(['tous', 'à faire', 'en cours', 'fait'] as const).map((s) => (
            <button key={s} className={filtreStatut === s ? 'on' : ''} onClick={() => setFiltreStatut(s)}>
              {s === 'tous' ? 'Tous' : s}
            </button>
          ))}
        </div>
        <button className="cs-ghost" onClick={() => setTri(tri === 'categorie' ? 'priorite' : 'categorie')}>
          Tri : {tri === 'categorie' ? 'catégorie' : 'priorité'}
        </button>
        <label className="cs-check">
          <input type="checkbox" checked={masquerFaites} onChange={(e) => setMasquerFaites(e.target.checked)} />
          masquer les faites
        </label>
        <button className="cs-add" onClick={() => setFormOuvert((v) => !v)}>
          {formOuvert ? 'Fermer' : '+ Nouvelle tâche'}
        </button>
      </div>

      {formOuvert && <FormTache onSave={ajouter} onCancel={() => setFormOuvert(false)} categoriesConnues={categories} />}

      {chargement ? (
        <p className="cs-vide">Chargement…</p>
      ) : groupes.length === 0 ? (
        <p className="cs-vide">Aucune tâche. Ajuste les filtres ou ajoute-en une.</p>
      ) : (
        groupes.map((g) => (
          <section key={g.titre} className="cs-groupe">
            <h2>{g.titre} <span className="cs-compte">{g.items.length}</span></h2>
            <ul>
              {g.items.map((t) =>
                enEdition === t.id ? (
                  <li key={t.id} className="cs-ligne edit">
                    <FormTache initiale={t} categoriesConnues={categories}
                      onSave={async (v) => { await patch(t.id, v); setEnEdition(null) }}
                      onCancel={() => setEnEdition(null)} />
                  </li>
                ) : (
                  <li key={t.id} className={'cs-ligne' + (t.statut === 'fait' ? ' faite' : '')}>
                    <div className="cs-ligne-main">
                      <select className={'cs-statut st-' + t.statut.replace(/\s/g, '-')} value={t.statut}
                        onChange={(e) => patch(t.id, { statut: e.target.value as Statut })} title="Statut">
                        {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <div className="cs-corps" onClick={() => setDeplie((d) => { const n = new Set(d); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n })}>
                        <div className="cs-titre">
                          {t.titre}
                          {tri === 'priorite' && <span className="cs-cat-tag">{t.categorie}</span>}
                        </div>
                        {deplie.has(t.id) && t.description && <p className="cs-desc">{t.description}</p>}
                      </div>
                      <div className="cs-droite">
                        <select className="cs-prio"
                          style={{ color: PRIORITES[t.priorite]?.couleur, borderColor: PRIORITES[t.priorite]?.couleur }}
                          value={t.priorite} onChange={(e) => patch(t.id, { priorite: Number(e.target.value) })} title="Priorité">
                          {Object.entries(PRIORITES).map(([n, p]) => <option key={n} value={n}>{p.court} · {p.label}</option>)}
                        </select>
                        <button className="cs-mini claude" onClick={() => envoyerAClaude(t)}>→ Claude</button>
                        <button className="cs-mini" onClick={() => setEnEdition(t.id)}>Modifier</button>
                        {aConfirmerSuppr === t.id ? (
                          <span className="cs-confirm">
                            Supprimer ?
                            <button className="cs-mini danger" onClick={() => supprimer(t.id)}>oui</button>
                            <button className="cs-mini" onClick={() => setAConfirmerSuppr(null)}>non</button>
                          </span>
                        ) : (
                          <button className="cs-mini" onClick={() => setAConfirmerSuppr(t.id)}>Supprimer</button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              )}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function FormTache({ initiale, onSave, onCancel, categoriesConnues }: {
  initiale?: Tache
  onSave: (v: Omit<Tache, 'id' | 'position'>) => void | Promise<void>
  onCancel: () => void
  categoriesConnues: string[]
}) {
  const [titre, setTitre] = useState(initiale?.titre ?? '')
  const [description, setDescription] = useState(initiale?.description ?? '')
  const [categorie, setCategorie] = useState(initiale?.categorie ?? categoriesConnues[0] ?? 'Divers')
  const [priorite, setPriorite] = useState(initiale?.priorite ?? 3)
  const [statut, setStatut] = useState<Statut>(initiale?.statut ?? 'à faire')
  const [autreCat, setAutreCat] = useState('')

  function valider() {
    const cat = categorie === '__autre' ? autreCat.trim() || 'Divers' : categorie
    if (!titre.trim()) return
    onSave({ titre: titre.trim(), description: description.trim() || null, categorie: cat, priorite, statut })
  }

  return (
    <div className="cs-form">
      <input className="cs-f-titre" placeholder="Titre de la tâche" value={titre} onChange={(e) => setTitre(e.target.value)} autoFocus />
      <textarea className="cs-f-desc" placeholder="Détail (facultatif)" value={description ?? ''} onChange={(e) => setDescription(e.target.value)} rows={3} />
      <div className="cs-f-ligne">
        <select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
          {categoriesConnues.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="__autre">+ nouvelle catégorie…</option>
        </select>
        {categorie === '__autre' && <input placeholder="Nom de la catégorie" value={autreCat} onChange={(e) => setAutreCat(e.target.value)} />}
        <select value={priorite} onChange={(e) => setPriorite(Number(e.target.value))}>
          {Object.entries(PRIORITES).map(([n, p]) => <option key={n} value={n}>{p.court} · {p.label}</option>)}
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value as Statut)}>
          {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="cs-add" onClick={valider}>{initiale ? 'Enregistrer' : 'Ajouter'}</button>
        <button className="cs-ghost" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  )
}

const CSS = `
.cs-taches{--ink:#1a1f1c;--mut:#4a5c52;--acc:#3d6b4f;--pap:#dde6e0;--bord:#c4d4ca;
  color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}
.cs-taches h1{font-family:Georgia,"Times New Roman",serif;font-size:22px;margin:0;font-weight:600;color:#1a2e22;}
.cs-head{display:flex;justify-content:space-between;align-items:center;gap:16px;
  border-bottom:2px solid #3d6b4f;padding-bottom:12px;margin-bottom:16px;flex-wrap:wrap;}
.cs-stats{display:flex;gap:16px;font-size:13px;color:var(--mut);}
.cs-stats b{color:#1a2e22;font-size:15px;}
.cs-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px;}
.cs-search{flex:1 1 200px;min-width:160px;padding:8px 11px;border:1px solid var(--bord);border-radius:7px;font-size:14px;background:#fff;color:var(--ink);}
.cs-select,.cs-form select{padding:7px 9px;border:1px solid var(--bord);border-radius:7px;font-size:13px;background:#fff;color:var(--ink);}
.cs-seg{display:inline-flex;border:1px solid var(--bord);border-radius:7px;overflow:hidden;}
.cs-seg button{border:0;background:#fff;padding:7px 11px;font-size:13px;cursor:pointer;color:var(--mut);border-left:1px solid var(--bord);}
.cs-seg button:first-child{border-left:0;}
.cs-seg button.on{background:#3d6b4f;color:#fff;}
.cs-ghost{background:#fff;border:1px solid var(--bord);border-radius:7px;padding:7px 11px;font-size:13px;cursor:pointer;color:var(--mut);}
.cs-check{font-size:13px;color:var(--mut);display:inline-flex;align-items:center;gap:5px;cursor:pointer;}
.cs-add{background:#3d6b4f;color:#fff;border:0;border-radius:7px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;}
.cs-add:hover{background:#2e5440;}
.cs-groupe{margin-top:20px;}
.cs-groupe h2{font-family:Georgia,serif;font-size:14px;font-weight:600;color:#2a4a35;
  margin:0 0 8px;padding-bottom:5px;border-bottom:1px solid var(--bord);display:flex;align-items:center;gap:8px;}
.cs-compte{font-size:11px;font-family:sans-serif;color:var(--mut);background:var(--pap);border:1px solid var(--bord);border-radius:20px;padding:1px 8px;}
.cs-groupe ul{list-style:none;margin:0;padding:0;}
.cs-ligne{border:1px solid var(--bord);border-radius:9px;background:#fff;margin-bottom:7px;box-shadow:0 1px 2px rgba(0,0,0,.04);}
.cs-ligne.faite{opacity:.5;}
.cs-ligne.faite .cs-titre{text-decoration:line-through;}
.cs-ligne-main{display:flex;align-items:center;gap:10px;padding:9px 11px;}
.cs-corps{flex:1;min-width:0;cursor:pointer;}
.cs-titre{font-size:14px;line-height:1.4;color:#1a2e22;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.cs-cat-tag{font-size:10.5px;color:var(--mut);background:var(--pap);border:1px solid var(--bord);border-radius:5px;padding:1px 6px;}
.cs-desc{margin:6px 0 0;font-size:13px;color:#3a4e42;line-height:1.55;white-space:pre-wrap;}
.cs-droite{display:flex;align-items:center;gap:6px;flex-shrink:0;}
.cs-statut{border:1px solid var(--bord);border-radius:20px;font-size:11.5px;padding:4px 7px;cursor:pointer;background:var(--pap);color:var(--mut);}
.cs-statut.st-en-cours{background:#fff4e0;color:#7a4e00;border-color:#e0c070;}
.cs-statut.st-fait{background:#d8eedc;color:#1e4f28;border-color:#9acc9e;}
.cs-prio{font-weight:700;font-size:12px;border:1.5px solid;border-radius:6px;padding:4px 6px;background:#fff;cursor:pointer;}
.cs-mini{border:1px solid var(--bord);background:#fff;border-radius:6px;padding:5px 9px;font-size:12px;cursor:pointer;color:var(--mut);white-space:nowrap;}
.cs-mini:hover{border-color:#3d6b4f;color:#3d6b4f;}
.cs-mini.claude{color:#3d6b4f;border-color:#9abba6;font-weight:600;}
.cs-mini.claude:hover{background:#3d6b4f;color:#fff;}
.cs-mini.danger{color:#b00020;border-color:#e3b4bc;}
.cs-confirm{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#b00020;}
.cs-vide{color:var(--mut);font-style:italic;padding:24px 4px;}
.cs-toast{position:sticky;top:8px;z-index:5;padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:14px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;}
.cs-toast.ok{background:#d8eedc;color:#1e4f28;border:1px solid #9acc9e;}
.cs-toast.err{background:#fbe6e9;color:#b00020;border:1px solid #e3b4bc;}
.cs-toast-x{opacity:.6;}
.cs-form{background:var(--pap);border:1px solid var(--bord);border-radius:9px;padding:12px;margin-bottom:14px;}
.cs-form.edit,li.cs-ligne.edit{padding:0;border:0;background:transparent;}
.cs-f-titre{width:100%;padding:8px 10px;border:1px solid var(--bord);border-radius:7px;font-size:14px;margin-bottom:8px;box-sizing:border-box;color:var(--ink);}
.cs-f-desc{width:100%;padding:8px 10px;border:1px solid var(--bord);border-radius:7px;font-size:13px;margin-bottom:8px;box-sizing:border-box;resize:vertical;font-family:inherit;color:var(--ink);}
.cs-f-ligne{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.cs-f-ligne input{padding:7px 9px;border:1px solid var(--bord);border-radius:7px;font-size:13px;color:var(--ink);}
@media(max-width:720px){.cs-ligne-main{flex-wrap:wrap;}.cs-droite{width:100%;justify-content:flex-start;padding-left:44px;}}
`
