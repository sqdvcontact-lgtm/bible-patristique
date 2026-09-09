'use client'

// ── Menu « Extraire cette œuvre » ─────────────────────────────────────────────
//
// La fenêtre s'ouvre depuis le volet de lecture, à côté de l'étoile des favoris. Elle est
// composée sur le modèle des fiches du site (`FicheEdition`, `ModaleAuteur`) : même cadre,
// même croix collante, même défilement du CONTENU et non du calque.
//
// ⛔ SES AXES SE COMPOSENT COMME CEUX D'UN VOLET DE LECTURE — une option par ligne, toutes
// les options montrées, la retenue sur pastille verte (`OPTION_VOLET`, `RUBRIQUE_AXE`).
// C'est la grammaire que la charte a fixée le 28 août 2026 et que la Bible comme l'œuvre
// emploient : « je veux qu'on distingue en un coup d'œil toutes les options ». Un menu
// d'extraction n'a aucune raison d'en inventer une autre.
//
// ⛔ UN AXE NE PARAÎT QUE S'IL SE POSE. Pas de division, pas d'étendue à choisir ; pas de
// texte original, pas de colonne en regard ; pas d'apparat, pas de case pour l'inclure.
// Offrir un réglage sans objet, c'est laisser croire au lecteur qu'il a réglé quelque
// chose (règle des niveaux d'affichage, charte du 5 septembre 2026).
//
// ⛔ ET LE MENU NE CHOISIT PAS L'ÉDITION : il extrait CELLE QU'ON LIT, et il le dit. Le
// choix d'une édition se prend dans le volet, sous « Éditions de ce texte », et un second
// endroit pour le même geste ferait deux vérités.

