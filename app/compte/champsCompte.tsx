'use client'

// Les pièces communes aux rubriques de l'espace du lecteur.
//
// ⛔ Elles vivent ici et NON dans chaque rubrique. Les quatre rubriques portent les
// mêmes cartes, les mêmes champs et le même bouton d'enregistrement : écrits quatre
// fois, ils auraient dérivé au premier réglage. C'est la règle déjà posée pour les
// barres du site (charte § 36.2) : on prend le modèle, on ne le redessine pas.

import React from 'react'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'

export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '0.84375rem',
  border: '1px solid var(--cs-bord)', borderRadius: '8px',
  background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)',
  outline: 'none', boxSizing: 'border-box',
}

export const labelStyle: React.CSSProperties = {
  fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-texte-gris)',
  letterSpacing: '0.06em', display: 'block', marginBottom: '5px',
}

export type Statut = { ok: boolean; msg: string } | null

/** Le titre d'une rubrique, avec la phrase qui dit ce qu'on y règle.
 *
 *  ⚠️ La phrase n'est pas un ornement : la colonne porte déjà une glose, mais elle
 *  s'efface sous 60rem (voir EspaceCompte.tsx). Sur un téléphone, c'est ici, et ici
 *  seulement, que le lecteur apprend ce que la rubrique contient. */
export function EnTeteRubrique({ titre, children }: { titre: string; children?: React.ReactNode }) {
  return (
    <header style={{ marginBottom: '20px' }}>
      <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, margin: '0 0 6px', letterSpacing: '-0.01em' }}>
        {titre}
      </h1>
      {children && (
        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0, lineHeight: 1.6, maxWidth: '34rem' }}>
          {children}
        </p>
      )}
    </header>
  )
}

/** Une carte de la rubrique. `titre` en petites capitales, comme partout ailleurs. */
export function Carte({ titre, danger, children }: { titre?: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '24px 26px', marginBottom: '16px' }}>
      {titre && (
        <p style={{ fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: danger ? 'var(--cs-danger)' : 'var(--cs-texte-doux)', margin: '0 0 18px' }}>
          {titre}
        </p>
      )}
      {children}
    </section>
  )
}

/** Le bouton d'enregistrement et son message, toujours côte à côte. */
export function LigneEnregistrer({ onClick, occupe, statut, libelle = 'Enregistrer' }: {
  onClick: () => void
  occupe: boolean
  statut: Statut
  libelle?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <button onClick={onClick} disabled={occupe}
        style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', fontSize: '0.8125rem', fontWeight: 500, cursor: occupe ? 'default' : 'pointer' }}>
        {occupe ? 'Enregistrement…' : libelle}
      </button>
      {statut && (
        <span role="status" style={{ fontSize: '0.78125rem', color: statut.ok ? 'var(--cs-vert)' : 'var(--cs-danger-fonce)' }}>
          {statut.ok ? '✓' : '✗'} {statut.msg}
        </span>
      )}
    </div>
  )
}

/** L'interrupteur des réglages de visibilité. */
export function Interrupteur({ actif, onChange, libelle }: { actif: boolean; onChange: (v: boolean) => void; libelle: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
      <button type="button" role="switch" aria-checked={actif} onClick={() => onChange(!actif)}
        style={{ width: '32px', height: '18px', borderRadius: '999px', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, background: actif ? 'var(--cs-vert-aplat)' : 'var(--cs-bord)', position: 'relative', transition: 'background 0.15s' }}>
        <span style={{ position: 'absolute', top: '3px', left: actif ? '15px' : '3px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--cs-surface)', transition: 'left 0.15s' }} />
      </button>
      <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte)' }}>{libelle}</span>
    </label>
  )
}
