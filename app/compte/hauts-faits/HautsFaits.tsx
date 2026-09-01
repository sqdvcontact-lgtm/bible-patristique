'use client'

// LE TABLEAU DES HAUTS FAITS — des cases à collectionner.
//
// Décision de l'auteur, 1er septembre 2026 : « un grand tableau de cases à
// collectionner, dans différents tons harmonieux ; deux états, validé et non validé ;
// les non validées sobres, avec un indice de progression ». La carte « Ce que j'ai
// retenu » est retirée avec cette refonte : elle montrait un ÉTAT, elle ne donnait
// rien à remplir.
//
// ⛔ ON N'INVENTE AUCUNE TEINTE. Les tons sont les trois familles de corpus déjà
// chartées (`--cs-ecriture`, `--cs-peres`, `--cs-communaute`), que la recherche
// emploie déjà et qui sont éprouvées dans les deux thèmes. La variété se prend
// ensuite sur le DEGRÉ, dont l'aplat se fonce à mesure qu'on monte : trois familles
// et quatre degrés font douze nuances, toutes dérivées de jetons du site.
//
// ⛔ LA CASE EN ATTENTE EST TERNE, MAIS ELLE PARLE. Pas de couleur, pas de relief,
// pas de points annoncés — mais son compte, « 31 / 50 », et sa barre. Une case morne
// et muette ne tracte rien ; c'est l'écart lisible qui donne envie de le combler
// (Loewenstein, charte § 40).

import { useEffect, useState } from 'react'
import { Carte, EnTeteRubrique } from '@/app/compte/champsCompte'
import {
  casesDuTableau, libelleProgression, libelleRestant, palierAtteint,
  type DegreEtat, type Score, type SerieEtat,
} from '@/app/lib/hautsFaits'

type Reponse = {
  series: SerieEtat[]
  enVue: string | null
  nouveaux: string[]
  rarete: Record<string, number> | null
  score: Score
  corpus: { auteurs: number; siecles: number }
}

/** L'encre d'une famille. ⚠️ Le jeton, jamais la valeur : il se retourne au Cuir. */
function encreDe(famille: string): string {
  return `var(--cs-${famille === 'peres' || famille === 'communaute' ? famille : 'ecriture'})`
}

/** L'aplat d'une case acquise : la teinte de sa famille, d'autant plus présente que
 *  le degré est haut. `color-mix` la pose sur la surface, donc elle suit le thème. */
function aplatDe(famille: string, degre: number): string {
  const part = [8, 13, 19, 26][Math.min(Math.max(degre, 1), 4) - 1]
  return `color-mix(in srgb, ${encreDe(famille)} ${part}%, var(--cs-surface))`
}

