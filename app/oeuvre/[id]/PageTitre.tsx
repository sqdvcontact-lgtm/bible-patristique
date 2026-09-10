import type { Props, ChampOeuvre, VersionTextuelle, NoteAffichee } from './oeuvreTypes'
import { rendreTexteAvecNotes } from './appelNote'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { indexEditeursNavigateur } from '@/app/lib/editeurs'
import { normaliserNomEditeur } from '@/app/lib/editeursNormalisation'
import IconeCrayon from '@/app/components/IconeCrayon'
import { MarqueImprimeur } from './Ornements'
import { memeIntitule, sansPointFinal } from '@/app/lib/titres'
import { adresseEdition } from '@/app/lib/adresseEdition'
import { identiteEdition } from './versionTextuelle'

// Libellé du traducteur : logique pure dans `app/lib/traducteurs.ts` (testée),
// ré-exportée ici pour les appelants historiques.
import { libelleTrad } from '@/app/lib/traducteurs'
import { ENCRE_TITRE, GRAISSE_TITRE } from '@/app/lib/hierarchieTitres'
export { enumererNoms, libelleTrad } from '@/app/lib/traducteurs'

/** Affichage d'un éditeur : « / » pour les co-éditeurs (jamais le « ; » brut du catalogue),
 *  et surtout, quand la maison est répertoriée dans la table `editeurs`, on affiche son NOM
 *  COMPLET à la place de la forme rencontrée (« L. Guérin » → « Louis Guérin »). La donnée
 *  brute reste intacte ; tant qu'un éditeur n'est pas répertorié, on garde sa forme nettoyée. */
export function formaterEditeur(editeur: string | null | undefined): string {
  // Le découpage des co-éditeurs et la jointure vivent dans editeursNormalisation,
  // module partagé avec le serveur ; on ne fournit ici que le cache du navigateur.
  return normaliserNomEditeur(editeur, indexEditeursNavigateur())
}

// Quelques maisons dont le nom court appelle l'article contracté « du » (« les Éditions
// du Cerf » → « du Cerf »). On reste conservateur : hors de cette liste, un nom propre
// d'éditeur ne prend pas d'article (« de Gallimard », « de Desclée de Brouwer »).
const EDITEUR_AVEC_DU = new Set(['cerf', 'seuil', 'centurion']);

/**
 * Formule de provenance élégante et grammaticale, sans redondance de « édition ».
 *
 * ⛔ L'ADRESSE d'une édition se lit « ville, éditeur, année » (charte § 5, rappelé par
 * l'auteur le 5 septembre 2026), et cette phrase la disait à l'envers depuis toujours :
 * « D'après l'édition de Louis Guérin, Bar-le-Duc, 1866 ». La carte d'une bible, qui
 * porte la MÊME phrase, la disait déjà dans le bon ordre — deux frontispices du même
 * site ne peuvent pas nommer une adresse de deux façons.
 *
 * ⚠️ Avec une VILLE, « de » gouverne la ville et l'éditeur la suit en apposition :
 * l'article contracté n'a plus lieu d'être, et la phrase est celle de
 * `libelleEditionTraduction`. Sans ville, « de » gouverne l'ÉDITEUR, et toute la
 * grammaire ci-dessous redevient nécessaire — c'est pourquoi elle reste.
 *
 *  - « Bar-le-Duc, Louis Guérin, 1866 » → « D'après l'édition de Bar-le-Duc, Louis Guérin, 1866 »
 *  - « Cerf, 1984 » (sans ville)        → « D'après l'édition du Cerf, 1984 »
 *  - « Presses universitaires… »        → « D'après la publication des Presses universitaires… »
 *  - « Imprimerie nationale »           → « D'après la publication de l'Imprimerie nationale »
 */
