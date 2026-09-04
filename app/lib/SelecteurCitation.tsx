'use client'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'

import { useState, useEffect, type CSSProperties, type ReactNode } from 'react'
import { supabase } from '@/app/lib/supabase'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { rendreTexteEnrichi, texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { cleTriTitre } from '@/app/lib/titres'
import { mentionTraducteurs } from '@/app/lib/traducteurs'
import { chargerChapitresParLivre, nombreDeChapitres, type ChapitresParLivre } from '@/app/lib/chapitresCanon'

const NOM_FR: Record<string, string> = {
  GEN:'Genèse',EXO:'Exode',LEV:'Lévitique',NUM:'Nombres',DEU:'Deutéronome',JOS:'Josué',JDG:'Juges',RUT:'Ruth',
  '1SA':'1 Samuel','2SA':'2 Samuel','1KI':'1 Rois','2KI':'2 Rois','1CH':'1 Chroniques','2CH':'2 Chroniques',
  EZR:'Esdras',NEH:'Néhémie',EST:'Esther',JOB:'Job',PSA:'Psaumes',PRO:'Proverbes',ECC:'Ecclésiaste',SNG:'Cantique des cantiques',
  ISA:'Isaïe',JER:'Jérémie',LAM:'Lamentations',EZK:'Ézéchiel',DAN:'Daniel',HOS:'Osée',JOL:'Joël',AMO:'Amos',
  OBA:'Abdias',JON:'Jonas',MIC:'Michée',NAM:'Nahum',HAB:'Habacuc',ZEP:'Sophonie',HAG:'Aggée',ZEC:'Zacharie',MAL:'Malachie',
  MAT:'Matthieu',MRK:'Marc',LUK:'Luc',JHN:'Jean',ACT:'Actes',ROM:'Romains','1CO':'1 Corinthiens','2CO':'2 Corinthiens',
  GAL:'Galates',EPH:'Éphésiens',PHP:'Philippiens',COL:'Colossiens','1TH':'1 Thessaloniciens','2TH':'2 Thessaloniciens','1TI':'1 Timothée',
  '2TI':'2 Timothée',TIT:'Tite',PHM:'Philémon',HEB:'Hébreux',JAS:'Jacques','1PE':'1 Pierre','2PE':'2 Pierre',
  '1JN':'1 Jean','2JN':'2 Jean','3JN':'3 Jean',JUD:'Jude',REV:'Apocalypse',
}
// Nom complet de CHAQUE livre (y compris deutérocanoniques absents du NOM_FR local),
// tiré du référentiel `LIVRES` ; le NOM_FR local, s'il existe, a priorité.
const NOM_LIVRE: Record<string, string> = {
  ...Object.fromEntries(LIVRES.map(l => [l.code, l.nom])),
  ...NOM_FR,
}
const CODE_PAR_LIBELLE = new Map<string, string>(
  Object.keys(ABREV_FR).flatMap((code): [string, string][] => [
    [sansAccents(code), code],
    [sansAccents(ABREV_FR[code]), code],
    [sansAccents(NOM_LIVRE[code] ?? ''), code],
  ]).filter(([k]) => !!k)
)
// ⛔ Le nombre de chapitres était recopié ici, à l'identique du volet de navigation, et
// il portait le même défaut : aucun deutérocanonique, donc UN chapitre offert pour le
// Siracide, qui en a 51. Il vient de l'ossature (`chapitresCanon`).

// Citation « pleine » — le texte cité (SANS guillemets français) va dans un bloc Citation,
// et la référence dans une note. `texte` porte le corps cité, `fin` la ponctuation finale
// (l'appel de note se place AVANT), `ref` la note. Seule forme autorisée : plus de renvoi
// abrégé (« référence courte »).
type Choix = { label: string; type: 'verset' | 'segment'; id: string; href?: string; complet?: boolean; texte?: string; fin?: string; ref?: string }
type Props = { onChoisir: (c: Choix) => void; onFermer: () => void }

// Liens internes « redirection vers le site » pour un renvoi cliquable.
function hrefVerset(livre: string, chapitre: number | string, verset: number | string, trad = 'TR0002'): string {
  const code = codeLivre(livre) ?? livre
  return `/?livre=${code}&chapitre=${chapitre}&trad=${trad}&verset=${verset}`
}
function hrefSegment(idOeuvre: string, idSegment: string | number): string {
  return `/oeuvre/${idOeuvre}?segment=${idSegment}`
}

function sansAccents(s: string): string {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').trim()
}

function correspondDebutsDeMots(texte: string, requete: string): boolean {
  const termes = sansAccents(requete).trim().split(/\s+/).filter(Boolean)
  if (termes.length === 0) return true
  const mots = sansAccents(texte).match(/[\p{L}\p{N}]+/gu) ?? []
  return termes.every(t => mots.some(m => m.startsWith(t)))
}

// Abréviation avec une espace après un chiffre de tête : « 1Ch » → « 1 Ch » (partout).
function abrevEspace(code: string): string {
  return (ABREV_FR[code] ?? code).replace(/^(\d)([A-Za-zÀ-ÿ])/, '$1 $2')
}

function labelVerset(livre: string, chapitre: number | string, verset: number | string): string {
  const code = codeLivre(livre) ?? livre
  return `${abrevEspace(code)} ${chapitre}, ${verset}`
}

// Livres du Nouveau Testament (pour la division AT / NT / PS du sélecteur biblique).
const CODES_NT = new Set(['MAT','MRK','LUK','JHN','ACT','ROM','1CO','2CO','GAL','EPH','PHP','COL','1TH','2TH','1TI','2TI','TIT','PHM','HEB','JAS','1PE','2PE','1JN','2JN','3JN','JUD','REV'])

// Clé de tri d'un titre (sans article de tête, sans accents) : centralisée dans
// app/lib/titres.ts et réutilisée ici et sur la page œuvre (« Du même auteur »).

// Surligne le terme recherché (tel que tapé, insensible à la casse) dans un texte.
function surligner(texte: string, q: string): ReactNode {
  if (!q) return texte
  const parts = texte.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((p, i) => (i % 2 === 1)
    ? <mark key={i} style={{ background: 'rgba(var(--cs-vert-rgb),0.20)', color: 'inherit', borderRadius: '4px', padding: '0 1px' }}>{p}</mark>
    : <span key={i}>{p}</span>)
}

function codeLivre(...valeurs: unknown[]): string | null {
  for (const valeur of valeurs) {
    const brut = String(valeur ?? '')
    const normalise = sansAccents(brut)
    const sansEspaces = normalise.replace(/\s+/g, '')
    const code = CODE_PAR_LIBELLE.get(normalise) ?? CODE_PAR_LIBELLE.get(sansEspaces)
    if (code) return code
  }
  return null
}

function convertirGuillemetsInternes(texte: string): string {
  return texte.replace(/«\s*/g, '“').replace(/\s*»/g, '”')
}

// Ponctuation finale d'une citation : \u00ab ? \u00bb et \u00ab ! \u00bb sont conserv\u00e9s ; toute autre
// ponctuation finale (ou son absence) devient un point. Le corps est rendu SANS cette
// ponctuation : l'appel de note s'ins\u00e8re ensuite, puis la ponctuation finale.
function terminaison(texte: string): { corps: string; fin: string } {
  const t = String(texte ?? '').trim()
  const dernier = t.slice(-1)
  if (dernier === '?' || dernier === '!') return { corps: t.slice(0, -1).trim(), fin: dernier }
  return { corps: t.replace(/[.\u2026,;:\u00b7]+$/u, '').trim(), fin: '.' }
}

// Corps cit\u00e9 : enrichissement retir\u00e9, guillemets internes convertis en guillemets courbes,
// JAMAIS de guillemets fran\u00e7ais autour, ponctuation finale isol\u00e9e dans `fin`.
function corpsCitation(texte: string): { corps: string; fin: string } {
  return terminaison(convertirGuillemetsInternes(texteSansEnrichissement(String(texte ?? '')).trim()))
}

type OeuvreMeta = { titre: string; trad_auteur?: string | null; editeur?: string | null; ville?: string | null; date_publication?: string | null }

// Note bibliographique pour un renvoi patristique : titre en italiques (*\u2026*), PAS de
// niveaux 1-5, ajout de l'\u00e9diteur, du traducteur, de la ville et de la date ; le locus (\u00a7)
// est conserv\u00e9 ; termin\u00e9e par un point.
function refNotePatristique(auteur: string, o: OeuvreMeta, segs: SegPatr[]): string {
  const nums = segs.map(s => s.segment_numero).sort((a, b) => a - b)
  const contigu = nums.length > 1 && nums.every((n, i) => i === 0 || n === nums[i - 1] + 1)
  const locus = nums.length === 1 ? `\u00a7${nums[0]}` : contigu ? `\u00a7${nums[0]}\u2013\u00a7${nums[nums.length - 1]}` : `\u00a7${nums.join(', ')}`
  const parts = [auteur, `*${o.titre}*`]
  const trad = mentionTraducteurs(o.trad_auteur)
  if (trad) parts.push(trad)
  if (o.editeur) parts.push(String(o.editeur))
  if (o.ville) parts.push(String(o.ville))
  if (o.date_publication) parts.push(formaterDateHistorique(o.date_publication))
  parts.push(locus)
  return parts.filter(Boolean).join(', ') + '.'
}

// Note pour un renvoi biblique : la r\u00e9f\u00e9rence (avec, si connue, la traduction citee),
// termin\u00e9e par un point.
function refNoteBiblique(ref: string, tradNom?: string | null): string {
  const base = ref.trim()
  return tradNom ? `${base}, ${tradNom.trim()}.` : `${base}.`
}

function BoutonCiter({ onCiter }: { onCiter: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onCiter() }} style={boutonCiterStyle}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--cs-vert-fonce)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--cs-vert)' }}>Citer</button>
  )
}

