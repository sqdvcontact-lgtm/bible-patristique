'use client'

// LA CARTE — « Ce que j'ai retenu ».
//
// ⛔ Elle ne s'appelle PAS « ce que j'ai lu », et ce n'est pas une nuance de style.
// Elle compte les marques volontaires du lecteur : un passage prélevé, une œuvre mise
// en bibliothèque. Ainsi nommée, elle ne ment jamais — et elle dit mieux, car retenir
// vaut plus que parcourir. Un lecteur qui lit sans rien marquer a une carte vide, et
// c'est juste : elle ne prétend pas savoir ce qu'il a lu, personne ne le sait.
//
// ⚠️ Elle ne montre JAMAIS l'immensité de ce qui reste. Loewenstein : la curiosité
// naît d'un écart perçu, et les PETITS écarts l'excitent quand les grands l'éteignent.
// D'où le siècle mis en avant : celui où il manque le moins d'auteurs, jamais le
// compte de tout ce qui n'est pas encore atteint.

import { useEffect, useState } from 'react'
import { Carte, EnTeteRubrique } from '@/app/compte/champsCompte'

type AuteurRetenu = { id: string; nom: string; retenu: boolean }
type SiecleRetenu = { rang: number; libelle: string; auteurs: AuteurRetenu[] }
type CarteRetenue = {
  total: number
  retenus: number
  siecles: SiecleRetenu[]
  prochain: { libelle: string; manquent: number } | null
}

export default function CarteRetenueClient() {
  const [carte, setCarte] = useState<CarteRetenue | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let annule = false
    fetch('/api/compte/retenu')
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Carte indisponible.')
        return res.json()
      })
      .then((c: CarteRetenue) => { if (!annule) setCarte(c) })
      .catch((e: Error) => {
        console.error('Ce que j’ai retenu : la carte n’a pas pu être établie.', e)
        if (!annule) setErreur('La carte n’a pas pu être établie. Réessayez.')
      })
    return () => { annule = true }
  }, [])

  return (
    <>
      <EnTeteRubrique titre="Ce que j’ai retenu">
        Les Pères dont vous avez gardé quelque chose, un passage prélevé ou une œuvre mise en bibliothèque.
        Le site ne sait pas ce que vous lisez, et ne cherche pas à le savoir : cette carte ne montre que ce que vous avez marqué vous-même.
      </EnTeteRubrique>

      {erreur && <Carte><p style={{ fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', margin: 0 }}>{erreur}</p></Carte>}
      {!carte && !erreur && (
        <Carte><p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', margin: 0 }}>Chargement…</p></Carte>
      )}

      {carte && (
        <>
          <Carte>
            <Avancement carte={carte} />
          </Carte>

          {carte.siecles.map(siecle => (
            <Carte key={siecle.rang} titre={siecle.libelle}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))', gap: '8px' }}>
                {siecle.auteurs.map(auteur => (
                  <a key={auteur.id} href={`/auteur/${encodeURIComponent(auteur.id)}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '9px',
                      padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
                      background: auteur.retenu ? 'var(--cs-fond-clair)' : 'transparent',
                      border: `1px solid ${auteur.retenu ? 'var(--cs-bord-clair)' : 'var(--cs-fond-doux)'}`,
                      borderLeft: `3px solid ${auteur.retenu ? 'var(--cs-vert)' : 'var(--cs-fond-doux)'}`,
                    }}>
                    <span aria-hidden="true" style={{
                      width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                      background: auteur.retenu ? 'var(--cs-vert)' : 'var(--cs-bord)',
                    }} />
                    <span style={{
                      fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem',
                      color: auteur.retenu ? 'var(--cs-encre)' : 'var(--cs-texte-doux)',
                      lineHeight: 1.35,
                    }}>
                      {auteur.nom}
                    </span>
                  </a>
                ))}
              </div>
            </Carte>
          ))}
        </>
      )}
    </>
  )
}

function Avancement({ carte }: { carte: CarteRetenue }) {
  const { total, retenus, prochain } = carte
  const pourcentage = total > 0 ? Math.round((retenus / total) * 100) : 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.75rem', color: 'var(--cs-encre)', lineHeight: 1 }}>
          {retenus}
        </span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)' }}>
          {retenus === 1 ? 'Père retenu' : 'Pères retenus'} sur les {total} que le corpus donne à lire.
        </span>
      </div>

      <div style={{ position: 'relative', height: '5px', background: 'var(--cs-fond-doux)', borderRadius: '999px', overflow: 'hidden', marginBottom: '14px' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pourcentage}%`, background: 'var(--cs-vert)', borderRadius: '999px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>

      {/* ⛔ Le PETIT écart, et lui seul. On ne dit jamais « il vous en manque douze » :
          un grand écart éteint la curiosité au lieu de l'ouvrir (Loewenstein). */}
      {retenus === 0 ? (
        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0, lineHeight: 1.6 }}>
          Rien encore. Gardez un passage qui vous arrête, et le premier s’allumera.
        </p>
      ) : prochain ? (
        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0, lineHeight: 1.6 }}>
          Au <strong style={{ color: 'var(--cs-texte)', fontWeight: 600 }}>{prochain.libelle}</strong>, il ne vous
          {prochain.manquent === 1 ? ' en manque qu’un.' : ` en manquent que ${prochain.manquent}.`}
        </p>
      ) : (
        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0, lineHeight: 1.6 }}>
          Vous avez retenu quelque chose de chacun. La carte s’élargira avec la bibliothèque.
        </p>
      )}
    </>
  )
}
