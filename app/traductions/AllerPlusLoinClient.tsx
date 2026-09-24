'use client'

import IconeChevron from '@/app/components/IconeChevron'
import { ContenuFicheTraduction, useDonneesFicheTraduction } from '@/app/components/ModaleTraduction'
import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '@/app/lib/supabase'
import { allerAElement } from '@/app/lib/defilement'
import { ENCRE_TITRE, GRAISSE_TITRE, INTERLIGNE_TITRE_PAGE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR, GOUTTIERE_PAGE } from '@/app/lib/mesures'
import { portraitTraduction, type PositionsPhotoTraduction } from '@/app/lib/portraitTraduction'
import {
  VOILE_BANDEAU, ENCRE_SUR_PHOTO, META_SUR_PHOTO,
  CHEVRON_SUR_PHOTO, OMBRE_SUR_PHOTO, BRILLANCE_BANDEAU, MESURE_TEXTE_BANDEAU,
} from '@/app/lib/bandeauTraduction'
import { SERIF } from '@/app/lib/polices'

/** Ce que la LISTE lit : le bandeau et le ton de l'image. ⚠️ La notice dépliée, elle, se
 *  charge par la fiche (`useDonneesFicheTraduction`) : la page ne compose plus rien de
 *  son côté. */
type Traduction = {
  trad_id: string; nom: string
  date_publication: string | null; langue: string | null
  ordre: number
  photo: string | null
  photo_encart: string | null
  photo_position: PositionsPhotoTraduction
}

/** La TEINTE dominante d'une image et sa saturation — jamais sa clarté. Rend `null`
 *  si l'image n'a pas de couleur franche.
 *
 *  ⛔ Le ton ne porte PAS de clarté, parce que la clarté appartient au THÈME : c'est
 *  `.trad-fiche-fond`, dans globals.css, qui la pose, très haute au Clair et très
 *  basse au Cuir. Un ton complet, mêlé au fond par `color-mix`, avait été essayé le
 *  27 août 2026 : il salissait le blanc de la fiche d'un beige sourd au lieu de le
 *  teinter, l'image donnant sa clarté en même temps que sa couleur.
 *
 *  ⛔ On ne prend PAS la moyenne des pixels : la moyenne d'un paysage est une boue
 *  grise, parce que les complémentaires s'annulent. On range les teintes en
 *  vingt-quatre seaux de quinze degrés, pondérées par leur saturation, on garde le
 *  seau le plus lourd, et l'on en tire la moyenne CIRCULAIRE — une moyenne ordinaire
 *  placerait au cyan le milieu de deux rouges à 350° et 10°.
 *
 *  Les gris, les noirs et les blancs sont écartés avant le comptage : ils n'ont pas
 *  de teinte à donner, et ils sont le plus nombreux dans une photographie ancienne. */
function tonDominant(data: Uint8ClampedArray): { h: number; s: number } | null {
  const SEAUX = 24
  const poids = new Float64Array(SEAUX)
  const cos = new Float64Array(SEAUX)
  const sin = new Float64Array(SEAUX)
  const sat = new Float64Array(SEAUX)

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255, v = data[i + 1] / 255, b = data[i + 2] / 255
    const haut = Math.max(r, v, b), bas = Math.min(r, v, b)
    const clarte = (haut + bas) / 2
    if (clarte < 0.08 || clarte > 0.94) continue
    const ecart = haut - bas
    if (ecart < 0.06) continue
    const saturation = ecart / (1 - Math.abs(2 * clarte - 1))
    if (saturation < 0.12) continue

    let t: number
    if (haut === r) t = ((v - b) / ecart) % 6
    else if (haut === v) t = (b - r) / ecart + 2
    else t = (r - v) / ecart + 4
    t = (t * 60 + 360) % 360

    const k = Math.floor(t / (360 / SEAUX)) % SEAUX
    const rad = (t * Math.PI) / 180
    poids[k] += saturation
    cos[k] += Math.cos(rad) * saturation
    sin[k] += Math.sin(rad) * saturation
    sat[k] += saturation * saturation
  }

  let meilleur = -1, lourd = 0
  for (let k = 0; k < SEAUX; k++) if (poids[k] > lourd) { lourd = poids[k]; meilleur = k }
  if (meilleur < 0 || lourd <= 0) return null

  const teinte = ((Math.atan2(sin[meilleur], cos[meilleur]) * 180) / Math.PI + 360) % 360
  // ⛔ La saturation est bornée TRÈS BAS, et l'écart entre les bornes est étroit.
  // Un fond de fiche n'est pas un aplat de couleur : c'est un lait de chaux, qui
  // porte une teinte sans porter une couleur. Les bornes ont d'abord été posées à
  // 32-60 % — l'auteur a jugé le résultat trop vif le 27 août 2026 —, puis à 14-28 %,
  // où la même image donne une craie teintée au lieu d'un ton pastel.
  const saturation = Math.min(0.28, Math.max(0.14, sat[meilleur] / lourd))
  return { h: Math.round(teinte * 10) / 10, s: Math.round(saturation * 100) }
}