const petitChoixStyle: CSSProperties = {
  fontSize: '0.625rem', padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--cs-bord)',
  background: 'var(--cs-surface)', color: 'var(--cs-vert)', cursor: 'pointer', whiteSpace: 'nowrap',
}

// Bouton « Citer » soigné : petite pastille verte pleine, calée en bout de ligne et
// centrée verticalement.
const boutonCiterStyle: CSSProperties = {
  flexShrink: 0, alignSelf: 'center', fontSize: '0.625rem', fontWeight: 600, padding: '4px 12px',
  borderRadius: '999px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer',
  whiteSpace: 'nowrap', letterSpacing: '0.02em', transition: 'background 0.15s',
}

// Bouton de retour : une flèche fine dans une pastille arrondie, plus soignée que le « ← ».
function BoutonRetour({ onClick, children, inline = false }: { onClick: () => void; children: ReactNode; inline?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: inline ? 0 : '10px' }}>
      <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', borderRadius: '50%', border: '1px solid #cddbd1', background: 'var(--cs-fond-clair)' }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path d="M10 3.5L5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {children}
    </button>
  )
}

export default function SelecteurCitation({ onChoisir, onFermer }: Props) {
  const [source, setSource] = useState<'bible' | 'patristique'>('bible')
  const [mode, setMode] = useState<'parcourir' | 'mes-citations'>('parcourir')

  // Fermeture protégée : un clic à côté ne ferme PAS l'outil ; la croix demande d'abord
  // confirmation, pour ne pas perdre par mégarde une sélection en cours.
  const demanderFermeture = () => {
    if (window.confirm('Fermer l’outil de citation ? Votre sélection en cours sera perdue.')) onFermer()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,26,22,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', width: '100%', maxWidth: '45rem', height: '78vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', borderBottom: '1px solid var(--cs-bord-clair)' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['bible', 'patristique'] as const).map(s => (
              <button key={s} onClick={() => setSource(s)}
                style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: source === s ? 'var(--cs-vert-aplat)' : 'var(--cs-bord-clair)', color: source === s ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)', fontWeight: source === s ? 600 : 400 }}>
                {s === 'bible' ? 'Bible' : 'Patristique'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['parcourir', 'mes-citations'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                style={{ fontSize: '0.6875rem', padding: '5px 11px', borderRadius: '12px', border: `1px solid ${mode === m ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, cursor: 'pointer', background: mode === m ? 'rgba(var(--cs-vert-rgb),0.10)' : 'var(--cs-surface)', color: mode === m ? 'var(--cs-vert)' : 'var(--cs-texte-gris)' }}>
                {m === 'parcourir' ? 'Parcourir' : 'Mes citations'}
              </button>
            ))}
          </div>
          <button onClick={demanderFermeture} style={{ fontSize: '0.9375rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {mode === 'parcourir'
            ? (source === 'bible' ? <ParcourirBible onChoisir={onChoisir} /> : <ParcourirPatristique onChoisir={onChoisir} />)
            : <MesCitations source={source} onChoisir={onChoisir} />}
        </div>
      </div>
    </div>
  )
}

type TradBible = { trad_id: string; nom: string; langue: string | null }

function ParcourirBible({ onChoisir }: { onChoisir: (c: Choix) => void }) {
  const [livre, setLivre] = useState('')
  const [chapitre, setChapitre] = useState<number | null>(null)
  // Combien de chapitres offrir : l'ossature le dit (promesse partagée par tout le site).
  const [chapitresParLivre, setChapitresParLivre] = useState<ChapitresParLivre | null>(null)
  useEffect(() => {
    let vivant = true
    void chargerChapitresParLivre(supabase).then(t => { if (vivant) setChapitresParLivre(t) })
    return () => { vivant = false }
  }, [])
  const [versets, setVersets] = useState<{ id_verset: string; verset: number; texte: string }[]>([])
  const [chargement, setChargement] = useState(false)
  // Traduction citée : liste chargée depuis `traductions`, défaut « Segond » (TR0002).
  const [trads, setTrads] = useState<TradBible[]>([])
  const [trad, setTrad] = useState('TR0002')
  const tradNom = trads.find(t => t.trad_id === trad)?.nom ?? null

  useEffect(() => {
    // ⛔ `est_biblique` : voir le commentaire dans app/page.tsx.
    supabase.from('traductions').select('trad_id, nom, langue, ordre').eq('est_biblique', true).order('ordre').then(({ data }) => {
      const liste = ((data ?? []) as any[]).map(t => ({ trad_id: t.trad_id, nom: t.nom, langue: t.langue }))
      setTrads(liste)
      if (liste.length && !liste.some(t => t.trad_id === 'TR0002')) setTrad(liste[0].trad_id)
    })
  }, [])

  // Rechargement des versets quand le chapitre OU la traduction change : la vue
  // `versets_lecture` porte une colonne par traduction. Comme on recharge déjà à
  // chaque changement de traduction et qu'on ne lit qu'une colonne (`v[trad]`), on
  // ne sélectionne QUE celle-là (au lieu de `*`) — `trad` est toujours un code
  // contrôlé (TR000x), jamais une saisie libre.
  useEffect(() => {
    if (!livre || chapitre === null) return
    let annule = false
    setChargement(true)
    supabase.from('versets_lecture').select(`id_verset, verset, ${trad}`).eq('livre', livre).eq('chapitre', chapitre).order('verset').then(({ data }) => {
      if (annule) return
      setVersets((data ?? []).map((v: any) => ({ id_verset: v.id_verset, verset: v.verset, texte: v[trad] ?? '' })))
      setChargement(false)
    })
    return () => { annule = true }
  }, [livre, chapitre, trad])

  // Sélecteur de traduction, présent à toutes les étapes du parcours biblique.
  const selecteurTrad = trads.length > 1 && (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
      <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)' }}>Traduction</span>
      <select value={trad} onChange={e => setTrad(e.target.value)} aria-label="Traduction de la Bible"
        style={{ fontSize: '0.71875rem', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-encre)', cursor: 'pointer' }}>
        {trads.map(t => <option key={t.trad_id} value={t.trad_id}>{t.nom}{t.langue && t.langue !== 'Français' ? ` (${t.langue})` : ''}</option>)}
      </select>
    </div>
  )

  let contenu: ReactNode
  if (!livre) {
    const codes = Object.keys(ABREV_FR)
    const sections = [
      { titre: 'Ancien Testament', codes: codes.filter(c => !CODES_NT.has(c) && c !== 'PSA') },
      { titre: 'Nouveau Testament', codes: codes.filter(c => CODES_NT.has(c)) },
      { titre: 'Psaumes', codes: codes.filter(c => c === 'PSA') },
    ].filter(s => s.codes.length)
    contenu = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {sections.map(s => (
          <div key={s.titre}>
            <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: '0 0 9px' }}>{s.titre}</p>
            {/* Pastilles ajustées au contenu (flex-wrap) : plus souple et régulier
                qu'une grille de cases où les noms longs cassaient les rangées. */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {s.codes.map(l => (
                <button key={l} onClick={() => setLivre(l)}
                  style={{ fontSize: '0.71875rem', padding: '5px 12px', borderRadius: '999px', border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-fond-clair)', color: 'var(--cs-encre)', cursor: 'pointer', whiteSpace: 'nowrap', lineHeight: 1.35, transition: 'background 0.12s, border-color 0.12s, color 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--cs-fond)'; e.currentTarget.style.borderColor = 'var(--cs-vert-clair)'; e.currentTarget.style.color = 'var(--cs-encre-fonce)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--cs-fond-clair)'; e.currentTarget.style.borderColor = 'var(--cs-bord-clair)'; e.currentTarget.style.color = 'var(--cs-encre)' }}>
                  {NOM_LIVRE[l] ?? ABREV_FR[l]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  } else if (chapitre === null) {
    contenu = (
      <div>
        <BoutonRetour onClick={() => setLivre('')}>Livres</BoutonRetour>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '5px' }}>
          {Array.from({ length: nombreDeChapitres(livre, chapitresParLivre) }, (_, i) => i + 1).map(c => (
            <button key={c} onClick={() => setChapitre(c)} style={{ fontSize: '0.71875rem', padding: '6px 0', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-encre)', cursor: 'pointer' }}>{c}</button>
          ))}
        </div>
      </div>
    )
  } else {
    contenu = (
      <div>
        <BoutonRetour onClick={() => setChapitre(null)}>{NOM_LIVRE[livre] ?? ABREV_FR[livre]}, chapitres</BoutonRetour>
        {chargement ? <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {versets.map(v => {
              const ref = labelVerset(livre, chapitre, v.verset)
              if (!v.texte) return (
                <div key={v.id_verset} style={{ display: 'flex', gap: '10px', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--cs-fond-doux)', background: 'var(--cs-fond-clair)', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-or-doux)', flexShrink: 0 }}>{v.verset}</span>
                  <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', flex: 1 }}>Verset absent de cette traduction.</span>
                </div>
              )
              return (
              <div key={v.id_verset}
                style={{ display: 'flex', gap: '10px', textAlign: 'left', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--cs-fond-doux)', background: 'var(--cs-surface)', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)', flexShrink: 0 }}>{v.verset}</span>
                <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-fort)', lineHeight: 1.5, flex: 1 }}>{rendreTexteEnrichi(v.texte)}</span>
                <BoutonCiter
                  onCiter={() => {
                    const { corps, fin } = corpsCitation(v.texte)
                    onChoisir({ label: ref, type: 'verset', id: v.id_verset, href: hrefVerset(livre, chapitre, v.verset, trad), complet: true, texte: corps, fin, ref: refNoteBiblique(ref, tradNom) })
                  }}
                />
              </div>
            )})}
          </div>
        )}
      </div>
    )
  }

  return <div>{selecteurTrad}{contenu}</div>
}

// Segment d'une œuvre chargée dans le sélecteur.
type SegPatr = { id: number; segment_numero: number; segment_texte: string; ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null; ref_niv4: string | null; ref_niv5: string | null }

// PATRISTIQUE — flux simplifié : une page où l'on cherche l'ŒUVRE par son nom (ou son
// auteur), puis, dans l'œuvre, on cherche le passage et l'on sélectionne un OU PLUSIEURS
// segments à citer d'un coup. Plus d'étape « choisir un auteur » d'abord.
function ParcourirPatristique({ onChoisir }: { onChoisir: (c: Choix) => void }) {
  type OeuvreItem = { id_oeuvre: string; titre: string; auteurNom: string; id_auteur?: string | null; titre_original?: string | null } & OeuvreMeta
  const [oeuvres, setOeuvres] = useState<OeuvreItem[] | null>(null)
  const [oeuvre, setOeuvre] = useState<OeuvreItem | null>(null)
  const [segments, setSegments] = useState<SegPatr[]>([])
  const [chargement, setChargement] = useState(false)
  const [rechercheOeuvre, setRechercheOeuvre] = useState('')
  const [rechercheSeg, setRechercheSeg] = useState('')
  const [selection, setSelection] = useState<Set<number>>(new Set())

  // Toutes les œuvres publiées, avec le nom de l'auteur ET les métadonnées d'édition
  // (traducteur, éditeur, ville, date) qui nourrissent la note bibliographique.
  useEffect(() => {
    supabase.from('oeuvres').select('id_oeuvre, titre, titre_original, id_auteur, acces_public, trad_auteur, editeur, ville, date_publication, auteurs!oeuvres_id_auteur_fkey(nom)').order('titre').then(({ data }) => {
      const liste = ((data ?? []) as any[]).filter(estOeuvrePubliee)
        .map(o => ({ id_oeuvre: o.id_oeuvre, titre: o.titre, titre_original: o.titre_original, id_auteur: o.id_auteur, auteurNom: o.auteurs?.nom ?? '', trad_auteur: o.trad_auteur, editeur: o.editeur, ville: o.ville, date_publication: o.date_publication }))
      setOeuvres(liste)
    })
  }, [])

  const choisirOeuvre = async (o: OeuvreItem) => {
    setOeuvre(o); setRechercheSeg(''); setSelection(new Set()); setChargement(true)
    const { data } = await supabase.from('segments').select('id, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5').eq('id_oeuvre', o.id_oeuvre).eq('nature', 'texte').order('segment_numero')
    setSegments((data ?? []) as SegPatr[])
    setChargement(false)
  }

  // ── Étape 1 : chercher une œuvre ──────────────────────────────────────────
  if (!oeuvre) {
    const q = sansAccents(rechercheOeuvre.trim())
    const resultats = (oeuvres ?? [])
      .filter(o => !q || correspondDebutsDeMots(`${o.titre} ${o.auteurNom}`, rechercheOeuvre))
      // Tri alphabétique par titre, article/déterminant de tête ignoré.
      .sort((a, b) => cleTriTitre(a.titre).localeCompare(cleTriTitre(b.titre), 'fr') || a.titre.localeCompare(b.titre, 'fr'))
    return (
      <div>
        <input value={rechercheOeuvre} onChange={e => setRechercheOeuvre(e.target.value)} autoFocus
          placeholder="Chercher une œuvre (titre ou auteur)…"
          style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.8125rem', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', marginBottom: '12px', outline: 'none' }} />
        {oeuvres === null ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement du catalogue…</p>
        ) : resultats.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>{q ? 'Aucune œuvre ne correspond.' : 'Aucune œuvre disponible.'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {resultats.slice(0, 60).map(o => (
              <button key={o.id_oeuvre} onClick={() => choisirOeuvre(o)}
                style={{ textAlign: 'left', fontSize: '0.8125rem', padding: '8px 11px', borderRadius: '4px', border: '1px solid var(--cs-fond-doux)', background: 'var(--cs-surface)', color: 'var(--cs-encre)', cursor: 'pointer' }}>
                {o.titre}
                {o.auteurNom && <span style={{ color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}> — {o.auteurNom}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Étape 2 : chercher un passage dans l'œuvre, sélectionner des segments ──
  const q = sansAccents(rechercheSeg.trim())
  const segmentsFiltres = q
    ? segments.filter(s => correspondDebutsDeMots(s.segment_texte, rechercheSeg) || String(s.segment_numero).startsWith(q))
    : segments
  const segsSelectionnes = segments.filter(s => selection.has(s.id)).sort((a, b) => a.segment_numero - b.segment_numero)
  const toggle = (id: number) => setSelection(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  // Traductions ALTERNATIVES d'un même texte : autres œuvres du même auteur portant le
  // même titre original. Permet de citer le passage dans une autre traduction établie.
  const memeTexte = (o: OeuvreItem) =>
    !!o.id_auteur && !!oeuvre.id_auteur && o.id_auteur === oeuvre.id_auteur &&
    !!o.titre_original && !!oeuvre.titre_original &&
    sansAccents(o.titre_original) === sansAccents(oeuvre.titre_original)
  const traductionsOeuvre = (oeuvres ?? [])
    .filter(o => o.id_oeuvre === oeuvre.id_oeuvre || memeTexte(o))
    .sort((a, b) => (a.trad_auteur ?? '').localeCompare(b.trad_auteur ?? '', 'fr'))
  const libelleTradOeuvre = (o: OeuvreItem) =>
    mentionTraducteurs(o.trad_auteur) || o.editeur || (o.date_publication ? formaterDateHistorique(o.date_publication) : '') || 'édition'

  const insererSelection = () => {
    if (segsSelectionnes.length === 0) return
    const ref = refNotePatristique(oeuvre.auteurNom, oeuvre, segsSelectionnes)
    const premier = segsSelectionnes[0]
    const href = hrefSegment(oeuvre.id_oeuvre, premier.id)
    // Segments sautés : on marque la coupure par « […] » dans le corps cité.
    const morceaux: string[] = []
    segsSelectionnes.forEach((s, i) => {
      if (i > 0 && s.segment_numero > segsSelectionnes[i - 1].segment_numero + 1) morceaux.push('[…]')
      morceaux.push(s.segment_texte)
    })
    const { corps, fin } = corpsCitation(morceaux.join(' '))
    onChoisir({ label: ref, type: 'segment', id: String(premier.id), href, complet: true, texte: corps, fin, ref })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
        <BoutonRetour inline onClick={() => { setOeuvre(null); setSelection(new Set()) }}>Œuvres</BoutonRetour>
        <span style={{ fontSize: '0.75rem', color: 'var(--cs-encre)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{oeuvre.titre}</span>
        {oeuvre.auteurNom && <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>{oeuvre.auteurNom}</span>}
      </div>
      {/* Choix de la traduction, si ce texte existe en plusieurs traductions établies. */}
      {traductionsOeuvre.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', flexShrink: 0 }}>Traduction</span>
          <select value={oeuvre.id_oeuvre} aria-label="Traduction du texte"
            onChange={e => { const o = traductionsOeuvre.find(x => x.id_oeuvre === e.target.value); if (o) choisirOeuvre(o) }}
            style={{ fontSize: '0.71875rem', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-encre)', cursor: 'pointer', maxWidth: '16rem' }}>
            {traductionsOeuvre.map(o => <option key={o.id_oeuvre} value={o.id_oeuvre}>{libelleTradOeuvre(o)}</option>)}
          </select>
        </div>
      )}
      <input value={rechercheSeg} onChange={e => setRechercheSeg(e.target.value)}
        placeholder="Chercher un passage dans cette œuvre…"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.75rem', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', marginBottom: '10px', outline: 'none', flexShrink: 0 }} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {chargement ? <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {segmentsFiltres.map(s => {
              const sel = selection.has(s.id)
              const t = texteSansEnrichissement(s.segment_texte)
              return (
                <button key={s.id} type="button" onClick={() => toggle(s.id)}
                  style={{ display: 'flex', gap: '9px', textAlign: 'left', padding: '8px 10px', borderRadius: '4px', border: `1px solid ${sel ? 'var(--cs-vert)' : 'var(--cs-fond-doux)'}`, background: sel ? 'rgba(var(--cs-vert-rgb),0.07)' : 'var(--cs-surface)', cursor: 'pointer', alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, width: '14px', height: '14px', marginTop: '1px', borderRadius: '4px', border: `1px solid ${sel ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: sel ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: 'var(--cs-sur-aplat)', fontSize: '0.625rem', lineHeight: '13px', textAlign: 'center' }}>{sel ? '✓' : ''}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)', flexShrink: 0 }}>§{s.segment_numero}</span>
                  <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-fort)', lineHeight: 1.5, flex: 1 }}>{t.slice(0, 200) + (t.length > 200 ? '…' : '')}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {/* Barre d'insertion : agit sur le OU LES segments sélectionnés. */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '10px', marginTop: '4px', borderTop: '1px solid var(--cs-fond-doux)' }}>
        <span style={{ fontSize: '0.71875rem', color: segsSelectionnes.length ? 'var(--cs-vert)' : 'var(--cs-texte-doux)' }}>
          {segsSelectionnes.length === 0 ? 'Sélectionnez un ou plusieurs segments' : `${segsSelectionnes.length} segment${segsSelectionnes.length > 1 ? 's' : ''} sélectionné${segsSelectionnes.length > 1 ? 's' : ''}`}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button type="button" disabled={!segsSelectionnes.length} onClick={() => insererSelection()}
            style={{ ...petitChoixStyle, background: segsSelectionnes.length ? 'var(--cs-vert-aplat)' : 'var(--cs-bord-clair)', color: segsSelectionnes.length ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-doux)', border: 'none', opacity: 1, cursor: segsSelectionnes.length ? 'pointer' : 'default' }}>Citer</button>
        </span>
      </div>
    </div>
  )
}

