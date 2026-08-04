'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

const NOM_LIVRE: Record<string, string> = {
  GEN: 'Genèse', EXO: 'Exode', LEV: 'Lévitique', NUM: 'Nombres', DEU: 'Deutéronome', JOS: 'Josué', JDG: 'Juges', RUT: 'Ruth',
  '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Rois', '2KI': '2 Rois', '1CH': '1 Chroniques', '2CH': '2 Chroniques',
  EZR: 'Esdras', NEH: 'Néhémie', EST: 'Esther', JOB: 'Job', PSA: 'Psaumes', PRO: 'Proverbes', ECC: 'Ecclésiaste', SNG: 'Cantique des cantiques',
  ISA: 'Isaïe', JER: 'Jérémie', LAM: 'Lamentations', EZK: 'Ézéchiel', DAN: 'Daniel', HOS: 'Osée', JOL: 'Joël', AMO: 'Amos',
  OBA: 'Abdias', JON: 'Jonas', MIC: 'Michée', NAM: 'Nahum', HAB: 'Habacuc', ZEP: 'Sophonie', HAG: 'Aggée', ZEC: 'Zacharie', MAL: 'Malachie',
  MAT: 'Matthieu', MRK: 'Marc', LUK: 'Luc', JHN: 'Jean', ACT: 'Actes', ROM: 'Romains', '1CO': '1 Corinthiens', '2CO': '2 Corinthiens',
  GAL: 'Galates', EPH: 'Éphésiens', PHP: 'Philippiens', COL: 'Colossiens', '1TH': '1 Thessaloniciens', '2TH': '2 Thessaloniciens',
  '1TI': '1 Timothée', '2TI': '2 Timothée', TIT: 'Tite', PHM: 'Philémon', HEB: 'Hébreux', JAS: 'Jacques', '1PE': '1 Pierre', '2PE': '2 Pierre',
  '1JN': '1 Jean', '2JN': '2 Jean', '3JN': '3 Jean', JUD: 'Jude', REV: 'Apocalypse',
}

type VersetPopulaire = { id_verset: string; livre: string; chapitre: number; verset: number; TR0002: string; nb_lectures: number }
type VersetCite = {
  canon_id: string; livre: string; chapitre: number; verset: number;
  score: number; nb_citations: number; nb_commentaires: number; nb_allusions: number; nb_oeuvres: number;
  TR0002: string | null;
}

const statLigne: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', gap: '12px', padding: '10px 14px',
  background: '#fff', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', textDecoration: 'none',
}
const statRang: React.CSSProperties = { fontSize: '0.6875rem', color: 'var(--cs-texte-second)', fontWeight: 600, width: '20px', flexShrink: 0 }
const statRef: React.CSSProperties = { fontSize: '0.71875rem', fontWeight: 600, color: 'var(--cs-encre)', margin: '0 0 2px' }
const statTexte: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--cs-texte)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }

// En-tête d'une rubrique statistique : titre en serif + courte glose.
function EnteteStat({ titre, intro, style }: { titre: string; intro: string; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: '12px', ...style }}>
      <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: '0 0 4px' }}>{titre}</h2>
      <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', lineHeight: 1.55, margin: 0 }}>{intro}</p>
    </div>
  )
}

export default function StatistiquesClient() {
  const [cites, setCites] = useState<VersetCite[] | null>(null)
  const [lus, setLus] = useState<VersetPopulaire[] | null>(null)

  // Versets les plus cités et commentés par les Pères : le score est calculé en base
  // (vue versets_plus_cites) à partir des liens patristiques.
  useEffect(() => {
    supabase.from('versets_plus_cites')
      .select('canon_id, livre, chapitre, verset, score, nb_citations, nb_commentaires, nb_allusions, nb_oeuvres, TR0002')
      .order('score', { ascending: false })
      .order('nb_commentaires', { ascending: false })
      .limit(30)
      .then(({ data }) => setCites((data as VersetCite[]) ?? []))
  }, [])

  // Versets les plus lus : ne s'affiche que si la donnée existe (le classement de lecture
  // n'est pas toujours alimenté).
  useEffect(() => {
    const charger = () => {
      supabase.from('versets_plus_lus')
        .select('id_verset, livre, chapitre, verset, TR0002, nb_lectures')
        .order('nb_lectures', { ascending: false })
        .limit(30)
        .then(({ data }) => setLus((data as VersetPopulaire[]) ?? []))
    }
    charger()
    const onVisible = () => { if (!document.hidden) charger() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const detailCite = (v: VersetCite) => {
    const parts: string[] = []
    if (v.nb_commentaires > 0) parts.push(`${v.nb_commentaires} commentaire${v.nb_commentaires > 1 ? 's' : ''}`)
    if (v.nb_citations > 0) parts.push(`${v.nb_citations} citation${v.nb_citations > 1 ? 's' : ''}`)
    if (v.nb_allusions > 0) parts.push(`${v.nb_allusions} allusion${v.nb_allusions > 1 ? 's' : ''}`)
    return parts.join(' · ')
  }

  return (
    <main style={{ background: 'var(--cs-fond)', minHeight: 'calc(100vh - 3.5rem)', paddingTop: '3.5rem' }}>
      <div style={{ maxWidth: '45rem', margin: '0 auto', padding: '22px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: 'clamp(1.3125rem, 3.6vw, 1.8125rem)', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', lineHeight: 1.15, marginBottom: '8px' }}>
            Statistiques
          </h1>
          <div style={{ width: '36px', height: '1px', background: 'var(--cs-bord)', margin: '0 auto 12px' }} />
        </div>
      </div>

      <div style={{ maxWidth: '40rem', margin: '0 auto', padding: '4px 24px 80px' }}>
        <EnteteStat
          titre="Les plus cités et commentés par les Pères"
          intro="Classement établi à partir des liens patristiques, comptés par œuvre (un même texte ne pèse qu'une fois, même s'il revient longuement sur un verset) : un commentaire pèse davantage qu'une citation, une citation davantage qu'une simple allusion. Le score grandira à mesure que les liens sont constitués." />
        {cites === null ? (
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
        ) : cites.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Aucun lien pour l&apos;instant.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {cites.map((v, i) => (
              <Link key={v.canon_id} href={`/?livre=${v.livre}&chapitre=${v.chapitre}&trad=TR0002&verset=${v.verset}`} style={statLigne}>
                <span style={statRang}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={statRef}>{NOM_LIVRE[v.livre] ?? v.livre} {v.chapitre}, {v.verset}</p>
                  {v.TR0002 && <p style={statTexte}>{v.TR0002}</p>}
                  <p style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)', margin: '3px 0 0' }}>{detailCite(v)}</p>
                </div>
                <span title="Score patristique"
                  style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.09)', border: '1px solid rgba(var(--cs-vert-rgb),0.22)', borderRadius: '6px', padding: '2px 9px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {v.score}
                </span>
              </Link>
            ))}
          </div>
        )}

        {lus && lus.length > 0 && (
          <>
            <EnteteStat titre="Les plus lus" intro="D'après les consultations des versets sur le site." style={{ marginTop: '30px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lus.map((v, i) => (
                <Link key={v.id_verset} href={`/?livre=${v.livre}&chapitre=${v.chapitre}&trad=TR0002&verset=${v.verset}`} style={statLigne}>
                  <span style={statRang}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={statRef}>{NOM_LIVRE[v.livre] ?? v.livre} {v.chapitre}, {v.verset}</p>
                    <p style={statTexte}>{v.TR0002}</p>
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', flexShrink: 0 }}>{v.nb_lectures} lecture{v.nb_lectures > 1 ? 's' : ''}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
