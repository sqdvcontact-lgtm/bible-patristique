'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/app/lib/supabase'
import type { ElementPanneau } from './texteEnrichiEssai'

type Props = {
  element: ElementPanneau | null
  onFermer: () => void
  toujoursVisible?: boolean
  enTete?: ReactNode
  editionNote?: { actif: boolean; mode: 'creation' | 'modification' }
  onEnregistrerNote?: (texte: string) => void
}

export default function VoletEssai({ element, onFermer, toujoursVisible, enTete, editionNote, onEnregistrerNote }: Props) {
  const [contenu, setContenu] = useState<string | null>(null)
  const [texteNote, setTexteNote] = useState('')
  const [chargement, setChargement] = useState(false)
  const [elementInterne, setElementInterne] = useState<ElementPanneau | null>(null)
  const elementActif = elementInterne ?? element

  useEffect(() => {
    setElementInterne(null)
  }, [element])

  useEffect(() => {
    if (!elementActif) return
    if (elementActif.type === 'note') {
      setContenu(elementActif.texte)
      setTexteNote(elementActif.texte)
      return
    }
    setChargement(true)
    setContenu(null)
    if (elementActif.type === 'verset') {
      supabase.from('versets').select('TR0002').eq('id_verset', elementActif.id).single()
        .then(({ data }) => { setContenu(data?.TR0002 ?? '(verset introuvable)'); setChargement(false) })
    } else {
      supabase.from('segments').select('segment_texte').eq('id', elementActif.id).single()
        .then(({ data }) => { setContenu(data?.segment_texte ?? '(segment introuvable)'); setChargement(false) })
    }
  }, [elementActif])

  const rendreNote = (texte: string) => {
    const morceaux: ReactNode[] = []
    const regex = /\[(.+?)\]\((verset|segment):(.+?)\)/g
    let dernier = 0, k = 0, m: RegExpExecArray | null
    while ((m = regex.exec(texte))) {
      if (m.index > dernier) morceaux.push(texte.slice(dernier, m.index))
      const [, label, type, id] = m
      morceaux.push(
        <button key={k++} onClick={() => setElementInterne({ type: type as 'verset' | 'segment', id, label })}
          style={{ color: '#3d6b4f', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
          {label}
        </button>
      )
      dernier = regex.lastIndex
    }
    if (dernier < texte.length) morceaux.push(texte.slice(dernier))
    return morceaux
  }

  if (!elementActif && !toujoursVisible) return null

  return (
    <div style={{
      position: 'fixed', top: '48px', right: 0, width: '320px', height: 'calc(100vh - 48px)',
      background: '#faf8f4', borderLeft: '1px solid #d6d0c4', padding: '20px', overflowY: 'auto',
      zIndex: 50, boxShadow: '-4px 0 16px rgba(0,0,0,0.06)',
    }}>
      {enTete && <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid #ede9e2' }}>{enTete}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d' }}>
          {!elementActif ? 'Notes et citations' : elementActif.type === 'note' ? 'Note' : elementActif.type === 'verset' ? 'Référence biblique' : 'Référence patristique'}
        </span>
        {elementActif && !toujoursVisible && <button onClick={onFermer} style={{ background: 'none', border: 'none', color: '#b0a89e', cursor: 'pointer', fontSize: '14px' }}>×</button>}
      </div>

      {!elementActif ? (
        <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic', lineHeight: 1.6 }}>
          Cliquez sur une note ou une citation dans le texte pour l'afficher ici.
        </p>
      ) : (
        <>
          {elementInterne && (
            <button onClick={() => setElementInterne(null)} style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '8px' }}>← Retour à la note</button>
          )}
          {elementActif.type !== 'note' && (
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', marginBottom: '10px' }}>{elementActif.label}</p>
          )}
          {chargement ? (
            <p style={{ fontSize: '12px', color: '#9a958d', fontStyle: 'italic' }}>Chargement...</p>
          ) : elementActif.type === 'note' && editionNote?.actif && onEnregistrerNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea value={texteNote} onChange={e => setTexteNote(e.target.value)} rows={8} placeholder="Texte de la note..."
                style={{ width: '100%', boxSizing: 'border-box', fontSize: '12.5px', lineHeight: 1.55, color: '#2a2520', border: '1px solid #d6d0c4', borderRadius: '6px', background: '#fff', padding: '9px 10px', resize: 'vertical', outline: 'none' }} />
              <p style={{ fontSize: '10.5px', color: '#8a8278', lineHeight: 1.45, margin: 0 }}>
                Pour un renvoi interne, utilisez par exemple [Jc 4, 5](verset:ID) ou [Augustin](segment:ID).
              </p>
              <button onClick={() => onEnregistrerNote(texteNote)} style={{ alignSelf: 'flex-end', fontSize: '11.5px', padding: '6px 14px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {editionNote.mode === 'creation' ? 'Insérer la note' : 'Enregistrer la note'}
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '13.5px', color: '#2a2520', lineHeight: 1.55, fontStyle: 'normal', whiteSpace: 'pre-wrap' }}>
              {elementActif.type === 'note' ? rendreNote(contenu ?? '') : contenu}
            </p>
          )}
        </>
      )}
    </div>
  )
}