export default function HautsFaits() {
  const [etat, setEtat] = useState<Reponse | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [ouverte, setOuverte] = useState<string | null>(null)

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
        Des cases à remplir, six séries qui se comptent sur ce que vous gardez et sur ce que vous publiez.
        Chacune vous apprend quelque chose au moment où elle tombe.
      </EnTeteRubrique>

      <style>{`
        .hf-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr)); gap: 8px; }
        /* ⚠️ Sous 30rem, deux colonnes de 150px ne tiennent plus dans la colonne de
           lecture d'un téléphone : les cases passent au fer, une par rang. */
        @media (max-width: 30rem) { .hf-grille { grid-template-columns: 1fr; } }
        .hf-case { text-align: left; width: 100%; cursor: pointer; font-family: inherit; }
      `}</style>

      {erreur && <Carte><p style={{ fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', margin: 0 }}>{erreur}</p></Carte>}
      {!etat && !erreur && (
        <Carte><p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', margin: 0 }}>Chargement…</p></Carte>
      )}

      {etat && (
        <>
          <Carte><Tableau score={etat.score} series={etat.series} enVue={etat.enVue} /></Carte>

          {etat.series.map(serie => (
            <Carte key={serie.serie}>
              <EnTeteSerie serie={serie} enVue={etat.enVue === serie.serie} />
              <div className="hf-grille">
                {serie.degres.map(c => (
                  <CaseHautFait
                    key={c.code}
                    c={c}
                    nouveau={nouveaux.has(c.code)}
                    ouverte={ouverte === c.code}
                    onOuvrir={() => setOuverte(ouverte === c.code ? null : c.code)}
                  />
                ))}
              </div>
              {/* ⛔ La NOTICE ne tient pas dans une case : elle fait deux cents signes,
                  et c'est la récompense elle-même. Elle se déplie SOUS la série, une
                  à la fois, plutôt que d'ouvrir une fenêtre de plus. */}
              {serie.degres.filter(c => c.code === ouverte).map(c => (
                <Notice key={c.code} c={c} part={etat.rarete?.[c.code]} />
              ))}
            </Carte>
          ))}
        </>
      )}
    </>
  )
}

// ── Le compte, en tête ───────────────────────────────────────────────────────
function Tableau({ score, series, enVue }: { score: Score; series: SerieEtat[]; enVue: string | null }) {
  const enAvant = series.find(s => s.serie === enVue)
  const reste = enAvant ? libelleRestant(enAvant) : null

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.75rem', color: 'var(--cs-encre)', lineHeight: 1 }}>
          {score.obtenus}
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)' }}>
          point{score.obtenus !== 1 ? 's' : ''} sur {score.possibles}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', marginLeft: 'auto' }}>
          {score.cases} case{score.cases !== 1 ? 's' : ''} sur {score.total}
        </span>
      </div>

      <div style={{ position: 'relative', height: '5px', background: 'var(--cs-fond-doux)', borderRadius: '999px', overflow: 'hidden', margin: '12px 0 0' }}>
        <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${score.possibles > 0 ? (score.obtenus / score.possibles) * 100 : 0}%`, background: 'var(--cs-vert)', borderRadius: '999px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>

      {/* ⛔ Ce qui est MIS EN AVANT est la série la plus proche, jamais le degré
          supérieur de celle qu'on vient d'achever : c'est la parade à l'effondrement
          post-badge (Anderson et al., charte § 40). */}
      {enAvant && reste && (
        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: '14px 0 0', lineHeight: 1.6 }}>
          Le plus près : <strong style={{ color: 'var(--cs-texte)', fontWeight: 600 }}>{enAvant.prochain?.nom}</strong>, dans « {enAvant.nom} ». {reste}
        </p>
      )}
      {!enAvant && (
        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: '14px 0 0', lineHeight: 1.6 }}>
          Toutes les cases sont remplies. Le tableau s’élargira avec la bibliothèque.
        </p>
      )}
    </>
  )
}

function EnTeteSerie({ serie, enVue }: { serie: SerieEtat; enVue: boolean }) {
  const acquis = serie.degres.filter(d => d.obtenu).length
  const encre = encreDe(serie.degres[0]?.famille ?? 'ecriture')
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
      <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontWeight: 'normal', color: encre, margin: 0 }}>
        {serie.nom}
      </h2>
      <span style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-faible)', letterSpacing: '0.04em' }}>
        {acquis} / {serie.degres.length}
      </span>
      {enVue && libelleRestant(serie) && (
        <span style={{ fontSize: '0.65625rem', fontWeight: 600, color: encre, background: `color-mix(in srgb, ${encre} 12%, var(--cs-surface))`, padding: '2px 9px', borderRadius: '999px' }}>
          {libelleRestant(serie)}
        </span>
      )}
    </div>
  )
}

// ── Une case ─────────────────────────────────────────────────────────────────
function CaseHautFait({ c, nouveau, ouverte, onOuvrir }: {
  c: DegreEtat
  nouveau: boolean
  ouverte: boolean
  onOuvrir: () => void
}) {
  const encre = encreDe(c.famille)
  const palier = palierAtteint(c)

  return (
    <button
      type="button"
      className="hf-case"
      onClick={onOuvrir}
      aria-expanded={ouverte}
      aria-label={c.obtenu ? `${c.nom}, obtenu, ${c.points} points` : `${c.nom}, en attente, ${libelleProgression(c)}`}
      style={{
        padding: '11px 12px 10px',
        borderRadius: '8px',
        // ⛔ La case en attente est TERNE : pas de couleur, pas d'ombre, un simple
        // filet. C'est le contraste avec l'acquise qui fait désirer de la remplir.
        background: c.obtenu ? aplatDe(c.famille, c.degre) : 'var(--cs-fond)',
        border: `1px solid ${c.obtenu ? `color-mix(in srgb, ${encre} 30%, var(--cs-surface))` : 'var(--cs-bord-clair)'}`,
        outline: ouverte ? `2px solid color-mix(in srgb, ${encre} 45%, var(--cs-surface))` : 'none',
        outlineOffset: '1px',
      }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '5px' }}>
        <span style={{
          fontFamily: 'var(--font-source-serif), Georgia, serif',
          fontSize: '0.8125rem',
          lineHeight: 1.25,
          flex: 1,
          color: c.obtenu ? 'var(--cs-encre)' : 'var(--cs-texte-doux)',
        }}>
          {c.nom}
        </span>
        {/* Les points ne s'annoncent que sur une case ACQUISE : promettre un prix
            devant la case vide en ferait une monnaie. */}
        {c.obtenu && (
          <span style={{ fontSize: '0.65625rem', fontWeight: 600, color: encre, flexShrink: 0 }}>{c.points}</span>
        )}
      </span>

      {c.obtenu ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.625rem', color: encre, letterSpacing: '0.04em' }}>
          <span aria-hidden="true">✓</span>
          {nouveau ? <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Nouveau</span> : <span>Obtenu</span>}
        </span>
      ) : (
        <>
          {/* L'indice de progression, demandé par l'auteur : « 55 versets commentés
              sur 100 ». Il est le seul contenu vivant d'une case en attente. */}
          <span style={{ display: 'block', fontSize: '0.625rem', color: palier ? 'var(--cs-texte-gris)' : 'var(--cs-texte-faible)', fontWeight: palier ? 600 : 400, marginBottom: '4px' }}>
            {libelleProgression(c)}
          </span>
          <span style={{ display: 'block', position: 'relative', height: '3px', background: 'var(--cs-fond-doux)', borderRadius: '999px', overflow: 'hidden' }}>
            <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${Math.round(c.part * 100)}%`, background: palier ? 'var(--cs-texte-gris)' : 'var(--cs-bord)', borderRadius: '999px' }} />
          </span>
        </>
      )}
    </button>
  )
}

