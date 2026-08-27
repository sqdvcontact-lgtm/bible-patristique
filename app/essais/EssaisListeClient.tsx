'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { CATEGORIES_ESSAIS } from './EtapeMetadonnees'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import OngletsPage from '@/app/components/OngletsPage'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { couvertureDe } from '@/app/lib/couverturesEssai'
import { categorieEmblemeDe, emblemeDe } from '@/app/lib/emblemesCouverture'
import { normaliserSaisie } from '@/app/lib/typographie'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'

const CATEGORIES = CATEGORIES_ESSAIS

type Onglet = 'communaute' | 'mes-ecrits' | 'ecrire' | 'suggestion'

type EssaiResume = {
  id: number; titre: string; sous_titre: string | null; resume: string | null
  categories: string[]; nb_vues: number; nb_likes: number; publie_at: string | null; auteur: string
  user_id?: string | null
  /** Clé de la couleur de couverture choisie par l'auteur (voir couverturesEssai.ts). */
  couverture?: string | null
  /** Registre dont l'emblème illustre la couverture, quand il y en a plusieurs. */
  embleme?: string | null
}

type EssaiPerso = {
  id: number; titre: string; sous_titre: string | null; statut: string
  updated_at: string | null; publie_at: string | null; nb_vues: number | null; nb_likes: number
}

const STATUTS: Record<string, { label: string; couleur: string }> = {
  brouillon: { label: 'Brouillon', couleur: 'var(--cs-texte-doux)' },
  en_attente: { label: 'En attente', couleur: 'var(--cs-attente)' },
  publie: { label: 'Publié', couleur: 'var(--cs-vert)' },
  a_reviser: { label: 'À réviser', couleur: 'var(--cs-danger)' },
  refuse: { label: 'Refusé', couleur: 'var(--cs-danger)' },
}

function sansAccents(s: string): string { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }

