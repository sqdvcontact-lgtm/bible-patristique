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
import { texteApparatAffiche } from '@/app/lib/apparatCritique'
import {
  ETATS, LOTS, VOIX, avancement, directiveDe, messagesGeneraux, roleExemple, texteAPorterAGpt,
  type Directives, type EtatArbitrage, type Exemple, type Fragment,
  type Message, type Proposition, type Voix,
} from './registre'

type Filtre = 'toutes' | 'a_arbitrer' | 'conflits' | 'annotees' | 'attente_gpt'

const FILTRES: { cle: Filtre; label: string }[] = [
  { cle: 'toutes', label: 'Toutes' },
  { cle: 'a_arbitrer', label: 'À arbitrer' },
  { cle: 'conflits', label: 'Conflits' },
  { cle: 'annotees', label: 'Instruites' },
  { cle: 'attente_gpt', label: 'Attendent GPT' },
]

/** Ce que la route rend : les listes telles qu'elles ont été ÉCRITES, avec leurs
 *  dates. Le client les reprend plutôt que d'en inventer. */
type ChampListe = 'instructions' | 'reponses' | 'instructionsGenerales' | 'reponsesGenerales'
type ReponseRoute = Partial<Record<ChampListe, Message[]>>

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
function ListeMessages({ messages, placeholder, nom, onChanger, envoi }: {
  messages: Message[]
  placeholder: string
  nom: string
  onChanger: (suivant: Message[]) => void
  envoi: boolean
}) {
  const [brouillon, setBrouillon] = useState('')
  const [aSupprimer, setASupprimer] = useState<number | null>(null)

  function ajouter() {
    const texte = brouillon.trim()
    if (!texte) return
    setBrouillon('')
    setASupprimer(null)
    onChanger([...messages, { texte, posee: null }])
  }

  function supprimer(i: number) {
    if (aSupprimer !== i) { setASupprimer(i); return }
    setASupprimer(null)
    onChanger(messages.filter((_, k) => k !== i))
  }

  return (
    <div className="pg-instr">
      {messages.length > 0 && (
        <ol className="pg-instr-liste">
          {messages.map((instruction, i) => (
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
                aria-label={aSupprimer === i ? `Confirmer la suppression du message ${i + 1} : ${nom}` : `Supprimer le message ${i + 1} : ${nom}`}
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
          aria-label={`Nouveau message : ${nom}`}
        />
        <div className="pg-ajout-pied">
          <span className="pg-raccourci">Ctrl + Entrée</span>
          <button
            type="button"
            className="pg-bouton"
            onClick={ajouter}
            disabled={envoi || brouillon.trim().length === 0}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Le passage de main vers GPT. ⚠️ GPT n'a pas accès au site : sans ce bouton, la
 * colonne des réponses serait un champ que rien ne vient remplir. On copie la
 * proposition, la mesure, le conflit et les instructions déjà posées, pour n'avoir
 * pas à les recomposer de mémoire dans une autre fenêtre.
 */
function BoutonCopier({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false)
  return (
    <button
      type="button"
      className="pg-copier"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texte)
          setCopie(true)
          setTimeout(() => setCopie(false), 2000)
        } catch { setCopie(false) }
      }}
    >
      {copie ? 'Copié' : 'Copier pour GPT'}
    </button>
  )
}

/**
 * Les DEUX voix d'un point, côte à côte : ce que l'auteur ordonne, ce que GPT
 * répond. ⛔ Elles ne se mêlent jamais, et l'ordre ne change pas d'un point à
 * l'autre : c'est ce qui permet de parcourir la page sans relire les intitulés.
 */
function Dialogue({ instructions, reponses, aide, nom, aCopier, onChanger, envoi }: {
  instructions: Message[]
  reponses: Message[]
  aide?: string
  nom: string
  aCopier?: string
  onChanger: (voix: Voix, suivant: Message[]) => void
  envoi: boolean
}) {
  const parVoix: Record<Voix, Message[]> = { instructions, reponses }
  return (
    <div className="pg-dialogue">
      {aide && <p className="pg-aide">{aide}</p>}
      <div className="pg-voix-grille">
        {VOIX.map(v => (
          <section key={v.cle} className={v.cle === 'reponses' ? 'pg-voix pg-voix--gpt' : 'pg-voix'}>
            <div className="pg-voix-tete">
              <p className="pg-label">{v.label}</p>
              {v.cle === 'reponses' && aCopier && <BoutonCopier texte={aCopier} />}
            </div>
            <ListeMessages
              messages={parVoix[v.cle]}
              placeholder={v.placeholder}
              nom={`${v.label}, ${nom}`}
              onChanger={suivant => onChanger(v.cle, suivant)}
              envoi={envoi}
            />
          </section>
        ))}
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
      return j as ReponseRoute
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

  async function poserMessages(id: string, voix: Voix, messages: Message[]) {
    const avant = directives
    const actuelle = directiveDe(directives, id)
    setDirectives(d => ({
      ...d,
      parProposition: { ...d.parProposition, [id]: { ...actuelle, [voix]: messages } },
    }))
    // La réponse porte les dates POSÉES PAR LE SERVEUR : on les reprend, sinon la
    // ligne resterait sans date jusqu'au prochain chargement.
    const j = await envoyer({ id, [voix]: messages }, () => setDirectives(avant))
    const rendu = j?.[voix]
    if (rendu) {
      setDirectives(d => ({
        ...d,
        parProposition: { ...d.parProposition, [id]: { ...directiveDe(d, id), [voix]: rendu } },
      }))
    }
  }

  async function poserGenerales(voix: Voix, messages: Message[]) {
    const champ: ChampListe = voix === 'instructions' ? 'instructionsGenerales' : 'reponsesGenerales'
    const avant = directives
    setDirectives(d => ({ ...d, [champ]: messages }))
    const j = await envoyer({ [champ]: messages }, () => setDirectives(avant))
    const rendu = j?.[champ]
    if (rendu) setDirectives(d => ({ ...d, [champ]: rendu }))
  }

  const retenue = (p: Proposition) => {
    const d = directiveDe(directives, p.id)
    if (filtre === 'a_arbitrer') return d.etat === 'a_arbitrer'
    if (filtre === 'conflits') return (p.heurts?.length ?? 0) > 0
    if (filtre === 'annotees') return d.instructions.length > 0
    if (filtre === 'attente_gpt') return d.instructions.length > 0 && d.reponses.length === 0
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
          <span><strong>{compte.reponses}</strong> réponse{pluriel(compte.reponses)} de GPT</span>
          {compte.attendGpt > 0 && (
            <span><strong>{compte.attendGpt}</strong> attend{compte.attendGpt > 1 ? 'ent' : ''} GPT</span>
          )}
          <span className="pg-etat-envoi">
            {enCours > 0 ? 'Enregistrement…' : enregistreLe ? `Enregistré le ${dateHeure(enregistreLe)}` : 'Rien d’enregistré'}
          </span>
        </div>
        {erreur && <p className="pg-erreur" role="alert">{erreur}</p>}
      </header>

      <section className="pg-generale">
        <Dialogue
          instructions={messagesGeneraux(directives, 'instructions')}
          reponses={messagesGeneraux(directives, 'reponses')}
          aide="Ce que vous posez ici commande tout le lot. C’est le bon endroit pour trancher l’ordre de priorité, ou pour dire ce que vous ne voulez voir nulle part."
          nom="sur l’ensemble du lot"
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
                          {p.heurts && p.heurts.length > 0 && (
                            <span className="pg-badge pg-badge--conflit">
                              {p.heurts.length > 1 ? p.heurts.length + " conflits" : "Conflit"}
                            </span>
                          )}
                          {d.instructions.length > 0 && (
                            <span className="pg-badge pg-badge--instr">
                              {d.instructions.length} instruction{pluriel(d.instructions.length)}
                            </span>
                          )}
                          {d.reponses.length > 0 && (
                            <span className="pg-badge pg-badge--gpt">
                              {d.reponses.length} réponse{pluriel(d.reponses.length)}
                            </span>
                          )}
                          <span className="pg-badge" style={{ color: teinteEtat(d.etat), borderColor: teinteEtat(d.etat) }}>
                            {labelEtat(d.etat)}
                          </span>
                        </div>
                      </div>

                      <p className="pg-texte">{p.texte}</p>

                      {p.exemple && <BlocExemple exemple={p.exemple} />}

                      {p.mesure && (
                        <p className="pg-mesure"><span className="pg-mesure-tag">Mesuré</span> {p.mesure}</p>
                      )}

                      {p.heurts && p.heurts.length > 0 && (
                        <div className="pg-conflit">
                          <p className="pg-conflit-tete">
                            {p.heurts.length > 1
                              ? `Cette proposition heurte ${p.heurts.length} consignes antérieures`
                              : 'Cette proposition heurte une consigne antérieure'}
                          </p>
                          {p.heurts.map((h, i) => (
                            <div key={i} className="pg-heurt">
                              <p><span className="pg-conflit-tag">Consigne</span> {h.consigne}</p>
                              <p><span className="pg-conflit-tag">Proposition</span> {h.proposition}</p>
                            </div>
                          ))}
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
                        <Dialogue
                          instructions={d.instructions}
                          reponses={d.reponses}
                          nom={p.titre}
                          aCopier={texteAPorterAGpt(p, d)}
                          onChanger={(voix, suivant) => poserMessages(p.id, voix, suivant)}
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

const CLASSE_FRAGMENT: Record<string, string> = {
  latin: 'pg-f-latin', sigle: 'pg-f-sigle', gloss: 'pg-f-gloss',
}

/**
 * L'avant-après d'une consigne, sur une entrée RÉELLE, en trois états.
 *
 * ⛔ L'état « aujourd'hui » n'est pas recopié à la main : il est calculé par
 * `texteApparatAffiche`, le renderer que le site emploie vraiment. Une planche
 * de comparaison dont la colonne de gauche serait écrite de mémoire ne prouverait
 * rien, et se démentirait au premier changement du rendu.
 */
function BlocExemple({ exemple }: { exemple: Exemple }) {
  const { source } = exemple
  const aujourdhui = texteApparatAffiche({
    text: source.texte,
    printedLine: source.ligne > 0 ? source.ligne : null,
    editorialRole: roleExemple(exemple),
  })

  return (
    <div className="pg-ex">
      <p className="pg-ex-source">
        Note {source.note}
        {source.ligne > 0 && `, ligne imprimée ${source.ligne}`}
        {source.provenance && ` · ${source.provenance}`}
      </p>

      <div className="pg-ex-rang">
        <span className="pg-ex-tag">En base</span>
        <code className="pg-ex-code">{source.texte}</code>
      </div>
      <div className="pg-ex-rang">
        <span className="pg-ex-tag">Aujourd’hui</span>
        <code className="pg-ex-code">{aujourdhui}</code>
      </div>
      <div className="pg-ex-rang pg-ex-rang--apres">
        <span className="pg-ex-tag pg-ex-tag--apres">Avec la consigne</span>
        <div className="pg-ex-apres">
          {exemple.apres.map((ligne, i) => (
            <p key={i} className="pg-ex-ligne">
              {ligne.map((f: Fragment, k) => (
                <span key={k} className={f.r ? CLASSE_FRAGMENT[f.r] : undefined}>{f.v}</span>
              ))}
            </p>
          ))}
        </div>
      </div>

      {exemple.reserve && <p className="pg-ex-reserve">{exemple.reserve}</p>}
    </div>
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

/* ── Les deux voix ──────────────────────────────────────────────────────── */
.pg-voix-grille{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.pg-voix{min-width:0}
/* La colonne de GPT se distingue par un filet et un fond, jamais par la seule
   couleur : les intitulés la nomment, et le dessin la seconde. */
.pg-voix--gpt{padding-left:14px;border-left:1px solid var(--cs-bord)}
.pg-voix-tete{display:flex;align-items:baseline;gap:10px;margin-bottom:8px;min-height:1.375rem}
.pg-voix-tete .pg-label{margin:0}
.pg-copier{margin-left:auto;padding:2px 9px;font:inherit;font-size:0.625rem;
  color:var(--cs-texte-second);background:none;border:1px solid var(--cs-bord);
  border-radius:999px;cursor:pointer;white-space:nowrap}
.pg-copier:hover{color:var(--cs-vert);border-color:var(--cs-vert)}

/* ── Messages ───────────────────────────────────────────────────────────── */
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
.pg-badge--gpt{color:var(--cs-systeme);border-color:var(--cs-systeme)}

.pg-texte{font-size:0.8125rem;line-height:1.62;color:var(--cs-texte);margin:0 0 10px}

/* ── Avant-après ────────────────────────────────────────────────────────── */
.pg-ex{margin:0 0 11px;padding:10px 12px;background:var(--cs-fond-doux);border-radius:4px}
.pg-ex-source{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--cs-texte-doux);margin:0 0 8px}
.pg-ex-rang{display:grid;grid-template-columns:7.5rem minmax(0,1fr);gap:10px;
  align-items:baseline;padding:5px 0;border-top:1px solid var(--cs-bord-clair)}
.pg-ex-tag{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--cs-texte-doux)}
.pg-ex-tag--apres{color:var(--cs-vert)}
.pg-ex-code{font-family:ui-monospace,Consolas,monospace;font-size:0.71875rem;line-height:1.6;
  color:var(--cs-texte-second);white-space:pre-wrap;overflow-wrap:break-word}
.pg-ex-rang--apres .pg-ex-apres{min-width:0}
.pg-ex-ligne{font-size:0.8125rem;line-height:1.6;color:var(--cs-texte-fort);margin:0 0 2px;
  overflow-wrap:break-word}
.pg-ex-ligne:last-child{margin-bottom:0}
/* La typographie que GPT demande, montrée plutôt que décrite. */
.pg-f-latin{font-style:italic}
.pg-f-sigle{color:var(--cs-texte-second);font-variant-caps:normal}
.pg-f-gloss{color:var(--cs-texte-gris)}
.pg-ex-reserve{font-size:0.78125rem;line-height:1.6;color:var(--cs-texte-second);
  margin:9px 0 0;padding-top:8px;border-top:1px solid var(--cs-bord-clair)}

.pg-mesure{font-size:0.78125rem;line-height:1.6;color:var(--cs-texte-second);margin:0 0 10px}
.pg-mesure-tag{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--cs-or);margin-right:6px}

.pg-conflit{margin:0 0 12px;padding:10px 12px;border-radius:4px;
  background:var(--cs-danger-fond);border:1px solid var(--cs-danger-bord)}
.pg-conflit-tete{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--cs-danger);margin:0 0 6px}
.pg-conflit p{font-size:0.78125rem;line-height:1.6;color:var(--cs-texte);margin:0 0 4px}
.pg-conflit p:last-child{margin-bottom:0}
/* Plusieurs heurts sous le même point : un filet les sépare, sans changer la forme
   du bloc, qui reste celle d'un heurt unique. */
.pg-heurt + .pg-heurt{margin-top:7px;padding-top:7px;border-top:1px solid var(--cs-danger-bord)}
.pg-conflit-tag{font-size:0.5625rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--cs-texte-doux);margin-right:6px}

.pg-arbitrage{border-top:1px solid var(--cs-bord-clair);padding-top:11px;margin-top:2px}
.pg-etats{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:11px}
.pg-etat{padding:4px 10px;font:inherit;font-size:0.71875rem;color:var(--cs-texte-second);
  background:var(--cs-fond-clair);border:1px solid var(--cs-bord);border-radius:999px;cursor:pointer}
.pg-etat:hover:not(:disabled){color:var(--cs-texte-fort);border-color:var(--cs-texte-doux)}
.pg-etat--actif{font-weight:600;background:var(--cs-fond)}
.pg-etat:disabled{cursor:default}

/* Seuil de la charte : deux colonnes de saisie ne tiennent pas en dessous. La
   colonne de GPT passe alors SOUS les instructions, et son filet passe en tête. */
@media (max-width:900px){
  .pg-voix-grille{grid-template-columns:1fr;gap:18px}
  .pg-voix--gpt{padding-left:0;padding-top:14px;border-left:none;border-top:1px solid var(--cs-bord)}
}
@media (max-width:640px){
  .pg{padding:20px 14px 48px}
  .pg-ex-rang{grid-template-columns:1fr;gap:3px}
  .pg-etat-envoi{margin-left:0;width:100%}
  .pg-instr-item{flex-wrap:wrap}
}
@media (prefers-reduced-motion:reduce){.pg *{transition:none!important}}
`
