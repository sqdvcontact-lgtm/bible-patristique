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
 *  — `app/lib/compositionOeuvre.ts` : la lecture d'une œuvre (titres de niveau,
 *    paragraphe, lettrine, argument, numéro de segment) — `OeuvreClient` s'en sert ;
 *  — `app/lib/compositionBible.ts` : la rangée de verset et l'axe de la page —
 *    `TexteBible` s'en sert aussi ;
 *  — `app/lib/compositionVers.ts`, `compositionVersets.ts` : les mesures ;
 *  — `app/lib/appelsDeNote.ts` : la forme de l'appel et de son séparateur ;
 *  — `app/lib/marqueurs899.tsx` : les marqueurs éditoriaux du manuscrit ;
 *  — `globals.css` : les classes (`.citation-sortie`, `.citation-versets`,
 *    `.cs-bible-*`, `.cs-apparat-bibliographie`, `.texte-original`) ;
 *  — `BlocEditorialBible`, `BibliographieOuvrages`, `BibliographieBible` : le
 *    paratexte biblique et ses bibliographies, par les composants eux-mêmes.
 *
 * ⛔ Une épreuve qui rejouerait une composition de mémoire dériverait au premier
 * réglage, et ferait ensuite autorité contre la page qu'elle décrit. En ajouter
 * une, c'est d'abord SORTIR la composition de son composant — c'est ce qu'on a fait
 * le 29 août 2026 pour les quatre rangs de titre d'une œuvre et pour la lettrine,
 * qui vivaient en style en ligne dans `OeuvreClient`, recopiés deux fois et déjà
 * divergents.
 *
 * ⚠️ Le TEXTE est de fabrication : il imite le corpus sans en être. Les épreuves
 * doivent porter TOUS les styles, y compris ceux qu'aucune œuvre n'emploie encore,
 * et y compris ceux dont la bonne épreuve est le VIDE.
 */

import type { ReactNode } from 'react'
import BibliographieBible from '@/app/components/BibleBibliographie'
import BibliographieOuvrages from '@/app/components/BibliographieOuvrages'
import { BlocEditorialBible } from '@/app/components/BibleEditionParatext'
import type { BlocEditorialBiblique } from '@/app/components/BibleEditionParatext'
import { separateurAppels, styleAppelNote, styleSeparateurAppels } from '@/app/lib/appelsDeNote'
import type { VarianteAppelNote } from '@/app/lib/appelsDeNote'
import type { OuvrageBibliographique } from '@/app/lib/bibleBibliographieOuvrages'
import {
  STYLE_LACUNE, STYLE_NUMERO_ALTERNATIF, STYLE_NUMERO_VERSET, STYLE_VERSET_VIDE,
  styleAxeTexte, styleBlocVerset, styleGrilleRangee, styleRangeeVerset, styleTexteVerset,
} from '@/app/lib/compositionBible'
import {
  STYLE_LETTRINE, STYLE_NUMERO_SEGMENT, STYLE_PREFIXE_LETTRINE, margeArgument,
  styleArgument, styleBlocDeVers, styleParagrapheApparat, styleParagrapheLecture,
  styleSousTitreNiveau, styleTitreNiveau,
} from '@/app/lib/compositionOeuvre'
import type { RangTitreOeuvre } from '@/app/lib/compositionOeuvre'
import { styleLigneDeVers } from '@/app/lib/compositionVers'
import { rendreMarqueurs899 } from '@/app/lib/marqueurs899'

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

/** Un appel de note, dans l'une de ses trois variantes. */
const Appel = ({ n, variante = 'corps' }: { n: ReactNode; variante?: VarianteAppelNote }) => (
  <sup style={styleAppelNote(variante)}>{n}</sup>
)

/**
 * Une SUITE d'appels — « 2 & 3 », esperluette entre deux insécables.
 *
 * ⛔ Deux exposants collés se liraient « vingt-trois ». Le séparateur prend la forme
 * de l'appel sans se cliquer, et son exposant vient du STYLE et non de la balise :
 * c'est un `<span>`, qu'aucun navigateur ne remonte de lui-même.
 */
