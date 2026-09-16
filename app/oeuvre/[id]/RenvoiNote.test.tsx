import { readFileSync } from 'node:fs'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MARGE_PARAGRAPHE_ENCART_REM } from '../../lib/compositionNote'
import { cleDuRenvoi, cleIdentiteNote, PROFONDEUR_MAX_RENVOIS, type RenvoiNoteData, type TeteRenvoi } from '../../lib/renvoisNotes'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import {
  ProvisionCheminDesNotes,
  ProvisionNotesConnues,
  ProvisionRenvois,
  RenvoisSousLeBloc,
  chargerDepuisLaRoute,
  registreDesNotes,
} from './RenvoiNote'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

// ── LE RENVOI DE NOTE À NOTE, RENDU (charte § 13.20) ─────────────────────────────
//
// ⚠️ Les textes viennent des Catéchèses baptismales de Faivre (1844), abrégés. ⛔ Aucune
// clé n'entre dans la règle : les tests en nomment pour désigner une note, rien de plus.

const INSECABLE = String.fromCharCode(0xa0)
/** « note 10 », l'insécable comprise. ⚠️ Composée par une aide : un gabarit qui colle deux
 *  chiffres à une interpolation se lit, pour la garde des formes, comme un alpha de teinte. */
const noteNo = (numero: number) => ['note', String(numero)].join(INSECABLE)
const NoteNo = (numero: number) => ['Note', String(numero)].join(INSECABLE)
const FINE = String.fromCharCode(0x202f)
const T = 'A0044O0003TFR-V11'
const cle = (numero: string) => `${T}:note:${numero}`
const id = (numero: string) => ({ idTexte: T, noteKey: cle(numero) })

const resolu = (numero: number, titre = 'Seconde catéchèse'): TeteRenvoi => ({ etat: 'resolu', numero, titre })

function bloc(champs: Partial<NoteBlocData>): NoteBlocData {
  return {
    blockId: 'b1', rank: 1, kind: 'commentary', form: 'prose', language: 'fr', text: 'Texte',
    rendering: null, needsReview: false, targetBlockId: null, translationOf: null, ...champs,
  }
}

function renvoi(champs: Partial<RenvoiNoteData> & { citation: string; source: RenvoiNoteData['source'] }): RenvoiNoteData {
  return { blocId: 'b1', rang: 1, mode: 'note_preview', cible: id('00070'), ...champs }
}

const CITATION_B = 'voir la note B de la Seconde catéchèse, 4.'

/** La note 00466 : « Sur les Anges, voir la note B de la Seconde catéchèse, 4. » */
function noteSurLesAnges(tete: TeteRenvoi | 'sans tete' = resolu(10), texte = `Sur les Anges, ${CITATION_B}`): NoteStructuree {
  return {
    noteKey: cle('00466'), noteNumber: 481, displayNumber: 3,
    blocks: [bloc({ text: texte, renvois: [renvoi({ citation: CITATION_B, source: id('00466'), tete: tete === 'sans tete' ? undefined : tete })] })],
  }
}

/** La note B elle-même, dans ses blocs ACTUELS. */
function noteB(texte = 'Les Anges, dit saint Cyrille, sont des esprits.', renvois?: RenvoiNoteData[]): NoteStructuree {
  return { noteKey: cle('00070'), noteNumber: 73, displayNumber: 10, blocks: [bloc({ blockId: 'b-B', text: texte, renvois })] }
}

const rendre = (note: NoteStructuree) => renderToStaticMarkup(<ContenuNoteStructuree note={note} />)
const compter = (html: string, motif: string) => html.split(motif).length - 1
/** Ce que le lecteur lit : le texte, balises ôtées. */
const lu = (html: string) => html.replace(/<[^>]+>/gu, '')

