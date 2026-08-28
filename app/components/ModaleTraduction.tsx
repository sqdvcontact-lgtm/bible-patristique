'use client'

// ── Fiche « À propos de cette traduction » ─────────────────────────────────────
//
// La fenêtre s'ouvre depuis l'encart « Traduction » du volet de lecture de la Bible
// (`NavLivres`). Elle est composée sur le modèle de la FICHE D'AUTEUR
// (`app/components/ModaleAuteur`), dont elle reprend le cadre, l'en-tête (portrait
// à gauche, nom et repères à droite), les titres de section et les deux colonnes :
// à gauche ce qui se lit, à droite ce qui le documente. Les deux fiches disent la
// même chose d'objets voisins ; elles ne gagnaient rien à se présenter chacune à sa
// façon, et celle-ci était restée une liste d'étiquettes.
//
// Sources : `v_traductions_page` (par `trad_id`), `v_chronologie_traductions`, et,
// pour une édition illustrée, `bible_edition_members` → `v_bible_edition_assets`.
//
// ⚠️ Le CONTENU est séparé de la fenêtre, comme dans la fiche d'auteur : `createPortal`
// n'existe pas au rendu serveur, et une planche de contrôle hors session ne pourrait
// pas rendre la fiche si tout tenait dans un seul composant.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import DOMPurify from 'dompurify'
import { supabase } from '@/app/lib/supabase'
import { rendreSiecles } from '@/app/lib/siecles'
import { FriseAuteur, TitreSection, LigneTech, Consulter } from '@/app/components/ModaleAuteur'
import { type RangChrono } from '@/app/lib/frise'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import {
  portraitTraduction, styleImagePortrait, type PositionsPhotoTraduction,
} from '@/app/lib/portraitTraduction'

const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

// La fiche s'ouvre au-dessus de la page de lecture ; la gravure agrandie s'ouvre
// au-dessus de la fiche, et rien ne s'intercale entre les deux.
const Z_FICHE = 1200
const Z_PLANCHE = 1201

/** Fiche de présentation — la vue porte déjà l'édition source jointe. */
export type InfoTrad = {
  trad_id: string; nom: string | null; type_objet: string | null; auteur: string | null
  responsable_edition: string | null; dates: string | null; bio_courte: string | null
  date_publication: string | null; confession: string | null; langue: string | null
  commentaire_editorial: string | null
  photo: string | null; photo_encart: string | null; photo_position: PositionsPhotoTraduction
  schema_numerotation: string | null
  edition_reference_affichee: string | null; edition_reference_url: string | null
  licence_traduction: string | null; mention_obligatoire: string | null
  statut_corpus_public: string | null; lacunes_publiques: string | null
  titre_edition: string | null; sous_titre_edition: string | null
  editeur: string | null; annee_edition: string | null; lieu_edition: string | null
  source_type: string | null; source_numerique_nom: string | null; source_numerique_url: string | null
  graphie: string | null; particularites: string | null; integrite_verifiee: boolean | null
}

/** Une gravure de l'édition, telle que la sert `v_bible_edition_assets`. */
export type Gravure = {
  asset_key: string
  public_uri: string | null
  alt_text: string | null
  printed_caption: string | null
  editorial_caption: string | null
}

/** Combien de gravures la fiche montre. Les autres se lisent à leur place, dans le texte. */
const GRAVURES_MONTREES = 6

/** La légende d'une gravure, dans l'ordre qu'emploie déjà la page de lecture :
 *  la description éditoriale s'il y en a une, sinon la légende imprimée. */
const legendeGravure = (g: Gravure) => g.editorial_caption ?? g.printed_caption

/** Un échantillon RÉGULIER d'une suite, premier et dernier compris.
 *
 *  ⛔ Pas les six premières : les gravures sont rangées dans l'ordre du livre, et
 *  les six premières d'une bible entière ne montreraient que la Genèse. Un pas
 *  constant fait voir l'étendue de l'édition. */