function MesCitations({ source, onChoisir }: { source: 'bible' | 'patristique'; onChoisir: (c: Choix) => void }) {
  const [items, setItems] = useState<any[] | null>(null)
  const [recherche, setRecherche] = useState('')
  const [oeuvreSel, setOeuvreSel] = useState('')   // patristique : titre d'œuvre ciblé, '' = toutes

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) { setItems([]); return }
      const { data: prelevements } = await supabase.from('prelevements').select('*').eq('user_id', uid)
        .eq('type', source === 'bible' ? 'biblique' : 'patristique')
        .order('created_at', { ascending: false })
      setItems(prelevements ?? [])
    })
    setRecherche(''); setOeuvreSel('')
  }, [source])

  if (items === null) return <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
  if (items.length === 0) return <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucune citation enregistrée dans « Mes citations » pour l’instant.</p>

  const choisir = async (it: any) => {
    if (source === 'bible') {
      const livreCode = codeLivre(it.ref_livre, it.ref_livre_abr, it.livre)
      if (!livreCode) return
      const { data } = await supabase.from('versets_lecture').select('id_verset').eq('livre', livreCode).eq('chapitre', it.ref_chapitre).eq('verset', it.ref_verset).maybeSingle()
      const ref = labelVerset(livreCode, it.ref_chapitre, it.ref_verset)
      const { corps, fin } = corpsCitation(it.texte ?? '')
      if (data) onChoisir({ label: ref, type: 'verset', id: data.id_verset, href: hrefVerset(livreCode, it.ref_chapitre, it.ref_verset), complet: true, texte: corps, fin, ref: refNoteBiblique(ref) })
    } else {
      const [{ data: seg }, { data: meta }] = await Promise.all([
        supabase.from('segments').select('id, segment_numero').eq('id_oeuvre', it.id_oeuvre).eq('segment_numero', it.segment_numero).single(),
        supabase.from('oeuvres').select('titre, trad_auteur, editeur, ville, date_publication').eq('id_oeuvre', it.id_oeuvre).maybeSingle(),
      ])
      if (seg) {
        const auteur = it.auteur ?? it.auteur_nom ?? ''
        const oeuvreMeta: OeuvreMeta = { titre: meta?.titre ?? it.titre_oeuvre ?? '', trad_auteur: meta?.trad_auteur, editeur: meta?.editeur, ville: meta?.ville, date_publication: meta?.date_publication }
        const ref = refNotePatristique(auteur, oeuvreMeta, [seg as unknown as SegPatr])
        const { corps, fin } = corpsCitation(it.texte ?? '')
        onChoisir({ label: ref, type: 'segment', id: String(seg.id), href: hrefSegment(it.id_oeuvre, seg.id), complet: true, texte: corps, fin, ref })
      }
    }
  }

  // Une ligne de citation : libellé + aperçu + bouton « Citer » en bout de ligne.
  const Ligne = (it: any, label: string) => (
    <div key={it.id}
      style={{ display: 'flex', gap: '10px', textAlign: 'left', padding: '8px 10px', borderRadius: '4px', border: '1px solid var(--cs-fond-doux)', background: 'var(--cs-surface)', alignItems: 'center' }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)' }}>{surligner(label, recherche.trim())}</span>
        <span style={{ display: 'block', fontSize: '0.78125rem', color: 'var(--cs-texte-fort)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{surligner(String(it.texte ?? '').slice(0, 160), recherche.trim())}</span>
      </span>
      <BoutonCiter onCiter={() => choisir(it)} />
    </div>
  )

  // Recherche : un mot dans l'ensemble des citations, ou dans une œuvre ciblée (patristique).
  const q = sansAccents(recherche.trim())
  const oeuvresListe = source === 'patristique'
    ? [...new Set(items.map(it => String(it.titre_oeuvre ?? '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'))
    : []
  const itemsFiltres = items.filter(it => {
    if (source === 'patristique' && oeuvreSel && String(it.titre_oeuvre ?? '') !== oeuvreSel) return false
    if (q) {
      const foin = sansAccents([it.texte, it.titre_oeuvre, it.auteur, it.auteur_nom, it.ref_livre, it.ref_livre_abr, it.ref_chapitre, it.ref_verset].filter(Boolean).join(' '))
      if (!foin.includes(q)) return false
    }
    return true
  })

  const barre = (
    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', position: 'sticky', top: 0, background: 'var(--cs-surface)', zIndex: 1, paddingBottom: '2px' }}>
      <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher un mot…"
        style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', fontSize: '0.75rem', padding: '7px 10px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', outline: 'none' }} />
      {source === 'patristique' && oeuvresListe.length > 1 && (
        <select value={oeuvreSel} onChange={e => setOeuvreSel(e.target.value)} aria-label="Limiter à une œuvre"
          style={{ flexShrink: 0, maxWidth: '11rem', fontSize: '0.71875rem', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)' }}>
          <option value="">Toutes les œuvres</option>
          {oeuvresListe.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  )

  if (!itemsFiltres.length) {
    return <div>{barre}<p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucune citation ne correspond.</p></div>
  }

  // Patristique : regroupé par auteur (le § de paragraphe n'est plus affiché).
  if (source === 'patristique') {
    const groupes = new Map<string, any[]>()
    for (const it of itemsFiltres) {
      const auteur = String(it.auteur ?? it.auteur_nom ?? '').trim() || 'Sans auteur'
      if (!groupes.has(auteur)) groupes.set(auteur, [])
      groupes.get(auteur)!.push(it)
    }
    const auteurs = [...groupes.keys()].sort((a, b) => a.localeCompare(b, 'fr'))
    return (
      <div>
        {barre}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {auteurs.map(auteur => (
            <div key={auteur}>
              <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: '0 0 8px' }}>{auteur}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {groupes.get(auteur)!.map(it => Ligne(it, String(it.titre_oeuvre ?? '')))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Bible : liste simple, la référence en « 1 Ch 5, 3 » via labelVerset.
  return (
    <div>
      {barre}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {itemsFiltres.map(it => Ligne(it, labelVerset(codeLivre(it.ref_livre, it.ref_livre_abr, it.livre) ?? it.ref_livre, it.ref_chapitre, it.ref_verset)))}
      </div>
    </div>
  )
}
