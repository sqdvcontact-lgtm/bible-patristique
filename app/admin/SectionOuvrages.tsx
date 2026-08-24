'use client'

// Admin des OUVRAGES bibliographiques (références citées en documentation), adossé au
// système de qualification scientifique déjà déployé dans la base.
//
// Doctrine (ne pas la réimplémenter en TypeScript) :
//  · La valeur scientifique finale d'un ouvrage est CALCULÉE par Supabase dans
//    ouvrages_bibliographiques.statut_scientifique. Le code la lit, il ne la recalcule
//    jamais à partir des scores.
//  · La décision manuelle passe par statut_scientifique_override ; « — calcul
//    automatique — » remet cet override à null et rend la main au calcul de la base.
//  · Les rangs sont un rang ACADÉMIQUE, jamais des étoiles.
//  · Les refus de la base (lien vers un ouvrage inadmissible, validation d'un ouvrage
//    non retenu, exclusion sans motif) sont interceptés et expliqués, sans mise à jour
//    optimiste définitive avant confirmation.
//
// ── Mise en page : une FILE et une FICHE, jamais un accordéon ────────────────
// L'écran servait auparavant une liste dépliante : l'ouvrage ouvert repoussait les cinq
// cents suivants hors de l'écran, et sa fiche, longue de quatre panneaux, recouvrait la
// liste où l'on venait de choisir. On reprend donc le patron de la validation des
// notices : la file reste en vue, collée sous la barre d'onglets et défilant pour son
// propre compte, la fiche occupe la mesure à côté d'elle.
//
// Le corpus compte près de six cents titres, tous « à revoir » : le travail est un
// dépouillement, non une visite. D'où trois choses que l'accordéon n'avait pas. Les
// filtres portent leur COMPTE, si bien qu'on voit ce qui reste avant de cliquer. La
// file se TRIE. Et la fiche porte ses flèches « précédent / suivant », qui avancent
// dans la file filtrée sans repasser par la liste.
//
// La fiche s'ouvre sur la CITATION composée, dans l'ordre exact de `ReferenceBiblio`
// (page des péricopes) : on lit la notice telle qu'elle paraîtra, non comme une grille
// de champs. Ce qui fonde le calcul (autorité éditrice, collection, contributeurs et
// leurs rangs) est réuni sous un seul intitulé, à côté du statut qui en découle.

import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'
import { messageErreurQualification } from './qualification'
import { colorMix } from '@/app/lib/couleurs'
import { normaliserEspacesOriginal } from '@/app/lib/typographie'
import { composerNom, separerNoms, type NomStructure } from '@/app/lib/nomsPersonnes'

const SANS = 'var(--font-source-sans), Arial, sans-serif'
const SERIF = 'var(--font-source-serif), Georgia, serif'

// Le rang « source secondaire » n'a pas de jeton propre dans la palette : il tient
// entre le vert du retenu et l'or de l'à-vérifier. On le compose donc à partir des deux
// plutôt que de recopier un olive en dur, qui ne suivrait aucun thème (charte, Palette).
const OLIVE = 'color-mix(in srgb, var(--cs-vert) 60%, var(--cs-or))'

// ── Libellés français (rang académique, non une note populaire) ─────────────
const L_SCI: Record<string, string> = { retenu: 'Retenu', secondaire: 'Source secondaire', a_verifier: 'À vérifier', exclu: 'Exclu' }
const C_SCI: Record<string, string> = { retenu: 'var(--cs-vert)', secondaire: OLIVE, a_verifier: 'var(--cs-or)', exclu: 'var(--cs-danger-fonce)' }
const L_EDITO: Record<string, string> = { a_revoir: 'À revoir', en_cours: 'En cours', valide: 'Validé', rejete: 'Rejeté' }
const C_EDITO: Record<string, string> = { a_revoir: 'var(--cs-or)', en_cours: 'var(--cs-systeme)', valide: 'var(--cs-vert)', rejete: 'var(--cs-danger-fonce)' }
const L_ROLE: Record<string, string> = { auteur_scientifique: 'Auteur (chercheur)', auteur_source: 'Auteur source (ancien)', editeur_scientifique: 'Éditeur scientifique', traducteur: 'Traducteur' }
const L_NATURE: Record<string, string> = { chercheur: 'Chercheur moderne', auteur_ancien: 'Auteur ancien', collectif: 'Collectif' }
const L_GARANTIE: Record<string, string> = { editeur_universitaire: 'Éditeur universitaire', collection_scientifique: 'Collection scientifique', edition_critique: 'Édition critique', a_verifier: 'À vérifier' }
// Statut d'usage d'une autorité (éditeur, collection, chercheur), calculé sur le rang.
const L_USAGE: Record<string, string> = { reference: 'Référence', solide: 'Solide', secondaire: 'Secondaire', exclu: 'Exclu', a_verifier: 'À vérifier' }
const C_USAGE: Record<string, string> = { reference: 'var(--cs-vert)', solide: OLIVE, secondaire: 'var(--cs-or)', exclu: 'var(--cs-danger-fonce)', a_verifier: 'var(--cs-texte-gris)' }
// Le type d'ouvrage se lit en français, non en clé de base soulignée.
const L_TYPE: Record<string, string> = {
  commentaire_critique: 'Commentaire critique', monographie: 'Monographie', introduction: 'Introduction',
  edition_critique: 'Édition critique', histoire_reception: 'Histoire de la réception', theologie_biblique: 'Théologie biblique',
  outil_philologique: 'Outil philologique', autre_scientifique: 'Autre travail scientifique',
}
const TYPES_OUVRAGE = ['commentaire_critique', 'monographie', 'introduction', 'edition_critique', 'histoire_reception', 'theologie_biblique', 'outil_philologique', 'autre_scientifique'] as const
const OVERRIDES = ['retenu', 'secondaire', 'a_verifier', 'exclu'] as const
const CONFIANCES = ['forte', 'moyenne', 'faible'] as const
const ETATS_EDITO = ['a_revoir', 'en_cours', 'valide', 'rejete'] as const

// ── Types ───────────────────────────────────────────────────────────────────
type Contributeur = { nom: string; role: string; score: number | null; nature: string; statut: string | null; reserve: boolean }
type LigneQualite = {
  id: number; auteurs: string | null; titre: string; collection: string | null; editeur: string | null; annee: number | null
  statut_scientifique: string; statut_scientifique_override: string | null; motif_statut_scientifique: string | null
  statut_editorial: string; statut_editeur: string | null; statut_collection: string | null
  editeur_canonique: string | null; collection_canonique: string | null
  contributeurs: Contributeur[] | null; admissible: boolean; a_controler: boolean; a_ecarter: boolean
}
type OuvrageDetail = {
  id: number; auteurs: string; titre: string; sous_titre: string | null; directeurs: string | null; traducteurs: string | null
  collection: string | null; numero_collection: string | null; lieu: string | null; editeur: string; annee: number | null
  isbn: string | null; langue: string | null; type_ouvrage: string | null; garantie_scientifique: string | null; note: string | null
  statut_editorial: string; editeur_valeur_id: number | null; collection_valeur_id: number | null
  statut_scientifique: string; statut_scientifique_override: string | null; motif_statut_scientifique: string | null
  source_evaluation_scientifique: string | null; confiance_evaluation_scientifique: string | null
}
type Autorite = { id: number; nom: string; score: number | null; reserve?: boolean }
// La fiche d'un chercheur, nom compris en trois rubriques.
// ⚠️ `nom` reste la CLÉ de rapprochement avec les noms des notices et des lignes de
// contributeurs : cet écran ne la réécrit jamais, il la double de ses parties. Ce qui
// PARAÎT passe par `composerNom(parties, nom)`, qui retombe sur `nom` tant que les
// rubriques sont vides.
// ⚠️ La colonne s'appelle `nom_famille` et non `nom`, parce que `nom` était déjà pris par
// la forme affichée. `partiesDe` fait le pont avec `NomStructure`, où `nom` EST le nom de
// famille : les deux vocabulaires se rencontrent ici et nulle part ailleurs.
type FicheAuteur = Autorite & { prenom: string | null; nom_famille: string | null; pseudonyme: string | null }
const partiesDe = (f: FicheAuteur | null | undefined): NomStructure | null =>
  f ? { prenom: f.prenom, nom: f.nom_famille, pseudonyme: f.pseudonyme } : null
