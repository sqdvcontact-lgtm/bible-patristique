'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { CATEGORIES_ESSAIS } from './EtapeMetadonnees'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import OngletsPage from '@/app/components/OngletsPage'
import VisiteGuidee from '@/app/components/VisiteGuidee'
import { CLE_VISITE_COMMUNAUTE, VISITE_COMMUNAUTE } from '@/app/lib/visiteCommunaute'
import { offrirLaVisite } from '@/app/lib/demandeDeVisite'
import { useCompte } from '@/app/lib/contexteCompte'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { couvertureDe } from '@/app/lib/couverturesEssai'
import { categoriePrincipale, FleuronGenre } from '@/app/lib/fleuronsCouverture'
import { normaliserSaisie } from '@/app/lib/typographie'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'
import { ENCRE_TITRE, GRAISSE_TITRE, INTERLIGNE_TITRE_PAGE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import MarqueMecene from '@/app/components/MarqueMecene'
import { OPTION_VOLET, RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import { PisteInterrupteur } from '@/app/compte/champsCompte'
import { SERIF, SANS } from '@/app/lib/polices'
import { MentionVide } from '@/app/components/EtatVideVolet'
import { HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'

const CATEGORIES = CATEGORIES_ESSAIS

type Onglet = 'communaute' | 'mes-ecrits' | 'ecrire' | 'suggestion'

type EssaiResume = {
  id: number; titre: string; sous_titre: string | null; resume: string | null
  categories: string[]; nb_vues: number; nb_likes: number; publie_at: string | null; auteur: string
  user_id?: string | null
  /** L'auteur porte-t-il la marque de mécène. Voir app/components/MarqueMecene.tsx. */
  mecene?: boolean
  /** Clé de la couleur de couverture choisie par l'auteur (voir couverturesEssai.ts). */
  couverture?: string | null
  /** Catégorie principale, écrite sur la couverture et qui en donne le fleuron. */
  embleme?: string | null
}

type EssaiPerso = {
  id: number; titre: string; sous_titre: string | null; statut: string
  updated_at: string | null; publie_at: string | null; nb_vues: number | null; nb_likes: number
  anonyme?: boolean
  note_admin?: string | null
}

const STATUTS: Record<string, { label: string; couleur: string }> = {
  brouillon: { label: 'Brouillon', couleur: 'var(--cs-texte-doux)' },
  en_attente: { label: 'En attente', couleur: 'var(--cs-attente)' },
  publie: { label: 'Publié', couleur: 'var(--cs-vert)' },
  a_reviser: { label: 'À revoir', couleur: 'var(--cs-danger)' },
  refuse: { label: 'Refusé', couleur: 'var(--cs-danger)' },
}

// La recherche compare des formes PLIÉES : sans accents, sans casse, et avec la
// typographie du rendu ramenée à celle du clavier. La page affiche l'apostrophe
// courbe (normaliserSaisie) ; un titre recopié depuis elle doit se retrouver.
function plier(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’‘ʼ]/g, "'").replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/[  ]/g, ' ')
}

// ── L'état du rayon vit dans l'ADRESSE ──
// Onglet, catégorie, recherche et ordre : ouvrir une publication puis revenir les
// retrouve, et un rayon filtré se partage par son lien. On lit l'adresse après le
// montage et on l'écrit par `history.replaceState` : `useSearchParams` ferait
// perdre à la page son rendu statique (revalidate). Les autres paramètres, dont
// `?visite`, ne sont pas touchés.
type Ordre = 'recents' | 'lus'
const ONGLETS_ADRESSE: Record<string, Onglet> = { 'mes-ecrits': 'mes-ecrits', ecrire: 'ecrire' }

function ecrireAdresse(valeurs: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search)
  for (const [cle, v] of Object.entries(valeurs)) {
    if (v) params.set(cle, v)
    else params.delete(cle)
  }
  const chaine = params.toString()
  const cible = window.location.pathname + (chaine ? `?${chaine}` : '') + window.location.hash
  if (cible !== window.location.pathname + window.location.search + window.location.hash) {
    // `null`, comme le veut Next.js : il reprend alors l'adresse dans son routeur, et
    // le retour arrière depuis une publication rend le rayon filtré.
    window.history.replaceState(null, '', cible)
  }
}