type Ton = { h: number; s: number }

// Une même image sert plusieurs ouvertures de la même notice : on ne la relit pas.
const tonsConnus = new Map<string, Ton | null>()

/** Le ton d'une image, calculé à la première ouverture seulement.
 *  ⚠️ `url` vaut `null` tant que la notice est fermée : le fond n'est pas visible,
 *  et six décodages au chargement de la page ne se justifieraient pas. */
function useTonImage(url: string | null): Ton | null {
  // ⚠️ L'état ne porte QUE le calcul asynchrone, et il porte l'adresse avec lui :
  // le ton déjà connu se lit au rendu, dans le cache. Poser l'état depuis le corps
  // de l'effet ferait un rendu de plus à chaque ouverture, et l'état d'une notice
  // survivrait au changement de son image.
  const [calcule, setCalcule] = useState<{ url: string; ton: Ton | null } | null>(null)

  useEffect(() => {
    if (!url || tonsConnus.has(url)) return
    let annule = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      let trouve: Ton | null = null
      try {
        // Quarante-huit sur soixante-douze suffisent : on cherche une dominante,
        // pas un détail. C'est aussi ce qui rend le calcul imperceptible.
        const canvas = document.createElement('canvas')
        canvas.width = 48; canvas.height = 72
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, 48, 72)
        trouve = tonDominant(ctx.getImageData(0, 0, 48, 72).data)
      } catch { trouve = null }
      tonsConnus.set(url, trouve)
      if (!annule) setCalcule({ url, ton: trouve })
    }
    img.onerror = () => {
      tonsConnus.set(url, null)
      if (!annule) setCalcule({ url, ton: null })
    }
    img.src = url
    return () => { annule = true }
  }, [url])

  if (!url) return null
  if (tonsConnus.has(url)) return tonsConnus.get(url) ?? null
  return calcule?.url === url ? calcule.ton : null
}