type LigneContrib = { id: number; ouvrage_id: number; auteur_valeur_id: number | null; nom_affiche: string; role_contributeur: string; nature_personne: string; ordre: number }
type Tri = 'titre' | 'auteur' | 'annee' | 'editeur'
type Drapeau = '' | 'override' | 'reserve' | 'sans_editeur' | 'sans_contrib'

const CHAMPS_VUE = 'id, auteurs, titre, collection, editeur, annee, statut_scientifique, statut_scientifique_override, motif_statut_scientifique, statut_editorial, statut_editeur, statut_collection, editeur_canonique, collection_canonique, contributeurs, admissible, a_controler, a_ecarter'

const messageErreur = messageErreurQualification

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Même normalisation typographique que la page publique : apostrophe courbe et fines
// insécables. La citation de la fiche doit se lire comme la référence servie au lecteur.
const typo = (s: string) => normaliserEspacesOriginal(s.replace(/'/g, '’'))
// Comparaison de champ de formulaire : null, undefined et chaîne vide sont un même vide.
const vide = (v: unknown) => (v === null || v === undefined || v === '' ? '' : String(v))

// ── Puce de statut (couleur + libellé, jamais d'étoile) ─────────────────────
function Puce({ txt, coul, gros }: { txt: string; coul: string; gros?: boolean }) {
  return (
    <span style={{ fontFamily: SANS, fontSize: gros ? '0.75rem' : '0.65625rem', fontWeight: 700, letterSpacing: '0.02em', color: coul, background: colorMix(coul, 9), border: `1px solid ${colorMix(coul, 25)}`, borderRadius: '4px', padding: gros ? '2px 10px' : '1px 7px', whiteSpace: 'nowrap' }}>{txt}</span>
  )
}

// Filtre en pastille pour la valeur scientifique. La pastille porte la COULEUR du rang
// et son compte : la rangée de filtres est du même coup la légende du liseré de couleur
// qui court le long de chaque ligne de la file. Un rang vide ne se clique pas.
function ChipSci({ code, actif, n, onClick }: { code: string; actif: boolean; n: number; onClick: () => void }) {
  const coul = C_SCI[code] ?? 'var(--cs-systeme)'
  const mort = n === 0 && !actif
  return (
    <button onClick={onClick} disabled={mort} aria-pressed={actif}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontFamily: SANS, fontSize: '0.71875rem', fontWeight: actif ? 700 : 500, cursor: mort ? 'default' : 'pointer', padding: '3px 10px', borderRadius: '999px', border: `1px solid ${actif ? coul : 'var(--cs-bord)'}`, background: actif ? colorMix(coul, 12) : 'var(--cs-surface)', color: actif ? coul : 'var(--cs-texte-second)', opacity: mort ? 0.45 : 1, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ width: '7px', height: '7px', borderRadius: '50%', background: coul, flexShrink: 0 }} />
      {L_SCI[code] ?? code}
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: actif ? coul : 'var(--cs-texte-faible)' }}>{n}</span>
    </button>
  )
}

