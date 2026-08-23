'use client'

// Contrôle des scellés du fac-similé Bible 899, déclenché depuis le centre de contrôle.
//
// L'écran dit exactement ce qui est contrôlé, et ne laisse pas croire à davantage :
// la présence et la taille portent sur les 1 488 images, l'empreinte SHA-256 sur un
// échantillon tiré au sort. Le contrôle intégral, qui retélécharge 1,89 Go, vit
// ailleurs : `npm run bible899:verifier`, et le workflow du dimanche.
import React from 'react'

type Resultat = {
  attendues: number
  presentes: number
  absentes: string[]
  empreintesControlees: number
  empreintesFausses: string[]
  conforme: boolean
  dureeMs: number
}

export default function ScellesBible899() {
  const [encours, setEncours] = React.useState(false)
  const [resultat, setResultat] = React.useState<Resultat | null>(null)
  const [erreur, setErreur] = React.useState<string | null>(null)

  const lancer = async () => {
    setEncours(true); setErreur(null); setResultat(null)
    try {
      const reponse = await fetch('/api/admin/bible899-scelles', { method: 'POST' })
      const donnees = await reponse.json().catch(() => ({}))
      if (!reponse.ok) setErreur(donnees.error ?? `erreur ${reponse.status}`)
      else setResultat(donnees as Resultat)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'échec de la requête')
    } finally {
      setEncours(false)
    }
  }

  const manquantes = resultat ? resultat.attendues - resultat.presentes : 0

  return (
    <div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 0.75rem', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
        Les fac-similés vivent dans le seau <code>manuscrits</code> et non plus dans le dépôt.
        Le manifeste porte l’empreinte de chacun. Ce contrôle vérifie la présence et la taille
        des 1 488 images, et recalcule réellement l’empreinte d’une vingtaine d’entre elles,
        tirées au sort.
      </p>

      <button onClick={lancer} disabled={encours}
        style={{ fontSize: '0.8125rem', padding: '6px 14px', borderRadius: '4px',
                 border: '1px solid var(--cs-vert)', background: encours ? 'var(--cs-fond-doux)' : 'var(--cs-vert-aplat)',
                 color: encours ? 'var(--cs-texte-doux)' : 'var(--cs-surface)', cursor: encours ? 'default' : 'pointer' }}>
        {encours ? 'Contrôle en cours…' : 'Contrôler les scellés'}
      </button>

      {erreur && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--cs-danger)' }}>
          Échec du contrôle : {erreur}
        </p>
      )}

      {resultat && (
        <div style={{ marginTop: '0.875rem', fontSize: '0.8125rem', lineHeight: 1.6,
                      color: 'var(--cs-texte)', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
          <div style={{ fontWeight: 700, color: resultat.conforme ? 'var(--cs-vert)' : 'var(--cs-danger)' }}>
            {resultat.conforme
              ? 'Aucun écart relevé.'
              : 'Des écarts ont été relevés, voir le détail ci-dessous.'}
          </div>
          <div>Présence et taille : {resultat.presentes} images sur {resultat.attendues}{manquantes > 0 ? `, ${manquantes} absente${manquantes > 1 ? 's' : ''}` : ''}.</div>
          <div>Empreintes recalculées : {resultat.empreintesControlees}, dont {resultat.empreintesFausses.length} en écart.</div>
          {resultat.absentes.length > 0 && (
            <div style={{ color: 'var(--cs-danger)' }}>Absentes : {resultat.absentes.slice(0, 8).join(', ')}{resultat.absentes.length > 8 ? '…' : ''}</div>
          )}
          {resultat.empreintesFausses.length > 0 && (
            <div style={{ color: 'var(--cs-danger)' }}>Empreintes différentes : {resultat.empreintesFausses.join(', ')}</div>
          )}
          <div style={{ color: 'var(--cs-texte-faible)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            Contrôle effectué en {(resultat.dureeMs / 1000).toFixed(1)} s. Le contrôle intégral des
            1 488 empreintes tourne chaque dimanche, et se lance à la main par
            <code style={{ margin: '0 0.25rem' }}>npm run bible899:verifier</code>.
          </div>
        </div>
      )}
    </div>
  )
}
