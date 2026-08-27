'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import DOMPurify from 'dompurify'
import { supabase } from '@/app/lib/supabase'
import { formaterSieclesHTML } from '@/app/oeuvre/[id]/texteEnrichi'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

type Traduction = {
  trad_id: string; nom: string; auteur: string | null; dates: string | null;
  bio_courte: string | null; date_publication: string | null;
  confession: string | null; langue: string | null;
  commentaire_editorial: string | null; ordre: number;
  photo: string | null;
  photo_encart: string | null;
  import_maj_le: string | null;
  photo_position: {
    bandeau:  { x: number; y: number; scale: number }
    encart?:  { x: number; y: number; scale: number }
    /** Ancien nom de l'encart, du temps où la même image servait aux deux cadres. */
    lateral?: { x: number; y: number; scale: number }
  } | null;
}

/** L'image de l'encart et son cadrage. Tant qu'une notice n'a pas reçu son portrait,
 *  le bandeau en tient lieu, avec l'ancien cadrage `lateral` qui avait été réglé
 *  pour lui : la notice ne se troue pas en attendant. */
function encartDe(t: Traduction): { url: string; x: number; y: number; scale: number } | null {
  if (t.photo_encart) {
    const p = t.photo_position?.encart
    return { url: t.photo_encart, x: p?.x ?? 50, y: p?.y ?? 50, scale: p?.scale ?? 1 }
  }
  if (t.photo) {
    // `lateral` est l'ancien nom du cadrage de l'encart. L'administration l'a
    // peut-être déjà recopié sous `encart` en enregistrant un autre cadrage :
    // on lit donc le nouveau nom d'abord.
    const p = t.photo_position?.encart ?? t.photo_position?.lateral
    return { url: t.photo, x: p?.x ?? 50, y: p?.y ?? 20, scale: p?.scale ?? 1 }
  }
  return null
}

