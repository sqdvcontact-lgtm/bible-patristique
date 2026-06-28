'use server'

import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'

type ColLien = 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4'

function retirerId(valeur: string | null | undefined, idVerset: string) {
  return String(valeur ?? '').split(';').map(v => v.trim()).filter(v => v && v !== idVerset).join('; ') || null
}

function ajouterId(valeur: string | null | undefined, idVerset: string) {
  const ids = String(valeur ?? '').split(';').map(v => v.trim()).filter(Boolean)
  if (!ids.includes(idVerset)) ids.push(idVerset)
  return ids.join('; ')
}

export async function verifierLien(seg: {
  id: number
  lien_1: string | null; lien_2: string | null; lien_3: string | null; lien_4: string | null
  verifies: string[]
}, idVerset: string, action: ColLien | 'pas_de_lien') {
  const supabase = await creerSupabaseServeur()

  const patch: Record<string, any> = {}

  ;(['lien_1', 'lien_2', 'lien_3', 'lien_4'] as ColLien[]).forEach(c => {
    patch[c] = retirerId(seg[c], idVerset)
  })
  if (action !== 'pas_de_lien') {
    patch[action] = ajouterId(patch[action], idVerset)
  }

  const vv = (seg.verifies ?? []).filter((v: string) => v !== idVerset)
  vv.push(idVerset)
  patch.verifies = vv

  // Calculer les liens restants après patch pour savoir si le segment est entièrement vérifié
  const liensApres: string[] = []
  ;(['lien_1', 'lien_2', 'lien_3', 'lien_4'] as ColLien[]).forEach(c => {
    String(patch[c] ?? '').split(';').map((v: string) => v.trim()).filter(Boolean).forEach((v: string) => liensApres.push(v))
  })
  if (liensApres.every(v => vv.includes(v))) {
    patch.fiabilite = 'vérifié'
  }

  const { error } = await supabase.from('segments').update(patch).eq('id', seg.id)
  if (error) throw new Error(error.message)

  return { patch, fiabiliteVerifiee: patch.fiabilite === 'vérifié' }
}
