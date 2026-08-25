'use client'

// Registre des propositions de GPT, et l'endroit où l'auteur y répond.
//
// Chaque proposition porte un état et une note libre. Tout est enregistré à la
// volée par /api/admin/propositions-gpt, en optimiste : l'écran suit la frappe,
// et un échec revient en arrière plutôt que de laisser croire à un enregistrement.
//
// ⛔ La page ne décide rien et ne coche rien d'elle-même. Une proposition « déjà
// en place » l'annonce comme un FAIT constaté dans le dépôt, jamais comme un
// arbitrage rendu.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import {
  ETATS, LOTS, avancement, directiveDe,
  type Directives, type EtatArbitrage, type Proposition,
} from './registre'

type Filtre = 'toutes' | 'a_arbitrer' | 'conflits' | 'annotees'

const FILTRES: { cle: Filtre; label: string }[] = [
  { cle: 'toutes', label: 'Toutes' },
  { cle: 'a_arbitrer', label: 'À arbitrer' },
  { cle: 'conflits', label: 'Conflits' },
  { cle: 'annotees', label: 'Annotées' },
]

const DELAI_ENREGISTREMENT = 700

function teinteEtat(etat: EtatArbitrage): string {
  return ETATS.find(e => e.cle === etat)?.teinte ?? 'var(--cs-texte-doux)'
}
function labelEtat(etat: EtatArbitrage): string {
  return ETATS.find(e => e.cle === etat)?.label ?? 'À arbitrer'
}

