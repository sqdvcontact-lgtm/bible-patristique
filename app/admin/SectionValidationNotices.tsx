'use client'

// Outil de validation éditoriale des notices de péricopes. Deux zones : la FILE des
// 249 notices (avec filtres et compteur) et le PANNEAU de validation d'une notice
// (quatre sections, grille de contrôle à six cases, sélection bibliographique de quatre
// références au maximum, aperçu public, validation et réouverture).
//
// La source de vérité des statuts reste `pericopes` ; la grille de relecture est stockée
// dans `pericope_validation_editoriale`. La sélection bibliographique est portée par
// `pericope_bibliographie.retenu_notice / ordre_notice / motif_selection`. Toutes les
// écritures passent par le client authentifié (RLS admin), jamais par service_role.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { colorMix } from '@/app/lib/couleurs'

const SANS = 'var(--font-source-sans), Arial, sans-serif'
const SERIF = 'var(--font-source-serif), Georgia, serif'

type Statut = 'a_revoir' | 'en_cours' | 'valide' | 'rejete'
const L_STATUT: Record<string, string> = { a_revoir: 'À revoir', en_cours: 'En cours', valide: 'Validé', rejete: 'Rejeté' }
const C_STATUT: Record<string, string> = { a_revoir: 'var(--cs-or)', en_cours: 'var(--cs-systeme)', valide: 'var(--cs-vert)', rejete: 'var(--cs-danger-fonce)' }

type Grille = {
  pericope_id: string
  presentation_controlee: boolean
  exegese_controlee: boolean
  theologie_controlee: boolean
  tradition_controlee: boolean
  coherence_ensemble_controlee: boolean
  bibliographie_controlee: boolean
  note_validation: string | null
  controle_par: string | null
  controle_at: string | null
}
const GRILLE_VIDE = (id: string): Grille => ({
  pericope_id: id, presentation_controlee: false, exegese_controlee: false, theologie_controlee: false,
  tradition_controlee: false, coherence_ensemble_controlee: false, bibliographie_controlee: false,
  note_validation: '', controle_par: null, controle_at: null,
})
const CASES: { champ: keyof Grille; label: string }[] = [
  { champ: 'presentation_controlee', label: 'Présentation exacte, claire et utile' },
  { champ: 'exegese_controlee', label: 'Repères exégétiques exacts et utiles' },
  { champ: 'theologie_controlee', label: 'Portée théologique juste et proportionnée' },
  { champ: 'tradition_controlee', label: 'Réception correctement attribuée et utile' },
  { champ: 'coherence_ensemble_controlee', label: 'L’ensemble est cohérent et sans répétitions importantes' },
  { champ: 'bibliographie_controlee', label: 'La bibliographie retenue correspond aux références les plus pertinentes' },
]

type LigneFile = {
  id: string; nom: string; categorie: string | null
  statut_editorial: Statut; statut_exegetique: Statut; statut_theologique: Statut; statut_tradition: Statut
  valide_par: string | null; valide_at: string | null
  nb_refs: number; grille: Grille | null
}

type OuvrageEmbed = { auteurs: string | null; titre: string | null; annee: number | null; type_ouvrage: string | null; statut_scientifique: string | null; statut_usage_notice: string | null; statut_editorial: string | null }
type Lien = {
  id: number; ouvrage_id: number; rubrique: string | null; importance: string | null
  reference_passage: string | null; pages: string | null; note_editoriale: string | null
  statut_verification: string; retenu_notice: boolean; ordre_notice: number | null; motif_selection: string | null
  ouvrages_bibliographiques: OuvrageEmbed | null
}
type Detail = {
  id: string; nom: string; categorie: string | null
  notice: string | null; notice_contexte: string | null
  notice_exegetique: string | null; notice_theologique: string | null; notice_tradition: string | null
}

// Traduit un refus PostgreSQL en message clair (les triggers et contraintes de la couche
// base renvoient des messages explicites ; on les relaie tels quels, avec repli lisible).
function messageErreur(msg: string): string {
  const m = (msg || '').toLowerCase()
  if (m.includes('row-level security')) return 'Écriture refusée : autorisation administrateur requise.'
  if (m.includes('violates check') && m.includes('ordre_notice')) return 'Au maximum quatre références, numérotées de 1 à 4.'
  if (m.includes('duplicate key') && m.includes('ordre')) return 'Deux références ne peuvent pas partager le même rang.'
  if (m.includes('non admissible') || m.includes('rejeté') || m.includes('scientifiquement')) return msg
  if (m.includes('statut_editorial') || m.includes('valide')) return 'La base a refusé la validation : vérifiez que les quatre sections sont renseignées.'
  return 'Erreur de la base : ' + msg
}

