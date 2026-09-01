'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useCompte } from '@/app/lib/contexteCompte'
import { memoriserTraductionBible } from '@/app/lib/preferenceBible'
import { themeValide, type Theme } from '@/app/lib/theme'
import { useEspace } from '@/app/compte/EspaceCompte'
import { Carte, EnTeteRubrique, inputStyle, labelStyle, LigneEnregistrer, type Statut } from '@/app/compte/champsCompte'

// Repli tant que la table n'a pas répondu : la rubrique ne se montre jamais avec un
// menu vide, et le lecteur retrouve au moins les quatre traductions historiques.
const TRADUCTIONS = [
  { code: 'TR0001', label: 'Bible de Sacy' },
  { code: 'TR0002', label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
]

export default function RubriqueLecture() {
  const { user, profil, majProfil } = useEspace()
  const { theme: themeCourant, changerTheme } = useCompte()

  const [traduction, setTraduction] = useState(profil.traduction_defaut)
  const [themeChoisi, setThemeChoisi] = useState<Theme>(themeValide(profil.theme_lecture) ?? themeCourant)
  const [traductions, setTraductions] = useState(TRADUCTIONS)
  const [statut, setStatut] = useState<Statut>(null)
  const [enregistrement, setEnregistrement] = useState(false)

  useEffect(() => {
    // ⛔ `est_biblique` : voir le commentaire dans app/page.tsx.
    supabase.from('traductions').select('trad_id, nom').eq('est_biblique', true).order('ordre', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error('Lecture : la liste des traductions n’a pas pu être lue.', error); return }
        if (data?.length) setTraductions(data.map(t => ({ code: t.trad_id as string, label: t.nom as string })))
      })
  }, [])

  const enregistrer = async () => {
    setEnregistrement(true); setStatut(null)
    const { error } = await supabase.from('profils').update({ traduction_defaut: traduction }).eq('id', user.id)
    // Le thème passe par le contexte, qui l'écrit à la fois sur l'écran, dans le
    // miroir local et sur le compte. L'écrire ici en plus le poserait deux fois.
    const erreurTheme = themeChoisi === themeCourant
      ? null
      : await changerTheme(themeChoisi).then(() => null).catch((e: unknown) => e)
    setEnregistrement(false)
    if (error || erreurTheme) {
      console.error('Lecture : les préférences n’ont pas pu être enregistrées.', error ?? erreurTheme)
      setStatut({ ok: false, msg: 'Les modifications n’ont pas pu être enregistrées. Réessayez.' })
      return
    }
    majProfil({ traduction_defaut: traduction, theme_lecture: themeChoisi })
    localStorage.setItem('traduction_defaut', traduction)
    // La page Bible décide sa colonne sur le SERVEUR : sans ce cookie, elle
    // continuerait de servir la bible retenue jusqu'ici, et le nouveau choix ne
    // paraîtrait qu'après un passage par le menu.
    memoriserTraductionBible(traduction)
    setStatut({ ok: true, msg: 'Préférences enregistrées.' })
    setTimeout(() => setStatut(null), 2500)
  }

  return (
    <>
      <EnTeteRubrique titre="Lecture">
        Ces deux réglages vous suivent d’un appareil à l’autre, puisqu’ils sont retenus sur votre compte.
      </EnTeteRubrique>

      <Carte titre="Préférences de lecture">
        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="traduction-defaut" style={labelStyle}>TRADUCTION PAR DÉFAUT</label>
          <select id="traduction-defaut" value={traduction} onChange={e => setTraduction(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {traductions.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
          </select>
          <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', margin: '6px 0 0', lineHeight: 1.5 }}>
            C’est la colonne que la page biblique ouvre quand vous arrivez sur un chapitre.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="theme-lecture" style={labelStyle}>THÈME DE LECTURE</label>
          <select id="theme-lecture" value={themeChoisi} onChange={e => setThemeChoisi(e.target.value as Theme)} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="clair">Clair</option>
            <option value="sombre">Sombre (cuir)</option>
          </select>
          <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', margin: '6px 0 0', lineHeight: 1.5 }}>
            L’interrupteur du menu de compte règle la même préférence, en raccourci.
          </p>
        </div>

        <LigneEnregistrer onClick={enregistrer} occupe={enregistrement} statut={statut} />
      </Carte>
    </>
  )
}
