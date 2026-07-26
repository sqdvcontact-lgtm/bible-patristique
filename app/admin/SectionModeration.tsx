'use client'

import React, { useState } from 'react'
import { dateFormat, refFrVer } from './adminShared'
import type { Commentaire, CommentairePublication, Signalement, SegInfo } from './adminTypes'

type SousOnglet = 'commentaires' | 'signalements'

type Props = {
  commentaires: Commentaire[]
  commentairesPublications: CommentairePublication[]
  signalements: Signalement[]
  demandesCertification: Commentaire[]
  segMap: Record<number, SegInfo>
  versetMap: Record<string, string>
  versetTexteMap: Record<string, string>
  oeuvreTitreMap: Record<string, string>
  signalementAuteurMap: Record<string, string>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
  actionValiderCommentaireEssai: (id: number) => Promise<void>
  actionSupprimerCommentaireEssai: (id: number) => Promise<void>
  actionMarquerTraite: (id: number | string) => Promise<void>
  actionMarquerTraiteSilencieux: (id: number | string) => Promise<void>
  actionSupprimerSignalement: (id: number | string) => Promise<void>
  actionCertifier: (id: number) => Promise<void>
  actionRetirerDemandeCertification: (id: number) => Promise<void>
}

// ── Localisation ──────────────────────────────────────────────────────────────
type Lieu = 'Bible' | 'Patristique' | 'Publications' | 'Profil'
const COULEUR_LIEU: Record<Lieu, { fond: string; texte: string }> = {
  Bible:        { fond: '#eaf3ee', texte: '#3d6b4f' },
  Patristique:  { fond: '#f4efe2', texte: '#8a6a30' },
  Publications: { fond: '#eaf1f6', texte: '#3d5a6b' },
  Profil:       { fond: '#edf2e8', texte: '#45633b' },
}

function localiserCommentaire(c: Commentaire, segMap: Record<number, SegInfo>, versetMap: Record<string, string>, oeuvreTitreMap: Record<string, string>) {
  if (c.id_verset) {
    return { lieu: 'Bible' as Lieu, ref: refFrVer(versetMap[c.id_verset] ?? c.id_verset), href: `/?verset=${encodeURIComponent(c.id_verset)}` as string | null }
  }
  if (c.id_segment != null && segMap[c.id_segment]) {
    const s = segMap[c.id_segment]
    return { lieu: 'Patristique' as Lieu, ref: `${oeuvreTitreMap[s.id_oeuvre] ?? s.id_oeuvre} · §${s.numero}`, href: `/oeuvre/${s.id_oeuvre}#s${s.numero}` as string | null }
  }
  return { lieu: 'Patristique' as Lieu, ref: c.id_segment ? `Segment ${c.id_segment}` : '—', href: null as string | null }
}

// Certaines routes glissent la référence en tête du message : « [Réf. Gn 1, 1] … ».
function separerReference(message: string) {
  const m = message.match(/^\[Réf\.\s*([^\]]+)\]\s*/)
  return m ? { ref: m[1].trim(), corps: message.slice(m[0].length) } : { ref: null as string | null, corps: message }
}

function localiserSignalement(
  s: Signalement,
  segMap: Record<number, SegInfo>, versetMap: Record<string, string>,
  versetTexteMap: Record<string, string>, oeuvreTitreMap: Record<string, string>,
) {
  if (s.id_segment != null && segMap[s.id_segment]) {
    const seg = segMap[s.id_segment]
    return { lieu: 'Patristique' as Lieu, titre: `${oeuvreTitreMap[seg.id_oeuvre] ?? seg.id_oeuvre} · §${seg.numero}`, href: `/oeuvre/${seg.id_oeuvre}#s${seg.numero}` as string | null, cible: seg.texte }
  }
  if (s.id_verset) {
    return { lieu: 'Bible' as Lieu, titre: refFrVer(versetMap[s.id_verset] ?? s.id_verset), href: `/?verset=${encodeURIComponent(s.id_verset)}` as string | null, cible: versetTexteMap[s.id_verset] ?? '' }
  }
  const refMsg = separerReference(s.message).ref
  const profilSignale = refMsg?.match(/^Profil\s+@(.+)$/i)
  if (profilSignale) {
    const pseudo = profilSignale[1].trim()
    return { lieu: 'Profil' as Lieu, titre: `Profil @${pseudo}`, href: `/profil/${encodeURIComponent(pseudo)}` as string | null, cible: '' }
  }
  const cheminUrl = s.url_source ? s.url_source.replace(/^https?:\/\/[^/]+/, '') || s.url_source : null
  return { lieu: null as Lieu | null, titre: refMsg ?? cheminUrl ?? 'Page non précisée', href: s.url_source ?? null, cible: '' }
}

