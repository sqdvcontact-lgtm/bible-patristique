'use client'

type Commentaire = { id: number; texte: string; valide: boolean; created_at: string; id_segment: number | null; id_verset: string | null }
type Signalement = { id: number; message: string; traite: boolean; created_at: string; id_segment: number }
type SegInfo = { texte: string; numero: number; id_oeuvre: string }

type Props = {
  commentaires: Commentaire[]
  signalements: Signalement[]
  segMap: Record<number, SegInfo>
  actionDeconnexion: () => Promise<void>
  actionValider: (id: number) => Promise<void>
  actionSupprimerCommentaire: (id: number) => Promise<void>
  actionMarquerTraite: (id: number) => Promise<void>
  actionSupprimerSignalement: (id: number) => Promise<void>
}

function dateFormat(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function Carte({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 20px' }}>
      {children}
    </div>
  )
}

function ContexteSegment({ segId, segMap }: { segId: number | null; segMap: Record<number, SegInfo> }) {
  if (!segId || !segMap[segId]) return null
  const s = segMap[segId]
  return (
    <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', margin: '4px 0 8px', lineHeight: 1.4 }}>
      Segment §{s.numero} —{' '}
      <a href={`/oeuvre/${s.id_oeuvre}#s${s.numero}`} target="_blank" rel="noopener noreferrer"
        style={{ color: '#9a958d', textDecoration: 'underline' }}>
        {s.texte.slice(0, 80)}…
      </a>
    </p>
  )
}

export default function AdminClient({
  commentaires, signalements, segMap,
  actionDeconnexion, actionValider, actionSupprimerCommentaire,
  actionMarquerTraite, actionSupprimerSignalement,
}: Props) {
  const nbComm = commentaires.length
  const nbSignal = signalements.length

  return (
    <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', padding: '32px 24px 64px' }}>
      <style>{`
        .btn-vert { background: #3d6b4f !important; color: #fff !important; }
        .btn-vert:hover { background: #2e5440 !important; }
        .btn-rouge { background: #fff !important; color: #c0562a !important; border: 1px solid #e4c4b8 !important; }
        .btn-rouge:hover { background: #fdf2ee !important; }
        .btn-gris { background: #fff !important; color: #6b6560 !important; border: 1px solid #d6d0c4 !important; }
        .btn-gris:hover { background: #f3f0ea !important; }
      `}</style>

      <div style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: '24px', fontWeight: 'normal', color: '#2a3d30', margin: '0 0 4px' }}>
              Administration
            </h1>
            <p style={{ fontSize: '12px', color: '#9a958d', margin: 0 }}>
              {nbComm} commentaire{nbComm !== 1 ? 's' : ''} à valider · {nbSignal} signalement{nbSignal !== 1 ? 's' : ''} en attente
            </p>
          </div>
          <form action={actionDeconnexion}>
            <button type="submit" className="btn-gris" style={{ fontSize: '11.5px', padding: '6px 14px', borderRadius: '5px', cursor: 'pointer' }}>
              Déconnexion
            </button>
          </form>
        </div>

        {/* ── Commentaires ── */}
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '14px' }}>
            COMMENTAIRES À VALIDER ({nbComm})
          </h2>

          {nbComm === 0 ? (
            <Carte>
              <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>
                Aucun commentaire en attente de validation.
              </p>
            </Carte>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {commentaires.map(c => (
                <Carte key={c.id}>
                  {/* Contexte */}
                  {c.id_segment && <ContexteSegment segId={c.id_segment} segMap={segMap} />}
                  {c.id_verset && (
                    <p style={{ fontSize: '11px', color: '#9a958d', fontStyle: 'italic', margin: '4px 0 8px' }}>
                      Verset {c.id_verset}
                    </p>
                  )}
                  {/* Texte */}
                  <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.6, margin: '0 0 10px' }}>
                    {c.texte}
                  </p>
                  {/* Pied */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#b0a89e' }}>{dateFormat(c.created_at)}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <form action={actionSupprimerCommentaire.bind(null, c.id)}>
                        <button type="submit" className="btn-rouge" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>
                          Rejeter
                        </button>
                      </form>
                      <form action={actionValider.bind(null, c.id)}>
                        <button type="submit" className="btn-vert" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer', border: 'none' }}>
                          Valider ✓
                        </button>
                      </form>
                    </div>
                  </div>
                </Carte>
              ))}
            </div>
          )}
        </section>

        {/* ── Signalements ── */}
        <section>
          <h2 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.09em', color: '#b0a89e', marginBottom: '14px' }}>
            SIGNALEMENTS D'ERREURS ({nbSignal})
          </h2>

          {nbSignal === 0 ? (
            <Carte>
              <p style={{ fontSize: '13px', color: '#9a958d', fontStyle: 'italic', margin: 0 }}>
                Aucun signalement en attente.
              </p>
            </Carte>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {signalements.map(s => (
                <Carte key={s.id}>
                  <ContexteSegment segId={s.id_segment} segMap={segMap} />
                  <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.6, margin: '0 0 10px' }}>
                    {s.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#b0a89e' }}>{dateFormat(s.created_at)}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <form action={actionSupprimerSignalement.bind(null, s.id)}>
                        <button type="submit" className="btn-rouge" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer' }}>
                          Supprimer
                        </button>
                      </form>
                      <form action={actionMarquerTraite.bind(null, s.id)}>
                        <button type="submit" className="btn-vert" style={{ fontSize: '11.5px', padding: '5px 14px', borderRadius: '5px', cursor: 'pointer', border: 'none' }}>
                          Traité ✓
                        </button>
                      </form>
                    </div>
                  </div>
                </Carte>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  )
}