export default function EssaisListeClient({ essais }: { essais: EssaiResume[] }) {
  const [onglet, setOnglet] = useState<Onglet>('communaute')
  // Sous-onglet de « Écrire » : rédiger un texte, ou commenter un verset aléatoire.
  const [sousEcrire, setSousEcrire] = useState<'rediger' | 'suggestion'>('rediger')
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState<string | null>(null)
  const [ordre, setOrdre] = useState<Ordre>('recents')
  const [mesEcrits, setMesEcrits] = useState<EssaiPerso[] | null>(null)
  const [connecte, setConnecte] = useState<boolean | null>(null)

  // Lecture de l'adresse, une fois, après le montage. Tant qu'elle n'est pas lue,
  // on n'écrit rien : l'état par défaut effacerait les paramètres qu'on vient de suivre.
  const [adresseLue, setAdresseLue] = useState(false)
  // ⚠️ Dans un minuteur, non dans le corps de l'effet : un setState synchrone y
  // déclencherait un rendu en cascade (react-hooks/set-state-in-effect).
  useEffect(() => { const t = window.setTimeout(() => {
    const params = new URLSearchParams(window.location.search)
    const o = ONGLETS_ADRESSE[params.get('onglet') ?? '']
    if (o) setOnglet(o)
    if (params.get('ecrire') === 'verset') setSousEcrire('suggestion')
    const c = params.get('categorie')
    if (c && (CATEGORIES as readonly string[]).includes(c)) setFiltreCategorie(c)
    const r = params.get('q')
    if (r) setRecherche(r)
    if (params.get('tri') === 'lus') setOrdre('lus')
    setAdresseLue(true)
  }, 0); return () => window.clearTimeout(t) }, [])
  // La recherche s'écrit après une courte pause : pas une entrée d'historique par touche.
  useEffect(() => {
    if (!adresseLue) return
    const t = window.setTimeout(() => ecrireAdresse({
      onglet: onglet === 'communaute' ? null : onglet,
      ecrire: onglet === 'ecrire' && sousEcrire === 'suggestion' ? 'verset' : null,
      categorie: onglet === 'communaute' ? filtreCategorie : null,
      q: onglet === 'communaute' ? recherche.trim() || null : null,
      tri: onglet === 'communaute' && ordre === 'lus' ? 'lus' : null,
    }), 300)
    return () => window.clearTimeout(t)
  }, [adresseLue, onglet, sousEcrire, filtreCategorie, recherche, ordre])

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
      .select('id, titre, sous_titre, statut, updated_at, publie_at, nb_vues, anonyme, note_admin')
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

  // ⛔ La date de publication n'est pas à l'auteur : la base la fige (charte § 52). Elle
  // partait à chaque republication, et la notification « Publication acceptée », dont
  // la clé porte cette date, renaissait sous la signature de l'administration.
  const changerStatut = async (id: number, statut: string) => {
    await supabase.from('essais').update({ statut }).eq('id', id)
    await chargerMesEcrits()
  }

  const supprimer = async (id: number) => {
    if (!confirm('Supprimer définitivement cet écrit ?')) return
    // ⚠️ Lire l'erreur : la RLS refuse en SILENCE, et « supprimé » sans rien de
    // supprimé s'est vu (aucune politique DELETE jusqu'au 2026-09-03).
    const { error } = await supabase.from('essais').delete().eq('id', id)
    if (error) { alert(`La suppression a échoué : ${error.message}`); return }
    await chargerMesEcrits()
  }

  const q = plier(recherche.trim())
  const essaisFiltres = useMemo(() => essais.filter(e => {
    if (filtreCategorie && !e.categories.includes(filtreCategorie)) return false
    if (!q) return true
    // Le sous-titre est cherché : il est écrit sur la face, le lecteur le lit.
    return [e.auteur, e.titre, e.sous_titre, e.resume].some(x => !!x && plier(x).includes(q))
  }), [essais, filtreCategorie, q])

  // ⛔ Les plus lus se comptent sur TOUT le rayon, jamais sur ce que le filtre a
  // laissé : une recherche qui ne retenait que deux publications les sacrait toutes
  // deux « parmi les plus lus ».
  const plusLus = useMemo(() => new Set(
    [...essais]
      .sort((a, b) => (b.nb_vues - a.nb_vues) || (b.nb_likes - a.nb_likes))
      .slice(0, 3)
      .map(e => e.id),
  ), [essais])


  // ── La visite (charte § 46 ; mécanique : AGENTS.md, « LA VISITE ») ──
  // ⛔ On attend `profilPret` : le passage d'une visite vit sur le COMPTE.
  const { visiteFaite, oublierVisite, profilPret } = useCompte()
  const [visite, setVisite] = useState(0)
  const visiteProposee = useRef(false)
  const visitePossible = onglet === 'communaute' && essaisFiltres.length > 0
  useEffect(() => {
    if (!visitePossible || !profilPret || visiteProposee.current) return
    visiteProposee.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('visite')) oublierVisite(CLE_VISITE_COMMUNAUTE)
    else if (visiteFaite(CLE_VISITE_COMMUNAUTE)) return
    const depart = window.setTimeout(() => setVisite(1), 260)
    return () => window.clearTimeout(depart)
  }, [visitePossible, profilPret, visiteFaite, oublierVisite])
  // La barre n'offre son bouton que là où la visite peut se donner.
  useEffect(() => { if (!visitePossible) return; return offrirLaVisite(() => setVisite(n => n + 1)) }, [visitePossible])

  return (
    <main style={{
      background: 'var(--cs-fond)',
      // AUCUN paddingTop ici. Le décalage sous la navbar fixe est posé UNE SEULE fois
      // pour tout le site, par #cs-corps dans app/layout.tsx. Le répéter le comptait
      // deux fois — c'est la règle déjà appliquée à la Bibliothèque et aux traductions.
      minHeight: HAUTEUR_SOUS_NAVBAR,
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
          <h1 style={{ fontFamily: SERIF, fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, margin: 0, lineHeight: INTERLIGNE_TITRE_PAGE }}>
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
            ordre={ordre}
            setOrdre={setOrdre}
            essais={essaisFiltres}
            total={essais.length}
            plusLus={plusLus}
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
                  style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: `1px solid ${sousEcrire === s.key ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: sousEcrire === s.key ? 'rgba(var(--cs-vert-rgb),0.09)' : 'var(--cs-surface)', color: sousEcrire === s.key ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', fontWeight: sousEcrire === s.key ? 600 : 400, cursor: 'pointer' }}>
                  {s.label}
                </button>
              ))}
            </div>
            {sousEcrire === 'rediger' ? <OngletEcrire connecte={connecte} /> : <OngletSuggestion connecte={connecte} />}
          </>
        )}
      </div>
      {visite > 0 && <VisiteGuidee key={visite} visite={VISITE_COMMUNAUTE} onFin={() => setVisite(0)} />}
    </main>
  )
}


function formaterDateLongue(publie_at: string | null): string {
  if (!publie_at) return ''
  // ⚠️ Le fuseau est FIXÉ : la page est rendue sur un serveur à l'heure universelle
  // et réhydratée à l'heure du lecteur. Sans lui, une publication parue entre minuit
  // et deux heures portait deux dates, et React relevait le désaccord.
  return new Date(publie_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' })
}

function OngletCommunaute({
  recherche, setRecherche, filtreCategorie, setFiltreCategorie, ordre, setOrdre, essais, total, plusLus,
}: {
  recherche: string; setRecherche: (v: string) => void
  filtreCategorie: string | null; setFiltreCategorie: (v: string | null) => void
  ordre: Ordre; setOrdre: (v: Ordre) => void
  essais: EssaiResume[]; total: number; plusLus: Set<number>
}) {
  const { favoris: favorisEssais, toggle: toggleFavoriEssai } = useFavoris('essai')

  // Le filtrage par catégorie et par recherche se fait chez l'appelant : le rayon
  // reçoit déjà les publications retenues, et n'a plus qu'à les ordonner. Deux
  // ordres : le fil chronologique, du plus récent au plus ancien, ou les lectures.
  const tries = useMemo(() => [...essais].sort(ordre === 'lus'
    ? (a, b) => (b.nb_vues - a.nb_vues) || (b.nb_likes - a.nb_likes)
    : (a, b) => (b.publie_at ?? '').localeCompare(a.publie_at ?? '')),
  [essais, ordre])

  const filtre = !!filtreCategorie || !!recherche.trim()
  const toutAfficher = () => { setFiltreCategorie(null); setRecherche('') }

  return (
    <>
      {/* Recherche + filtres de catégorie, centrés ; les tags passent à la ligne. */}
      <div data-visite="communaute-recherche" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
        <div style={{ position: 'relative', width: '13.75rem', flexShrink: 0 }}>
          <input type="text" value={recherche} onChange={e => setRecherche(e.target.value)}
            aria-label="Chercher parmi les auteurs, les titres et les résumés"
            placeholder="Auteur, titre, résumé…"
            style={{ width: '100%', fontSize: '0.6875rem', padding: '5px 12px 5px 28px', border: '1px solid var(--cs-bord)', borderRadius: '999px', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', outline: 'none', boxSizing: 'border-box' }} />
          <svg width="11" height="11" viewBox="0 0 13 13" fill="none" style={{ color: 'var(--cs-texte-fort)', position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.32 }}>
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="9" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <div role="group" aria-label="Catégories" style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button type="button" aria-pressed={!filtreCategorie} onClick={() => setFiltreCategorie(null)} style={tagFiltre(!filtreCategorie)}>Tout</button>
          {/* Un second clic sur l'étiquette active la relâche : on n'a pas à viser « Tout ». */}
          {CATEGORIES.map(c => <button type="button" key={c} aria-pressed={filtreCategorie === c} onClick={() => setFiltreCategorie(filtreCategorie === c ? null : c)} style={tagFiltre(filtreCategorie === c)}>{c}</button>)}
        </div>
      </div>

      <style>{`
        .publications-sommaire-tete { display: flex; align-items: center; gap: 14px; margin: 0 0 14px; }
        .publications-sommaire-tete::before,
        .publications-sommaire-tete::after {
          content: ""; height: 1px; flex: 1;
          background: linear-gradient(90deg, rgba(var(--cs-or-rgb),0.04), rgba(var(--cs-or-rgb),0.34), rgba(var(--cs-or-rgb),0.04));
        }
        /* La tête du sommaire porte les deux ordres du rayon, séparés d'un losange.
           Elle garde le dessin de l'ancien « Au sommaire » : on y lit l'ordre en
           cours, et l'autre se tient en retrait, à un clic. */
        .publications-sommaire-ordres { display: flex; align-items: baseline; gap: 10px; }
        .publications-sommaire-ordres button {
          background: none; border: none; padding: 2px 0 2px 0.24em; cursor: pointer;
          font: inherit; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.24em;
          text-transform: uppercase; color: var(--cs-lacune); opacity: 0.5;
          transition: opacity var(--cs-duree-courte) ease;
        }
        .publications-sommaire-ordres button:hover { opacity: 0.8; }
        .publications-sommaire-ordres button[aria-pressed="true"] { opacity: 1; cursor: default; }
        .publications-sommaire-losange { font-size: 0.5rem; color: var(--cs-lacune); opacity: 0.45; }
        /* Sous la tête, quand un filtre retient : combien, sur combien, et de quoi
           tout rendre. Une ligne, en italique, sans cadre. */
        .publications-compte {
          margin: -4px 0 18px; text-align: center;
          font-size: 0.75rem; font-style: italic; color: var(--cs-texte-doux);
        }
        .publications-compte button {
          background: none; border: none; padding: 0; margin-left: 4px; cursor: pointer;
          font: inherit; font-style: normal; color: var(--cs-vert); text-decoration: underline;
          text-underline-offset: 2px; text-decoration-thickness: 1px;
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
           s'ordonne en six temps du haut vers le bas, ponctués de deux filets courts :
           auteur, catégorie, titre,
           sous-titre, fleuron, date. C'est cette suite, non un cadre, qui fait le
           livre ancien. Deux losanges filetés séparaient jadis ces temps ; ils ont
           été retirés ; le fleuron de genre tient désormais leur rôle.
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
          font-family: ${SERIF};
          font-kerning: normal; font-variant-ligatures: common-ligatures contextual;
          text-rendering: optimizeLegibility;
          box-shadow: 0 1px 2px rgba(40,30,15,0.18), 0 10px 22px -12px rgba(40,30,15,0.40);
          transition: transform var(--cs-duree-moyenne) var(--cs-courbe-sortie), box-shadow var(--cs-duree-moyenne) ease;
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
        /* ⛔ La CASE porte le carton et, hors de lui, l'étoile des favoris : un bouton
           n'a pas sa place dans un lien, ni pour le balisage ni pour le clavier. Elle
           est un conteneur de même largeur que la couverture, si bien que les mesures
           en cqw de l'étoile n'ont pas bougé. C'est elle qu'on survole : l'étoile,
           posée par-dessus, ne fait pas retomber le livre. */
        .couverture-case { position: relative; container-type: inline-size; }
        .couverture-case:hover .couverture { transform: translateY(-5px); box-shadow: 0 2px 6px rgba(40,30,15,0.22), 0 22px 38px -14px rgba(40,30,15,0.48); }
        .couverture:focus-visible { outline: 2px solid var(--cs-vert); outline-offset: 4px; }


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
           suivant, et les deux souffles qui encadrent le fleuron absorbent la hauteur
           qui reste. Un titre de quatre lignes serre donc la composition au lieu de
           la faire déborder : les souffles tombent, puis le fleuron se resserre. */
        .couverture-face {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 6.5cqw 8cqw 7.5cqw;
          transition: opacity var(--cs-duree-moyenne) ease;
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
          margin: 0 0 3.6cqw; flex-shrink: 0;
          font-size: 4cqw; letter-spacing: 0.3em; text-transform: uppercase; opacity: 0.84;
          font-variation-settings: "opsz" 9, "wght" 400;
          padding-left: 0.28em;
        }
        /* Le titre : la seule grande chose de la couverture. Ecrêté à quatre lignes,
           faute de quoi un titre-fleuve chasserait la date hors du carton. */
        .couverture-titre {
          font-size: 10.4cqw; font-weight: 400; line-height: 1.08; letter-spacing: -0.012em; flex-shrink: 0;
          font-variation-settings: "opsz" 44, "wght" 400;
          text-wrap: balance;
          overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4;
        }
        /* Pas de largeur bornée : le retrait de la face suffit à tenir la mesure, et
           un plafond en em coupait le sous-titre trop court, sur un mot esseulé. */
        .couverture-soustitre {
          margin-top: 2.8cqw; flex-shrink: 0;
          font-size: 4.4cqw; font-weight: 400; line-height: 1.42; opacity: 0.84; text-wrap: balance;
          font-variation-settings: "opsz" 14, "wght" 400;
          overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3;
        }
        /* Le fleuron (2026-09-23) : un fleuron du registre de l'auteur par genre, en
           lieu et place des gravures (app/lib/fleuronsCouverture.tsx). Ses marges
           deux SOUFFLES qui l'encadrent le posent dans le blanc qui reste entre le
           sous-titre et la date, où le compositeur posait la vignette d'une page de
           titre, et un peu au-dessus du milieu : le souffle du bas vaut 1,45 fois
           celui du haut, c'est le centre OPTIQUE. Sa taille est posée par le
           composant : la hauteur de pose du registre, un rem de pose valant
           10,5cqw, soit 26 à 37cqw selon la planche.
           ⛔ Ni le titre, ni le sous-titre, ni la catégorie ne rétrécissent
           (flex-shrink: 0) : quand la place manque, les souffles tombent d'abord,
           puis le FLEURON se resserre, jusqu'à 12cqw. Un titre de quatre lignes
           suivi d'un sous-titre de trois tient ainsi, mesuré sur planche.

           Sur l'OPACITÉ, qui revient dans tout ce bloc et n'est pas un bricolage. La
           couverture n'a qu'une encre, celle que l'auteur a choisie, prise partout
           par currentColor. Toute la hiérarchie se fait donc en INTENSITÉS de cette
           encre unique : nom 0.9, fleuron 0.86, catégorie et sous-titre 0.84, date
           0.78, filet du cadre 0.42. Le fleuron est posé en masque sur l'encre de
           la couverture ; seuls ceux qui supportent le négatif y ont droit, si bien
           qu'il n'a pas besoin de la plaque que réclamaient les gravures. */
        .couverture-fleuron { flex: 0 1 auto; min-height: 12cqw; opacity: 0.86; }
        .couverture-souffle { display: block; flex: 1 1 0; min-height: 3cqw; }
        .couverture-souffle--bas { flex-grow: 1.45; }
        /* Deux filets courts, de l'encre à mi-intensité : sous le nom de l'auteur,
           et au-dessus de la date, comme le filet qui sépare l'adresse d'une page
           de titre. Ils ne séparent pas des blocs, ils ponctuent la page. */
        .couverture-filet { display: block; width: 9cqw; height: 0; border-top: 1px solid currentColor; opacity: 0.5; margin: 3.4cqw auto 0; }
        .couverture-pied .couverture-filet { margin: 0 auto 3cqw; }
        /* Le pied ne porte plus de marge : le souffle du bas et le filet font son
           blanc, et le filet ne laisse jamais la date se coller au fleuron. */
        .couverture-pied { margin-top: 0; display: flex; flex-direction: column; align-items: center; }
        .couverture-date {
          font-size: 3.3cqw; letter-spacing: 0.24em; text-transform: uppercase; opacity: 0.78;
          padding-left: 0.24em; font-variation-settings: "opsz" 9, "wght" 400;
        }

        /* L'étoile suit le livre quand il se soulève, et prend SON encre : le carton
           n'en a qu'une. Vide, elle se tient en retrait ; pleine, elle est entière. */
        .couverture-etoile {
          position: absolute; top: 9.6cqw; right: 7cqw; z-index: 8; line-height: 1;
          transition: transform var(--cs-duree-moyenne) var(--cs-courbe-sortie);
        }
        .couverture-case:hover .couverture-etoile { transform: translateY(-5px); }
        .couverture-etoile .etoile-favori { color: var(--couv-encre) !important; opacity: 0.62; }
        .couverture-etoile .etoile-favori[aria-pressed="true"],
        .couverture-etoile .etoile-favori:hover { opacity: 1; }
        :root[data-theme="sombre"] .couverture-etoile .etoile-favori { color: var(--couv-encre-s) !important; }

        /* La quatrième : elle se retourne au survol. Même famille que la face — la
           couverture entière est en empattement — mais une composition plus large :
           un blanc de marge presque double, et le texte tenu loin du cadre. Un
           résumé collé au filet ne se lit pas comme une quatrième, mais comme une
           étiquette. */
        .couverture-dos {
          position: absolute; inset: 0; z-index: 3;
          display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
          padding: 5cqw 11cqw 15cqw 11.8cqw;
          opacity: 0; pointer-events: none; transition: opacity var(--cs-duree-moyenne) ease;
        }
        /* Au clavier aussi : le lien qui prend le focus se retourne comme au survol. */
        .couverture-case:hover .couverture-dos,
        .couverture:focus-visible .couverture-dos { opacity: 1; pointer-events: auto; }
        .couverture-case:hover .couverture-face,
        .couverture:focus-visible .couverture-face { opacity: 0; }
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
          transition: opacity var(--cs-duree-moyenne) ease;
        }
        .couverture-lire::before {
          content: ""; position: absolute; left: 50%; top: -3.6cqw;
          width: 24cqw; height: 1px; transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, currentColor 30%, currentColor 70%, transparent);
          opacity: 0.5;
        }
        .couverture-case:hover .couverture-lire,
        .couverture:focus-visible .couverture-lire { opacity: 1; }
        /* Les chiffres au pied, hors du bloc de lecture : ils appartiennent au carton,
           pas au texte. Assez bas pour laisser respirer le résumé, assez haut pour
           rester dans le cadre. */
        .couverture-dos-meta {
          position: absolute; left: 0; right: 0; bottom: 8cqw;
          display: flex; align-items: center; justify-content: center; gap: 3.4cqw;
          font-size: 3cqw; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.56;
          font-variation-settings: "opsz" 9, "wght" 400;
        }

        /* ⚠️ Les requêtes ne changent que le NOMBRE de colonnes : largeur et écart
           restent « --couv » et « --couv-ecart ». Elles réécrivaient 14,5rem et leur
           propre gouttière (1,2rem), si bien que la paire « écrite une seule fois »
           l'était trois (audit d'harmonie, 2026-09-23, § 5.3). */
        @media (max-width: 900px) { .rayon { grid-template-columns: repeat(2, var(--couv)); row-gap: 1.4rem; } }
        @media (max-width: 640px) { .rayon { grid-template-columns: var(--couv); } }
        /* ⛔ Deux couvertures de 14,5rem et leur gouttière font 490px ; avec les 64px
           de rembourrage de la page, le rayon en réclamait 554 quand il ne passe à une
           colonne qu'à 520. Entre les deux, jusqu'à 34px de débordement. Le rembourrage
           tombe à 16px sous 640, comme celui de la Bibliothèque, et les deux colonnes
           tiennent alors dès 522px. Le point d'exclamation : il est posé en ligne. */
        @media (max-width: 640px) {
          .essais-corps { padding-left: 16px !important; padding-right: 16px !important; }
        }

        /* La légende : ce que la quatrième dit au survol, écrit SOUS le livre là où
           rien ne se survole. Absente partout ailleurs. */
        .couverture-legende { display: none; }

        /* Tactile : rien ne se survole. La face reste et le dos ne s'affiche jamais ;
           le résumé passe sous la couverture, en légende de quatre lignes. */
        @media (hover: none) {
          .couverture-dos { display: none; }
          .couverture-case:hover .couverture-face { opacity: 1; }
          .couverture-case:hover .couverture, .couverture-case:hover .couverture-etoile { transform: none; }
          .couverture-legende {
            display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden;
            margin: 0.7rem 0.15rem 0;
            font-family: ${SERIF};
            font-size: 0.8125rem; line-height: 1.5; color: var(--cs-texte-second); text-wrap: pretty;
          }
          .couverture-legende-marque {
            font-size: 0.625rem; letter-spacing: 0.16em; text-transform: uppercase;
            color: var(--cs-lacune); margin-right: 6px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .couverture, .couverture-etoile, .couverture-face, .couverture-dos { transition: none; }
          .couverture-case:hover .couverture, .couverture-case:hover .couverture-etoile { transform: none; }
        }
      `}</style>

      {total === 0 ? (
        <div style={{ textAlign: 'center', margin: '0.8125rem 0' }}><MentionVide>Aucune publication pour l’instant.</MentionVide></div>
      ) : (
        <>
          <div className="publications-sommaire-tete">
            <div className="publications-sommaire-ordres" role="group" aria-label="Ordre du sommaire">
              <button type="button" aria-pressed={ordre === 'recents'} onClick={() => setOrdre('recents')}>Les plus récents</button>
              <span className="publications-sommaire-losange" aria-hidden="true">◆</span>
              <button type="button" aria-pressed={ordre === 'lus'} onClick={() => setOrdre('lus')}>Les plus lus</button>
            </div>
          </div>
          {/* Le compte est annoncé aux lecteurs d'écran à chaque frappe (aria-live). */}
          <p className="publications-compte" aria-live="polite">
            {filtre && <>
              {tries.length === 0
                ? 'Aucune publication ne répond à cette recherche.'
                : `${tries.length} publication${tries.length > 1 ? 's' : ''} sur ${total}.`}
              <button type="button" onClick={toutAfficher}>Tout afficher</button>
            </>}
          </p>
          {tries.length > 0 && <div className="rayon">
            {tries.map(e => (
              <CouvertureEssai key={e.id} essai={e} plusLu={plusLus.has(e.id)}
                favorisEssais={favorisEssais} toggleFavoriEssai={toggleFavoriEssai} />
            ))}
          </div>}
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
  // La catégorie écrite et le fleuron sont ceux de la CATÉGORIE PRINCIPALE, que
  // l’auteur désigne (`essais.embleme`) : ils disent la même chose.
  const categorie = categoriePrincipale(e.categories, e.embleme)
  // Titre, sous-titre et résumé sont tapés par l’auteur dans un formulaire : ils
  // arrivent avec l’apostrophe droite et la ponctuation collée du clavier. La norme
  // s’applique AU RENDU (charte §3.2), jamais dans la donnée.
  const titre = normaliserSaisie(e.titre)
  const sousTitre = e.sous_titre ? normaliserSaisie(e.sous_titre) : null
  const resume = e.resume ? normaliserSaisie(e.resume) : null
  return (
    <div className="couverture-case"
      /* ⛔ La case porte les SIX valeurs du carton en propriétés personnalisées, et
         c'est le CSS qui choisit selon le thème. Choisir en JavaScript ferait paraître
         la couverture dans une teinte puis sauter dans l'autre après l'hydratation.
         Posées sur la case et non sur le lien, elles atteignent aussi l'étoile. */
      style={{
        '--couv-fond': c.fond, '--couv-encre': c.encre, '--couv-filet': c.filet,
        '--couv-fond-s': c.fondSombre, '--couv-encre-s': c.encreSombre, '--couv-filet-s': c.filetSombre,
      } as React.CSSProperties}>
    <Link href={`/essais/${e.id}`} className="couverture"
      style={{ background: 'var(--couv-fond)', color: 'var(--couv-encre)' }}
      title={`${titre} — ${e.auteur}`}>

      {/* La tête et le cadre sont posés sur le CARTON, hors des deux faces : ils ne
          bougent pas d'un pixel quand la couverture se retourne. */}
      <span className="couverture-cadre" style={{ borderColor: "var(--couv-filet)" }} aria-hidden="true" />
      <span className="couverture-tete">
        {/* ⚠️ Le rameau prend ici l'ENCRE DE LA COUVERTURE, non l'or de la charte : le
            carton n'a qu'une encre, celle que l'auteur a choisie, et une seconde
            couleur y ferait tache. La marque se reconnaît à sa forme. */}
        <span className="couverture-auteur">
          {e.auteur}
          {e.mecene && <>{' '}<MarqueMecene couleur="currentColor" taille="1em" /></>}
        </span>
        <span className="couverture-filet" aria-hidden="true" />
      </span>

      <span className="couverture-corps">
        <span className="couverture-face">
          {categorie && <span className="couverture-categorie">{categorie}</span>}
          <span className="couverture-titre">{titre}</span>
          {sousTitre && <span className="couverture-soustitre">{sousTitre}</span>}
          {/* Le fleuron est un ornement, pas une information : il double la catégorie,
              déjà écrite au-dessus, et n'a donc rien à annoncer. */}
          <span className="couverture-souffle" aria-hidden="true" />
          <FleuronGenre categorie={categorie} echelle="10.5cqw" className="couverture-fleuron" />
          <span className="couverture-souffle couverture-souffle--bas" aria-hidden="true" />
          <span className="couverture-pied">
            <span className="couverture-filet" aria-hidden="true" />
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
    <span className="couverture-etoile">
      <EtoileFavori actif={favorisEssais.has(String(e.id))} onToggle={() => toggleFavoriEssai(String(e.id))} size={13}
        title={favorisEssais.has(String(e.id)) ? `Retirer « ${titre} » des favoris` : `Ajouter « ${titre} » aux favoris`} />
    </span>
    {resume && (
      <p className="couverture-legende">
        {plusLu && <span className="couverture-legende-marque">◆ Parmi les plus lus</span>}
        {resume}
      </p>
    )}
    </div>
  )
}

function OngletEcrire({ connecte }: { connecte: boolean | null }) {
  if (connecte === false) {
    return (
      <div style={{ textAlign: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '28px 24px', maxWidth: '32.5rem', margin: '0 auto' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', marginBottom: '14px' }}>Connectez-vous pour écrire un essai ou une méditation.</p>
        <Link href="/chantier" className="cs-bouton-plein" style={{ display: 'inline-block' }}>
          Se connecter
        </Link>
      </div>
    )
  }
  if (connecte === null) return <MotAttente centre />
  return (
    <div style={{ maxWidth: '38.75rem', margin: '0 auto', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '30px 34px', textAlign: 'center' }}>
      <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 8px' }}>
        Espace de rédaction
      </p>
      <h2 style={{ fontFamily: SERIF, fontSize: '1.375rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: '0 0 10px' }}>
        Écrire une publication
      </h2>
      <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.65, margin: '0 auto 20px', maxWidth: '27.5rem' }}>
        Le titre, le résumé, les catégories et le texte se renseignent désormais dans la même page.
      </p>
      <Link href="/essais/nouveau?depuis=publications" className="cs-bouton-plein" style={{ display: 'inline-block' }}>
        Ouvrir la rédaction
      </Link>
    </div>
  )
}

// ── Mes écrits ───────────────────────────────────────────────────────────────
// La liste se range comme l'étagère de la Bibliothèque : une ligne par écrit, le
// titre en italique à empattements, et sous lui une ligne de sans qui dit l'état,
// la date et l'audience. Les cartons de couleur qui la précédaient (un fond et un
// filet teintés par état) disaient trois fois la même chose ; l'état se lit au mot,
// et à la pastille qui tient lieu de puce.
//
// Le volet de gauche trie et filtre, sur le modèle du volet de lecture : un axe se
// donne en entier, une option par ligne, l'option retenue sur la pastille verte
// (charte, « Le volet de lecture »). Sous 700 px il passe au-dessus de la liste,
// ses deux axes côte à côte.

type TriEcrits = 'modification' | 'publication' | 'titre' | 'lectures'
type FiltreEcrits = 'tous' | 'a_revoir' | 'brouillon' | 'en_attente' | 'publie'

const TRIS_ECRITS: { cle: TriEcrits; libelle: string }[] = [
  { cle: 'modification', libelle: 'Dernière modification' },
  { cle: 'publication', libelle: 'Date de publication' },
  { cle: 'titre', libelle: 'Titre' },
  { cle: 'lectures', libelle: 'Lectures' },
]

// ⚠️ « À revoir » réunit les écrits que la modération a renvoyés (`a_reviser`,
// posé par /api/admin/essai-demander-modification) et ceux qu'elle a refusés : ce
// sont les seuls qui demandent une action de l'auteur. Le filtre ne paraît que
// s'il en compte, en tête après « Tous ». Un écrit d'un état inconnu ne paraît que
// sous « Tous ».
const estARevoir = (e: EssaiPerso) => e.statut === 'a_reviser' || e.statut === 'refuse'
const FILTRES_ECRITS: { cle: FiltreEcrits; libelle: string; test: (e: EssaiPerso) => boolean }[] = [
  { cle: 'tous', libelle: 'Tous', test: () => true },
  { cle: 'a_revoir', libelle: 'À revoir', test: estARevoir },
  { cle: 'brouillon', libelle: 'Brouillons', test: e => e.statut === 'brouillon' },
  { cle: 'en_attente', libelle: 'En vérification', test: e => e.statut === 'en_attente' },
  { cle: 'publie', libelle: 'Publiés', test: e => e.statut === 'publie' },
]

function comparerEcrits(tri: TriEcrits): (a: EssaiPerso, b: EssaiPerso) => number {
  const date = (x: string | null) => x ?? ''
  switch (tri) {
    case 'publication':
      // Du plus récemment publié au plus ancien ; ce qui n'a jamais paru suit, par
      // date de modification.
      return (a, b) => date(b.publie_at).localeCompare(date(a.publie_at)) || date(b.updated_at).localeCompare(date(a.updated_at))
    case 'titre':
      return (a, b) => a.titre.localeCompare(b.titre, 'fr', { sensitivity: 'base' })
    case 'lectures':
      return (a, b) => ((b.nb_vues ?? 0) - (a.nb_vues ?? 0)) || ((b.nb_likes ?? 0) - (a.nb_likes ?? 0))
    default:
      return (a, b) => date(b.updated_at).localeCompare(date(a.updated_at))
  }
}

function OptionVolet({ actif, onClick, libelle, nombre }: { actif: boolean; onClick: () => void; libelle: string; nombre?: number }) {
  return (
    <button type="button" className="cs-option-volet" aria-pressed={actif} onClick={onClick} style={OPTION_VOLET(actif)}>
      <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
        <span>{libelle}</span>
        {nombre !== undefined && (
          <span style={{ fontSize: '0.6875rem', color: actif ? 'var(--cs-texte-second)' : 'var(--cs-texte-gris)', fontVariantNumeric: 'tabular-nums' }}>{nombre}</span>
        )}
      </span>
    </button>
  )
}

function OngletMesEcrits({
  connecte, essais, changerStatut, supprimer,
}: {
  connecte: boolean | null; essais: EssaiPerso[] | null
  changerStatut: (id: number, statut: string) => Promise<void>; supprimer: (id: number) => Promise<void>
}) {
  const [filtre, setFiltre] = useState<FiltreEcrits>('tous')
  const [tri, setTri] = useState<TriEcrits>('modification')
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
  if (essais === null) return <MotAttente />
  if (essais.length === 0) return <div style={{ margin: '0.8125rem 0' }}><MentionVide>Aucun écrit pour l’instant.</MentionVide></div>

  const filtreActif = FILTRES_ECRITS.find(f => f.cle === filtre) ?? FILTRES_ECRITS[0]
  const visibles = essais.filter(filtreActif.test).sort(comparerEcrits(tri))

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
    <div className="mes-ecrits">
      <style>{`
        /* Le volet prend 12,5 rem, la liste la mesure de l'ancienne colonne (42,5 rem) ;
           l'ensemble se centre dans les 71 rem de la page, comme le rayon. */
        .mes-ecrits { display: grid; grid-template-columns: 12.5rem minmax(0, 42.5rem); justify-content: center; column-gap: 2.25rem; }
        .mes-ecrits-volet { align-self: start; position: sticky; top: calc(3.5rem + 14px); border-right: 1px solid var(--cs-bord-clair); padding: 2px 1.25rem 4px 7px; }
        .mes-ecrits-axe { margin-top: 12px; }
        .mes-ecrits-liste { min-width: 0; }

        /* Une ligne par écrit : la puce d'état, le titre et sa ligne de sans, les actions. */
        .ecrit-ligne { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; column-gap: 6px; align-items: start; padding: 7px 0 8px; border-top: 1px solid var(--cs-fond); }
        .ecrit-ligne:first-child { border-top: none; }
        .ecrit-etat { display: block; width: 7px; height: 7px; border-radius: 50%; margin: 6px 0 0 3px; }
        .ecrit-titre { font-family: ${SERIF}; font-style: italic; font-size: 0.875rem; font-weight: 500; color: var(--cs-encre); line-height: 1.3; text-decoration: none; }
        .ecrit-titre:hover { color: var(--cs-vert-fonce); }
        .ecrit-sous-titre { margin-left: 6px; font-family: ${SERIF}; font-style: italic; font-size: 0.75rem; color: var(--cs-texte-gris); }
        .ecrit-meta { display: flex; flex-wrap: wrap; align-items: baseline; margin-top: 2px; font-family: ${SANS}; font-size: 0.6875rem; color: var(--cs-texte-gris); }
        .ecrit-meta > span + span::before { content: "·"; margin: 0 6px; color: var(--cs-bord); }

        /* Les actions se tiennent en retrait tant qu'on ne les regarde pas, comme le
           « Lire » de l'étagère ; au doigt, sans survol, elles restent pleines. */
        .ecrit-actions { display: flex; align-items: center; gap: 10px; padding-top: 2px; opacity: 0.6; transition: opacity var(--cs-duree-moyenne); }
        .ecrit-ligne:hover .ecrit-actions, .ecrit-ligne:focus-within .ecrit-actions { opacity: 1; }
        @media (hover: none) { .ecrit-actions { opacity: 1; } }

        @media (max-width: 640px) {
          .mes-ecrits { grid-template-columns: minmax(0, 1fr); row-gap: 12px; }
          .mes-ecrits-volet { position: static; border-right: none; border-bottom: 1px solid var(--cs-bord-clair); padding: 0 7px 10px; display: grid; grid-template-columns: 1fr 1fr; column-gap: 12px; }
          .mes-ecrits-axe { margin-top: 0; }
        }
        @media (max-width: 640px) {
          .ecrit-ligne { grid-template-columns: 14px minmax(0, 1fr); }
          .ecrit-actions { grid-column: 2; padding-top: 4px; }
        }
      `}</style>

      <aside className="mes-ecrits-volet" aria-label="Afficher et trier mes écrits">
        <div>
          <span style={RUBRIQUE_AXE}>Afficher</span>
          {FILTRES_ECRITS.filter(f => f.cle !== 'a_revoir' || filtre === 'a_revoir' || essais.some(estARevoir)).map(f => (
            <OptionVolet key={f.cle} actif={filtre === f.cle} onClick={() => setFiltre(f.cle)} libelle={f.libelle} nombre={essais.filter(f.test).length} />
          ))}
        </div>
        <div className="mes-ecrits-axe">
          <span style={RUBRIQUE_AXE}>Trier par</span>
          {TRIS_ECRITS.map(t => (
            <OptionVolet key={t.cle} actif={tri === t.cle} onClick={() => setTri(t.cle)} libelle={t.libelle} />
          ))}
        </div>
      </aside>

      <div className="mes-ecrits-liste">
        {visibles.length === 0 ? (
          <div style={{ margin: '6px 0' }}><MentionVide>Aucun écrit dans cette vue.</MentionVide></div>
        ) : visibles.map(e => {
          const st = STATUTS[e.statut] ?? { label: e.statut, couleur: 'var(--cs-texte-doux)' }
          const date = e.publie_at ?? e.updated_at
          const dernier = derniereAction(e.id)
          const restant = Math.max(0, 60 * 60 * 1000 - (maintenant - dernier))
          const verrouille = restant > 0
          const dejaValide = e.statut === 'publie' || (e.statut === 'brouillon' && !!e.publie_at)
          const peutBasculer = dejaValide && (e.statut === 'publie' || e.statut === 'brouillon')
          const timer = verrouille ? formatTimer(restant) : ''
          const nbVues = e.nb_vues ?? 0
          return (
            <div key={e.id} className="ecrit-ligne">
              <span aria-hidden className="ecrit-etat" style={{ background: st.couleur }} />
              <div style={{ minWidth: 0 }}>
                <Link href={`/essais/${e.id}`} className="ecrit-titre">{e.titre}</Link>
                {e.sous_titre && <span className="ecrit-sous-titre">{e.sous_titre}</span>}
                <div className="ecrit-meta">
                  <span style={{ color: st.couleur, fontWeight: 700 }}>{st.label}</span>
                  <span>{date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sans date'}</span>
                  <span>{nbVues} vue{nbVues > 1 ? 's' : ''}</span>
                  <span>♥ {e.nb_likes ?? 0}</span>
                  {e.anonyme && <span style={{ fontStyle: 'italic' }}>anonyme</span>}
                  {e.statut === 'en_attente' && <span style={{ color: 'var(--cs-attente)', fontWeight: 600 }}>révision en cours</span>}
                </div>
                {(e.statut === 'a_reviser' || e.statut === 'refuse') && e.note_admin && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.6875rem', color: 'var(--cs-texte-second)' }}>
                    Motif de la modération : {e.note_admin}
                  </p>
                )}
              </div>
              <div className="ecrit-actions">
                <button type="button" role="switch" aria-checked={e.statut === 'publie'} aria-label={timer ? `Publication de l’écrit, ${timer}` : "Publication de l’écrit"}
                  onClick={() => basculerPublication(e)} disabled={!peutBasculer || verrouille}
                  title={!dejaValide ? "Publication possible après validation par l'administration." : verrouille ? 'Interrupteur disponible une heure après le dernier changement.' : e.statut === 'publie' ? 'Dépublier' : 'Publier'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.6875rem', color: e.statut === 'publie' ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', background: 'transparent', border: 'none', padding: 0, cursor: !peutBasculer || verrouille ? 'default' : 'pointer', opacity: !peutBasculer ? 'var(--cs-opacite-desactive)' : 1, fontWeight: 600 }}>
                  {timer && <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', fontWeight: 600 }}>{timer}</span>}
                  <PisteInterrupteur actif={e.statut === 'publie'} />
                </button>
                <Link href={`/essais/${e.id}/modifier`} style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)', textDecoration: 'none', fontWeight: 600 }}>Modifier</Link>
                <button onClick={() => supprimer(e.id)} style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>Supprimer</button>
              </div>
            </div>
          )
        })}
      </div>
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
        chargement ? <MotAttente marge="20px 0 0" /> : (
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', marginTop: '20px' }}>Impossible de charger une suggestion.</p>
        )
      ) : (
        <>
          <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '34px 36px 28px', marginBottom: '18px' }}>
            <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 20px' }}>
              Verset proposé à la méditation
            </p>
            <p style={{ fontFamily: SERIF, fontSize: '1rem', lineHeight: 1.8, color: 'var(--cs-encre-fonce)', fontStyle: 'italic', margin: '0 0 18px' }}>
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
              className="cs-bouton-plein" style={{ display: 'inline-block' }}>
              Écrire sur ce verset
            </Link>
            <Link
              href={`/?livre=${verset.livre}&chapitre=${verset.chapitre}&verset=${verset.verset}`}
              style={{ display: 'inline-block', padding: '9px 16px', fontSize: '0.78125rem', color: 'var(--cs-vert)', borderRadius: '4px', textDecoration: 'none', border: '1px solid rgba(var(--cs-vert-rgb), 0.25)' }}>
              Lire dans la Bible
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <button
              onClick={() => charger(versets)}
              disabled={!peutRelancer || chargement}
              style={{ fontSize: '0.71875rem', color: peutRelancer ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', background: 'none', border: 'none', cursor: peutRelancer ? 'pointer' : 'default', padding: 0, textDecoration: peutRelancer && !chargement ? 'underline' : 'none', fontStyle: 'italic' }}>
              {chargement ? 'Chargement…' : peutRelancer ? 'Autre suggestion' : 'Limite atteinte pour aujourd\'hui'}
            </button>
            <span style={{ fontSize: '0.6875rem', color: 'var(--cs-bord)' }}>({versets.length}/{MAX_SUGGESTIONS_JOUR})</span>
          </div>

          {versets.length > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '14px' }}>
              {versets.map((_, i) => (
                <button key={i} onClick={() => setIndex(i)}
                  style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === index ? 'var(--cs-vert-aplat)' : 'var(--cs-bord)', border: 'none', cursor: 'pointer', padding: 0, transition: 'background var(--cs-duree-courte)' }} />
              ))}
            </div>
          )}
        </>
      )}

      {connecte === false && (
        <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', marginTop: '18px', fontStyle: 'italic' }}>
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
    fontSize: '0.6875rem', padding: '3px 10px', borderRadius: '999px',
    border: '1px solid ' + (actif ? 'var(--cs-vert)' : 'transparent'),
    background: actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'color-mix(in srgb, var(--cs-texte-gris) 6%, transparent)',
    color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', cursor: 'pointer',
    fontWeight: actif ? 600 : 400, letterSpacing: '0.02em', lineHeight: 1.3,
    transition: 'background var(--cs-duree-courte), color var(--cs-duree-courte)',
  }
}
function formatTimer(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  const secondes = total % 60
  return `${minutes}:${String(secondes).padStart(2, '0')}`
}
