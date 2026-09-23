'use client'

// Les pièces communes aux rubriques de l'espace du lecteur.
//
// ⛔ Elles vivent ici et NON dans chaque rubrique. Les quatre rubriques portent les
// mêmes cartes, les mêmes champs et le même bouton d'enregistrement : écrits quatre
// fois, ils auraient dérivé au premier réglage. C'est la règle déjà posée pour les
// barres du site (charte § 36.2) : on prend le modèle, on ne le redessine pas.

import React, { useEffect, useState } from 'react'
import { ENCRE_TITRE, GRAISSE_TITRE, INTERLIGNE_TITRE_PAGE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import { SERIF, SANS } from '@/app/lib/polices'

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
      <h1 style={{ fontFamily: SERIF, fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, margin: '0 0 6px', lineHeight: INTERLIGNE_TITRE_PAGE }}>
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
        <p style={{ fontFamily: SANS, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: danger ? 'var(--cs-danger)' : 'var(--cs-texte-second)', margin: '0 0 18px' }}>
          {titre}
        </p>
      )}
      {children}
    </section>
  )
}

/** Un statut qui s'efface seul quand il annonce un succès.
 *
 *  ⚠️ « Enregistré » est une confirmation DISCRÈTE : elle dit que c'est fait, puis
 *  se retire. Un échec, lui, reste affiché jusqu'à la prochaine action. */
export function useStatutPassager(): [Statut, (s: Statut) => void] {
  const [statut, setStatut] = useState<Statut>(null)
  useEffect(() => {
    if (!statut?.ok) return
    const t = setTimeout(() => setStatut(null), 3500)
    return () => clearTimeout(t)
  }, [statut])
  return [statut, setStatut]
}

/** Le pied d'une section qui s'enregistre par son bouton.
 *
 *  ⛔ UN MODÈLE POUR TOUTE LA PAGE (audit d'ergonomie du 2026-09-21, constat 13) :
 *  ce que les autres voient de vous s'enregistre par le bouton de SA section ; vos
 *  préférences (thème, traduction, messagerie) s'appliquent aussitôt. Le bouton reste
 *  en place et ne s'allume que lorsqu'un champ diffère de ce qui est enregistré, avec
 *  la mention « Modifications non enregistrées ». */
export function PiedSection({ modifie, occupe, statut, onEnregistrer, onAnnuler }: {
  modifie: boolean
  occupe: boolean
  statut: Statut
  onEnregistrer: () => void
  onAnnuler: () => void
}) {
  return (
    <div className="esp-actions">
      <button type="button" onClick={onEnregistrer} disabled={occupe || !modifie}
        style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', fontSize: '0.78125rem', fontWeight: 500,
          background: modifie ? 'var(--cs-vert-aplat)' : 'var(--cs-desactive-fond)', color: modifie ? 'var(--cs-sur-aplat)' : 'var(--cs-desactive-encre)',
          cursor: occupe || !modifie ? 'default' : 'pointer' }}>
        {occupe ? 'Enregistrement…' : 'Enregistrer'}
      </button>
      {modifie && !occupe && (
        <button type="button" onClick={onAnnuler}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', textDecoration: 'underline' }}>
          Annuler les modifications
        </button>
      )}
      <span role="status" style={{ fontSize: '0.71875rem' }}>
        {statut && !statut.ok ? <span style={{ color: 'var(--cs-danger-fonce)' }}>{statut.msg}</span>
          : modifie ? <span style={{ color: 'var(--cs-attente)' }}>Modifications non enregistrées</span>
          : statut?.ok ? <span style={{ color: 'var(--cs-vert)' }}>✓ {statut.msg}</span>
          : null}
      </span>
    </div>
  )
}

/** L'interrupteur des réglages de visibilité. */
/** ⚠️ `detail` dit en une phrase ce que la bascule gouverne ; il se pose sous le libellé,
 *  et la bascule s'aligne alors sur la première ligne. */
export function Interrupteur({ actif, onChange, libelle, detail }: { actif: boolean; onChange: (v: boolean) => void; libelle: string; detail?: string }) {
  return (
    <label style={{ display: 'flex', alignItems: detail ? 'flex-start' : 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
      <button type="button" role="switch" aria-checked={actif} onClick={() => onChange(!actif)}
        style={{ width: '32px', height: '18px', borderRadius: '999px', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, background: actif ? 'var(--cs-vert-aplat)' : 'var(--cs-bord)', position: 'relative', transition: 'background 0.15s' }}>
        <span style={{ position: 'absolute', top: '3px', left: actif ? '15px' : '3px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--cs-surface)', transition: 'left 0.15s' }} />
      </button>
      <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: detail ? 1.44 : undefined }}>
        {libelle}
        {detail && <span style={{ display: 'block', fontSize: '0.6875rem', lineHeight: 1.4, color: 'var(--cs-texte-second)' }}>{detail}</span>}
      </span>
    </label>
  )
}
