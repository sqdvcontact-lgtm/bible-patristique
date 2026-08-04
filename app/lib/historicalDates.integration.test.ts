import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fusionnerDatesFrise, type RangFrise, type RangFriseDates } from './frise'

const lire = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('intégration des dates historiques', () => {
  it('emploie auteurs.dates et HistoricalDate long dans la Bibliothèque', () => {
    const page = lire('../bibliotheque/page.tsx')
    const client = lire('../bibliotheque/BibliothequeClient.tsx')

    expect(page).toContain('titre, dates, siecle')
    expect(client).toContain('const datesAuteur = auteur.dates')
    expect(client).toContain('<HistoricalDate value={datesAuteur} variant="long" />')
    expect(client).not.toContain('formaterDateHistorique(auteur.dates)')
  })

  it('emploie les vues canoniques pour les œuvres et les notices rencontrées', () => {
    const page = lire('../bibliotheque/page.tsx')
    const client = lire('../bibliotheque/BibliothequeClient.tsx')
    const modale = lire('../components/ModaleAuteur.tsx')

    expect(page).toContain('from("v_oeuvres_dates")')
    expect(client).toContain("from('v_oeuvres_dates')")
    expect(client).toContain('o.date_publication_affichage_courte')
    expect(client).toContain("from('v_catalogue_notices_dates')")
    expect(client).toContain('n.date_edition_affichage_courte ?? n.siecle_edition_affichage')
    expect(modale).toContain("from('v_oeuvres_dates')")
    expect(modale).toContain('o.date_composition_affichage_courte')
    expect(modale).not.toContain('simplifierDateFrise')
  })

  it('emploie la nouvelle vue et sa date courte dans la frise auteur', () => {
    const modale = lire('../components/ModaleAuteur.tsx')

    expect(modale).toContain("from('v_chronologie_auteurs_dates')")
    expect(modale).toContain('value={a.date_affichage_courte} variant="short"')
    expect(modale).not.toContain("from('v_chronologie_auteurs')")
    expect(modale).not.toContain('auteur.chronologie')
  })

  it('emploie rechercher_frise_v2 et rend les précisions sans qualification visible', () => {
    const histoire = lire('../histoire/page.tsx')
    const precision = histoire.indexOf('e.date_precision_affichage')
    const note = histoire.indexOf('e.note_datation', precision)

    expect(histoire).toContain("rpc('rechercher_frise_v2'")
    expect(histoire).toContain('<HistoricalDate value={e.date_affichage} variant="short" />')
    expect(precision).toBeGreaterThan(-1)
    expect(note).toBeGreaterThan(precision)
    expect(histoire).not.toContain('e.qualification_date')
    expect(histoire).not.toContain('e.date_exacte')
  })

  it('fusionne les champs v2 sans altérer le reste de la notice', () => {
    const rangs = [{
      id: 'EVT000610', date_affichage: 'ancienne date', notice: 'Première attestation romaine',
      date_precision_affichage: null, qualification_date: null, note_datation: null,
    }] as RangFrise[]
    const dates = [{
      id: 'EVT000610', date_affichage: '336', date_precision_affichage: '25 décembre 336',
      qualification_date: 'exacte', note_datation: null,
    }] satisfies RangFriseDates[]

    expect(fusionnerDatesFrise(rangs, dates)[0]).toMatchObject({
      date_affichage: '336',
      date_precision_affichage: '25 décembre 336',
      notice: 'Première attestation romaine',
    })
  })
})