function useImageLuminance(url: string | null): boolean | null {
  const [estSombre, setEstSombre] = useState<boolean | null>(null)
  useEffect(() => {
    if (!url) { setEstSombre(null); return }
    let annule = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (annule) return
      try {
        const canvas = document.createElement('canvas')
        const sw = Math.round(Math.min(img.naturalWidth, 400) * 0.45)
        const sh = Math.round(Math.min(img.naturalHeight, 300) * 0.65)
        canvas.width = sw; canvas.height = sh
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, sw * (img.naturalWidth / Math.min(img.naturalWidth, 400)), sh * (img.naturalHeight / Math.min(img.naturalHeight, 300)), 0, 0, sw, sh)
        const { data } = ctx.getImageData(0, 0, sw, sh)
        let lum = 0
        const n = sw * sh
        for (let i = 0; i < data.length; i += 4) {
          lum += 0.2126 * (data[i] / 255) + 0.7152 * (data[i + 1] / 255) + 0.0722 * (data[i + 2] / 255)
        }
        setEstSombre(lum / n < 0.55)
      } catch { setEstSombre(null) }
    }
    img.onerror = () => { if (!annule) setEstSombre(null) }
    img.src = url
    return () => { annule = true }
  }, [url])
  return estSombre
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
  const estSombre = useImageLuminance(t.photo ?? null)
  const meta = [t.langue, t.date_publication].filter(Boolean).join(' · ')

  const fondSombre = estSombre !== false
  // ⛔ Sur une PHOTO, l'encre s'écrit en valeur LITTÉRALE, jamais en jeton de thème.
  // Le sol de ces trois lignes est une image, et une image ne se transpose pas : le
  // jeton, lui, se retourne. `var(--cs-fond)` valait le crème du site au Clair et
  // devenait `#1c1813` en Cuir, c'est-à-dire du brun très sombre écrit sur une photo
  // sombre — le titre de la traduction disparaissait (relevé le 2026-08-23). Le crème
  // est donc posé en dur, comme le faisaient déjà les deux lignes suivantes, et comme
  // la charte l'exige des cartons de l'accueil et du jeu de couvertures : une couleur
  // qui n'a pas de fond thématique n'a pas de jeton. `#f7f4ef` EST la valeur claire
  // de `--cs-fond` : le rendu au Clair ne bouge pas d'un pixel.
  const couleurTexte = t.photo ? (fondSombre ? '#f7f4ef' : '#18130f') : 'var(--cs-encre-fonce)'
  const couleurMeta  = t.photo ? (fondSombre ? 'rgba(242,239,232,0.72)' : 'rgba(24,19,15,0.58)') : 'var(--cs-texte-second)'
  const couleurChevron = t.photo ? (fondSombre ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.4)') : 'var(--cs-bord)'

  const ombreForte = fondSombre
    ? '0 1px 2px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.65), 0 4px 20px rgba(0,0,0,0.35)'
    : '0 1px 2px rgba(255,255,255,0.95), 0 2px 8px rgba(255,255,255,0.75), 0 4px 16px rgba(255,255,255,0.4)'
  const ombreTexte = t.photo ? ombreForte : 'none'

  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0', minHeight: t.photo ? '92px' : undefined,
        background: t.photo ? 'transparent' : estOuvert ? 'rgba(var(--cs-vert-rgb),0.04)' : 'var(--cs-surface)',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        transition: 'background 0.15s', overflow: 'hidden',
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
            filter: estOuvert ? 'brightness(0.78)' : 'brightness(0.9)',
            transition: 'filter 0.2s',
          }} />
        )
      })()}

      {t.photo && (
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: fondSombre
            ? 'linear-gradient(to right, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.12) 55%, transparent 100%)'
            : 'linear-gradient(to right, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.08) 55%, transparent 100%)',
          transition: 'background 0.2s',
        }} />
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        flex: 1, minWidth: 0,
        padding: t.photo ? '18px 14px 18px 20px' : '14px 18px',
      }}>
        <h2 style={{
          fontFamily: "var(--font-source-serif), Georgia, serif",
          fontSize: '1.0625rem', fontWeight: 'normal',
          color: couleurTexte, margin: 0, lineHeight: 1.25,
          textShadow: ombreTexte,
          transition: 'color 0.2s, text-shadow 0.2s',
        }}>
          {t.nom}
        </h2>
        {meta && (
          <span style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: '0.6875rem', fontStyle: 'italic',
            color: couleurMeta, letterSpacing: '0.02em',
            display: 'block', marginTop: '4px',
            textShadow: ombreTexte,
            transition: 'color 0.2s',
          }}>
            {meta}
          </span>
        )}
        {t.import_maj_le && (
          <span style={{
            fontSize: '0.625rem', fontStyle: 'italic',
            color: t.photo ? (fondSombre ? 'rgba(242,239,232,0.48)' : 'rgba(24,19,15,0.38)') : 'var(--cs-texte-faible)',
            display: 'block', marginTop: '3px',
            textShadow: t.photo ? ombreTexte : 'none',
            transition: 'color 0.2s',
          }}>
            Mis à jour le {new Date(t.import_maj_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        )}
      </div>

      <span style={{
        position: 'relative', zIndex: 1, fontSize: '0.625rem', flexShrink: 0,
        marginRight: '18px', color: couleurChevron,
        textShadow: t.photo ? ombreTexte : 'none',
        display: 'inline-block', transition: 'transform 0.18s, color 0.2s',
        transform: estOuvert ? 'rotate(180deg)' : 'none',
      }}>▼</span>
    </button>
  )
}

function normaliserContenu(texte: string): string {
  if (!texte) return ''
  let html: string
  if (/^\s*<(p|h[1-6]|div|ul|ol|blockquote)[\s>]/i.test(texte)) {
    html = texte
  } else {
    const pStyle = 'color:var(--cs-texte-fort);font-size:0.84375rem;line-height:1.78;margin:0 0 12px;text-decoration:none'
    html = texte
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => `<p style="${pStyle}">${l}</p>`)
      .join('')
  }
  // Assaini avant injection : `commentaire_editorial` est du HTML éditorial, mais on
  // le passe par DOMPurify (comme NavLivres) pour ne jamais rendre de script/handler.
  return DOMPurify.sanitize(formaterSieclesHTML(html))
}

/** Le volet déplié d'une notice.
 *
 *  ⛔ Il n'est PLUS deux colonnes. L'image y tenait une colonne entière, et le texte
 *  l'autre : dès que la notice dépassait une quinzaine de lignes, il restait sous
 *  l'image une bande blanche de cent soixante pixels de large et de cinq cents de
 *  haut, que rien ne venait remplir. L'encart FLOTTE donc dans le texte, qui
 *  l'entoure puis reprend toute la mesure sous lui. `flow-root` fait du bloc de
 *  texte un contexte de formatage : sans lui, une notice plus courte que l'encart
 *  laisserait celui-ci dépasser hors de la carte.
 *
 *  C'est un COMPOSANT, et non un fragment de la liste, parce qu'il lit le ton de son
 *  image : un crochet ne se pose pas dans une boucle. */