export function echantillonRegulier<T>(tout: readonly T[], combien: number): T[] {
  if (combien <= 0) return []
  if (tout.length <= combien) return [...tout]
  if (combien === 1) return [tout[0]]
  const pas = (tout.length - 1) / (combien - 1)
  return Array.from({ length: combien }, (_, i) => tout[Math.round(i * pas)])
}

/** Intitulé juste selon le type d'objet (jamais la valeur technique brute). */
function intituleTraduction(i: InfoTrad): string | null {
  const a = i.auteur?.trim() || null
  if (i.type_objet === 'edition_critique') { const r = i.responsable_edition?.trim() || a; return r ? `Édition critique établie par ${r}` : null }
  if (i.type_objet === 'recension') return a ? `Recension de ${a}` : null
  if (i.type_objet === 'traduction') return a ? `Traduction de ${a}` : null
  return a
}

/** Libellé lisible du schéma de numérotation stocké en base. */
const NUMEROTATION_LABEL: Record<string, string> = {
  vulgate: 'Vulgate (latine)', hebreu: 'Hébraïque', grec: 'Grecque', septante: 'Septante (grecque)',
}

// Passe typographique française sur la prose éditoriale : espaces fines
// insécables (avant ; ! ? et à l'intérieur des guillemets), insécable avant
// « : », et siècles composés en petites capitales + exposant (XVIIᵉ siècle).
// Ordre important : on pose les espaces AVANT d'injecter les <span>/<sup>
// (dont le style contient des « : » qu'il ne faut pas toucher).
function formaterProse(html: string): string {
  const FINE = " ", INSEC = " "
  let s = html
    .replace(/[\s  ]*([;!?])/g, FINE + "$1")
    .replace(/[\s  ]*:/g, INSEC + ":")
    .replace(/«[\s  ]*/g, "«" + FINE)
    .replace(/[\s  ]*»/g, FINE + "»")
  // Siecles : petites capitales + exposant, uniquement devant « siecle ».
  s = s.replace(/\b([IVXLCDM]+)(er|re|es|e)\b(?=\s+siècles?\b)/g,
    (_m, rom, ord) => `<span style="font-variant:all-small-caps;letter-spacing:0.02em">${rom}</span><sup style="font-size:0.62em;line-height:0;vertical-align:baseline;position:relative;top:-0.5em">${ord}</sup>`)
  return s
}

// ⚠️ La rangée « étiquette · valeur » et le lien de consultation vivent désormais
// dans `ModaleAuteur`, avec le portrait et le titre de section : les trois fiches
// (auteur, traduction, édition) les partagent, et trois copies d'un même cadre
// finissent toujours par diverger.

const STYLES_FICHE = `
  .trad-notice h2 { font-family: ${SERIF}; font-style: italic; font-weight: normal; font-size: 0.84375rem; color: var(--cs-vert); margin: 15px 0 5px; }
  .trad-notice h2:first-child { margin-top: 0; }
  .trad-notice p { font-family: ${SANS}; font-size: 0.75rem; line-height: 1.5; color: var(--cs-texte); text-align: justify; hyphens: auto; margin: 0 0 8px; }
  .trad-notice p:last-child { margin-bottom: 0; }
  /* Les notices portent cinq balises et cinq seulement : h2, p, em, ul, li.
     Sans règle, une bibliographie retombait sur la composition du navigateur,
     donc plus grosse que la prose qu'elle accompagne. ⛔ Pas de justification
     ici : une référence tient sur deux lignes courtes, que la justification
     étirerait. */
  .trad-notice ul { margin: 0 0 8px; padding-left: 1.05rem; }
  .trad-notice li { font-family: ${SANS}; font-size: 0.75rem; line-height: 1.5; color: var(--cs-texte); margin: 0 0 5px; }
  .trad-notice li::marker { color: var(--cs-texte-faible); }
  .trad-notice li:last-child { margin-bottom: 0; }
  .trad-tech > summary { list-style: none; cursor: pointer; display: flex; align-items: baseline; gap: 7px; }
  .trad-tech > summary::-webkit-details-marker { display: none; }
  .trad-tech-fleche { display: inline-block; transition: transform 0.15s; }
  .trad-tech[open] .trad-tech-fleche { transform: rotate(90deg); }
  .trad-gravure { transition: box-shadow 0.15s, border-color 0.15s; }
  .trad-gravure:hover { border-color: var(--cs-or-doux); box-shadow: var(--cs-ombre-nette); }
`