export default function RegistrePropositions({ initial }: { initial: Directives }) {
  const [directives, setDirectives] = useState<Directives>(initial)
  const [filtre, setFiltre] = useState<Filtre>('toutes')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(0)
  const [enregistreLe, setEnregistreLe] = useState<string | null>(initial.majLe)

  const compte = useMemo(() => avancement(directives), [directives])

  // Un envoi par proposition, différé : on n'écrit pas une ligne par frappe.
  const minuteries = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  useEffect(() => {
    const t = minuteries.current
    return () => { Object.values(t).forEach(clearTimeout) }
  }, [])

  const envoyer = useCallback(async (charge: Record<string, unknown>, retour: () => void) => {
    setEnCours(n => n + 1)
    setErreur(null)
    try {
      const r = await fetch('/api/admin/propositions-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(charge),
      })
      // Le verrou serveur REDIRIGE au lieu de refuser : une réponse 200 porteuse de
      // HTML satisfait `res.ok` et l'on croirait avoir enregistré (voir AGENTS.md).
      const type = r.headers.get('content-type') ?? ''
      if (r.redirected || !type.includes('application/json')) {
        throw new Error('Session non reconnue. Rechargez la page et reconnectez-vous.')
      }
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || `Échec de l’enregistrement (${r.status}).`)
      setEnregistreLe(j.majLe ?? new Date().toISOString())
    } catch (e) {
      retour()
      setErreur(e instanceof Error ? e.message : 'Erreur d’enregistrement.')
    } finally {
      setEnCours(n => n - 1)
    }
  }, [])

  function poserEtat(id: string, etat: EtatArbitrage) {
    const avant = directives
    const actuelle = directiveDe(directives, id)
    setDirectives(d => ({
      ...d,
      parProposition: { ...d.parProposition, [id]: { ...actuelle, etat } },
    }))
    envoyer({ id, etat, note: actuelle.note }, () => setDirectives(avant))
  }

  function poserNote(id: string, note: string) {
    const actuelle = directiveDe(directives, id)
    setDirectives(d => ({
      ...d,
      parProposition: { ...d.parProposition, [id]: { ...actuelle, note } },
    }))
    clearTimeout(minuteries.current[id])
    minuteries.current[id] = setTimeout(() => {
      envoyer({ id, etat: actuelle.etat, note }, () => { /* la frappe reste, on signale seulement */ })
    }, DELAI_ENREGISTREMENT)
  }

  function poserNoteGenerale(noteGenerale: string) {
    setDirectives(d => ({ ...d, noteGenerale }))
    clearTimeout(minuteries.current.__generale)
    minuteries.current.__generale = setTimeout(() => {
      envoyer({ noteGenerale }, () => {})
    }, DELAI_ENREGISTREMENT)
  }

  const retenue = (p: Proposition) => {
    const d = directiveDe(directives, p.id)
    if (filtre === 'a_arbitrer') return d.etat === 'a_arbitrer'
    if (filtre === 'conflits') return Boolean(p.conflit)
    if (filtre === 'annotees') return d.note.trim().length > 0
    return true
  }

  return (
    <main className="pg">
      <style>{CSS}</style>

      <header className="pg-tete">
        <h1 className="pg-titre">Propositions de GPT</h1>
        <p className="pg-chapeau">
          Ce que GPT a proposé, dans ses termes, avec ce que la mesure en dit et ce que
          la proposition heurte s’il y a lieu. Vos directives sont enregistrées à mesure
          que vous écrivez, et je les relis avant toute mise en œuvre.
        </p>
        <div className="pg-compteurs">
          <span><strong>{compte.total}</strong> proposition{pluriel(compte.total)}</span>
          <span><strong>{compte.restantes}</strong> à arbitrer</span>
          <span><strong>{compte.annotees}</strong> annotée{pluriel(compte.annotees)}</span>
          <span className="pg-etat-envoi">
            {enCours > 0 ? 'Enregistrement…' : enregistreLe ? `Enregistré le ${dateHeure(enregistreLe)}` : 'Rien d’enregistré'}
          </span>
        </div>
        {erreur && <p className="pg-erreur" role="alert">{erreur}</p>}
      </header>

      <section className="pg-generale">
        <label className="pg-label" htmlFor="pg-note-generale">Directive générale</label>
        <p className="pg-aide">
          Ce que vous écrivez ici commande tout le lot. C’est le bon endroit pour trancher
          l’ordre de priorité, ou pour dire ce que vous ne voulez voir nulle part.
        </p>
        <textarea
          id="pg-note-generale"
          className="pg-zone pg-zone--generale"
          value={directives.noteGenerale}
          onChange={e => poserNoteGenerale(e.target.value)}
          placeholder="Vos directives générales sur ce lot…"
          rows={5}
        />
      </section>

      <nav className="pg-filtres" role="group" aria-label="Filtrer les propositions">
        {FILTRES.map(f => (
          <button
            key={f.cle}
            type="button"
            className={filtre === f.cle ? 'pg-filtre pg-filtre--actif' : 'pg-filtre'}
            aria-pressed={filtre === f.cle}
            onClick={() => setFiltre(f.cle)}
          >
            {f.label}
          </button>
        ))}
      </nav>

      {LOTS.map(lot => {
        const visibles = lot.propositions.filter(retenue)
        return (
          <section key={lot.id} className="pg-lot">
            <h2 className="pg-lot-titre">{lot.titre}</h2>
            <p className="pg-lot-objet">{lot.objet}</p>
            <p className="pg-lot-date">Reçu le {lot.recuLe}</p>

            {visibles.length === 0 && <p className="pg-vide">Aucune proposition sous ce filtre.</p>}

            {grouperParRubrique(visibles).map(([rubrique, propositions]) => (
              <div key={rubrique}>
                <h3 className="pg-rubrique">{rubrique}</h3>
                {propositions.map(p => {
                  const d = directiveDe(directives, p.id)
                  return (
                    <article key={p.id} className="pg-carte" style={{ borderLeftColor: teinteEtat(d.etat) }}>
                      <div className="pg-carte-tete">
                        <h4 className="pg-carte-titre">{p.titre}</h4>
                        <div className="pg-badges">
                          {p.dejaEnPlace && <span className="pg-badge pg-badge--fait">Déjà en place</span>}
                          {p.conflit && <span className="pg-badge pg-badge--conflit">Conflit</span>}
                          <span className="pg-badge" style={{ color: teinteEtat(d.etat), borderColor: teinteEtat(d.etat) }}>
                            {labelEtat(d.etat)}
                          </span>
                        </div>
                      </div>

                      <p className="pg-texte">{p.texte}</p>

                      {p.exemple && (
                        <div className="pg-exemple">
                          <div className="pg-exemple-col">
                            <span className="pg-exemple-tag">Forme source</span>
                            <code>{p.exemple.avant}</code>
                          </div>
                          <div className="pg-exemple-col">
                            <span className="pg-exemple-tag">Proposé</span>
                            {p.exemple.apres.map((l, i) => <code key={i}>{l}</code>)}
                          </div>
                        </div>
                      )}

                      {p.mesure && (
                        <p className="pg-mesure"><span className="pg-mesure-tag">Mesuré</span> {p.mesure}</p>
                      )}

                      {p.conflit && (
                        <div className="pg-conflit">
                          <p className="pg-conflit-tete">Cette proposition heurte une consigne antérieure</p>
                          <p><span className="pg-conflit-tag">Consigne</span> {p.conflit.consigne}</p>
                          <p><span className="pg-conflit-tag">Proposition</span> {p.conflit.proposition}</p>
                        </div>
                      )}

                      <div className="pg-arbitrage">
                        <div className="pg-etats" role="group" aria-label={`Arbitrage : ${p.titre}`}>
                          {ETATS.map(e => (
                            <button
                              key={e.cle}
                              type="button"
                              className={d.etat === e.cle ? 'pg-etat pg-etat--actif' : 'pg-etat'}
                              style={d.etat === e.cle ? { color: e.teinte, borderColor: e.teinte } : undefined}
                              aria-pressed={d.etat === e.cle}
                              onClick={() => poserEtat(p.id, e.cle)}
                            >
                              {e.label}
                            </button>
                          ))}
                        </div>
                        <textarea
                          className="pg-zone"
                          value={d.note}
                          onChange={e => poserNote(p.id, e.target.value)}
                          placeholder="Votre directive sur ce point…"
                          rows={2}
                          aria-label={`Directive : ${p.titre}`}
                        />
                      </div>
                    </article>
                  )
                })}
              </div>
            ))}
          </section>
        )
      })}
    </main>
  )
}

