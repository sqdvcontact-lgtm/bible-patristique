'use client'

// Registre des propositions de GPT, et l'endroit où l'auteur y répond.
//
// ⛔ RIEN NE S'ENREGISTRE TOUT SEUL. Une directive se pose par un geste explicite :
// on écrit, on clique « Ajouter », et l'instruction rejoint la liste. Le premier
// jet enregistrait à la frappe, sans bouton : on ne savait jamais si l'on avait
// écrit ou seulement pensé.
//
// Les instructions S'EMPILENT sous chaque proposition, chacune supprimable. Une
// consigne nouvelle ne remplace pas la précédente : c'est un journal, et l'on doit
// pouvoir relire comment une décision s'est formée.
//
// ⛔ La page ne décide rien et ne coche rien d'elle-même. Une proposition « déjà
// en place » l'annonce comme un FAIT constaté dans le dépôt, jamais comme un
// arbitrage rendu.

import { useCallback, useMemo, useState } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import {
  ETATS, LOTS, avancement, directiveDe,
  type Directives, type EtatArbitrage, type Instruction, type Proposition,
} from './registre'

type Filtre = 'toutes' | 'a_arbitrer' | 'conflits' | 'annotees'

const FILTRES: { cle: Filtre; label: string }[] = [
  { cle: 'toutes', label: 'Toutes' },
  { cle: 'a_arbitrer', label: 'À arbitrer' },
  { cle: 'conflits', label: 'Conflits' },
  { cle: 'annotees', label: 'Avec instructions' },
]

const teinteEtat = (e: EtatArbitrage) => ETATS.find(x => x.cle === e)?.teinte ?? 'var(--cs-texte-doux)'
const labelEtat = (e: EtatArbitrage) => ETATS.find(x => x.cle === e)?.label ?? 'À arbitrer'
const pluriel = (n: number) => (n > 1 ? 's' : '')

