'use client'

/**
 * Les ÉPREUVES de la planche des styles — un long texte par vocabulaire, où les
 * styles se suivent comme ils se suivent sur le site, et où l'on voit donc leurs
 * RELATIONS : le blanc qu'un titre laisse sous lui, l'apparat qui suit un
 * commentaire, la citation qui coupe un paragraphe, la strophe qui rouvre après
 * une prose.
 *
 * ⛔ Rien n'est REJOUÉ ici. Chaque composition vient de là où le site la décide :
 *
 *  — `app/lib/compositionOeuvre.ts` : la lecture d'une œuvre (paragraphe, vers,
 *    argument, numéro de segment) — `OeuvreClient` s'en sert aussi ;
 *  — `app/lib/compositionBible.ts` : la rangée de verset et l'axe de la page —
 *    `TexteBible` s'en sert aussi ;
 *  — `app/lib/compositionVers.ts`, `compositionVersets.ts` : les mesures ;
 *  — `globals.css` : les classes (`.citation-sortie`, `.citation-versets`,
 *    `.cs-bible-*`, `.texte-original`) ;
 *  — `BlocEditorialBible` : tout le paratexte biblique, par le composant lui-même.
 *
 * ⛔ Une épreuve qui rejouerait une composition de mémoire dériverait au premier
 * réglage, et ferait ensuite autorité contre la page qu'elle décrit. En ajouter
 * une, c'est d'abord sortir la composition de son composant.
 *
 * ⚠️ Le TEXTE est de fabrication : il imite le corpus sans en être. Les épreuves
 * doivent porter tous les styles, y compris ceux qu'aucune œuvre n'emploie encore.
 */

import type { ReactNode } from 'react'
import { BlocEditorialBible } from '@/app/components/BibleEditionParatext'
import type { BlocEditorialBiblique } from '@/app/components/BibleEditionParatext'
import {
  STYLE_LACUNE, STYLE_NUMERO_ALTERNATIF, STYLE_NUMERO_VERSET, STYLE_VERSET_VIDE,
  styleAxeTexte, styleBlocVerset, styleGrilleRangee, styleRangeeVerset, styleTexteVerset,
} from '@/app/lib/compositionBible'
import {
  STYLE_NUMERO_SEGMENT, margeArgument, styleArgument, styleBlocDeVers,
  styleLigneDeVers, styleParagrapheApparat, styleParagrapheLecture,
} from '@/app/lib/compositionOeuvre'

export type CleOnglet = 'bible' | 'oeuvres' | 'apparat-oeuvres' | 'apparat-bibles'

/** Une UNITÉ d'épreuve : ce qui se compose, et ce que la marge en dit. */
export type Unite = {
  /** Le nom du style, tel qu'il s'écrit dans la donnée ou dans la feuille. */
  style: string
  /** Ce qu'il fait, en une ligne. */
  note: string
  /** Le piège, quand il y en a un. */
  alerte?: string
  contenu: ReactNode
}

export type Epreuve = { cle: CleOnglet; libelle: string; chapeau: string; unites: Unite[] }

// ── Outils communs ───────────────────────────────────────────────────────────

/** Un segment de lecture, avec son numéro et sa surbrillance de survol. */
const Segment = ({ n, children }: { n?: number; children: ReactNode }) => (
  <span className="seg-inline">
    {n != null && <sup style={STYLE_NUMERO_SEGMENT}>{n}</sup>}
    {children}
  </span>
)

const Bible = ({ bloc }: { bloc: BlocEditorialBiblique }) => (
  // ⚠️ L'axe est celui de la page : sans lui, le bloc ne prendrait ni la mesure du
  // bloc de lecture, ni les règles de voisinage qui s'y pendent.
  <div className="cs-bible-axe" style={styleAxeTexte()}>
    <BlocEditorialBible bloc={bloc} />
    <div />
  </div>
)

function blocBible(
  semanticStyleCode: string,
  textes: string[],
  extra: Partial<BlocEditorialBiblique> = {},
): BlocEditorialBiblique {
  return {
    id: `epreuve-${semanticStyleCode}-${extra.heading ?? textes[0]?.slice(0, 14) ?? ''}`,
    semanticStyleCode,
    placement: 'before',
    textBlocks: textes.map((text, rang) => ({
      id: `${semanticStyleCode}-${rang}`, kind: 'commentary' as const, form: 'prose' as const,
      text, language: 'fr',
    })),
    ...extra,
  }
}