export function formulerProvenance(
  editeur: string | null | undefined,
  ville: string | null | undefined,
  dateFormatee: string,
): string {
  const ed = formaterEditeur(editeur);
  const lieu = (ville ?? '').trim();
  // La ville en tête : « de » la gouverne, et l'adresse suit son ordre normatif.
  if (lieu) return `D’après l’édition de ${adresseEdition({ ville: lieu, editeur: ed, annee: dateFormatee })}`;
  if (!ed) return dateFormatee ? `D’après l’édition de ${dateFormatee}` : '';

  // ⛔ Sans ville, c'est l'ÉDITEUR que « de » gouverne, et l'article se décide sur son nom.
  const suffixe = dateFormatee ? `, ${dateFormatee}` : '';
  const bas = ed.toLowerCase();
  // Le nom porte déjà un mot de publication → on parle de « publication », pas d'« édition ».
  if (/^(é|e)ditions?\b/.test(bas)) return `D’après la publication des ${ed}${suffixe}`;
  if (/^presses\b/.test(bas))       return `D’après la publication des ${ed}${suffixe}`;
  if (/^publications?\b/.test(bas)) return `D’après la publication des ${ed}${suffixe}`;
  if (/^(imprimerie|librairie|maison|fondation|société|societe|association)\b/.test(bas)) {
    const elision = /^[aeiouyàâäéèêëîïôöûüh]/i.test(ed);
    return `D’après la publication de ${elision ? 'l’' : 'la '}${ed}${suffixe}`;
  }

  // Nom court appelant « du », sinon nom propre sans article.
  if (EDITEUR_AVEC_DU.has(bas)) return `D’après l’édition du ${ed}${suffixe}`;
  return `D’après l’édition de ${ed}${suffixe}`;
}

/** Passe l'initiale en bas de casse : « D'après l'édition de… » entre alors dans une
 *  phrase commencée (« Texte latin d'après l'édition de… »). */
function minusculeInitiale(texte: string): string {
  return texte ? `${texte.charAt(0).toLocaleLowerCase('fr-FR')}${texte.slice(1)}` : texte
}

/**
 * La mention de l'ÉDITION MISE EN REGARD, sur la page de titre d'une lecture bilingue.
 *
 * ⛔ **Deux éditions à l'écran, deux mentions sur la page de titre** (demande de
 * l'auteur, 8 septembre 2026 : « elle doit correspondre à l'édition qui est affichée ;
 * si on a deux éditions, il faut faire en conséquence »). « Français & Latin » composait
 * la page de titre de la seule traduction : le lecteur avait le latin de Bondurand sous
 * les yeux, et rien ne le nommait. Le texte établi vient EN PREMIER, la traduction
 * ensuite — l'ordre du titre d'un bilingue.
 *
 * ⚠️ Elle ne paraît QUE lorsqu'une seconde édition existe réellement. Une colonne en
 * regard tirée du repli `segments.texte_original` n'est pas une autre édition : c'est
 * la même, qui porte son original avec elle, et il n'y a rien de plus à nommer.
 */
export function mentionEditionEnRegard(
  version: Pick<VersionTextuelle, 'langue' | 'titre' | 'villeEdition' | 'editeurEdition' | 'dateEdition'>,
): string {
  const langue = version.langue?.trim()
  const tete = langue ? `Texte ${langue.toLocaleLowerCase('fr-FR')}` : 'Texte original'
  const provenance = formulerProvenance(
    version.editeurEdition,
    version.villeEdition,
    formaterDateHistorique(version.dateEdition),
  )
  // Sans adresse, la version se nomme par son intitulé (« Texte latin — Bondurand
  // 1887 ») : mieux vaut un titre de version qu'une tête toute seule.
  if (!provenance) return version.titre?.trim() || tete
  return `${tete} ${minusculeInitiale(provenance)}`
}

const BTN: React.CSSProperties = {
  position: 'absolute', fontSize: '0.6875rem', color: 'var(--cs-bord)',
  background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1,
}

