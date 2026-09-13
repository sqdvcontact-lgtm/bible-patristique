'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import IconeChevron from '@/app/components/IconeChevron'
import OngletsPage from '@/app/components/OngletsPage'
import { cssServi } from '@/app/lib/cssServi'
import { HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'
import {
  appliquerDecisions,
  bilanRevue,
  calculerOuvragesFillionEnAttente,
  cleApresDecision,
  cleVoisine,
  decisionLocale,
  decisionsNonConfirmees,
  FILTRES_INITIAUX,
  filtrerIllustrations,
  libelleTraitement,
  modeComparaisonEffectif,
  NOMS_LIVRES,
  referenceIllustration,
  texteRecherchable,
  urlLectureFillion,
  type DecisionLocale,
  type DecisionRevue,
  type FiltresRevue,
  type IllustrationFillionEnRevue,
  type ModeComparaison,
  type RegimeIllustration,
  type StatutRevue,
} from './modele'

/**
 * LA REVUE DES ILLUSTRATIONS FILLION — une page de TRAVAIL, fixe dans la fenêtre.
 *
 * ⛔ La page ne défile jamais : la liste, la fiche et le contexte défilent chacun dans
 * leur colonne, et les boutons de décision restent au même endroit d'une image à
 * l'autre. On revoit plusieurs centaines d'images à la suite ; tout ce qui bouge sous
 * la main entre deux images se paie à chaque image.
 *
 * La logique vit dans `./modele.ts` (pure, testée), la lecture de la base dans
 * `./donnees.ts`, l'écriture dans la route `/api/admin/illustrations/fillion/decision`.
 */

const ORDRE_REGIMES: readonly RegimeIllustration[] = ['vignette', 'au-fil', 'hors-texte']
const NOMS_REGIMES: Record<RegimeIllustration, string> = {
  vignette: 'Vignette',
  'au-fil': 'Scène cadrée',
  'hors-texte': 'Planche hors-texte',
}
const NOMS_PLACEMENTS: Record<IllustrationFillionEnRevue['placement'], string> = {
  before: 'Avant son ancre',
  after: 'Après son ancre',
  inline: 'Dans le texte',
}
const MODES: readonly { cle: ModeComparaison; libelle: string }[] = [
  { cle: 'apres', libelle: 'Après' },
  { cle: 'avant', libelle: 'Avant' },
  { cle: 'cote-a-cote', libelle: 'Avant / après' },
]
const LONGUEUR_MAX_INSTRUCTION = 4000

/** La partie montrée quand la largeur ne permet pas les trois colonnes. */
type Panneau = 'liste' | 'fiche' | 'contexte'
type Retour = { type: 'succes' | 'erreur'; texte: string }

function poidsLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`
  return `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
}

function pourcentage(part: number): string {
  return `${Math.round(part * 100)} %`
}

function plageCanonique(illustration: IllustrationFillionEnRevue): string {
  const { canonDebut, canonFin } = illustration
  if (!canonDebut) return '—'
  return canonFin && canonFin !== canonDebut ? `${canonDebut} → ${canonFin}` : canonDebut
}