// Dégradé de rouges selon la gravité (mineur → bloquant), pour teinter le bloc.
function styleImportance(imp: string | null | undefined) {
  switch (imp) {
    case 'bloquant':  return { fond: '#fbe3e0', bord: '#db988c', accent: '#8a1f1f', label: 'Bloquant' as string | null }
    case 'important': return { fond: '#fdeae2', bord: '#e6ab95', accent: '#b0442a', label: 'Important' as string | null }
    case 'mineur':    return { fond: '#fdf4ef', bord: '#eccdbd', accent: '#9a6650', label: 'Mineur' as string | null }
    default:          return { fond: '#faf8f4', bord: '#e4dfd8', accent: '#8a8278', label: null as string | null }
  }
}

function BadgeLieu({ lieu }: { lieu: Lieu | null }) {
  if (!lieu) return null
  const c = COULEUR_LIEU[lieu]
  return <span className="mod-badge" style={{ background: c.fond, color: c.texte }}>{lieu}</span>
}

type ItemComment =
  | { kind: 'comment'; key: string; c: Commentaire }
  | { kind: 'certif'; key: string; c: Commentaire }
  | { kind: 'publication'; key: string; c: CommentairePublication }

export default function SectionModeration(props: Props) {
  const {
    commentaires, commentairesPublications, signalements, demandesCertification,
    segMap, versetMap, versetTexteMap, oeuvreTitreMap, signalementAuteurMap,
    actionValider, actionSupprimerCommentaire, actionValiderCommentaireEssai, actionSupprimerCommentaireEssai,
    actionMarquerTraite, actionMarquerTraiteSilencieux, actionSupprimerSignalement, actionCertifier, actionRetirerDemandeCertification,
  } = props

  const [sous, setSous] = useState<SousOnglet>('commentaires')
  const [enCours, setEnCours] = useState<Set<string>>(new Set())
  const [traites, setTraites] = useState<Set<string>>(new Set())

  const lancer = async (key: string, fn: () => Promise<void>) => {
    setEnCours(s => new Set(s).add(key))
    try { await fn() } finally {
      setEnCours(s => { const n = new Set(s); n.delete(key); return n })
      setTraites(s => new Set(s).add(key))
    }
  }

  const commentairesTous: ItemComment[] = [
    ...commentaires.map(c => ({ kind: 'comment' as const, key: `com-${c.id}`, c })),
    ...demandesCertification.map(c => ({ kind: 'certif' as const, key: `cert-${c.id}`, c })),
    ...commentairesPublications.map(c => ({ kind: 'publication' as const, key: `pub-${c.id}`, c })),
  ].filter(it => !traites.has(it.key))
    .sort((a, b) => new Date(b.c.created_at).getTime() - new Date(a.c.created_at).getTime())

  const signalementsAffiches = signalements
    .map(s => ({ s, key: `sig-${s.id}` }))
    .filter(it => !traites.has(it.key))

  const ONGLETS: { key: SousOnglet; label: string; n: number }[] = [
    { key: 'commentaires', label: 'Commentaires', n: commentairesTous.length },
    { key: 'signalements', label: 'Signalements', n: signalementsAffiches.length },
  ]

  return (
    <div>
      <style>{`
        .mod-tabs{display:flex;justify-content:center;gap:8px;margin:0 0 22px;}
        .mod-tab{font-family:var(--font-source-serif), Georgia, serif;font-size:14px;color:#8a8278;background:transparent;border:0;border-radius:999px;padding:7px 20px;cursor:pointer;transition:background .14s,color .14s;display:inline-flex;align-items:center;gap:8px;}
        .mod-tab:hover{color:#3d6b4f;}
        .mod-tab.active{background:#3d6b4f;color:#fff;}
        .mod-tab .n{font-size:10px;font-family:var(--font-source-sans), Arial, sans-serif;border-radius:999px;padding:1px 7px;background:rgba(0,0,0,.06);}
        .mod-tab.active .n{background:rgba(255,255,255,.25);}
        .mod-liste{display:flex;flex-direction:column;gap:10px;max-width:680px;margin:0 auto;}
        .mod-card{background:#fff;border:1px solid #e4dfd8;border-radius:9px;padding:13px 16px;}
        .mod-entete{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:9px;}
        .mod-ref{font-family:var(--font-source-serif), Georgia, serif;font-size:12.5px;color:#3d6b4f;text-decoration:none;}
        .mod-ref:hover{text-decoration:underline;}
        .mod-date{margin-left:auto;font-size:10.5px;color:#b0a89e;white-space:nowrap;}
        .mod-texte{font-size:13px;color:#2a2520;line-height:1.6;margin:0 0 10px;white-space:pre-line;}
        .mod-cible{font-size:11.5px;color:#6b6560;line-height:1.55;font-style:italic;border-left:2px solid #ddd0b0;padding-left:10px;margin:0 0 9px;max-height:110px;overflow:auto;}
        .mod-auteur{font-size:11px;color:#6b6560;font-weight:500;margin:0 0 10px;}
        .mod-actions{display:flex;justify-content:flex-end;gap:7px;flex-wrap:wrap;}
        .mod-btn{font-size:11px;padding:5px 12px;border-radius:6px;cursor:pointer;border:1px solid #d6d0c4;background:#fff;color:#5a5450;transition:background .12s,border-color .12s;}
        .mod-btn:hover{background:#f7f4ef;}
        .mod-btn.vert{background:#3d6b4f;color:#fff;border-color:#3d6b4f;}
        .mod-btn.vert:hover{background:#2e5440;}
        .mod-btn.rouge{color:#9a2a2a;border-color:#e2b9aa;background:#fff7f4;}
        .mod-btn.violet{background:#6b4fa0;color:#fff;border-color:#6b4fa0;}
        .mod-btn.violet:hover{background:#573f86;}
        .mod-btn:disabled{opacity:.5;cursor:default;}
        .mod-badge{font-size:9.5px;font-weight:700;letter-spacing:.05em;padding:2px 8px;border-radius:999px;white-space:nowrap;}
        .mod-vide{text-align:center;color:#9a958d;font-style:italic;font-size:13px;padding:26px 0;}
      `}</style>

      <div className="mod-tabs">
        {ONGLETS.map(o => (
          <button key={o.key} className={`mod-tab${sous === o.key ? ' active' : ''}`} onClick={() => setSous(o.key)}>
            {o.label}{o.n > 0 && <span className="n">{o.n}</span>}
          </button>
        ))}
      </div>

      {sous === 'commentaires' && (
        <div className="mod-liste">
          {commentairesTous.length === 0 ? (
            <p className="mod-vide">Aucun commentaire ni demande de certification en attente.</p>
          ) : commentairesTous.map(item => {
            const busy = enCours.has(item.key)
            const estCertif = item.kind === 'certif'
            const estPub = item.kind === 'publication'
            const loc = estPub
              ? { lieu: 'Publications' as Lieu, ref: item.c.titre_essai, href: `/essais/${item.c.id_essai}` as string | null }
              : localiserCommentaire(item.c, segMap, versetMap, oeuvreTitreMap)
            const mail = item.kind === 'comment' ? item.c.auteur_mail : null
            return (
              <div key={item.key} className="mod-card" style={estCertif ? { background: '#f7f3fb', borderColor: '#d8c9ec' } : undefined}>
                <div className="mod-entete">
                  <BadgeLieu lieu={loc.lieu} />
                  {estCertif && <span className="mod-badge" style={{ background: '#ece3f8', color: '#6b4fa0' }}>Demande de certification</span>}
                  {loc.href ? <a className="mod-ref" href={loc.href} target="_blank" rel="noopener noreferrer">{loc.ref}</a> : <span className="mod-ref">{loc.ref}</span>}
                  <span className="mod-date">{dateFormat(item.c.created_at)}</span>
                </div>
                <p className="mod-texte">{item.c.texte}</p>
                <p className="mod-auteur">{item.c.auteur_nom}{mail ? <span style={{ color: '#b0a89e', fontWeight: 400 }}> · {mail}</span> : null}</p>
                <div className="mod-actions">
                  {estCertif ? (
                    <>
                      <button className="mod-btn" disabled={busy} onClick={() => lancer(item.key, () => actionRetirerDemandeCertification(item.c.id))}>Accepter sans certifier</button>
                      <button className="mod-btn violet" disabled={busy} onClick={() => lancer(item.key, () => actionCertifier(item.c.id))}>Accorder la certification</button>
                    </>
                  ) : estPub ? (
                    <>
                      <button className="mod-btn rouge" disabled={busy} onClick={() => lancer(item.key, () => actionSupprimerCommentaireEssai(item.c.id))}>Supprimer</button>
                      <button className="mod-btn vert" disabled={busy} onClick={() => lancer(item.key, () => actionValiderCommentaireEssai(item.c.id))}>Valider</button>
                    </>
                  ) : (
                    <>
                      <button className="mod-btn rouge" disabled={busy} onClick={() => lancer(item.key, () => actionSupprimerCommentaire(item.c.id))}>Supprimer</button>
                      <button className="mod-btn vert" disabled={busy} onClick={() => lancer(item.key, () => actionValider(item.c.id))}>Valider</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {sous === 'signalements' && (
        <div className="mod-liste">
          {signalementsAffiches.length === 0 ? (
            <p className="mod-vide">Aucun signalement en attente.</p>
          ) : signalementsAffiches.map(({ s, key }) => {
            const loc = localiserSignalement(s, segMap, versetMap, versetTexteMap, oeuvreTitreMap)
            const imp = styleImportance(s.importance)
            const corps = separerReference(s.message).corps
            const auteur = s.user_id ? (signalementAuteurMap[s.user_id] ?? 'Utilisateur inscrit') : 'Anonyme'
            const busy = enCours.has(key)
            return (
              <div key={key} className="mod-card" style={{ background: imp.fond, borderColor: imp.bord }}>
                <div className="mod-entete">
                  {imp.label && <span className="mod-badge" style={{ background: '#fff', color: imp.accent, border: `1px solid ${imp.bord}` }}>{imp.label}</span>}
                  <BadgeLieu lieu={loc.lieu} />
                  {s.source === 'quiz_signalements' && <span className="mod-badge" style={{ background: '#ece9f6', color: '#6b5fa0' }}>Quiz</span>}
                  {loc.href ? <a className="mod-ref" href={loc.href} target="_blank" rel="noopener noreferrer">{loc.titre}</a> : <span className="mod-ref">{loc.titre}</span>}
                  <span className="mod-date">{dateFormat(s.created_at)}</span>
                </div>
                {loc.cible && <p className="mod-cible">« {loc.cible.length > 320 ? loc.cible.slice(0, 320) + '…' : loc.cible} »</p>}
                <p className="mod-texte">{corps}</p>
                <p className="mod-auteur">Signalé par {auteur}</p>
                <div className="mod-actions">
                  <button className="mod-btn rouge" disabled={busy} onClick={() => lancer(key, () => actionSupprimerSignalement(s.id))}>Supprimer le signalement</button>
                  <button className="mod-btn" disabled={busy} onClick={() => lancer(key, () => actionMarquerTraiteSilencieux(s.id))}>Traité</button>
                  <button className="mod-btn vert" disabled={busy} onClick={() => lancer(key, () => actionMarquerTraite(s.id))}>Traité et remercier</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
