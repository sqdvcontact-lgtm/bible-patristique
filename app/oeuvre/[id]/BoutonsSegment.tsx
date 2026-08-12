'use client'

import { useState } from 'react'
import { supabase } from "@/app/lib/supabase"
import { useCompte } from '@/app/lib/contexteCompte'
import type { SegData } from './oeuvreTypes'
import { texteSansEnrichissement } from './texteEnrichi'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'
import { Bulle } from '@/app/components/Bulle'
import IconeSignet from '@/app/components/IconeSignet'
import IconeDrapeau from '@/app/components/IconeDrapeau'
import { citationPatristique, copierCitation } from '@/app/lib/citation'

// Style partagé par tous les petits boutons d'action (segment ET verset)
export const BTN_STYLE: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'1px 2px',
  borderRadius:'3px', width:'16px', height:'16px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'0.75rem',
  lineHeight:1, flexShrink:0, transition:'color 0.15s',
}

// ── Bouton enregistrer segment ────────────────────────────────────────────────
export function BoutonEnregistrerSegment({
  seg, auteur, titreOeuvre, idOeuvre, userId,
  dejaSauvegarde, onSauvegarde,
}: {
  seg: SegData; auteur: string; titreOeuvre: string; idOeuvre: string
  userId: string
  dejaSauvegarde: boolean; onSauvegarde: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [idPrelev, setIdPrelev] = useState<string | null>(null)
  const { exigerCompte } = useCompte()

  // Supprimer — fonctionne que l'id vienne du local ou du parent
  const [supprime, setSupprime] = useState(false)

  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    if (idPrelev) {
      await supabase.from('prelevements').delete().eq('id', idPrelev)
      setIdPrelev(null)
    } else {
      // Chercher l'id en base
      const { data } = await supabase.from('prelevements')
        .select('id').eq('user_id', userId).eq('segment_id', seg.id).limit(1).single()
      if (data) await supabase.from('prelevements').delete().eq('id', data.id)
    }
    setLoading(false)
    setSupprime(true)
    onSauvegarde()
  }

  if ((dejaSauvegarde && !supprime) || idPrelev) {
    return (
      <Bulle texte="Retirer des prélèvements">
        <button onClick={supprimer} disabled={loading}
          className="seg-btn-enreg"
          // Visible sans survol : le signet plein constate un état, et un état
          // qu'il faut survoler pour connaître ne se voit jamais. La classe est
          // conservée pour le reste de son style ; seule l'opacité est forcée.
          style={{ ...BTN_STYLE, color:'var(--cs-vert)', opacity:1 }}
          aria-label="Retirer des prélèvements">{loading ? '…' : <IconeSignet plein />}</button>
      </Bulle>
    )
  }

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!exigerCompte('prélever ce passage')) return
    setLoading(true)
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'patristique',
      auteur, titre_oeuvre: titreOeuvre, id_oeuvre: idOeuvre,
      segment_id: seg.id, id_texte: seg.idTexte,
      segment_numero: seg.numeroSource, texte: texteSansEnrichissement(seg.texte),
    }).select('id').single()
    setLoading(false)
    if (!error && data) { setIdPrelev(data.id); onSauvegarde() }
  }

  return (
    <Bulle texte="Enregistrer dans mes prélèvements">
      <button onClick={enregistrer} disabled={loading}
        className="seg-btn-enreg"
        style={{ ...BTN_STYLE, color:'var(--cs-bord)' }}
        aria-label="Enregistrer">
        {loading ? '…' : <IconeSignet />}
      </button>
    </Bulle>
  )
}


export function BoutonCopieSegment({ texte, auteur, titre, sousTitre, tradAuteur, editeur, collection, ville, datePublication, className = '' }: {
  texte: string; auteur?: string; titre?: string; sousTitre?: string
  tradAuteur?: string; editeur?: string; collection?: string
  ville?: string; datePublication?: string; className?: string
}) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Titre en italique (collage riche), dates resserrées, guillemets internes anglais,
    // ponctuation finale normalisée : toutes les règles vivent dans app/lib/citation.ts.
    const citation = citationPatristique(texte, { auteur, titre, sousTitre, tradAuteur, editeur, collection, ville, datePublication })
    copierCitation(citation).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1400) })
  }
  return (
    <Bulle texte="Copier ce passage">
      <button onClick={handle} className={className}
        style={{ ...BTN_STYLE, color: copie ? 'var(--cs-vert)' : 'var(--cs-bord)' }}
        aria-label="Copier ce passage">
        {copie ? '✓' : (
          <svg width="11" height="12" viewBox="0 0 11 12" fill="none" aria-hidden="true" style={{ display:'block' }}>
            <path d="M1 9.2V1.8A.8.8 0 0 1 1.8 1H7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <rect x="3" y="3" width="7" height="8.5" rx=".8" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        )}
      </button>
    </Bulle>
  )
}

export function BoutonSignalerSegment({ segId, texteObjet, titreOeuvre, className = '' }: { segId: number; texteObjet: string; titreOeuvre?: string; className?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const { exigerCompte } = useCompte()
  return (
    <>
      <Bulle texte="Signaler une erreur">
        <button onClick={e => { e.stopPropagation(); if (exigerCompte('signaler une erreur')) setOuvert(true) }}
          className={className}
          style={{ ...BTN_STYLE, color:'var(--cs-bord)' }}
          aria-label="Signaler une erreur">
          <IconeDrapeau />
        </button>
      </Bulle>
      {ouvert && (
        <ModalSignalement
          titre={titreOeuvre}
          texteObjet={texteObjet}
          avecNiveauImportance
          onClose={() => setOuvert(false)}
          onEnvoyer={async (msg, importance) => {
            await insererSignalement({ id_segment: segId, message: msg, importance, url_source: window.location.href })
          }}
        />
      )}
    </>
  )
}
