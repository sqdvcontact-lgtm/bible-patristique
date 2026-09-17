import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BlocEditorialBible } from './BibleEditionParatext'
import AppelNoteBiblique from './NoteBibliqueFenetre'
import { LigneNoteInventaire } from './InventaireNotes'
import { ancreNoteSansAppelBible, selecteurAppelsNoteBible } from '../lib/ouvrirNoteBible'

// ── L'ONGLET « NOTES » DE LA PAGE BIBLE ─────────────────────────────────────────
//
// Demande de l'auteur (16 septembre 2026) : « en mode admin, je veux pouvoir voir les notes
// associées à une bible dans le volet de droite (comme pour les œuvres) ; ajoute un onglet
// propre à l'admin avec “Pères de l'Église” ».
//
// ⚠️ Deux gardes. Les CIBLES que l'inventaire vise, rendues par les vrais composants de la
// page : un identifiant qui divergerait ferait un clic sans effet, et rien ne le dirait. Et
// l'ÉCRITURE du volet, qui doit réserver l'onglet à l'administrateur et le charger à part.

const PANNEAU = readFileSync('app/components/PanneauPatristique.tsx', 'utf8')
const PAGE = readFileSync('app/components/BibleLayout.tsx', 'utf8')

describe('les cibles de l’inventaire, dans la page', () => {
  it('l’appel d’une note de verset porte l’identifiant que l’inventaire cherche', () => {
    const html = renderToStaticMarkup(
      <AppelNoteBiblique note={{ id: 'note-v-1', displayNumber: 3, blocks: [] }} />,
    )
    expect(html).toContain('id="appel-note-bible-note-v-1"')
    expect(selecteurAppelsNoteBible('note-v-1')).toContain('[id="appel-note-bible-note-v-1"]')
  })

  it('en regard, l’appel suffixé du membre répond au même sélecteur', () => {
    const html = renderToStaticMarkup(
      <AppelNoteBiblique note={{ id: 'note-v-1', displayNumber: 3, blocks: [] }} memberId="membre-la" />,
    )
    expect(html).toContain('id="appel-note-bible-note-v-1-membre-la"')
    expect(selecteurAppelsNoteBible('note-v-1')).toContain('[id^="appel-note-bible-note-v-1-"]')
  })

  it('⛔ une note de bloc SANS point d’appel porte l’ancre de son entrée d’apparat', () => {
    const html = renderToStaticMarkup(
      <BlocEditorialBible bloc={{
        id: 'intro-mrk',
        semanticStyleCode: 'introduction_livre',
        placement: 'before',
        textBlocks: [{ id: 'texte', kind: 'commentary', form: 'prose', text: 'Introduction.' }],
        internalNotes: [{
          id: 'intro-note-1',
          displayNumber: 1,
          printedMarker: '1',
          blocks: [{ id: 'reference', kind: 'reference', form: 'prose', text: 'Act. XII, 12.' }],
        }],
      }} />,
    )
    expect(html).toContain(`id="${ancreNoteSansAppelBible('intro-note-1')}"`)
  })
})

describe('une ligne de l’inventaire', () => {
  it('⛔ est un bouton, et une note qui ne paraît nulle part reste listée, muette, avec sa raison', () => {
    const html = renderToStaticMarkup(
      <LigneNoteInventaire numero={4} courante={false} atteignable={false}
        nomAccessible="Note 4 — Son bloc n’a pas d’ancrage canonique"
        infobulle="Son bloc n’a pas d’ancrage canonique" onClick={() => {}} entete={null}>
        Aperçu
      </LigneNoteInventaire>,
    )
    expect(html).toMatch(/^<button type="button" disabled=""/)
    expect(html).toContain('title="Son bloc n’a pas d’ancrage canonique"')
    expect(html).toContain('aria-label="Note 4 — Son bloc n’a pas d’ancrage canonique"')
  })
})

describe('le volet de droite', () => {
  it('⛔ réserve l’onglet « Notes » à l’administrateur, et à une édition qui en porte', () => {
    expect(PANNEAU).toContain('const notesOffertes = isAdmin && notesBible !== null')
    expect(PANNEAU).toMatch(/\.\.\.\(notesOffertes \? \[\{\s*code: 'notes' as Onglet, label: 'Notes'/)
  })

  it('⛔ charge l’inventaire à part : le lecteur n’en paie pas le poids', () => {
    expect(PANNEAU).toContain("const OngletNotesBible = dynamic(() => import('@/app/components/OngletNotesBible'))")
    expect(PANNEAU).not.toMatch(/^import OngletNotesBible/m)
  })

  it('l’onglet affiché se déduit, et quitter un verset ne sort pas de l’inventaire', () => {
    expect(PANNEAU).toContain("(onglet === 'notes' && !notesOffertes)")
    expect(PANNEAU).toContain("setOnglet(o => (o === 'commentaires' ? 'patristique' : o))")
    expect(PANNEAU).not.toContain("if (!verset) setOnglet('patristique')")
  })

  it('la pagination des Pères ne paraît que sous leur onglet', () => {
    expect(PANNEAU).toContain("{ongletAffiche === 'patristique' && !enAttente && nbPagesItems > 1 && (")
  })

  it('⛔ la page compose le contexte, et le passe au volet', () => {
    expect(PAGE).toMatch(/notesBible=\{notesBible\}/)
    expect(PAGE).toContain('const familleLue = paratexteDisponible ?')
  })
})
