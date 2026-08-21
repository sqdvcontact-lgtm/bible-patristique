'use client'

import { CADRES_PORTRAIT, stylePhotoAuteur, type AuteurPhotoPos, type SurfacePortrait } from '@/app/lib/photoAuteur'

// Un portrait dans le cadre d'une surface donnée. Une seule définition, partagée
// par les pages qui montrent un portrait ET par l'écran de cadrage de l'admin :
// c'est ce qui garantit que l'aperçu de l'admin montre EXACTEMENT ce que le
// lecteur verra. Un aperçu qui recopie les mesures de la page qu'il imite finit
// toujours par mentir.

export default function CadreAuteur({ surface, url, pos, alt = '', onPointerDown, curseur, children }: {
  surface: SurfacePortrait
  url: string
  pos: AuteurPhotoPos
  alt?: string
  /** Rendu interactif (écran de cadrage) : la zone de saisie du glissé. */
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
  curseur?: string
  /** Repli affiché sous l'image, visible si elle manque. */
  children?: React.ReactNode
}) {
  const cadre = CADRES_PORTRAIT[surface]
  const avecPassePartout = cadre.passePartout !== '0'
  return (
    <div style={{
      width: cadre.largeur, height: cadre.hauteur, flexShrink: 0, position: 'relative', overflow: 'hidden',
      padding: cadre.passePartout,
      background: avecPassePartout ? 'var(--cs-surface)' : 'var(--cs-fond-doux)',
      border: avecPassePartout ? '1px solid var(--cs-bord)' : undefined,
      boxSizing: 'border-box',
    }}>
      <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--cs-fond-doux)' }}>
        {children}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', ...stylePhotoAuteur(pos) }} />
        {onPointerDown && (
          <div onPointerDown={onPointerDown}
            style={{ position: 'absolute', inset: 0, cursor: curseur ?? 'grab', touchAction: 'none' }} />
        )}
      </div>
    </div>
  )
}