function FicheTraduction({ t }: { t: Traduction }) {
  const e = encartDe(t)
  const ton = useTonImage(e?.url ?? null)

  // ⛔ L'image donne la TEINTE, le thème donne la CLARTÉ, et les deux ne se mêlent
  // jamais. La clarté est posée par `.trad-fiche-fond`, dans globals.css : très
  // haute au Clair, très basse au Cuir. Écrite ici, elle aurait allumé une fiche
  // pâle au milieu du Cuir ; tirée de l'image, elle salissait le blanc de la fiche
  // d'un beige sourd dès que la peinture était sombre — ce qu'elle est presque
  // toujours.
  const teinte = ton
    ? ({ '--trad-ton-h': String(ton.h), '--trad-ton-s': `${ton.s}%` } as CSSProperties)
    : undefined

  return (
    <div className={ton ? 'trad-fiche-fond' : undefined} style={{
      borderTop: '1px solid var(--cs-fond-doux)',
      transition: 'background 0.35s ease',
      ...teinte,
    }}>
      {/* Les marges internes suivent aussi : 40 px de blanc pris sur une colonne
          de 184 px, c'était près du quart de la place restante. */}
      <div className="trad-fiche-texte" style={{ display: 'flow-root', padding: '18px clamp(12px, 4vw, 20px) 22px' }}>
        {e && (
          <div className="trad-fiche-encart" style={{
            // ⚠️ La largeur était figée à 8.75rem (140 px), donc insensible à
            // l'écran. Sur un téléphone de 375 px, la carte dispose de 327 px :
            // l'image en prenait 141, et il restait 144 px de texte JUSTIFIÉ,
            // soit dix-sept signes par ligne.
            // ⛔ Sous 700 px, cet encart DISPARAÎT (règle `.trad-fiche-encart`
            // dans globals.css, à côté de celle de la carte d'auteur, qui répond
            // au même défaut) : il perturbait la lecture.
            float: 'left',
            width: 'clamp(4rem, 20vw, 8.75rem)',
            // ⛔ L'encart NE TOUCHE AUCUN BORD : le fond du bloc l'entoure de trois
            // côtés, le texte du quatrième. Sa forme ne dépend plus de la longueur
            // de la notice — c'était une bande de 140 sur 600 quand le commentaire
            // était long.
            aspectRatio: '2 / 3',
            margin: '3px 18px 12px 0',
            borderRadius: '3px', overflow: 'hidden',
            boxShadow: '0 0 0 1px var(--cs-bord), 0 1px 5px rgba(0,0,0,0.14)',
          }}>
            <img src={e.url} alt="" aria-hidden="true"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${e.x}% ${e.y}%`, transform: `scale(${e.scale})`, transformOrigin: `${e.x}% ${e.y}%`, display: 'block' }} />
          </div>
        )}
        {t.bio_courte && (
          <p style={{
            fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.65,
            margin: '0 0 12px', fontStyle: 'italic',
            textAlign: 'justify', hyphens: 'auto',
          }}>
            {t.bio_courte}
          </p>
        )}
        {t.commentaire_editorial && (
          <div
            className="trad-article"
            style={{ color: 'var(--cs-texte-fort)', fontSize: '0.84375rem', lineHeight: 1.65, textAlign: 'justify', hyphens: 'auto' }}
            dangerouslySetInnerHTML={{ __html: normaliserContenu(t.commentaire_editorial) }}
          />
        )}
      </div>
    </div>
  )
}

export default function AllerPlusLoinClient() {
  const [traductions, setTraductions] = useState<Traduction[]>([])
  const [ouvert, setOuvert] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('traductions').select('*')
      .not('schema_numerotation', 'is', null)
      .order('ordre', { ascending: true })
      .then(({ data }) => setTraductions(data ?? []))
  }, [])

  // Lien profond vers une traduction précise (#TR0002), notamment depuis la recherche rapide.
  useEffect(() => {
    if (traductions.length === 0) return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    setOuvert(hash)
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [traductions])

  return (
    <main style={{
      background: 'var(--cs-fond)',
      // AUCUN paddingTop ici. Le décalage sous la navbar fixe est posé UNE SEULE fois
      // pour tout le site, par #cs-corps dans app/layout.tsx. Le répéter le comptait
      // deux fois : 107px entre la barre et le titre au lieu de 38.
      minHeight: 'calc(100vh - 3.5rem)',
    }}>
      <div style={{ maxWidth: '45rem', margin: '0 auto', padding: '22px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '4px' }}>
          <h1 style={{
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE,
            color: ENCRE_TITRE, lineHeight: 1.15, marginBottom: '8px',
          }}>
            Les traductions
          </h1>
          <div style={{ width: '36px', height: '1px', background: 'var(--cs-bord)', margin: '0 auto 12px' }} />
        </div>
      </div>

      <div style={{ maxWidth: '42.5rem', margin: '0 auto', padding: '10px 24px 80px' }}>
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