function dateHeure(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

/**
 * La liste des instructions d'un point, et le champ pour en ajouter une.
 *
 * ⚠️ La suppression se fait en DEUX temps. Une instruction est du texte que
 * l'auteur a écrit : un clic malheureux ne doit pas l'effacer, et une fenêtre de
 * confirmation du navigateur serait plus brutale que le geste qu'elle protège.
 */
function ListeInstructions({ instructions, aide, placeholder, nom, onChanger, envoi }: {
  instructions: Instruction[]
  aide?: string
  placeholder: string
  nom: string
  onChanger: (suivant: Instruction[]) => void
  envoi: boolean
}) {
  const [brouillon, setBrouillon] = useState('')
  const [aSupprimer, setASupprimer] = useState<number | null>(null)

  function ajouter() {
    const texte = brouillon.trim()
    if (!texte) return
    setBrouillon('')
    setASupprimer(null)
    onChanger([...instructions, { texte, posee: null }])
  }

  function supprimer(i: number) {
    if (aSupprimer !== i) { setASupprimer(i); return }
    setASupprimer(null)
    onChanger(instructions.filter((_, k) => k !== i))
  }

  return (
    <div className="pg-instr">
      {aide && <p className="pg-aide">{aide}</p>}
      {instructions.length > 0 && (
        <ol className="pg-instr-liste">
          {instructions.map((instruction, i) => (
            <li key={i} className="pg-instr-item">
              <div className="pg-instr-corps">
                <p className="pg-instr-texte">{instruction.texte}</p>
                {instruction.posee && <p className="pg-instr-date">Posée le {dateHeure(instruction.posee)}</p>}
              </div>
              <button
                type="button"
                className={aSupprimer === i ? 'pg-instr-suppr pg-instr-suppr--arme' : 'pg-instr-suppr'}
                onClick={() => supprimer(i)}
                onBlur={() => setASupprimer(null)}
                disabled={envoi}
                aria-label={aSupprimer === i ? `Confirmer la suppression de l’instruction ${i + 1}` : `Supprimer l’instruction ${i + 1}`}
              >
                {aSupprimer === i ? 'Confirmer ?' : 'Supprimer'}
              </button>
            </li>
          ))}
        </ol>
      )}


      <div className="pg-ajout">
        <textarea
          className="pg-zone"
          value={brouillon}
          onChange={e => setBrouillon(e.target.value)}
          onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); ajouter() } }}
          placeholder={placeholder}
          rows={2}
          aria-label={`Nouvelle instruction : ${nom}`}
        />
        <div className="pg-ajout-pied">
          <span className="pg-raccourci">Ctrl + Entrée</span>
          <button
            type="button"
            className="pg-bouton"
            onClick={ajouter}
            disabled={envoi || brouillon.trim().length === 0}
          >
            Ajouter l’instruction
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RegistrePropositions({ initial }: { initial: Directives }) {
  const [directives, setDirectives] = useState<Directives>(initial)
  const [filtre, setFiltre] = useState<Filtre>('toutes')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(0)
  const [enregistreLe, setEnregistreLe] = useState<string | null>(initial.majLe)

  const compte = useMemo(() => avancement(directives), [directives])

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
      setEnregistreLe(j.majLe ?? null)
      return j as { instructions?: Instruction[]; instructionsGenerales?: Instruction[] }
    } catch (e) {
      retour()
      setErreur(e instanceof Error ? e.message : 'Erreur d’enregistrement.')
      return null
    } finally {
      setEnCours(n => n - 1)
    }
  }, [])

  async function poserEtat(id: string, etat: EtatArbitrage) {
    const avant = directives
    const actuelle = directiveDe(directives, id)
    setDirectives(d => ({ ...d, parProposition: { ...d.parProposition, [id]: { ...actuelle, etat } } }))
    await envoyer({ id, etat }, () => setDirectives(avant))
  }

  async function poserInstructions(id: string, instructions: Instruction[]) {
    const avant = directives
    const actuelle = directiveDe(directives, id)
    setDirectives(d => ({ ...d, parProposition: { ...d.parProposition, [id]: { ...actuelle, instructions } } }))
    // La réponse porte les dates POSÉES PAR LE SERVEUR : on les reprend, sinon la
    // ligne resterait sans date jusqu'au prochain chargement.
    const j = await envoyer({ id, instructions }, () => setDirectives(avant))
    if (j?.instructions) {
      setDirectives(d => ({
        ...d,
        parProposition: { ...d.parProposition, [id]: { ...directiveDe(d, id), instructions: j.instructions! } },
      }))
    }
  }

  async function poserGenerales(instructionsGenerales: Instruction[]) {
    const avant = directives
    setDirectives(d => ({ ...d, instructionsGenerales }))
    const j = await envoyer({ instructionsGenerales }, () => setDirectives(avant))
    if (j?.instructionsGenerales) {
      setDirectives(d => ({ ...d, instructionsGenerales: j.instructionsGenerales! }))
    }
  }

  const retenue = (p: Proposition) => {
    const d = directiveDe(directives, p.id)
    if (filtre === 'a_arbitrer') return d.etat === 'a_arbitrer'
    if (filtre === 'conflits') return Boolean(p.conflit)
    if (filtre === 'annotees') return d.instructions.length > 0
    return true
  }

  return (
    <main className="pg">
      <style>{CSS}</style>

      <header className="pg-tete">
        <h1 className="pg-titre">Propositions de GPT</h1>
        <p className="pg-chapeau">
          Ce que GPT a proposé, dans ses termes, avec ce que la mesure en dit et ce que
          la proposition heurte s’il y a lieu. Vos instructions s’empilent sous chaque
          point, et je les relis avant toute mise en œuvre.
        </p>
        <div className="pg-compteurs">
          <span><strong>{compte.total}</strong> proposition{pluriel(compte.total)}</span>
          <span><strong>{compte.restantes}</strong> à arbitrer</span>
          <span><strong>{compte.instructions}</strong> instruction{pluriel(compte.instructions)}</span>
          <span className="pg-etat-envoi">
            {enCours > 0 ? 'Enregistrement…' : enregistreLe ? `Enregistré le ${dateHeure(enregistreLe)}` : 'Rien d’enregistré'}
          </span>
        </div>
        {erreur && <p className="pg-erreur" role="alert">{erreur}</p>}
      </header>

      <section className="pg-generale">
        <p className="pg-label">Instructions générales</p>
        <ListeInstructions
          instructions={directives.instructionsGenerales}
          aide="Ce que vous posez ici commande tout le lot. C’est le bon endroit pour trancher l’ordre de priorité, ou pour dire ce que vous ne voulez voir nulle part."
          placeholder="Une instruction générale…"
          nom="instructions générales"
          onChanger={poserGenerales}
          envoi={enCours > 0}
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
                          {d.instructions.length > 0 && (
                            <span className="pg-badge pg-badge--instr">
                              {d.instructions.length} instruction{pluriel(d.instructions.length)}
                            </span>
                          )}
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
                              disabled={enCours > 0}
                              onClick={() => poserEtat(p.id, e.cle)}
                            >
                              {e.label}
                            </button>
                          ))}
                        </div>
                        <ListeInstructions
                          instructions={d.instructions}
                          placeholder="Une instruction sur ce point…"
                          nom={p.titre}
                          onChanger={suivant => poserInstructions(p.id, suivant)}
                          envoi={enCours > 0}
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
.pg-label{font-size:0.5625rem;font-weight:700;letter-spacing:0.09em;
  text-transform:uppercase;color:var(--cs-texte-doux);margin:0 0 8px}