/**
 * Le contenu de la fiche : en-tête, deux colonnes, section repliable.
 * Les données lui arrivent chargées ; `info` à `null` vaut « on charge encore ».
 */
export function ContenuFicheTraduction({ info, chrono, gravures, nomFallback, onAgrandir }: {
  info: InfoTrad | null
  chrono: RangChrono[]
  gravures: Gravure[]
  nomFallback: string
  onAgrandir: (g: Gravure) => void
}) {
  // « Contrôle en cours » (rubrique Vérification) déplie une note : statut du
  // corpus et lacunes connues, plutôt qu'un encart permanent en haut de fiche.
  const [verifNote, setVerifNote] = useState(false)
  // ⚠️ On retient l'ADRESSE de l'image qui a manqué, et non un booléen remis à
  // vrai depuis un effet : la règle des hooks refuse un `setState` synchrone dans
  // un effet, et la fiche peut changer de traduction sans être remontée.
  const [portraitCasse, setPortraitCasse] = useState<string | null>(null)

  const i = info ?? ({} as InfoTrad)

  // Numérotation de la Vulgate : jamais affichée (elle va de soi pour un texte
  // établi sur la Vulgate, et n'apporte rien au lecteur).
  const numerotation = (i.schema_numerotation && i.schema_numerotation !== 'vulgate')
    ? (NUMEROTATION_LABEL[i.schema_numerotation] ?? i.schema_numerotation) : null
  const intitule = intituleTraduction(i)
  const verif = i.integrite_verifiee == null ? null : (i.integrite_verifiee ? 'Texte vérifié' : 'Contrôle en cours')
  const licenceDP = (i.licence_traduction ?? '').toLowerCase().includes('domaine public')
  const portrait = portraitTraduction(i)
  // Les repères de la traduction sur une seule ligne d'étiquettes, comme les dates,
  // la langue et les traditions d'un auteur.
  const reperes = [i.langue, i.confession, i.date_publication].filter(Boolean).join(' · ')

  const montrees = echantillonRegulier(gravures, GRAVURES_MONTREES)
  const aChrono = chrono.length > 0
  const aGravures = montrees.length > 0
  // Deux colonnes seulement s'il y a de quoi remplir les deux. Une notice seule
  // prend toute la mesure plutôt que de laisser une colonne vide à côté d'elle.
  const aColonnes = !!(i.bio_courte || i.commentaire_editorial) && (aChrono || aGravures)

  const colonneDroite = (
    <>
      {aChrono && (
        <section>
          <TitreSection>Chronologie</TitreSection>
          <FriseAuteur evenements={chrono} sansLegende />
        </section>
      )}
      {aGravures && (
        <section>
          <TitreSection>Gravures</TitreSection>
          {/* Deux par rang, chacune dans son passe-partout : le cadre du portrait,
              en plus petit. `contain` et non `cover` — une planche gravée se
              regarde entière, et leurs formats vont du carré au double folio. */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
            {montrees.map(g => (
              <button key={g.asset_key} type="button" className="trad-gravure"
                onClick={() => onAgrandir(g)} title={legendeGravure(g) ?? undefined}
                aria-label={`Agrandir : ${legendeGravure(g) ?? g.alt_text ?? 'gravure'}`}
                style={{ padding: '4px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '0', boxShadow: 'var(--cs-ombre-posee)', cursor: 'zoom-in' }}>
                <span style={{ display: 'block', aspectRatio: '1 / 1', background: 'var(--cs-fond-doux)' }}>
                  <img src={g.public_uri ?? ''} alt={g.alt_text ?? ''} loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                </span>
              </button>
            ))}
          </div>
          {gravures.length > montrees.length && (
            <p style={{ margin: '7px 0 0', fontSize: '0.625rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', lineHeight: 1.4 }}>
              {montrees.length} des {gravures.length} gravures de l’édition. Les autres se lisent à leur place, dans le texte.
            </p>
          )}
        </section>
      )}
    </>
  )

  return (
    <>
      {/* En-tête : portrait, nom, repères. Le cadre est celui de la fiche
          d'auteur, au format du portrait plutôt qu'à celui du bandeau. */}
      <header style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '16px' }}>
        {portrait && portraitCasse !== portrait.url && (
          <div style={{ width: '6.5rem', height: '130px', flexShrink: 0, padding: '5px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee)' }}>
            <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: 'var(--cs-fond-doux)' }}>
              <img src={portrait.url} alt="" aria-hidden="true" onError={() => setPortraitCasse(portrait.url)}
                style={styleImagePortrait(portrait)} />
            </div>
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cs-vert)', margin: '0 0 5px', textTransform: 'uppercase' }}>À propos de cette traduction</p>
          <h2 id="trad-fiche-titre" style={{ fontFamily: SERIF, fontSize: '1.4375rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.12 }}>{i.nom || nomFallback}</h2>
          {intitule && (
            <p style={{ fontFamily: SERIF, fontSize: '0.78125rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', margin: '2px 0 0', lineHeight: 1.3 }}>
              {rendreSiecles(intitule)}{i.dates ? ` (${i.dates})` : ''}
            </p>
          )}
          {reperes && (
            <p style={{ fontFamily: SANS, fontSize: '0.59375rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '8px 0 0', lineHeight: 1.4 }}>
              {rendreSiecles(reperes)}
            </p>
          )}
        </div>
      </header>

      {info === null ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: '30px 0', textAlign: 'center' }}>Chargement…</p>
      ) : (
        <>
          {/* Deux colonnes : à gauche la notice, à droite ce qui la documente. */}
          <div style={{ display: 'grid', gridTemplateColumns: aColonnes ? 'minmax(0, 1.35fr) minmax(0, 1fr)' : '1fr', gap: '26px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', borderRight: aColonnes ? '1px solid var(--cs-fond-doux)' : 'none', paddingRight: aColonnes ? '24px' : 0 }}>
              {i.bio_courte && (
                <p style={{ fontFamily: SERIF, fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: 0 }}>{rendreSiecles(i.bio_courte)}</p>
              )}
              {/* Notice éditoriale : HTML (h2/p) rendu tel quel, aux styles de la
                  fiche d'auteur — titres de section en sérif italique, prose en
                  sans justifiée. */}
              {i.commentaire_editorial && (
                <div className="trad-notice"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formaterProse(i.commentaire_editorial)) }} />
              )}
            </div>
            {aColonnes
              ? <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', minWidth: 0 }}>{colonneDroite}</div>
              : colonneDroite}
          </div>

          {/* L'édition : section secondaire, repliable (natif, accessible), et
              pleine mesure — ses rangées portent une colonne d'étiquettes de
              8,5 rem, qui n'entrerait pas dans une colonne. */}
          <details className="trad-tech" style={{ borderTop: '1px solid var(--cs-fond-doux)', marginTop: '20px', paddingTop: '13px' }}>
            <summary>
              <span aria-hidden className="trad-tech-fleche" style={{ fontSize: '0.59375rem', color: 'var(--cs-texte-faible)' }}>▸</span>
              <TitreSection>Édition et état du texte</TitreSection>
            </summary>
            <div style={{ marginTop: '4px' }}>
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
        </>
      )}

      <style>{STYLES_FICHE}</style>
    </>
  )
}