const SuiteAppels = ({ numeros, variante = 'corps' }: { numeros: number[]; variante?: VarianteAppelNote }) => (
  <span style={{ whiteSpace: 'nowrap' }}>
    {numeros.map((n, rang) => (
      <span key={n}>
        {rang > 0 && <span style={styleSeparateurAppels(variante)}>{separateurAppels(rang, numeros.length)}</span>}
        <Appel n={n} variante={variante} />
      </span>
    ))}
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

/** La présentation d'un SOUS-TITRE. Le rang, lui, vient de l'ancre : voir `rangDuTitre`. */
const PRESENTATION_SOUS_TITRE = {
  displayRole: 'sous_titre' as const,
  attachToBlockKey: null,
  hierarchyAxis: null,
  outlineRole: null,
  textAlign: null,
  fontStyle: null,
  leadingParagraphStyle: null,
  leadingParagraphAttachedToHeading: false,
}

/**
 * Le CADRE d'un titre d'œuvre — marges, centrage, filet de gauche.
 *
 * ⚠️ Il appartient à la SURFACE et non au style : la lecture et l'apparat n'ont pas
 * les mêmes blancs, et c'est légitime. Seul le CARACTÈRE est partagé, par
 * `styleTitreNiveau`. Ce cadre-ci reprend celui de la lecture.
 */
const TitreOeuvre = ({ rang, titre, sousTitre }: {
  rang: RangTitreOeuvre; titre: string; sousTitre?: string
}) => {
  if (rang === 1 || rang === 2) {
    return (
      <div style={{ textAlign: 'center', marginTop: '1.5rem', marginBottom: rang === 1 ? '1.5rem' : '1rem', paddingTop: '0.5rem' }}>
        {rang === 1
          ? <h2 style={styleTitreNiveau(1)}>{titre}</h2>
          : <h3 style={styleTitreNiveau(2)}>{titre}</h3>}
        {sousTitre && <p style={styleSousTitreNiveau(rang)}>{sousTitre}</p>}
      </div>
    )
  }
  if (rang === 3) {
    return (
      <div style={{ marginTop: '1rem', marginBottom: '0.4rem', paddingLeft: '11px', borderLeft: '1px solid var(--cs-bord)' }}>
        <p style={styleTitreNiveau(3)}>{titre}</p>
        {sousTitre && <p style={styleSousTitreNiveau(3)}>{sousTitre}</p>}
      </div>
    )
  }
  return (
    <p style={styleTitreNiveau(4)}>
      {titre}
      {sousTitre && <span style={styleSousTitreNiveau(4)}>{sousTitre}</span>}
    </p>
  )
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
    note: 'La ligne ordinaire de la lecture, et de très loin la plus fréquente du site. Le numéro se pose dans une gouttière au fer à droite : la colonne du texte reste ainsi rigoureusement stable d’un verset à l’autre, quel que soit le nombre de chiffres du numéro. C’est ce qui permet à l’œil de descendre le chapitre sans jamais chercher où la ligne recommence.',
    contenu: (
      <>
        <Rangee n="1">Au commencement Dieu créa le ciel et la terre.</Rangee>
        <Rangee n="2">La terre était informe et toute nue ; les ténèbres couvraient la face de l’abîme, et l’Esprit de Dieu était porté sur les eaux.</Rangee>
        <Rangee n="3">Or Dieu dit : Que la lumière soit ; et la lumière fut faite.</Rangee>
        <Rangee n="4">Et Dieu vit que la lumière était bonne ; et il sépara la lumière d’avec les ténèbres.</Rangee>
      </>
    ),
  },
  {
    style: 'bible/verset — sélectionné',
    note: 'Le clic teint le bloc numéro + texte d’un seul tenant, sans que la ligne bouge d’un pixel. La gouttière d’actions, elle, reste hors de la teinte : ce qui est désigné, c’est le verset, non les boutons qui l’accompagnent.',
    contenu: <Rangee n="5" actif>Et il appela la lumière jour, et les ténèbres nuit ; et du soir et du matin se fit un jour.</Rangee>,
  },
  {
    style: 'bible/enrichissement en ligne',
    note: 'Cinq marques, stockées dans le texte même et rendues au passage : gras, italique, petites capitales, exposant, et la balise <i> — qui chez Sacy marque les mots AJOUTÉS par le traducteur, absents de la Vulgate et rétablis pour que la phrase française tienne debout.',
    alerte: '⛔ Faute de reconnaître <i>, la page Bible affichait jadis la balise en clair au milieu des versets. Une marque qu’un rendu ne connaît pas ne disparaît pas : elle s’imprime.',
    contenu: (
      <Rangee n="6">
        Dieu dit encore : Que le firmament soit fait au milieu des eaux, et qu’il{' '}
        <strong>sépare</strong> les eaux d’avec <em>les eaux</em>. Et Dieu fit le firmament, et il
        appela le firmament{' '}
        <span style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>ciel</span>.
      </Rangee>
    ),
  },
  {
    style: 'bible/appel de note',
    note: 'L’appel ouvre la note en fenêtre. Il est en exposant, dans l’encre de la lacune, et toujours en ROMAIN quoi que fasse le texte autour de lui. Deux notes qui se suivent s’écrivent « 2 & 3 », esperluette entre deux insécables.',
    alerte: '⛔ Jamais de pointillé sous un appel, ni aucun soulignement, nulle part : l’exposant et la teinte suffisent. ⛔ Et l’appel ne se sépare jamais du point qui le suit ni du mot qui le précède — un `inline-block` offre au navigateur deux occasions de couper la ligne, et le point final tombait seul en tête de la suivante. ⚠️ L’exposant est dans le STYLE, non dans la balise `<sup>` : le séparateur d’une suite est un `<span>`, que rien ne remonterait.',
    contenu: (
      <Rangee n="7">
        Dieu dit aussi : Que les eaux qui sont sous le ciel se rassemblent en un seul lieu, et que
        l’élément aride paraisse<Appel n={1} />. Et cela se fit ainsi<SuiteAppels numeros={[2, 3]} />.
      </Rangee>
    ),
  },
  {
    style: 'bible/verset — numérotation alternative',
    note: 'Quand l’édition suit une autre numérotation que le canon interne, la sienne s’écrit entre parenthèses, en italique et sans graisse : elle accompagne le numéro sans le disputer. C’est le cas ordinaire du Psautier, où la Vulgate et l’hébreu ne comptent pas de la même façon.',
    contenu: <Rangee n="8" alternatif="4,1">Dieu appela l’élément aride, la Terre, et il appela Mers toutes ces eaux amassées.</Rangee>,
  },
  {
    style: 'bible/lacune',
    note: 'Un verset absent du témoin, quand le chapitre est par ailleurs porté. Italique de labeur, teinte effacée : le fait est signalé sans peser sur la lecture, et sans qu’on puisse le confondre avec du texte.',
    alerte: '⛔ Une seule mention, à sa place — et non autant de mentions qu’il manque de versets. Quand le chapitre ENTIER est lacunaire, la page ne les aligne pas non plus : elle en pose UNE, centrée, avec la précision du livre et du chapitre.',
    contenu: (
      <Rangee n="9">
        <span title="Lacune matérielle du manuscrit" style={STYLE_LACUNE}>Lacune du manuscrit</span>
      </Rangee>
    ),
  },
  {
    style: 'bible/verset vide',
    note: 'La traduction ne porte rien pour ce créneau canonique — ce n’est pas une lacune du témoin mais un partage de versets qui diffère d’une édition à l’autre. Un tiret cadratin de la teinte des bords, et rien d’autre.',
    alerte: '⚠️ Ne pas confondre les deux : la LACUNE dit qu’un manuscrit ne porte pas le texte, le VIDE dit qu’une traduction ne le range pas dans ce créneau. Le premier est un fait du témoin, le second un fait d’alignement.',
    contenu: <Rangee n="10"><span style={STYLE_VERSET_VIDE}>—</span></Rangee>,
  },
  {
    style: 'bible/marqueurs éditoriaux — Bible 899',
    note: 'Les marques de la transcription diplomatique, rendues discrètement dans le fil : lecture incertaine, ajout marginal, lacune matérielle. La teinte seule signale, et l’infobulle porte le sens savant — aucun crochet ne reste à l’écran.',
    alerte: '⛔ Ces marqueurs peuvent être À CHEVAL sur deux versets : la recomposition par créneau canonique en ouvre un dans l’un et le ferme dans l’autre. `rendreMarqueurs899` est donc un TOKENISEUR tolérant, qui accepte un marqueur non ouvert comme un marqueur non fermé — sans quoi un crochet brut s’imprimerait.',
    contenu: (
      <>
        <Rangee n="11">
          {rendreMarqueurs899('Et Dieu dit : Que la terre produise de l’herbe verte [lecture incertaine : et qui porte de la graine] et des arbres fruitiers.')}
        </Rangee>
        <Rangee n="12">
          {rendreMarqueurs899('La terre produisit donc de l’herbe verte [ajout marginal : selon son espèce] et des arbres qui portent du fruit.')}
        </Rangee>
        <Rangee n="13">
          {rendreMarqueurs899('Et Dieu vit que cela était bon. [lacune : et du soir et du matin]')}
        </Rangee>
      </>
    ),
  },
  {
    style: 'bible_apparat/bloc dans le fil',
    note: 'Un commentaire de péricope s’intercale entre deux versets, à la place exacte que l’édition lui donne. Il compose deux crans sous le texte biblique, parce qu’il se lit AUTOUR de lui et non à sa place.',
    alerte: '⚠️ Le blanc de 2 rem qui le cerne vient d’une règle de VOISINAGE — `.verset-row + .cs-bible-axe > .cs-bible-bloc` — et non du bloc lui-même : c’est pourquoi l’axe doit être là. Sans lui, le blanc disparaîtrait en silence, et aucun test ne le dirait.',
    contenu: (
      <Bible bloc={blocBible('commentaire_pericope', [
        'Que la lumière soit. Les Pères ont vu dans cette parole la première manifestation du Verbe, par qui tout a été fait, et saint Basile fait observer que la lumière précède ici le luminaire, afin que nul ne rapportât au soleil ce qui n’appartient qu’à Dieu.',
      ], { heading: '3. La première parole' })} />
    ),
  },
  {
    style: 'bible/verset — après un bloc',
    note: 'La lecture reprend. C’est ici qu’on juge le blanc au-dessus de la rangée : celui que la règle de voisinage a ouvert sous le bloc, et non une marge que le verset porterait.',
    contenu: <Rangee n="14">Dieu dit encore : Que les eaux produisent des reptiles vivants et des oiseaux qui volent sur la terre.</Rangee>,
  },
  {
    style: 'bible/verset — EN VERS',
    note: 'Le psaume est de la poésie. Le verset se compose alors comme un vers, avec le style de ligne de partout : ni justification ni césure — on ne coupe pas un stique —, une boîte par ligne, l’alinéa de base et le retrait de suite qui distingue une ligne trop longue du stique d’après.',
    alerte: '⛔ Rien ne l’emploie, et ce n’est pas un oubli : sur les 2 693 versets du Psautier, AUCUNE des quatre traductions ne porte un seul saut de ligne. La coupe des stiques n’existe pas dans la donnée, et elle ne se devine pas — couper à la ponctuation reviendrait à inventer une prosodie. Poser un style avant sa donnée est légitime ; deviner la donnée depuis le style ne l’est pas.',
    contenu: (
      <div className="verset-row" style={styleRangeeVerset()}>
        <div style={styleGrilleRangee()}>
          <div style={styleBlocVerset()}>
            <span style={STYLE_NUMERO_VERSET}>2</span>
            <div data-verse-text style={styleTexteVerset({ enVers: true })}>
              {[
                { t: 'Heureux l’homme qui n’a point marché dans le conseil des impies,', rang: 0, strophe: false },
                { t: 'qui ne s’est point arrêté dans la voie des pécheurs,', rang: 1, strophe: false },
                { t: 'et qui ne s’est point assis dans la chaire de pestilence ;', rang: 1, strophe: false },
                { t: 'mais qui a mis sa volonté dans la loi du Seigneur,', rang: 0, strophe: true },
                { t: 'et qui médite jour et nuit cette loi.', rang: 1, strophe: false },
              ].map((v, i) => (
                <span key={i} style={styleLigneDeVers({ rang: v.rang, ouvreStrophe: v.strophe })}>{v.t}</span>
              ))}
            </div>
          </div>
          <div />
        </div>
      </div>
    ),
  },
]

// ══ ÉPREUVE 2 — LE CORPS D'UNE ŒUVRE PATRISTIQUE ═════════════════════════════