// ══ ÉPREUVE 1 — LE TEXTE BIBLIQUE ════════════════════════════════════════════

const Rangee = ({ n, alternatif, actif, children }: {
  n: string; alternatif?: string; actif?: boolean; children: ReactNode
}) => (
  <div className={`verset-row${actif ? ' verset-row--actif' : ''}`} style={styleRangeeVerset()}>
    <div style={styleGrilleRangee()}>
      <div style={styleBlocVerset({ actif })}>
        <span style={STYLE_NUMERO_VERSET}>
          {n}
          {alternatif && <span style={STYLE_NUMERO_ALTERNATIF}> ({alternatif})</span>}
        </span>
        <p data-verse-text style={styleTexteVerset()}>{children}</p>
      </div>
      <div />
    </div>
  </div>
)

const BIBLE: Unite[] = [
  {
    style: 'bible/verset — la rangée',
    note: 'La ligne ordinaire de la lecture. Le numéro se pose dans une gouttière au fer à droite : la colonne du texte reste ainsi rigoureusement stable d’un verset à l’autre.',
    contenu: (
      <>
        <Rangee n="1">Au commencement Dieu créa le ciel et la terre.</Rangee>
        <Rangee n="2">La terre était informe et vide ; les ténèbres couvraient l’abîme, et l’Esprit de Dieu était porté sur les eaux.</Rangee>
      </>
    ),
  },
  {
    style: 'bible/verset — sélectionné',
    note: 'Le clic teint le bloc numéro + texte d’un seul tenant. La gouttière d’actions, elle, reste hors de la teinte.',
    contenu: <Rangee n="3" actif>Or Dieu dit : Que la lumière soit ; et la lumière fut.</Rangee>,
  },
  {
    style: 'bible/enrichissement en ligne',
    note: 'Cinq marques, stockées dans le texte même : **gras**, *italique*, ++petites capitales++, ^^exposant^^, et la balise <i> — qui chez Sacy marque les mots AJOUTÉS par le traducteur, absents de la Vulgate.',
    alerte: 'Faute de reconnaître <i>, la page Bible affichait jadis la balise en clair au milieu des versets.',
    contenu: (
      <Rangee n="4">
        Et Dieu vit que la lumière était <strong>bonne</strong> ; <em>or</em> il sépara la lumière
        d’avec les ténèbres, et il appela la lumière{' '}
        <span style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>jour</span>, et les ténèbres nuit<sup>1</sup>.
      </Rangee>
    ),
  },
  {
    style: 'bible/verset — numérotation alternative',
    note: 'Quand l’édition suit une autre numérotation, la sienne s’écrit entre parenthèses, en italique et sans graisse : elle accompagne le numéro sans le disputer.',
    contenu: <Rangee n="5" alternatif="4,1">Et du soir et du matin se fit un jour.</Rangee>,
  },
  {
    style: 'bible/lacune',
    note: 'Un verset absent du témoin, quand le chapitre est par ailleurs porté. Italique de labeur, teinte effacée : signalé sans peser.',
    alerte: '⛔ Une seule mention, à sa place — non autant qu’il manque de versets.',
    contenu: (
      <Rangee n="6">
        <span title="Lacune matérielle du manuscrit" style={STYLE_LACUNE}>Lacune du manuscrit</span>
      </Rangee>
    ),
  },
  {
    style: 'bible/verset vide',
    note: 'La traduction ne porte rien pour ce créneau canonique. Un tiret cadratin de la teinte des bords, et rien d’autre.',
    contenu: <Rangee n="7"><span style={STYLE_VERSET_VIDE}>—</span></Rangee>,
  },
  {
    style: 'bible_apparat/bloc dans le fil',
    note: 'Un commentaire de péricope s’intercale entre deux versets. ⚠️ Le blanc de 2 rem qui le cerne vient d’une règle de VOISINAGE — `.verset-row + .cs-bible-axe > .cs-bible-bloc` — et non du bloc : c’est pourquoi l’axe doit être là.',
    contenu: (
      <Bible bloc={blocBible('commentaire_pericope', [
        'Que la lumière soit. Les Pères ont vu dans cette parole la première manifestation du Verbe, par qui tout a été fait.',
      ], { heading: '3. La première parole' })} />
    ),
  },
  {
    style: 'bible/verset — après un bloc',
    note: 'La lecture reprend. Le blanc au-dessus de la rangée est celui que la règle de voisinage a ouvert sous le bloc.',
    contenu: <Rangee n="8">Dieu dit encore : Que le firmament soit fait au milieu des eaux.</Rangee>,
  },
]

