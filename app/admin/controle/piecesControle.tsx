// Pièces communes des vues du centre de contrôle : écrans d'exception et mise en français.
//
// ⚠️ Aucun crochet ici : ces pièces servent des composants SERVEUR, et la panne se rend dans
// la vue qui l'a subie, jamais à la place du centre entier.
import type { ReactNode } from 'react'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import type { ErreurPostgrest } from './chargementsControle'

export const nb = (n: number | null | undefined) => (n ?? 0).toLocaleString('fr-FR')

export function dateFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function dateHeureFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

export function EcranReserve() {
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '36px 40px', width: '21.25rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, marginBottom: '6px' }}>Centre de contrôle</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-doux)', marginBottom: '20px' }}>Corpus Scriptura</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, marginBottom: '22px' }}>
          Cette page est réservée au compte administrateur. Connectez-vous avec ce compte pour y accéder.
        </p>
        <a href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '0.9375rem', fontWeight: 500, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', textDecoration: 'none' }}>Se connecter</a>
      </div>
    </main>
  )
}

/**
 * Une lecture qui a échoué, dite dans la vue qui l'attendait.
 *
 * On montre l'erreur RÉELLE renvoyée par PostgREST : un message générique rend la panne
 * indiagnosticable, et seul le code 57014 dit un dépassement de délai. `enLigne` la pose
 * dans une carte déjà ouverte, sans lui ajouter une carte de plus.
 */
export function PanneChargement({
  titre,
  explication,
  erreur,
  reessayer,
  enLigne = false,
}: {
  titre: string
  explication: ReactNode
  erreur: ErreurPostgrest | null
  reessayer?: string
  enLigne?: boolean
}) {
  return (
    <section className={enLigne ? 'cv-panne cv-panne--en-ligne' : 'cc-carte cv-panne'}>
      <h2 className="cv-panne-titre">{titre}</h2>
      <p className="cv-panne-texte">{explication}</p>
      <pre className="cv-panne-detail">
        {erreur
          ? [
              erreur.code ? `code    : ${erreur.code}` : null,
              erreur.message ? `message : ${erreur.message}` : null,
              erreur.details ? `détails : ${erreur.details}` : null,
              erreur.hint ? `piste   : ${erreur.hint}` : null,
            ].filter(Boolean).join('\n')
          : 'Aucune erreur remontée : la base a répondu, mais sans contenu lisible.'}
      </pre>
      {reessayer && <a href={reessayer} className="cv-lien">Réessayer</a>}
    </section>
  )
}