describe('la tête dynamique remplace la forme imprimée', () => {
  it('dit « Voir note {numéro} de {titre} : », puis le contrôle', () => {
    const html = rendre(noteSurLesAnges())
    expect(lu(html)).toBe(`Sur les Anges, voir ${noteNo(10)} de Seconde catéchèse${INSECABLE}: Afficher la note visée`)
    expect(html).toContain('<button type="button" class="cs-lien-phrase cs-renvoi-controle" aria-expanded="false">Afficher la note visée</button>')
    expect(html).not.toContain('note B')
    expect(html).not.toContain(', 4.')
  })

  it('ne pose pas d’aria-controls tant que rien n’est déplié', () => {
    expect(rendre(noteSurLesAnges())).not.toContain('aria-controls')
  })

  it('suit la note visée renumérotée : la même relation, un autre numéro', () => {
    const avant = rendre(noteSurLesAnges(resolu(10)))
    const apres = rendre(noteSurLesAnges(resolu(11)))
    expect(avant).toContain(`${noteNo(10)} de`)
    expect(apres).toContain(`${noteNo(11)} de`)
    expect(apres).toContain('data-renvoi-cible="A0044O0003TFR-V11:note:00070"')
  })

  it('suit le titre de niveau 1 corrigé', () => {
    expect(rendre(noteSurLesAnges(resolu(10, 'Deuxième catéchèse')))).toContain(`${noteNo(10)} de Deuxième catéchèse`)
  })

  it('rend plusieurs renvois d’un même bloc, chacun avec son contrôle, dans l’ordre', () => {
    const texte = 'sont identiquement les mêmes ; voir la note B de la Douzième catéchèse, 5, et la note D de la Dixième catéchèse, 6.'
    const note: NoteStructuree = {
      noteKey: cle('01189'), noteNumber: 1207,
      blocks: [bloc({
        text: texte,
        renvois: [
          renvoi({ rang: 1, citation: 'voir la note B de la Douzième catéchèse, 5', source: id('01189'), cible: id('00789'), tete: resolu(2, 'Douzième catéchèse') }),
          renvoi({ rang: 2, citation: 'la note D de la Dixième catéchèse, 6.', source: id('01189'), cible: id('00585'), tete: resolu(4, 'Dixième catéchèse') }),
        ],
      })],
    }
    const html = rendre(note)
    expect(compter(html, 'Afficher la note visée')).toBe(2)
    expect(html.indexOf('Douzième catéchèse')).toBeLessThan(html.indexOf('Dixième catéchèse'))
    expect(lu(html)).toBe(`sont identiquement les mêmes${FINE}; voir ${noteNo(2)} de Douzième catéchèse${INSECABLE}: Afficher la note visée, et voir ${noteNo(4)} de Dixième catéchèse${INSECABLE}: Afficher la note visée`)
    expect(html).not.toContain('note D de')
  })

  it('garde la phrase d’un inline_mention, et pose sa tête sous le bloc', () => {
    const citation = 'note JJ de la Catéchèse VI'
    const note: NoteStructuree = {
      noteKey: cle('00393'), noteNumber: 406,
      blocks: [bloc({
        text: `Nous avons vu dans la ${citation} que le nom de Manès signifiait *Paraclet*.`,
        renvois: [renvoi({ mode: 'inline_mention', citation, source: id('00393'), cible: id('00392'), tete: resolu(21, 'Sixième catéchèse') })],
      })],
    }
    const html = rendre(note)
    expect(html).toContain(`dans la <span class="cs-renvoi" data-renvoi-mode="inline_mention">`)
    expect(html).toContain(`${noteNo(21)} de Sixième catéchèse`)
    expect(html).toMatch(new RegExp(`<p class="cs-renvoi-ligne">.*Voir ${noteNo(21)} de Sixième catéchèse${INSECABLE}:.*Afficher la note visée`, 'u'))
    expect(html).not.toContain('Catéchèse VI')
  })

  it('laisse la forme imprimée quand la citation a disparu du bloc, sans rien doubler', () => {
    const html = rendre(noteSurLesAnges(resolu(10), 'Texte repris depuis la relation.'))
    expect(html).toContain('Texte repris depuis la relation.')
    expect(html).not.toContain('Afficher la note visée')
    expect(html).not.toContain('cs-renvoi')
  })

  it('ne propose rien d’ouvrir quand la note visée est introuvable', () => {
    const html = rendre(noteSurLesAnges({ etat: 'introuvable' }))
    expect(lu(html)).toBe('Sur les Anges, note visée introuvable')
    expect(html).not.toContain('<button')
    // En tête de bloc, la capitale.
    expect(lu(rendre(noteSurLesAnges({ etat: 'introuvable' }, CITATION_B)))).toBe('Note visée introuvable')
  })

  it('attend sa tête sans la deviner quand le chargeur ne l’a pas résolue', () => {
    const html = rendre(noteSurLesAnges('sans tete'))
    expect(lu(html)).toBe(`Sur les Anges, voir la note visée${INSECABLE}: Afficher la note visée`)
    expect(html).toContain('data-renvoi-tete="attente"')
    expect(html).toContain('Afficher la note visée')
  })

  it('se rend pareil au serveur et au client', () => {
    const note = noteSurLesAnges()
    expect(renderToString(<ContenuNoteStructuree note={note} />)).toBe(renderToString(<ContenuNoteStructuree note={note} />))
  })
})

