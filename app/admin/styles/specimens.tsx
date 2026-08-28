'use client'

/**
 * Les SPÉCIMENS de la planche des styles — un exemple par style, avec ce qu'il
 * sert et où sa forme est décidée.
 *
 * ⚠️ Deux régimes, et la planche les distingue en clair (`fidelite`) :
 *
 *  — `composant` : le spécimen passe par le COMPOSANT réel du site. C'est le cas
 *    de tout le paratexte biblique, rendu par `BlocEditorialBible`. Il ne peut pas
 *    dériver : si le rendu change, la planche change avec lui.
 *  — `reproduction` : la composition vit dans un composant qu'on ne peut pas
 *    appeler ici — celle des œuvres est enfermée dans `OeuvreClient`, celle des
 *    versets bibliques dans `TexteBible`. Le spécimen la REJOUE aux valeurs
 *    exactes, et nomme sa source pour qu'on puisse vérifier.
 *
 * ⛔ Une reproduction qui dériverait de sa source est pire que pas de spécimen du
 * tout : elle ferait autorité contre le site. Quand on touche à l'une de ces
 * compositions, on passe ici.
 */

import type { ReactNode } from 'react'
import { BlocEditorialBible } from '@/app/components/BibleEditionParatext'
import type { BlocEditorialBiblique } from '@/app/components/BibleEditionParatext'
import { RETRAIT_SUITE, retraitVers } from '@/app/lib/compositionVers'
import { BLANC_ENTRE_VERSETS, RETRAIT_VERSET } from '@/app/lib/compositionVersets'

export type Fidelite = 'composant' | 'reproduction'

export type Specimen = {
  /** Le nom du style, tel qu'il s'écrit DANS LA DONNÉE. */
  code: string
  /** À quoi il sert, en une phrase. */
  usage: string
  /** Où sa forme est décidée. */
  source: string
  fidelite: Fidelite
  /** Un piège, quand il y en a un. */
  alerte?: string
  rendu: ReactNode
}

export type GroupeSpecimens = { titre: string; note?: string; specimens: Specimen[] }
export type CleOnglet = 'bible' | 'oeuvres' | 'apparat-oeuvres' | 'apparat-bibles'

// ── Les mesures du site, reprises telles quelles ──────────────────────────────
const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

/** La prose d'une œuvre : `OeuvreClient`, paragraphe de lecture. */
const PROSE_OEUVRE: React.CSSProperties = {
  fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte-fort)',
  lineHeight: 1.62, textAlign: 'justify', wordSpacing: '-0.025em',
  hyphens: 'auto', margin: '0 0 0.72rem',
}

// ⛔ Pas de reproduction du corps du paratexte biblique ici : tous les spécimens
// de l'onglet « Apparat des bibles » passent par `BlocEditorialBible`, qui pose
// lui-même son `STYLE_CORPS`. Le rejouer serait ouvrir une seconde écriture.

const NUMERO_SEGMENT: React.CSSProperties = {
  fontSize: '0.50rem', color: 'var(--cs-texte-faible)', userSelect: 'none',
  marginRight: '2px', lineHeight: 1,
}

// ── Fabrique de blocs pour le paratexte biblique ──────────────────────────────
//
// Le spécimen passe par le composant réel : c'est la seule façon d'être sûr que
// la planche dit le site, et non ce qu'on croit qu'il fait.
function blocBible(
  semanticStyleCode: string,
  textes: string[],
  extra: Partial<BlocEditorialBiblique> = {},
): BlocEditorialBiblique {
  return {
    id: `specimen-${semanticStyleCode}-${extra.heading ?? textes[0]?.slice(0, 12) ?? ''}`,
    semanticStyleCode,
    placement: 'before',
    textBlocks: textes.map((text, rang) => ({
      id: `${semanticStyleCode}-${rang}`,
      kind: 'commentary' as const,
      form: 'prose' as const,
      text,
      language: 'fr',
    })),
    ...extra,
  }
}

const Bible = ({ bloc }: { bloc: BlocEditorialBiblique }) => <BlocEditorialBible bloc={bloc} />

// ══ ONGLET 1 — LE TEXTE BIBLIQUE ═════════════════════════════════════════════

const RANGEE: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', columnGap: '0.1875rem',
  alignItems: 'baseline', padding: '0.125rem 0.25rem 0.125rem 0', marginBottom: '0.25rem',
}
const NUMERO_VERSET_BIBLE: React.CSSProperties = {
  minWidth: '1.0625rem', textAlign: 'right', paddingRight: '0.3125rem',
  fontSize: '0.625rem', fontWeight: 600, color: 'var(--cs-texte-faible)',
  lineHeight: 1.40, whiteSpace: 'nowrap',
}
const TEXTE_VERSET: React.CSSProperties = {
  fontFamily: SERIF, fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--cs-texte-fort)',
  margin: 0, textAlign: 'justify', hyphens: 'auto',
}