const OEUVRES: Unite[] = [
  {
    style: 'patristique/titre — rang 1',
    note: 'Le titre d’une division majeure : sérif, 1,4375 rem, graisse 500, centré, dans l’encre des titres. Son sous-titre — le `ref_niv1_texte` de la donnée — le suit en italique, un peu plus clair, sans jamais changer de police.',
    alerte: '⚠️ Les quatre rangs vivaient en style EN LIGNE dans `OeuvreClient`, recopiés DEUX fois : une fois pour la lecture, une fois pour l’apparat. Sortis dans `styleTitreNiveau` le 29 août 2026. ⛔ Seul le CARACTÈRE est partagé : le cadre — marges, centrage, filet, place du crayon — appartient à la surface, et les deux flux n’ont pas les mêmes blancs.',
    contenu: <TitreOeuvre rang={1} titre="Livre premier" sousTitre="Où l’auteur montre par quelles voies l’âme se détourne d’elle-même." />,
  },
  {
    style: 'patristique/titre — rang 2',
    note: 'Un cran sous le précédent, toujours en sérif et toujours centré : 1,125 rem, graisse 400, avec une chasse à peine ouverte. La marche entre les deux rangs est franche, car deux rangs à un seizième de rem l’un de l’autre ne se distinguent pas.',
    alerte: '⛔ Ce rang valait DEUX choses jusqu’au 29 août 2026 : 1,125 rem en graisse 400 dans la lecture, 1,0625 rem en graisse 500 dans l’apparat. Deux rendus d’un même rang à un onglet de distance, que rien ne justifiait — `styleParagrapheApparat` n’étant que `styleParagrapheLecture`, les deux surfaces composent leur prose au même corps. Les valeurs de la LECTURE font foi.',
    contenu: <TitreOeuvre rang={2} titre="Chapitre premier" sousTitre="De la connaissance de soi et de celle de Dieu." />,
  },
  {
    style: 'patristique/introduction — l’argument',
    note: 'L’argument qui ouvre une division, hissé en tête, hors des groupes et hors de la pagination. Plus petit que le corps, en italique, d’une encre plus claire, et justifié comme lui. Il annonce ce qui vient sans prétendre en faire partie.',
    contenu: (
      <div className="seg-wrapper" style={{ position: 'relative', margin: margeArgument() }}>
        <div className="seg-p" style={styleArgument()}>
          Saint Chrysostome examine dans cette homélie ce que signifie le nom d’Évangile, et pourquoi
          quatre écrivains ont rapporté une seule histoire sans que la vérité en souffre ; puis il
          montre que la diversité même de leurs récits est la meilleure preuve qu’ils ne se sont
          point concertés.
        </div>
      </div>
    ),
  },
  {
    style: 'patristique/texte — la LETTRINE',
    note: 'Le premier segment d’une division prend une capitale ornée, flottante, haute de trois lignes et demie. Quand le paragraphe s’ouvre sur une ponctuation — un guillemet, un tiret —, celle-ci est glissée DANS le même flottant, en petit corps calé sur le haut de la lettre.',
    alerte: '⛔ Rendue à part, la ponctuation serait rejetée à DROITE de la lettrine, et l’on lirait « [V] «ous… » au lieu de « «Vous… ». ⛔ La lettrine est interdite à un VERS comme à un VERSET : un flottant posé dans la boîte d’une ligne déborde sur les suivantes, qui sont des boîtes sœurs. Elle n’a de sens que dans un paragraphe de prose, dont les lignes coulent.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <span className="seg-inline">
          <span style={STYLE_LETTRINE}>
            <span style={STYLE_PREFIXE_LETTRINE}>&#171;&#8239;</span>V
          </span>
          ous nous avez faits pour vous, et notre cœur est sans repos tant qu’il ne se repose en
          vous. » Il n’est pas de plus grand bien pour l’homme que de connaître sa propre mesure, et
          l’on ne saurait la connaître sans avoir d’abord reconnu celle de Dieu.
        </span>
      </p>
    ),
  },
  {
    style: 'patristique/texte',
    note: 'La prose principale — 91 116 segments, l’immense majorité du corpus. Justifiée, césurée, interligne 1,62. Les segments coulent dans un même paragraphe, se désignent au survol et portent chacun son numéro en exposant discret.',
    alerte: '⚠️ Ce n’est pas un fourre-tout : un lemme, une citation structurelle ou une réplique de dialogue méritent leur nom. Mais c’est le DÉFAUT, et toute nature inconnue y retombe.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={412}>Car c’est en le regardant qu’on apprend ce qu’on est, comme c’est en s’éloignant de la lumière qu’on mesure la longueur de son ombre.</Segment>{' '}
        <Segment n={413}>Celui donc qui veut se connaître doit d’abord lever les yeux, et celui qui les baisse aussitôt vers lui-même ne trouve qu’une nuit qu’il prend pour sa propre substance.</Segment>{' '}
        <Segment n={414}>Il y a là un ordre que rien ne renverse, et les philosophes qui l’ont voulu renverser n’ont pas trouvé l’homme : ils ont trouvé une bête qui raisonne, ce qui n’est pas la même chose.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/texte — l’appel de note',
    note: 'Le même appel que dans la Bible, dans sa variante de CORPS : plus grand que celui d’un titre, dans un brun propre à l’apparat. Il hérite la police et le corps de son contexte, jamais son italique.',
    alerte: '⛔ Un appel de note est toujours en ROMAIN, sur quelque page que ce soit, quoi que fasse le texte autour de lui. Un chapeau, un titre original, un sous-titre d’essai sont en italique ; l’appel qu’ils portent reste droit. ⚠️ L’ancienne règle disait l’inverse et interdisait `fontStyle: normal` : elle est abolie depuis le 28 août 2026.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={415}>Les Grecs ont nommé cette disposition de l’âme du nom de <em>metanoia</em><Appel n={12} />, que nos traducteurs ont rendu tantôt par pénitence, tantôt par changement de sentiment ; et ni l’un ni l’autre ne dit tout à fait ce qu’il faudrait<SuiteAppels numeros={[13, 14]} />.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/titre — rang 3',
    note: 'Le premier des deux rangs bas : il quitte le sérif pour le sans, quitte le centre pour le fer, et prend un filet de gauche qui le rattache à ce qu’il coiffe. Corps 0,78125 rem, graisse 600.',
    alerte: '⚠️ Il se CENTRE quand son intitulé dépasse le seuil du colophon : un titre de trois lignes au fer à gauche cesse d’être un titre. C’est la surface qui en décide, non le style.',
    contenu: <TitreOeuvre rang={3} titre="De ceux qui cherchent Dieu hors d’eux-mêmes" sousTitre="Et pourquoi ils ne le trouvent point." />,
  },
  {
    style: 'patristique/lemme',
    note: 'Le verset biblique qu’un commentaire pose en tête du paragraphe qu’il commente. Il se lit AU FIL DU TEXTE, comme n’importe quel paragraphe, et ne se détache pas : décision de l’auteur du 20 août 2026.',
    alerte: '⛔ Absent de `NATURES_CORPS` jusqu’au 29 août 2026, il n’était tout simplement pas CHARGÉ : les 47 lemmes du Commentaire sur Jonas, œuvre publiée, ne paraissaient nulle part, et la division « Jonas 1, 1 » ouvrait sur une comparaison de traductions dont le verset commenté manquait. Une nature admise par la base et absente de cette liste n’est pas mal composée : elle n’existe pas pour le lecteur, en silence.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={416}>« La parole du Seigneur fut adressée à Jonas, fils d’Amathi, et lui dit… »</Segment>{' '}
        <Segment n={417}>La traduction des Septante est la même, à cette différence près qu’elle porte le nom du père sous une forme grecque, ce qui n’a jamais fait difficulté qu’aux copistes.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/citation',
    note: 'Une citation STRUCTURELLE, dont le rendu RECOLLE les segments : la coupure y est technique, et le lecteur ne doit pas la voir. Le bloc se lit d’un trait, comme un seul passage cité.',
    alerte: '⛔ Ne pas confondre avec la citation EN LIGNE, qui reste dans `texte` et se détache d’elle-même au delà de 400 signes ; ni avec `verset`, où la coupure est au contraire VOULUE par l’édition et doit se voir. Ces trois-là se ressemblent et ne se composent pas de la même façon.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={418}>Le bienheureux Cyprien écrit à ce sujet, dans sa lettre aux confesseurs, que la patience est la vertu qui rend toutes les autres possibles, qu’elle seule fait durer ce que le premier élan a commencé, et que sans elle la charité même se dément au premier obstacle qu’elle rencontre.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/citation sortie',
    note: 'Charte § 3.8. Une citation LONGUE de 400 signes, ISOLÉE par un deux-points et TERMINALE se détache du fil : retrait des deux côtés, corps réduit, ni guillemets ni filet — le retrait suffit à la dire, et les guillemets internes reviennent au français.',
    alerte: '⛔ Les trois conditions sont CUMULÉES : une citation enchâssée sortie laisserait sa phrase d’accueil coupée en deux. C’est la condition « terminale » qui garantit qu’il n’y a rien à replacer après. ⚠️ Le seuil de 400 signes ne se baisse pas pour attraper les lemmes : ceux-là se détachent par leur FONCTION, non par leur taille.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={419}>
          Le prophète, voulant montrer que rien ne se fait sans dessein, rappelle en ces termes le
          commencement de toutes choses :
          <span className="citation-sortie">
            La terre était informe et toute nue ; les ténèbres couvraient la face de l’abîme, et
            l’Esprit de Dieu était porté sur les eaux. Or Dieu dit : Que la lumière soit ; et la
            lumière fut faite. Et Dieu vit que la lumière était bonne, et il sépara la lumière
            d’avec les ténèbres, et il appela la lumière jour, et les ténèbres nuit ; et du soir et
            du matin se fit un jour.
          </span>
        </Segment>
      </p>
    ),
  },
  {
    style: 'patristique/citation sortie — sans annonce',
    note: 'Le segment OUVRE sur le guillemet, et le deux-points qui l’annonçait appartient au texte cité. Il n’y a alors rien à couper, donc aucun bout de phrase orphelin — et le numéro de segment entre DANS le bloc, faute de quoi il resterait seul sur sa ligne.',
    alerte: '⛔ Réservé à la nature `texte`. Une réplique de dialogue est elle aussi entre guillemets : la sortir en ferait à tort une citation d’auteur. Le cas s’est présenté sur Boèce, et c’est ce qui a fixé la règle.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={420}>
          <span className="citation-sortie">
            Le Seigneur dit à Moïse : Prenez les encensoirs de ceux qui ont péri dans leur péché, et
            qu’on les réduise en lames, et qu’on les attache à l’autel, parce qu’ils ont été offerts
            au Seigneur et qu’ils ont été sanctifiés ; et que les enfants d’Israël y voient un signe
            et un monument, afin que nul étranger à la race d’Aaron ne s’approche pour offrir de
            l’encens devant le Seigneur.
          </span>
        </Segment>
      </p>
    ),
  },
  {
    style: 'patristique/titre — rang 4',
    note: 'Le rang le plus bas : sans, corps 0,71875 rem, graisse 600, CAPITALES largement espacées, encre effacée. Son sous-titre reste sur la MÊME ligne, en romain de casse ordinaire — une capitale espacée de plus y ferait deux titres au lieu d’un titre et de sa glose.',
    contenu: <TitreOeuvre rang={4} titre="Première objection" sousTitre="tirée de la parole de l’Apôtre." />,
  },
  {
    style: 'patristique/dialogue',
    note: 'Une réplique, dans un texte qui en compte — 1 038 segments, presque tous dans la Consolation de Boèce, qui est un dialogue d’un bout à l’autre. Elle se compose comme la prose : c’est la nature qui la nomme, non un retrait.',
    alerte: '⛔ Une réplique ne se sort JAMAIS du fil : elle est entre guillemets sans être une citation d’auteur, et la sortir ferait passer la parole d’un personnage pour un texte rapporté. C’est pour cela que la citation sortie est réservée à la nature `texte`.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={421}>« Ô toi, lui dis-je, souveraine consolatrice des âmes découragées, combien tu m’as relevé par le poids de tes sentences et par la douceur de ton chant ! »</Segment>{' '}
        <Segment n={422}>« Je m’en doutais, répondit-elle, et c’est pourquoi j’ai commencé par les remèdes les plus légers : car on ne guérit pas d’un coup une maladie que le temps a nourrie. »</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/vers',
    note: 'Une ligne de poésie. Alinéa de base de 1,5 em, alinéas poétiques LUS dans la source et non déduits d’une parité, ni justification ni césure — on ne coupe pas un alexandrin —, interligne 1,4, et un retrait de suite qui distingue une ligne trop longue du vers d’après.',
    alerte: '⛔ Le vers se déclare par `segment_metadata.forme`, et par rien d’autre : la nature `vers` est sortie du vocabulaire le 29 août 2026 et ses 2 325 segments ont migré. Une nature et une forme qui disent le même fait finissent par diverger — trois lecteurs du site jugeaient déjà le vers sans passer par `estEnVers`. ⛔ Et un vers ne prend jamais de lettrine, pour la raison dite plus haut.',
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
    style: 'patristique/verset',
    note: 'Quand l’édition ne coule pas la citation dans sa prose mais la pose verset par verset. Un segment, un verset ; retrait à GAUCHE seulement — deux marges étrangleraient une suite de lignes déjà rentrées — et un léger blanc entre versets au lieu du blanc de paragraphe.',
    alerte: '⛔ La marque ne dit PAS qu’un passage est une citation biblique, mais que l’ÉDITION le pose verset par verset (charte § 3.8.1, resserrée le 29 août 2026) : une citation coulée dans la prose reste une `citation`. Portée réelle du corpus : deux suites, douze segments — sur 1 109 d’abord marqués, 1 055 étaient des citations glissées dans la prose. ⚠️ Le numéro s’écrit à la main dans `segment_metadata.biblical_verse_number`, jamais `verse_number`, déjà pris par le rang d’un VERS dans son poème.',
    contenu: (
      <>
        <p style={{ ...styleParagrapheLecture(), margin: 0 }}>
          <Segment n={423}>Le Seigneur parla ainsi par la bouche de son prophète :</Segment>
        </p>
        <div className="citation-versets">
          <span className="citation-verset"><sup className="num-verset">2</sup>La terre était informe et toute nue ; les ténèbres couvraient la face de l’abîme, et l’Esprit de Dieu était porté sur les eaux.</span>
          <span className="citation-verset"><sup className="num-verset">3</sup>Or Dieu dit : Que la lumière soit ; et la lumière fut faite.</span>
          <span className="citation-verset"><sup className="num-verset">4-5</sup>Et Dieu vit que la lumière était bonne ; et il sépara la lumière d’avec les ténèbres.</span>
        </div>
      </>
    ),
  },
  {
    style: 'patristique/rubrique',
    note: 'Une rubrique éditoriale qui n’est PAS un niveau de titre : centrée, en italique, dans le corps de la lecture. Elle ne prend ni balise `h*` ni place au plan, et le sommaire l’ignore.',
    contenu: (
      <p style={styleParagrapheLecture({ rubrique: true })}>
        <Segment>Ici commence le livre second.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/texte — retour à la prose',
    note: 'Le fil reprend après la rubrique. C’est ici qu’on juge le blanc : 0,72 rem sous la rubrique, comme sous n’importe quel paragraphe. Une rubrique n’ouvre pas plus d’air qu’elle n’en ferme.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={424}>Ayant dit ce qui regarde la création, il faut maintenant parler de celui pour qui elle fut faite, et montrer par quel dessein l’homme fut placé au milieu d’un monde qui était achevé sans lui.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/texte absent',
    note: 'Une lacune du témoin dans une œuvre patristique — l’équivalent, côté œuvres, de la lacune de la page Bible. UN seul segment du corpus la porte.',
    alerte: '⚠️ Elle appartient à `NATURES_CORPS` et se compose donc comme la prose. Le fait qu’il n’y en ait qu’un ne la rend pas moins nécessaire : c’est le seul moyen de dire, à sa place exacte, que le texte manque.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={425}>[Le reste de ce chapitre manque dans tous les manuscrits connus.]</Segment>
      </p>
    ),
  },
  {
    style: 'patristique/signature',
    note: 'Un bloc d’approbations, de censeurs, de souscripteurs — ce qui ferme un volume ancien. Au fer à droite, interligne resserré à 1,32, et un blanc de 0,3 rem seulement entre lignes de même nature : c’est une liste, non une suite de paragraphes.',
    alerte: '⚠️ La base la REFUSAIT jusqu’au 29 août 2026 : le rendu existait, la donnée ne pouvait pas l’atteindre, et zéro segment la portait — pour cause. Contrainte élargie depuis ; `chk_segments_nature` porte les treize natures de `NATURE_VALIDES`. ⛔ Ne pas la confondre avec `apparat_editeur`, qui porte le paratexte RÉDIGÉ de l’éditeur, quand `signature` n’en porte que les noms et les qualités.',
    contenu: (
      <>
        <p style={styleParagrapheLecture({ signature: true })}><Segment>Fr. Jean de Sainte-Marie, censeur.</Segment></p>
        <p style={styleParagrapheLecture({ signature: true })}><Segment>Fr. Étienne Dubois, prieur.</Segment></p>
        <p style={styleParagrapheLecture({ signature: true })}><Segment>Achevé d’imprimer le troisième jour de mai.</Segment></p>
      </>
    ),
  },
  {
    style: 'patristique/separateur — ÉTEINTE',
    note: 'Conservée pour la compatibilité d’anciens exports, et pour cela seulement. Zéro segment la porte, aucune composition ne lui appartient, et l’épreuve ci-contre est donc VIDE.',
    alerte: '⛔ NE PLUS EN CRÉER. Elle reste au vocabulaire parce qu’un export ancien pourrait encore l’écrire, non parce qu’elle sert. ⚠️ Une nature éteinte se RANGE tout de même : `oeuvreSelects.test.ts` exige que chaque nature valide soit déclarée quelque part — au corps, à l’apparat, ou parmi les formes éteintes. Ajouter une nature sans dire où elle se compose fait échouer les tests, ce qui est le seul moment où l’on peut encore y penser.',
    contenu: null,
  },
]