describe('la note visée se déplie sous le bloc, par le rendu ordinaire des notes', () => {
  const rendreNote = (note: NoteStructuree) => <ContenuNoteStructuree note={note} />
  const source = noteSurLesAnges()
  const leRenvoi = source.blocks[0].renvois![0]

  function deplie(registre: NoteStructuree[], chemin: string[] = []) {
    return renderToStaticMarkup(
      <ProvisionNotesConnues registre={registreDesNotes([{ idTexte: T, notes: { S: Object.fromEntries(registre.map((n, i) => [String(i), n])) } }])}>
        <ProvisionCheminDesNotes chemin={chemin}>
          <ProvisionRenvois ouvertsInitiaux={[cleDuRenvoi(leRenvoi)]}>
            <RenvoisSousLeBloc renvois={[leRenvoi]} rendreNote={rendreNote} />
          </ProvisionRenvois>
        </ProvisionCheminDesNotes>
      </ProvisionNotesConnues>,
    )
  }

  it('rend la note visée entière, dans ses blocs actuels', () => {
    const html = deplie([noteB('Les Anges, dit saint Cyrille, sont des esprits.')])
    expect(html).toMatch(new RegExp(`<div id="renvoi-[A-Za-z0-9_-]+-b1-1" role="region" aria-label="${NoteNo(10)} de Seconde catéchèse" class="cs-renvoi-depliage"`, 'u'))
    expect(html).toContain('data-note-key="A0044O0003TFR-V11:note:00070"')
    expect(html).toContain('Les Anges, dit saint Cyrille, sont des esprits.')
    // Le contenu repris se lit tel qu'il est : rien n'en est gardé dans la relation.
    expect(deplie([noteB('Une note reprise.')])).toContain('Une note reprise.')
  })

  it('déplie une note qui porte elle-même un renvoi, dont le contrôle reste fermé', () => {
    const versC = renvoi({ blocId: 'b-B', citation: 'la note F de la Seconde catéchèse, 10.', source: id('00070'), cible: id('00088'), tete: resolu(12) })
    const html = deplie([noteB('Sur la hiérarchie des Anges, la note F de la Seconde catéchèse, 10.', [versC])])
    expect(lu(html)).toBe(`Sur la hiérarchie des Anges, voir ${noteNo(12)} de Seconde catéchèse${INSECABLE}: Afficher la note visée`)
    expect(compter(html, 'aria-expanded="false"')).toBe(1)
  })

  it('arrête A → B → A : la note source ne se rouvre pas dans la note qu’elle a ouverte', () => {
    const versA = renvoi({ blocId: 'b-B', citation: 'voir la note 481', source: id('00070'), cible: id('00466'), tete: resolu(3, 'Neuvième catéchèse') })
    const html = deplie([noteB('Et, en retour, voir la note 481', [versA])])
    expect(html).toContain('data-renvoi-arret="cycle"')
    expect(html).toContain('note déjà ouverte plus haut')
    expect(html).not.toContain('aria-expanded="false"')
  })

  it('arrête une chaîne trop profonde, même sans cycle', () => {
    const chemin = Array.from({ length: PROFONDEUR_MAX_RENVOIS }, (_, i) => cleIdentiteNote(id(`0090${i}`)))
    const html = deplie([noteB()], chemin)
    expect(html).toContain('data-renvoi-lecture="profondeur"')
    expect(html).not.toContain('data-note-key')
  })

  it('attend la route quand la page ne porte pas la note visée', () => {
    const html = deplie([])
    expect(html).toContain('data-renvoi-lecture="attente"')
    expect(html).toContain('role="status"')
    expect(html).toContain('Chargement de la note visée')
  })

  it('pose aria-expanded et aria-controls sur le contrôle d’un renvoi ouvert', () => {
    const html = renderToStaticMarkup(
      <ProvisionNotesConnues registre={registreDesNotes([{ idTexte: T, notes: { S: { '73': noteB() } } }])}>
        <ProvisionRenvois ouvertsInitiaux={[cleDuRenvoi(leRenvoi)]}>
          <RenvoisSousLeBloc renvois={[{ ...leRenvoi, mode: 'inline_mention' }]} rendreNote={rendreNote} />
        </ProvisionRenvois>
      </ProvisionNotesConnues>,
    )
    const controle = html.match(/<button[^>]*cs-renvoi-controle[^>]*>/u)![0]
    expect(controle).toContain('aria-expanded="true"')
    const vise = controle.match(/aria-controls="([^"]+)"/u)![1]
    expect(html).toContain(`<div id="${vise}" role="region"`)
    expect(html).toContain('Masquer la note visée')
  })
})

