'use client'

// « Liens bibliques » : les deux files de liens qui attendent l'éditeur, en deux onglets sous
// une seule entrée du sommaire (demande de l'auteur, 16 septembre 2026).
//
// - « Vérifications » arbitre un lien qui a DÉJÀ son verset (`SectionVerifications`) ;
// - « Constituer liens » rattache un verset à un renvoi repéré sans lui (`SectionConstituerLiens`).
//
// Un lien constitué rejoint la première file : les deux écrans sont les deux temps d'un même
// travail, et c'est pourquoi ils se tiennent sous le même titre. L'onglet ouvert se lit dans
// l'adresse (`liensBibliques.ts`). ⚠️ Seul l'onglet ouvert est monté : revenir aux vérifications
// relit leur file, qui a pu gagner les liens qu'on vient de constituer.
//
// ⛔ La pastille du sommaire compte les DEUX files. Les deux comptes se relèvent ici, sans
// charger les files entières ; l'onglet ouvert remplace ensuite le sien par celui de sa liste.

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import OngletsPage from '@/app/components/OngletsPage'
import SectionVerifications from './SectionVerifications'
import SectionConstituerLiens from './SectionConstituerLiens'
import { useCompteursAdmin } from './CadreAdministration'
import { VUES_LIENS, adresseVueLiens, libelleAvecCompte, totalLiens, vueLiens, type VueLiens } from './liensBibliques'

type Comptes = Record<VueLiens, number | null>

export default function SectionLiensBibliques() {
  const vue = vueLiens(useSearchParams().get('vue'))
  const { poserCompteur } = useCompteursAdmin()
  const [comptes, setComptes] = useState<Comptes>({ verifications: null, constituer: null })

  useEffect(() => {
    let fini = false
    void (async () => {
      const [verifications, constituer] = await Promise.all([
        supabase.rpc('count_verifications_pending'),
        supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).eq('fiabilite', 'à constituer'),
      ])
      if (fini) return
      if (verifications.error) console.error('[liens bibliques] compte des vérifications :', verifications.error)
      if (constituer.error) console.error('[liens bibliques] compte des liens à constituer :', constituer.error)
      // ⚠️ Un compte déjà posé par la liste ouverte l'emporte : il est fait sur ce qu'elle montre.
      setComptes(avant => ({
        verifications: avant.verifications ?? (verifications.error ? null : Number(verifications.data ?? 0)),
        constituer: avant.constituer ?? (constituer.error ? null : (constituer.count ?? 0)),
      }))
    })()
    return () => { fini = true }
  }, [])

  // ⛔ Des rappels STABLES : chaque liste pose son compte dans un effet qui en dépend.
  const poserVerifications = useCallback((n: number) => setComptes(a => (a.verifications === n ? a : { ...a, verifications: n })), [])
  const poserConstituer = useCallback((n: number) => setComptes(a => (a.constituer === n ? a : { ...a, constituer: n })), [])

  const total = totalLiens(comptes.verifications, comptes.constituer)
  useEffect(() => { if (total !== null) poserCompteur('liens', total) }, [total, poserCompteur])

  const choisir = (cle: VueLiens) => {
    window.history.replaceState(null, '', adresseVueLiens(window.location.search, cle))
  }

  return (
    <>
      <OngletsPage<VueLiens>
        onglets={VUES_LIENS.map(v => ({ cle: v.cle, libelle: libelleAvecCompte(v.libelle, comptes[v.cle]) }))}
        actif={vue}
        choisir={choisir}
        intitule="Files des liens bibliques"
        style={{ maxWidth: '30rem', marginBottom: '22px' }}
      />
      {vue === 'verifications'
        ? <SectionVerifications onCountChange={poserVerifications} />
        : <SectionConstituerLiens onCountChange={poserConstituer} />}
    </>
  )
}