import { Z_MODALE } from '@/app/lib/empilement'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { OPTION_VOLET, RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import {
  OPTIONS_PAR_DEFAUT, adresseExtraction,
  type OptionsExtraction, type RegardExtraction,
} from '@/app/lib/extractionOeuvre'
import { verrouillerLeDefilement } from '@/app/lib/verrouDefilement'

// ⛔ `Z_MODALE`, ET NON LE RANG DES FENÊTRES DE PAGE. L'échelle le dit déjà en toutes
// lettres : une modale « couvre le tiroir d'où elle s'ouvre, et à Z_FENETRE elle s'y
// cacherait ». Sur un téléphone, tout ce qui ouvre cette fenêtre vit DANS le tiroir du
// volet (Z_TIROIR, 2401) : à 1200 elle s'ouvrait derrière le sommaire qui venait de la
// demander. Relevé de l'auteur, 2026-09-09, sur la fiche d'édition ; les quatre autres
// fenêtres de la page portaient le même défaut, trouvées en corrigeant celle-là.
// Le menu s'ouvre depuis la MÊME rangée de boutons que la fiche d'édition.
const Z_MENU = Z_MODALE

/** Au-delà, l'extraction demande un moment, et le lecteur doit le savoir avant de
 *  cliquer. ⚠️ Le seuil se compte en SIGNES du texte par défaut (`oeuvres.nb_signes`),
 *  la seule mesure que la page ait sous la main. */
const SIGNES_LONGS = 400_000

export type DonneesExtraction = {
  idOeuvre: string
  /** L'édition qu'on lit — c'est elle qu'on extrait. */
  idTexte: string
  /** Le nom de cette édition, dit au lecteur. `null` quand l'œuvre n'en a qu'une. */
  edition: string | null
  /** La division ouverte, et son intitulé. `null` : l'œuvre n'a pas de divisions. */
  division: string | null
  divisionLibelle: string | null
  /** Une colonne en langue originale peut-elle se composer ? */
  original: boolean
  /** L'œuvre porte-t-elle un apparat critique ? */
  apparat: boolean
  /** L'étendue du texte, pour avertir d'une extraction longue. */
  nbSignes: number | null
}

type Axe<T> = {
  rubrique: string
  valeur: T
  choix: { valeur: T; libelle: string }[]
  poser: (valeur: T) => void
}

function AxeOptions<T extends string | boolean | null>({ rubrique, valeur, choix, poser }: Axe<T>) {
  return (
    <div style={{ marginTop: '14px' }}>
      <span style={RUBRIQUE_AXE}>{rubrique}</span>
      {choix.map(option => {
        const actif = option.valeur === valeur
        return (
          <button key={String(option.valeur)} type="button" aria-pressed={actif}
            onClick={() => { if (!actif) poser(option.valeur) }}
            className="cs-option-volet" style={OPTION_VOLET(actif)}>
            {option.libelle}
          </button>
        )
      })}
    </div>
  )
}

export default function MenuExtraction({ donnees, onFermer }: {
  donnees: DonneesExtraction
  onFermer: () => void
}) {
  const [options, setOptions] = useState<OptionsExtraction>({
    ...OPTIONS_PAR_DEFAUT,
    idTexte: donnees.idTexte,
    // ⚠️ On propose d'emblée la DIVISION quand l'œuvre est longue : c'est ce que le
    // lecteur vient de lire, et une extraction de six cents pages qu'il n'a pas voulue
    // se paie en attente puis en fichier inutile.
    division: donnees.division && (donnees.nbSignes ?? 0) > SIGNES_LONGS ? donnees.division : null,
  })
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Échap ferme ; le défilement de fond est gelé tant que la fenêtre est ouverte.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    const relacher = verrouillerLeDefilement()
    return () => { document.removeEventListener('keydown', onKey); relacher() }
  }, [onFermer])

  const extraire = async () => {
    if (enCours) return
    setEnCours(true)
    setErreur(null)
    try {
      // ⛔ On passe par `fetch` et non par une navigation : une navigation rendrait une
      // page d'erreur en clair si la lecture échoue, et l'attente ne se dirait nulle part.
      const reponse = await fetch(adresseExtraction(donnees.idOeuvre, options), { credentials: 'same-origin' })
      if (!reponse.ok) {
        const dit = await reponse.json().catch(() => null)
        throw new Error(dit?.erreur ?? `L'extraction a échoué (${reponse.status}).`)
      }
      // ⛔ LE VERROU RENVOIE UNE REDIRECTION, PAS UNE ERREUR (charte, « Appels aux
      // routes admin »). Une session expirée renvoie vers `/chantier`, `fetch` suit, et
      // l'on reçoit un 200 porteur de HTML : sans ce contrôle, le lecteur téléchargerait
      // une page de connexion sous le nom d'un document Word.
      const type = reponse.headers.get('content-type') ?? ''
      if (reponse.redirected || !type.includes('wordprocessingml')) {
        throw new Error('Votre session a expiré. Rechargez la page, puis réessayez.')
      }
      const nom = nomPropose(reponse.headers.get('content-disposition'))
      const blob = await reponse.blob()
      const url = URL.createObjectURL(blob)
      const lien = document.createElement('a')
      lien.href = url
      lien.download = nom
      lien.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
      onFermer()
    } catch (e) {
      console.error('[extraction] échec', e)
      setErreur(e instanceof Error ? e.message : "L'extraction a échoué.")
    } finally {
      setEnCours(false)
    }
  }

  if (typeof document === 'undefined') return null

  const long = (donnees.nbSignes ?? 0) > SIGNES_LONGS && options.division === null

  return createPortal(
    /* ⛔ Le calque part de HAUTEUR_NAVBAR, jamais d'un nombre de pixels : la barre mesure
       56 px à la racine 16 et 77 à la racine 22. */
    <div onClick={onFermer} className="cs-extraction-calque"
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'var(--cs-calque-modale)', zIndex: Z_MENU, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflow: 'hidden' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="extraction-titre" onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: '26rem', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--cs-fond)', borderRadius: '12px', border: '1px solid var(--cs-bord-clair)', boxShadow: 'var(--cs-ombre-modale)', padding: '24px 26px 22px' }}>
        <button onClick={onFermer} aria-label="Fermer" className="cs-cible-fine" title="Fermer"
          style={{ position: 'sticky', float: 'right', top: 0, marginRight: '-6px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

        <h2 id="extraction-titre" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontWeight: 500, color: 'var(--cs-encre-fonce)', margin: '0 0 4px' }}>
          Extraire cette œuvre
        </h2>
        <p style={{ fontSize: '0.71875rem', lineHeight: 1.5, color: 'var(--cs-texte-second)', margin: '0 0 2px' }}>
          Un document Word (<code style={{ fontFamily: 'inherit' }}>.docx</code>) à styles nommés : titres, notes de bas de page et sommaire s’y composent d’eux-mêmes.
        </p>
        {donnees.edition && (
          <p style={{ fontSize: '0.6875rem', lineHeight: 1.45, color: 'var(--cs-texte-gris)', margin: '6px 0 0' }}>
            Édition extraite : {donnees.edition}.
          </p>
        )}

        {donnees.division && donnees.divisionLibelle && (
          <AxeOptions<string | null>
            rubrique="Étendue"
            valeur={options.division}
            choix={[
              { valeur: null, libelle: 'L’œuvre entière' },
              { valeur: donnees.division, libelle: donnees.divisionLibelle },
            ]}
            poser={division => setOptions(o => ({ ...o, division }))}
          />
        )}

        {donnees.original && (
          <AxeOptions<RegardExtraction>
            rubrique="Texte original"
            valeur={options.original}
            choix={[
              { valeur: 'aucun', libelle: 'Sans le texte original' },
              { valeur: 'regard', libelle: 'En regard, sur deux colonnes' },
              { valeur: 'suite', libelle: 'À la suite de chaque paragraphe' },
            ]}
            poser={original => setOptions(o => ({ ...o, original }))}
          />
        )}

        <AxeOptions<boolean>
          rubrique="Notes"
          valeur={options.notes}
          choix={[
            { valeur: true, libelle: 'En bas de page' },
            { valeur: false, libelle: 'Sans les notes' },
          ]}
          poser={notes => setOptions(o => ({ ...o, notes }))}
        />

        {donnees.apparat && (
          <AxeOptions<boolean>
            rubrique="Apparat critique"
            valeur={options.apparat}
            choix={[
              { valeur: false, libelle: 'Sans l’apparat' },
              { valeur: true, libelle: 'En fin de volume' },
            ]}
            poser={apparat => setOptions(o => ({ ...o, apparat }))}
          />
        )}

        <AxeOptions<boolean>
          rubrique="Sommaire"
          valeur={options.sommaire}
          choix={[
            { valeur: true, libelle: 'Avec un sommaire' },
            { valeur: false, libelle: 'Sans sommaire' },
          ]}
          poser={sommaire => setOptions(o => ({ ...o, sommaire }))}
        />

        {long && (
          <p style={{ fontSize: '0.6875rem', lineHeight: 1.45, color: 'var(--cs-attente)', margin: '14px 0 0' }}>
            Cette œuvre est longue : l’extraction peut demander un moment.
          </p>
        )}
        {erreur && (
          <p role="alert" style={{ fontSize: '0.6875rem', lineHeight: 1.45, color: 'var(--cs-danger-fonce)', margin: '14px 0 0' }}>
            {erreur}
          </p>
        )}

        <button type="button" onClick={extraire} disabled={enCours}
          style={{ display: 'block', width: '100%', marginTop: '18px', padding: '9px 12px', borderRadius: '4px', border: 'none', background: enCours ? 'var(--cs-bord)' : 'var(--cs-vert-aplat)', color: 'var(--cs-surface)', fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.78125rem', fontWeight: 600, cursor: enCours ? 'progress' : 'pointer', transition: 'background 0.14s' }}>
          {enCours ? 'Préparation du document…' : 'Extraire en Word'}
        </button>
        <p style={{ fontSize: '0.625rem', lineHeight: 1.45, color: 'var(--cs-texte-gris)', margin: '10px 0 0', textAlign: 'center' }}>
          L’extraction est libre. Merci de citer Corpus Scriptura.
        </p>
      </div>
    </div>,
    document.body,
  )
}

/**
 * Le nom du fichier tel que la route le propose.
 *
 * ⚠️ Deux formes coexistent dans l'en-tête : `filename*` en UTF-8, `filename` en ASCII.
 * On lit la première, la seconde ayant perdu ses accents. À défaut, un nom de repli :
 * un téléchargement sans nom n'existe pas.
 */
function nomPropose(entete: string | null): string {
  const utf8 = entete?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (utf8) { try { return decodeURIComponent(utf8) } catch { /* en-tête abîmé */ } }
  return entete?.match(/filename="([^"]+)"/i)?.[1] ?? 'Corpus Scriptura.docx'
}