/**
 * Une gravure regardée en grand, dans son passe-partout. Elle se ferme d'un clic
 * hors du cadre, ou par Échap, qui ne referme alors pas la fiche.
 */
export function PlancheGravure({ gravure, onFermer }: { gravure: Gravure; onFermer: () => void }) {
  const legende = legendeGravure(gravure)
  return (
    <div onClick={onFermer} role="dialog" aria-modal="true" aria-label="Gravure agrandie"
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: Z_PLANCHE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <figure onClick={e => e.stopPropagation()}
        style={{ margin: 0, width: 'min(100%, 48rem)', maxHeight: '100%', overflowY: 'auto', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '12px', boxShadow: 'var(--cs-ombre-modale)', padding: '14px' }}>
        <img src={gravure.public_uri ?? ''} alt={gravure.alt_text ?? ''}
          style={{ display: 'block', margin: '0 auto', maxWidth: '100%', maxHeight: '65vh', width: 'auto', height: 'auto' }} />
        {legende && (
          <figcaption style={{ margin: '10px auto 0', maxWidth: '34rem', fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.78125rem', lineHeight: 1.35, color: 'var(--cs-texte-second)', textAlign: 'center' }}>
            {legende}
          </figcaption>
        )}
      </figure>
    </div>
  )
}

export default function ModaleTraduction({ code, nomFallback, onFermer }: { code: string; nomFallback: string; onFermer: () => void }) {
  const [info, setInfo] = useState<InfoTrad | null>(null)
  const [chrono, setChrono] = useState<RangChrono[]>([])
  const [gravures, setGravures] = useState<Gravure[]>([])
  // La gravure qu'on regarde en grand, par-dessus la fiche.
  const [planche, setPlanche] = useState<Gravure | null>(null)

  useEffect(() => {
    let annule = false
    // Source unique : la vue de présentation, chargée par trad_id.
    supabase.from('v_traductions_page').select('*').eq('trad_id', code).maybeSingle()
      .then(({ data }) => { if (!annule) setInfo((data as InfoTrad | null) ?? ({} as InfoTrad)) })
    supabase.from('v_chronologie_traductions').select('*').eq('trad_id', code).order('ordre_affichage')
      .then(({ data }) => { if (!annule) setChrono((data ?? []) as unknown as RangChrono[]) })
    // Les gravures appartiennent à la FAMILLE ÉDITORIALE, non à la traduction :
    // une édition bilingue les publie une fois pour ses deux textes. La seconde
    // requête ne part donc que si la traduction appartient à une famille.
    supabase.from('bible_edition_members').select('family_id').eq('trad_id', code).limit(1).maybeSingle()
      .then(({ data }) => {
        const famille = (data as { family_id: string } | null)?.family_id
        if (annule || !famille) return
        supabase.from('v_bible_edition_assets')
          .select('asset_key, public_uri, alt_text, printed_caption, editorial_caption')
          .eq('family_id', famille).order('material_order')
          .then(({ data: lignes }) => {
            if (annule) return
            setGravures(((lignes ?? []) as Gravure[]).filter(g => !!g.public_uri))
          })
      })
    return () => { annule = true }
  }, [code])

  // Le défilement de fond est gelé tant que la fenêtre est ouverte (comme la fiche
  // d'auteur) : le calque, lui, ne défile pas, c'est le CONTENU de la boîte qui
  // défile. ⛔ Cet effet n'a AUCUNE dépendance, et c'est nécessaire : rejoué à
  // l'ouverture d'une gravure, il retiendrait « hidden » comme état antérieur et
  // ne rendrait jamais le défilement à la page.
  useEffect(() => {
    const prec = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prec }
  }, [])

  // Échap ferme la gravure agrandie d'abord, la fiche ensuite.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (planche) setPlanche(null)
      else onFermer()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [planche, onFermer])

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <div onClick={onFermer}
        style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: Z_FICHE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflow: 'hidden' }}>
        <div role="dialog" aria-modal="true" aria-labelledby="trad-fiche-titre" onClick={e => e.stopPropagation()}
          style={{ position: 'relative', width: '100%', maxWidth: '52rem', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--cs-fond)', borderRadius: '12px', border: '1px solid var(--cs-bord-clair)', boxShadow: 'var(--cs-ombre-modale)', padding: '30px 34px 28px' }}>
          <button onClick={onFermer} aria-label="Fermer" title="Fermer"
            style={{ position: 'sticky', float: 'right', top: '0', marginRight: '-6px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <ContenuFicheTraduction info={info} chrono={chrono} gravures={gravures}
            nomFallback={nomFallback} onAgrandir={setPlanche} />
        </div>
      </div>

      {planche && <PlancheGravure gravure={planche} onFermer={() => setPlanche(null)} />}
    </>,
    document.body,
  )
}
