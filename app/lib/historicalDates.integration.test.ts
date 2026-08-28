import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fusionnerDatesFrise, type RangFrise, type RangFriseDates } from './frise'

const lire = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('intégration des dates historiques', () => {
  it('emploie auteurs.dates et HistoricalDate long dans la Bibliothèque', () => {
    const page = lire('../bibliotheque/page.tsx')
    const client = lire('../bibliotheque/BibliothequeClient.tsx')
    // Les colonnes lues par la bibliothèque vivent dans un module partagé : la page
    // serveur et le rechargement client doivent lire les MÊMES (une liste dupliquée
    // avait dérivé et privé la section « Opuscules » de nb_signes).
    const selects = lire('./bibliothequeSelects.ts')

    expect(page).toContain('SELECT_AUTEURS_BIBLIOTHEQUE')
    for (const colonne of ['dates', 'siecle', 'date_naissance', 'date_mort']) {
      expect(selects).toContain(colonne)
    }
    expect(client).toContain('const datesAuteur = auteur.dates')
    expect(client).toContain('<HistoricalDate value={datesAuteur} variant="long" />')
    expect(client).not.toContain('formaterDateHistorique(auteur.dates)')
  })

  it('lit nb_signes des deux côtés, sans quoi la section Opuscules ne peut pas paraître', () => {
    const page = lire('../bibliotheque/page.tsx')
    const client = lire('../bibliotheque/BibliothequeClient.tsx')
    const selects = lire('./bibliothequeSelects.ts')

    expect(selects).toContain('nb_signes')
    expect(page).toContain('SELECT_OEUVRES_BIBLIOTHEQUE')
    expect(client).toContain('SELECT_OEUVRES_BIBLIOTHEQUE')
    // Aucune liste de colonnes recomposée sur place : c'est la dérive qui avait tout cassé.
    expect(page).not.toContain('date_publication_affichage_courte,')
    expect(client).not.toContain('const SELECT_OEUVRES_DATES')
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
    // ⚠️ Le repli sur `date_affichage` n'affaiblit pas la règle : la vue des auteurs
    // porte toujours les deux colonnes, et la date courte l'emporte. Il ne sert que la
    // vue des TRADUCTIONS, qui n'a pas de date courte et laissait donc la colonne des
    // dates VIDE sur toute chronologie de traduction (relevé le 2026-08-28).
    expect(modale).toContain('value={a.date_affichage_courte ?? a.date_affichage} variant="short"')
    expect(modale).not.toContain("from('v_chronologie_auteurs')")
    expect(modale).not.toContain('auteur.chronologie')
  })

  it('emploie rechercher_frise_v2 et rend les précisions sans qualification visible', () => {
    const histoire = lire('../histoire/page.tsx')
    const client = lire('../histoire/HistoireClient.tsx')
    const precision = client.indexOf('e.date_precision_affichage')
    const note = client.indexOf('e.note_datation', precision)

    expect(histoire).toContain("rpc('rechercher_frise_v2'")
    expect(client).toContain('<HistoricalDate value={e.date_affichage} variant="short" />')
    expect(precision).toBeGreaterThan(-1)
    expect(note).toBeGreaterThan(precision)
    expect(client).not.toContain('e.qualification_date')
    expect(client).not.toContain('e.date_exacte')
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