export default function EssaisListeClient({ essais }: { essais: EssaiResume[] }) {
  const [onglet, setOnglet] = useState<Onglet>('communaute')
  // Sous-onglet de « Écrire » : rédiger un texte, ou commenter un verset aléatoire.
  const [sousEcrire, setSousEcrire] = useState<'rediger' | 'suggestion'>('rediger')
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string | null>(null)
  const [mesEcrits, setMesEcrits] = useState<EssaiPerso[] | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id
      setConnecte(!!uid)
      if (!uid) { setMesEcrits([]); return }
      chargerMesEcrits(uid)
    })
  }, [])

  const chargerMesEcrits = async (uid?: string) => {
    const id = uid ?? (await supabase.auth.getSession()).data.session?.user.id
    if (!id) return
    const { data } = await supabase
      .from('essais')
      .select('id, titre, sous_titre, statut, updated_at, publie_at, nb_vues')
      .eq('user_id', id)
      .order('updated_at', { ascending: false })
    const lignes = data ?? []
    const ids = lignes.map(e => e.id)
    const { data: likes } = ids.length
      ? await supabase.from('essais_appreciations').select('id_essai').in('id_essai', ids)
      : { data: [] as any[] }
    const likesParEssai = new Map<number, number>()
    ;(likes ?? []).forEach((l: any) => likesParEssai.set(l.id_essai, (likesParEssai.get(l.id_essai) ?? 0) + 1))
    setMesEcrits(lignes.map(e => ({ ...e, nb_likes: likesParEssai.get(e.id) ?? 0 })))
  }

  const changerStatut = async (id: number, statut: string) => {
    const payload = statut === 'publie'
      ? { statut, publie_at: new Date().toISOString() }
      : { statut }
    await supabase.from('essais').update(payload).eq('id', id)
    await chargerMesEcrits()
  }

  const supprimer = async (id: number) => {
    if (!confirm('Supprimer définitivement cet écrit ?')) return
    await supabase.from('essais').delete().eq('id', id)
    await chargerMesEcrits()
  }

  const q = sansAccents(recherche.trim())
  const essaisFiltres = useMemo(() => essais.filter(e => {
    if (filtreCategorie && !e.categories.includes(filtreCategorie)) return false
    if (!q) return true
    return sansAccents(e.auteur).includes(q) || sansAccents(e.titre).includes(q) || (e.resume && sansAccents(e.resume).includes(q))
  }), [essais, filtreCategorie, q])

  return (
    <main style={{
      background: 'var(--cs-fond)',
      // AUCUN paddingTop ici. Le décalage sous la navbar fixe est posé UNE SEULE fois
      // pour tout le site, par #cs-corps dans app/layout.tsx. Le répéter le comptait
      // deux fois — c'est la règle déjà appliquée à la Bibliothèque et aux traductions.
      minHeight: 'calc(100vh - 3.5rem)',
    }}>
      {/* ⛔ La MESURE reste celle de la Communauté, 71rem : elle porte trois
          couvertures de front, quand la Bibliothèque n'a que du texte à ranger sur
          56,25. Une page prend la mesure de ce qu'elle contient (charte, § 36).
          Le RYTHME VERTICAL, lui, est celui de la Bibliothèque, au pixel près :
          22 px au-dessus du titre, 14 entre le titre et les onglets, 14 sous eux. */}
      <div className="essais-corps" style={{ maxWidth: '71rem', margin: '0 auto', padding: '22px 32px 40px' }}>

        {/* En-tête : titre, onglets et recherche, avec une même respiration verticale
            (≈14 px) entre chaque strate pour former un bloc au rythme régulier.
            ⛔ Le losange d'or qui se tenait sous le titre a été retiré le 27 août 2026 :
            la Bibliothèque n'en porte pas, et deux pages sœurs ne s'annoncent pas de
            deux façons. Il tenait à lui seul l'écart entre le titre et les onglets,
            qui est maintenant une marge chiffrée. */}
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, letterSpacing: '0.01em', margin: 0, lineHeight: 1.1 }}>
            Communauté
          </h1>
        </div>

        {/* Onglets navigation — trois entrées : les écrits de la communauté, les siens,
            et « Écrire » (qui se subdivise en deux sous-onglets). Modèle commun du
            site, cf. `.cs-onglets` dans globals.css. */}
        <OngletsPage
          className="essais-onglets"
          intitule="Sections de la communauté"
          actif={onglet}
          choisir={setOnglet}
          style={{ marginBottom: '14px' }}
          onglets={[
            { cle: 'communaute' as Onglet, libelle: 'Écrits de la communauté' },
            { cle: 'mes-ecrits' as Onglet, libelle: 'Mes écrits' },
            { cle: 'ecrire' as Onglet, libelle: 'Écrire' },
          ]}
        />

        {onglet === 'communaute' ? (
          <OngletCommunaute
            recherche={recherche}
            setRecherche={setRecherche}
            filtreCategorie={filtreCategorie}
            setFiltreCategorie={setFiltreCategorie}
            essais={essaisFiltres}
          />
        ) : onglet === 'mes-ecrits' ? (
          <OngletMesEcrits connecte={connecte} essais={mesEcrits} changerStatut={changerStatut} supprimer={supprimer} />
        ) : (
          <>
            {/* Deux sous-onglets sous « Écrire ». */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', margin: '14px 0 18px' }}>
              {([
                { key: 'rediger' as const, label: 'Rédiger un texte' },
                { key: 'suggestion' as const, label: 'Commenter un verset' },
              ]).map(s => (
                <button key={s.key} onClick={() => setSousEcrire(s.key)}
                  style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '999px', border: `1px solid ${sousEcrire === s.key ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: sousEcrire === s.key ? 'rgba(var(--cs-vert-rgb),0.09)' : 'var(--cs-surface)', color: sousEcrire === s.key ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', fontWeight: sousEcrire === s.key ? 600 : 400, cursor: 'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
            {sousEcrire === 'rediger' ? <OngletEcrire connecte={connecte} /> : <OngletSuggestion connecte={connecte} />}
          </>
        )}
      </div>
    </main>
  )
}


function formaterDateLongue(publie_at: string | null): string {
  if (!publie_at) return ''
  return new Date(publie_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function OngletCommunaute({
  recherche, setRecherche, filtreCategorie, setFiltreCategorie, essais,
}: {
  recherche: string; setRecherche: (v: string) => void
  filtreCategorie: string | null; setFiltreCategorie: (v: string | null) => void
  essais: EssaiResume[]
}) {
  const { favoris: favorisEssais, toggle: toggleFavoriEssai } = useFavoris('essai')

  // Fil chronologique : du plus récent au plus ancien.
  const tries = useMemo(
    () => [...essais].sort((a, b) => (b.publie_at ?? '').localeCompare(a.publie_at ?? '')),
    [essais],
  )

  // Le filtrage par catégorie et par recherche se fait chez l'appelant : la table
  // reçoit déjà les publications retenues, et n'a plus qu'à les ordonner.

  // Les plus lus : signalés au dos de la couverture, sans être retirés du fil.
  const plusLus = useMemo(() => new Set(
    [...tries]
      .sort((a, b) => (b.nb_vues - a.nb_vues) || (b.nb_likes - a.nb_likes))
      .slice(0, 3)
      .map(e => e.id),
  ), [tries])

  return (
    <>
      {/* Recherche + filtres de catégorie, centrés ; les tags passent à la ligne. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
        <div style={{ position: 'relative', width: '13.75rem', flexShrink: 0 }}>
          <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="Auteur, titre, résumé…"
            style={{ width: '100%', fontSize: '0.6875rem', padding: '5px 12px 5px 28px', border: '1px solid var(--cs-bord)', borderRadius: '999px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }} />
          <svg width="11" height="11" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--cs-texte-fort)', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.32 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="9" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => setFiltreCategorie(null)} style={tagFiltre(!filtreCategorie)}>Tout</button>
          {CATEGORIES.map(c => <button key={c} onClick={() => setFiltreCategorie(c)} style={tagFiltre(filtreCategorie === c)}>{c}</button>)}
        </div>
      </div>

      <style>{`
        .publications-sommaire-tete { display: flex; align-items: center; gap: 14px; margin: 0 0 14px; }
        .publications-sommaire-tete::before,
        .publications-sommaire-tete::after {
          content: ""; height: 1px; flex: 1;
          background: linear-gradient(90deg, rgba(var(--cs-or-rgb),0.04), rgba(var(--cs-or-rgb),0.34), rgba(var(--cs-or-rgb),0.04));
        }
        .publications-sommaire-tete span {
          font-size: 0.59375rem; font-weight: 700; letter-spacing: 0.24em;
          text-transform: uppercase; color: var(--cs-lacune);
        }

        /* Trois couvertures par rang, comme une table d'étalage. */
        /* La largeur est bornée sur les COLONNES, pas sur la couverture : celle-ci
           doit rester étirée par sa case. Toute tentative de la brider elle-même
           (marge automatique ou justify-self) lui retire l'étirement, et comme tous
           ses enfants sont hors flux, sa largeur retombe à ZÉRO : elle disparaît
           sans que rien ne le signale. */
        /* ⚠️ La largeur d'une couverture et l'écart entre deux vivent ICI, en une
           seule paire de valeurs : le rayon les emploie, et la barre d'onglets en
           DÉRIVE sa mesure. Écrites deux fois, elles dériveraient, et la barre
           surmonterait de nouveau autre chose que ce qu'elle commande. */
        .essais-corps { --couv: 14.5rem; --couv-ecart: 1.6rem; }
        .rayon {
          display: grid; grid-template-columns: repeat(3, var(--couv));
          justify-content: center; gap: 2rem var(--couv-ecart);
        }
        /* La barre se borne au rayon qu'elle surmonte et s'y centre. En deçà, le
           conteneur est déjà plus étroit qu'elle et le maximum ne mord pas. */
        .essais-onglets { max-width: calc(3 * var(--couv) + 2 * var(--couv-ecart)); }

        /* Une couverture : proportion d'un petit livre, couleur pleine, composition
           CENTRÉE et EN EMPATTEMENT, comme une page de titre gravée. La face
           s'ordonne en six temps du haut vers le bas : auteur, catégorie, titre,
           sous-titre, emblème, date. C'est cette suite, non un cadre, qui fait le
           livre ancien. Deux losanges filetés séparaient jadis ces temps ; ils ont
           été retirés, la gravure suffisant désormais à tenir le milieu de la page.
           Bloc volontairement bridé : elle n'a pas à occuper le tiers d'un écran
           large. Elle se cale au milieu de sa case, et toute sa typographie est
           donnée en cqw, pourcentage de SA largeur, de sorte qu'elle garde ses
           proportions qu'elle occupe 14 rem ou toute la colonne d'un téléphone.
           ⚠️ Jamais d'accent grave dans ce bloc : il vit dans un littéral de
           gabarit, et un accent grave le referme. */
        .couverture {
          container-type: inline-size;
          position: relative; display: flex; flex-direction: column;
          aspect-ratio: 2 / 3; overflow: hidden;
          border-radius: 2px; text-decoration: none; isolation: isolate;
          font-family: var(--font-source-serif), Georgia, serif;
          font-kerning: normal; font-variant-ligatures: common-ligatures contextual;
          text-rendering: optimizeLegibility;
          box-shadow: 0 1px 2px rgba(40,30,15,0.18), 0 10px 22px -12px rgba(40,30,15,0.40);
          transition: transform 0.24s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.24s ease;
        }
        /* Vignette très douce : le papier prend du grain au lieu de rester un aplat.
           La lumière en haut à gauche, l'ombre au bord. C'est ce qui fait le
           cartonnage plutôt que le rectangle coloré. */
        .couverture::after {
          content: ""; position: absolute; inset: 0; z-index: 7; pointer-events: none;
          background:
            radial-gradient(120% 90% at 22% 8%, rgba(255,255,255,0.09), rgba(255,255,255,0) 58%),
            radial-gradient(130% 100% at 50% 100%, rgba(0,0,0,0.16), rgba(0,0,0,0) 62%);
        }
        .couverture:hover { transform: translateY(-5px); box-shadow: 0 2px 6px rgba(40,30,15,0.22), 0 22px 38px -14px rgba(40,30,15,0.48); }


        /* ⛔ La TÊTE, c'est-à-dire le nom de l'auteur et l'étoile des favoris, et le
           CADRE n'appartiennent à aucune des deux faces : ils sont posés sur le carton
           lui-même. C'est ce qui les rend IMMOBILES quand la couverture se retourne :
           un nom d'auteur qui saute de trois pixels au survol défait toute l'illusion
           du livre. Ne jamais les redescendre dans la règle .couverture-face, même pour
           simplifier le balisage. */
        .couverture-tete {
          position: relative; z-index: 3;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 10cqw 8cqw 0;
        }
        /* Le corps occupe tout ce qui reste sous la tête, et les deux faces s'y
           superposent : elles reçoivent donc exactement la même boîte, sans qu'aucune
           mesure ait à être recopiée d'une règle à l'autre. */
        .couverture-corps { position: relative; z-index: 2; flex: 1; min-height: 0; }
        /* La suite verticale. Rien n'est posé en absolu : chaque temps pousse le
           suivant, et l'emblème, seul à porter des marges automatiques, absorbe la
           hauteur qui reste. Un titre de quatre lignes serre donc la composition au
           lieu de la faire déborder. */
        .couverture-face {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 0 8cqw 7.5cqw;
          transition: opacity 0.22s ease;
        }
        /* Cadre doublé, comme un cartonnage d'éditeur : un filet net au bord, un
           second en retrait. Le retrait vaut la moitié du blanc de tête, ce qui
           assied le cadre sur la composition au lieu de la cerner de trop près.
           ⚠️ Son inset est SYMÉTRIQUE depuis que le dos de reliure a disparu : la
           bande sombre du bord gauche mangeait cinq pixels, et le cadre comme les
           deux paddings les compensaient. Sans elle, ces compensations décentraient
           la composition vers la droite. */
        /* ⛔ En Cuir, la reliure change de peau. Le carton porte ses six valeurs en
           propriétés personnalisées ; seule cette règle décide. */
        :root[data-theme="sombre"] .couverture {
          background: var(--couv-fond-s) !important;
          color: var(--couv-encre-s) !important;
        }
        :root[data-theme="sombre"] .couverture-dos { background: var(--couv-fond-s) !important; }
        :root[data-theme="sombre"] .couverture-cadre { border-color: var(--couv-filet-s) !important; }
        .couverture-cadre { position: absolute; inset: 3.4cqw 3.2cqw 3.2cqw; border: 1px solid; pointer-events: none; z-index: 4; }
        .couverture-cadre::before { content: ""; position: absolute; inset: 1.7cqw; border: 1px solid currentColor; opacity: 0.42; }

        .couverture-auteur {
          font-size: 4cqw; font-weight: 400; line-height: 1.3;
          font-variation-settings: "opsz" 9, "wght" 400;
          letter-spacing: 0.24em; text-transform: uppercase; opacity: 0.9;
          padding-left: 0.24em; /* compense l'interlettrage, qui décentre à droite */
        }

        /* La catégorie, en capitales espacées : elle annonce le genre avant le titre,
           comme la mention de collection d'un éditeur. */
        .couverture-categorie {
          margin: 4.4cqw 0 4.6cqw;
          font-size: 4cqw; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.84;
          font-variation-settings: "opsz" 9, "wght" 400;
          padding-left: 0.28em;
        }
        /* Le titre : la seule grande chose de la couverture. Ecrêté à quatre lignes,
           faute de quoi un titre-fleuve chasserait la date hors du carton. */
        .couverture-titre {
          font-size: 10.4cqw; font-weight: 400; line-height: 1.08; letter-spacing: -0.012em;
          font-variation-settings: "opsz" 44, "wght" 400;
          text-wrap: balance;
          overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4;
        }
        /* Pas de largeur bornée : le retrait de la face suffit à tenir la mesure, et
           un plafond en em coupait le sous-titre trop court, sur un mot esseulé. */
        .couverture-soustitre {
          margin-top: 3.4cqw;
          font-size: 4.4cqw; font-weight: 400; line-height: 1.42; opacity: 0.84; text-wrap: balance;
          font-variation-settings: "opsz" 14, "wght" 400;
          overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3;
        }
        /* L'emblème : la vignette gravée. Ses marges automatiques le centrent dans le
           blanc qui reste entre le sous-titre et la date. Sa largeur est passée de 42
           à 50cqw le jour où les losanges ont disparu : la place qu'ils occupaient
           revient au dessin, qui est ce qu'on vient voir.

           Sur l'OPACITÉ, qui revient six fois dans ce bloc et n'est pas un bricolage.
           La couverture n'a qu'une encre, celle que l'auteur a choisie, prise partout
           par currentColor. Toute la hiérarchie se fait donc en INTENSITÉS de cette
           encre unique, et non en couleurs : nom 0.9, emblème 0.9, catégorie et titre
           0.76, date 0.66, filet du cadre 0.42. Écrire à la place des teintes fixes
           obligerait à les décliner six fois, une par couverture, ce que currentColor
           existe précisément pour éviter.

           L'emblème est passé de 0.82 à 0.9, au rang du nom de l'auteur : depuis qu'il
           occupe le centre de la face, les trois dessins les plus clairs (Philosophie,
           Spiritualité, Théologie) s'effaçaient. Mesuré sur le vert d'encre, le gain
           est de 9 % de contraste. Ne pas monter à 1 : le tronc d'Histoire, le plus
           chargé des dix, se met alors à disputer le titre. */
        .couverture-embleme { display: block; margin: auto 0; width: 50cqw; opacity: 0.9; }
        .couverture-embleme svg { display: block; width: 100%; height: auto; }
        /* Le pied garde son blanc au-dessus même quand l'emblème remplit tout : la
           date ne se colle jamais au dessin. */
        .couverture-pied { margin-top: 4cqw; display: flex; flex-direction: column; align-items: center; }
        .couverture-date {
          font-size: 3.3cqw; letter-spacing: 0.24em; text-transform: uppercase; opacity: 0.78;
          padding-left: 0.24em; font-variation-settings: "opsz" 9, "wght" 400;
        }

        .couverture-etoile { position: absolute; top: 9.6cqw; right: 7cqw; z-index: 8; line-height: 1; }

        /* La quatrième : elle se retourne au survol. Même famille que la face — la
           couverture entière est en empattement — mais une composition plus large :
           un blanc de marge presque double, et le texte tenu loin du cadre. Un
           résumé collé au filet ne se lit pas comme une quatrième, mais comme une
           étiquette. */
        .couverture-dos {
          position: absolute; inset: 0; z-index: 3;
          display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
          padding: 5cqw 11cqw 15cqw 11.8cqw;
          opacity: 0; pointer-events: none; transition: opacity 0.22s ease;
        }
        .couverture:hover .couverture-dos { opacity: 1; pointer-events: auto; }
        .couverture:hover .couverture-face { opacity: 0; }
        /* Le résumé prend une interligne large et une coupe de petit corps : c'est un
           paragraphe de lecture, pas une légende. Écrêté à sept lignes — une de moins
           qu'avant, le blanc valant mieux que la ligne de trop. */
        .couverture-resume {
          font-size: 4.6cqw; line-height: 1.62; opacity: 0.94;
          font-variation-settings: "opsz" 12, "wght" 400;
          text-wrap: pretty;
          overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 7;
        }
        /* « Lire » : ni cadre ni flèche. Un mot, espacé, sous un filet qui s'éteint
           aux deux bouts — le même dessin que les filets de la face. */
        .couverture-lire {
          margin-top: 7cqw; position: relative;
          font-size: 3.4cqw; font-weight: 400; letter-spacing: 0.3em; text-transform: uppercase;
          padding-left: 0.3em; opacity: 0.88;
          font-variation-settings: "opsz" 9, "wght" 400;
          transition: opacity 0.2s ease;
        }
        .couverture-lire::before {
          content: ""; position: absolute; left: 50%; top: -3.6cqw;
          width: 24cqw; height: 1px; transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, currentColor 30%, currentColor 70%, transparent);
          opacity: 0.5;
        }
        .couverture:hover .couverture-lire { opacity: 1; }
        /* Les chiffres au pied, hors du bloc de lecture : ils appartiennent au carton,
           pas au texte. Assez bas pour laisser respirer le résumé, assez haut pour
           rester dans le cadre. */
        .couverture-dos-meta {
          position: absolute; left: 0; right: 0; bottom: 8cqw;
          display: flex; align-items: center; justify-content: center; gap: 3.4cqw;
          font-size: 3cqw; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.56;
          font-variation-settings: "opsz" 9, "wght" 400;
        }

        @media (max-width: 900px) { .rayon { grid-template-columns: repeat(2, 14.5rem); gap: 1.4rem 1.2rem; } }
        @media (max-width: 520px) { .rayon { grid-template-columns: 14.5rem; } }

        /* Tactile : rien ne se survole. La face reste, le dos ne s'affiche jamais ;
           le résumé se lit sur la page de la publication, à un doigt de là. */
        @media (hover: none) {
          .couverture-dos { display: none; }
          .couverture:hover .couverture-face { opacity: 1; }
          .couverture:hover { transform: none; }
        }
      `}</style>

      {tries.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun essai trouvé.</p>
      ) : (
        <>
          <div className="publications-sommaire-tete"><span>Au sommaire</span></div>
          <div className="rayon">
            {tries.map(e => (
              <CouvertureEssai key={e.id} essai={e} plusLu={plusLus.has(e.id)}
                favorisEssais={favorisEssais} toggleFavoriEssai={toggleFavoriEssai} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

// Une publication se présente comme un petit livre. La face porte le nom de
// l'auteur, le titre, le sous-titre et la date ; la quatrième, qui se retourne au
// survol, porte le résumé et le bouton « Lire ». La couleur est celle que l'auteur
// a choisie (voir app/lib/couverturesEssai.ts).
function CouvertureEssai({ essai: e, plusLu, favorisEssais, toggleFavoriEssai }: {
  essai: EssaiResume; plusLu: boolean
  favorisEssais: Set<string>; toggleFavoriEssai: (id: string) => void
}) {
  // Sans choix de l'auteur, la couleur est TIRÉE de l'identifiant : variée d'une
  // publication à l'autre, mais stable pour chacune.
  const c = couvertureDe(e.couverture, e.id)
  // Le premier registre annonce le genre sous le nom de l’auteur ; les autres
  // servent au filtrage et n’ont pas leur place ici.
  const categorie = e.categories?.[0] ?? null
  // L’EMBLÈME, lui, ne suit pas forcément ce premier registre : l’auteur choisit
  // lequel de ses registres illustre sa couverture (`essais.embleme`).
  const categorieDessin = categorieEmblemeDe(e.categories, e.embleme)
  // Titre, sous-titre et résumé sont tapés par l’auteur dans un formulaire : ils
  // arrivent avec l’apostrophe droite et la ponctuation collée du clavier. La norme
  // s’applique AU RENDU (charte §3.2), jamais dans la donnée.
  const titre = normaliserSaisie(e.titre)
  const sousTitre = e.sous_titre ? normaliserSaisie(e.sous_titre) : null
  const resume = e.resume ? normaliserSaisie(e.resume) : null
  return (
    <Link href={`/essais/${e.id}`} className="couverture"
      /* ⛔ Le carton porte ses SIX valeurs en propriétés personnalisées, et c'est le
         CSS qui choisit selon le thème. Choisir en JavaScript ferait paraître la
         couverture dans une teinte puis sauter dans l'autre après l'hydratation. */
      style={{
        '--couv-fond': c.fond, '--couv-encre': c.encre, '--couv-filet': c.filet,
        '--couv-fond-s': c.fondSombre, '--couv-encre-s': c.encreSombre, '--couv-filet-s': c.filetSombre,
        background: 'var(--couv-fond)', color: 'var(--couv-encre)',
      } as React.CSSProperties}
      title={`${e.titre} — ${e.auteur}`}>

      {/* La tête et le cadre sont posés sur le CARTON, hors des deux faces : ils ne
          bougent pas d'un pixel quand la couverture se retourne. */}
      <span className="couverture-cadre" style={{ borderColor: "var(--couv-filet)" }} aria-hidden="true" />
      <span className="couverture-tete">
        <span className="couverture-auteur">{e.auteur}</span>
        <span className="couverture-etoile">
          <EtoileFavori actif={favorisEssais.has(String(e.id))} onToggle={() => toggleFavoriEssai(String(e.id))} size={13} />
        </span>
      </span>

      <span className="couverture-corps">
        <span className="couverture-face">
          {categorie && <span className="couverture-categorie">{categorie}</span>}
          <span className="couverture-titre">{titre}</span>
          {sousTitre && <span className="couverture-soustitre">{sousTitre}</span>}
          {/* L'emblème est un ornement, pas une information : il double la catégorie,
              déjà écrite au-dessus, et n'a donc rien à annoncer. */}
          <span className="couverture-embleme" aria-hidden="true">
            <svg viewBox="0 0 64 64" role="presentation">{emblemeDe(categorieDessin)}</svg>
          </span>
          <span className="couverture-pied">
            {e.publie_at && <span className="couverture-date">{formaterDateLongue(e.publie_at)}</span>}
          </span>
        </span>

        {/* La quatrième de couverture. `aria-hidden` : le résumé est déjà porté par
            le titre du lien et par la page de la publication ; ce calque est un
            doublon visuel, il n'a pas à être annoncé deux fois. */}
        <span className="couverture-dos" style={{ background: "var(--couv-fond)" }} aria-hidden="true">
          {resume
            ? <span className="couverture-resume">{resume}</span>
            : <span className="couverture-resume" style={{ opacity: 0.7, fontStyle: 'italic' }}>{titre}</span>}
          <span className="couverture-lire">Lire</span>
          <span className="couverture-dos-meta">
            <span>{e.nb_vues} vue{e.nb_vues !== 1 ? 's' : ''}</span>
            {e.nb_likes > 0 && <span>♥ {e.nb_likes}</span>}
            {plusLu && <span>◆ parmi les plus lus</span>}
          </span>
        </span>
      </span>
    </Link>
  )
}

function OngletEcrire({ connecte }: { connecte: boolean | null }) {
  if (connecte === false) {
    return (
      <div style={{ textAlign: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '28px 24px', maxWidth: '32.5rem', margin: '0 auto' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', marginBottom: '14px' }}>Connectez-vous pour écrire un essai ou une méditation.</p>
        <Link href="/chantier" style={{ display: 'inline-block', padding: '8px 18px', fontSize: '0.78125rem', fontWeight: 600, background: 'var(--cs-vert-aplat)', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>
          Se connecter
        </Link>
      </div>
    )
  }
  if (connecte === null) return <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
  return (
    <div style={{ maxWidth: '38.75rem', margin: '0 auto', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '30px 34px', textAlign: 'center' }}>
      <p style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 8px' }}>
        Espace de rédaction
      </p>
      <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.375rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: '0 0 10px' }}>
        Écrire une publication
      </h2>
      <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.65, margin: '0 auto 20px', maxWidth: '27.5rem' }}>
        Le titre, le résumé, les catégories et le texte se renseignent désormais dans la même page.
      </p>
      <Link href="/essais/nouveau?depuis=publications" style={{ display: 'inline-block', padding: '9px 22px', fontSize: '0.78125rem', fontWeight: 600, background: 'var(--cs-vert-aplat)', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>
        Ouvrir la rédaction
      </Link>
    </div>
  )
}

function OngletMesEcrits({
  connecte, essais, changerStatut, supprimer,
}: {
  connecte: boolean | null; essais: EssaiPerso[] | null
  changerStatut: (id: number, statut: string) => Promise<void>; supprimer: (id: number) => Promise<void>
}) {
  const [filtre, setFiltre] = useState<'tous' | 'brouillon' | 'verification' | 'publie' | 'a_reviser' | 'refuse'>('tous')
  const [toggles, setToggles] = useState<Record<number, number>>({})
  const [maintenant, setMaintenant] = useState(Date.now())

  useEffect(() => {
    const aUnTimerActif = () => (essais ?? []).some(e => {
      const t = toggles[e.id] ?? Number(window.localStorage.getItem(`essai-publication-toggle-${e.id}`) ?? 0)
      return t > 0 && (Date.now() - t) < 60 * 60 * 1000
    })
    if (!aUnTimerActif()) return
    const timer = window.setInterval(() => {
      setMaintenant(Date.now())
      if (!aUnTimerActif()) window.clearInterval(timer)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [essais, toggles])

  if (connecte === false) {
    return <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-danger-fonce)', fontStyle: 'italic' }}>Connectez-vous pour voir vos écrits.</p>
  }
  if (essais === null) return <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
  if (essais.length === 0) return <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun écrit pour l&apos;instant.</p>

  const groupes = [
    { key: 'tous' as const, label: 'Tous', test: (_: EssaiPerso) => true },
    { key: 'brouillon' as const, label: 'Brouillons', test: (e: EssaiPerso) => e.statut === 'brouillon' },
    { key: 'verification' as const, label: 'En vérification', test: (e: EssaiPerso) => e.statut === 'en_attente' },
    { key: 'publie' as const, label: 'Publiés', test: (e: EssaiPerso) => e.statut === 'publie' },
    { key: 'a_reviser' as const, label: 'À réviser', test: (e: EssaiPerso) => e.statut === 'a_reviser' },
    { key: 'refuse' as const, label: 'Refusés', test: (e: EssaiPerso) => e.statut === 'refuse' },
  ]
  const groupeActif = groupes.find(g => g.key === filtre) ?? groupes[0]
  const essaisFiltres = essais.filter(groupeActif.test)

  const derniereAction = (id: number) => {
    if (toggles[id]) return toggles[id]
    if (typeof window === 'undefined') return 0
    return Number(window.localStorage.getItem(`essai-publication-toggle-${id}`) ?? 0)
  }
  const basculerPublication = async (e: EssaiPerso) => {
    const dernier = derniereAction(e.id)
    // « Déjà validée » = possède un publie_at (validée au moins une fois). On ne compare
    // plus updated_at à publie_at : publie_at est figé à la 1re publication alors que
    // updated_at avance à chaque édition, ce qui désactivait à tort la republication. Le
    // serveur (trigger forcer_statut_essai) reste seul juge : contenu modifié → en_attente.
    const dejaValide = e.statut === 'publie' || (e.statut === 'brouillon' && !!e.publie_at)
    if (!dejaValide) { alert("Cet écrit doit d'abord être validé par l'administration."); return }
    const restant = 60 * 60 * 1000 - (Date.now() - dernier)
    if (restant > 0) {
      const minutes = Math.ceil(restant / 60000)
      alert(`Vous pourrez modifier la publication de cet écrit dans ${minutes} minute${minutes > 1 ? 's' : ''}.`)
      return
    }
    await changerStatut(e.id, e.statut === 'publie' ? 'brouillon' : 'publie')
    const now = Date.now()
    if (typeof window !== 'undefined') window.localStorage.setItem(`essai-publication-toggle-${e.id}`, String(now))
    setToggles(prev => ({ ...prev, [e.id]: now }))
  }

  return (
    <div style={{ maxWidth: '42.5rem', margin: '0 auto' }}>
      {/* Filtres — puces discrètes ; le compteur ne s'affiche que s'il y a des écrits. */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {groupes.map(g => {
          const actif = filtre === g.key
          const nb = essais.filter(g.test).length
          return (
            <button key={g.key} onClick={() => setFiltre(g.key)}
              style={{ fontSize: '0.625rem', padding: '3px 10px', borderRadius: '999px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.09)' : 'transparent', color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', cursor: 'pointer', fontWeight: actif ? 700 : 500, letterSpacing: '0.01em' }}>
              {g.label}{nb > 0 ? <span style={{ opacity: 0.55, marginLeft: '4px' }}>{nb}</span> : null}
            </button>
          )
        })}
      </div>
      {essaisFiltres.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun écrit dans cet onglet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {essaisFiltres.map(e => {
            const st = STATUTS[e.statut] ?? { label: e.statut, couleur: 'var(--cs-texte-doux)' }
            const date = e.publie_at ?? e.updated_at
            const statutStyle = styleStatut(e.statut)
            const dernier = derniereAction(e.id)
            const restant = Math.max(0, 60 * 60 * 1000 - (maintenant - dernier))
            const verrouille = restant > 0
            // « Déjà validée » = possède un publie_at (validée au moins une fois). On ne compare
    // plus updated_at à publie_at : publie_at est figé à la 1re publication alors que
    // updated_at avance à chaque édition, ce qui désactivait à tort la republication. Le
    // serveur (trigger forcer_statut_essai) reste seul juge : contenu modifié → en_attente.
    const dejaValide = e.statut === 'publie' || (e.statut === 'brouillon' && !!e.publie_at)
            const peutBasculer = dejaValide && (e.statut === 'publie' || e.statut === 'brouillon')
            const timer = verrouille ? formatTimer(restant) : ''
            return (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', background: statutStyle.fond, border: `1px solid ${statutStyle.bordure}`, borderLeft: `3px solid ${statutStyle.accent}`, borderRadius: '8px', padding: '8px 12px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.875rem', color: 'var(--cs-encre-fonce)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.titre}</span>
                    {e.sous_titre && <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic' }}>{e.sous_titre}</span>}
                  </div>
                  {/* Méta sur UNE seule ligne : statut · date · vues · cœurs. La révision en
                      cours est signalée là, sans encart séparé. */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '0.59375rem', color: 'var(--cs-texte-faible)', marginTop: '2px' }}>
                    <span style={{ color: st.couleur, fontWeight: 700 }}>{st.label}</span>
                    <span>{date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sans date'}</span>
                    <span>{e.nb_vues ?? 0} vue{(e.nb_vues ?? 0) > 1 ? 's' : ''}</span>
                    <span>♥ {e.nb_likes ?? 0}</span>
                    {e.statut === 'en_attente' && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--cs-attente)', fontWeight: 600 }}>
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.2" stroke="#9a5a2a" strokeWidth="1.4"/>
                          <path d="M8 4.6V8l2.4 1.6" stroke="#9a5a2a" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        révision en cours
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <button onClick={() => basculerPublication(e)} disabled={!peutBasculer || verrouille}
                    title={!dejaValide ? "Publication possible après validation par l'administration." : verrouille ? 'Interrupteur disponible une heure après le dernier changement.' : e.statut === 'publie' ? 'Dépublier' : 'Publier'}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.625rem', color: e.statut === 'publie' ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', background: 'transparent', border: 'none', padding: 0, cursor: !peutBasculer || verrouille ? 'default' : 'pointer', opacity: !peutBasculer ? 0.4 : 1, fontWeight: 600 }}>
                    {timer && <span style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-doux)', fontWeight: 600 }}>{timer}</span>}
                    <span style={{ width: '26px', height: '14px', borderRadius: '999px', background: e.statut === 'publie' ? 'var(--cs-vert-aplat)' : 'var(--cs-bord)', position: 'relative', display: 'inline-block', transition: 'background 0.15s' }}>
                      <span style={{ position: 'absolute', top: '2px', left: e.statut === 'publie' ? '14px' : '2px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--cs-surface)', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                    </span>
                  </button>
                  <Link href={`/essais/${e.id}/modifier`} style={{ fontSize: '0.65625rem', color: 'var(--cs-vert)', textDecoration: 'none', fontWeight: 600 }}>Modifier</Link>
                  <button onClick={() => supprimer(e.id)} style={{ fontSize: '0.65625rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Supprimer</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Suggestion aléatoire ─────────────────────────────────────────────────────

const TOTAL_VERSETS = 41899
const MAX_SUGGESTIONS_JOUR = 3

type VerseSug = { id_verset: string; livre: string; chapitre: number; verset: number; texte: string }

function cleJour() {
  return `suggestion-versets-${new Date().toISOString().slice(0, 10)}`
}

function lireSuggestionsJour(): VerseSug[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(cleJour()) ?? '[]') }
  catch { return [] }
}

async function piocherVerset(essais = 0): Promise<VerseSug | null> {
  if (essais > 5) return null
  const offset = Math.floor(Math.random() * TOTAL_VERSETS)
  const { data } = await supabase
    .from('versets_lecture')
    .select('id_verset, livre, chapitre, verset, TR0001, TR0002')
    .range(offset, offset)
  const row = data?.[0]
  if (!row) return piocherVerset(essais + 1)
  const texte = ((row.TR0001 as string | null) || (row.TR0002 as string | null) || '').trim()
  if (!texte) return piocherVerset(essais + 1)
  return { id_verset: row.id_verset as string, livre: row.livre as string, chapitre: row.chapitre as number, verset: row.verset as number, texte }
}

function OngletSuggestion({ connecte }: { connecte: boolean | null }) {
  const [versets, setVersets] = useState<VerseSug[]>([])
  const [index, setIndex] = useState(0)
  const [chargement, setChargement] = useState(false)
  const initialise = useRef(false)

  useEffect(() => {
    if (initialise.current) return
    initialise.current = true
    const existants = lireSuggestionsJour()
    if (existants.length > 0) {
      setVersets(existants)
      setIndex(existants.length - 1)
    } else {
      charger([])
    }
  }, [])

  const charger = async (base: VerseSug[]) => {
    if (base.length >= MAX_SUGGESTIONS_JOUR) return
    setChargement(true)
    const v = await piocherVerset()
    setChargement(false)
    if (!v) return
    const nouveaux = [...base, v]
    localStorage.setItem(cleJour(), JSON.stringify(nouveaux))
    setVersets(nouveaux)
    setIndex(nouveaux.length - 1)
  }

  const verset = versets[index]
  const peutRelancer = versets.length < MAX_SUGGESTIONS_JOUR

  return (
    <div style={{ maxWidth: '35rem', margin: '0 auto', textAlign: 'center', paddingTop: '8px' }}>
      {!verset ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', marginTop: '20px' }}>
          {chargement ? 'Chargement…' : 'Impossible de charger une suggestion.'}
        </p>
      ) : (
        <>
          <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '34px 36px 28px', marginBottom: '18px' }}>
            <p style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 20px' }}>
              Verset proposé à la méditation
            </p>
            <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', lineHeight: 1.8, color: 'var(--cs-encre-fonce)', fontStyle: 'italic', margin: '0 0 18px' }}>
              «&#8201;{rendreTexteEnrichi(verset.texte)}&#8201;»
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', margin: 0 }}>
              {ABREV_FR[verset.livre] ?? verset.livre} {verset.chapitre},{verset.verset}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
            <Link
              href="/essais/nouveau?depuis=publications"
              onClick={() => {
                const ref = `${LIVRES.find(l => l.code === verset.livre)?.nom ?? verset.livre} ${verset.chapitre},${verset.verset}`
                sessionStorage.setItem('suggestion-verset-en-tete', JSON.stringify({ ref, texte: verset.texte }))
              }}
              style={{ display: 'inline-block', padding: '9px 22px', fontSize: '0.78125rem', fontWeight: 600, background: 'var(--cs-vert-aplat)', color: '#fff', borderRadius: '4px', textDecoration: 'none' }}>
              Écrire sur ce verset
            </Link>
            <Link
              href={`/?livre=${verset.livre}&chapitre=${verset.chapitre}&verset=${verset.verset}`}
              style={{ display: 'inline-block', padding: '9px 16px', fontSize: '0.78125rem', color: 'var(--cs-vert)', borderRadius: '4px', textDecoration: 'none', border: '1px solid #c8d8cc' }}>
              Lire dans la Bible
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <button
              onClick={() => charger(versets)}
              disabled={!peutRelancer || chargement}
              style={{ fontSize: '0.71875rem', color: peutRelancer ? 'var(--cs-vert)' : 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: peutRelancer ? 'pointer' : 'default', padding: 0, textDecoration: peutRelancer && !chargement ? 'underline' : 'none', fontStyle: 'italic' }}>
              {chargement ? 'Chargement…' : peutRelancer ? 'Autre suggestion' : 'Limite atteinte pour aujourd\'hui'}
            </button>
            <span style={{ fontSize: '0.625rem', color: 'var(--cs-bord)' }}>({versets.length}/{MAX_SUGGESTIONS_JOUR})</span>
          </div>

          {versets.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
              {versets.map((_, i) => (
                <button key={i} onClick={() => setIndex(i)}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === index ? 'var(--cs-vert-aplat)' : 'var(--cs-bord)', border: 'none', cursor: 'pointer', padding: 0, transition: 'background 0.13s' }} />
              ))}
            </div>
          )}
        </>
      )}

      {connecte === false && (
        <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', marginTop: '18px', fontStyle: 'italic' }}>
          <Link href="/chantier" style={{ color: 'var(--cs-vert)', textDecoration: 'underline' }}>Connectez-vous</Link> pour enregistrer votre méditation.
        </p>
      )}
    </div>
  )
}

function tagFiltre(actif: boolean): React.CSSProperties {
  // Tags resserrés et plus légers : pastilles fines, sans bordure au repos ; l'actif se
  // marque d'un aplat vert discret. Plus élégant que les anciens contours gris.
  return {
    fontSize: '0.625rem', padding: '3px 10px', borderRadius: '999px',
    border: '1px solid ' + (actif ? 'var(--cs-vert)' : 'transparent'),
    background: actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'rgba(120,110,96,0.06)',
    color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', cursor: 'pointer',
    fontWeight: actif ? 600 : 400, letterSpacing: '0.02em', lineHeight: 1.3,
    transition: 'background 0.12s, color 0.12s',
  }
}
function formatTimer(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const secondes = total % 60
  return `${minutes}:${String(secondes).padStart(2, '0')}`
}
function styleStatut(statut: string): { fond: string; bordure: string; accent: string } {
  if (statut === 'publie') return { fond: 'rgba(var(--cs-vert-rgb),0.075)', bordure: 'rgba(var(--cs-vert-rgb),0.24)', accent: 'var(--cs-vert)' }
  if (statut === 'en_attente') return { fond: 'rgba(154,90,42,0.075)', bordure: 'rgba(154,90,42,0.24)', accent: 'var(--cs-attente)' }
  if (statut === 'a_reviser') return { fond: 'rgba(var(--cs-danger-rgb),0.08)', bordure: 'rgba(var(--cs-danger-rgb),0.25)', accent: 'var(--cs-danger)' }
  if (statut === 'refuse') return { fond: 'rgba(160,45,45,0.08)', bordure: 'rgba(160,45,45,0.25)', accent: '#a02d2d' }
  return { fond: '#fff', bordure: 'var(--cs-bord-clair)', accent: 'var(--cs-bord)' }
}