export default function RevueFillion({
  illustrations,
  apercuLocal = false,
}: {
  illustrations: IllustrationFillionEnRevue[]
  /** L'épreuve de développement emprunte la page de lecture sans session. */
  apercuLocal?: boolean
}) {
  const router = useRouter()
  const [filtres, setFiltres] = useState<FiltresRevue>(FILTRES_INITIAUX)
  const [cleChoisie, setCleChoisie] = useState<string | null>(null)
  const [mode, setMode] = useState<ModeComparaison>('apres')
  const [panneau, setPanneau] = useState<Panneau>('fiche')
  const [decisions, setDecisions] = useState<Record<string, DecisionLocale>>({})
  const [enCours, setEnCours] = useState<string | null>(null)
  const [retour, setRetour] = useState<Retour | null>(null)

  // Une décision se montre à l'instant, sans attendre le serveur ; quand la liste
  // rafraîchie arrive, on ne garde que ce qu'elle ne porte pas encore.
  const [recues, setRecues] = useState(illustrations)
  if (recues !== illustrations) {
    setRecues(illustrations)
    setDecisions((courantes) => decisionsNonConfirmees(courantes, illustrations))
  }

  const lues = useMemo(() => appliquerDecisions(illustrations, decisions), [illustrations, decisions])
  const textes = useMemo(
    () => new Map(illustrations.map((illustration) => [illustration.id, texteRecherchable(illustration)])),
    [illustrations],
  )
  const visibles = useMemo(() => filtrerIllustrations(lues, filtres, textes), [lues, filtres, textes])
  const bilan = useMemo(() => bilanRevue(lues), [lues])
  const livres = useMemo(() => [...new Set(illustrations.map((illustration) => illustration.livre))], [illustrations])
  const attente = useMemo(() => calculerOuvragesFillionEnAttente(illustrations), [illustrations])
  const imagesEnAttente = attente.reduce((somme, ouvrage) => somme + ouvrage.illustrations, 0)

  const choisie = visibles.find((illustration) => illustration.cle === cleChoisie) ?? visibles[0] ?? null
  const rang = choisie ? visibles.indexOf(choisie) : -1
  const precedente = choisie ? cleVoisine(visibles, choisie.cle, -1) : null
  const suivante = choisie ? cleVoisine(visibles, choisie.cle, 1) : null
  const urlLecture = choisie ? urlLectureFillion(choisie) : null
  const urlContexte = urlLecture
    ? urlLecture.replace('/?', apercuLocal ? '/auth/apercu-audit-fillion?' : '/admin/illustrations/fillion/contexte?')
    : null

  function changerFiltres(changement: Partial<FiltresRevue>) {
    setFiltres((courants) => ({ ...courants, ...changement }))
  }

  function choisir(cle: string | null) {
    if (!cle) return
    setCleChoisie(cle)
    setRetour(null)
    setPanneau((courant) => (courant === 'liste' ? 'fiche' : courant))
  }

  function allerA(sens: 1 | -1) {
    const cle = cleVoisine(visibles, choisie?.cle ?? null, sens)
    if (!cle) return
    setCleChoisie(cle)
    setRetour(null)
  }

  // ↑ et ↓ parcourent la liste, sauf dans un champ de saisie.
  const allerARef = useRef(allerA)
  useEffect(() => {
    allerARef.current = allerA
  })
  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key !== 'ArrowDown' && evenement.key !== 'ArrowUp') return
      if (evenement.defaultPrevented || evenement.altKey || evenement.ctrlKey || evenement.metaKey || evenement.shiftKey) return
      const cible = evenement.target
      if (cible instanceof HTMLElement && cible.closest('input, textarea, select, [contenteditable="true"]')) return
      evenement.preventDefault()
      allerARef.current(evenement.key === 'ArrowDown' ? 1 : -1)
    }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [])

  // L'image retenue reste visible dans la liste, où qu'on l'ait choisie.
  const idChoisie = choisie?.id ?? null
  useEffect(() => {
    if (idChoisie) document.getElementById(`revue-ligne-${idChoisie}`)?.scrollIntoView({ block: 'nearest' })
  }, [idChoisie])

  async function decider(illustration: IllustrationFillionEnRevue, decision: DecisionRevue, instruction: string | null): Promise<boolean> {
    if (enCours) return false
    setEnCours(illustration.cle)
    setRetour(null)
    const apres = cleApresDecision(visibles, illustration.cle)
    try {
      const reponse = await fetch('/api/admin/illustrations/fillion/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: illustration.id, decision, instruction: decision === 'review' ? instruction : null }),
      })
      // ⚠️ Une session non reconnue ne rend pas une erreur : le verrou du site REDIRIGE,
      //    et sa page revient en 200. On ne la prend pas pour un succès.
      const estJson = reponse.headers.get('content-type')?.includes('application/json') ?? false
      if (reponse.redirected || !estJson) {
        throw new Error('La session administrateur n’est pas reconnue : la décision n’a pas été enregistrée.')
      }
      const resultat = await reponse.json().catch(() => null) as { error?: string } | null
      if (!reponse.ok || !resultat) throw new Error(resultat?.error || 'La décision n’a pas pu être enregistrée.')

      setDecisions((courantes) => ({ ...courantes, [illustration.id]: decisionLocale(decision, instruction) }))
      setRetour({
        type: 'succes',
        texte: decision === 'validated'
          ? `${illustration.cle} est validée et verrouillée.`
          : `L’indication est enregistrée pour ${illustration.cle}.`,
      })
      // La revue passe à l'image suivante, si l'on est resté sur celle qu'on a décidée.
      if (apres) setCleChoisie((courante) => ((courante ?? visibles[0]?.cle) === illustration.cle ? apres : courante))
      router.refresh()
      return true
    } catch (erreur) {
      setRetour({ type: 'erreur', texte: erreur instanceof Error ? erreur.message : 'La décision n’a pas pu être enregistrée.' })
      return false
    } finally {
      setEnCours(null)
    }
  }

  return (
    <main className="revue-fillion">
      <style>{cssServi(FEUILLE_REVUE)}</style>

      <header className="revue-tete">
        <a href="/admin/illustrations" className="revue-retour">
          <IconeChevron dir="left" size={11} strokeWidth={1.6} />
          Illustrations
        </a>
        <h1>Revue des illustrations Fillion</h1>
        <dl className="revue-bilan" aria-label="Bilan de la revue">
          <div><dt>Publiées</dt><dd>{bilan.total}</dd></div>
          <div><dt>Livres</dt><dd>{bilan.livres}</dd></div>
          <div><dt>À valider</dt><dd>{bilan.aValider}</dd></div>
          <div><dt>Validées</dt><dd>{bilan.validees}</dd></div>
        </dl>
      </header>

      <div className="revue-espace" data-panneau={panneau}>
        <OngletsPage<Panneau>
          className="revue-panneaux revue-panneaux--moyen"
          nature="filtres"
          intitule="Partie affichée à côté de la liste"
          onglets={[{ cle: 'fiche', libelle: 'Fiche' }, { cle: 'contexte', libelle: 'Contexte' }]}
          actif={panneau === 'contexte' ? 'contexte' : 'fiche'}
          choisir={setPanneau}
        />
        <OngletsPage<Panneau>
          className="revue-panneaux revue-panneaux--etroit"
          nature="filtres"
          intitule="Partie affichée"
          onglets={[
            { cle: 'liste', libelle: `Liste · ${visibles.length}` },
            { cle: 'fiche', libelle: 'Fiche' },
            { cle: 'contexte', libelle: 'Contexte' },
          ]}
          actif={panneau}
          choisir={setPanneau}
        />

        <section className="revue-colonne revue-volet" aria-label="Illustrations">
          <div className="revue-filtres">
            <input
              type="search"
              className="revue-champ"
              value={filtres.recherche}
              onChange={(evenement) => changerFiltres({ recherche: evenement.target.value })}
              placeholder="Clé, légende, verset…"
              aria-label="Rechercher une illustration"
            />
            <div className="revue-filtres-choix">
              <select
                className="revue-champ"
                aria-label="État"
                value={filtres.statut}
                onChange={(evenement) => changerFiltres({ statut: evenement.target.value as StatutRevue })}
              >
                <option value="relecture">À valider ({bilan.aValider})</option>
                <option value="valide">Validées ({bilan.validees})</option>
                <option value="tous">Toutes les images ({bilan.total})</option>
              </select>
              <select className="revue-champ" aria-label="Livre" value={filtres.livre} onChange={(evenement) => changerFiltres({ livre: evenement.target.value })}>
                <option value="tous">Tous les livres</option>
                {livres.map((code) => <option key={code} value={code}>{NOMS_LIVRES[code] ?? code}</option>)}
              </select>
              <select
                className="revue-champ"
                aria-label="Composition"
                value={filtres.regime}
                onChange={(evenement) => changerFiltres({ regime: evenement.target.value as FiltresRevue['regime'] })}
              >
                <option value="tous">Tous les régimes</option>
                {ORDRE_REGIMES.map((code) => <option key={code} value={code}>{NOMS_REGIMES[code]}</option>)}
              </select>
            </div>
          </div>
          <p className="revue-compte" aria-live="polite">
            {visibles.length} image{visibles.length > 1 ? 's' : ''}
          </p>
          <div className="revue-liste">
            {visibles.length === 0 ? (
              <p className="revue-vide">Aucune illustration ne répond à ces filtres.</p>
            ) : visibles.map((illustration) => (
              <button
                key={illustration.id}
                id={`revue-ligne-${illustration.id}`}
                type="button"
                className="revue-ligne"
                aria-current={illustration.id === choisie?.id ? 'true' : undefined}
                onClick={() => choisir(illustration.cle)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={illustration.url} alt="" width={illustration.largeur} height={illustration.hauteur} loading="lazy" decoding="async" />
                <span className="revue-ligne-texte">
                  <strong>{referenceIllustration(illustration)}</strong>
                  <small>{illustration.legende || illustration.cle}</small>
                </span>
                {!illustration.demandeRelecture && (
                  <>
                    <span className="revue-ligne-etat" aria-hidden="true">✓</span>
                    <span className="cs-hors-ecran">, validée</span>
                  </>
                )}
              </button>
            ))}
          </div>
          {attente.length > 0 && (
            <details className="revue-file">
              <summary>À intégrer · {imagesEnAttente} images, {attente.length} livres</summary>
              <div className="revue-file-corps">
                <p>Ouvrages publiés dont les images restent à intégrer.</p>
                <ul>
                  {attente.map((ouvrage) => (
                    <li key={ouvrage.livre}>{NOMS_LIVRES[ouvrage.livre] ?? ouvrage.livre}<strong>{ouvrage.illustrations}</strong></li>
                  ))}
                </ul>
                <p className="revue-file-note">
                  Une image ne quitte cette file qu’après contrôle des quatre bords, redressement, séparation de la légende,
                  classement du régime, preuve de placement et vérification du fichier public.
                </p>
              </div>
            </details>
          )}
        </section>

        <article className="revue-colonne revue-fiche" aria-label="Fiche de l’illustration">
          {choisie ? (
            <FicheIllustration
              key={choisie.id}
              illustration={choisie}
              position={rang + 1}
              total={visibles.length}
              precedente={precedente ? () => choisir(precedente) : null}
              suivante={suivante ? () => choisir(suivante) : null}
              mode={mode}
              choisirMode={setMode}
              enregistrement={enCours === choisie.cle}
              occupe={enCours !== null}
              retour={retour}
              decider={decider}
              urlPublique={urlLecture}
            />
          ) : (
            <p className="revue-vide">Aucune illustration à montrer.</p>
          )}
        </article>

        <section className="revue-colonne revue-contexte" aria-label="Contexte réel">
          <header>
            <div>
              <p className="revue-sur-titre">Contexte réel</p>
              <p className="revue-contexte-aide">La page telle que le lecteur la voit. C’est le site lui-même, non une maquette.</p>
            </div>
            {urlContexte && <a href={urlContexte} target="_blank" rel="noreferrer" className="cs-bouton-lien">Pleine page ↗</a>}
          </header>
          {choisie && urlContexte ? (
            <CadreContexte adresse={urlContexte} titre={`Contexte de ${choisie.cle}`} />
          ) : (
            <p className="revue-vide">
              {choisie ? 'Cette matière liminaire ne possède pas d’ancre de chapitre directe.' : 'Aucun contexte à montrer.'}
            </p>
          )}
        </section>
      </div>
    </main>
  )
}