const Verset = ({ n, children, alternatif }: { n: string; children: ReactNode; alternatif?: string }) => (
  <div style={RANGEE}>
    <span style={NUMERO_VERSET_BIBLE}>
      {n}
      {alternatif && (
        <span style={{ fontWeight: 400, fontStyle: 'italic', color: 'var(--cs-texte-faible)' }}> ({alternatif})</span>
      )}
    </span>
    <p style={TEXTE_VERSET}>{children}</p>
  </div>
)

export const BIBLE: GroupeSpecimens[] = [
  {
    titre: 'La rangée de verset',
    note: 'Le numéro se pose dans une gouttière à droite, jamais en exposant : la colonne du texte reste stable d’un verset à l’autre.',
    specimens: [
      {
        code: 'rangée de verset',
        usage: 'La ligne ordinaire de la lecture biblique : un numéro, un texte justifié.',
        source: 'TexteBible.tsx — grille « auto / mesure-texte »',
        fidelite: 'reproduction',
        rendu: (
          <>
            <Verset n="2">La terre était informe et vide ; les ténèbres couvraient l’abîme, et l’Esprit de Dieu était porté sur les eaux.</Verset>
            <Verset n="3">Or Dieu dit : Que la lumière soit ; et la lumière fut.</Verset>
          </>
        ),
      },
      {
        code: 'rangée de verset — numérotation alternative',
        usage: 'Quand l’édition suit une autre numérotation, la sienne s’écrit entre parenthèses, en italique.',
        source: 'TexteBible.tsx — `chapitre_alternatif` / `verset_alternatif`',
        fidelite: 'reproduction',
        rendu: <Verset n="14" alternatif="13,1">Ainsi le Seigneur parla-t-il à Moïse dans le désert de Sinaï.</Verset>,
      },
      {
        code: 'lacune du manuscrit',
        usage: 'Un verset absent du témoin. ⛔ On ne met pas autant de mentions que de versets attendus : une seule, à sa place.',
        source: 'TexteBible.tsx — `--cs-lacune`',
        fidelite: 'reproduction',
        rendu: (
          <div style={RANGEE}>
            <span style={NUMERO_VERSET_BIBLE}>7</span>
            <p style={TEXTE_VERSET}>
              <span style={{ fontFamily: SERIF, color: 'var(--cs-lacune)', fontStyle: 'italic' }}>Lacune du manuscrit</span>
            </p>
          </div>
        ),
      },
      {
        code: 'verset sans texte',
        usage: 'La traduction ne porte rien pour ce créneau canonique.',
        source: 'TexteBible.tsx — tiret cadratin, teinte de bord',
        fidelite: 'reproduction',
        rendu: (
          <div style={RANGEE}>
            <span style={NUMERO_VERSET_BIBLE}>8</span>
            <p style={TEXTE_VERSET}><span style={{ color: 'var(--cs-bord)', fontStyle: 'italic' }}>—</span></p>
          </div>
        ),
      },
    ],
  },
  {
    titre: 'L’enrichissement en ligne',
    note: 'Syntaxe volontairement réduite, stockée dans le texte même. Toute surface d’affichage passe par `rendreTexteEnrichi`.',
    specimens: [
      {
        code: '**gras** · *italique* · ++petites capitales++ · ^^exposant^^',
        usage: 'Les quatre marques admises partout : segments d’œuvre, versets, titres, notices.',
        source: 'texteEnrichi.tsx — `rendreTexteEnrichi`',
        fidelite: 'reproduction',
        rendu: (
          <p style={TEXTE_VERSET}>
            Un mot <strong>en gras</strong>, un mot <em>en italique</em>,{' '}
            <span style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>un nom en petites capitales</span>,
            et un appel<sup>1</sup>.
          </p>
        ),
      },
      {
        code: '<i>…</i>',
        usage: 'Chez Sacy, l’italique marque les mots AJOUTÉS par le traducteur, absents de la Vulgate. C’est une information éditoriale, pas un ornement — d’où sa forme propre.',
        source: 'texteEnrichi.tsx — la balise `<i>` est admise en plus des quatre marques',
        fidelite: 'reproduction',
        alerte: 'Faute de reconnaître cette balise, la page Bible affichait jadis « <i> » en clair au milieu des versets.',
        rendu: (
          <Verset n="1">Au commencement Dieu créa le ciel et la terre. <em>Or</em> la terre était informe et toute nue.</Verset>
        ),
      },
    ],
  },
]