.pg-aide{font-size:0.78125rem;line-height:1.55;color:var(--cs-texte-second);margin:0 0 9px}

/* ── Instructions ───────────────────────────────────────────────────────── */
.pg-instr-liste{list-style:none;margin:0 0 11px;padding:0;counter-reset:instr}
.pg-instr-item{counter-increment:instr;display:flex;gap:10px;align-items:flex-start;
  padding:8px 10px 8px 0;border-bottom:1px solid var(--cs-bord-clair)}
.pg-instr-item:first-child{border-top:1px solid var(--cs-bord-clair)}
.pg-instr-corps{flex:1 1 auto;min-width:0}
.pg-instr-texte{font-size:0.8125rem;line-height:1.6;color:var(--cs-texte-fort);margin:0;
  white-space:pre-wrap;overflow-wrap:break-word}
.pg-instr-texte::before{content:counter(instr) ". ";color:var(--cs-texte-doux);font-weight:600}
.pg-instr-date{font-size:0.65625rem;color:var(--cs-texte-doux);margin:3px 0 0}
/* Toujours visible : une action qui ne paraît qu'au survol est hors d'atteinte au
   doigt et invisible au clavier. */
.pg-instr-suppr{flex:0 0 auto;padding:3px 9px;font:inherit;font-size:0.65625rem;
  color:var(--cs-texte-doux);background:none;border:1px solid var(--cs-bord);
  border-radius:999px;cursor:pointer}
.pg-instr-suppr:hover{color:var(--cs-danger);border-color:var(--cs-danger-bord)}
.pg-instr-suppr--arme{color:var(--cs-danger);border-color:var(--cs-danger);
  background:var(--cs-danger-fond);font-weight:600}
.pg-instr-suppr:disabled{opacity:.5;cursor:default}

.pg-zone{width:100%;box-sizing:border-box;padding:9px 11px;font:inherit;font-size:0.8125rem;
  line-height:1.55;color:var(--cs-texte);background:var(--cs-fond-clair);
  border:1px solid var(--cs-bord);border-radius:4px;resize:vertical}
.pg-zone::placeholder{color:var(--cs-texte-faible)}
.pg-ajout-pied{display:flex;align-items:center;gap:10px;margin-top:7px}
.pg-raccourci{font-size:0.65625rem;color:var(--cs-texte-faible);letter-spacing:0.03em}
.pg-bouton{margin-left:auto;padding:6px 14px;font:inherit;font-size:0.75rem;font-weight:500;
  color:var(--cs-sur-aplat);background:var(--cs-vert-aplat);border:1px solid var(--cs-vert-aplat);
  border-radius:4px;cursor:pointer}
.pg-bouton:hover:not(:disabled){background:var(--cs-vert-aplat-fonce);border-color:var(--cs-vert-aplat-fonce)}
.pg-bouton:disabled{opacity:.45;cursor:default}

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
.pg-badge--instr{color:var(--cs-or);border-color:var(--cs-or-doux)}

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
.pg-etats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:11px}
.pg-etat{padding:4px 10px;font:inherit;font-size:0.71875rem;color:var(--cs-texte-second);
  background:var(--cs-fond-clair);border:1px solid var(--cs-bord);border-radius:999px;cursor:pointer}
.pg-etat:hover:not(:disabled){color:var(--cs-texte-fort);border-color:var(--cs-texte-doux)}
.pg-etat--actif{font-weight:600;background:var(--cs-fond)}
.pg-etat:disabled{cursor:default}

@media (max-width:640px){
  .pg{padding:20px 14px 48px}
  .pg-exemple{grid-template-columns:1fr}
  .pg-etat-envoi{margin-left:0;width:100%}
  .pg-instr-item{flex-wrap:wrap}
}
@media (prefers-reduced-motion:reduce){.pg *{transition:none!important}}
`
