import type { Metadata } from 'next'
import RubriqueLecture from './RubriqueLecture'

// ⚠️ `robots: HORS_INDEX` vient du layout de /compte : les métadonnées d'un layout
// descendent sur ses pages, et une rubrique qui le réécrirait risquerait de l'oublier.
// Le titre, lui, se pose ici, faute de quoi les quatre rubriques s'appelleraient toutes
// « Mon compte » dans l'onglet du navigateur.
export const metadata: Metadata = { title: 'Lecture' }

export default function PageLecture() {
  return <RubriqueLecture />
}