// ══ ÉPREUVE 3 — L'APPARAT D'UNE ŒUVRE ════════════════════════════════════════

const APPARAT_OEUVRES: Unite[] = [
  {
    style: 'patristique_apparat/titre — rangs 1 et 2',
    note: 'L’apparat porte les mêmes rangs de titre que la lecture, et depuis le 29 août 2026 il les compose de la même façon. Le CADRE diffère — l’apparat resserre ses marges, la lecture les ouvre — et c’est la surface qui en décide.',
    alerte: '⛔ Le rang 2 valait ici 1,0625 rem en graisse 500 quand la lecture le composait à 1,125 rem en graisse 400 : deux rendus d’un même rang, dans la même page, à un onglet de distance. Une forme recopiée à deux endroits ne reste identique que par accident.',
    contenu: (
      <>
        <TitreOeuvre rang={1} titre="Apparat critique" />
        <TitreOeuvre rang={2} titre="Livre premier" />
      </>
    ),
  },
  {
    style: 'patristique_apparat/apparat_auteur',
    note: 'Préface, digression, argument ou autre paratexte rédigé par L’AUTEUR de l’œuvre. Il appartient à `NATURES_CORPS` et se lit à sa place dans le texte, avec la composition ordinaire : c’est du texte d’auteur, pas un appareil.',
    alerte: '⛔ Son retrait de `NATURES_CORPS` avait fait disparaître, le 18 août 2026, le « Prologue de Rufin aux livres X et XI ». À ne pas confondre avec `apparat_critique`, l’apparat de l’ÉDITEUR, qui a sa propre vue.',
    contenu: (
      <p style={styleParagrapheLecture()}>
        <Segment n={1}>Prologue de Rufin aux livres X et XI. Il m’a paru bon de joindre à cette traduction ce que l’auteur n’avait pas écrit, afin que l’histoire ne s’arrêtât point au milieu du chemin, et que le lecteur, conduit jusqu’au seuil de son propre temps, pût mesurer d’un seul regard le chemin parcouru par l’Église.</Segment>{' '}
        <Segment n={2}>J’ai donc pris sur moi de continuer, non de corriger : ce qui suit n’est pas d’Eusèbe, et je serais bien fâché qu’on le lui attribuât un jour.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique_apparat/apparat_editeur',
    note: 'Préface ou avertissement du traducteur, privilège, approbation : un paratexte EXTÉRIEUR à l’œuvre de l’auteur, et qui ne prétend pas en faire partie. Une contrainte de base lui impose `espace_textuel = apparat_critique`.',
    contenu: (
      <p style={styleParagrapheApparat()}>
        <Segment n={3}>Avertissement du traducteur. On a suivi pour cette édition le texte de Migne, corrigé sur les leçons de Knöll partout où le sens l’exigeait, et sans jamais toucher à la ponctuation sans le dire.</Segment>{' '}
        <Segment n={4}>Les divisions en chapitres sont celles de l’édition de 1679 ; celles des paragraphes appartiennent à la présente traduction, et n’engagent que nous.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique_apparat/apparat_critique',
    note: 'L’apparat de l’ÉDITEUR — variantes, collation, conjectures. Il a sa propre vue dans la page d’œuvre : le même paragraphe, mais dans un autre onglet, où il se lit pour lui-même.',
    alerte: '⛔ L’apparat ne SORT pas ses citations : c’est une vue de comparaison, pas la lecture suivie. ⛔ Et un bloc d’apparat critique ne passe NI par la normalisation typographique NI par l’ajout d’un point final : 3 596 entrées portent une haute ponctuation à qui l’on glissait une fine insécable, et 6 604 ne se terminent par aucune ponctuation forte, à qui l’on ajoutait un point que l’éditeur n’a pas écrit.',
    contenu: (
      <p style={styleParagrapheApparat()}>
        <Segment n={5}>Knöll conjecture ici <em>inspirent</em> ; les manuscrits portent <em>inspire</em>, que Migne avait gardé sans le discuter.</Segment>{' '}
        <Segment n={6}>La leçon du Parisinus, <em>inspirat</em>, n’est attestée nulle part ailleurs et paraît une correction d’atelier.</Segment>
      </p>
    ),
  },
  {
    style: 'patristique_apparat/appel de note — variante TITRE',
    note: 'La troisième variante de l’appel, pour un titre : plus petite que celle du corps, et prise dans l’encre du titre à 55 % au lieu du brun de l’apparat. Elle existe pour ne pas crier au milieu d’une ligne composée en grand.',
    alerte: '⚠️ La note d’un titre n’est pas toujours ancrée sur le premier segment du groupe : dans les imports à notes structurées, elle tombe quelques segments plus loin. C’est pourquoi on la cherche dans la SECTION entière à défaut du groupe — sans quoi l’appel s’affichait et n’ouvrait rien.',
    contenu: (
      <div style={{ textAlign: 'center', margin: '1rem 0' }}>
        <h3 style={styleTitreNiveau(2)}>Livre cinquième<Appel n={81} variante="titre" /></h3>
        <p style={styleSousTitreNiveau(2)}>Où il est traité de la providence et du hasard.</p>
      </div>
    ),
  },
  {
    style: 'patristique_apparat/texte original — en regard',
    note: 'La langue originale mise en regard du français. Elle passe alors en SANS : la différence de police distingue les deux colonnes d’un coup d’œil, mieux qu’un filet et sans peser sur le latin. Sa ponctuation est harmonisée au rendu, jamais dans la donnée.',
    alerte: '⚠️ Lue SEULE, la même langue reste en sérif comme le reste de l’œuvre. C’est le REGARD qui change la police, non la langue. ⛔ Et le latin n’est pas césuré par le navigateur : aucun moteur ne livre de dictionnaire de coupure pour cette langue, les points de coupe sont posés par nous, en césures conditionnelles, et retirés du presse-papiers.',
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
  {
    style: 'patristique_apparat/vers',
    note: 'Le MÊME style que dans le corps de l’œuvre : l’apparat compose ses vers comme la lecture les siens. Alinéas, strophe, retrait de suite — rien n’en change, et c’est le propre d’un style qui ne dépend d’aucune surface.',
    alerte: '⛔ Dans l’apparat, la nature vaut déjà `apparat_critique` — c’est par là que le segment est SÉLECTIONNÉ — et elle ne peut pas dire en plus que le passage est en vers : c’est `segment_metadata.forme` qui le déclare. ⚠️ C’est cette nécessité-là qui a fait de la forme la SEULE écriture, dans le corps comme dans l’apparat.',
    contenu: (
      <div style={styleBlocDeVers()}>
        {[
          { t: 'Ô toi qui règles l’univers par une loi durable,', rang: 0, strophe: false },
          { t: 'Semeur de la terre et du ciel, qui du fond des âges', rang: 1, strophe: false },
          { t: 'Ordonnes au temps de courir, et, demeurant en repos,', rang: 0, strophe: true },
          { t: 'Donnes à toute chose le mouvement.', rang: 1, strophe: false },
        ].map((v, i) => (
          <span key={i} style={styleLigneDeVers({ rang: v.rang, ouvreStrophe: v.strophe })}>
            <Segment>{v.t}</Segment>
          </span>
        ))}
      </div>
    ),
  },
]

// ══ ÉPREUVE 4 — L'APPARAT D'UNE BIBLE ════════════════════════════════════════

/** Deux notices réelles de « Du même auteur », pour éprouver la bibliographie STRUCTURÉE. */
const OUVRAGES_EPREUVE: OuvrageBibliographique[] = [
  {
    id: 645, ordre: 1,
    titre: 'Introduction générale aux Évangiles', sousTitre: null,
    lieu: 'Paris', editeur: 'P. Lethielleux', annee: 1889,
    auteur: { nom: 'Louis-Claude Fillion', prenom: 'Louis-Claude', nomFamille: 'Fillion' },
  },
  {
    id: 644, ordre: 2,
    titre: 'Évangile selon saint Matthieu', sousTitre: 'Introduction critique et commentaires',
    lieu: 'Paris', editeur: 'P. Lethielleux', annee: 1878,
    auteur: { nom: 'Louis-Claude Fillion', prenom: 'Louis-Claude', nomFamille: 'Fillion' },
  },
]

const APPARAT_BIBLES: Unite[] = [
  {
    style: 'bible_apparat/titre_livre — T1',
    note: 'Le titre du livre biblique lui-même, au sommet des six rangs. Zéro bloc le porte, et l’épreuve ci-contre est VIDE.',
    alerte: '⛔ JAMAIS RENDU, et c’est délibéré : la page porte déjà le nom du livre dans ses métadonnées, dans son fil d’Ariane et dans sa navigation. Le rang existe pour que la hiérarchie soit complète, non pour paraître. ⚠️ C’est le même parti que `titre_chapitre_livre`, plus bas, et pour la même raison.',
    contenu: null,
  },
  {
    style: 'bible_apparat/introduction_titree — I1, titre T2',
    note: 'L’introduction d’un livre. Elle porte un VRAI titre, de rang T2, et c’est le GENRE qui titre : le lecteur sait déjà quel livre il ouvre, le nom du livre passe donc en chapeau sous « Introduction ».',
    alerte: '⚠️ Le genre remonte en titre quand il FERME l’intitulé, et l’ordre imprimé tient quand il l’ouvre. La règle ne porte pas sur la position : Fillion écrit « Évangile selon saint Matthieu — Introduction » et « Introduction — 1° La personne de l’auteur » dans le même livre.',
    contenu: (
      <Bible bloc={blocBible('introduction_livre', [
        'Le premier évangile a été écrit par l’apôtre saint Matthieu, publicain de son état, appelé aussi Lévi. La tradition est unanime sur ce point, et la critique la plus sévère n’a rien trouvé à lui opposer qui mérite d’être retenu.',
      ], { heading: 'Évangile selon saint Matthieu — Introduction', niveauHtml: 2 })} />
    ),
  },
  {
    style: 'bible_apparat/introduction — I1, en PRÉAMBULE',
    note: 'Une introduction dont l’intitulé n’est qu’un repère, et non un titre. Aux rangs I1 et I2 elle compose en PRÉAMBULE : centrée, rentrée de 12 % des deux côtés, elle s’écarte du fil pour dire qu’on n’est pas encore dans le texte biblique.',
    alerte: '⛔ Le retrait de 12 % ne vaut que dans le FIL d’un chapitre. Dans une pièce liminaire lue SEULE, ce texte n’est pas là : l’introduction EST la page, et le retrait ne ferait que resserrer la mesure — elle se composait sur 23,75 rem quand l’apparat qui la suit garde 31,25 rem, deux moitiés d’une même page imprimée sur deux largeurs. C’est la SURFACE qui décide, jamais le genre du bloc.',
    contenu: (
      <Bible bloc={blocBible('introduction', [
        'Avant d’aborder le récit lui-même, il ne sera pas inutile de rappeler en quelques mots dans quelles circonstances ce livre fut composé, et pour quels lecteurs.',
      ], { semanticLevel: 'I1' })} />
    ),
  },
  {
    style: 'bible_apparat/titre_partie_livre — T2',
    note: 'Une partie du livre : centrée, chasse large, encre foncée, et 3 rem de blanc au-dessus. Les trois rangs hauts restent en SÉRIF et centrés, avec un vrai écart de corps entre eux.',
    alerte: '⛔ Aucun `text-transform` sur un titre biblique, et surtout pas de capitales imposées : celles de « PREMIÈRE PARTIE » viennent de l’ÉDITION. Pour marquer un rang sans crier, employer les petites capitales vraies, qui préservent la casse de la source.',
    contenu: <Bible bloc={blocBible('titre_partie_livre', [], { heading: 'PREMIÈRE PARTIE — La vie publique de Jésus.', niveauHtml: 2 })} />,
  },
  {
    style: 'bible_apparat/sous_titre — sous un T2',
    note: 'Le sous-titre est le CHAPEAU de son titre, tombé dans un bloc voisin par l’ordre matériel de la page imprimée. Sous un rang haut, il se centre comme lui, dans son encre foncée.',
    contenu: (
      <>
        <Bible bloc={blocBible('titre_partie_livre', [], { heading: 'PREMIÈRE PARTIE', niveauHtml: 2 })} />
        <Bible bloc={blocBible('introduction_partie', ['L’enfance et la vie cachée de Jésus (1, 1 - 2, 23).'], {
          presentation: PRESENTATION_SOUS_TITRE, rangDuTitre: 'T2',
        })} />
      </>
    ),
  },
  {
    style: 'bible_apparat/titre_section_livre — T3',
    note: 'Le dernier des trois rangs hauts : encore en sérif et encore centré, mais d’un corps nettement moindre. « Section II », « Le Divin Prélude » — 68 blocs le portent.',
    alerte: '⚠️ Entre deux rangs structurels, la marche est FRANCHE : de la partie à la section, on va de 1,4375 rem à 1,0625 rem, un rapport de 1,4. Deux rangs à un seizième de rem l’un de l’autre ne se distinguent pas.',
    contenu: <Bible bloc={blocBible('titre_section_livre', [], { heading: 'Section II — Le Divin Prélude', niveauHtml: 3 })} />,
  },
  {
    style: 'bible_apparat/intertitre divisé — kind: heading',
    note: 'Un intertitre porte souvent sa désignation puis son objet. On les compose en titre et chapeau, la coupure se faisant au tiret ENTOURÉ D’ESPACES — le tiret collé n’est pas un séparateur. La paire retombe sur son rang, qui centre les trois hauts.',
    alerte: '⛔ Un intertitre qui porte une locution marquée ou un appel de note n’est PAS coupé : leurs offsets pointent dans le texte entier, et le couper les déplacerait. ⛔ Une paire ne prend pas non plus l’alignement reconstruit du fac-similé : appliqué à la paire, il laissait le chiffre romain pendre au bord gauche pendant que son objet occupait la colonne, soit 246 px d’écart entre les deux axes, mesurés sur épreuve. ⚠️ Le blanc au-dessus vaut 4 rem : il sépare deux sections, il n’aère pas un titre. Sauf le PREMIER d’une pièce, qui n’a rien à séparer.',
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
    style: 'bible_apparat/titre_sous_section — T4',
    note: 'Les trois rangs bas passent AU FER et changent de caractère : c’est la POSE, non la taille seule, qui les sépare des rangs hauts. 248 blocs le portent, et c’est le plus employé des rangs bas.',
    contenu: <Bible bloc={blocBible('titre_sous_section', [], { heading: '1° La personne de l’auteur', niveauHtml: 4 })} />,
  },
  {
    style: 'bible_apparat/sous_titre — sous un T4',
    note: 'Le MÊME style sous un titre au fer : il s’y pose au fer, un cran plus petit, dans l’encre de son titre. Le rang vient de l’ANCRE — `attach_to_block_key` —, que la donnée porte déjà pour les 201 sous-titres du corpus.',
    alerte: '⛔ Ni le rôle ni le rang du sous-titre ne disent celui du titre : un `section_subtitle` de rang I3 visait indifféremment un T3, un T4 ou un T5, et les deux échelles divergent dès le quatrième rang — I4 est le CHAPITRE quand T4 est la SOUS-SECTION. Jusqu’au 29 août 2026, 149 sous-titres sur 201 se composaient donc CENTRÉS sous un titre lui-même au fer.',
    contenu: (
      <>
        <Bible bloc={blocBible('titre_sous_section', [], { heading: '1° La personne de l’auteur', niveauHtml: 4 })} />
        <Bible bloc={blocBible('introduction_sous_section', ['Ce que la tradition en a retenu, et ce que le texte en dit.'], {
          presentation: PRESENTATION_SOUS_TITRE, rangDuTitre: 'T4',
        })} />
      </>
    ),
  },
  {
    style: 'bible_apparat/titre_chapitre_livre — T5, axe MATÉRIEL',
    note: 'La mention imprimée « CHAPITRE IX ». Elle reste dans la donnée comme témoin matériel de l’édition, et traverse l’axe analytique sans le commander — c’est sa PLACE qui compte, non son rang.',
    alerte: '⛔ JAMAIS AFFICHÉE (charte § 35.1) : la barre de navigation nomme déjà le chapitre. L’épreuve ci-contre est donc VIDE, et c’est la bonne réponse. ⚠️ La masquer ne suffit PAS : il faut aussi l’axe matériel, sinon le bloc continue d’empiler et le 2° redescend d’un rang sous le 1°. Et `include_in_outline` passe à faux — une entrée de sommaire vers un bloc non rendu serait une ancre sans cible.',
    contenu: <Bible bloc={blocBible('titre_chapitre_livre', ['Ceci ne doit pas paraître.'], { heading: 'CHAPITRE IX', niveauHtml: 5 })} />,
  },
  {
    style: 'bible_apparat/titre_paragraphe_livre — T5, axe ANALYTIQUE',
    note: 'La division « § » de Fillion, entre la sous-section et la péricope : « La Création. I, 1 — II, 3. » (T4) contient « L’Œuvre des six jours », qui contient les six jours (T6). Au fer, corps intermédiaire.',
    alerte: '⚠️ Deux styles au rang T5, et ils ne se rencontrent jamais : le CHAPITRE vit sur l’axe matériel et ne paraît pas, le PARAGRAPHE sur l’axe analytique et compose. Ce rang manquait au registre jusqu’au 29 août 2026, et ses trente-quatre blocs de la Genèse ne paraissaient nulle part.',
    contenu: (
      <>
        <Bible bloc={blocBible('titre_paragraphe_livre', [], { heading: '2. L’Œuvre des six jours. I, 2-32.', niveauHtml: 5 })} />
        <Bible bloc={blocBible('titre_pericope', [], { heading: '1. Le Premier Jour. I, 2-5.', niveauHtml: 6 })} />
      </>
    ),
  },
  {
    style: 'bible_apparat/titre_pericope — T6',
    note: 'Le rang le plus bas, et le plus employé des titres : 880 blocs. Au fer, en ITALIQUE, avec de l’air au-dessus et peu au-dessous — le texte qui suit lui appartient, et le blanc le dit.',
    contenu: <Bible bloc={blocBible('titre_pericope', [], { heading: '3. Ce qui suivit la mort de Jésus (27, 51-56)', niveauHtml: 6 })} />,
  },
  {
    style: 'bible_apparat/commentaire — I5',
    note: 'Le style le plus employé du corpus : 3 091 blocs. Aux rangs I4 à I6, son repère devient une MANCHETTE flottante, posée en tête du développement, que le commentaire habille — la disposition du fac-similé.',
    alerte: '⛔ Rien ne délimite la manchette qu’un blanc : ni filet, ni fond, ni pictogramme. ⚠️ Elle se ferre à GAUCHE et compose en sérif : c’est le début du commentaire, non une étiquette d’interface.',
    contenu: (
      <Bible bloc={blocBible('commentaire_pericope', [
        'Le voile du temple se déchira. Ce voile séparait le Saint des saints du reste de l’édifice ; sa déchirure marquait la fin de l’ancienne alliance et l’ouverture du sanctuaire à tous les peuples, ce que les Pères ont unanimement reconnu.',
        'Et la terre trembla. Saint Jérôme rapporte que les pierres brisées se voyaient encore de son temps, et qu’on les montrait aux pèlerins.',
      ], { heading: '51. Le voile du temple' })} />
    ),
  },
  {
    style: 'bible_apparat/commentaire — I2, sans manchette',
    note: 'Le MÊME style, à une portée plus large. Aux rangs hauts le repère redevient un titre ordinaire au lieu d’une manchette : ce n’est pas un autre style, c’est le même à un autre rang.',
    alerte: '⚠️ C’est tout l’objet du regroupement du 29 août 2026 : sur les 48 styles du paratexte, quarante étaient un produit croisé nature × portée — `commentaire_pericope`, `commentaire_chapitre`, `commentaire_livre`… Or le rendu ne pose que deux classes, et le suffixe ne faisait que répéter la portée. Ils sont douze, et le rang se déclare à part.',
    contenu: (
      <Bible bloc={blocBible('commentaire', [
        'On a beaucoup discuté sur la date de composition de cet évangile. Les uns la placent avant la ruine de Jérusalem, les autres après ; et l’argument tiré du chapitre XXIV, qu’on a longtemps cru décisif, ne l’est pas autant qu’on l’a dit.',
      ], { heading: 'La date de composition', semanticLevel: 'I2' })} />
    ),
  },
  {
    style: 'bible_apparat/l’ÉCHELLE des rangs — I1 à I6',
    note: 'Les six rangs d’INFORMATION à la suite, ce qui est le seul moyen de juger les marches entre eux : le blanc qui les cerne se resserre de 2 rem à 1 rem, l’encre du repère s’efface, et le dernier rang descend d’un cran de corps. Un rang ne se lit jamais seul — il se lit contre son voisin.',
    alerte: '⛔ La bascule tombe entre I3 et I4, et elle change la NATURE du repère : jusqu’à I3 c’est un titre posé au-dessus du développement, à partir de I4 c’est une MANCHETTE flottante que le commentaire habille, à la façon du fac-similé. ⚠️ Ne pas confondre cette échelle avec celle des TITRES : les deux divergent dès le quatrième rang, I4 étant le CHAPITRE quand T4 est la SOUS-SECTION. Aucune arithmétique ne les rapproche, et c’est pourquoi le rang d’un sous-titre vient de son ANCRE.',
    contenu: (
      <>
        {(['I1', 'I2', 'I3', 'I4', 'I5', 'I6'] as const).map((rang) => (
          <Bible
            key={rang}
            bloc={blocBible('commentaire', [
              rang <= 'I3'
                ? 'Jusqu’à ce rang, le repère est un TITRE : il se pose au-dessus du développement, et le blanc qui l’en sépare décroît d’un rang à l’autre.'
                : 'À partir de ce rang, le repère devient une MANCHETTE : il ouvre la première ligne, et le commentaire vient l’habiller comme sur la page imprimée.',
            ], { heading: `Rang ${rang}`, semanticLevel: rang })}
          />
        ))}
      </>
    ),
  },
  {
    style: 'bible_apparat/introduction — rang BAS, dans le fil',
    note: 'La même introduction à une portée étroite : elle appartient alors au fil, au fer et en romain, dans la mesure ordinaire, sous son intertitre. Ce n’est plus un préambule de livre mais un préambule de section.',
    alerte: '⛔ Le même traitement pour les deux faisait flotter au milieu de la page un texte qui accompagne un passage précis. La composition d’une introduction dépend de sa PORTÉE, non de sa seule nature.',
    contenu: (
      <Bible bloc={blocBible('introduction', [
        'Les trois récits qui suivent se rapportent au même épisode, et il n’est pas indifférent de les comparer avant de les lire séparément.',
      ], { semanticLevel: 'I5' })} />
    ),
  },
  {
    style: 'bible_apparat/notice — sous-type critical_apparatus',
    note: 'L’appoint documentaire, rendu dans un APARTÉ — un `<aside>` posé à côté du fil, jamais dedans. Corps réduit. Sa matière se qualifie par `notice_subtype`, qui reste HORS des trois axes : historique, géographique, apparat critique, sigles, tableau de transcription…',
    alerte: '⚠️ Le sous-type qualifie la MATIÈRE, non la place : il ne change pas le style dérivé, et la base le refuse sur autre chose qu’une notice.',
    contenu: (
      <Bible bloc={blocBible('notice_bible', [
        '1. Le mot grec τὰ βιβλία, « les livres », est devenu en bas latin un féminin singulier. — 2. Dan. IX, 2 ; I Mach. XII, 9 ; II Mach. VIII, 23.',
      ], { noticeSubtype: 'critical_apparatus' })} />
    ),
  },
  {
    style: 'bible_apparat/bibliographie — la famille',
    note: 'UNE SEULE famille sert tout l’apparat : « Du même auteur », toute pièce ou section « Bibliographie », et tout bloc que la donnée déclare bibliographique. Retrait SUSPENDU — `padding-left` positif et `text-indent` négatif de même valeur —, et rien d’autre.',
    alerte: '⛔ Aucune puce, aucun tiret, aucun fond, aucune bordure : le marqueur de la donnée dit « entrée », il ne s’imprime pas. ⛔ La BIBLIOGRAPHIE n’est pas un style mais une MATIÈRE, que deux axes déclarent — `notice_subtype = bibliography` sur une notice entière, `leading_paragraph_style = bibliographie` sur le premier paragraphe d’un bloc. Lui donner un style à elle seule aurait mis dans le NOM ce que la matière dit déjà.',
    contenu: (
      <BibliographieBible
        sansHote
        texte={'Ouvrages à consulter :\n— Vigouroux, Manuel biblique, Paris, 1901.\n— Cornely, Introductio in utriusque Testamenti libros sacros, Paris, 1885.\n— Trochon, Introduction générale, Paris, 1886.'}
      />
    ),
  },
  {
    style: 'bible_apparat/bibliographie — la liste STRUCTURÉE',
    note: 'Quand les entrées sont cataloguées, la référence se compose depuis les CHAMPS et non depuis une notice précomposée : nom en petites capitales, titre et sous-titre en italique, lieu, éditeur et année en romain. La ponctuation vient du rendu.',
    alerte: '⛔ L’ORDRE se calcule, il ne se lit plus dans `display_order` : par vedette — nom de famille de l’auteur, ou titre pour une œuvre anonyme, qui se file dans la même suite —, puis prénom, titre, sous-titre, année. ⚠️ La clé de tri retire l’article initial, mais le titre AFFICHÉ le garde ; et la liste des articles exclut à dessein a, de, in, ex, ad, pro, qui sont des mots LATINS : « De civitate Dei » se range à D. ⛔ Ou la liste structurée, ou le repli matériel, jamais un mélange.',
    contenu: <BibliographieOuvrages ouvrages={OUVRAGES_EPREUVE} avecAuteur />,
  },
  {
    style: 'bible_apparat/note_verset — footnote_only',
    note: 'La note de bas de page d’un verset. Elle n’est PAS un bloc de corps : son `placement` vaut `footnote_only`, et l’épreuve ci-contre est donc vide dans le fil. Elle s’ouvre en fenêtre au clic de son appel, et se retrouve en série au bas du chapitre.',
    alerte: '⚠️ Exception de numérotation qui lui est propre : le numéro VISIBLE recommence à chaque chapitre, pour rester lisible, quand l’identifiant interne demeure global et stable. C’est une dérogation assumée à la règle générale de numérotation continue des notes d’œuvre. ⚠️ La série du bas ne disparaît pas pour autant : elle accueille les notes dont la transcription n’a relevé AUCUN point d’appel — 144 des 207 notes internes au 25 août 2026.',
    // ⛔ Aucun bloc à rendre, et c'est le fait lui-même : le type d'un bloc de CORPS
    // n'admet même pas `footnote_only` dans son `placement`. La note de verset ne
    // traverse jamais ce chemin ; elle a le sien, et l'épreuve est donc VIDE.
    contenu: null,
  },
  {
    style: 'bible_apparat/citation sortie — introductions et notices',
    note: 'La règle des œuvres vaut ici depuis le 28 août 2026, pour les natures `introduction` et `notice` seulement. La citation quitte le fil, perd ses guillemets encadrants et prend le retrait des deux côtés.',
    alerte: '⛔ Pas dans un commentaire de péricope ou de verset : on y cite en une ligne, et le retrait l’y noierait. Portée réelle du corpus : UN paragraphe sur 3 221 — la règle est étroite, et c’est voulu. ⛔ On ne sort la citation que si TOUT ce qu’elle porte peut la suivre : une locution à cheval sur la coupure la fait rester au fil, car perdre une italique en silence vaudrait moins que de renoncer au retrait.',
    contenu: (
      <Bible bloc={blocBible('introduction_bible', [
        'À notre époque, Stolberg écrivait au sujet de la Bible : « Toutes les parties de ce livre sont unies de la façon la plus étroite par une relation unique, la relation qu’elles ont à Jésus-Christ, l’Oint de Dieu, le Sauveur d’Israël, le Sauveur de l’humanité. Sans lui, l’histoire sainte entière n’aurait ni enchaînement ni but. Non, elle n’en aurait pas, puisqu’il est l’objet perpétuel des promesses, des coutumes religieuses, de l’attente nationale, des aspirations ardentes des hommes de Dieu. »',
      ])} />
    ),
  },
  {
    style: 'bible_apparat/locutions marquées — inline_spans',
    note: 'Sémantiques, jamais déduites du texte ni posées en CSS. Le grec, le latin, une abréviation, un titre d’ouvrage : tous en italique avec leur `lang`. Une citation en ligne prend ses guillemets français, qui restent en ROMAIN, l’italique s’arrêtant au bord du guillemet.',
    alerte: '⛔ La paire de guillemets ne se pose qu’UNE fois. Un appel de note tombé au milieu coupait jadis la locution en fragments, et chaque fragment reprenait sa paire : on lisait « les hommes de » « Dieu » là où l’édition écrit « les hommes de Dieu ».',
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
    style: 'bible_apparat/vers — form: verse',
    note: 'Quand le commentaire d’une bible cite un passage en vers. Le style de la ligne est celui de partout — l’apparat n’a que sa police, son corps et son encre en propre, et c’est là toute la doctrine des quatre surfaces.',
    alerte: '⛔ On ne DÉCOUPE pas un paragraphe qui porte une locution marquée ou un appel de note : leurs offsets pointent dans le texte entier, et les couper les déplacerait. Un tel paragraphe garde alors son `pre-line`, qui rend les sauts sans les indenter. Même garde que sur l’intertitre divisé et sur la citation sortie.',
    contenu: (
      <Bible bloc={{
        id: 'epreuve-vers-apparat',
        semanticStyleCode: 'commentaire',
        semanticLevel: 'I5',
        placement: 'before',
        textBlocks: [{
          id: 'epreuve-vers-apparat-p', kind: 'commentary', form: 'verse', language: 'fr',
          text: 'Que les cieux répandent leur rosée,\net que les nuées fassent pleuvoir le Juste ;\nque la terre s’ouvre et germe le Sauveur.',
        }],
      }} />
    ),
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
    chapeau: 'Le corps d’une œuvre, ses quatre rangs de titre et ses treize natures de segment. Composition tirée de `app/lib/compositionOeuvre.ts` et de `compositionVers.ts`, celles dont `OeuvreClient` se sert.',
    unites: OEUVRES,
  },
  {
    cle: 'apparat-oeuvres',
    libelle: 'Apparat des œuvres',
    chapeau: 'Ce qui entoure le texte d’une œuvre : les paratextes de l’auteur et de l’éditeur, l’apparat critique, la langue originale en regard, et les titres que l’apparat partage avec la lecture.',
    unites: APPARAT_OEUVRES,
  },
  {
    cle: 'apparat-bibles',
    libelle: 'Apparat des bibles',
    chapeau: 'Le paratexte d’une bible commentée — famille Fillion. Les sept rangs de titre, les quatre natures d’information, la note de verset et les deux bibliographies. Rendu par `BlocEditorialBible`, le composant de la page elle-même.',
    unites: APPARAT_BIBLES,
  },
]