describe('registreDesNotes', () => {
  it('range les notes des deux textes sous leur identité, et ignore un texte absent', () => {
    const registre = registreDesNotes([
      { idTexte: T, notes: { S1: { '73': noteB() }, S2: { '73': noteB() } } },
      { idTexte: null, notes: { S3: { '1': noteSurLesAnges() } } },
    ])
    expect([...registre.keys()]).toEqual([cleIdentiteNote(id('00070'))])
  })
})

describe('chargerDepuisLaRoute', () => {
  const reponse = (corps: unknown, { status = 200, type = 'application/json', redirected = false } = {}) =>
    (async () => ({
      status, ok: status >= 200 && status < 300, redirected,
      headers: { get: (nom: string) => (nom.toLowerCase() === 'content-type' ? type : null) },
      json: async () => corps,
    })) as unknown as typeof fetch

  it('demande la note par son identité, et rend tête et note', async () => {
    let adresse = ''
    const faire = (async (url: string) => { adresse = url; return (await reponse({ tete: resolu(10), note: noteB() })(url)) }) as unknown as typeof fetch
    const lu = await chargerDepuisLaRoute(id('00070'), faire)
    expect(adresse).toBe(`/api/notes/renvoi?texte=${encodeURIComponent(T)}&note=${encodeURIComponent(cle('00070'))}`)
    expect(lu.tete).toEqual(resolu(10))
    expect(lu.note!.noteKey).toBe(cle('00070'))
  })

  it('rend une note absente sur 404, avec la tête que la route a résolue', async () => {
    expect(await chargerDepuisLaRoute(id('99999'), reponse({ tete: { etat: 'introuvable' }, note: null }, { status: 404 })))
      .toEqual({ tete: { etat: 'introuvable' }, note: null })
  })

  it('ne croit pas une page que le verrou a redirigée, ni une erreur du serveur', async () => {
    await expect(chargerDepuisLaRoute(id('00070'), reponse('<html>', { type: 'text/html', redirected: true }))).rejects.toThrow()
    await expect(chargerDepuisLaRoute(id('00070'), reponse({ erreur: 'x' }, { status: 500 }))).rejects.toThrow()
    await expect(chargerDepuisLaRoute(id('00070'), reponse({ tete: 'mal formée' }))).rejects.toThrow()
  })
})

describe('la feuille des renvois', () => {
  const feuille = readFileSync('app/globals.css', 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '')
  const corps = (selecteur: string) => {
    const debut = feuille.indexOf(`\n${selecteur} {`)
    expect(debut, `aucune règle « ${selecteur} »`).toBeGreaterThan(-1)
    return feuille.slice(feuille.indexOf('{', debut) + 1, feuille.indexOf('}', debut))
  }

  it('donne à une ligne et à un dépliage le blanc d’un bloc de note', () => {
    const blanc = `0 0 ${MARGE_PARAGRAPHE_ENCART_REM}rem`
    expect(corps('.cs-renvoi-ligne')).toContain(`margin: ${blanc};`)
    expect(corps('.cs-renvoi-depliage')).toContain(`margin: ${blanc};`)
  })

  it('ne coupe jamais le contrôle, et rend le blanc du dernier bloc déplié', () => {
    expect(corps('.cs-renvoi-controle')).toContain('white-space: nowrap')
    expect(feuille).toContain('.cs-renvoi-depliage > :only-child > :last-child { margin-bottom: 0 !important; }')
  })
})