const champStyle: React.CSSProperties = { fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '6px 9px', width: '100%', boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { fontFamily: SANS, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', marginBottom: '3px' }
const carteStyle: React.CSSProperties = { background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '13px 15px' }
const legendeStyle: React.CSSProperties = { fontFamily: SANS, fontSize: '0.65625rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--cs-texte-gris)', margin: '0 0 10px' }
const btnPrincipal: React.CSSProperties = { fontFamily: SANS, fontSize: '0.75rem', fontWeight: 600, padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }
const btnDoux: React.CSSProperties = { fontFamily: SANS, fontSize: '0.75rem', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer' }

export default function SectionOuvrages() {
  const [lignes, setLignes] = useState<LigneQualite[]>([])
  const [editeursV, setEditeursV] = useState<Autorite[]>([])
  const [collectionsV, setCollectionsV] = useState<Autorite[]>([])
  const [auteursV, setAuteursV] = useState<FicheAuteur[]>([])
  const [chargement, setChargement] = useState(true)
  const [q, setQ] = useState('')
  const [filtreSci, setFiltreSci] = useState('')          // '', retenu, secondaire, a_verifier, exclu
  const [filtreEdito, setFiltreEdito] = useState('')      // '', a_revoir, en_cours, valide, rejete
  const [filtreDrapeau, setFiltreDrapeau] = useState<Drapeau>('')
  const [tri, setTri] = useState<Tri>('titre')
  const [selId, setSelId] = useState<number | null>(null)
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    let annule = false
    ;(async () => {
      const [vue, ed, co, au] = await Promise.all([
        supabase.from('v_ouvrages_bibliographiques_qualite').select(CHAMPS_VUE).order('titre'),
        supabase.from('editeurs_valeur').select('id, nom, score').order('nom'),
        supabase.from('collections_valeur').select('id, nom, score').order('nom'),
        supabase.from('auteurs_valeur').select('id, nom, score, reserve, prenom, nom_famille, pseudonyme').order('nom'),
      ])
      if (annule) return
      if (vue.error) setErreur(messageErreur(vue.error.message))
      setLignes((vue.data ?? []) as LigneQualite[])
      setEditeursV((ed.data ?? []) as Autorite[])
      setCollectionsV((co.data ?? []) as Autorite[])
      setAuteursV((au.data ?? []) as FicheAuteur[])
      setChargement(false)
    })()
    return () => { annule = true }
  }, [])

  // La confirmation s'efface d'elle-même : c'est un accusé de réception, pas un état.
  // L'erreur, elle, reste tant qu'on ne l'a pas remplacée.
  useEffect(() => {
    if (!info) return
    const t = window.setTimeout(() => setInfo(''), 3200)
    return () => window.clearTimeout(t)
  }, [info])

  // Recharge une seule ligne après une écriture (la base a pu recalculer le statut).
  const rechargerLigne = useCallback(async (id: number) => {
    const { data } = await supabase.from('v_ouvrages_bibliographiques_qualite').select(CHAMPS_VUE).eq('id', id).maybeSingle()
    if (data) setLignes(prev => prev.map(l => l.id === id ? (data as LigneQualite) : l))
  }, [])

  const qn = sansAccents(q.trim())
  // La recherche s'applique d'abord : les compteurs des filtres portent alors sur ce
  // qu'on cherche, et non sur un corpus entier qu'on ne regarde plus.
  const cherchees = useMemo(() => lignes.filter(l =>
    !qn || sansAccents(`${l.titre} ${l.auteurs ?? ''} ${l.editeur ?? ''} ${l.collection ?? ''}`).includes(qn)
  ), [lignes, qn])

  const sansEditeur = (l: LigneQualite) => !l.editeur_canonique
  const sansContrib = (l: LigneQualite) => (l.contributeurs ?? []).length === 0
  const enReserve = (l: LigneQualite) => (l.contributeurs ?? []).some(c => c.reserve)

  const comptes = useMemo(() => {
    const n = (p: (l: LigneQualite) => boolean) => cherchees.filter(p).length
    return {
      sci: Object.fromEntries(Object.keys(L_SCI).map(s => [s, n(l => l.statut_scientifique === s)])) as Record<string, number>,
      edito: Object.fromEntries(ETATS_EDITO.map(s => [s, n(l => l.statut_editorial === s)])) as Record<string, number>,
      override: n(l => !!l.statut_scientifique_override),
      reserve: n(enReserve),
      sans_editeur: n(sansEditeur),
      sans_contrib: n(sansContrib),
    }
  }, [cherchees])

  const filtrees = useMemo(() => {
    const gardees = cherchees.filter(l => {
      if (filtreSci && l.statut_scientifique !== filtreSci) return false
      if (filtreEdito && l.statut_editorial !== filtreEdito) return false
      if (filtreDrapeau === 'override' && !l.statut_scientifique_override) return false
      if (filtreDrapeau === 'reserve' && !enReserve(l)) return false
      if (filtreDrapeau === 'sans_editeur' && !sansEditeur(l)) return false
      if (filtreDrapeau === 'sans_contrib' && !sansContrib(l)) return false
      return true
    })
    const fr = (a: string, b: string) => a.localeCompare(b, 'fr')
    return [...gardees].sort((a, b) => {
      if (tri === 'auteur') return fr(a.auteurs ?? 'zzz', b.auteurs ?? 'zzz') || fr(a.titre, b.titre)
      if (tri === 'editeur') return fr(a.editeur ?? 'zzz', b.editeur ?? 'zzz') || fr(a.titre, b.titre)
      if (tri === 'annee') return (b.annee ?? 0) - (a.annee ?? 0) || fr(a.titre, b.titre)
      return fr(a.titre, b.titre)
    })
  }, [cherchees, filtreSci, filtreEdito, filtreDrapeau, tri])

  // La flèche « suivant » avance dans la file filtrée ; la file suit du regard.
  const rang = selId == null ? -1 : filtrees.findIndex(l => l.id === selId)
  const aller = (pas: number) => { const cible = filtrees[rang + pas]; if (cible) setSelId(cible.id) }
  useEffect(() => {
    if (selId == null) return
    document.getElementById(`ouv-${selId}`)?.scrollIntoView({ block: 'nearest' })
  }, [selId, filtrees])

  const filtreActif = !!(q || filtreSci || filtreEdito || filtreDrapeau)
  const reinitialiser = () => { setQ(''); setFiltreSci(''); setFiltreEdito(''); setFiltreDrapeau('') }
  const selection = selId == null ? null : lignes.find(l => l.id === selId) ?? null
  const nbValides = useMemo(() => lignes.filter(l => l.statut_editorial === 'valide').length, [lignes])

  if (chargement) return <p style={{ fontFamily: SANS, fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>

  return (
    <div>
      <style>{`
        .ouv-grid { display: grid; grid-template-columns: 26rem 1fr; gap: 22px; align-items: start; }
        .ouv-file { position: sticky; top: 4.75rem; max-height: calc(100vh - 6rem); overflow: auto; padding-right: 4px; }
        .ouv-ligne:hover { border-color: rgba(var(--cs-vert-rgb), 0.45) !important; }
        .ouv-msg { position: sticky; top: 4.75rem; z-index: 5; }
        /* Grille de la notice : six colonnes, chaque champ prenant la largeur que son
           contenu mérite (un titre n'est pas un numéro de collection). Les portées
           passent par des CLASSES et non par du style en ligne, sans quoi la requête
           média ne pourrait pas les reprendre à l'étroit. */
        .ouv-notice { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
        .ouv-c1 { grid-column: span 1 } .ouv-c2 { grid-column: span 2 } .ouv-c3 { grid-column: span 3 }
        .ouv-c4 { grid-column: span 4 } .ouv-c6 { grid-column: span 6 }
        @media (max-width: 1180px) {
          .ouv-notice { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .ouv-c1, .ouv-c2, .ouv-c3, .ouv-c4 { grid-column: span 1 }
          .ouv-c6 { grid-column: span 2 }
        }
        @media (max-width: 900px) {
          .ouv-grid { grid-template-columns: 1fr; }
          /* La file garde sa propre boîte défilante : empilée en pleine hauteur, elle
             repousserait la fiche à un écran et demi de là. */
          .ouv-file { position: static; max-height: 24rem; }
          .ouv-msg { position: static; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', margin: '0 0 6px' }}>
        <h2 style={{ fontFamily: SERIF, fontSize: '1.3125rem', fontWeight: 'normal', color: 'var(--cs-encre)', margin: 0 }}>Ouvrages bibliographiques</h2>
        <span style={{ fontFamily: SANS, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--cs-vert-fonce)' }}>{nbValides} validé{nbValides > 1 ? 's' : ''} / {lignes.length}</span>
      </div>
      <p style={{ fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 18px', maxWidth: '52rem' }}>
        La valeur scientifique d’un ouvrage est calculée par la base à partir de son éditeur, de sa collection et de ses contributeurs. On consulte ici ce calcul, on saisit une décision manuelle lorsqu’elle s’impose, et l’on rattache l’ouvrage à ses autorités normalisées. Les Pères et les autres auteurs anciens sont des sources : ils n’ont jamais de fiche notée.
      </p>

      <div className="ouv-grid">
        {/* ── FILE ────────────────────────────────────────────────────────── */}
        <div className="ouv-file cs-defilement-discret">
          <div style={{ ...carteStyle, padding: '11px 12px', marginBottom: '10px' }}>
            <div style={{ position: 'relative', marginBottom: '9px' }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Titre, auteur, éditeur, collection…"
                style={{ ...champStyle, paddingRight: q ? '2rem' : '9px' }} />
              {q && (
                <button onClick={() => setQ('')} aria-label="Effacer la recherche"
                  style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: 'var(--cs-texte-faible)', fontSize: '0.9375rem', lineHeight: 1, cursor: 'pointer', padding: '2px' }}>×</button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
              {Object.keys(L_SCI).map(s => (
                <ChipSci key={s} code={s} n={comptes.sci[s] ?? 0} actif={filtreSci === s}
                  onClick={() => setFiltreSci(filtreSci === s ? '' : s)} />
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={labelStyle} htmlFor="ouv-edito">État éditorial</label>
                <select id="ouv-edito" value={filtreEdito} onChange={e => setFiltreEdito(e.target.value)} style={{ ...champStyle, fontSize: '0.75rem', padding: '5px 7px' }}>
                  <option value="">— tous —</option>
                  {ETATS_EDITO.map(s => <option key={s} value={s}>{L_EDITO[s]} ({comptes.edito[s] ?? 0})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="ouv-drapeau">Signalement</label>
                <select id="ouv-drapeau" value={filtreDrapeau} onChange={e => setFiltreDrapeau(e.target.value as Drapeau)} style={{ ...champStyle, fontSize: '0.75rem', padding: '5px 7px' }}>
                  <option value="">— tous —</option>
                  <option value="override">Décision manuelle ({comptes.override})</option>
                  <option value="reserve">Contributeur en réserve ({comptes.reserve})</option>
                  <option value="sans_editeur">Éditeur non rattaché ({comptes.sans_editeur})</option>
                  <option value="sans_contrib">Sans contributeur ({comptes.sans_contrib})</option>
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle} htmlFor="ouv-tri">Tri</label>
                <select id="ouv-tri" value={tri} onChange={e => setTri(e.target.value as Tri)} style={{ ...champStyle, fontSize: '0.75rem', padding: '5px 7px' }}>
                  <option value="titre">Titre (A → Z)</option>
                  <option value="auteur">Auteur (A → Z)</option>
                  <option value="editeur">Éditeur (A → Z)</option>
                  <option value="annee">Année (la plus récente d’abord)</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', margin: '0 2px 7px' }}>
            <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)' }}>{filtrees.length} ouvrage{filtrees.length > 1 ? 's' : ''}</span>
            {filtreActif && (
              <button onClick={reinitialiser} style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Tout afficher</button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {filtrees.map(l => <LigneFile key={l.id} l={l} actif={selId === l.id} onClick={() => setSelId(l.id)} />)}
            {filtrees.length === 0 && (
              <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', padding: '10px 2px', margin: 0 }}>Aucun ouvrage ne correspond.</p>
            )}
          </div>
        </div>

        {/* ── FICHE ───────────────────────────────────────────────────────── */}
        <div>
          {(erreur || info) && (
            <div className="ouv-msg" style={{ marginBottom: '12px' }}>
              {erreur && <p role="alert" style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '8px 11px', margin: 0, boxShadow: 'var(--cs-ombre-posee)' }}>{erreur}</p>}
              {info && <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-vert-fonce)', background: 'var(--cs-surface)', border: '1px solid rgba(var(--cs-vert-rgb),0.35)', borderRadius: '8px', padding: '8px 11px', margin: erreur ? '6px 0 0' : 0, boxShadow: 'var(--cs-ombre-posee)' }}>✓ {info}</p>}
            </div>
          )}

          {selection ? (
            <Fiche key={selection.id} ligne={selection} rang={rang} total={filtrees.length}
              editeursV={editeursV} collectionsV={collectionsV} auteursV={auteursV}
              onAller={aller} onErreur={setErreur} onInfo={setInfo} onSauve={() => rechargerLigne(selection.id)}
              onMajFiche={(fid, parties) => setAuteursV(prev => prev.map(a => a.id === fid ? { ...a, prenom: parties.prenom, nom_famille: parties.nom, pseudonyme: parties.pseudonyme } : a))} />
          ) : (
            <Sommaire total={lignes.length} comptes={comptes} nbValides={nbValides} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Une ligne de la file ────────────────────────────────────────────────────
// Le liseré de gauche porte la valeur scientifique (sa légende est la rangée de
// pastilles, plus haut). Les marques de droite ne paraissent que lorsqu'elles disent
// quelque chose : presque tout le corpus est « à revoir », l'afficher partout serait du
// bruit ; c'est l'exception qui mérite une marque.
function LigneFile({ l, actif, onClick }: { l: LigneQualite; actif: boolean; onClick: () => void }) {
  const coul = C_SCI[l.statut_scientifique] ?? 'var(--cs-systeme)'
  const reserve = (l.contributeurs ?? []).some(c => c.reserve)
  const marque = l.statut_editorial === 'valide' ? { s: '✓', c: 'var(--cs-vert)' }
    : l.statut_editorial === 'rejete' ? { s: '✕', c: 'var(--cs-danger-fonce)' }
    : l.statut_editorial === 'en_cours' ? { s: '◔', c: 'var(--cs-systeme)' } : null
  return (
    <button id={`ouv-${l.id}`} onClick={onClick} aria-pressed={actif} className="ouv-ligne"
      style={{ display: 'grid', gridTemplateColumns: '3px 1fr auto', gap: '9px', alignItems: 'stretch', width: '100%', textAlign: 'left', cursor: 'pointer', padding: '7px 9px 7px 0', borderRadius: '8px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`, background: actif ? colorMix('var(--cs-vert)', 6) : 'var(--cs-surface)', overflow: 'hidden', transition: 'border-color 0.12s' }}>
      {/* Le liseré court sur TOUTE la hauteur de la ligne : les marges négatives
          reprennent le rembourrage vertical que la grille lui imposerait. */}
      <span aria-hidden style={{ background: coul, margin: '-7px 0' }} />
      <span style={{ minWidth: 0, display: 'block' }}>
        <span style={{ display: 'block', fontFamily: SERIF, fontSize: '0.875rem', color: 'var(--cs-texte)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.titre}</span>
        <span style={{ display: 'block', fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-second)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
          {l.auteurs || '—'}{l.annee ? ` · ${l.annee}` : ''}
        </span>
        <span style={{ display: 'block', fontFamily: SANS, fontSize: '0.625rem', color: 'var(--cs-texte-faible)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {l.editeur || '—'}{l.collection ? ` · ${l.collection}` : ''}
        </span>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0, fontSize: '0.71875rem', lineHeight: 1.2 }}>
        {marque && <span title={L_EDITO[l.statut_editorial]} style={{ color: marque.c }}>{marque.s}</span>}
        {reserve && <span title="Un contributeur est en réserve" style={{ color: 'var(--cs-danger-fonce)' }}>⚑</span>}
      </span>
    </button>
  )
}

// ── Écran d'accueil de la fiche : l'état du chantier avant d'ouvrir un titre ─
function Nombre({ n, quoi, coul }: { n: number; quoi: string; coul: string }) {
  return (
    <div style={{ ...carteStyle, padding: '11px 13px' }}>
      <div style={{ fontFamily: SERIF, fontSize: '1.5rem', color: coul, lineHeight: 1.1 }}>{n}</div>
      <div style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-second)', marginTop: '2px' }}>{quoi}</div>
    </div>
  )
}

function Sommaire({ total, comptes, nbValides }: { total: number; comptes: { sci: Record<string, number>; override: number; reserve: number; sans_editeur: number; sans_contrib: number }; nbValides: number }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(8.5rem, 1fr))', gap: '10px', marginBottom: '16px' }}>
        <Nombre n={total} quoi="ouvrages au catalogue" coul="var(--cs-encre)" />
        <Nombre n={comptes.sci.retenu ?? 0} quoi="retenus" coul={C_SCI.retenu} />
        <Nombre n={comptes.sci.secondaire ?? 0} quoi="sources secondaires" coul={C_SCI.secondaire} />
        <Nombre n={nbValides} quoi="validés éditorialement" coul={C_EDITO.valide} />
      </div>
      <div style={{ ...carteStyle }}>
        <p style={legendeStyle}>Ce qui reste à faire</p>
        <ul style={{ fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.7, margin: 0, paddingLeft: '1.1rem' }}>
          <li><b style={{ color: 'var(--cs-texte)' }}>{comptes.sans_editeur}</b> ouvrages dont l’éditeur n’est pas rattaché à une autorité notée.</li>
          <li><b style={{ color: 'var(--cs-texte)' }}>{comptes.sans_contrib}</b> sans aucun contributeur déclaré.</li>
          <li><b style={{ color: 'var(--cs-texte)' }}>{comptes.override}</b> portent une décision manuelle, qui prime sur le calcul de la base.</li>
          <li><b style={{ color: 'var(--cs-texte)' }}>{comptes.reserve}</b> comptent un contributeur en réserve.</li>
        </ul>
        <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', margin: '13px 0 0' }}>Choisissez un ouvrage dans la file pour ouvrir sa fiche.</p>
      </div>
    </div>
  )
}

// ── Citation composée, telle qu'elle paraît en documentation ────────────────
// Même ordre que `ReferenceBiblio` (app/pericopes/[id]/page.tsx) : auteurs, titre en
// italique, sous-titre, collection, lieu et éditeur, année.
function Citation({ o }: { o: Partial<OuvrageDetail> }) {
  const gens = (o.auteurs ?? '').trim() || ((o.directeurs ?? '').trim() ? `${o.directeurs} (dir.)` : '')
  const lieuEd = [o.lieu, o.editeur].filter(Boolean).join(', ')
  return (
    <p style={{ fontFamily: SERIF, fontSize: '1rem', lineHeight: 1.55, color: 'var(--cs-texte)', margin: 0 }}>
      {gens && <span>{typo(gens)}, </span>}
      <em style={{ fontStyle: 'italic', color: 'var(--cs-encre)' }}>{typo(o.titre ?? '')}</em>
      {o.sous_titre && <span>. {typo(o.sous_titre)}</span>}
      {o.collection && <span>, coll. {'« '}{typo(o.collection)}{' »'}{o.numero_collection ? `, ${o.numero_collection}` : ''}</span>}
      {lieuEd && <span>, {typo(lieuEd)}</span>}
      {o.annee ? <span>, {o.annee}</span> : null}
      <span>.</span>
    </p>
  )
}

// ── Fiche d'un ouvrage ──────────────────────────────────────────────────────
function Fiche({ ligne, rang, total, editeursV, collectionsV, auteursV, onAller, onErreur, onInfo, onSauve, onMajFiche }: {
  ligne: LigneQualite; rang: number; total: number
  editeursV: Autorite[]; collectionsV: Autorite[]; auteursV: FicheAuteur[]
  onAller: (pas: number) => void
  onErreur: (s: string) => void; onInfo: (s: string) => void; onSauve: () => void
  onMajFiche: (id: number, parties: NomStructure) => void
}) {
  const id = ligne.id
  const [detail, setDetail] = useState<OuvrageDetail | null>(null)
  const [contribs, setContribs] = useState<LigneContrib[]>([])
  const [f, setF] = useState<Partial<OuvrageDetail>>({})

  useEffect(() => {
    let annule = false
    ;(async () => {
      const [d, c] = await Promise.all([
        supabase.from('ouvrages_bibliographiques')
          .select('id, auteurs, titre, sous_titre, directeurs, traducteurs, collection, numero_collection, lieu, editeur, annee, isbn, langue, type_ouvrage, garantie_scientifique, note, statut_editorial, editeur_valeur_id, collection_valeur_id, statut_scientifique, statut_scientifique_override, motif_statut_scientifique, source_evaluation_scientifique, confiance_evaluation_scientifique')
          .eq('id', id).maybeSingle(),
        supabase.from('ouvrage_contributeurs_scientifiques')
          .select('id, ouvrage_id, auteur_valeur_id, nom_affiche, role_contributeur, nature_personne, ordre')
          .eq('ouvrage_id', id).order('ordre'),
      ])
      if (annule) return
      setDetail((d.data ?? null) as OuvrageDetail | null)
      setF((d.data ?? {}) as Partial<OuvrageDetail>)
      setContribs((c.data ?? []) as LigneContrib[])
    })()
    return () => { annule = true }
  }, [id])

  const set = (k: keyof OuvrageDetail, v: unknown) => setF(prev => ({ ...prev, [k]: v }))

  // Écrit des champs de l'ouvrage (confirmé par la base avant de conclure). Les valeurs
  // acceptées sont reversées dans la fiche : sans quoi le formulaire se croirait modifié
  // juste après avoir été enregistré, et le bouton resterait allumé pour rien.
  const ecrire = async (champs: Record<string, unknown>, messageOk: string) => {
    onErreur(''); onInfo('')
    const { error } = await supabase.from('ouvrages_bibliographiques').update(champs).eq('id', id)
    if (error) { onErreur(messageErreur(error.message)); return false }
    setDetail(prev => (prev ? ({ ...prev, ...champs } as OuvrageDetail) : prev))
    setF(prev => ({ ...prev, ...champs }))
    onInfo(messageOk); onSauve()
    return true
  }

  const navigation = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <button onClick={() => onAller(-1)} disabled={rang <= 0} className="btn-gris" style={{ ...btnDoux, padding: '4px 10px' }}>‹ Précédent</button>
      <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', fontVariantNumeric: 'tabular-nums' }}>
        {rang >= 0 ? `${rang + 1} / ${total}` : 'hors du filtre courant'}
      </span>
      <button onClick={() => onAller(1)} disabled={rang < 0 || rang >= total - 1} className="btn-gris" style={{ ...btnDoux, padding: '4px 10px' }}>Suivant ›</button>
    </div>
  )

  if (!detail) return (
    <div>
      {navigation}
      <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>Chargement de la fiche…</p>
    </div>
  )

  const sciCalc = ligne.statut_scientifique // valeur calculée par la base, en lecture seule
  const overrideActuel = f.statut_scientifique_override ?? null
  const editorialActuel = f.statut_editorial ?? detail.statut_editorial

  const CHAMPS_DECISION: (keyof OuvrageDetail)[] = ['statut_scientifique_override', 'motif_statut_scientifique', 'source_evaluation_scientifique', 'confiance_evaluation_scientifique']
  const CHAMPS_NOTICE: (keyof OuvrageDetail)[] = ['auteurs', 'titre', 'sous_titre', 'directeurs', 'traducteurs', 'editeur', 'collection', 'numero_collection', 'lieu', 'isbn', 'langue', 'annee', 'type_ouvrage', 'garantie_scientifique', 'note']
  const modifie = (champs: (keyof OuvrageDetail)[]) => champs.some(k => vide(f[k]) !== vide(detail[k]))
  const decisionModifiee = modifie(CHAMPS_DECISION)
  const noticeModifiee = modifie(CHAMPS_NOTICE)

  // Enregistre la décision manuelle. Pré-contrôle : exclusion => motif obligatoire.
  const enregistrerDecision = async () => {
    if (overrideActuel === 'exclu' && !((f.motif_statut_scientifique ?? '').trim())) {
      onErreur('Une exclusion manuelle exige un motif.'); return
    }
    await ecrire({
      statut_scientifique_override: overrideActuel,
      motif_statut_scientifique: (f.motif_statut_scientifique ?? '') || null,
      source_evaluation_scientifique: (f.source_evaluation_scientifique ?? '') || null,
      confiance_evaluation_scientifique: f.confiance_evaluation_scientifique || null,
      evalue_at_scientifique: new Date().toISOString(),
    }, 'Décision scientifique enregistrée.')
  }
  const revenirAuto = async () => {
    set('statut_scientifique_override', null)
    await ecrire({ statut_scientifique_override: null }, 'Retour au calcul automatique.')
  }

  // Statut éditorial : la base refuse « validé » si la valeur scientifique n'est pas
  // admise (retenu / secondaire) ; on l'annonce avant l'écriture (§10).
  const majEditorial = async (v: string) => {
    if (v === 'valide' && !['retenu', 'secondaire'].includes(sciCalc)) {
      onErreur('Cet ouvrage ne peut pas être validé tant que sa valeur scientifique n’est pas admise (retenu ou source secondaire).')
      return
    }
    const champs: Record<string, unknown> = { statut_editorial: v }
    if (v === 'valide') { champs.valide_at = new Date().toISOString(); champs.valide_par = 'admin' }
    await ecrire(champs, 'Statut éditorial mis à jour.')
  }

  const majRattachement = async (champ: 'editeur_valeur_id' | 'collection_valeur_id', v: number | null) => {
    set(champ, v)
    await ecrire({ [champ]: v }, 'Rattachement mis à jour.')
  }

  const champNotice = (k: keyof OuvrageDetail, lab: string, classe: string) => (
    <div key={k} className={classe}>
      <label style={labelStyle}>{lab}</label>
      <input value={(f[k] as string) ?? ''} onChange={e => set(k, e.target.value)} style={champStyle} />
    </div>
  )

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      {navigation}

      {/* ── En-tête : la notice telle qu'elle se lit, son rang, son état ──── */}
      <div style={{ ...carteStyle, borderColor: 'var(--cs-vert-pale)', background: colorMix('var(--cs-vert)', 3) }}>
        <Citation o={f} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '11px' }}>
          <Puce gros txt={L_SCI[sciCalc] ?? sciCalc} coul={C_SCI[sciCalc] ?? 'var(--cs-systeme)'} />
          {ligne.statut_scientifique_override && <Puce txt="Décision manuelle" coul="var(--cs-systeme)" />}
          {(ligne.contributeurs ?? []).some(c => c.reserve) && <Puce txt="⚑ Contributeur en réserve" coul="var(--cs-danger-fonce)" />}
          {f.type_ouvrage && <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)' }}>{L_TYPE[f.type_ouvrage] ?? f.type_ouvrage}</span>}
          {f.langue && <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)' }}>· {f.langue}</span>}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', alignItems: 'center', marginTop: '12px', paddingTop: '11px', borderTop: '1px solid var(--cs-bord-clair)' }}>
          <span style={{ ...labelStyle, marginBottom: 0, marginRight: '3px' }}>Statut éditorial</span>
          {ETATS_EDITO.map(s => {
            const actif = editorialActuel === s
            return (
              <button key={s} onClick={() => majEditorial(s)}
                style={{ fontFamily: SANS, fontSize: '0.75rem', fontWeight: actif ? 700 : 500, cursor: 'pointer', padding: '4px 12px', borderRadius: '8px', border: `1px solid ${actif ? C_EDITO[s] : 'var(--cs-bord)'}`, background: actif ? colorMix(C_EDITO[s], 10) : 'var(--cs-surface)', color: actif ? C_EDITO[s] : 'var(--cs-texte-second)' }}>{L_EDITO[s]}</button>
            )
          })}
        </div>
      </div>

      {/* ── Les auteurs, nom par nom ───────────────────────────────────────── */}
      <AuteursRubriques detail={detail} fiches={auteursV} onMajFiche={onMajFiche} onErreur={onErreur} onInfo={onInfo} />

      {/* ── A · Valeur scientifique ────────────────────────────────────────── */}
      <section style={carteStyle}>
        <p style={legendeStyle}>Valeur scientifique</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '9px', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--cs-texte-second)' }}>Calcul de la base :</span>
          <Puce txt={L_SCI[sciCalc] ?? sciCalc} coul={C_SCI[sciCalc] ?? 'var(--cs-systeme)'} />
          {ligne.statut_scientifique_override && (
            <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-systeme)' }}>Une décision manuelle est en vigueur : elle prime.</span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={labelStyle}>Décision manuelle</label>
            <select value={overrideActuel ?? ''} onChange={e => set('statut_scientifique_override', e.target.value || null)} style={champStyle}>
              <option value="">— calcul automatique —</option>
              {OVERRIDES.map(o => <option key={o} value={o}>{L_SCI[o]}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Confiance</label>
            <select value={f.confiance_evaluation_scientifique ?? ''} onChange={e => set('confiance_evaluation_scientifique', e.target.value || null)} style={champStyle}>
              <option value="">—</option>
              {CONFIANCES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Source de l’évaluation</label>
            <input value={f.source_evaluation_scientifique ?? ''} onChange={e => set('source_evaluation_scientifique', e.target.value)} style={champStyle} />
          </div>
        </div>
        <div style={{ marginTop: '10px' }}>
          <label style={labelStyle}>Motif {overrideActuel === 'exclu' && <span style={{ color: 'var(--cs-danger)' }}>(obligatoire pour une exclusion)</span>}</label>
          <input value={f.motif_statut_scientifique ?? ''} onChange={e => set('motif_statut_scientifique', e.target.value)} style={champStyle} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
          <button onClick={enregistrerDecision} disabled={!decisionModifiee} className="btn-vert" style={{ ...btnPrincipal, opacity: decisionModifiee ? 1 : 0.45, cursor: decisionModifiee ? 'pointer' : 'default' }}>Enregistrer la décision</button>
          {ligne.statut_scientifique_override && <button onClick={revenirAuto} className="btn-gris" style={btnDoux}>Revenir au calcul automatique</button>}
          {decisionModifiee && <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-attente)' }}>Modifications non enregistrées</span>}
        </div>
      </section>

      {/* ── B · Ce qui fonde le calcul ──────────────────────────────────────── */}
      {/* Rattachements et contributeurs sont réunis : ce sont les trois entrées du
          calcul, et les séparer obligeait à lire le statut d'un côté, à corriger sa
          cause de l'autre. Chaque rattachement affiche le rang de l'autorité choisie. */}
      <section style={carteStyle}>
        <p style={legendeStyle}>Ce qui fonde le calcul</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <Rattachement label="Autorité éditrice" brut={detail.editeur} canonique={ligne.editeur_canonique} statut={ligne.statut_editeur}
            valeur={f.editeur_valeur_id ?? null} options={editeursV} onChange={v => majRattachement('editeur_valeur_id', v)} />
          <Rattachement label="Collection" brut={detail.collection} canonique={ligne.collection_canonique} statut={ligne.statut_collection}
            valeur={f.collection_valeur_id ?? null} options={collectionsV} onChange={v => majRattachement('collection_valeur_id', v)} />
        </div>
        <ContributeursFiche ouvrageId={id} contribs={contribs} setContribs={setContribs} rangs={ligne.contributeurs ?? []}
          auteursV={auteursV} onErreur={onErreur} onInfo={onInfo} onChange={onSauve} />
      </section>

      {/* ── C · Notice bibliographique ─────────────────────────────────────── */}
      <section style={carteStyle}>
        <p style={legendeStyle}>Notice bibliographique</p>
        <div className="ouv-notice">
          {champNotice('titre', 'Titre', 'ouv-c6')}
          {champNotice('sous_titre', 'Sous-titre', 'ouv-c6')}
          {champNotice('auteurs', 'Auteurs', 'ouv-c3')}
          {champNotice('directeurs', 'Directeurs', 'ouv-c3')}
          {champNotice('traducteurs', 'Traducteurs', 'ouv-c3')}
          {champNotice('editeur', 'Éditeur (texte)', 'ouv-c3')}
          {champNotice('collection', 'Collection (texte)', 'ouv-c4')}
          {champNotice('numero_collection', 'N° collection', 'ouv-c2')}
          {champNotice('lieu', 'Lieu', 'ouv-c2')}
          <div className="ouv-c1">
            <label style={labelStyle}>Année</label>
            <input type="number" value={f.annee ?? ''} onChange={e => set('annee', e.target.value ? Number(e.target.value) : null)} style={champStyle} />
          </div>
          <div className="ouv-c1">
            <label style={labelStyle}>Langue</label>
            {/* Liste ouverte : la colonne mêle « fr » et « français », « la » et
                « latin ». La suggestion pousse vers le code sans interdire la saisie. */}
            <input list="ouv-langues" value={f.langue ?? ''} onChange={e => set('langue', e.target.value)} style={champStyle} />
            <datalist id="ouv-langues">
              {['fr', 'en', 'de', 'es', 'it', 'la', 'el', 'he', 'pt', 'cs'].map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          {champNotice('isbn', 'ISBN', 'ouv-c2')}
          <div className="ouv-c2">
            <label style={labelStyle}>Type</label>
            <select value={f.type_ouvrage ?? ''} onChange={e => set('type_ouvrage', e.target.value || null)} style={champStyle}>
              <option value="">—</option>
              {TYPES_OUVRAGE.map(t => <option key={t} value={t}>{L_TYPE[t] ?? t}</option>)}
            </select>
          </div>
          <div className="ouv-c2">
            <label style={labelStyle}>Garantie</label>
            <select value={f.garantie_scientifique ?? ''} onChange={e => set('garantie_scientifique', e.target.value || null)} style={champStyle}>
              <option value="">—</option>
              {Object.keys(L_GARANTIE).map(g => <option key={g} value={g}>{L_GARANTIE[g]}</option>)}
            </select>
          </div>
          <div className="ouv-c6">
            <label style={labelStyle}>Note</label>
            <textarea value={f.note ?? ''} onChange={e => set('note', e.target.value)} rows={2}
              style={{ ...champStyle, resize: 'vertical', lineHeight: 1.5 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '13px' }}>
          <button disabled={!noticeModifiee} className="btn-vert" style={{ ...btnPrincipal, opacity: noticeModifiee ? 1 : 0.45, cursor: noticeModifiee ? 'pointer' : 'default' }}
            onClick={() => ecrire({
              auteurs: (f.auteurs ?? '').trim(), titre: (f.titre ?? '').trim(), sous_titre: f.sous_titre || null,
              directeurs: f.directeurs || null, traducteurs: f.traducteurs || null, editeur: (f.editeur ?? '').trim(),
              collection: f.collection || null, numero_collection: f.numero_collection || null, lieu: f.lieu || null,
              isbn: f.isbn || null, langue: f.langue || null, annee: f.annee ?? null,
              type_ouvrage: f.type_ouvrage || null, garantie_scientifique: f.garantie_scientifique || null,
              note: f.note || null,
            }, 'Notice enregistrée.')}>Enregistrer la notice</button>
          {noticeModifiee
            ? <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-attente)' }}>Modifications non enregistrées</span>
            : <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)' }}>Aucune modification</span>}
        </div>
      </section>
    </div>
  )
}

// ── Les auteurs de la notice, nom par nom, en trois rubriques ───────────────
//
// La notice porte ses auteurs en TEXTE (« André Caquot; Philippe de Robert ») : c'est la
// liste fidèle, et elle le reste. Ce bloc la lit nom par nom et ouvre, pour chacun, les
// trois rubriques de la personne.
//
// ⛔ Les rubriques s'écrivent sur la FICHE de la personne (`auteurs_valeur`), jamais sur
// l'ouvrage : un nom appartient à quelqu'un, pas à chacun de ses livres. Corriger
// « de Vogüé » ici le corrige donc partout où l'auteur est cité, et une seule fois.
//
// ⚠️ Un nom que ni les fiches ni les lignes de contributeurs ne connaissent est SIGNALÉ,
// jamais créé : lui ouvrir une fiche non notée ferait retomber son ouvrage à
// « à vérifier » (internal.calculer_statut_scientifique_ouvrage), ce qui est un arbitrage
// éditorial et non une écriture d'écran. Ils sont recensés par
// `scripts/noms-orphelins.mts`.
function AuteursRubriques({ detail, fiches, onMajFiche, onErreur, onInfo }: {
  detail: OuvrageDetail; fiches: FicheAuteur[]
  onMajFiche: (id: number, parties: NomStructure) => void
  onErreur: (s: string) => void; onInfo: (s: string) => void
}) {
  const ROLES = [
    ['Auteur', detail.auteurs], ['Direction', detail.directeurs], ['Traduction', detail.traducteurs],
  ] as const
  const rangs = ROLES.flatMap(([role, brut]) => separerNoms(brut ?? '').map(nom => ({ role, nom })))

  return (
    <section style={carteStyle}>
      <p style={legendeStyle}>Les auteurs, nom par nom</p>
      {rangs.length === 0 ? (
        <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', margin: 0 }}>La notice ne nomme personne.</p>
      ) : (
        <div style={{ display: 'grid', gap: '7px' }}>
          {rangs.map(({ role, nom }, i) => (
            <LigneNom key={`${role}-${nom}-${i}`} role={role} nom={nom}
              fiche={fiches.find(f => f.nom === nom) ?? null}
              onMajFiche={onMajFiche} onErreur={onErreur} onInfo={onInfo} />
          ))}
        </div>
      )}
      <p style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', lineHeight: 1.55, margin: '11px 0 0' }}>
        Les rubriques appartiennent à la personne : les corriger ici les corrige partout où elle est citée. Un auteur jusqu’à la fin du Moyen Âge n’a ni nom ni prénom, son nom entier est un pseudonyme. Le texte de la notice, lui, se modifie plus bas.
      </p>
    </section>
  )
}

// Une ligne du bloc ci-dessus. L'état est LOCAL et l'écriture part au `blur` : lier les
// champs à la liste du parent redessinerait les six cents lignes de la file à chaque
// frappe. Le repli de l'affichage reste le nom de la notice, si bien qu'une fiche encore
// vide se lit tout de même.
function LigneNom({ role, nom, fiche, onMajFiche, onErreur, onInfo }: {
  role: string; nom: string; fiche: FicheAuteur | null
  onMajFiche: (id: number, parties: NomStructure) => void
  onErreur: (s: string) => void; onInfo: (s: string) => void
}) {
  const [parties, setParties] = useState<NomStructure>({
    prenom: fiche?.prenom ?? null, nom: fiche?.nom_famille ?? null, pseudonyme: fiche?.pseudonyme ?? null,
  })
  const [enregistre, setEnregistre] = useState(false)

  const set = (k: keyof NomStructure, v: string) => { setParties(p => ({ ...p, [k]: v || null })); setEnregistre(false) }

  const sauver = async () => {
    if (!fiche) return
    const inchange = (parties.prenom ?? '') === (fiche.prenom ?? '')
      && (parties.nom ?? '') === (fiche.nom_famille ?? '')
      && (parties.pseudonyme ?? '') === (fiche.pseudonyme ?? '')
    if (inchange) return
    onErreur(''); onInfo('')
    const { error } = await supabase.from('auteurs_valeur')
      .update({ prenom: parties.prenom, nom_famille: parties.nom, pseudonyme: parties.pseudonyme })
      .eq('id', fiche.id)
    if (error) { onErreur(messageErreur(error.message)); return }
    onMajFiche(fiche.id, parties)
    setEnregistre(true)
  }

  const affiche = composerNom(parties, nom)
  return (
    <div style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '8px 10px', background: fiche ? 'var(--cs-fond-clair)' : colorMix('var(--cs-attente)', 5) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: fiche ? '7px' : 0 }}>
        <span style={{ fontFamily: SERIF, fontSize: '0.875rem', color: 'var(--cs-texte)' }}>{affiche}</span>
        <span style={{ fontFamily: SANS, fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)' }}>{role}</span>
        {affiche !== nom && <span style={{ fontFamily: SANS, fontSize: '0.65625rem', color: 'var(--cs-texte-faible)' }}>la notice porte « {nom} »</span>}
        {enregistre && <span style={{ fontFamily: SANS, fontSize: '0.65625rem', color: 'var(--cs-vert-fonce)' }}>✓ enregistré</span>}
      </div>
      {fiche ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '8px' }}>
          <div>
            <label style={labelStyle}>Nom</label>
            <input value={parties.nom ?? ''} onChange={e => set('nom', e.target.value)} onBlur={sauver} style={champStyle} />
          </div>
          <div>
            <label style={labelStyle}>Prénom</label>
            <input value={parties.prenom ?? ''} onChange={e => set('prenom', e.target.value)} onBlur={sauver} style={champStyle} />
          </div>
          <div>
            <label style={labelStyle}>Pseudonyme</label>
            <input value={parties.pseudonyme ?? ''} onChange={e => set('pseudonyme', e.target.value)} onBlur={sauver}
              placeholder="Voltaire, Irénée de Lyon…" style={champStyle} />
          </div>
        </div>
      ) : (
        <p style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-attente)', margin: '4px 0 0' }}>
          Ce nom n’a pas de fiche : ses rubriques ne peuvent pas être saisies tant qu’il n’est pas rattaché.
        </p>
      )}
    </div>
  )
}

