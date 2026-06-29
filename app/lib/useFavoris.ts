'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/app/lib/supabase'

type Type = 'oeuvre' | 'essai'

const LS_KEYS: Record<Type, string> = {
  oeuvre: 'cs_favoris_oeuvres',
  essai:  'cs_favoris_essais',
}

function lireLS(type: Type): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEYS[type])
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch { return new Set() }
}

function ecrireLS(type: Type, set: Set<string>) {
  localStorage.setItem(LS_KEYS[type], JSON.stringify([...set]))
}

export function useFavoris(type: Type) {
  const [favoris, setFavoris] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [pret, setPret] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)

      if (uid) {
        const { data: rows } = await supabase
          .from('favoris')
          .select('ref_id')
          .eq('user_id', uid)
          .eq('type', type)
        setFavoris(new Set((rows ?? []).map(r => r.ref_id)))
      } else {
        setFavoris(lireLS(type))
        const onStorage = (e: StorageEvent) => {
          if (e.key === LS_KEYS[type]) setFavoris(lireLS(type))
        }
        window.addEventListener('storage', onStorage)
        setPret(true)
        return () => window.removeEventListener('storage', onStorage)
      }

      setPret(true)
    })
  }, [type])

  const toggle = useCallback(async (refId: string) => {
    const uid = userId

    if (uid) {
      const estFavori = favoris.has(refId)
      if (estFavori) {
        await supabase.from('favoris').delete()
          .eq('user_id', uid).eq('type', type).eq('ref_id', refId)
        setFavoris(prev => { const n = new Set(prev); n.delete(refId); return n })
      } else {
        await supabase.from('favoris').insert({ user_id: uid, type, ref_id: refId })
        setFavoris(prev => new Set([...prev, refId]))
      }
    } else {
      setFavoris(prev => {
        const n = new Set(prev)
        if (n.has(refId)) n.delete(refId); else n.add(refId)
        ecrireLS(type, n)
        return n
      })
    }
  }, [userId, favoris, type])

  return { favoris, pret, toggle }
}