// ══ ÉPREUVE 2 — LE CORPS D'UNE ŒUVRE PATRISTIQUE ═════════════════════════════

const OEUVRES: Unite[] = [
  {
    style: 'patristique/introduction — l’argument',
    note: 'L’argument qui ouvre une division, hissé en tête, hors des groupes et de la pagination. Plus petit, en italique, d’une encre plus claire.',
    contenu: (
      <div className="seg-wrapper" style={{ position: 'relative', margin: margeArgument() }}>
        <div className="seg-p" style={styleArgument()}>
          Saint Chrysostome examine dans cette homélie ce que signifie le nom d’Évangile, et pourquoi
          quatre écrivains ont rapporté une seule histoire sans que la vérité en souffre.
        </div>
      </div>
    ),
  },
  {
    style: 'patristique/texte',
    note: 'La prose principale — 87 744 segments, l’immense majorité du corpus. Justifiée, césurée, interligne 1,62. Les segments coulent dans un même paragraphe et se désignent au survol.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={412}>Il n’est pas de plus grand bien pour l’homme que de connaître sa propre mesure, et l’on ne saurait la connaître sans avoir d’abord reconnu celle de Dieu.</Segment>{' '}
        <Segment n={413}>Car c’est en le regardant qu’on apprend ce qu’on est, comme c’est en s’éloignant de la lumière qu’on mesure la longueur de son ombre.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/citation sortie',
    note: 'Charte § 3.8. Une citation LONGUE de 400 signes, ISOLÉE par un deux-points et TERMINALE se détache : retrait des deux côtés, corps réduit, ni guillemets ni filet — le retrait suffit à la dire.',
    alerte: 'Les trois conditions sont cumulées : une citation enchâssée sortie laisserait sa phrase d’accueil coupée en deux.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={414}>
          Le prophète, voulant montrer que rien ne se fait sans dessein, rappelle en ces termes le
          commencement de toutes choses :
          <span className="citation-sortie">
            La terre était informe et vide ; les ténèbres couvraient l’abîme, et l’Esprit de Dieu était
            porté sur les eaux. Or Dieu dit : Que la lumière soit ; et la lumière fut. Et Dieu vit que la
            lumière était bonne, et il sépara la lumière d’avec les ténèbres, et il appela la lumière
            jour, et les ténèbres nuit.
          </span>
        </Segment>
      </p>
    ),
  },
  {
    style: 'patristique/verset',
    note: 'Quand l’édition ne coule pas la citation dans sa prose mais la pose verset par verset. Un segment, un verset ; retrait à GAUCHE seulement, et un léger blanc entre versets au lieu du blanc de paragraphe.',
    alerte: '⛔ Ne pas confondre avec `vers`, la ligne de poésie. Le numéro s’écrit à la main dans `segment_metadata.biblical_verse_number` — jamais `verse_number`, déjà pris.',
    contenu: (
      <>
        <p style={{ ...styleParagrapheLecture(), margin: 0 }}>
          <Segment n={415}>Le Seigneur parla ainsi par la bouche de son prophète :</Segment>
        </p>
        <div className="citation-versets">
          <span className="citation-verset"><sup className="num-verset">2</sup>La terre était informe et vide ; les ténèbres couvraient l’abîme, et l’Esprit de Dieu était porté sur les eaux.</span>
          <span className="citation-verset"><sup className="num-verset">3</sup>Or Dieu dit : Que la lumière soit ; et la lumière fut.</span>
          <span className="citation-verset"><sup className="num-verset">4-5</sup>Et Dieu vit que la lumière était bonne ; et il sépara la lumière d’avec les ténèbres.</span>
        </div>
      </>
    ),
  },
  {
    style: 'patristique/vers',
    note: 'Une ligne de poésie. Alinéa de base de 1,5 em, alinéas poétiques LUS dans la source, ni justification ni césure — on ne coupe pas un alexandrin —, interligne 1,4, et un retrait de suite qui distingue une ligne trop longue du vers d’après.',
    alerte: '⛔ Un vers ne prend jamais de lettrine : le drop cap est un flottant, et posé dans la boîte d’une ligne il déborde sur les suivantes.',
    contenu: (
      <div style={styleBlocDeVers()}>
        {[
          { t: 'Heureux qui, connaissant les lois de la nature,', rang: 0, strophe: false },
          { t: 'Foule aux pieds les terreurs dont le vulgaire a peur,', rang: 1, strophe: false },
          { t: 'Et regarde d’un œil que rien n’altère ou n’use', rang: 0, strophe: true },
          { t: 'Le sort inévitable, et la mort, et l’erreur.', rang: 1, strophe: false },
        ].map((v, i) => (
          <span key={i} style={styleLigneDeVers({ rang: v.rang, ouvreStrophe: v.strophe })}>
            <Segment>{v.t}</Segment>
          </span>
        ))}
      </div>
    ),
  },
  {
    style: 'patristique/rubrique',
    note: 'Une rubrique éditoriale qui n’est pas un niveau de titre : centrée, en italique, dans le corps de la lecture.',
    contenu: (
      <p style={styleParagrapheLecture({ rubrique: true })}>
        <Segment>Ici commence le livre second.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/texte — retour à la prose',
    note: 'Le fil reprend après la rubrique. C’est ici qu’on juge le blanc : 0,72 rem sous la rubrique, comme sous n’importe quel paragraphe.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={416}>Ayant dit ce qui regarde la création, il faut maintenant parler de celui pour qui elle fut faite.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/signature',
    note: 'Un bloc d’approbations, de censeurs, de souscripteurs : au fer à droite, interligne resserré à 1,32, et un blanc de 0,3 rem seulement entre lignes de même nature.',
    alerte: '⚠️ La base la REFUSAIT jusqu’au 29 août 2026 : le rendu existait, la donnée ne pouvait pas l’atteindre. Contrainte élargie depuis, `chk_segments_nature` porte les quatorze natures de `NATURE_VALIDES`.',
    contenu: (
      <>
        <p style={styleParagrapheLecture({ signature: true })}><Segment>Fr. Jean de Sainte-Marie, censeur.</Segment></p>
        <p style={styleParagrapheLecture({ signature: true })}><Segment>Fr. Étienne Dubois, prieur.</Segment></p>
      </>
    ),
  },
]