function BandeauTraduction({ t, estOuvert, onToggle }: {
  t: Traduction; estOuvert: boolean; onToggle: () => void
}) {
  const meta = [t.langue, t.date_publication].filter(Boolean).join(' · ')

  const couleurTexte = t.photo ? ENCRE_SUR_PHOTO : 'var(--cs-encre-fonce)'
  const couleurMeta = t.photo ? META_SUR_PHOTO : 'var(--cs-texte-second)'
  const couleurChevron = t.photo ? CHEVRON_SUR_PHOTO : 'var(--cs-bord)'
  const ombreTexte = t.photo ? OMBRE_SUR_PHOTO : 'none'

  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0', minHeight: t.photo ? '92px' : undefined,
        background: t.photo ? 'transparent' : estOuvert ? 'rgba(var(--cs-vert-rgb),0.04)' : 'var(--cs-surface)',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background var(--cs-duree-courte)', overflow: 'hidden',
      }}
    >
      {t.photo && (() => {
        const p = t.photo_position?.bandeau
        const px = p?.x ?? 50; const py = p?.y ?? 20; const ps = p?.scale ?? 1
        return (
          // ⛔ Le bandeau prend TOUT le bloc, ouvert comme fermé, bord à bord. Il a
          // reculé un temps de dix pixels une fois la notice dépliée, le fond de la
          // carte lui tenant lieu de passe-partout : le cadre a été écarté le
          // 27 août 2026. Le titre s'écrit sur l'image, non sur une marge.
          <img src={t.photo} alt="" aria-hidden="true" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: `${px}% ${py}%`, display: 'block',
            transform: `scale(${ps})`, transformOrigin: `${px}% ${py}%`,
            filter: `brightness(${estOuvert ? BRILLANCE_BANDEAU.ouvert : BRILLANCE_BANDEAU.ferme})`,
            transition: 'filter var(--cs-duree-moyenne)',
          }} />
        )
      })()}

      {t.photo && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: VOILE_BANDEAU,
        }} />
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, minWidth: 0,
        maxWidth: t.photo ? MESURE_TEXTE_BANDEAU : undefined,
        padding: t.photo ? '18px 14px 18px 20px' : '14px 18px',
      }}>
        <h2 style={{
          fontFamily: SERIF,
          fontSize: '1.0625rem', fontWeight: 'normal',
          color: couleurTexte, margin: 0, lineHeight: 1.25,
          textShadow: ombreTexte,
          transition: 'color var(--cs-duree-moyenne), text-shadow var(--cs-duree-moyenne)',
        }}>
          {t.nom}
        </h2>
        {meta && (
          <span style={{
            fontFamily: SERIF,
            fontSize: '0.6875rem', fontStyle: 'italic',
            color: couleurMeta, letterSpacing: '0.02em',
            display: 'block', marginTop: '4px',
            textShadow: ombreTexte,
            transition: 'color var(--cs-duree-moyenne)',
          }}>
            {meta}
          </span>
        )}
        {/* ⛔ LA DATE DE MISE À JOUR N'EST PLUS ICI (demande de l'auteur, 2026-09-04 :
            « n'afficher la date de mise à jour que dans le texte développé »). Elle se
            lit dans la notice dépliée, parmi l'état du texte. */}
      </div>

      {/* Sur une PHOTO, l'ombre du texte devient une ombre PORTÉE : `drop-shadow` prend
          la même écriture que `text-shadow` et suit le tracé au lieu de la boîte. */}
      <span style={{
        position: 'relative', zIndex: 1, flexShrink: 0,
        marginRight: '18px', color: couleurChevron,
        filter: t.photo ? `drop-shadow(${ombreTexte})` : 'none',
        display: 'inline-flex', transition: 'transform var(--cs-duree-moyenne), color var(--cs-duree-moyenne)',
        transform: estOuvert ? 'rotate(180deg)' : 'none',
      }}><IconeChevron dir="down" taille="0.625rem" strokeWidth={1.6} /></span>
    </button>
  )
}

/** Le volet déplié d'une notice : le CONTENU DE LA FENÊTRE « À propos de cette
 *  traduction », tel quel.
 *
 *  ⛔ Demande de l'auteur, 2026-09-15 : « Les données de la page “traduction” et les
 *  données de la fenêtre “traduction” doivent être les mêmes. » La page composait sa
 *  propre notice — encart, biographie, commentaire, date de mise à jour —, et la
 *  fenêtre la sienne, avec la chronologie, l'édition, les ouvrages cités et les
 *  conditions d'usage en plus. Elles partagent désormais le chargement
 *  (`useDonneesFicheTraduction`) et la composition (`ContenuFicheTraduction`) ; seul
 *  l'en-tête change, le bandeau nommant déjà la traduction.
 *
 *  ⚠️ Le fond garde la TEINTE de l'image, et la clarté du thème (`.trad-fiche-fond`,
 *  globals.css) : c'est ce que la page a de propre, et la fiche se pose dessus.
 *
 *  C'est un COMPOSANT, et non un fragment de la liste, parce qu'il lit le ton de son
 *  image et charge ses données : un crochet ne se pose pas dans une boucle. */