// ── Page de titre ─────────────────────────────────────────────────────────────
export default function PageTitre({ auteur, oeuvre, versionActive, versionEnRegard, titre, estAdmin, onModifier, mobile = false, notes = {} }: {
  auteur: string
  oeuvre: Props['oeuvre']
  versionActive?: VersionTextuelle | null
  // L'édition MISE EN REGARD en lecture bilingue, quand c'en est une autre. Elle se
  // nomme sur la page de titre au même titre que celle qu'on lit : deux éditions à
  // l'écran, deux mentions.
  versionEnRegard?: VersionTextuelle | null
  titre: string
  estAdmin: boolean
  onModifier: (champ: ChampOeuvre, valeurActuelle: string) => void
  mobile?: boolean
  // Notes appelées dans les intitulés de la page de titre : la page de titre les
  // porte comme le corps du texte, à ceci près que l'appel s'y fait minuscule (le
  // titre est composé très large). Vide tant qu'aucun intitulé n'appelle de note.
  notes?: Record<string, NoteAffichee>
}) {
  const SERIF = "var(--font-source-serif), Georgia, serif"
  // Le titre, le sous-titre et le titre original passent par le rendu à notes ;
  // il enrichit le texte exactement comme rendreTexteEnrichi et sait en plus
  // résoudre les appels [[n]].
  const rendreIntitule = (texte: string) => rendreTexteAvecNotes(texte, notes, 'frontispice')
  // Le titre original ne paraît que s'il dit autre chose que le titre affiché.
  // Quand l'œuvre est nommée par son intitulé d'origine (« Confessiones »), le
  // répéter en italique juste dessous ne renseigne personne et fait bégayer le
  // frontispice. L'administrateur, lui, le garde sous les yeux : c'est le champ
  // qu'il doit pouvoir corriger.
  const titreAffiche = oeuvre.titre_affichage || titre
  const titreOriginal = oeuvre.titre_original ?? ''
  const titreOriginalVisible = titreOriginal !== ''
    && (!memeIntitule(titreOriginal, titreAffiche) || estAdmin)
  // ⛔ L'identité de l'édition ne se compose pas de deux éditions : elle se prend à la
  //    version active, silence compris (voir `identiteEdition`).
  const identite = identiteEdition(oeuvre, versionActive)
  const traducteur = identite.traducteur
  const traducteurLabel = identite.traducteurLabel ?? libelleTrad(traducteur)
  const commentaireTraduction = versionActive && !versionActive.isDefault
    ? null
    : oeuvre.commentaire_traduction
  const editeur = identite.editeur
  const ville = identite.ville
  const datePublication = identite.datePublication
  // Millésime de l'édition en ligne (colophon), estampillé en base à la première
  // publication de l'œuvre (colonne `date_mise_en_ligne`). Absent → ligne masquée.
  const anneeEnLigne = oeuvre.date_mise_en_ligne
    ? new Date(oeuvre.date_mise_en_ligne).getFullYear()
    : null
  // ⛔ LES CRAYONS DU FRONTISPICE VONT DANS LA GOUTTIÈRE DE LA PAGE, comme ceux des
  // titres du corps (`right: -52px` du bloc de lecture). Ils n'y allaient pas : le
  // frontispice est une COLONNE FLEX centrée, chacune de ses enveloppes s'y réduisait
  // à son contenu, et un crayon posé à `right: -20px` se collait donc à la FIN DE SA
  // PROPRE LIGNE — mesuré le 2026-09-10, quatre crayons à quatre abscisses
  // différentes, qui bougent avec la longueur du champ (relevé de l'auteur : « le
  // crayon est un peu trop mal placé, généralement »). Les enveloppes prennent
  // désormais toute la mesure du bloc (`alignSelf: 'stretch'`), le texte restant
  // centré par le `text-align` de la racine, et les quatre crayons tombent sur un seul
  // fer.
  // ⚠️ 100 px = les 48 du rembourrage du frontispice, plus les 52 de la gouttière : le
  // crayon d'un titre du corps et celui du titre de l'œuvre se posent alors au MÊME
  // endroit, et l'on n'a la place à trouver qu'une fois. ⚠️ Sur téléphone, le
  // rembourrage tombe à 22 px et la marge n'existe plus : le crayon reste DANS le
  // rembourrage, faute de quoi il sortirait de l'écran.
  const crayonDroite = mobile ? '-18px' : '-100px'
  return (
    // ⚠️ Le repère de la visite se pose ICI, sur la racine du frontispice, et non sur
    // une enveloppe posée autour dans la page : une enveloppe de plus romprait la
    // chaîne de largeurs dont ce bloc dépend (charte, « toute enveloppe posée autour
    // DOIT porter une largeur »).
    <div data-visite="oeuvre-frontispice" style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: SERIF,
      // ⛔ Rembourrage SYMÉTRIQUE. Il ne l'était pas : le côté droit valait 110px contre
      // 48 à gauche, pour recentrer le frontispice sur le corps du texte seul en excluant
      // la gouttière des boutons d'action. Cette gouttière est retirée (2026-08-25, voir
      // `largeurLecture` dans OeuvreClient) : le titre se centre sur le bloc, comme tout
      // le reste, et un rembourrage asymétrique ne ferait plus que le décaler.
      padding: mobile ? '48px 22px 28px' : '80px 48px 40px',
      marginBottom: '8px', textAlign: 'center',
    }}>
      {/* Nom d'auteur : sérif, corps agrandi, interlettrage resserré (approche des
          lettres) pour une capitale plus dense et plus posée. */}
      <p style={{ fontFamily: SERIF, fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-vert-fonce)', marginBottom: '1.05em', paddingLeft: '0.12em' }}>
        {auteur}
      </p>

      {/* Titre principal (nom de l'œuvre en français) — agrandi
          ── LES BLANCS DU FRONTISPICE SE MESURENT EN em ──────────────────────────
          Ils étaient en pixels : 34px sous le nom d'auteur, 42px sous le titre
          original. Or les corps, eux, sont en rem et en clamp, si bien que le titre
          passe de 59px sur un grand écran à 33px sur un téléphone pendant que le
          blanc, lui, ne bougeait pas. Le même 42px valait donc les deux tiers d'un
          titre de bureau et un titre entier sur un téléphone : le groupe des titres
          s'y coupait en deux, et les informations éditoriales paraissaient
          appartenir à autre chose. En em, chaque blanc suit le corps qu'il
          accompagne et la composition garde ses proportions à toute taille. */}
      <div style={{ position: 'relative', alignSelf: 'stretch', maxWidth: '35rem' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(2.0625rem, 4.7vw, 3.125rem)', fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, lineHeight: 1.18, marginBottom: oeuvre.sous_titre ? '0.2em' : titreOriginalVisible ? '0.26em' : '0.42em', whiteSpace: 'pre-line' }}>
          {/* Affichage = titre_affichage (avec sauts de ligne éditoriaux) si présent,
              sinon le titre canonique. L'édition admin ci-dessous vise le titre canonique. */}
          {rendreIntitule(sansPointFinal(titreAffiche))}
        </h1>
        {estAdmin && (
          <button onClick={() => onModifier('titre', titre)} title="Modifier le titre de l'œuvre"
            style={{ ...BTN, right: crayonDroite, top: 0 }}><IconeCrayon size={12} /></button>
        )}
      </div>

      {/* Sous-titre — agrandi, foncé, un peu plus détaché du titre */}
      {(oeuvre.sous_titre || estAdmin) && (
        <div style={{ position: 'relative', alignSelf: 'stretch', maxWidth: '35rem' }}>
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(1.125rem, 2.4vw, 1.5rem)', fontStyle: 'normal', color: 'var(--cs-texte)', margin: titreOriginalVisible ? '0 0 0.5em' : '0 0 1em', lineHeight: 1.34, whiteSpace: 'pre-line', minHeight: oeuvre.sous_titre ? undefined : estAdmin ? '1em' : undefined }}>
            {oeuvre.sous_titre ? rendreIntitule(sansPointFinal(oeuvre.sous_titre)) : estAdmin ? <span style={{ color: 'var(--cs-bord)', fontStyle: 'italic', fontSize: '0.8125rem' }}>Sous-titre…</span> : null}
          </p>
          {estAdmin && (
            <button onClick={() => onModifier('sous_titre', oeuvre.sous_titre ?? '')} title="Modifier le sous-titre"
              style={{ ...BTN, right: crayonDroite, top: 0 }}><IconeCrayon size={12} /></button>
          )}
        </div>
      )}

      {/* Titre original */}
      {(titreOriginalVisible || estAdmin) && (
        <div style={{ position: 'relative', alignSelf: 'stretch', maxWidth: '35rem' }}>
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(1rem, 2.1vw, 1.3125rem)', fontStyle: 'italic', color: 'var(--cs-texte-second)', marginBottom: '1em', letterSpacing: 0, whiteSpace: 'pre-line' }}>
            {titreOriginalVisible ? rendreIntitule(titreOriginal) : estAdmin ? <span style={{ color: 'var(--cs-bord)', fontSize: '0.8125rem' }}>Titre original…</span> : null}
          </p>
          {estAdmin && (
            <button onClick={() => onModifier('titre_original', titreOriginal)} title="Modifier le titre original"
              style={{ ...BTN, right: crayonDroite, top: 0 }}><IconeCrayon size={12} /></button>
          )}
        </div>
      )}

      {/* La NOTE DE LA PAGE DE TITRE (note_editoriale_titre) : un résumé de l'œuvre, qui
          ne paraît qu'ici — ni dans la fiche, ni ailleurs — et qui est vide le plus
          souvent (décision de l'auteur, 2026-09-03). Elle suit le groupe des titres et
          précède ce qui relève de l'édition : elle parle de l'œuvre, pas du livre. En
          romain, sous le titre original en italique, pour ne pas s'y confondre ; et à la
          mesure d'un paragraphe, non d'un titre. */}
      {oeuvre.note_editoriale_titre?.trim() && (
        <p style={{ fontFamily: SERIF, fontSize: 'clamp(0.875rem, 1.6vw, 1rem)', color: 'var(--cs-texte-second)', maxWidth: '30rem', lineHeight: 1.5, margin: '0 0 1.4em', whiteSpace: 'pre-line' }}>
          {rendreIntitule(sansPointFinal(oeuvre.note_editoriale_titre))}
        </p>
      )}

      {/* L'ÉDITION EN REGARD — le texte établi vient AVANT la traduction, comme sur
          le titre d'un bilingue. */}
      {versionEnRegard && (
        <p style={{ fontFamily: SERIF, fontSize: '0.875rem', color: 'var(--cs-texte-second)', marginBottom: '6px' }}>
          {mentionEditionEnRegard(versionEnRegard)}
        </p>
      )}

      {/* Traducteur — vient AVANT la marque d'imprimeur */}
      {/* ⚠️ L'INVITE DE L'ADMINISTRATEUR SUIT LE CRAYON, et le crayon ne paraît que
          sur l'œuvre : sur une version, « Traduction de… » invitait à remplir un champ
          qu'on ne peut pas corriger là — et sur un texte latin, à lui donner un
          traducteur qu'il n'a pas. */}
      {(traducteur || (estAdmin && !versionActive)) && (
        <div style={{ position: 'relative', alignSelf: 'stretch' }}>
          <p style={{ fontFamily: SERIF, fontSize: '0.875rem', color: 'var(--cs-texte-second)', marginBottom: '6px' }}>
            {traducteur ? <>{traducteurLabel}</> : <span style={{ color: 'var(--cs-bord)', fontStyle: 'italic', fontSize: '0.75rem' }}>Traduction de…</span>}
          </p>
          {estAdmin && !versionActive && (
            <button onClick={() => onModifier('trad_auteur', oeuvre.trad_auteur ?? '')} title="Modifier le traducteur"
              style={{ ...BTN, right: crayonDroite, top: 0 }}><IconeCrayon size={12} /></button>
          )}
        </div>
      )}

      {versionActive?.editionDescription && (
        <p style={{ fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte-second)', margin: '2px 0 0' }}>
          {versionActive.editionDescription}
        </p>
      )}

      {/* Commentaire sur la traduction (ex. attribution discutée) — note discrète.
          Comme le titre, le sous-titre et le titre original, il respecte les sauts de
          ligne saisis (`pre-line`) : une page de titre se compose ligne à ligne. */}
      {commentaireTraduction?.trim() && (
        <p style={{ fontFamily: SERIF, fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-gris)', maxWidth: '30rem', lineHeight: 1.4, margin: '0 0 2px', whiteSpace: 'pre-line' }}>
          {sansPointFinal(commentaireTraduction)}
        </p>
      )}

      {/* Marque d'imprimeur — désormais après la traduction */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '26px 0 22px' }}>
        <MarqueImprimeur size={172} />
      </div>

      {/* Colophon : maison d'édition en ligne (vert), rappel de l'auteur,
          provenance de la traduction, millésime de l'édition en ligne. */}
      <p style={{ fontFamily: SERIF, fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--cs-vert)', marginBottom: '6px' }}>
        Corpus Scriptura
      </p>
      {(editeur || ville || datePublication) && (
        <p style={{ fontFamily: SERIF, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', marginBottom: '3px' }}>
          {versionActive?.editionDescription && versionActive.publicationLabel
            ? versionActive.publicationLabel
            : formulerProvenance(editeur, ville, formaterDateHistorique(datePublication))}
        </p>
      )}
      {anneeEnLigne && (
        <p style={{ fontFamily: SERIF, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)' }}>
          Édition en ligne, {anneeEnLigne}
        </p>
      )}
    </div>
  )
}
