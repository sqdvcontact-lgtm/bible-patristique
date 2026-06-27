'use client'

import { useState } from 'react'
import { supabase } from "@/app/lib/supabase"
import type { SegData } from './oeuvreTypes'
import { texteSansEnrichissement } from './texteEnrichi'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'

// Style partagé par tous les petits boutons d'action (segment ET verset)
export const BTN_STYLE: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'1px 2px',
  borderRadius:'3px', width:'16px', height:'16px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'12px',
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
        .select('id').eq('user_id', userId).eq('id_oeuvre', idOeuvre).eq('segment_numero', seg.numero).limit(1).single()
      if (data) await supabase.from('prelevements').delete().eq('id', data.id)
    }
    setLoading(false)
    setSupprime(true)
    onSauvegarde()
  }

  if ((dejaSauvegarde && !supprime) || idPrelev) {
    return (
      <button onClick={supprimer} disabled={loading} title="Retirer des prélèvements"
        className="seg-btn-enreg"
        style={{ ...BTN_STYLE, color:'#3d6b4f' }}
        aria-label="Retirer">{loading ? '…' : '✕'}</button>
    )
  }

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoading(true)
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'patristique',
      auteur, titre_oeuvre: titreOeuvre, id_oeuvre: idOeuvre,
      segment_numero: seg.numero, texte: texteSansEnrichissement(seg.texte),
    }).select('id').single()
    setLoading(false)
    if (!error && data) { setIdPrelev(data.id); onSauvegarde() }
  }

  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      className="seg-btn-enreg"
      style={{ ...BTN_STYLE, color:'#c8c0b4' }}
      aria-label="Enregistrer">
      {loading ? '…' : (
        <svg width="12" height="13" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ display:'block' }}>
          <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

// Si le texte cité contient déjà des guillemets français (citation de second
// niveau — le Père cite lui-même l'Écriture, par exemple), on les convertit
// en guillemets anglais pour ne pas doubler les guillemets français lors de
// l'export via « Copier ».
function convertirGuillemetsInternes(texte: string): string {
  return texte
    .replace(/«[\u202F\u00A0\s]*/g, '“')
    .replace(/[\u202F\u00A0\s]*»/g, '”')
}

export function construireCitationPatristique(
  texte: string, auteur: string, titre: string,
  sousTitre?: string, tradAuteur?: string, editeur?: string,
  collection?: string, ville?: string, datePublication?: string
): string {
  const parts: string[] = []
  if (auteur) parts.push(auteur)
  let titreComplet = titre || ''
  if (sousTitre) titreComplet += '. ' + sousTitre + '.'
  else if (titre) titreComplet += '.'
  if (titreComplet) parts.push(titreComplet)
  if (editeur) parts.push(editeur)
  if (tradAuteur) parts.push('trad. ' + tradAuteur)
  if (collection) parts.push(collection)
  if (ville) parts.push(ville)
  if (datePublication) parts.push(datePublication)
  parts.push('« disponible sur Corpus Scriptura »')
  parts.push('« ' + convertirGuillemetsInternes(texte) + ' »')
  return parts.join(', ') + '.'
}

export function BoutonCopieSegment({ texte, auteur, titre, sousTitre, tradAuteur, editeur, collection, ville, datePublication, className = '' }: {
  texte: string; auteur?: string; titre?: string; sousTitre?: string
  tradAuteur?: string; editeur?: string; collection?: string
  ville?: string; datePublication?: string; className?: string
}) {
  const [copie, setCopie] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const citation = construireCitationPatristique(texte, auteur || '', titre || '', sousTitre, tradAuteur, editeur, collection, ville, datePublication)
    navigator.clipboard.writeText(citation).then(() => { setCopie(true); setTimeout(() => setCopie(false), 1400) })
  }
  return (
    <button onClick={handle} title="Copier ce passage" className={className}
      style={{ ...BTN_STYLE, color: copie ? '#3d6b4f' : '#c8c0b4' }}>
      {copie ? '✓' : '⧉'}
    </button>
  )
}

export function BoutonSignalerSegment({ segId, apercu, className = '' }: { segId: number; apercu: string; className?: string }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <button onClick={e => { e.stopPropagation(); setOuvert(true) }}
        title="Signaler une erreur" className={className}
        style={{ ...BTN_STYLE, color:'#c8c0b4' }}>
        ⚑
      </button>
      {ouvert && (
        <ModalSignalement
          titre={apercu}
          onClose={() => setOuvert(false)}
          onEnvoyer={async (msg) => {
            await insererSignalement({ id_segment: segId, message: msg })
          }}
        />
      )}
    </>
  )
}