// ══ ONGLET 2 — LE CORPS D'UNE ŒUVRE PATRISTIQUE ══════════════════════════════

export const OEUVRES: GroupeSpecimens[] = [
  {
    titre: 'La prose et ses marques',
    specimens: [
      {
        code: 'texte',
        usage: 'La prose principale — 87 744 segments, l’immense majorité du corpus.',
        source: 'OeuvreClient.tsx — paragraphe de lecture, 0,8125 rem, interligne 1,62',
        fidelite: 'reproduction',
        rendu: (
          <p style={PROSE_OEUVRE}>
            <sup style={NUMERO_SEGMENT}>412</sup>
            Il n’est pas de plus grand bien pour l’homme que de connaître sa propre mesure, et l’on ne
            saurait la connaître sans avoir d’abord reconnu celle de Dieu.
            <sup style={NUMERO_SEGMENT}>413</sup>
            Car c’est en le regardant qu’on apprend ce qu’on est.
          </p>
        ),
      },
      {
        code: 'numéro de segment',
        usage: 'L’ordinal du segment dans l’œuvre : un repère et une ancre de prélèvement, non une numérotation d’édition.',
        source: 'OeuvreClient.tsx — `STYLE_NUMERO_SEGMENT`, 0,50 rem, teinte faible',
        fidelite: 'reproduction',
        alerte: 'Il s’efface dans un bloc de versets, où le numéro de VERSET prend sa place : deux nombres en exposant sur la même ligne ne se lisent pas.',
        rendu: <p style={PROSE_OEUVRE}><sup style={NUMERO_SEGMENT}>1</sup>Le premier segment d’un paragraphe.</p>,
      },
      {
        code: 'rubrique',
        usage: 'Une rubrique éditoriale qui n’est pas un niveau de titre.',
        source: 'OeuvreClient.tsx — centré, italique',
        fidelite: 'reproduction',
        rendu: <p style={{ ...PROSE_OEUVRE, textAlign: 'center', fontStyle: 'italic' }}>Ici commence le livre second.</p>,
      },
      {
        code: 'signature',
        usage: 'Un bloc d’approbations, de censeurs, de souscripteurs : au fer à droite, interligne resserré, sans blanc entre lignes de même nature.',
        source: 'OeuvreClient.tsx — `toutSignature`, interligne 1,32, marge 0,3 rem',
        fidelite: 'reproduction',
        alerte: '⛔ La base REFUSE cette nature : `chk_segments_nature` ne la contient pas. Le rendu existe, la donnée ne peut pas l’atteindre.',
        rendu: (
          <div style={{ ...PROSE_OEUVRE, textAlign: 'right', lineHeight: 1.32, margin: 0 }}>
            <div style={{ marginBottom: '0.3rem' }}>Fr. Jean de Sainte-Marie, censeur.</div>
            <div style={{ marginBottom: '0.3rem' }}>Fr. Étienne Dubois, prieur.</div>
          </div>
        ),
      },
    ],
  },
  {
    titre: 'Les vers',
    note: 'Toute la composition vit dans `app/lib/compositionVers.ts`, partagée par la lecture et les traductions parallèles.',
    specimens: [
      {
        code: 'vers',
        usage: 'Une ligne de poésie. Alinéa de base de 1,5 em, ni justification ni césure — on ne coupe pas un alexandrin —, interligne 1,4, et un retrait de suite qui distingue une ligne trop longue du vers suivant.',
        source: 'compositionVers.ts — `RETRAIT_BASE`, `RETRAIT_SUITE`, `retraitVers`',
        fidelite: 'reproduction',
        alerte: '⛔ Un vers ne prend jamais de lettrine : le drop cap est un flottant, et posé dans la boîte d’une ligne il déborde sur les suivantes.',
        rendu: (
          <div style={{ fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', margin: 0 }}>
            {[
              { texte: 'Heureux qui, connaissant les lois de la nature,', rang: 0, strophe: false },
              { texte: 'Foule aux pieds les terreurs dont le vulgaire a peur,', rang: 1, strophe: false },
              { texte: 'Et regarde d’un œil que rien n’altère ou n’use', rang: 0, strophe: true },
              { texte: 'Le sort inévitable et la mort et l’erreur.', rang: 1, strophe: false },
            ].map((v, i) => (
              <span key={i} style={{
                display: 'block', lineHeight: 1.4, marginTop: v.strophe ? '0.6rem' : 0,
                marginLeft: `${retraitVers(v.rang)}em`, paddingLeft: `${RETRAIT_SUITE}em`,
                textIndent: `-${RETRAIT_SUITE}em`, hyphens: 'none',
              }}>{v.texte}</span>
            ))}
          </div>
        ),
      },
    ],
  },
  {
    titre: 'Les citations',
    note: 'Doctrine : charte § 3.8. Une citation longue se détache de la prose ; elle perd ses guillemets encadrants, et le retrait suffit à la dire.',
    specimens: [
      {
        code: 'citation sortie',
        usage: 'Une citation LONGUE (400 signes), ISOLÉE par un deux-points et TERMINALE. Retrait des deux côtés, corps réduit, ni guillemets ni filet.',
        source: 'citationSortie.ts (règle) · globals.css, `.citation-sortie` (forme)',
        fidelite: 'reproduction',
        alerte: 'Les trois conditions sont cumulées : une citation enchâssée sortie laisserait sa phrase d’accueil coupée en deux.',
        rendu: (
          <div>
            <p style={{ ...PROSE_OEUVRE, margin: 0 }}>
              Le prophète, voulant montrer que rien ne se fait sans dessein, rappelle en ces termes le
              commencement de toutes choses :
            </p>
            <span className="citation-sortie" style={{ fontSize: '0.95em', fontFamily: SERIF, color: 'var(--cs-texte-fort)', lineHeight: 1.62 }}>
              La terre était informe et vide ; les ténèbres couvraient l’abîme, et l’Esprit de Dieu était
              porté sur les eaux. Or Dieu dit : Que la lumière soit ; et la lumière fut. Et Dieu vit que
              la lumière était bonne, et il sépara la lumière d’avec les ténèbres.
            </span>
            <p style={{ ...PROSE_OEUVRE, margin: '0.72rem 0 0' }}>Ainsi l’ordre du monde était-il posé dès le premier jour.</p>
          </div>
        ),
      },
      {
        code: 'verset',
        usage: 'Une citation biblique longue que l’édition pose VERSET PAR VERSET. Un segment, un verset ; la suite forme la citation.',
        source: 'compositionVersets.ts · OeuvreClient.tsx, `.citation-versets` / `.citation-verset`',
        fidelite: 'reproduction',
        alerte: '⛔ Ne pas confondre avec `vers`, la ligne de poésie. Et le retrait ne se pose qu’à GAUCHE : une suite de lignes déjà rentrée n’a pas besoin d’une seconde marge.',
        rendu: (
          <div>
            <p style={{ ...PROSE_OEUVRE, margin: 0 }}>Le Seigneur parla ainsi par la bouche de son prophète :</p>
            <div style={{ fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', margin: '0 0 0.72rem', wordSpacing: '-0.025em' }}>
              {[
                { n: '2', t: 'La terre était informe et vide ; les ténèbres couvraient l’abîme, et l’Esprit de Dieu était porté sur les eaux.' },
                { n: '3', t: 'Or Dieu dit : Que la lumière soit ; et la lumière fut.' },
                { n: '4', t: 'Et Dieu vit que la lumière était bonne ; et il sépara la lumière d’avec les ténèbres.' },
              ].map((v, i, tout) => (
                <span key={v.n} style={{
                  display: 'block', fontSize: '0.95em', lineHeight: 1.62, textAlign: 'justify',
                  margin: `0 0 ${i === tout.length - 1 ? '0' : BLANC_ENTRE_VERSETS} ${RETRAIT_VERSET}`,
                }}>
                  <sup className="num-verset">{v.n}</sup>{v.t}
                </span>
              ))}
            </div>
          </div>
        ),
      },
      {
        code: 'numéro de verset',
        usage: 'Écrit à la main dans `segment_metadata.biblical_verse_number`. Il prend la FACE de la page Bible — graisse 600, teinte faible, le même rapport de corps — mais en exposant, la gouttière se battant ici avec le retrait.',
        source: 'compositionVersets.ts, `CLE_NUMERO_VERSET` · OeuvreClient.tsx, `.num-verset`',
        fidelite: 'reproduction',
        alerte: '⛔ PAS `verse_number` : cette clé porte déjà le rang du VERS dans son poème, chez Ceriziers.',
        rendu: (
          // Le corps du verset est 0,95 em de la prose : on pose la prose sur
          // l'enveloppe, et le rapport se calcule comme sur le site.
          <div style={{ fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', lineHeight: 1.62 }}>
            <span style={{ fontSize: '0.95em' }}>
              <sup className="num-verset">12</sup>Un verset numéroté.{' '}
              <sup className="num-verset">12-13</sup>Une forme composée, quand un segment couvre deux versets.
            </span>
          </div>
        ),
      },
    ],
  },
]

// ══ ONGLET 3 — L'APPARAT D'UNE ŒUVRE PATRISTIQUE ═════════════════════════════

export const APPARAT_OEUVRES: GroupeSpecimens[] = [
  {
    titre: 'Ce qui entoure le texte',
    note: 'Trois natures que l’on confond, et qui ne se lisent pas au même endroit.',
    specimens: [
      {
        code: 'introduction',
        usage: 'L’ARGUMENT qui ouvre une division — « Saint Chrysostome examine dans cette homélie… ». Hissé en tête, hors des groupes et de la pagination.',
        source: 'OeuvreClient.tsx — 0,75 rem, italique, `--cs-texte-second`, marges latérales',
        fidelite: 'reproduction',
        rendu: (
          <p style={{ fontFamily: SERIF, fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.6, textAlign: 'justify', margin: 0 }}>
            Saint Chrysostome examine dans cette homélie ce que signifie le nom d’Évangile, et pourquoi
            quatre écrivains ont rapporté une seule histoire.
          </p>
        ),
      },
      {
        code: 'apparat_auteur',
        usage: 'Préface, digression, argument ou autre paratexte rédigé par L’AUTEUR de l’œuvre : il se lit à sa place dans le texte.',
        source: 'oeuvreSelects.ts — appartient à `NATURES_CORPS`',
        fidelite: 'reproduction',
        alerte: '⛔ Son retrait de `NATURES_CORPS` avait fait disparaître, le 18 août 2026, le « Prologue de Rufin aux livres X et XI ». À ne pas confondre avec `apparat_critique`, l’apparat de l’ÉDITEUR.',
        rendu: <p style={PROSE_OEUVRE}>Prologue de Rufin aux livres X et XI de l’Histoire ecclésiastique.</p>,
      },
      {
        code: 'apparat_editeur',
        usage: 'Préface ou avertissement du traducteur, privilège, approbation : un paratexte EXTÉRIEUR à l’œuvre de l’auteur.',
        source: 'segments — contrainte : `espace_textuel` vaut alors `apparat_critique`',
        fidelite: 'reproduction',
        rendu: <p style={PROSE_OEUVRE}>Avertissement du traducteur sur la présente édition.</p>,
      },
      {
        code: 'apparat_critique',
        usage: 'L’apparat de l’éditeur, avec sa vue à part dans la page d’œuvre.',
        source: 'OeuvreClient.tsx — onglet « Apparat »',
        fidelite: 'reproduction',
        alerte: '⛔ L’apparat ne sort pas ses citations : c’est une vue de comparaison, pas la lecture suivie.',
        rendu: <p style={{ ...PROSE_OEUVRE, color: 'var(--cs-texte-second)' }}>Knöll conjecture ici <em>inspirent</em> ; les manuscrits portent <em>inspire</em>.</p>,
      },
    ],
  },
  {
    titre: 'Le texte original en regard',
    specimens: [
      {
        code: 'texte-original',
        usage: 'La langue originale d’une œuvre. En sérif quand elle se lit seule ; en SANS quand elle est mise en regard du français — la différence de police distingue les deux colonnes mieux qu’un filet.',
        source: 'OeuvreClient.tsx — `.texte-original`, `.para-bilingue > .texte-original`',
        fidelite: 'reproduction',
        rendu: (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.12fr) minmax(0,0.88fr)', gap: '1.6rem', alignItems: 'start', borderBottom: '1px solid rgba(var(--cs-bord-rgb),0.55)', paddingBottom: '0.5rem' }}>
            <p style={{ ...PROSE_OEUVRE, margin: 0 }}>Vous nous avez faits pour vous, et notre cœur est sans repos tant qu’il ne se repose en vous.</p>
            <p style={{ fontFamily: SANS, fontSize: '0.78125rem', color: 'var(--cs-original)', lineHeight: 1.5, margin: 0 }}>
              Fecisti nos ad te et inquietum est cor nostrum donec requiescat in te.
            </p>
          </div>
        ),
      },
    ],
  },
]

// ══ ONGLET 4 — L'APPARAT DES BIBLES ══════════════════════════════════════════
//
// Ici, et ici seulement, le spécimen passe par le COMPOSANT RÉEL.

export const APPARAT_BIBLES: GroupeSpecimens[] = [
  {
    titre: 'Les six rangs de titre',
    note: 'T1 à T6 disent la PROFONDEUR d’un titre attesté. ⛔ Le jeton commande la classe, jamais la balise : celle-ci se calcule sur les parents réellement présents.',
    specimens: [
      {
        code: 'titre_partie_livre — T2',
        usage: 'Une partie du livre. Centrée, chasse large.',
        source: 'globals.css — `.cs-bible-title--t2`',
        fidelite: 'composant',
        rendu: <Bible bloc={blocBible('titre_partie_livre', [], { heading: 'PREMIÈRE PARTIE — La vie publique de Jésus.', niveauHtml: 2 })} />,
      },
      {
        code: 'titre_section_livre — T3',
        usage: 'Une section. Centrée, un cran franc sous la partie — rapport 1,2, non 1,05.',
        source: 'globals.css — `.cs-bible-title--t3`',
        fidelite: 'composant',
        rendu: <Bible bloc={blocBible('titre_section_livre', [], { heading: '§ III. — Jésus au tribunal de Pilate.', niveauHtml: 3 })} />,
      },
      {
        code: 'titre_sous_section — T4',
        usage: 'Une sous-section. Au fer : c’est la POSE, non la taille, qui sépare les rangs bas des rangs hauts.',
        source: 'globals.css — `.cs-bible-title--t4`',
        fidelite: 'composant',
        rendu: <Bible bloc={blocBible('titre_sous_section', [], { heading: '1° La personne de l’auteur', niveauHtml: 4 })} />,
      },
      {
        code: 'titre_pericope — T6',
        usage: 'Le rang le plus bas : au fer, en ITALIQUE. Il ne doit pas peser plus que ce qu’il annonce.',
        source: 'globals.css — `.cs-bible-title--t6`',
        fidelite: 'composant',
        rendu: <Bible bloc={blocBible('titre_pericope', [], { heading: '3. Ce qui suivit la mort de Jésus (27, 51-56)', niveauHtml: 6 })} />,
      },
      {
        code: 'titre_chapitre_livre — T5',
        usage: 'La mention imprimée « CHAPITRE IX ».',
        source: 'semantic_display_hierarchy.json — `redundant_with_reader_navigation`',
        fidelite: 'composant',
        alerte: '⛔ JAMAIS AFFICHÉ (charte § 35.1) : la barre de navigation nomme déjà le chapitre. Le bloc reste dans la donnée comme témoin matériel — le spécimen ci-dessous est donc vide, et c’est la bonne réponse.',
        rendu: <Bible bloc={blocBible('titre_chapitre_livre', ['Ceci ne doit pas paraître.'], { heading: 'CHAPITRE IX', niveauHtml: 5 })} />,
      },
    ],
  },
  {
    titre: 'Les portées d’information',
    note: 'I1 à I6 disent l’ÉTENDUE qu’un bloc explique. La NATURE — introduction, commentaire, notice… — est un axe séparé, qui se cumule au jeton.',
    specimens: [
      {
        code: 'introduction_livre — I1',
        usage: 'L’introduction d’un livre biblique. Elle porte un vrai TITRE de rang T2, et c’est le GENRE qui titre : le lecteur sait déjà quel livre il ouvre, le nom passe en chapeau.',
        source: 'bibleHierarchieSemantique.ts — `diviserIntitule`, option `genreEnTitre`',
        fidelite: 'composant',
        rendu: (
          <Bible bloc={blocBible('introduction_livre', [
            'Le premier évangile a été écrit par l’apôtre saint Matthieu, publicain de son état, appelé aussi Lévi.',
          ], { heading: 'Évangile selon saint Matthieu — Introduction', niveauHtml: 2 })} />
        ),
      },
      {
        code: 'introduction_pericope — I5',
        usage: 'L’introduction d’une péricope. Elle porte un titre de rang T6 et ENTRE AU SOMMAIRE, bien qu’elle vive à l’intérieur d’un bloc d’information.',
        source: 'semantic_display_hierarchy.json — `heading_in_outline: true`',
        fidelite: 'composant',
        rendu: (
          <Bible bloc={blocBible('introduction_pericope', [
            'Les trois évangélistes synoptiques racontent ce fait, mais avec des détails propres à chacun.',
          ], { heading: '3. Ce qui suivit la mort de Jésus (27, 51-56)', niveauHtml: 6 })} />
        ),
      },
      {
        code: 'commentaire_pericope — I5',
        usage: 'Le style le plus employé du corpus : 2 169 blocs. Son repère devient une MANCHETTE flottante, posée en tête du développement, que le commentaire habille.',
        source: 'globals.css — `.cs-bible-info--i5.cs-bible-block--commentary > .cs-bible-info-label`',
        fidelite: 'composant',
        alerte: '⛔ Rien ne délimite la manchette qu’un blanc : ni filet, ni fond, ni pictogramme.',
        rendu: (
          <Bible bloc={blocBible('commentaire_pericope', [
            'Le voile du temple se déchira. Ce voile séparait le Saint des saints du reste de l’édifice ; sa déchirure marquait la fin de l’ancienne alliance, et l’ouverture du sanctuaire à tous les peuples.',
          ], { heading: '51. Le voile du temple' })} />
        ),
      },
      {
        code: 'commentaire_verset — I6',
        usage: 'Le commentaire d’un verset : le rang le plus étroit, corps réduit. 462 blocs, tous dans le Pentateuque.',
        source: 'globals.css — `.cs-bible-info--i6`',
        fidelite: 'composant',
        rendu: (
          <Bible bloc={blocBible('commentaire_verset', [
            'Sur la face de l’abîme. L’hébreu emploie un mot qui désigne la masse des eaux primitives.',
          ], { heading: '2.' })} />
        ),
      },
      {
        code: 'notice_bible — I1, nature notice',
        usage: 'Une notice de portée biblique : apparat, sigles, bibliographie, matière éditoriale. Rendue dans un `<aside>`, à côté du fil, corps 0,78 rem.',
        source: 'globals.css — `.cs-bible-block--notice`',
        fidelite: 'composant',
        rendu: (
          <Bible bloc={blocBible('notice_bible', [
            '1. Le mot grec τὰ βιβλία, « les livres », est devenu en bas latin un féminin singulier. — 2. Dan. IX, 2 ; I Mach. XII, 9.',
          ], { noticeSubtype: 'critical_apparatus' })} />
        ),
      },
    ],
  },
  {
    titre: 'L’intertitre divisé',
    note: 'Un intertitre porte souvent sa désignation puis son objet. Sur une seule ligne, les deux se lisent sur le même plan, alors que le second est subordonné au premier.',
    specimens: [
      {
        code: 'kind: heading — divisé',
        usage: 'La coupure se fait au tiret ENTOURÉ D’ESPACES ; un tiret collé appartient au mot. La paire se centre alors sur son rang, et le blanc au-dessus passe à 4 rem : il sépare deux sections.',
        source: 'BibleEditionParatext.tsx · globals.css, `.cs-bible-titre--divise`',
        fidelite: 'composant',
        alerte: '⛔ Un intertitre qui porte une locution marquée ou un appel de note n’est PAS coupé : leurs offsets pointent dans le texte entier.',
        rendu: (
          <Bible bloc={{
            id: 'specimen-intertitre',
            semanticStyleCode: 'introduction_bible',
            placement: 'before',
            niveauHtml: 2,
            textBlocks: [
              { id: 'h', kind: 'heading', form: 'prose', text: 'II — Jésus-Christ, centre de la Bible', language: 'fr', headingLevel: 'T3', presentation: { textAlign: 'left', fontStyle: 'normal' } },
              { id: 'p', kind: 'commentary', form: 'prose', text: 'La Bible n’est pas un livre isolé : elle a son centre, et ce centre est une personne.', language: 'fr' },
            ],
          }} />
        ),
      },
      {
        code: 'kind: heading — entier',
        usage: 'Sans tiret séparateur, l’intitulé reste d’un seul tenant. ⛔ Rien n’est deviné.',
        source: 'bibleHierarchieSemantique.ts — `diviserIntitule`',
        fidelite: 'composant',
        rendu: (
          <Bible bloc={{
            id: 'specimen-intertitre-entier',
            semanticStyleCode: 'introduction_bible',
            placement: 'before',
            niveauHtml: 2,
            textBlocks: [
              { id: 'h', kind: 'heading', form: 'prose', text: '1. La personne de l’auteur', language: 'fr', headingLevel: 'T4', presentation: { textAlign: 'left', fontStyle: 'normal' } },
              { id: 'p', kind: 'commentary', form: 'prose', text: 'Saint Luc était médecin, et compagnon de saint Paul.', language: 'fr' },
            ],
          }} />
        ),
      },
    ],
  },
  {
    titre: 'La citation sortie',
    note: 'Depuis le 28 août 2026, la règle des ŒUVRES vaut aussi ici — mais pour les natures `introduction` et `notice` seulement.',
    specimens: [
      {
        code: 'citation sortie',
        usage: 'Une citation longue, annoncée par un deux-points et terminant son paragraphe, se détache : retrait des deux côtés, guillemets encadrants retirés.',
        source: 'citationSortie.ts · globals.css, `.citation-sortie`',
        fidelite: 'composant',
        alerte: '⛔ Pas dans un commentaire de péricope ou de verset : on y cite en une ligne, et le retrait l’y noierait. Portée réelle du corpus : un paragraphe sur 3 221.',
        rendu: (
          <Bible bloc={blocBible('introduction_bible', [
            'À notre époque, Stolberg écrivait au sujet de la Bible : « Toutes les parties de ce livre sont unies de la façon la plus étroite par une relation unique, la relation qu’elles ont à Jésus-Christ, l’Oint de Dieu, le Sauveur d’Israël, le Sauveur de l’humanité. Sans lui, l’histoire sainte entière n’aurait ni enchaînement ni but. Non, elle n’en aurait pas, puisqu’il est l’objet perpétuel des promesses, des coutumes religieuses, de l’attente nationale, des aspirations ardentes des hommes de Dieu. »',
          ])} />
        ),
      },
    ],
  },
  {
    titre: 'Les locutions marquées',
    note: 'Sémantiques, jamais déduites du texte ni posées en CSS. `inline_spans` porte leur genre, leur langue et leur rendu.',
    specimens: [
      {
        code: 'foreign_expression · abbreviation · bibliographic_title',
        usage: 'Le grec, le latin, l’hébreu translittéré, une abréviation latine, un titre d’ouvrage : tous en italique, avec leur `lang`.',
        source: 'BibleEditionParatext.tsx — `envelopperSpan`',
        fidelite: 'composant',
        rendu: (
          <Bible bloc={{
            id: 'specimen-spans',
            semanticStyleCode: 'commentaire_pericope',
            placement: 'before',
            textBlocks: [{
              id: 's', kind: 'commentary', form: 'prose', language: 'fr',
              text: 'Le mot grec βιβλία désigne les livres ; voir Vigouroux, Manuel biblique, sur ce point.',
              inlineSpans: [
                { kind: 'foreign_expression', rendering: 'italic', language: 'grc', startOffsetUnicode: 13, endOffsetUnicode: 20 },
                { kind: 'bibliographic_title', rendering: 'italic', language: 'fr', startOffsetUnicode: 55, endOffsetUnicode: 70 },
              ],
            }],
          }} />
        ),
      },
      {
        code: 'quotation — quotation_italic',
        usage: 'Une citation en ligne : les guillemets français restent en ROMAIN, l’italique s’arrête à leur bord.',
        source: 'BibleEditionParatext.tsx — `envelopperSpan`',
        fidelite: 'composant',
        alerte: '⛔ La paire ne se pose qu’UNE fois. Un appel de note tombé au milieu coupait jadis la locution en fragments, et chaque fragment reprenait sa paire.',
        rendu: (
          <Bible bloc={{
            id: 'specimen-quotation',
            semanticStyleCode: 'commentaire_pericope',
            placement: 'before',
            textBlocks: [{
              id: 'q', kind: 'commentary', form: 'prose', language: 'fr',
              text: 'Il répond simplement : je ne sais pas, et se tait.',
              inlineSpans: [{ kind: 'quotation', rendering: 'quotation_italic', language: 'fr', startOffsetUnicode: 22, endOffsetUnicode: 35 }],
            }],
          }} />
        ),
      },
    ],
  },
]

export const ONGLETS: { cle: CleOnglet; libelle: string; groupes: GroupeSpecimens[]; chapeau: string }[] = [
  { cle: 'bible', libelle: 'Bible', groupes: BIBLE, chapeau: 'Le texte biblique lui-même : la rangée de verset, son numéro en gouttière, et les marques que porte le texte.' },
  { cle: 'oeuvres', libelle: 'Œuvres patristiques', groupes: OEUVRES, chapeau: 'Le corps d’une œuvre : la prose, les vers, les citations, et les natures de segment qui les composent.' },
  { cle: 'apparat-oeuvres', libelle: 'Apparat des œuvres', groupes: APPARAT_OEUVRES, chapeau: 'Ce qui entoure le texte d’une œuvre : l’argument, les paratextes de l’auteur et de l’éditeur, l’apparat critique, la langue originale.' },
  { cle: 'apparat-bibles', libelle: 'Apparat des bibles', groupes: APPARAT_BIBLES, chapeau: 'Le paratexte d’une bible commentée — famille Fillion. Ces spécimens passent par le COMPOSANT RÉEL du site : ils ne peuvent pas dériver.' },
]