function FicheIllustration({
  illustration,
  position,
  total,
  precedente,
  suivante,
  mode,
  choisirMode,
  enregistrement,
  occupe,
  retour,
  decider,
  urlPublique,
}: {
  illustration: IllustrationFillionEnRevue
  position: number
  total: number
  precedente: (() => void) | null
  suivante: (() => void) | null
  mode: ModeComparaison
  choisirMode: (mode: ModeComparaison) => void
  /** Cette image est en cours d'enregistrement. */
  enregistrement: boolean
  /** Une décision est en cours, sur cette image ou une autre. */
  occupe: boolean
  retour: Retour | null
  decider: (illustration: IllustrationFillionEnRevue, decision: DecisionRevue, instruction: string | null) => Promise<boolean>
  urlPublique: string | null
}) {
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [instruction, setInstruction] = useState('')
  const temoin = illustration.temoin
  const modeActif = modeComparaisonEffectif(mode, temoin !== null)
  const idInstruction = `instruction-${illustration.id}`

  function ouvrirFormulaire() {
    setInstruction(illustration.instructionRelecture ?? '')
    setFormulaireOuvert(true)
  }

  async function enregistrerRevoir() {
    const texte = instruction.trim()
    if (!texte || occupe) return
    if (await decider(illustration, 'review', texte)) setFormulaireOuvert(false)
  }

  return (
    <>
      <header className="revue-fiche-tete">
        <div className="revue-fiche-titre">
          <p className="revue-sur-titre">{NOMS_REGIMES[illustration.regime]} · {NOMS_LIVRES[illustration.livre] ?? illustration.livre}</p>
          <h2>{referenceIllustration(illustration)}</h2>
          <p className="revue-cle">{illustration.cle}</p>
        </div>
        <div className="revue-fiche-reperes">
          <span className={illustration.demandeRelecture ? 'revue-etat revue-etat--attente' : 'revue-etat revue-etat--validee'}>
            {illustration.demandeRelecture ? 'À valider' : 'Validée'}
          </span>
          <div className="revue-pas">
            <button type="button" onClick={precedente ?? undefined} disabled={!precedente} aria-label="Illustration précédente" title="Précédente (↑)">
              <IconeChevron dir="up" size={12} strokeWidth={1.6} />
            </button>
            <span>{position} / {total}</span>
            <button type="button" onClick={suivante ?? undefined} disabled={!suivante} aria-label="Illustration suivante" title="Suivante (↓)">
              <IconeChevron dir="down" size={12} strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </header>

      <div className="revue-fiche-corps">
        <div className="revue-modes" role="group" aria-label="Version affichée">
          {MODES.map((option) => (
            <button
              key={option.cle}
              type="button"
              aria-pressed={modeActif === option.cle}
              disabled={option.cle !== 'apres' && temoin === null}
              onClick={() => choisirMode(option.cle)}
            >
              {option.libelle}
            </button>
          ))}
        </div>

        <div className={modeActif === 'cote-a-cote' ? 'revue-scene revue-scene--jumelle' : 'revue-scene'}>
          {modeActif === 'cote-a-cote' && temoin ? (
            <>
              <figure>
                <figcaption>Avant · original</figcaption>
                <div className="revue-cadre-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={temoin.url} alt={`Original : ${illustration.description}`} width={temoin.largeur ?? undefined} height={temoin.hauteur ?? undefined} decoding="async" />
                </div>
              </figure>
              <figure>
                <figcaption>Après · dernière proposition</figcaption>
                <div className="revue-cadre-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={illustration.url} alt={illustration.description} width={illustration.largeur} height={illustration.hauteur} decoding="async" />
                </div>
              </figure>
            </>
          ) : modeActif === 'avant' && temoin ? (
            <div className="revue-cadre-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={temoin.url} alt={`Original : ${illustration.description}`} width={temoin.largeur ?? undefined} height={temoin.hauteur ?? undefined} decoding="async" />
            </div>
          ) : (
            <div className="revue-cadre-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={illustration.url} alt={illustration.description} width={illustration.largeur} height={illustration.hauteur} decoding="async" />
            </div>
          )}
        </div>

        {illustration.legende && <p className="revue-legende">{illustration.legende}</p>}

        {illustration.noteRevision && (
          <div className="revue-encart">
            <strong>{libelleTraitement(illustration.traitementRevision)}</strong>
            <p>{illustration.noteRevision}</p>
          </div>
        )}

        {illustration.instructionRelecture && !formulaireOuvert && (
          <div className="revue-encart revue-encart--indication">
            <strong>Indication à lire avant toute modification</strong>
            <p>{illustration.instructionRelecture}</p>
          </div>
        )}

        <dl className="revue-metadonnees">
          <div><dt>Ancre</dt><dd>{plageCanonique(illustration)}</dd></div>
          <div><dt>Pose</dt><dd>{NOMS_PLACEMENTS[illustration.placement]} · {pourcentage(illustration.partColonne)} de la colonne</dd></div>
          <div>
            <dt>Source</dt>
            <dd>{illustration.pageSource ? `vue ${illustration.pageSource}` : '—'}{illustration.pageImprimee ? ` · page ${illustration.pageImprimee}` : ''}</dd>
          </div>
          <div><dt>Fichier</dt><dd>{illustration.largeur} × {illustration.hauteur} px · {poidsLisible(illustration.poids)}</dd></div>
          {temoin && (
            <div><dt>Original</dt><dd>{temoin.largeur && temoin.hauteur ? `${temoin.largeur} × ${temoin.hauteur} px` : 'Dimensions inconnues'}</dd></div>
          )}
          <div><dt>Bloc éditorial</dt><dd>{illustration.blocEditorialTitre ?? illustration.blocEditorialCle ?? 'Ancre canonique directe'}</dd></div>
          <div><dt>Texte alternatif</dt><dd>{illustration.description || '—'}</dd></div>
        </dl>

        <p className="revue-liens">
          <a href={illustration.url} target="_blank" rel="noreferrer" className="cs-bouton-lien">Fichier seul ↗</a>
          {temoin && <a href={temoin.url} target="_blank" rel="noreferrer" className="cs-bouton-lien">Original ↗</a>}
          {urlPublique && <a href={urlPublique} target="_blank" rel="noreferrer" className="cs-bouton-lien">Page publique ↗</a>}
        </p>
      </div>

      <footer className="revue-decision">
        {formulaireOuvert ? (
          <form onSubmit={(evenement) => { evenement.preventDefault(); void enregistrerRevoir() }}>
            <label htmlFor={idInstruction}>Indication pour la prochaine reprise</label>
            <textarea
              id={idInstruction}
              value={instruction}
              onChange={(evenement) => setInstruction(evenement.target.value)}
              onKeyDown={(evenement) => {
                if (evenement.key === 'Escape') {
                  evenement.preventDefault()
                  setFormulaireOuvert(false)
                } else if (evenement.key === 'Enter' && (evenement.ctrlKey || evenement.metaKey)) {
                  evenement.preventDefault()
                  void enregistrerRevoir()
                }
              }}
              maxLength={LONGUEUR_MAX_INSTRUCTION}
              rows={4}
              autoFocus
              placeholder="Ce qu’il faut corriger, préserver ou reconstruire…"
            />
            <div className="revue-decision-pied">
              <small>{instruction.length} / {LONGUEUR_MAX_INSTRUCTION} · Ctrl + Entrée</small>
              <button type="button" disabled={enregistrement} onClick={() => setFormulaireOuvert(false)}>Annuler</button>
              <button type="submit" className="revue-bouton-principal" disabled={occupe || !instruction.trim()}>
                {enregistrement ? 'Enregistrement…' : 'Enregistrer « À revoir »'}
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="revue-decision-aide">Dans les deux cas, l’image reste visible dans la Bible.</p>
            <div className="revue-decision-boutons">
              <button
                type="button"
                className="revue-bouton-valider"
                disabled={occupe || illustration.verrouilleeParAuteur}
                onClick={() => void decider(illustration, 'validated', null)}
              >
                {illustration.verrouilleeParAuteur ? '✓ Validée' : enregistrement ? 'Enregistrement…' : '✓ Valider'}
              </button>
              <button type="button" className="revue-bouton-revoir" disabled={occupe} onClick={ouvrirFormulaire}>
                {illustration.instructionRelecture ? 'Modifier l’indication' : 'À revoir'}
              </button>
            </div>
            {illustration.verrouilleeParAuteur && (
              <p className="revue-verrou">Cette version est mise de côté et exclue des prochaines retouches.</p>
            )}
          </>
        )}
        <div role="status" aria-live="polite">
          {retour && <p className={`revue-retour-decision revue-retour-decision--${retour.type}`}>{retour.texte}</p>}
        </div>
      </footer>
    </>
  )
}