function FicheTraduction({ t }: { t: Traduction }) {
  const e = portraitTraduction(t)
  const ton = useTonImage(e?.url ?? null)
  const { info, chrono, ouvragesCites } = useDonneesFicheTraduction(t.trad_id)

  // ⛔ L'image donne la TEINTE, le thème donne la CLARTÉ, et les deux ne se mêlent
  // jamais (voir `tonDominant`).
  const teinte = ton
    ? ({ '--trad-ton-h': String(ton.h), '--trad-ton-s': `${ton.s}%` } as CSSProperties)
    : undefined

  return (
    <div className={ton ? 'trad-fiche-fond' : undefined} style={{
      borderTop: '1px solid var(--cs-fond-doux)',
      transition: 'background 0.35s ease',
      ...teinte,
    }}>
      <div style={{ padding: '18px clamp(12px, 4vw, 20px) 22px' }}>
        <ContenuFicheTraduction surPage info={info} chrono={chrono} ouvragesCites={ouvragesCites} nomFallback={t.nom} />
      </div>
    </div>
  )
}

export default function AllerPlusLoinClient() {
  const [traductions, setTraductions] = useState<Traduction[]>([])
  const [ouvert, setOuvert] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('traductions').select('*')
      // ⛔ Deux conditions, et deux seulement. `est_biblique` écarte les notices des
      // traductions patristiques, qui vivent dans la même table. `visible_public` porte
      // la décision éditoriale, prise ligne à ligne depuis l'administration.
      .eq('est_biblique', true)
      .eq('visible_public', true)
      .order('ordre', { ascending: true })
      .then(({ data }) => setTraductions(data ?? []))
  }, [])

  // Lien profond vers une traduction précise (#TR0002), notamment depuis la recherche rapide.
  // ⛔ `allerAElement`, jamais un défilement doux nu : il peut ne rien faire du tout.
  useEffect(() => {
    if (traductions.length === 0) return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    setOuvert(hash)
    allerAElement(document.getElementById(hash))
  }, [traductions])

  return (
    <main style={{
      background: 'var(--cs-fond)',
      // AUCUN paddingTop ici. Le décalage sous la navbar fixe est posé UNE SEULE fois
      // pour tout le site, par #cs-corps dans app/layout.tsx.
      minHeight: HAUTEUR_SOUS_NAVBAR,
    }}>
      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: `22px ${GOUTTIERE_PAGE} 0` }}>
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <h1 style={{
            fontFamily: SERIF,
            fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE,
            color: ENCRE_TITRE, lineHeight: INTERLIGNE_TITRE_PAGE, marginBottom: '8px',
          }}>
            Les traductions
          </h1>
          <div style={{ width: '36px', height: '1px', background: 'var(--cs-bord)', margin: '0 auto 12px' }} />
        </div>
      </div>

      {/* ⚠️ 52 rem, la mesure de la fenêtre : la notice dépliée y est la même fiche, et
          ses deux colonnes demandent la même place. */}
      <div style={{ maxWidth: '52rem', margin: '0 auto', padding: `10px ${GOUTTIERE_PAGE} 80px` }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {traductions.map((t) => {
            const estOuvert = ouvert === t.trad_id
            return (
              <div key={t.trad_id} id={t.trad_id} style={{
                scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)`,
                border: '1px solid var(--cs-bord)', borderRadius: '8px',
                overflow: 'hidden', background: 'var(--cs-surface)',
              }}>
                <BandeauTraduction t={t} estOuvert={estOuvert} onToggle={() => setOuvert(prev => prev === t.trad_id ? null : t.trad_id)} />

                {estOuvert && <FicheTraduction t={t} />}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