// ── La notice, dépliée sous sa série ─────────────────────────────────────────
function Notice({ c, part }: { c: DegreEtat; part?: number }) {
  const encre = encreDe(c.famille)
  return (
    <div style={{
      marginTop: '10px',
      padding: '13px 15px',
      borderRadius: '8px',
      background: 'var(--cs-fond-clair)',
      borderLeft: `3px solid ${c.obtenu ? encre : 'var(--cs-bord)'}`,
    }}>
      <p style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.875rem', color: c.obtenu ? 'var(--cs-encre)' : 'var(--cs-texte-doux)' }}>{c.nom}</span>
        <span style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)' }}>
          {c.obtenu ? `${c.points} point${c.points !== 1 ? 's' : ''}` : libelleProgression(c)}
        </span>
      </p>

      {/* ⛔ La notice ne se lit QUE si la case est acquise : c'est la récompense
          elle-même, et la donner d'avance la dépenserait. */}
      {c.obtenu ? (
        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', margin: '7px 0 0', lineHeight: 1.65 }}>{c.notice}</p>
      ) : (
        <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-faible)', margin: '7px 0 0', lineHeight: 1.6, fontStyle: 'italic' }}>
          Cette case vous apprendra quelque chose le jour où elle tombera.
        </p>
      )}

      {c.obtenu && part != null && (
        <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', margin: '6px 0 0', fontStyle: 'italic' }}>
          Obtenu par {Math.round(part * 100)} lecteurs sur cent.
        </p>
      )}
    </div>
  )
}
