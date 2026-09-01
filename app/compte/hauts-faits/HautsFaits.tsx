'use client'

// LES HAUTS FAITS — six séries, et toujours une à deux pas.
//
// ⛔ La page met en avant la série dont le degré suivant est le PLUS PROCHE, et non le
// degré supérieur de celle qu'on vient d'achever. C'est la réponse à ce qu'Anderson,
// Huttenlocher, Kleinberg et Leskovec ont mesuré sur plusieurs millions de comptes
// Stack Overflow : l'activité s'accélère à l'approche d'un badge, puis s'effondre après
// l'obtention. Un palier lointain ne corrige rien — le gradient est nul à distance
// jugée infinie ; c'est la série VOISINE qui reprend la main.
//
// ⛔ Aucun de ces degrés n'ouvre quoi que ce soit. Ils ne donnent ni droit, ni accès,
// ni fonction : Deci, Koestner et Ryan mesurent sur 128 expériences que la récompense
// tangible et attendue mine la motivation qu'elle prétend soutenir. Ce qu'un haut fait
// rend, c'est une NOTICE — un retour purement informationnel, de la même étoffe que la
// lecture, et donc hors de portée de cet effet.

import { useEffect, useState } from 'react'
import { Carte, EnTeteRubrique } from '@/app/compte/champsCompte'
import { libelleRestant, type SerieEtat } from '@/app/lib/hautsFaits'

type Reponse = {
  series: SerieEtat[]
  enVue: string | null
  nouveaux: string[]
  rarete: Record<string, number> | null
  corpus: { auteurs: number; siecles: number }
}

export default function HautsFaits() {
  const [etat, setEtat] = useState<Reponse | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    fetch('/api/compte/hauts-faits')
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Indisponible.')
        return res.json()
      })
      .then((r: Reponse) => { if (!annule) setEtat(r) })
      .catch((e: Error) => {
        console.error('Hauts faits : la liste n’a pas pu être établie.', e)
        if (!annule) setErreur('Les hauts faits n’ont pas pu être chargés. Réessayez.')
      })
    return () => { annule = true }
  }, [])

  const nouveaux = new Set(etat?.nouveaux ?? [])

  return (
    <>
      <EnTeteRubrique titre="Hauts faits">
        Six séries, qui se comptent sur ce que vous gardez et sur ce que vous publiez.
        Aucune n’ouvre quoi que ce soit : chacune vous apprend quelque chose au moment où elle tombe.
      </EnTeteRubrique>

      {erreur && <Carte><p style={{ fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', margin: 0 }}>{erreur}</p></Carte>}
      {!etat && !erreur && (
        <Carte><p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', margin: 0 }}>Chargement…</p></Carte>
      )}

      {etat?.series.map(serie => (
        <SerieCarte key={serie.serie} serie={serie} enVue={etat.enVue === serie.serie} nouveaux={nouveaux} rarete={etat.rarete} />
      ))}
    </>
  )
}

function SerieCarte({ serie, enVue, nouveaux, rarete }: {
  serie: SerieEtat
  enVue: boolean
  nouveaux: Set<string>
  rarete: Record<string, number> | null
}) {
  const acquis = serie.degres.filter(d => d.obtenu).length
  const reste = libelleRestant(serie)

  return (
    <Carte>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>
          {serie.nom}
        </h2>
        <span style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-faible)', letterSpacing: '0.04em' }}>
          {acquis} / {serie.degres.length}
        </span>
        {/* ⚠️ La mise en avant ne se fait QUE sur la série la plus proche. Signalées
            toutes, ces marques ne signaleraient plus rien. */}
        {enVue && reste && (
          <span style={{ fontSize: '0.65625rem', fontWeight: 600, color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.10)', padding: '2px 9px', borderRadius: '999px', letterSpacing: '0.02em' }}>
            {reste}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '14px' }}>
        {serie.degres.map(degre => {
          const nouveau = nouveaux.has(degre.code)
          const part = rarete?.[degre.code]
          return (
            <div key={degre.code}
              style={{
                display: 'flex', gap: '12px', padding: '11px 13px', borderRadius: '8px',
                background: degre.obtenu ? 'var(--cs-fond-clair)' : 'transparent',
                border: `1px solid ${degre.obtenu ? 'var(--cs-bord-clair)' : 'transparent'}`,
                borderLeft: `3px solid ${nouveau ? 'var(--cs-or)' : degre.obtenu ? 'var(--cs-vert)' : 'var(--cs-fond-doux)'}`,
              }}>
              <span aria-hidden="true" style={{
                width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem',
                background: 'var(--cs-fond)',
                border: `1.5px solid ${degre.obtenu ? 'var(--cs-vert-clair)' : 'var(--cs-bord)'}`,
                color: degre.obtenu ? 'var(--cs-vert)' : 'transparent',
              }}>
                {degre.obtenu ? '✓' : ''}
              </span>

              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.875rem', color: degre.obtenu ? 'var(--cs-encre)' : 'var(--cs-texte-doux)' }}>
                    {degre.nom}
                  </span>
                  <span style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)' }}>
                    {degre.seuilAtteindre}
                  </span>
                  {nouveau && (
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-or)' }}>
                      Nouveau
                    </span>
                  )}
                </p>

                {/* ⛔ La notice ne se lit QUE si le degré est acquis : c'est la
                    récompense elle-même, et la donner d'avance la dépenserait. Elle
                    enseigne, elle ne félicite pas. */}
                {degre.obtenu && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)', margin: '5px 0 0', lineHeight: 1.65 }}>
                    {degre.notice}
                  </p>
                )}

                {degre.obtenu && part != null && (
                  <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', margin: '4px 0 0', fontStyle: 'italic' }}>
                    Obtenu par {Math.round(part * 100)} lecteurs sur cent.
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Carte>
  )
}