const admissible = (l: Lien): boolean => {
  const o = l.ouvrages_bibliographiques
  return !!o && l.statut_verification !== 'rejete' && o.statut_editorial !== 'rejete'
    && (o.statut_scientifique === 'retenu' || o.statut_scientifique === 'secondaire')
    && o.statut_usage_notice === 'citation_francophone'
}

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const grilleComplete = (g: Grille | null) => !!g && CASES.every(c => g[c.champ] === true)

const btnV: React.CSSProperties = { fontFamily: SANS, fontSize: '0.78125rem', fontWeight: 600, padding: '6px 13px', borderRadius: '8px', border: 'none', background: 'var(--cs-vert)', color: 'var(--cs-surface)', cursor: 'pointer' }
const btnG: React.CSSProperties = { fontFamily: SANS, fontSize: '0.75rem', padding: '5px 11px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }

function Puce({ txt, coul }: { txt: string; coul: string }) {
  return <span style={{ fontFamily: SANS, fontSize: '0.625rem', fontWeight: 700, color: coul, background: `${colorMix(coul, 9)}`, border: `1px solid ${colorMix(coul, 25)}`, borderRadius: '4px', padding: '1px 6px', whiteSpace: 'nowrap' }}>{txt}</span>
}

// ── Ordre de suggestion : ouvrage retenu, lien principal, commentaire/monographie,
// édition critique/source, puis secondaire. On diversifie en évitant les quasi-doublons.
function suggerer(liens: Lien[]): number[] {
  const adm = liens.filter(admissible)
  const rang = (l: Lien) => {
    const o = l.ouvrages_bibliographiques!
    let r = 0
    if (o.statut_scientifique === 'retenu') r -= 8
    if (l.importance === 'principale') r -= 4
    if (o.type_ouvrage === 'commentaire_critique' || o.type_ouvrage === 'monographie') r -= 2
    if (o.type_ouvrage === 'edition_critique') r -= 1
    if (o.statut_scientifique === 'secondaire') r += 3
    return r
  }
  const tries = [...adm].sort((a, b) => rang(a) - rang(b))
  const choisis: Lien[] = []
  const rubriquesVues = new Set<string>()
  for (const l of tries) {
    if (choisis.length >= 4) break
    // Éviter quatre ouvrages très proches : privilégier la variété de rubrique tant que possible.
    if (choisis.length < 3 && l.rubrique && rubriquesVues.has(l.rubrique) && tries.length > 4) continue
    choisis.push(l); if (l.rubrique) rubriquesVues.add(l.rubrique)
  }
  for (const l of tries) { if (choisis.length >= 4) break; if (!choisis.includes(l)) choisis.push(l) }
  return choisis.slice(0, 4).map(l => l.id)
}

export default function SectionValidationNotices() {
  const [file, setFile] = useState<LigneFile[]>([])
  const [chargement, setChargement] = useState(true)
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<string>('')
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  const [selId, setSelId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [liens, setLiens] = useState<Lien[]>([])
  const [grille, setGrille] = useState<Grille | null>(null)
  const [selection, setSelection] = useState<{ lien_id: number; motif: string }[]>([])
  const [note, setNote] = useState('')
  const [apercu, setApercu] = useState(false)
  const [enCours, setEnCours] = useState(false)

  const chargerFile = useCallback(async () => {
    const [rp, rr, rg] = await Promise.all([
      supabase.from('pericopes').select('id, nom, categorie, statut_editorial, statut_exegetique, statut_theologique, statut_tradition, valide_par, valide_at').order('nom'),
      supabase.from('pericope_bibliographie').select('pericope_id').eq('retenu_notice', true),
      supabase.from('pericope_validation_editoriale').select('*'),
    ])
    if (rp.error) { setErreur(messageErreur(rp.error.message)); setChargement(false); return }
    const compte = new Map<string, number>()
    ;(rr.data ?? []).forEach((r: { pericope_id: string }) => compte.set(r.pericope_id, (compte.get(r.pericope_id) ?? 0) + 1))
    const grilles = new Map<string, Grille>()
    ;(rg.data ?? []).forEach((g: Grille) => grilles.set(g.pericope_id, g))
    setFile((rp.data ?? []).map((p) => ({ ...(p as Omit<LigneFile, 'nb_refs' | 'grille'>), nb_refs: compte.get((p as { id: string }).id) ?? 0, grille: grilles.get((p as { id: string }).id) ?? null })))
    setChargement(false)
  }, [])

  useEffect(() => { let a = false; (async () => { if (!a) await chargerFile() })(); return () => { a = true } }, [chargerFile])

  const ouvrir = useCallback(async (id: string) => {
    setSelId(id); setDetail(null); setApercu(false); setErreur(''); setInfo('')
    const [rp, rl, rg] = await Promise.all([
      supabase.from('pericopes').select('id, nom, categorie, notice, notice_contexte, notice_exegetique, notice_theologique, notice_tradition').eq('id', id).maybeSingle(),
      supabase.from('pericope_bibliographie').select('id, ouvrage_id, rubrique, importance, reference_passage, pages, note_editoriale, statut_verification, retenu_notice, ordre_notice, motif_selection, ouvrages_bibliographiques(auteurs, titre, annee, type_ouvrage, statut_scientifique, statut_usage_notice, statut_editorial)').eq('pericope_id', id),
      supabase.from('pericope_validation_editoriale').select('*').eq('pericope_id', id).maybeSingle(),
    ])
    setDetail((rp.data ?? null) as Detail | null)
    const ls = ((rl.data ?? []) as unknown as Lien[])
    setLiens(ls)
    setGrille((rg.data as Grille | null) ?? GRILLE_VIDE(id))
    setNote(((rg.data as Grille | null)?.note_validation) ?? '')
    setSelection(ls.filter(l => l.retenu_notice).sort((a, b) => (a.ordre_notice ?? 9) - (b.ordre_notice ?? 9)).map(l => ({ lien_id: l.id, motif: l.motif_selection ?? '' })))
  }, [])

  // ── Écriture de la grille de contrôle (upsert) ──
  const majGrille = async (champ: keyof Grille, valeur: boolean) => {
    if (!selId || !grille) return
    const suivant = { ...grille, [champ]: valeur }
    setGrille(suivant)
    const { error } = await supabase.from('pericope_validation_editoriale')
      .upsert({ pericope_id: selId, presentation_controlee: suivant.presentation_controlee, exegese_controlee: suivant.exegese_controlee, theologie_controlee: suivant.theologie_controlee, tradition_controlee: suivant.tradition_controlee, coherence_ensemble_controlee: suivant.coherence_ensemble_controlee, bibliographie_controlee: suivant.bibliographie_controlee, note_validation: note || null }, { onConflict: 'pericope_id' })
    if (error) { setGrille(grille); setErreur(messageErreur(error.message)) } else setErreur('')
  }

  // Sauvegarde de la note de validation (sans toucher aux cases de la grille).
  const sauverNote = async () => {
    if (!selId) return
    const { error } = await supabase.from('pericope_validation_editoriale')
      .upsert({ pericope_id: selId, note_validation: note || null }, { onConflict: 'pericope_id' })
    if (error) setErreur(messageErreur(error.message))
  }

  // Édition du texte d'une section. L'écriture déclenche la réouverture automatique
  // (trigger base) : la section modifiée — et la notice — repassent « à revoir ».
  const sauverSection = async (champ: string, provenanceChamp: string | null, valeur: string) => {
    if (!selId) return
    setErreur(''); setInfo('')
    const payload: Record<string, unknown> = { [champ]: valeur.trim() ? valeur : null }
    if (provenanceChamp && valeur.trim()) payload[provenanceChamp] = 'editeur'
    const { error } = await supabase.from('pericopes').update(payload).eq('id', selId)
    if (error) { setErreur(messageErreur(error.message)); return false }
    setInfo('Texte enregistré. La notice a été rouverte pour relecture.')
    await ouvrir(selId); await chargerFile()
    return true
  }

  // ── Application de la sélection bibliographique complète (évite les collisions d'ordre) ──
  const appliquerSelection = async (sel: { lien_id: number; motif: string }[]) => {
    if (!selId) return false
    setErreur(''); setInfo('')
    // 1) tout remettre à zéro pour la péricope, 2) réécrire dans l'ordre.
    const { error: e0 } = await supabase.from('pericope_bibliographie').update({ retenu_notice: false, ordre_notice: null }).eq('pericope_id', selId).eq('retenu_notice', true)
    if (e0) { setErreur(messageErreur(e0.message)); return false }
    for (let i = 0; i < sel.length; i++) {
      const { error } = await supabase.from('pericope_bibliographie').update({ retenu_notice: true, ordre_notice: i + 1, motif_selection: sel[i].motif || null }).eq('id', sel[i].lien_id)
      if (error) { setErreur(messageErreur(error.message)); await ouvrir(selId); return false }
    }
    await ouvrir(selId); await chargerFile()
    return true
  }

  const ajouter = (lien_id: number) => {
    if (selection.length >= 4 || selection.some(s => s.lien_id === lien_id)) return
    const sel = [...selection, { lien_id, motif: '' }]; setSelection(sel); appliquerSelection(sel)
  }
  const retirer = (lien_id: number) => { const sel = selection.filter(s => s.lien_id !== lien_id); setSelection(sel); appliquerSelection(sel) }
  const deplacer = (idx: number, delta: number) => {
    const j = idx + delta; if (j < 0 || j >= selection.length) return
    const sel = [...selection];[sel[idx], sel[j]] = [sel[j], sel[idx]]; setSelection(sel); appliquerSelection(sel)
  }
  const majMotif = (lien_id: number, motif: string) => setSelection(s => s.map(x => x.lien_id === lien_id ? { ...x, motif } : x))

  const proposer = () => {
    const ids = suggerer(liens).filter(id => !selection.some(s => s.lien_id === id))
    const place = 4 - selection.length
    if (place <= 0) { setInfo('Quatre références sont déjà sélectionnées.'); return }
    setSelection([...selection, ...ids.slice(0, place).map(id => ({ lien_id: id, motif: '' }))])
    setInfo('Suggestions ajoutées à la sélection : à confirmer ou ajuster, puis appliquer.')
  }
  const appliquerProposition = () => appliquerSelection(selection)

  // ── Validation finale ──
  const sectionsPleines = !!detail && [detail.notice, detail.notice_exegetique, detail.notice_theologique, detail.notice_tradition].every(t => (t ?? '').trim().length > 0)
  const selInadmissible = selection.some(s => { const l = liens.find(x => x.id === s.lien_id); return l && !admissible(l) })
  const peutValider = sectionsPleines && grilleComplete(grille) && selection.length >= 1 && selection.length <= 4 && !selInadmissible

  const valider = async () => {
    if (!selId || !peutValider) return
    setEnCours(true); setErreur(''); setInfo('')
    const { data: { user } } = await supabase.auth.getUser()
    const par = user?.email ?? user?.id ?? 'admin'
    const now = new Date().toISOString()
    const { error: e1 } = await supabase.from('pericopes').update({
      statut_editorial: 'valide', valide_par: par, valide_at: now,
      statut_exegetique: 'valide', valide_par_exegetique: par, valide_at_exegetique: now,
      statut_theologique: 'valide', valide_par_theologique: par, valide_at_theologique: now,
      statut_tradition: 'valide', valide_par_tradition: par, valide_at_tradition: now,
    }).eq('id', selId)
    if (e1) { setErreur(messageErreur(e1.message)); setEnCours(false); return }
    await supabase.from('pericope_validation_editoriale').upsert({
      pericope_id: selId,
      presentation_controlee: true, exegese_controlee: true, theologie_controlee: true, tradition_controlee: true,
      coherence_ensemble_controlee: true, bibliographie_controlee: true,
      note_validation: note || null, controle_par: user?.id ?? null, controle_at: now,
    }, { onConflict: 'pericope_id' })
    setInfo('Notice validée.'); setEnCours(false)
    await ouvrir(selId); await chargerFile()
  }

  const rouvrir = async () => {
    if (!selId) return
    setEnCours(true); setErreur('')
    const { error } = await supabase.from('pericopes').update({
      statut_editorial: 'a_revoir', valide_par: null, valide_at: null,
      statut_exegetique: 'a_revoir', valide_par_exegetique: null, valide_at_exegetique: null,
      statut_theologique: 'a_revoir', valide_par_theologique: null, valide_at_theologique: null,
      statut_tradition: 'a_revoir', valide_par_tradition: null, valide_at_tradition: null,
    }).eq('id', selId)
    setEnCours(false)
    if (error) { setErreur(messageErreur(error.message)); return }
    setInfo('Notice rouverte.'); await ouvrir(selId); await chargerFile()
  }

  // ── File filtrée ──
  const qn = sansAccents(q.trim())
  const filtree = useMemo(() => file.filter(l => {
    if (qn && !sansAccents(l.nom).includes(qn)) return false
    switch (filtre) {
      case 'a_revoir': return l.statut_editorial === 'a_revoir'
      case 'en_cours': return l.statut_editorial === 'en_cours'
      case 'valide': return l.statut_editorial === 'valide'
      case 'grille_incomplete': return !grilleComplete(l.grille)
      case 'moins_4': return l.nb_refs < 4
      case 'aucune_ref': return l.nb_refs === 0
      case 'exeg_revoir': return l.statut_exegetique === 'a_revoir'
      case 'theo_revoir': return l.statut_theologique === 'a_revoir'
      case 'trad_revoir': return l.statut_tradition === 'a_revoir'
      default: return true
    }
  }), [file, qn, filtre])
  const nbValidees = useMemo(() => file.filter(l => l.statut_editorial === 'valide').length, [file])

  if (chargement) return <p style={{ fontFamily: SANS, fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>

  const FILTRES: { code: string; label: string }[] = [
    { code: 'a_revoir', label: 'À revoir' }, { code: 'en_cours', label: 'En cours' }, { code: 'valide', label: 'Validées' },
    { code: 'grille_incomplete', label: 'Grille incomplète' }, { code: 'moins_4', label: 'Moins de 4 réf.' }, { code: 'aucune_ref', label: 'Aucune réf.' },
    { code: 'exeg_revoir', label: 'Exégèse à revoir' }, { code: 'theo_revoir', label: 'Théologie à revoir' }, { code: 'trad_revoir', label: 'Tradition à revoir' },
  ]

  return (
    <div>
      <style>{`
        .vn-grid { display: grid; grid-template-columns: 25rem 1fr; gap: 20px; align-items: start; }
        .vn-file { position: sticky; top: 4.75rem; max-height: calc(100vh - 6rem); overflow: auto; }
        @media (max-width: 900px) { .vn-grid { grid-template-columns: 1fr; } .vn-file { position: static; max-height: none; } }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', margin: '0 0 12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: SERIF, fontSize: '1.3125rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>Validation des notices</h2>
        <span style={{ fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--cs-vert-fonce)' }}>{nbValidees} validées / {file.length}</span>
      </div>

      {erreur && <p role="alert" style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '8px 11px', margin: '0 0 12px' }}>{erreur}</p>}
      {info && <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-vert-fonce)', background: 'rgba(var(--cs-vert-rgb),0.08)', border: '1px solid rgba(var(--cs-vert-rgb),0.25)', borderRadius: '8px', padding: '8px 11px', margin: '0 0 12px' }}>{info}</p>}

      <div className="vn-grid">
        {/* ── FILE ── */}
        <div className="vn-file">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filtrer par nom…" style={{ width: '100%', fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '6px 9px', marginBottom: '8px' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {FILTRES.map(f => (
              <button key={f.code} onClick={() => setFiltre(filtre === f.code ? '' : f.code)}
                style={{ fontFamily: SANS, fontSize: '0.6875rem', fontWeight: filtre === f.code ? 700 : 500, cursor: 'pointer', padding: '3px 8px', borderRadius: '999px', border: `1px solid ${filtre === f.code ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: filtre === f.code ? 'rgba(var(--cs-vert-rgb),0.1)' : 'var(--cs-surface)', color: filtre === f.code ? 'var(--cs-vert-fonce)' : 'var(--cs-texte-second)' }}>{f.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filtree.map(l => (
              <button key={l.id} onClick={() => ouvrir(l.id)}
                style={{ textAlign: 'left', border: `1px solid ${selId === l.id ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`, background: selId === l.id ? 'rgba(var(--cs-vert-rgb),0.05)' : 'var(--cs-surface)', borderRadius: '8px', padding: '7px 9px', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: SERIF, fontSize: '0.875rem', color: 'var(--cs-texte)' }}>{l.nom}</span>
                  <Puce txt={L_STATUT[l.statut_editorial] ?? l.statut_editorial} coul={C_STATUT[l.statut_editorial] ?? 'var(--cs-systeme)'} />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '3px', fontFamily: SANS, fontSize: '0.625rem', color: 'var(--cs-texte-faible)', alignItems: 'center' }}>
                  {l.categorie && <span>{l.categorie}</span>}
                  <span title="Exégèse / Théologie / Tradition">§ {['statut_exegetique', 'statut_theologique', 'statut_tradition'].map(k => (L_STATUT[(l as unknown as Record<string, string>)[k]] ?? '?')[0]).join('·')}</span>
                  <span style={{ color: l.nb_refs === 0 ? 'var(--cs-danger)' : l.nb_refs < 4 ? 'var(--cs-or)' : 'var(--cs-vert-fonce)' }}>{l.nb_refs} réf.</span>
                  <span title="Grille de contrôle">{grilleComplete(l.grille) ? '✓ grille' : '○ grille'}</span>
                  {l.valide_at && <span>· {new Date(l.valide_at).toLocaleDateString('fr-FR')}</span>}
                </div>
              </button>
            ))}
            {filtree.length === 0 && <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>Aucune notice.</p>}
          </div>
        </div>

        {/* ── PANNEAU ── */}
        <div>
          {!detail ? (
            <p style={{ fontFamily: SANS, fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', padding: '24px 0' }}>Sélectionnez une notice dans la file.</p>
          ) : (
            <PanneauValidation
              detail={detail} liens={liens} grille={grille ?? GRILLE_VIDE(detail.id)} note={note} setNote={setNote}
              selection={selection} apercu={apercu} setApercu={setApercu} enCours={enCours}
              peutValider={peutValider} sectionsPleines={sectionsPleines} selInadmissible={selInadmissible}
              onCase={majGrille} onAjouter={ajouter} onRetirer={retirer} onDeplacer={deplacer}
              onMotif={majMotif} onProposer={proposer} onAppliquer={appliquerProposition} onValider={valider} onRouvrir={rouvrir}
              onNoteBlur={sauverNote} onSauverSection={sauverSection}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function PanneauValidation(p: {
  detail: Detail; liens: Lien[]; grille: Grille; note: string; setNote: (s: string) => void
  selection: { lien_id: number; motif: string }[]; apercu: boolean; setApercu: (b: boolean) => void; enCours: boolean
  peutValider: boolean; sectionsPleines: boolean; selInadmissible: boolean
  onCase: (c: keyof Grille, v: boolean) => void
  onAjouter: (id: number) => void; onRetirer: (id: number) => void; onDeplacer: (i: number, d: number) => void
  onMotif: (id: number, m: string) => void; onProposer: () => void; onAppliquer: () => void; onValider: () => void; onRouvrir: () => void
  onNoteBlur: () => void
  onSauverSection: (champ: string, provenanceChamp: string | null, valeur: string) => Promise<boolean | undefined>
}) {
  const { detail, liens, grille, selection } = p
  const [edite, setEdite] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState('')
  const [enregistre, setEnregistre] = useState(false)
  const SECTIONS: { titre: string; texte: string | null; champ: string; provenance: string | null }[] = [
    { titre: 'Présentation générale', texte: detail.notice, champ: 'notice', provenance: null },
    { titre: 'Repères exégétiques', texte: detail.notice_exegetique, champ: 'notice_exegetique', provenance: 'provenance_exegetique' },
    { titre: 'Portée théologique', texte: detail.notice_theologique, champ: 'notice_theologique', provenance: 'provenance_theologique' },
    { titre: 'Réception dans la tradition', texte: detail.notice_tradition, champ: 'notice_tradition', provenance: 'provenance_tradition' },
  ]
  const ouvrirEdition = (champ: string, texte: string | null) => { setEdite(champ); setBrouillon(texte ?? '') }
  const enregistrerSection = async (s: { champ: string; provenance: string | null }) => {
    setEnregistre(true)
    const ok = await p.onSauverSection(s.champ, s.provenance, brouillon)
    setEnregistre(false)
    if (ok) setEdite(null)
  }
  const admissibles = liens.filter(admissible)
  const dispo = admissibles.filter(l => !selection.some(s => s.lien_id === l.id))
  const lienDe = (id: number) => liens.find(l => l.id === id)

  if (p.apercu) {
    const refs = selection.map(s => lienDe(s.lien_id)).filter(Boolean) as Lien[]
    return (
      <div>
        <button onClick={() => p.setApercu(false)} style={{ ...btnG, marginBottom: '14px' }}>← Retour à la validation</button>
        <div style={{ maxWidth: '42rem' }}>
          <h3 style={{ fontFamily: SERIF, fontSize: '1.375rem', color: 'var(--cs-encre)', margin: '0 0 14px' }}>{detail.nom}</h3>
          {SECTIONS.filter(s => (s.texte ?? '').trim()).map(s => (
            <section key={s.titre} style={{ marginBottom: '16px' }}>
              <p style={{ fontFamily: SANS, fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 4px' }}>{s.titre}</p>
              <p style={{ fontFamily: SERIF, fontSize: '0.9375rem', lineHeight: 1.65, color: 'var(--cs-texte)', margin: 0, whiteSpace: 'pre-wrap' }}>{s.texte}</p>
            </section>
          ))}
          {refs.length > 0 && (
            <section style={{ borderTop: '1px solid var(--cs-bord-clair)', paddingTop: '12px', marginTop: '6px' }}>
              <p style={{ fontFamily: SANS, fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 6px' }}>Bibliographie</p>
              {refs.map(r => {
                const o = r.ouvrages_bibliographiques!
                return <p key={r.id} style={{ fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte-second)', margin: '0 0 4px', lineHeight: 1.4 }}>{o.auteurs}, <em>{o.titre}</em>{o.annee ? `, ${o.annee}` : ''}{r.reference_passage ? ` — ${r.reference_passage}` : ''}</p>
              })}
            </section>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: SERIF, fontSize: '1.125rem', color: 'var(--cs-encre)', margin: 0 }}>{detail.nom}</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => p.setApercu(true)} style={btnG}>Aperçu public</button>
          <button onClick={p.onRouvrir} disabled={p.enCours} style={btnG}>Rouvrir</button>
        </div>
      </div>

      {/* Quatre sections (éditables) + leurs cases */}
      {SECTIONS.map((s, i) => (
        <div key={s.titre} style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '11px 13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', margin: '0 0 6px' }}>
            <p style={{ fontFamily: SANS, fontSize: '0.65625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: 0 }}>{s.titre}</p>
            {edite !== s.champ && (
              <button onClick={() => ouvrirEdition(s.champ, s.texte)} style={{ fontFamily: SANS, fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Modifier</button>
            )}
          </div>
          {edite === s.champ ? (
            <div>
              <textarea value={brouillon} onChange={e => setBrouillon(e.target.value)} rows={9} autoFocus
                style={{ width: '100%', fontFamily: SERIF, fontSize: '0.875rem', lineHeight: 1.55, color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '8px 10px', boxSizing: 'border-box', resize: 'vertical' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '7px' }}>
                <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>Enregistrer rouvrira la notice pour relecture.</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEdite(null)} style={btnG}>Annuler</button>
                  <button onClick={() => enregistrerSection(s)} disabled={enregistre} style={{ ...btnV, opacity: enregistre ? 0.6 : 1 }}>{enregistre ? 'Enregistrement…' : 'Enregistrer'}</button>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontFamily: SERIF, fontSize: '0.875rem', lineHeight: 1.55, color: (s.texte ?? '').trim() ? 'var(--cs-texte)' : 'var(--cs-danger)', margin: '0 0 9px', whiteSpace: 'pre-wrap', maxHeight: '11rem', overflow: 'auto' }}>{(s.texte ?? '').trim() || '(section vide)'}</p>
          )}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-second)', cursor: 'pointer', marginTop: edite === s.champ ? '9px' : 0 }}>
            <input type="checkbox" checked={grille[CASES[i].champ] as boolean} onChange={e => p.onCase(CASES[i].champ, e.target.checked)} style={{ marginTop: '2px' }} />
            {CASES[i].label}
          </label>
        </div>
      ))}

      {/* Deux contrôles généraux */}
      <div style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '11px 13px', display: 'grid', gap: '7px' }}>
        {[CASES[4], CASES[5]].map(c => (
          <label key={c.champ} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>
            <input type="checkbox" checked={grille[c.champ] as boolean} onChange={e => p.onCase(c.champ, e.target.checked)} style={{ marginTop: '2px' }} />
            {c.label}
          </label>
        ))}
      </div>

      {/* Sélection bibliographique */}
      <div style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '11px 13px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '9px' }}>
          <p style={{ fontFamily: SANS, fontSize: '0.65625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: 0 }}>Bibliographie retenue ({selection.length}/4)</p>
          <div style={{ display: 'flex', gap: '7px' }}>
            <button onClick={p.onProposer} style={btnG}>Suggérer</button>
            <button onClick={p.onAppliquer} style={btnV}>Appliquer la sélection</button>
          </div>
        </div>
        {/* Quatre emplacements */}
        <div style={{ display: 'grid', gap: '5px', marginBottom: '12px' }}>
          {[0, 1, 2, 3].map(i => {
            const s = selection[i]; const l = s ? lienDe(s.lien_id) : null; const o = l?.ouvrages_bibliographiques
            return (
              <div key={i} style={{ display: 'flex', gap: '9px', alignItems: 'center', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '6px 9px', background: l ? 'var(--cs-surface)' : 'var(--cs-fond-clair)', minHeight: '34px' }}>
                <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: '0.8125rem', color: 'var(--cs-vert)', width: '16px' }}>{i + 1}</span>
                {l && o ? (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte)' }}>{o.auteurs}, <em>{o.titre}</em>{o.annee ? ` (${o.annee})` : ''}</span>
                      <input value={s.motif} onChange={e => p.onMotif(l.id, e.target.value)} placeholder="Motif de sélection (facultatif)…" style={{ display: 'block', width: '100%', fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-second)', background: 'transparent', border: 'none', borderBottom: '1px dotted var(--cs-bord)', padding: '2px 0', marginTop: '2px', outline: 'none' }} />
                    </div>
                    <button onClick={() => p.onDeplacer(i, -1)} disabled={i === 0} title="Monter" style={{ ...btnG, padding: '2px 7px' }}>↑</button>
                    <button onClick={() => p.onDeplacer(i, 1)} disabled={i === selection.length - 1} title="Descendre" style={{ ...btnG, padding: '2px 7px' }}>↓</button>
                    <button onClick={() => p.onRetirer(l.id)} title="Retirer" style={{ ...btnG, padding: '2px 7px', color: 'var(--cs-danger)' }}>×</button>
                  </>
                ) : <span style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>emplacement libre</span>}
              </div>
            )
          })}
        </div>
        {/* Liens admissibles disponibles */}
        <p style={{ fontFamily: SANS, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 5px' }}>Références francophones admissibles ({dispo.length})</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '18rem', overflow: 'auto' }}>
          {dispo.map(l => {
            const o = l.ouvrages_bibliographiques!
            return (
              <div key={l.id} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start', padding: '6px 8px', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte)' }}>{o.auteurs}, <em>{o.titre}</em>{o.annee ? ` (${o.annee})` : ''}</span>
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '2px', fontFamily: SANS, fontSize: '0.65625rem', color: 'var(--cs-texte-faible)', alignItems: 'center' }}>
                    {l.rubrique && <span>{l.rubrique}</span>}
                    {l.importance && <span>· {l.importance}</span>}
                    {l.reference_passage && <span>· {l.reference_passage}</span>}
                    {o.type_ouvrage && <span>· {o.type_ouvrage.replace(/_/g, ' ')}</span>}
                    {l.pages ? <span>· p. {l.pages}</span> : <Puce txt="sans pagination" coul="var(--cs-or)" />}
                    {l.statut_verification === 'a_verifier' && <Puce txt="à vérifier" coul="var(--cs-or)" />}
                    {o.statut_scientifique === 'secondaire' && <Puce txt="secondaire" coul="#6f8a3e" />}
                  </div>
                  {l.note_editoriale && <p style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', margin: '2px 0 0', fontStyle: 'italic' }}>{l.note_editoriale}</p>}
                </div>
                <button onClick={() => p.onAjouter(l.id)} disabled={selection.length >= 4} style={{ ...btnG, whiteSpace: 'nowrap', opacity: selection.length >= 4 ? 0.5 : 1 }}>Ajouter</button>
              </div>
            )
          })}
          {dispo.length === 0 && <p style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>Aucune autre référence admissible.</p>}
        </div>
      </div>

      {/* Note + validation */}
      <div style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '11px 13px' }}>
        <label style={{ fontFamily: SANS, fontSize: '0.65625rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', marginBottom: '4px' }}>Note de validation</label>
        <textarea value={p.note} onChange={e => p.setNote(e.target.value)} onBlur={p.onNoteBlur} rows={2} style={{ width: '100%', fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '6px 9px', boxSizing: 'border-box', resize: 'vertical' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
          {!p.peutValider && (
            <span style={{ fontFamily: SANS, fontSize: '0.71875rem', color: 'var(--cs-texte-faible)' }}>
              {!p.sectionsPleines ? 'Sections incomplètes' : !grilleComplete(grille) ? 'Grille incomplète' : selection.length < 1 ? 'Aucune référence' : p.selInadmissible ? 'Référence devenue inadmissible' : ''}
            </span>
          )}
          <button onClick={p.onValider} disabled={!p.peutValider || p.enCours} style={{ ...btnV, opacity: (!p.peutValider || p.enCours) ? 0.5 : 1, cursor: (!p.peutValider || p.enCours) ? 'not-allowed' : 'pointer', padding: '8px 18px' }}>
            {p.enCours ? 'Validation…' : 'Valider la notice'}
          </button>
        </div>
      </div>
    </div>
  )
}