// ══ ÉPREUVE 3 — L'APPARAT D'UNE ŒUVRE ════════════════════════════════════════

const APPARAT_OEUVRES: Unite[] = [
  {
    style: 'patristique_apparat/apparat_auteur',
    note: 'Préface, digression, argument ou autre paratexte rédigé par L’AUTEUR de l’œuvre. Il appartient à `NATURES_CORPS` et se lit à sa place dans le texte, avec la composition ordinaire.',
    alerte: '⛔ Son retrait de `NATURES_CORPS` avait fait disparaître, le 18 août 2026, le « Prologue de Rufin aux livres X et XI ». À ne pas confondre avec `apparat_critique`, l’apparat de l’ÉDITEUR.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={1}>Prologue de Rufin aux livres X et XI. Il m’a paru bon de joindre à cette traduction ce que l’auteur n’avait pas écrit, afin que l’histoire ne s’arrêtât point au milieu du chemin, et que le lecteur, conduit jusqu’au seuil de son propre temps, pût mesurer d’un seul regard le chemin parcouru par l’Église.</Segment>{' '}
        <Segment n={2}>J’ai donc pris sur moi de continuer, non de corriger : ce qui suit n’est pas d’Eusèbe, et je serais bien fâché qu’on le lui attribuât un jour.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique_apparat/apparat_editeur',
    note: 'Préface ou avertissement du traducteur, privilège, approbation : un paratexte EXTÉRIEUR à l’œuvre de l’auteur. Une contrainte de base lui impose `espace_textuel = apparat_critique`.',
    contenu: (
      <p style={styleParagrapheApparat()}>
        <Segment n={3}>Avertissement du traducteur. On a suivi pour cette édition le texte de Migne, corrigé sur les leçons de Knöll partout où le sens l’exigeait, et sans jamais toucher à la ponctuation sans le dire.</Segment>{' '}
        <Segment n={4}>Les divisions en chapitres sont celles de l’édition de 1679 ; celles des paragraphes appartiennent à la présente traduction, et n’engagent que nous.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique_apparat/apparat_critique',
    note: 'L’apparat de l’éditeur, qui a sa propre vue dans la page d’œuvre — le même paragraphe, mais dans un autre onglet.',
    alerte: '⛔ L’apparat ne sort pas ses citations : c’est une vue de comparaison, pas la lecture suivie.',
    contenu: (
      <p style={styleParagrapheApparat()}>
        <Segment n={5}>Knöll conjecture ici <em>inspirent</em> ; les manuscrits portent <em>inspire</em>, que Migne avait gardé sans le discuter.</Segment>{' '}
        <Segment n={6}>La leçon du Parisinus, <em>inspirat</em>, n’est attestée nulle part ailleurs et paraît une correction d’atelier.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique_apparat/texte original — en regard',
    note: 'La langue originale mise en regard du français. Elle passe alors en SANS : la différence de police distingue les deux colonnes d’un coup d’œil, mieux qu’un filet et sans peser sur le latin.',
    alerte: 'Lue SEULE, la même langue reste en sérif comme le reste de l’œuvre. C’est le regard qui change la police, non la langue.',
    contenu: (
      <div className="para-bilingue">
        <p style={styleParagrapheLecture()}>
          <Segment n={7}>Vous nous avez faits pour vous, et notre cœur est sans repos tant qu’il ne se repose en vous. C’est la première phrase du livre, et déjà tout y est dit.</Segment>
        </p>
        <p className="texte-original" style={{ fontSize: '0.78125rem', lineHeight: 1.5, margin: 0 }}>
          Fecisti nos ad te et inquietum est cor nostrum donec requiescat in te.
        </p>
      </div>
    ),
  },
]

// ══ ÉPREUVE 4 — L'APPARAT D'UNE BIBLE ════════════════════════════════════════

const APPARAT_BIBLES: Unite[] = [
  {
    style: 'bible_apparat/introduction_livre — I1, titre T2',
    note: 'L’introduction d’un livre. Elle porte un VRAI titre, de rang T2, et c’est le GENRE qui titre : le lecteur sait déjà quel livre il ouvre, le nom du livre passe donc en chapeau.',
    contenu: (
      <Bible bloc={blocBible('introduction_livre', [
        'Le premier évangile a été écrit par l’apôtre saint Matthieu, publicain de son état, appelé aussi Lévi. La tradition est unanime sur ce point, et la critique la plus sévère n’a rien trouvé à lui opposer.',
      ], { heading: 'Évangile selon saint Matthieu — Introduction', niveauHtml: 2 })} />
    ),
  },
  {
    style: 'bible_apparat/intertitre divisé — kind: heading',
    note: 'Un intertitre porte souvent sa désignation puis son objet. On les compose en titre et chapeau, la coupure se faisant au tiret ENTOURÉ D’ESPACES. La paire retombe sur son rang, qui centre les trois hauts.',
    alerte: '⛔ Un intertitre qui porte une locution marquée ou un appel de note n’est PAS coupé : leurs offsets pointent dans le texte entier. Et le blanc au-dessus vaut 4 rem : il sépare deux sections, il n’aère pas un titre.',
    contenu: (
      <Bible bloc={{
        id: 'epreuve-intertitre',
        semanticStyleCode: 'introduction_bible',
        placement: 'before',
        niveauHtml: 2,
        textBlocks: [
          { id: 'h', kind: 'heading', form: 'prose', text: 'I — Ce qu’est la Bible', language: 'fr', headingLevel: 'T3', presentation: { textAlign: 'left', fontStyle: 'normal' } },
          { id: 'p', kind: 'commentary', form: 'prose', text: 'Étymologiquement, c’est « le Livre » par excellence, le livre des livres. Telle est, en effet, la signification du mot Bible, qui dérive du grec par l’intermédiaire du latin.', language: 'fr' },
        ],
      }} />
    ),
  },
  {
    style: 'bible_apparat/notice_bible — sous-type critical_apparatus',
    note: 'L’apparat de bas de page, rendu dans un `<aside>` : à côté du fil, jamais dedans. Corps réduit à 0,78 rem.',
    contenu: (
      <Bible bloc={blocBible('notice_bible', [
        '1. Le mot grec τὰ βιβλία, « les livres », est devenu en bas latin un féminin singulier. — 2. Dan. IX, 2 ; I Mach. XII, 9 ; II Mach. VIII, 23.',
      ], { noticeSubtype: 'critical_apparatus' })} />
    ),
  },
  {
    style: 'bible_apparat/citation sortie — introductions et notices',
    note: 'La règle des œuvres vaut ici depuis le 28 août 2026, pour les natures `introduction` et `notice` seulement. La citation quitte le fil, perd ses guillemets encadrants et prend le retrait.',
    alerte: '⛔ Pas dans un commentaire de péricope ou de verset : on y cite en une ligne, et le retrait l’y noierait. Portée réelle du corpus : un paragraphe sur 3 221.',
    contenu: (
      <Bible bloc={blocBible('introduction_bible', [
        'À notre époque, Stolberg écrivait au sujet de la Bible : « Toutes les parties de ce livre sont unies de la façon la plus étroite par une relation unique, la relation qu’elles ont à Jésus-Christ, l’Oint de Dieu, le Sauveur d’Israël, le Sauveur de l’humanité. Sans lui, l’histoire sainte entière n’aurait ni enchaînement ni but. Non, elle n’en aurait pas, puisqu’il est l’objet perpétuel des promesses, des coutumes religieuses, de l’attente nationale, des aspirations ardentes des hommes de Dieu. »',
      ])} />
    ),
  },
  {
    style: 'bible_apparat/titre_partie_livre — T2',
    note: 'Une partie du livre : centrée, chasse large, encre foncée. Elle ouvre sur 3 rem de blanc.',
    contenu: <Bible bloc={blocBible('titre_partie_livre', [], { heading: 'PREMIÈRE PARTIE — La vie publique de Jésus.', niveauHtml: 2 })} />,
  },
  {
    style: 'bible_apparat/titre_sous_section — T4',
    note: 'Les trois rangs bas passent AU FER et changent de corps : c’est la pose, non la taille seule, qui les sépare des rangs hauts.',
    contenu: <Bible bloc={blocBible('titre_sous_section', [], { heading: '1° La personne de l’auteur', niveauHtml: 4 })} />,
  },
  {
    style: 'bible_apparat/titre_paragraphe_livre — T5',
    note: 'La division « § » de Fillion, entre la sous-section et la péricope : « La Création. I, 1 — II, 3. » (T4) contient « L’Œuvre des six jours », qui contient les six jours (T6). Au fer, corps intermédiaire.',
    alerte: '⚠️ Deux styles au rang T5, et ils ne se rencontrent pas : le CHAPITRE y vit sur l’axe matériel — il traverse la hiérarchie sans la commander, et ne paraît pas —, le PARAGRAPHE sur l’axe analytique. Ce rang manquait au registre jusqu’au 2026-08-29, et ses trente-quatre blocs de la Genèse ne paraissaient nulle part.',
    contenu: (
      <>
        <Bible bloc={blocBible('titre_paragraphe_livre', [], { heading: '2. L’Œuvre des six jours. I, 2-32.', niveauHtml: 5 })} />
        <Bible bloc={blocBible('titre_pericope', [], { heading: '1. Le Premier Jour. I, 2-5.', niveauHtml: 6 })} />
      </>
    ),
  },
  {
    style: 'bible_apparat/titre_pericope — T6',
    note: 'Le rang le plus bas : au fer, en ITALIQUE, avec de l’air au-dessus et peu au-dessous — le texte qui suit lui appartient.',
    contenu: <Bible bloc={blocBible('titre_pericope', [], { heading: '3. Ce qui suivit la mort de Jésus (27, 51-56)', niveauHtml: 6 })} />,
  },
  {
    style: 'bible_apparat/commentaire_pericope — I5',
    note: 'Le style le plus employé du corpus : 2 169 blocs. Son repère devient une MANCHETTE flottante, posée en tête du développement, que le commentaire habille — la disposition du fac-similé.',
    alerte: '⛔ Rien ne délimite la manchette qu’un blanc : ni filet, ni fond, ni pictogramme.',
    contenu: (
      <Bible bloc={blocBible('commentaire_pericope', [
        'Le voile du temple se déchira. Ce voile séparait le Saint des saints du reste de l’édifice ; sa déchirure marquait la fin de l’ancienne alliance et l’ouverture du sanctuaire à tous les peuples.',
        'Et la terre trembla. Saint Jérôme rapporte que les pierres brisées se voyaient encore de son temps.',
      ], { heading: '51. Le voile du temple' })} />
    ),
  },
  {
    style: 'bible_apparat/locutions marquées — inline_spans',
    note: 'Sémantiques, jamais déduites du texte ni posées en CSS. Le grec, le latin, une abréviation, un titre d’ouvrage : tous en italique avec leur `lang`. Une citation en ligne prend ses guillemets français, qui restent en ROMAIN.',
    alerte: '⛔ La paire de guillemets ne se pose qu’UNE fois. Un appel de note tombé au milieu coupait jadis la locution en fragments, et chaque fragment reprenait sa paire.',
    contenu: (
      <Bible bloc={{
        id: 'epreuve-spans',
        semanticStyleCode: 'commentaire_pericope',
        placement: 'before',
        textBlocks: [{
          id: 's', kind: 'commentary', form: 'prose', language: 'fr',
          text: 'Le mot grec βιβλία désigne les livres ; voir Vigouroux, Manuel biblique, sur ce point discuté.',
          inlineSpans: [
            { kind: 'foreign_expression', rendering: 'italic', language: 'grc', startOffsetUnicode: 13, endOffsetUnicode: 20 },
            { kind: 'bibliographic_title', rendering: 'italic', language: 'fr', startOffsetUnicode: 55, endOffsetUnicode: 70 },
          ],
        }],
      }} />
    ),
  },
  {
    style: 'bible_apparat/titre_chapitre_livre — T5',
    note: 'La mention imprimée « CHAPITRE IX ». Elle reste dans la donnée comme témoin matériel de l’édition, et traverse l’axe analytique — c’est sa PLACE qui compte.',
    alerte: '⛔ JAMAIS AFFICHÉE (charte § 35.1) : la barre de navigation nomme déjà le chapitre. L’épreuve ci-contre est donc VIDE, et c’est la bonne réponse.',
    contenu: <Bible bloc={blocBible('titre_chapitre_livre', ['Ceci ne doit pas paraître.'], { heading: 'CHAPITRE IX', niveauHtml: 5 })} />,
  },
]

export const EPREUVES: Epreuve[] = [
  {
    cle: 'bible',
    libelle: 'Bible',
    chapeau: 'Le texte biblique lui-même. Composition tirée de `app/lib/compositionBible.ts`, celle dont `TexteBible` se sert.',
    unites: BIBLE,
  },
  {
    cle: 'oeuvres',
    libelle: 'Œuvres patristiques',
    chapeau: 'Le corps d’une œuvre. Composition tirée de `app/lib/compositionOeuvre.ts` et de `compositionVers.ts`, celles dont `OeuvreClient` se sert.',
    unites: OEUVRES,
  },
  {
    cle: 'apparat-oeuvres',
    libelle: 'Apparat des œuvres',
    chapeau: 'Ce qui entoure le texte d’une œuvre : les paratextes de l’auteur et de l’éditeur, l’apparat critique, la langue originale en regard.',
    unites: APPARAT_OEUVRES,
  },
  {
    cle: 'apparat-bibles',
    libelle: 'Apparat des bibles',
    chapeau: 'Le paratexte d’une bible commentée — famille Fillion. Rendu par `BlocEditorialBible`, le composant de la page elle-même.',
    unites: APPARAT_BIBLES,
  },
]