/**
 * Le cadre du contexte réel.
 *
 * ⚠️ Deux images voisines vivent souvent dans le MÊME chapitre (107 chapitres sur 228
 * en portent plusieurs, 2026-09-13) : on ne recharge pas la page de lecture pour
 * elles, on vise la figure dans le cadre déjà chargé. Un autre chapitre, lui, remonte
 * le cadre sur sa propre adresse.
 */
function CadreContexte({ adresse, titre }: { adresse: string; titre: string }) {
  const cadre = useRef<HTMLIFrameElement>(null)
  const page = adresse.split('#')[0]
  const [source, setSource] = useState({ page, adresse })
  if (source.page !== page) setSource({ page, adresse })

  const derniere = useRef(adresse)
  useEffect(() => {
    const precedente = derniere.current
    derniere.current = adresse
    if (precedente === adresse || precedente.split('#')[0] !== page) return
    viserDansLeCadre(cadre.current, adresse)
  }, [adresse, page])

  return <iframe key={source.page} ref={cadre} src={source.adresse} title={titre} loading="lazy" />
}

/** Vise une figure dans le cadre déjà chargé ; à défaut, change l'ancre de sa page
 *  sans ajouter d'entrée à l'historique du navigateur. */
function viserDansLeCadre(cadre: HTMLIFrameElement | null, adresse: string) {
  if (!cadre) return
  try {
    const ancre = decodeURIComponent(adresse.split('#')[1] ?? '')
    const cible = ancre ? cadre.contentDocument?.getElementById(ancre) : null
    if (cible) cible.scrollIntoView({ block: 'center' })
    else cadre.contentWindow?.location.replace(adresse)
  } catch {
    // Un cadre d'une autre origine ne se lit pas : il garde sa page, sans dommage.
  }
}

