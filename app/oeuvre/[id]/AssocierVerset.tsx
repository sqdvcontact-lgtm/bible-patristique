'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/app/lib/supabase'
import type { ChampLienBiblique, VersetLienBiblique } from '@/app/components/ModalLienBiblique'
import type { VRef } from './oeuvreTypes'

/**
 * ⛔ C'EST LA FENÊTRE QUI SE CHARGE À LA DEMANDE, PLUS LE BOUTON (2026-09-10).
 *
 * Ce composant était lui-même chargé à la demande depuis `OeuvreClient`, et il l'était
 * au PREMIER CLIC SUR UN SEGMENT — le geste le plus courant de la lecture. Or un morceau
 * de code d'un déploiement précédent rend **404** sur le domaine (mesuré le 10 septembre
 * 2026) : un onglet ouvert avant un déploiement recevait donc un échec de chargement à ce
 * clic-là, Next rechargeait la page en dur, et le lecteur se retrouvait en haut. Il ne le
 * voyait qu'une fois par page, et jamais deux fois de suite — de quoi chercher longtemps
 * du côté du gestionnaire de clic, qui n'y est pour rien.
 *
 * Le bouton pèse quatre-vingts lignes : il entre dans le bundle de la page, et plus aucun
 * morceau ne part au premier clic. ⚠️ La FENÊTRE, elle, en fait trois cent quarante et
 * n'est utile qu'à l'administrateur : elle reste chargée à la demande, mais derrière un
 * geste EXPLICITE et rare, où un rechargement se comprend au lieu de surprendre.
 */
const ModalLienBiblique = dynamic(() => import('@/app/components/ModalLienBiblique'))

export default function AssocierVerset({ segId, onAssocie }: {
  segId: number
  onAssocie: (champ: ChampLienBiblique, verset: VRef) => void
}) {
  const [ouvert, setOuvert] = useState(false)
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const enregistrer = async (champ: ChampLienBiblique, versets: VersetLienBiblique[]) => {
    setEnregistrement(true)
    setErreur(null)
    try {
      const { data: segActuel, error: e0 } = await supabase.from('segments').select(champ).eq('id', segId).single()
      if (e0) throw e0
      const valeurActuelle = (segActuel as Partial<Record<ChampLienBiblique, string | null>> | null)?.[champ] ?? ''
      const existants = valeurActuelle.split(';').map(s => s.trim()).filter(Boolean)
      const nouveaux = versets.map(v => v.id).filter(id => !existants.includes(id))
      if (nouveaux.length === 0) {
        setErreur('Ces versets figurent déjà dans ce type de lien.')
        setEnregistrement(false)
        return
      }
      const nouvelleValeur = [...existants, ...nouveaux].join('; ')
      const { error } = await supabase.from('segments').update({ [champ]: nouvelleValeur }).eq('id', segId)
      if (error) throw error

      versets.forEach(v => {
        if (!nouveaux.includes(v.id)) return
        onAssocie(champ, {
          id: v.id,
          label: v.label,
          textes: { TR0001: v.texte },
          livre: v.livre,
          chapitre: v.chapitre,
          verset: v.verset,
        })
      })
      setOuvert(false)
    } catch {
      setErreur("Erreur lors de l'enregistrement.")
    }
    setEnregistrement(false)
  }

  return (
    <>
      <button
        onClick={() => { setErreur(null); setOuvert(true) }}
        title="Ajouter un lien biblique à ce segment"
        // ⛔ Pleine largeur et libellé CENTRÉ, comme « + Proposer un lien biblique »
        // que voit le lecteur : c'est le même geste, il ne doit pas se présenter de
        // deux façons selon qu'on est administrateur ou non. Le bouton se dimensionnait
        // à son texte et pendait donc à gauche, sous un arbre qui, lui, est centré
        // dans le volet (relevé par l'auteur le 2026-08-28).
        // ⚠️ `boxSizing` : sans lui, le rembourrage et le filet s'ajouteraient aux
        // 100 %, et le bouton déborderait le volet de vingt-deux pixels.
        style={{ width: '100%', boxSizing: 'border-box', textAlign: 'center', fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.04)', border: '1px dashed #b8cdc0', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', marginTop: '8px' }}
      >
        + Ajouter un lien biblique
      </button>
      {erreur && <p style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', margin: '6px 0 0' }}>{erreur}</p>}
      {ouvert && (
        <ModalLienBiblique
          ouvert={ouvert}
          titre="Ajouter un lien biblique"
          erreur={erreur}
          enregistrement={enregistrement}
          onFermer={() => { if (!enregistrement) setOuvert(false) }}
          onValider={enregistrer}
        />
      )}
    </>
  )
}
