'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import DOMPurify from 'dompurify'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { supabase } from '@/app/lib/supabase'
import { rendreSiecles } from '@/app/lib/siecles'
import { FriseAuteur } from '@/app/components/ModaleAuteur'
import { estUrl, type RangChrono } from '@/app/lib/frise'
import { ENCRE_TITRE, GRAISSE_TITRE_VOLET, TITRE_VOLET } from '@/app/lib/hierarchieTitres'
import { urlLectureBible, type ManiereDeLireBible } from '@/app/lib/bibleNavigation'
import { LABEL_VOLET, BTN_VOLET } from '@/app/lib/stylesVoletLecture'
import type { CibleLectureAlternative, GroupeLectureBible } from '@/app/lib/bibleModesAlternatifs'

// Encart d'informations sur la traduction actuellement lue (volet gauche, Bible
// classique). Taille FIXE (hauteur constante, contenu rogné) pour ne jamais faire
// bouger la mise en page. Données passées en prop (chargées côté serveur avec la
// session du visiteur), et lien « En savoir plus » sur le modèle de la page Œuvre.
// Petite fenêtre « À propos de cette traduction », sur le modèle de la page Œuvre.
// Constituée de toute pièce à partir de la fiche `traductions` (chargée à l'ouverture).
// Fiche de présentation — alimentée par la vue `v_traductions_page` (chargée par trad_id).
type InfoTradModale = {
  trad_id: string; nom: string | null; type_objet: string | null; auteur: string | null
  responsable_edition: string | null; dates: string | null; bio_courte: string | null
  date_publication: string | null; confession: string | null; langue: string | null
  commentaire_editorial: string | null; photo: string | null
  schema_numerotation: string | null
  edition_reference_affichee: string | null; edition_reference_url: string | null
  licence_traduction: string | null; mention_obligatoire: string | null
  statut_corpus_public: string | null; lacunes_publiques: string | null
  titre_edition: string | null; sous_titre_edition: string | null
  editeur: string | null; annee_edition: string | null; lieu_edition: string | null
  source_type: string | null; source_numerique_nom: string | null; source_numerique_url: string | null
  graphie: string | null; particularites: string | null; integrite_verifiee: boolean | null
}

// Intitulé juste selon le type d'objet (jamais la valeur technique brute).
function intituleTraduction(i: InfoTradModale): string | null {
  const a = i.auteur?.trim() || null
  if (i.type_objet === 'edition_critique') { const r = i.responsable_edition?.trim() || a; return r ? `Édition critique établie par ${r}` : null }
  if (i.type_objet === 'recension') return a ? `Recension de ${a}` : null
  if (i.type_objet === 'traduction') return a ? `Traduction de ${a}` : null
  return a
}

// Libellé lisible du schéma de numérotation stocké en base.
const NUMEROTATION_LABEL: Record<string, string> = {
  vulgate: 'Vulgate (latine)', hebreu: 'Hébraïque', grec: 'Grecque', septante: 'Septante (grecque)',
}

// Passe typographique française sur la prose éditoriale : espaces fines
// insécables (avant ; ! ? et à l'intérieur des guillemets), insécable avant
// « : », et siècles composés en petites capitales + exposant (XVIIᵉ siècle).
// Ordre important : on pose les espaces AVANT d'injecter les <span>/<sup>
// (dont le style contient des « : » qu'il ne faut pas toucher).
function formaterProse(html: string): string {
  const FINE = " ", INSEC = " "
  let s = html
    .replace(/[\s  ]*([;!?])/g, FINE + "$1")
    .replace(/[\s  ]*:/g, INSEC + ":")
    .replace(/«[\s  ]*/g, "«" + FINE)
    .replace(/[\s  ]*»/g, FINE + "»")
  // Siecles : petites capitales + exposant, uniquement devant « siecle ».
  s = s.replace(/\b([IVXLCDM]+)(er|re|es|e)\b(?=\s+siècles?\b)/g,
    (_m, rom, ord) => `<span style="font-variant:all-small-caps;letter-spacing:0.02em">${rom}</span><sup style="font-size:0.62em;line-height:0;vertical-align:baseline;position:relative;top:-0.5em">${ord}</sup>`)
  return s
}

// Ligne « étiquette · valeur » de la section technique. Composants purs, définis
// au niveau module (jamais recréés à chaque rendu — sinon React perd l'identité
// et l'état des sous-arbres).
const cleTech: React.CSSProperties = { flexShrink: 0, width: '8.5rem', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', lineHeight: 1.5, paddingTop: '1px' }
const LigneTech = ({ c, children }: { c: string; children: React.ReactNode }) => children ? (
  <div style={{ display: 'flex', gap: '12px', padding: '4px 0', borderTop: '1px solid var(--cs-fond)', alignItems: 'baseline' }}>
    <span style={cleTech}>{c}</span><span style={{ flex: 1, fontSize: '0.71875rem', color: 'var(--cs-texte)', lineHeight: 1.45 }}>{children}</span>
  </div>
) : null
const Consulter = ({ url, libelle }: { url: string | null; libelle: string }) => (url && estUrl(url))
  ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cs-vert)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{libelle}</a> : null

