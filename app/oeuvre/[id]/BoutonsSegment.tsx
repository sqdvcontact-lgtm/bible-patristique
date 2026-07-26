'use client'

import { useState } from 'react'
import { supabase } from "@/app/lib/supabase"
import type { SegData } from './oeuvreTypes'
import { texteSansEnrichissement } from './texteEnrichi'
import ModalSignalement from './ModalSignalement'
import { insererSignalement } from './signalements'
import { Bulle } from '@/app/components/Bulle'
import IconeSignet from '@/app/components/IconeSignet'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'

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
      <Bulle texte="Retirer des prélèvements">
        <button onClick={supprimer} disabled={loading}
          className="seg-btn-enreg"
          // Visible sans survol : le signet plein constate un état, et un état
          // qu'il faut survoler pour connaître ne se voit jamais. La classe est
          // conservée pour le reste de son style ; seule l'opacité est forcée.
          style={{ ...BTN_STYLE, color:'#3d6b4f', opacity:1 }}
          aria-label="Retirer des prélèvements">{loading ? '…' : <IconeSignet plein />}</button>
      </Bulle>
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
    <Bulle texte="Enregistrer dans mes prélèvements">
      <button onClick={enregistrer} disabled={loading}
        className="seg-btn-enreg"
        style={{ ...BTN_STYLE, color:'#c8c0b4' }}
        aria-label="Enregistrer">
        {loading ? '…' : <IconeSignet />}
      </button>
    </Bulle>
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
  if (sousTitre) titreComplet += '. ' + sousTitre
  if (titreComplet) parts.push(titreComplet)
  if (editeur) parts.push(editeur)
  if (tradAuteur) parts.push('trad. ' + tradAuteur)
  if (collection) parts.push(collection)
  if (ville) parts.push(ville)
  if (datePublication) parts.push(formaterDateHistorique(datePublication))
  parts.push('disponible sur Corpus Scriptura')
  const textePonctue = texte.replace(/[,;]/g, '.')
  const citation = '« ' + convertirGuillemetsInternes(textePonctue) + ' »'
  return parts.join(', ') + ' : ' + citation
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
    <Bulle texte="Copier ce passage">
      <button onClick={handle} className={className}
        style={{ ...BTN_STYLE, color: copie ? '#3d6b4f' : '#c8c0b4' }}
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
  return (
    <>
      <Bulle texte="Signaler une erreur">
        <button onClick={e => { e.stopPropagation(); setOuvert(true) }}
          className={className}
          style={{ ...BTN_STYLE, color:'#c8c0b4' }}
          aria-label="Signaler une erreur">
          ⚑
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