// ── Un rattachement à une autorité, avec le rang qu'il apporte au calcul ────
function Rattachement({ label, brut, canonique, statut, valeur, options, onChange }: {
  label: string; brut: string | null; canonique: string | null; statut: string | null
  valeur: number | null; options: Autorite[]; onChange: (v: number | null) => void
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={valeur ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} style={champStyle}>
        <option value="">— aucune —</option>
        {options.map(a => <option key={a.id} value={a.id}>{a.nom}{a.score ? ` — ${a.score}` : ''}</option>)}
      </select>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '5px', fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)' }}>
        <span>Notice&nbsp;: {brut || '—'}</span>
        {canonique && statut
          ? <Puce txt={L_USAGE[statut] ?? statut} coul={C_USAGE[statut] ?? 'var(--cs-systeme)'} />
          : <span style={{ color: 'var(--cs-attente)' }}>non rattaché</span>}
      </div>
    </div>
  )
}

// ── Contributeurs scientifiques ─────────────────────────────────────────────
// La liste affiche le RANG de chaque contributeur, pris à la vue de qualité : c'est lui
// qui entre dans le calcul, et l'on ne comprend pas un statut sans voir ce qui le nourrit.
function ContributeursFiche({ ouvrageId, contribs, setContribs, rangs, auteursV, onErreur, onInfo, onChange }: {
  ouvrageId: number; contribs: LigneContrib[]; setContribs: (c: LigneContrib[]) => void
  rangs: Contributeur[]; auteursV: FicheAuteur[]; onErreur: (s: string) => void; onInfo: (s: string) => void; onChange: () => void
}) {
  const [nature, setNature] = useState<'chercheur' | 'auteur_ancien' | 'collectif'>('chercheur')
  const [role, setRole] = useState('auteur_scientifique')
  const [auteurId, setAuteurId] = useState<number | ''>('')
  const [nomLibre, setNomLibre] = useState('')

  const ajouter = async () => {
    onErreur(''); onInfo('')
    // Contrainte de la base : chercheur ⇒ fiche notée obligatoire ; auteur ancien /
    // collectif ⇒ jamais de fiche notée (auteur_valeur_id null). §6.
    const estNote = nature === 'chercheur'
    if (estNote && !auteurId) { onErreur('Choisir la fiche du chercheur (les chercheurs modernes sont notés).'); return }
    if (!estNote && !nomLibre.trim()) { onErreur('Indiquer le nom affiché.'); return }
    const nom = estNote ? (auteursV.find(a => a.id === auteurId)?.nom ?? '') : nomLibre.trim()
    const ordre = contribs.length ? Math.max(...contribs.map(c => c.ordre)) + 1 : 1
    const { data, error } = await supabase.from('ouvrage_contributeurs_scientifiques')
      .insert({ ouvrage_id: ouvrageId, auteur_valeur_id: estNote ? auteurId : null, nom_affiche: nom, role_contributeur: role, nature_personne: nature, ordre })
      .select('id, ouvrage_id, auteur_valeur_id, nom_affiche, role_contributeur, nature_personne, ordre').maybeSingle()
    if (error) { onErreur(messageErreur(error.message)); return }
    if (data) { setContribs([...contribs, data as LigneContrib]); setNomLibre(''); setAuteurId(''); onInfo('Contributeur ajouté.'); onChange() }
  }

  const supprimer = async (cid: number) => {
    onErreur(''); onInfo('')
    const { error } = await supabase.from('ouvrage_contributeurs_scientifiques').delete().eq('id', cid)
    if (error) { onErreur(messageErreur(error.message)); return }
    setContribs(contribs.filter(c => c.id !== cid)); onChange()
  }

  return (
    <div>
      <label style={labelStyle}>Contributeurs</label>
      <div style={{ display: 'grid', gap: '5px', marginBottom: '11px' }}>
        {contribs.map(c => {
          const rang = rangs.find(r => r.nom === c.nom_affiche)
          // Un chercheur paraît sous son nom composé, un ancien ou un collectif sous le
          // nom que porte sa ligne : eux n'ont pas de fiche, par doctrine.
          const fiche = c.auteur_valeur_id ? auteursV.find(a => a.id === c.auteur_valeur_id) : undefined
          return (
            <div key={c.id} style={{ display: 'flex', gap: '9px', alignItems: 'center', fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-texte)', padding: '5px 9px', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', background: 'var(--cs-fond-clair)' }}>
              <span style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontSize: '0.84375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{composerNom(partiesDe(fiche), c.nom_affiche)}</span>
              {rang?.reserve && <span title="En réserve" style={{ color: 'var(--cs-danger-fonce)', fontSize: '0.75rem' }}>⚑</span>}
              {rang?.statut && <Puce txt={`${rang.score ?? '—'} · ${L_USAGE[rang.statut] ?? rang.statut}`} coul={C_USAGE[rang.statut] ?? 'var(--cs-systeme)'} />}
              <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', whiteSpace: 'nowrap' }}>{L_ROLE[c.role_contributeur] ?? c.role_contributeur}</span>
              <span style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{L_NATURE[c.nature_personne] ?? c.nature_personne}</span>
              <button onClick={() => supprimer(c.id)} title="Retirer" aria-label={`Retirer ${c.nom_affiche}`} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--cs-danger)', fontSize: '0.9375rem', lineHeight: 1 }}>×</button>
            </div>
          )
        })}
        {contribs.length === 0 && <span style={{ fontFamily: SANS, fontSize: '0.75rem', color: 'var(--cs-attente)', fontStyle: 'italic' }}>Aucun contributeur rattaché : le calcul ne repose alors que sur l’éditeur et la collection.</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(9rem, 1fr))', gap: '8px', alignItems: 'end', background: colorMix('var(--cs-vert)', 4), border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '10px' }}>
        <div>
          <label style={labelStyle}>Nature</label>
          <select value={nature} onChange={e => setNature(e.target.value as typeof nature)} style={champStyle}>
            <option value="chercheur">Chercheur moderne</option>
            <option value="auteur_ancien">Auteur ancien</option>
            <option value="collectif">Collectif</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Rôle</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={champStyle}>
            {Object.keys(L_ROLE).map(r => <option key={r} value={r}>{L_ROLE[r]}</option>)}
          </select>
        </div>
        {nature === 'chercheur' ? (
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Fiche du chercheur</label>
            <select value={auteurId} onChange={e => setAuteurId(e.target.value ? Number(e.target.value) : '')} style={champStyle}>
              <option value="">— choisir —</option>
              {auteursV.map(a => <option key={a.id} value={a.id}>{a.nom}{a.score ? ` — ${a.score}` : ''}{a.reserve ? ' · réserve' : ''}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Nom affiché</label>
            <input value={nomLibre} onChange={e => setNomLibre(e.target.value)} placeholder="Origène, Auteurs patristiques divers…" style={champStyle} />
          </div>
        )}
        <button onClick={ajouter} className="btn-vert" style={{ ...btnPrincipal, padding: '6px 12px', height: 'fit-content' }}>Ajouter</button>
      </div>
    </div>
  )
}