function ModaleTraduction({ code, nomFallback, onFermer }: { code: string; nomFallback: string; onFermer: () => void }) {
  const [info, setInfo] = useState<InfoTradModale | null>(null)
  const [chrono, setChrono] = useState<RangChrono[]>([])
  // « Contrôle en cours » (rubrique Vérification) déplie une note : statut du
  // corpus et lacunes connues, plutôt qu'un encart permanent en haut de fiche.
  const [verifNote, setVerifNote] = useState(false)
  useEffect(() => {
    let annule = false
    // Source unique : la vue de présentation, chargée par trad_id.
    supabase.from('v_traductions_page').select('*').eq('trad_id', code).maybeSingle()
      .then(({ data }) => { if (!annule) setInfo((data as InfoTradModale | null) ?? ({} as InfoTradModale)) })
    supabase.from('v_chronologie_traductions').select('*').eq('trad_id', code).order('ordre_affichage')
      .then(({ data }) => { if (!annule) setChrono((data ?? []) as unknown as RangChrono[]) })
    return () => { annule = true }
  }, [code])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFermer])
  if (typeof document === 'undefined') return null
  const SERIF = 'var(--font-source-serif), Georgia, serif'
  const i = info ?? ({} as InfoTradModale)

  // Numérotation de la Vulgate : jamais affichée (elle va de soi pour un texte
  // établi sur la Vulgate, et n'apporte rien au lecteur).
  const numerotation = (i.schema_numerotation && i.schema_numerotation !== 'vulgate')
    ? (NUMEROTATION_LABEL[i.schema_numerotation] ?? i.schema_numerotation) : null
  const intitule = intituleTraduction(i)
  const verif = i.integrite_verifiee == null ? null : (i.integrite_verifiee ? 'Texte vérifié' : 'Contrôle en cours')
  const licenceDP = (i.licence_traduction ?? '').toLowerCase().includes('domaine public')

  return createPortal(
    <div onClick={onFermer} style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', padding: '20px', overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ margin: 'auto', background: 'var(--cs-surface)', borderRadius: '8px', padding: '20px 26px 22px', width: '40rem', maxWidth: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>
        <style>{`
          .trad-notice h2 { font-family: ${SERIF}; font-size: 0.9375rem; font-weight: 600; color: var(--cs-encre); margin: 13px 0 3px; }
          .trad-notice h2:first-child { margin-top: 0; }
          .trad-notice p { font-size: 0.8125rem; line-height: 1.4; color: var(--cs-texte); margin: 0 0 8px; text-align: justify; }
          .trad-tech > summary { list-style: none; cursor: pointer; }
          .trad-tech > summary::-webkit-details-marker { display: none; }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: '#6f9268', margin: '0 0 5px', textTransform: 'uppercase' }}>À propos de cette traduction</p>
            <h1 style={{ fontFamily: SERIF, fontSize: TITRE_VOLET, color: ENCRE_TITRE, margin: 0, fontWeight: GRAISSE_TITRE_VOLET, lineHeight: 1.25 }}>{i.nom || nomFallback}</h1>
            {intitule && <p style={{ fontFamily: SERIF, fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', margin: '2px 0 0' }}>{rendreSiecles(intitule)}{i.dates ? ` (${i.dates})` : ''}</p>}
          </div>
          <button onClick={onFermer} aria-label="Fermer" style={{ fontSize: '1rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        {info === null ? (
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0 }}>Chargement…</p>
        ) : (
          <>
            {i.bio_courte && <p style={{ fontFamily: SERIF, fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 14px' }}>{rendreSiecles(i.bio_courte)}</p>}

            {/* 4. Notice éditoriale : HTML (h2/p) rendu tel quel, aux styles de la page. */}
            {i.commentaire_editorial && (
              <div className="trad-notice" style={{ borderTop: '1px solid var(--cs-fond-doux)', paddingTop: '13px', marginBottom: '16px' }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formaterProse(i.commentaire_editorial)) }} />
            )}

            {/* 5. Édition et état du texte : section secondaire, repliable (natif, accessible). */}
            <details className="trad-tech" style={{ borderTop: '1px solid var(--cs-fond-doux)', paddingTop: '12px', marginBottom: '16px' }}>
              <summary style={{ fontFamily: SERIF, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cs-texte-second)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span aria-hidden style={{ fontSize: '0.59375rem', color: 'var(--cs-texte-faible)' }}>▸</span>
                Édition et état du texte
              </summary>
              <div style={{ marginTop: '8px' }}>
                {/* Premières informations, déplacées ici depuis la tête de fiche. */}
                <LigneTech c="Première publication">{i.date_publication}</LigneTech>
                <LigneTech c="Confession">{i.confession}</LigneTech>
                <LigneTech c="Langue">{i.langue}</LigneTech>
                <LigneTech c="Titre de l’édition">{i.titre_edition ? <>{i.titre_edition}{i.sous_titre_edition ? <><br /><span style={{ fontStyle: 'italic', color: 'var(--cs-texte-gris)' }}>{i.sous_titre_edition}</span></> : null}</> : null}</LigneTech>
                {/* Année et lieu : deux lignes distinctes. */}
                <LigneTech c="Année">{i.annee_edition}</LigneTech>
                <LigneTech c="Lieu">{i.lieu_edition}</LigneTech>
                <LigneTech c="Éditeur">{i.editeur}</LigneTech>
                <LigneTech c="Responsable de l’édition">{i.responsable_edition}</LigneTech>
                {/* Édition de référence (imprimée) : sans lien « fac-similé », redondant
                    avec « Voir la source numérique » (même URL). */}
                <LigneTech c="Édition de référence">{i.edition_reference_affichee}</LigneTech>
                <LigneTech c="Source numérique">{i.source_numerique_nom ? <>{i.source_numerique_nom}{i.source_numerique_url ? <> · <Consulter url={i.source_numerique_url} libelle="Voir la source numérique" /></> : null}</> : (i.source_numerique_url ? <Consulter url={i.source_numerique_url} libelle="Voir la source numérique" /> : null)}</LigneTech>
                <LigneTech c="Graphie">{i.graphie}</LigneTech>
                <LigneTech c="Numérotation">{numerotation}</LigneTech>
                <LigneTech c="Particularités">{i.particularites}</LigneTech>
                <LigneTech c="Licence">{licenceDP ? 'Domaine public' : (i.licence_traduction || null)}</LigneTech>
                {i.mention_obligatoire && <LigneTech c="Mention obligatoire">{i.mention_obligatoire}</LigneTech>}
                {/* Vérification : « Contrôle en cours » se déplie en note (statut du
                    corpus + lacunes connues), au lieu d'un encart permanent. */}
                <LigneTech c="Vérification">{verif ? (
                  (i.statut_corpus_public || i.lacunes_publiques) ? (
                    <>
                      <button onClick={() => setVerifNote(o => !o)} aria-expanded={verifNote}
                        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--cs-texte)', textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: '2px', cursor: 'pointer' }}>{verif}</button>
                      {verifNote && (
                        <div style={{ margin: '5px 0 1px' }}>
                          {i.statut_corpus_public && <p style={{ margin: '0 0 3px', fontFamily: SERIF, fontSize: '0.6875rem', color: 'var(--cs-texte)', lineHeight: 1.45 }}>{i.statut_corpus_public}</p>}
                          {i.lacunes_publiques && <p style={{ margin: 0, fontFamily: SERIF, fontSize: '0.65625rem', fontStyle: 'italic', color: 'var(--cs-texte-gris)', lineHeight: 1.45 }}>{i.lacunes_publiques}</p>}
                        </div>
                      )}
                    </>
                  ) : verif
                ) : null}</LigneTech>
              </div>
            </details>

            {/* 6. Frise chronologique — le composant même des pages d'auteur. */}
            {chrono.length > 0 && (
              <div style={{ borderTop: '1px solid var(--cs-fond-doux)', paddingTop: '14px' }}>
                <h2 style={{ fontFamily: SERIF, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--cs-encre)', margin: '0 0 12px' }}>Chronologie</h2>
                <FriseAuteur evenements={chrono} sansLegende />
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}

function EncartTraduction({ trad }: { trad: Traduction }) {
  const [modaleOuverte, setModaleOuverte] = useState(false)
  return (
    <div style={{ flexShrink: 0, minHeight: '6.75rem', boxSizing: 'border-box', overflow: 'hidden', padding: '10px 10px 9px', borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--cs-etiquette)' }}>Traduction</span>
      {/* Auteur avec ses dates de vie complètes, puis la référence complète de l'édition
          présentée (ville, éditeur, date). La langue n'est pas indiquée ici. */}
      <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.22 }}>
        {trad.auteur || trad.label || '—'}
        {trad.auteurDates && <span style={{ fontWeight: 400, color: 'var(--cs-texte-gris)' }}> ({trad.auteurDates})</span>}
      </span>
      {/* Div BLOC volontaire : `-webkit-line-clamp` sur un enfant DIRECT du flex serait
          neutralisé (blockification). Certaines références sont très longues (Crampon),
          on les borne à deux lignes ; la fiche « En savoir plus » donne le détail. */}
      {trad.editionRef && (
        <div>
          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.65625rem', color: 'var(--cs-texte-second)', lineHeight: 1.3 }}>{trad.editionRef}</span>
        </div>
      )}
      <button onClick={() => setModaleOuverte(true)} style={{ marginTop: 'auto', paddingTop: '4px', fontSize: '0.59375rem', color: 'var(--cs-texte-faible)', textDecoration: 'underline', textUnderlineOffset: '2px', width: 'fit-content', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>En savoir plus sur cette traduction</button>
      {modaleOuverte && <ModaleTraduction code={trad.code} nomFallback={trad.label || ''} onFermer={() => setModaleOuverte(false)} />}
    </div>
  )
}

const NB_CHAPITRES: Record<string, number> = {
  GEN:50,EXO:40,LEV:27,NUM:36,DEU:34,JOS:24,JDG:21,RUT:4,
  '1SA':31,'2SA':24,'1KI':22,'2KI':25,'1CH':29,'2CH':36,
  EZR:10,NEH:13,EST:16,JOB:42,PSA:150,PRO:31,ECC:12,SNG:8,
  ISA:66,JER:52,LAM:5,EZK:48,DAN:14,HOS:14,JOL:3,AMO:9,
  OBA:1,JON:4,MIC:7,NAM:3,HAB:3,ZEP:3,HAG:2,ZEC:14,MAL:4,
  MAT:28,MRK:16,LUK:24,JHN:21,ACT:28,ROM:16,'1CO':16,'2CO':13,
  GAL:6,EPH:6,PHP:4,COL:4,'1TH':5,'2TH':3,'1TI':6,'2TI':4,
  TIT:3,PHM:1,HEB:13,JAS:5,'1PE':5,'2PE':3,'1JN':5,'2JN':1,
  '3JN':1,JUD:1,REV:22,
}

const ABREV_TO_CODE: Record<string, string> = {
  gn:'GEN',gen:'GEN',genese:'GEN',
  ex:'EXO',exo:'EXO',exode:'EXO',
  lv:'LEV',lev:'LEV',levitique:'LEV',
  nb:'NUM',num:'NUM',nombres:'NUM',
  dt:'DEU',deu:'DEU',deuteronome:'DEU',
  jos:'JOS',josue:'JOS',
  jg:'JDG',jdg:'JDG',juges:'JDG',
  rt:'RUT',rut:'RUT',ruth:'RUT',
  '1s':'1SA','1sa':'1SA','1samuel':'1SA',
  '2s':'2SA','2sa':'2SA','2samuel':'2SA',
  '1r':'1KI','1ki':'1KI','1rois':'1KI',
  '2r':'2KI','2ki':'2KI','2rois':'2KI',
  '1ch':'1CH','1chr':'1CH','1chroniques':'1CH',
  '2ch':'2CH','2chr':'2CH','2chroniques':'2CH',
  esd:'EZR',ezr:'EZR',esdras:'EZR',
  ne:'NEH',neh:'NEH',nehemie:'NEH',
  est:'EST',esther:'EST',
  jb:'JOB',job:'JOB',
  ps:'PSA',psa:'PSA',psaume:'PSA',psaumes:'PSA',
  pr:'PRO',pro:'PRO',proverbes:'PRO',
  qo:'ECC',ecc:'ECC',ecclesiaste:'ECC',
  ct:'SNG',sng:'SNG',cantique:'SNG',
  is:'ISA',isa:'ISA',isaie:'ISA',
  jr:'JER',jer:'JER',jeremie:'JER',
  lm:'LAM',lam:'LAM',lamentations:'LAM',
  ez:'EZK',ezk:'EZK',ezechiel:'EZK',
  dn:'DAN',dan:'DAN',daniel:'DAN',
  os:'HOS',hos:'HOS',osee:'HOS',
  jl:'JOL',jol:'JOL',joel:'JOL',
  am:'AMO',amo:'AMO',amos:'AMO',
  ab:'OBA',oba:'OBA',abdias:'OBA',
  jon:'JON',jonas:'JON',
  mi:'MIC',mic:'MIC',michee:'MIC',
  na:'NAM',nam:'NAM',nahum:'NAM',
  ha:'HAB',hab:'HAB',habacuc:'HAB',
  so:'ZEP',zep:'ZEP',sophonie:'ZEP',
  ag:'HAG',hag:'HAG',aggee:'HAG',
  za:'ZEC',zec:'ZEC',zacharie:'ZEC',
  ml:'MAL',mal:'MAL',malachie:'MAL',
  mt:'MAT',mat:'MAT',matthieu:'MAT',
  mc:'MRK',mrk:'MRK',marc:'MRK',
  lc:'LUK',luk:'LUK',luc:'LUK',
  jn:'JHN',jhn:'JHN',jean:'JHN',
  ac:'ACT',act:'ACT',actes:'ACT',
  rm:'ROM',rom:'ROM',romains:'ROM',
  '1co':'1CO','1cor':'1CO','1corinthiens':'1CO',
  '2co':'2CO','2cor':'2CO','2corinthiens':'2CO',
  ga:'GAL',gal:'GAL',galates:'GAL',
  ep:'EPH',eph:'EPH',ephesiens:'EPH',
  ph:'PHP',php:'PHP',philippiens:'PHP',
  col:'COL',colossiens:'COL',
  '1th':'1TH','1thess':'1TH','1thessaloniciens':'1TH',
  '2th':'2TH','2thess':'2TH','2thessaloniciens':'2TH',
  '1tm':'1TI','1ti':'1TI','1timothee':'1TI',
  '2tm':'2TI','2ti':'2TI','2timothee':'2TI',
  tt:'TIT',tit:'TIT',tite:'TIT',
  phm:'PHM',philemon:'PHM',
  he:'HEB',heb:'HEB',hebreux:'HEB',
  jc:'JAS',jas:'JAS',jacques:'JAS',
  '1p':'1PE','1pe':'1PE','1pierre':'1PE',
  '2p':'2PE','2pe':'2PE','2pierre':'2PE',
  '1jn':'1JN','1jean':'1JN',
  '2jn':'2JN','2jean':'2JN',
  '3jn':'3JN','3jean':'3JN',
  jude:'JUD',jud:'JUD',
  ap:'REV',rev:'REV',apocalypse:'REV',
}

type Livre = { code: string; nom: string; testament: string }
type Traduction = { code: string; label: string; auteur?: string | null; auteurDates?: string | null; editionRef?: string | null; datePublication?: string | null; confession?: string | null; langue?: string | null }

type Props = {
  livres: Livre[]
  livreActif: string
  chapitreActif: number
  traductionIndex: number
  setTraductionIndex: (i: number) => void
  traductions: Traduction[]
  panelWidth?: number | null
  onWidthChange?: (w: number) => void
  livresVides?: Set<string>
  // La Polyglotte affiche un livre ENTIER, sans notion de chapitre courant, et ne navigue pas
  // par URL. Ces deux réglages lui suffisent pour réutiliser le même volet que la page Bible :
  // c'est la seule façon d'avoir vraiment la même navigation aux deux endroits, plutôt que
  // deux composants qui se ressemblent et divergent avec le temps.
  onChoisirLivre?: (code: string) => void   // si fourni, remplace la navigation par URL
  sansChapitres?: boolean                   // masque la grille des chapitres
  titre?: string                            // libellé du volet replié
  // Polyglotte : navigation par chapitre/verset SANS quitter la page (pas de router.push).
  // `onChoisirChapitre` remplace le saut d'URL au clic d'un chapitre ; `onChoisirLivreEntier`
  // charge le livre complet ; `onChoisirVerset` cible un verset (barre de recherche « Gn 1 1 »).
  onChoisirChapitre?: (code: string, chapitre: number) => void
  onChoisirLivreEntier?: (code: string) => void
  onChoisirVerset?: (code: string, chapitre: number, verset: number) => void
  entierActif?: boolean                     // le livre actif est-il montré EN ENTIER (bouton allumé)
  mobile?: boolean                          // empilé pleine largeur (téléphone/tablette)
  // Mobile : accordéon des trois volets piloté par le parent (un seul ouvert à la fois).
  voletMobile?: 'livres' | 'commentaires' | null
  setVoletMobile?: (v: 'livres' | 'commentaires' | null) => void
  barreMobile?: boolean                     // afficher la barre fixe mobile (false : sans barre)
  presentation?: 'drawer' | 'inline'        // mobile : tiroir superposé, ou page pleine (onglets)
  sansReduire?: boolean                     // masque la flèche « Réduire » (Polyglotte gère le repli du volet entier)
  // Le volet navigue par URL : sans ce report, changer de chapitre ferait sortir
  // le lecteur de la manière dont il lisait (lecture en regard, graphie, texte nu)
  // sans qu'il l'ait demandé. On reporte le bloc entier, jamais réglage par réglage.
  maniereDeLire?: ManiereDeLireBible
  // Menu OCCASIONNEL des manières de lire (graphie, texte nu, lecture en regard),
  // composé par le parent à partir des DONNÉES. Vide, il ne paraît pas.
  modesLecture?: GroupeLectureBible[]
  onChoisirModeLecture?: (cible: CibleLectureAlternative) => void
}

/**
 * Parse "ex 20 20", "ex 20, 20", "Exode 20:20", "1Co 3 1"…
 * Retourne { code, chapitre, verset } ou null.
 */
function parseRefBiblique(saisie: string): { code: string; chapitre: number; verset: number } | null {
  const norm = saisie.trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[,.:;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extraire les deux derniers nombres
  const m = norm.match(/^(.+?)\s+(\d{1,3})\s+(\d{1,3})$/)
  if (!m) return null

  const livreRaw = m[1].replace(/\s+/g, '')
  const chapitre = parseInt(m[2])
  const verset   = parseInt(m[3])
  const code     = ABREV_TO_CODE[livreRaw]
  if (!code || chapitre < 1 || verset < 1) return null

  return { code, chapitre, verset }
}

export default function NavLivres({
  livres, livreActif, chapitreActif,
  traductionIndex, setTraductionIndex, traductions,
  panelWidth = null, onWidthChange,
  livresVides, onChoisirLivre, sansChapitres, titre,
  onChoisirChapitre, onChoisirLivreEntier, onChoisirVerset, entierActif,
  mobile = false, voletMobile = null, setVoletMobile, barreMobile = true, presentation = 'drawer',
  sansReduire = false, maniereDeLire,
  modesLecture = [], onChoisirModeLecture,
}: Props) {
  const [recherche, setRecherche] = useState('')
  const [livreActifLocal, setLivreActifLocal] = useState(livreActif)
  const [chapitreActifLocal, setChapitreActifLocal] = useState(chapitreActif)
  // Réalignement sur la propriété PENDANT le rendu, et non dans un effet : React
  // réexécute le composant immédiatement, au lieu de peindre l'ancienne valeur puis
  // la nouvelle. C'est le motif « ajuster l'état pendant le rendu » de la doc React.
  const [livreRecu, setLivreRecu] = useState(livreActif)
  if (livreRecu !== livreActif) { setLivreRecu(livreActif); setLivreActifLocal(livreActif) }
  const [chapitreRecu, setChapitreRecu] = useState(chapitreActif)
  if (chapitreRecu !== chapitreActif) { setChapitreRecu(chapitreActif); setChapitreActifLocal(chapitreActif) }
  const [livreOuvert, setLivreOuvert] = useState<string | null>(livreActif)
  const polyMode = !!onChoisirChapitre
  const [atOuvert, setAtOuvert] = useState(true)
  const [ntOuvert, setNtOuvert] = useState(true)
  // Les écrits non canoniques restent repliés par défaut : ils sont là pour qui les cherche,
  // sans allonger la liste de ceux qui ne les consultent pas.
  const [autresOuvert, setAutresOuvert] = useState(false)
  const [ouvertLocal, setOuvertLocal] = useState(true)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 900) setOuvertLocal(false)
  }, [])
  // Sur mobile, l'ouverture est pilotée par le parent (accordéon : un seul volet
  // ouvert à la fois). Sur desktop, état local du volet.
  const ouvert = mobile ? voletMobile === 'livres' : ouvertLocal
  const setOuvert = (v: boolean) => { if (mobile) setVoletMobile?.(v ? 'livres' : null); else setOuvertLocal(v) }
  const scrollRef = useRef<HTMLDivElement>(null)
  const refPanel = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const tradCode = traductions[traductionIndex]?.code ?? 'TR0001'
  const refParsee = parseRefBiblique(recherche)

  // Si ref parsée : filtrer ne fait rien (on affiche tout pour voir le livre suggéré)
  // Recherche par D\u00c9BUT DE MOT, non par sous-cha\u00eene : \u00ab Ps \u00bb trouve \u00ab Psaumes \u00bb (un mot
  // qui commence par Ps), jamais \u00ab Apocalypse \u00bb (ps au milieu). On teste chaque mot du nom,
  // les mots \u00e9tant coup\u00e9s aux espaces, apostrophes et traits d'union.
  const filtrer = (liste: Livre[]) => {
    if (!recherche.trim() || refParsee) return liste
    const q = recherche.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    return liste.filter(l => l.nom.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .split(/[\s'\u2019-]+/)
      .some(mot => mot.startsWith(q)))
  }

  const AT = filtrer(livres.filter(l => l.testament === 'AT'))
  const NT = filtrer(livres.filter(l => l.testament === 'NT'))
  const AUTRES = filtrer(livres.filter(l => l.testament === 'AUTRES'))

  const handleLivre = (code: string) => {
    if (livresVides?.has(code)) return
    const pos = scrollRef.current?.scrollTop || 0
    setLivreActifLocal(code)
    if (onChoisirLivre) { onChoisirLivre(code); setLivreOuvert(code) }
    else if (livreOuvert === code) {
      setLivreOuvert(null)
    } else {
      setLivreOuvert(code)
      router.push(urlLectureBible({ ...maniereDeLire, livre: code, chapitre: 1, trad: tradCode }))
    }
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = pos
    })
  }

  const handleChapitre = (code: string, ch: number) => {
    setLivreActifLocal(code)
    setChapitreActifLocal(ch)
    // Empilé (mobile) : une fois le chapitre choisi, on replie la nav pour
    // rendre le texte tout de suite visible sous elle.
    if (mobile) setOuvert(false)
    // Polyglotte : on reste sur place et l'on demande le chapitre au parent.
    if (onChoisirChapitre) { onChoisirChapitre(code, ch); return }
    router.push(urlLectureBible({ ...maniereDeLire, livre: code, chapitre: ch, trad: tradCode }))
  }

  // Navigation vers ref parsée :
  // 1. Ouvre le livre dans le nav (déplie les chapitres)
  // 2. Navigue vers le chapitre avec le verset ciblé dans l'URL (?verset=N)
  //    TexteBible scrollera jusqu'à lui et l'affichera en surbrillance
  const appliquerRefParsee = () => {
    if (!refParsee) return
    setLivreOuvert(refParsee.code)
    setLivreActifLocal(refParsee.code)
    setChapitreActifLocal(refParsee.chapitre)
    setRecherche('')
    // Polyglotte : cibler le verset sur place, sans changer de page.
    if (onChoisirVerset) { onChoisirVerset(refParsee.code, refParsee.chapitre, refParsee.verset); return }
    // La lecture en regard tombe d'elle-même (`urlLectureBible`) : viser un verset
    // précis suppose de pouvoir le désigner, ce que les deux colonnes ne font pas. Le
    // lecteur retrouve donc la colonne unique, qui sait mettre le verset en évidence.
    router.push(urlLectureBible({ ...maniereDeLire, livre: refParsee.code, chapitre: refParsee.chapitre, trad: tradCode, verset: refParsee.verset }))
  }

  const renderLivre = (livre: Livre) => {
    const ouvert = livreOuvert === livre.code
    const actif  = livreActifLocal === livre.code
    const suggere = refParsee?.code === livre.code
    const vide = livresVides?.has(livre.code) ?? false
    const nb = NB_CHAPITRES[livre.code] || 1

    // Les options (chapitres + « Livre entier ») ne se déplient qu'au CLIC sur le nom du
    // livre — jamais au simple survol.
    const montrerOptions = !vide && !sansChapitres && (ouvert || suggere)
    // « Livre entier » allumé : le livre actif est montré en entier (mêmes couleurs que la
    // case de chapitre sélectionnée).
    const entierSel = polyMode && actif && !!entierActif

    return (
      <div key={livre.code}>
        <button onClick={() => handleLivre(livre.code)} style={{
          width: '100%', textAlign: 'left',
          padding: '2px 6px', borderRadius: '4px', fontSize: '0.84375rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: suggere ? 'rgba(var(--cs-vert-rgb),0.12)' : actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'transparent',
          color: vide ? 'var(--cs-texte-faible)' : actif || suggere ? 'var(--cs-encre)' : 'var(--cs-texte-second)',
          fontWeight: actif || suggere ? 600 : 400,
          border: suggere ? '1px solid rgba(var(--cs-vert-rgb),0.30)' : '1px solid transparent',
          cursor: 'pointer', lineHeight: 1.4, boxSizing: 'border-box',
          opacity: vide ? 0.55 : 1,
        }}>
          <span>{livre.nom}</span>
          {!vide && !sansChapitres && <span style={{ color: '#a9b6a6', fontSize: '0.5rem', flexShrink: 0, opacity: 0.55 }}>{ouvert ? '▲' : '▼'}</span>}
        </button>

        {montrerOptions && polyMode && onChoisirLivreEntier && (
          <div style={{ padding: '3px 6px 0' }}>
            {/* Mêmes couleurs que les cases de chapitre : allumé = vert plein, éteint = gris léger. */}
            <button onClick={() => { setLivreActifLocal(livre.code); onChoisirLivreEntier(livre.code) }}
              style={{
                width: '100%', fontSize: '0.75rem', height: '1.5rem', padding: '0 6px', borderRadius: '4px',
                border: 'none', cursor: 'pointer', textAlign: 'center', letterSpacing: '0.02em',
                background: entierSel ? 'var(--cs-vert-aplat)' : 'var(--cs-fond-doux)',
                color: entierSel ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)',
                fontWeight: entierSel ? 600 : 400, lineHeight: 1,
              }}>
              Livre entier
            </button>
          </div>
        )}

        {montrerOptions && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(1.45rem, 1fr))',
            gap: '2px', padding: '2px 6px 6px 6px', boxSizing: 'border-box',
          }}>
            {Array.from({ length: nb }, (_, i) => i + 1).map(ch => {
              const estChapSuggere = suggere && refParsee?.chapitre === ch
              return (
                <button key={ch} onClick={() => {
                  if (suggere && refParsee?.chapitre === ch) {
                    appliquerRefParsee()
                  } else {
                    handleChapitre(livre.code, ch)
                  }
                }} style={{
                  fontSize: '0.6875rem', height: '1.45rem', borderRadius: '4px',
                  border: estChapSuggere ? '1px solid var(--cs-vert)' : 'none',
                  cursor: 'pointer', padding: 0,
                  /* Cases plus petites, gris léger au repos (le vert reste l'accent du
                     chapitre courant et de la suggestion de recherche). */
                  background: (actif && chapitreActifLocal === ch) ? 'var(--cs-vert-aplat)'
                    : estChapSuggere ? 'rgba(var(--cs-vert-rgb),0.15)' : 'var(--cs-fond-doux)',
                  color: (actif && chapitreActifLocal === ch) ? 'var(--cs-sur-aplat)'
                    : estChapSuggere ? 'var(--cs-encre)' : 'var(--cs-texte-second)',
                  fontWeight: estChapSuggere ? 700 : 400,
                  lineHeight: 1, textAlign: 'center',
                }}>
                  {ch}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  if (!ouvert) {
    // Empilé (mobile) : une barre horizontale pleine largeur, et non le rail
    // vertical du desktop — on est en haut de la pile, pas sur un côté.
    if (mobile) {
      // En mode swipe (barreMobile=false), pas de barre fixe : le tiroir s'ouvre
      // par glissement (géré dans BibleLayout) ou via l'indice en haut de l'écran.
      if (!barreMobile) return null
      // Barre TOUJOURS visible, fixée juste sous la navbar. Fermée par défaut ;
      // au tap, elle ouvre le tiroir des livres (branche dépliée ci-dessous).
      return (
        <button onClick={() => setOuvert(true)} title="Ouvrir le sommaire des livres"
          style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 1200, width: '100%', background: 'var(--cs-fond-clair)', border: 'none', borderBottom: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: 'rotate(90deg)', color: 'var(--cs-texte-doux)' }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>{titre ?? 'Livres de la Bible'}</span>
        </button>
      )
    }
    return (
      <button onClick={() => setOuvert(true)} title="Ouvrir le sommaire des livres"
        style={{ width: '22px', flexShrink: 0, background: 'var(--cs-fond-clair)', border: 'none', borderRight: '1px solid var(--cs-bord)', cursor: 'pointer', color: 'var(--cs-texte-doux)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ writingMode: 'vertical-rl' as any, transform: 'rotate(180deg)', fontSize: '0.625rem', letterSpacing: '0.13em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-faible)' }}>{titre ?? 'Livres de la Bible'}</span>
      </button>
    )
  }

  const handleDrag = onWidthChange ? (e: React.MouseEvent) => {
    e.preventDefault()
    const startW = panelWidth ?? refPanel.current?.getBoundingClientRect().width ?? 220
    const startX = e.clientX
    const onMove = (ev: MouseEvent) => onWidthChange(Math.max(120, Math.min(400, startW + ev.clientX - startX)))
    const onUp = () => document.removeEventListener('mousemove', onMove)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp, { once: true })
  } : undefined

  return (
    <>
    {/* Empilé (mobile) : en mode ONGLETS (presentation='inline'), le sommaire occupe
        toute la page sous la barre d'onglets, sans fond assombri. En mode tiroir, il
        se superpose au texte avec un fond assombri qui le referme au tap. */}
    {mobile && presentation !== 'inline' && <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
    <div ref={refPanel} style={mobile ? (presentation === 'inline' ? {
      width: '100%', background: 'var(--cs-fond-clair)', display: 'flex', flexDirection: 'column',
      paddingTop: '2.875rem', minHeight: `calc(100dvh - ${HAUTEUR_NAVBAR})`,
      paddingBottom: `calc(0.75rem + 2.5rem)`,
    } : {
      position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 2401,
      background: 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-bord)',
      display: 'flex', flexDirection: 'column', maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`,
      boxShadow: 'var(--cs-ombre-modale)',
    }) : {
      width: panelWidth == null ? 'clamp(200px, 14vw, 320px)' : panelWidth + 'px', flexShrink: 0, background: 'var(--cs-fond-clair)',
      borderRight: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', height: '100%',
      position: 'relative',
    }}>
      {!mobile && handleDrag && (
        <div onMouseDown={handleDrag} title="Glisser pour redimensionner"
          style={{ position: 'absolute', right: '-4px', top: 0, bottom: 0, width: '9px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10, background: 'transparent', transition: 'background 0.14s, box-shadow 0.14s' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(198,184,158,0.08)'
            e.currentTarget.style.boxShadow = 'inset -1px 0 rgba(122,96,64,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      )}
      {/* Encart traduction (Bible classique, desktop) — au-dessus de la recherche. */}
      {!polyMode && !sansChapitres && !mobile && traductions[traductionIndex] && <EncartTraduction trad={traductions[traductionIndex]} />}

      {/* Menu OCCASIONNEL des manières de lire — entre la fiche de la traduction et la
          recherche des livres. Il ne paraît que lorsque le témoin qu'on lit offre
          vraiment un choix : plusieurs graphies, un appareil éditorial qu'on peut
          écarter, un second membre à mettre en regard. Une bible ordinaire n'en a
          aucun, et le volet reste alors ce qu'il était.

          Même forme que les menus de la page Œuvre (`stylesVoletLecture`) : c'est le
          même geste — choisir comment on lit ce qu'on a sous les yeux — et il ne doit
          pas se présenter de deux façons selon la page. Il vaut aussi sur mobile, où
          il est la seule voie pour sortir d'une lecture en regard : c'est une
          navigation, non un ornement. */}
      {modesLecture.length > 0 && (
        <div style={{ flexShrink: 0, padding: '9px 10px 10px', borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)' }}>
          {modesLecture.map((groupe, rang) => (
            <div key={groupe.cle} style={rang > 0 ? { marginTop: '7px' } : undefined}>
              <span style={LABEL_VOLET}>{groupe.titre}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                {groupe.choix.map(choix => (
                  <button key={choix.cle} type="button" title={choix.description}
                    aria-pressed={choix.actif}
                    onClick={() => { if (!choix.actif) onChoisirModeLecture?.(choix.cible) }}
                    style={{ ...BTN_VOLET(choix.actif), cursor: choix.actif ? 'default' : 'pointer' }}>
                    {choix.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Barre de recherche. Elle ne défile JAMAIS : elle est hors du conteneur défilant,
          et `flexShrink: 0` l'empêche d'être comprimée quand la liste des livres est longue. */}
      <div style={{ flexShrink: 0, padding: '8px 8px 6px', borderBottom: '1px solid var(--cs-bord)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          type="text"
          placeholder="Rechercher un livre biblique"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && refParsee) appliquerRefParsee() }}
          style={{ flex: 1, minWidth: 0, fontSize: '0.8125rem', padding: '4px 7px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-doux)', color: 'var(--cs-texte)', outline: 'none', boxSizing: 'border-box' }}
        />
        {/* Flèche « réduire » inutile en mode onglets (mobile) : les onglets en haut
            font office de navigation. Conservée pour le repli desktop, sauf quand le
            parent gère lui-même le repli du volet entier (Polyglotte : `sansReduire`). */}
        {presentation !== 'inline' && !sansReduire && (
          <button onClick={() => setOuvert(false)} title="Réduire le volet"
            style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Suggestion de ref parsée — remplace toute la liste tant qu'une référence est reconnue */}
      {refParsee && (
        <div style={{ padding: '8px' }}>
          <button onClick={appliquerRefParsee} style={{
            width: '100%', textAlign: 'left',
            fontSize: '0.84375rem', padding: '8px 9px', borderRadius: '4px',
            background: 'rgba(var(--cs-vert-rgb),0.10)', border: '1px solid rgba(var(--cs-vert-rgb),0.25)',
            color: 'var(--cs-encre)', cursor: 'pointer', lineHeight: 1.5, boxSizing: 'border-box',
          }}>
            ↳ {livres.find(l => l.code === refParsee.code)?.nom ?? refParsee.code}
            {' · ch.'} {refParsee.chapitre} · v. {refParsee.verset}
          </button>
        </div>
      )}

      {/* Liste des livres — masquée tant qu'une référence est reconnue */}
      {/* `minHeight: 0` ci-dessous est indispensable, pas décoratif : un élément flex refuse
          par défaut de devenir plus petit que son contenu, si bien que `overflowY: auto` ne
          s'enclenchait jamais. Le volet s'allongeait à la hauteur des soixante-treize livres
          et emportait la barre de recherche hors de l'écran dès qu'on descendait. */}
      {!refParsee && (
      <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '4px 2px' }}>
        {AT.length > 0 && (
          <>
            <button onClick={() => setAtOuvert(!atOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '5px 6px 2px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: 'var(--cs-vert-fonce)', textTransform: 'uppercase' }}>Ancien Testament</span>
              <span style={{ fontSize: '0.53125rem', color: 'var(--cs-texte-faible)' }}>{atOuvert ? '▲' : '▼'}</span>
            </button>
            {atOuvert && AT.map(renderLivre)}
          </>
        )}

        {NT.length > 0 && (
          <>
            <button onClick={() => setNtOuvert(!ntOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '7px 6px 2px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: 'var(--cs-vert-fonce)', textTransform: 'uppercase' }}>Nouveau Testament</span>
              <span style={{ fontSize: '0.53125rem', color: 'var(--cs-texte-faible)' }}>{ntOuvert ? '▲' : '▼'}</span>
            </button>
            {ntOuvert && NT.map(renderLivre)}
          </>
        )}

        {AUTRES.length > 0 && (
          <>
            <button onClick={() => setAutresOuvert(!autresOuvert)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              padding: '7px 6px 2px', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', color: '#7a6f5e', textTransform: 'uppercase' }}>Écrits non canoniques</span>
              <span style={{ fontSize: '0.53125rem', color: 'var(--cs-texte-faible)' }}>{autresOuvert ? '▲' : '▼'}</span>
            </button>
            {autresOuvert && AUTRES.map(renderLivre)}
          </>
        )}

        {AT.length === 0 && NT.length === 0 && AUTRES.length === 0 && (
          <p style={{ fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', textAlign: 'center', padding: '16px 0' }}>Aucun résultat</p>
        )}
      </div>
      )}
    </div>
    </>
  )
}