/*
 * ⚠️ « overflow: clip » et non « hidden » sur tout ce qui entoure le cadre : un
 * « scrollIntoView » joué DANS le cadre remonte aux conteneurs de la page qui le porte,
 * et un conteneur « hidden » se laisse faire défiler par script. « clip » n'est pas un
 * conteneur de défilement : la page reste fixe. La valeur « hidden » qui précède est
 * le repli des navigateurs qui ignorent « clip ».
 */
const FEUILLE_REVUE = `
  .revue-fillion {
    height: ${HAUTEUR_SOUS_NAVBAR};
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.625rem;
    padding: 0.625rem clamp(0.625rem, 1.2vw, 1.25rem) 0.75rem;
    overflow: hidden;
    overflow: clip;
    background: var(--cs-fond);
    color: var(--cs-texte);
    font-family: var(--font-source-sans), Arial, sans-serif;
  }

  .revue-tete { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.25rem 1.25rem; min-width: 0; }
  .revue-retour { display: inline-flex; align-items: center; gap: 0.25rem; color: var(--cs-vert); font-size: 0.75rem; text-decoration: none; }
  .revue-retour:hover { text-decoration: underline; text-underline-offset: 2px; }
  .revue-tete h1 { margin: 0; font-family: var(--font-source-serif), Georgia, serif; font-size: 1.25rem; font-weight: 450; line-height: 1.2; color: var(--cs-encre-fonce); }
  .revue-bilan { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; margin: 0 0 0 auto; }
  .revue-bilan div { display: flex; align-items: baseline; gap: 0.3125rem; }
  .revue-bilan dt { font-size: 0.6875rem; color: var(--cs-texte-second); }
  .revue-bilan dd { margin: 0; font-family: var(--font-source-serif), Georgia, serif; font-size: 1rem; font-variant-numeric: tabular-nums; color: var(--cs-encre-fonce); }

  .revue-espace {
    display: grid;
    grid-template-columns: clamp(15rem, 17vw, 19rem) clamp(24rem, 30vw, 34rem) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    gap: 0.625rem;
    min-height: 0;
    overflow: hidden;
    overflow: clip;
  }
  .revue-panneaux { display: none; }
  .revue-colonne {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--cs-surface);
    border: 1px solid var(--cs-bord);
    border-radius: 12px;
    overflow: hidden;
    overflow: clip;
  }

  .revue-filtres { display: grid; gap: 0.375rem; padding: 0.625rem; border-bottom: 1px solid var(--cs-bord); }
  /* Les trois menus l'un sous l'autre dans une colonne étroite, en rang dès que la place le
     permet : deux menus côte à côte dans la colonne de 242 px coupaient « Tous les livres ». */
  .revue-filtres-choix { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(10rem, 100%), 1fr)); gap: 0.375rem; }
  .revue-champ { width: 100%; min-width: 0; height: 2rem; padding: 0 0.5rem; border: 1px solid var(--cs-bord); border-radius: 8px; background: var(--cs-fond-clair); color: var(--cs-texte); font: inherit; font-size: 0.8125rem; }
  .revue-compte { margin: 0; padding: 0.375rem 0.75rem; border-bottom: 1px solid var(--cs-bord-clair); font-size: 0.6875rem; color: var(--cs-texte-second); }
  .revue-liste { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0.25rem; }
  .revue-ligne { display: grid; grid-template-columns: 2.75rem minmax(0, 1fr) auto; align-items: center; gap: 0.5rem; width: 100%; padding: 0.3125rem 0.375rem; border: 0; border-radius: 8px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .revue-ligne:hover { background: var(--cs-fond); }
  .revue-ligne[aria-current="true"] { background: color-mix(in srgb, var(--cs-vert) 10%, var(--cs-surface)); box-shadow: inset 3px 0 0 var(--cs-vert); }
  .revue-ligne img { display: block; width: 2.75rem; height: 3rem; object-fit: contain; background: var(--cs-fond); border-radius: 4px; }
  .revue-ligne-texte { display: grid; gap: 0.0625rem; min-width: 0; }
  .revue-ligne-texte strong, .revue-ligne-texte small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .revue-ligne-texte strong { font-size: 0.75rem; font-weight: 600; color: var(--cs-encre-fonce); }
  .revue-ligne-texte small { font-size: 0.6875rem; color: var(--cs-texte-second); }
  .revue-ligne-etat { font-size: 0.75rem; color: var(--cs-vert); }

  .revue-file { flex: 0 0 auto; border-top: 1px solid var(--cs-bord); }
  .revue-file summary { padding: 0.5rem 0.75rem; font-size: 0.6875rem; color: var(--cs-texte-second); cursor: pointer; }
  .revue-file[open] summary { border-bottom: 1px solid var(--cs-bord-clair); }
  .revue-file-corps { max-height: 14rem; overflow-y: auto; padding: 0.5rem 0.75rem 0.75rem; }
  .revue-file-corps p { margin: 0 0 0.5rem; font-size: 0.75rem; line-height: 1.45; color: var(--cs-texte-second); }
  .revue-file-corps ul { display: flex; flex-wrap: wrap; gap: 0.25rem; margin: 0 0 0.5rem; padding: 0; list-style: none; }
  .revue-file-corps li { display: inline-flex; gap: 0.3125rem; padding: 0.125rem 0.5rem; border: 1px solid var(--cs-bord); border-radius: 999px; background: var(--cs-fond-clair); font-size: 0.6875rem; }
  .revue-file-corps li strong { color: var(--cs-vert); }
  .revue-file-corps .revue-file-note { font-family: var(--font-source-serif), Georgia, serif; font-style: italic; }

  .revue-fiche-tete { flex: 0 0 auto; display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; padding: 0.625rem 0.75rem; border-bottom: 1px solid var(--cs-bord); }
  .revue-fiche-titre { min-width: 0; }
  .revue-sur-titre { margin: 0 0 0.125rem; font-size: 0.65625rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cs-texte-second); }
  .revue-fiche-titre h2 { margin: 0; font-family: var(--font-source-serif), Georgia, serif; font-size: 1.125rem; font-weight: 500; line-height: 1.25; color: var(--cs-encre-fonce); }
  .revue-cle { margin: 0.125rem 0 0; font-size: 0.6875rem; color: var(--cs-texte-second); overflow-wrap: anywhere; user-select: all; }
  .revue-fiche-reperes { display: grid; justify-items: end; gap: 0.375rem; flex: 0 0 auto; }
  .revue-etat { padding: 0.1875rem 0.375rem; border-radius: 4px; font-size: 0.625rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; }
  .revue-etat--attente { background: color-mix(in srgb, var(--cs-attente) 11%, var(--cs-surface)); color: var(--cs-attente); }
  .revue-etat--validee { background: color-mix(in srgb, var(--cs-vert) 12%, var(--cs-surface)); color: var(--cs-vert); }
  .revue-pas { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.6875rem; font-variant-numeric: tabular-nums; color: var(--cs-texte-second); }
  .revue-pas button { display: inline-grid; place-items: center; width: 1.75rem; height: 1.75rem; padding: 0; border: 1px solid var(--cs-bord); border-radius: 8px; background: var(--cs-surface); color: var(--cs-texte); cursor: pointer; }
  .revue-pas button:hover:not(:disabled) { border-color: var(--cs-vert); color: var(--cs-vert); }
  .revue-pas button:disabled { opacity: 0.4; cursor: default; }

  .revue-fiche-corps { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0.625rem 0.75rem 0.75rem; }
  .revue-modes { display: flex; gap: 0.1875rem; margin: 0 0 0.5rem; padding: 0.1875rem; border: 1px solid var(--cs-bord); border-radius: 8px; background: var(--cs-fond); }
  .revue-modes button { flex: 1 1 0; min-height: 1.75rem; border: 0; border-radius: 4px; background: transparent; color: var(--cs-texte-second); font: inherit; font-size: 0.75rem; cursor: pointer; }
  .revue-modes button[aria-pressed="true"] { background: var(--cs-surface); color: var(--cs-encre-fonce); font-weight: 600; box-shadow: var(--cs-ombre-posee); }
  .revue-modes button:disabled { opacity: 0.4; cursor: not-allowed; }
  .revue-scene { display: grid; grid-template-rows: minmax(0, 1fr); gap: 0.5rem; height: clamp(15rem, 46dvh, 38rem); }
  .revue-scene--jumelle { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .revue-scene figure { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 0.25rem; min-width: 0; min-height: 0; margin: 0; }
  .revue-scene figcaption { font-size: 0.625rem; font-weight: 600; letter-spacing: 0.06em; text-align: center; text-transform: uppercase; color: var(--cs-texte-second); }
  .revue-cadre-image { display: flex; align-items: center; justify-content: center; min-width: 0; min-height: 0; padding: 0.5rem; border: 1px solid var(--cs-bord); border-radius: 8px; background: var(--cs-fond); overflow: hidden; }
  .revue-cadre-image img { display: block; max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; }
  .revue-legende { margin: 0.5rem 0; font-family: var(--font-source-serif), Georgia, serif; font-size: 0.8125rem; font-style: italic; line-height: 1.4; text-align: center; }
  .revue-encart { margin: 0.5rem 0; padding: 0.5rem 0.625rem; border-left: 3px solid var(--cs-vert); background: color-mix(in srgb, var(--cs-vert) 6%, var(--cs-surface)); font-size: 0.75rem; line-height: 1.45; color: var(--cs-texte-second); }
  .revue-encart strong { display: block; margin-bottom: 0.125rem; font-size: 0.65625rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-encre-fonce); }
  .revue-encart p { margin: 0; white-space: pre-wrap; }
  .revue-encart--indication { border-left-color: var(--cs-danger); background: var(--cs-danger-fond); }
  .revue-encart--indication strong { color: var(--cs-danger-fonce); }
  .revue-metadonnees { margin: 0.5rem 0 0; }
  .revue-metadonnees div { display: grid; grid-template-columns: 6.5rem minmax(0, 1fr); gap: 0.625rem; padding: 0.3125rem 0; border-top: 1px solid var(--cs-bord-clair); }
  .revue-metadonnees dt { font-size: 0.6875rem; color: var(--cs-texte-second); }
  .revue-metadonnees dd { margin: 0; font-size: 0.75rem; line-height: 1.4; overflow-wrap: anywhere; }
  .revue-liens { display: flex; flex-wrap: wrap; gap: 0.375rem 0.875rem; margin: 0.625rem 0 0; }

  .revue-decision { flex: 0 0 auto; display: grid; gap: 0.375rem; padding: 0.5rem 0.75rem 0.625rem; border-top: 1px solid var(--cs-bord); background: var(--cs-fond-clair); }
  .revue-decision-aide { margin: 0; font-size: 0.6875rem; color: var(--cs-texte-second); }
  .revue-decision-boutons { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.5rem; }
  .revue-decision button { min-height: 2.25rem; padding: 0 0.75rem; border: 1px solid var(--cs-bord); border-radius: 8px; background: var(--cs-surface); color: var(--cs-texte); font: inherit; font-size: 0.8125rem; font-weight: 600; cursor: pointer; }
  .revue-decision button:disabled { opacity: 0.5; cursor: not-allowed; }
  .revue-decision .revue-bouton-valider { border-color: color-mix(in srgb, var(--cs-vert) 55%, var(--cs-bord)); color: var(--cs-vert); }
  .revue-decision .revue-bouton-valider:hover:not(:disabled) { background: color-mix(in srgb, var(--cs-vert) 8%, var(--cs-surface)); }
  .revue-decision .revue-bouton-revoir { border-color: color-mix(in srgb, var(--cs-danger) 45%, var(--cs-bord)); color: var(--cs-danger-fonce); }
  .revue-decision .revue-bouton-revoir:hover:not(:disabled) { background: var(--cs-danger-fond); }
  .revue-decision form { display: grid; gap: 0.3125rem; }
  .revue-decision label { font-size: 0.6875rem; font-weight: 600; color: var(--cs-encre-fonce); }
  .revue-decision textarea { width: 100%; min-height: 4.5rem; max-height: 12rem; padding: 0.5rem; border: 1px solid var(--cs-bord); border-radius: 8px; background: var(--cs-surface); color: var(--cs-texte); font: inherit; font-size: 0.8125rem; line-height: 1.45; resize: vertical; }
  .revue-decision-pied { display: flex; align-items: center; gap: 0.5rem; }
  .revue-decision-pied small { margin-right: auto; font-size: 0.625rem; color: var(--cs-texte-second); }
  .revue-decision-pied button { min-height: 2rem; }
  .revue-decision .revue-bouton-principal { border-color: var(--cs-vert-aplat); background: var(--cs-vert-aplat); color: var(--cs-sur-aplat); }
  .revue-verrou { margin: 0; font-size: 0.6875rem; color: var(--cs-vert); }
  .revue-retour-decision { margin: 0; padding: 0.3125rem 0.5rem; border-radius: 4px; font-size: 0.75rem; }
  .revue-retour-decision--succes { background: color-mix(in srgb, var(--cs-vert) 10%, var(--cs-surface)); color: var(--cs-vert); }
  .revue-retour-decision--erreur { background: var(--cs-danger-fond); color: var(--cs-danger-fonce); }

  .revue-contexte > header { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.5rem 0.75rem; border-bottom: 1px solid var(--cs-bord); }
  .revue-contexte > header .revue-sur-titre { margin: 0; }
  .revue-contexte-aide { margin: 0.0625rem 0 0; font-size: 0.6875rem; color: var(--cs-texte-second); }
  .revue-contexte iframe { flex: 1 1 auto; display: block; width: 100%; min-height: 0; border: 0; background: var(--cs-fond); }
  .revue-vide { margin: auto; padding: 1.5rem; font-size: 0.8125rem; font-style: italic; text-align: center; color: var(--cs-texte-second); }

  /* Seuil propre à cette page, hors du tableau des seuils du site : trois colonnes
     demandent la liste, une fiche lisible et une page de lecture qui garde sa colonne
     de texte. En deçà, la fiche et le contexte se partagent la seconde colonne. */
  @media (max-width: 1200px) {
    .revue-espace { grid-template-columns: clamp(14rem, 30vw, 18rem) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); }
    .revue-volet { grid-column: 1; grid-row: 1 / span 2; }
    .revue-panneaux--moyen { display: flex; grid-column: 2; grid-row: 1; width: 100%; margin: 0; }
    .revue-fiche, .revue-contexte { grid-column: 2; grid-row: 2; }
    .revue-espace[data-panneau="contexte"] .revue-fiche { display: none; }
    .revue-espace:not([data-panneau="contexte"]) .revue-contexte { display: none; }
  }

  /* Le seuil du site pour un écran étroit : une seule partie à la fois. */
  @media (max-width: 900px) {
    .revue-bilan { margin-left: 0; }
    .revue-espace { grid-template-columns: minmax(0, 1fr); }
    .revue-panneaux--moyen { display: none; }
    .revue-panneaux--etroit { display: flex; grid-column: 1; grid-row: 1; width: 100%; margin: 0; }
    .revue-volet, .revue-fiche, .revue-contexte { grid-column: 1; grid-row: 2; }
    .revue-espace:not([data-panneau="liste"]) .revue-volet { display: none; }
    .revue-espace[data-panneau="liste"] .revue-fiche { display: none; }
    .revue-scene { height: clamp(12rem, 40dvh, 26rem); }
  }
`