function grouperParRubrique(propositions: Proposition[]): [string, Proposition[]][] {
  const par = new Map<string, Proposition[]>()
  for (const p of propositions) par.set(p.rubrique, [...(par.get(p.rubrique) ?? []), p])
  return [...par.entries()]
}

const pluriel = (n: number) => (n > 1 ? 's' : '')

function dateHeure(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

const CSS = `
.pg{max-width:56rem;margin:0 auto;padding:28px 24px 64px;min-height:calc(100vh - ${HAUTEUR_NAVBAR});background:var(--cs-fond)}
.pg-titre{font-family:var(--font-source-serif),Georgia,serif;font-size:${TITRE_PAGE};font-weight:${GRAISSE_TITRE};color:${ENCRE_TITRE_CARTE};margin:0 0 8px}
.pg-chapeau{font-size:0.875rem;line-height:1.6;color:var(--cs-texte-second);margin:0 0 14px;max-width:44rem}
.pg-compteurs{display:flex;flex-wrap:wrap;gap:18px;align-items:baseline;font-size:0.8125rem;color:var(--cs-texte-second)}
.pg-compteurs strong{color:var(--cs-texte-fort);font-weight:600}
.pg-etat-envoi{margin-left:auto;font-size:0.71875rem;color:var(--cs-texte-doux)}
.pg-erreur{margin:12px 0 0;padding:9px 12px;border-radius:4px;font-size:0.8125rem;
  background:var(--cs-danger-fond);border:1px solid var(--cs-danger-bord);color:var(--cs-danger-fonce)}

.pg-generale{margin:26px 0 8px;padding:16px 18px;background:var(--cs-surface);
  border:1px solid var(--cs-bord);border-radius:8px}
.pg-label{display:block;font-size:0.5625rem;font-weight:700;letter-spacing:0.09em;
  text-transform:uppercase;color:var(--cs-texte-doux);margin-bottom:6px}
.pg-aide{font-size:0.78125rem;line-height:1.55;color:var(--cs-texte-second);margin:0 0 10px}

.pg-zone{width:100%;box-sizing:border-box;padding:9px 11px;font:inherit;font-size:0.8125rem;
  line-height:1.55;color:var(--cs-texte);background:var(--cs-fond-clair);
  border:1px solid var(--cs-bord);border-radius:4px;resize:vertical}
.pg-zone::placeholder{color:var(--cs-texte-faible)}
.pg-zone--generale{background:var(--cs-fond-clair);min-height:5.5rem}

.pg-filtres{display:flex;gap:0;margin:26px 0 4px;border-bottom:1px solid var(--cs-bord)}
.pg-filtre{flex:1;padding:9px 8px;font:inherit;font-size:0.8125rem;color:var(--cs-texte-second);
  background:none;border:none;border-bottom:2px solid transparent;cursor:pointer}
.pg-filtre:hover{color:var(--cs-texte-fort)}
.pg-filtre--actif{color:var(--cs-vert);font-weight:600;border-bottom-color:var(--cs-vert-aplat)}

.pg-lot{margin-top:26px}
.pg-lot-titre{font-family:var(--font-source-serif),Georgia,serif;font-size:1.375rem;font-weight:400;
  color:var(--cs-encre);margin:0 0 6px}
.pg-lot-objet{font-size:0.8125rem;line-height:1.6;color:var(--cs-texte-second);margin:0 0 4px;max-width:44rem}
.pg-lot-date{font-size:0.71875rem;color:var(--cs-texte-doux);margin:0 0 20px}
.pg-vide{font-size:0.8125rem;color:var(--cs-texte-doux);padding:20px 0}

.pg-rubrique{font-size:0.5625rem;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;
  color:var(--cs-texte-doux);margin:26px 0 10px}

.pg-carte{background:var(--cs-surface);border:1px solid var(--cs-bord);border-left:3px solid var(--cs-texte-doux);
  border-radius:8px;padding:15px 17px;margin-bottom:12px}
.pg-carte-tete{display:flex;gap:12px;align-items:baseline;justify-content:space-between;flex-wrap:wrap;margin-bottom:8px}
.pg-carte-titre{font-family:var(--font-source-serif),Georgia,serif;font-size:1.0625rem;font-weight:500;
  color:var(--cs-encre);margin:0}
.pg-badges{display:flex;gap:6px;flex-wrap:wrap}
.pg-badge{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  padding:2px 7px;border-radius:999px;border:1px solid var(--cs-bord);color:var(--cs-texte-doux)}
.pg-badge--fait{color:var(--cs-vert);border-color:var(--cs-vert-pale);background:var(--cs-vert-pale)}
.pg-badge--conflit{color:var(--cs-danger);border-color:var(--cs-danger-bord);background:var(--cs-danger-fond)}

.pg-texte{font-size:0.8125rem;line-height:1.62;color:var(--cs-texte);margin:0 0 10px}

.pg-exemple{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:0 0 10px;padding:10px 12px;
  background:var(--cs-fond-doux);border-radius:4px}
.pg-exemple-tag{display:block;font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;
  text-transform:uppercase;color:var(--cs-texte-doux);margin-bottom:4px}
.pg-exemple-col code{display:block;font-family:ui-monospace,Consolas,monospace;font-size:0.71875rem;
  line-height:1.6;color:var(--cs-texte-fort);white-space:pre-wrap;overflow-wrap:break-word}

.pg-mesure{font-size:0.78125rem;line-height:1.6;color:var(--cs-texte-second);margin:0 0 10px}
.pg-mesure-tag{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--cs-or);margin-right:6px}

.pg-conflit{margin:0 0 12px;padding:10px 12px;border-radius:4px;
  background:var(--cs-danger-fond);border:1px solid var(--cs-danger-bord)}
.pg-conflit-tete{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--cs-danger);margin:0 0 6px}
.pg-conflit p{font-size:0.78125rem;line-height:1.6;color:var(--cs-texte);margin:0 0 4px}
.pg-conflit p:last-child{margin-bottom:0}
.pg-conflit-tag{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--cs-texte-doux);margin-right:6px}

.pg-arbitrage{border-top:1px solid var(--cs-bord-clair);padding-top:11px;margin-top:2px}
.pg-etats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:9px}
.pg-etat{padding:4px 10px;font:inherit;font-size:0.71875rem;color:var(--cs-texte-second);
  background:var(--cs-fond-clair);border:1px solid var(--cs-bord);border-radius:999px;cursor:pointer}
.pg-etat:hover{color:var(--cs-texte-fort);border-color:var(--cs-texte-doux)}
.pg-etat--actif{font-weight:600;background:var(--cs-fond)}

@media (max-width:640px){
  .pg{padding:20px 14px 48px}
  .pg-exemple{grid-template-columns:1fr}
  .pg-etat-envoi{margin-left:0;width:100%}
}
@media (prefers-reduced-motion:reduce){.pg *{transition:none!important}}
`
