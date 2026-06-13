'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type VRef = { id: string; label: string; textes: Record<string, string>; livre: string; chapitre: string; verset: string }
type SegData = { id: number; numero: number; texte: string; versets: VRef[] }
type GroupeData = { niv1: string; niv2: string; anchor: string; itemIds: number[] }
type TocEntry = { niv1: string; niv2: string; anchor: string }
type Commentaire = { id: number; texte: string; valide: boolean; created_at: string }

const TRADUCTIONS = [
  { code: 'trad_sacy',    label: 'Sacy 1759' },
  { code: 'trad_lsg',     label: 'Segond' },
  { code: 'trad_crampon', label: 'Crampon' },
  { code: 'trad_vulgate', label: 'Vulgate' },
]

type Props = {
  auteur: string
  oeuvre: { titre: string; titre_original?: string; trad_auteur?: string; trad_date?: string }
  toc: TocEntry[]
  groupes: GroupeData[]
  segments: SegData[]
}

function normaliserEspaces(texte: string): string {
  return texte
    .replace(/\u00A0([?!;:])/g, '\u202F$1')
    .replace(/«\u00A0/g, '«\u202F')
    .replace(/\u00A0»/g, '\u202F»')
}

// ── Bandeau signalement ──────────────────────────────────────────────────────
function BandeauSignalement({
  segActif, segMap, onClose,
}: {
  segActif: number | null
  segMap: Map<number, SegData>
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  const seg = segActif !== null ? segMap.get(segActif) : null

  const envoyer = async () => {
    if (!message.trim() || segActif === null) return
    setStatut('sending')
    const { error } = await supabase
      .from('signalements')
      .insert({ id_segment: segActif, message: message.trim() })
    if (error) { setStatut('err'); return }
    setStatut('ok')
    setMessage('')
    setTimeout(() => { setStatut('idle'); onClose() }, 1800)
  }

  return (
    <div style={{
      borderTop: '1px solid #d6d0c4',
      background: '#fdf9f4',
      padding: '14px 20px 16px',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#c0562a', margin: 0 }}>
          Signaler une erreur
        </p>
        <button onClick={onClose} style={{ fontSize: '12px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
      </div>
      {seg && (
        <p style={{ fontSize: '10.5px', color: '#9a958d', fontStyle: 'italic', marginBottom: '7px', lineHeight: 1.4 }}>
          Segment §{seg.numero} — {seg.texte.slice(0, 60)}…
        </p>
      )}
      {statut === 'ok' ? (
        <p style={{ fontSize: '11.5px', color: '#3d6b4f', fontStyle: 'italic' }}>Signalement envoyé, merci.</p>
      ) : (
        <>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Décrivez l'erreur constatée…"
            rows={3}
            style={{
              width: '100%',
              fontSize: '11.5px',
              padding: '7px 9px',
              border: '1px solid #d6d0c4',
              borderRadius: '5px',
              background: '#fff',
              color: '#2a2520',
              resize: 'vertical',
              outline: 'none',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '8px' }}>
            {statut === 'err' && (
              <span style={{ fontSize: '10.5px', color: '#c0562a', alignSelf: 'center' }}>Erreur d'envoi.</span>
            )}
            <button
              onClick={envoyer}
              disabled={statut === 'sending' || !message.trim()}
              style={{
                fontSize: '11.5px',
                padding: '5px 14px',
                borderRadius: '4px',
                border: 'none',
                cursor: message.trim() ? 'pointer' : 'default',
                background: message.trim() ? '#c0562a' : '#e4dfd8',
                color: message.trim() ? '#fff' : '#9a958d',
                fontWeight: 500,
              }}
            >
              {statut === 'sending' ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ── Onglet commentaires ──────────────────────────────────────────────────────
function OngletCommentaires({ segActif }: { segActif: number | null }) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [texte, setTexte] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (segActif === null) { setCommentaires([]); return }
    setLoading(true)
    supabase
      .from('commentaires')
      .select('id, texte, valide, created_at')
      .eq('id_segment', segActif)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setCommentaires(data || []); setLoading(false) })
  }, [segActif])

  const soumettre = async () => {
    if (!texte.trim() || segActif === null) return
    setStatut('sending')
    const { error } = await supabase
      .from('commentaires')
      .insert({ id_segment: segActif, texte: texte.trim(), valide: false })
    if (error) { setStatut('err'); return }
    setStatut('ok')
    setTexte('')
    setTimeout(() => setStatut('idle'), 2500)
  }

  if (segActif === null) {
    return (
      <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d', padding: '8px 0' }}>
        Cliquez sur un paragraphe pour voir ou ajouter des commentaires.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      {/* Liste des commentaires */}
      {loading && <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p>}
      {!loading && commentaires.length === 0 && (
        <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', marginBottom: '12px' }}>
          Aucun commentaire pour ce passage.
        </p>
      )}
      {commentaires.map(c => (
        <div key={c.id} style={{
          padding: '9px 0',
          borderBottom: '1px solid #ede9e2',
        }}>
          {!c.valide && (
            <span style={{
              fontSize: '9.5px',
              fontWeight: 600,
              color: '#b03a2a',
              background: 'rgba(176,58,42,0.08)',
              padding: '1px 6px',
              borderRadius: '3px',
              display: 'inline-block',
              marginBottom: '4px',
              letterSpacing: '0.04em',
            }}>
              NON VALIDÉ
            </span>
          )}
          <p style={{
            fontSize: '12px',
            color: c.valide ? '#2a2520' : '#7a5550',
            lineHeight: 1.55,
            margin: 0,
          }}>
            {c.texte}
          </p>
          <p style={{ fontSize: '10px', color: '#b0a89e', marginTop: '3px' }}>
            {new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      ))}

      {/* Formulaire contribution */}
      <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #d6d0c4' }}>
        <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', color: '#b0a89e', marginBottom: '7px' }}>
          CONTRIBUER
        </p>
        {statut === 'ok' ? (
          <p style={{ fontSize: '11.5px', color: '#3d6b4f', fontStyle: 'italic' }}>
            Commentaire soumis — il apparaîtra après validation.
          </p>
        ) : (
          <>
            <textarea
              value={texte}
              onChange={e => setTexte(e.target.value)}
              placeholder="Votre commentaire sur ce passage…"
              rows={4}
              style={{
                width: '100%',
                fontSize: '11.5px',
                padding: '7px 9px',
                border: '1px solid #d6d0c4',
                borderRadius: '5px',
                background: '#fff',
                color: '#2a2520',
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.5,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px', gap: '8px', alignItems: 'center' }}>
              {statut === 'err' && (
                <span style={{ fontSize: '10.5px', color: '#c0562a' }}>Erreur d'envoi.</span>
              )}
              <button
                onClick={soumettre}
                disabled={statut === 'sending' || !texte.trim()}
                style={{
                  fontSize: '11.5px',
                  padding: '5px 14px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: texte.trim() ? 'pointer' : 'default',
                  background: texte.trim() ? '#3d6b4f' : '#e4dfd8',
                  color: texte.trim() ? '#fff' : '#9a958d',
                  fontWeight: 500,
                }}
              >
                {statut === 'sending' ? 'Envoi…' : 'Soumettre'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function OeuvreClient({ auteur, oeuvre, toc, groupes, segments }: Props) {
  const [segActif, setSegActif] = useState<number | null>(null)
  const [tradIndex, setTradIndex] = useState(0)
  const [ongletDroit, setOngletDroit] = useState<'refs' | 'commentaires'>('refs')
  const [bandeauSignal, setBandeauSignal] = useState(false)

  const trad = TRADUCTIONS[tradIndex].code
  const segMap = new Map(segments.map(s => [s.id, s]))
  const segActifData = segActif !== null ? segMap.get(segActif) : null

  // Ouvrir le bandeau signalement seulement si un segment est actif
  const ouvrirSignalement = () => { if (segActif !== null) setBandeauSignal(true) }

  let dniv1 = '', dniv2 = ''
  let prevWasNiv1 = false

  return (
    <div style={{ background: '#f7f4ef', minHeight: '100vh' }}>
      <style>{`
        .seg-p { transition: background 0.12s; }
        .seg-p:hover { background: rgba(61,107,79,0.05) !important; }
        .toc-lien-n1:hover, .toc-lien-n2:hover { color: #3d6b4f !important; }
        .ref-lien:hover { color: #3d6b4f !important; }
        .onglet-btn { transition: color 0.12s, border-color 0.12s; }
        .onglet-btn:hover { color: #3d6b4f !important; }
        .signal-btn:hover { color: #c0562a !important; }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', minHeight: '100vh' }}>

        {/* ── NAV GAUCHE — 20% ── */}
        <nav style={{
          width: '20%',
          flexShrink: 0,
          position: 'sticky',
          top: '48px',
          alignSelf: 'flex-start',
          height: 'calc(100vh - 48px)',
          overflowY: 'auto',
          borderRight: '1px solid #d6d0c4',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Encart méta */}
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '4px' }}>{auteur}</p>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '13px', color: '#2a3d30', lineHeight: 1.35, marginBottom: oeuvre.titre_original ? '3px' : '0' }}>
              {oeuvre.titre}
            </p>
            {oeuvre.titre_original && (
              <p style={{ fontSize: '11.5px', color: '#8a8278', fontStyle: 'italic', marginBottom: '0' }}>{oeuvre.titre_original}</p>
            )}
            {(oeuvre.trad_auteur || oeuvre.trad_date) && (
              <p style={{ fontSize: '11px', color: '#9a958d', marginTop: '6px' }}>
                Trad. {oeuvre.trad_auteur ?? ''}{oeuvre.trad_date ? `, ${oeuvre.trad_date}` : ''}
              </p>
            )}
            <div style={{ marginTop: '12px' }}>
              <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '5px' }}>TRADUCTION</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {TRADUCTIONS.map((t, i) => (
                  <button key={t.code} onClick={() => setTradIndex(i)} style={{
                    textAlign: 'left', padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer',
                    fontSize: '11.5px',
                    background: tradIndex === i ? 'rgba(61,107,79,0.12)' : 'transparent',
                    color: tradIndex === i ? '#3d6b4f' : '#6b6560',
                    fontWeight: tradIndex === i ? 500 : 400,
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Sommaire */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
            <p style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '8px' }}>SOMMAIRE</p>
            {(() => {
              let tln1 = '', tln2 = ''
              return toc.map((entry, i) => {
                const sn1 = entry.niv1 && entry.niv1 !== tln1
                const sn2 = entry.niv2 && (entry.niv2 !== tln2 || sn1)
                if (sn1) tln1 = entry.niv1
                if (sn2) tln2 = entry.niv2
                return (
                  <div key={i}>
                    {sn1 && <a href={`#${entry.anchor}`} className="toc-lien-n1" style={{ display: 'block', fontSize: '11.5px', fontWeight: 500, color: '#3a3530', marginTop: '10px', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>{entry.niv1}</a>}
                    {sn2 && <a href={`#${entry.anchor}`} className="toc-lien-n2" style={{ display: 'block', fontSize: '11px', color: '#7a7268', marginLeft: '8px', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>{entry.niv2}</a>}
                  </div>
                )
              })
            })()}
          </div>
        </nav>

        {/* ── TEXTE CENTRAL — 44% ── */}
        <main style={{ width: '44%', flexShrink: 0, padding: '40px 48px' }}>
          {groupes.map((groupe) => {
            const showNiv1 = groupe.niv1 && groupe.niv1 !== dniv1
            const showNiv2 = groupe.niv2 && (groupe.niv2 !== dniv2 || showNiv1)
            if (showNiv1) dniv1 = groupe.niv1
            if (showNiv2) dniv2 = groupe.niv2
            const niv2AvecBlanc = showNiv2 && !prevWasNiv1 && !showNiv1
            prevWasNiv1 = !!showNiv1
            return (
              <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: '60px' }}>
                {showNiv1 && (
                  <h2 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.45rem', fontWeight: 500, color: '#2a2520', textAlign: 'center', lineHeight: 1.3, marginTop: '2.5rem', marginBottom: '0.5rem' }}>
                    {groupe.niv1}
                  </h2>
                )}
                {showNiv2 && (
                  <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '1.15rem', fontWeight: 400, color: '#3a3530', textAlign: 'center', lineHeight: 1.3, marginTop: niv2AvecBlanc ? '3rem' : '0', marginBottom: '0.75rem' }}>
                    {groupe.niv2}
                  </h3>
                )}
                {groupe.itemIds.map(sid => {
                  const s = segMap.get(sid)
                  if (!s) return null
                  const actif = segActif === sid
                  return (
                    <p
                      key={sid}
                      id={`s${s.numero}`}
                      onClick={() => {
                        setSegActif(actif ? null : sid)
                        if (actif) setBandeauSignal(false)
                      }}
                      className="seg-p"
                      style={{
                        fontFamily: 'Arial, sans-serif', fontSize: '0.82rem', color: '#1e1a16',
                        lineHeight: '1.6', textAlign: 'justify', cursor: 'pointer', borderRadius: '3px',
                        padding: '1px 4px', margin: '0 -4px 0.45rem',
                        background: actif ? '#ddeee2' : 'transparent', scrollMarginTop: '60px',
                      }}
                    >
                      <sup style={{ fontSize: '0.52rem', color: '#b0a89e', marginRight: '2px', userSelect: 'none' }}>{s.numero}</sup>
                      {normaliserEspaces(s.texte)}
                    </p>
                  )
                })}
              </div>
            )
          })}
        </main>

        {/* ── PANNEAU DROIT — 36% ── */}
        <aside style={{
          width: '36%',
          flexShrink: 0,
          position: 'sticky',
          top: '48px',
          alignSelf: 'flex-start',
          height: 'calc(100vh - 48px)',
          borderLeft: '1px solid #d6d0c4',
          display: 'flex',
          flexDirection: 'column',
        }}>

          {/* Onglets */}
          <div style={{ display: 'flex', borderBottom: '1px solid #d6d0c4', flexShrink: 0 }}>
            {([
              { key: 'refs', label: 'Références bibliques' },
              { key: 'commentaires', label: 'Commentaires' },
            ] as const).map(o => (
              <button
                key={o.key}
                onClick={() => setOngletDroit(o.key)}
                className="onglet-btn"
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  fontSize: '11px',
                  fontWeight: ongletDroit === o.key ? 600 : 400,
                  color: ongletDroit === o.key ? '#3d6b4f' : '#9a958d',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: ongletDroit === o.key ? '2px solid #3d6b4f' : '2px solid transparent',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Contenu scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {ongletDroit === 'refs' ? (
              <>
                {segActifData ? (
                  <>
                    {segActifData.versets.length === 0 ? (
                      <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>Aucun verset associé.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {segActifData.versets.map(v => (
                          <div key={v.id}>
                            <p style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', marginBottom: '4px' }}>{v.label}</p>
                            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '12.5px', lineHeight: '1.5', color: '#2a2520', textAlign: 'justify', marginBottom: '4px' }}>
                              {v.textes[trad] || v.textes['trad_sacy'] || '—'}
                            </p>
                            <a href={`/?livre=${v.livre}&chapitre=${v.chapitre}`} className="ref-lien" style={{ fontSize: '10.5px', color: '#b0a89e', textDecoration: 'none' }}>
                              Accéder au texte biblique ↗
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setSegActif(null)} style={{ marginTop: '20px', fontSize: '11px', color: '#9a958d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      ← Fermer
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: '11.5px', fontStyle: 'italic', color: '#9a958d' }}>
                    Cliquez sur un paragraphe pour afficher les versets associés.
                  </p>
                )}
              </>
            ) : (
              <OngletCommentaires segActif={segActif} />
            )}
          </div>

          {/* ── Bandeau bas : Signaler / Contribuer ── */}
          {bandeauSignal ? (
            <BandeauSignalement
              segActif={segActif}
              segMap={segMap}
              onClose={() => setBandeauSignal(false)}
            />
          ) : (
            <div style={{
              borderTop: '1px solid #d6d0c4',
              padding: '10px 20px',
              display: 'flex',
              gap: '16px',
              flexShrink: 0,
              background: '#faf8f4',
            }}>
              <button
                onClick={ouvrirSignalement}
                className="signal-btn"
                disabled={segActif === null}
                style={{
                  fontSize: '11px',
                  color: segActif !== null ? '#9a958d' : '#c8c4bc',
                  background: 'none',
                  border: 'none',
                  cursor: segActif !== null ? 'pointer' : 'default',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '13px' }}>⚑</span> Signaler une erreur
              </button>
              <button
                onClick={() => setOngletDroit('commentaires')}
                className="onglet-btn"
                style={{
                  fontSize: '11px',
                  color: '#9a958d',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '13px' }}>✎</span> Contribuer
              </button>
            </div>
          )}
        </aside>

      </div>
    </div>
  )
}