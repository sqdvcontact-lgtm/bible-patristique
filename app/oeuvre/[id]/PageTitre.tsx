import type { Props, ChampOeuvre } from './oeuvreTypes'
import { rendreTexteEnrichi } from './texteEnrichi'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { resoudreEditeur } from '@/app/lib/editeurs'
import IconeCrayon from '@/app/components/IconeCrayon'
import { MarqueImprimeur } from './Ornements'
import { sansPointFinal } from '@/app/lib/titres'

const TITRES_RE = /^(M\.|Mme\.?|Mlle\.?|Dr\.?|Pr\.?|Dom |Père |Frère |Sœur |Abbé |Saint |Sainte |Rev\.? ?|Mgr\.?|R\.\s*P\.|l['']abbé|le père)/i

/** « A ; B » → « A et B » ; « A ; B ; C » → « A, B et C ».
 *  Le point-virgule est la façon dont le catalogue sépare les noms ; il n'a
 *  rien à faire dans une phrase affichée. */
export function enumererNoms(noms: string[]): string {
  if (noms.length <= 1) return noms[0] ?? ''
  return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`
}

// Titres à passer en minuscule à l'affichage (ils suivent « Traduction … », donc pas
// en début de phrase). On ne touche PAS à « Saint(e) », partie du nom propre.
const TITRE_MINUSCULE_RE = /^(Abbé|Dom|Père|Frère|Sœur|Chanoine|Cardinal|Monseigneur|Mgr|Mère)\b/

/** Affichage d'un éditeur : « / » pour les co-éditeurs (jamais le « ; » brut du catalogue),
 *  et surtout, quand la maison est répertoriée dans la table `editeurs`, on affiche son NOM
 *  COMPLET à la place de la forme rencontrée (« L. Guérin » → « Louis Guérin »). La donnée
 *  brute reste intacte ; tant qu'un éditeur n'est pas répertorié, on garde sa forme nettoyée. */
export function formaterEditeur(editeur: string | null | undefined): string {
  const brut = (editeur ?? '').trim()
  if (!brut) return ''
  return brut.split(/\s*[;/]\s*/).filter(Boolean)
    .map(part => resoudreEditeur(part) ?? part)
    // Barre oblique entre deux éditeurs distincts : une fine insécable (U+202F)
    // de part et d'autre — espace légère, et la barre ne passe pas seule à la ligne.
    .join(' / ')
}

// Quelques maisons dont le nom court appelle l'article contracté « du » (« les Éditions
// du Cerf » → « du Cerf »). On reste conservateur : hors de cette liste, un nom propre
// d'éditeur ne prend pas d'article (« de Gallimard », « de Desclée de Brouwer »).
const EDITEUR_AVEC_DU = new Set(['cerf', 'seuil', 'centurion']);

/** Formule de provenance élégante et grammaticale, sans redondance de « édition » :
 *  - « Cerf, Paris, 1984 »            → « D'après l'édition du Cerf, Paris, 1984 »
 *  - « Éditions du CNRS, Paris »      → « D'après la publication des Éditions du CNRS, Paris »
 *  - « Presses universitaires… »     → « D'après la publication des Presses universitaires… »
 *  - « Imprimerie nationale »        → « D'après la publication de l'Imprimerie nationale »
 *  - « Gallimard, Paris, 1990 »      → « D'après l'édition de Gallimard, Paris, 1990 » */
export function formulerProvenance(
  editeur: string | null | undefined,
  ville: string | null | undefined,
  dateFormatee: string,
): string {
  const ed = formaterEditeur(editeur);
  const lieuDate = [ville, dateFormatee].filter(Boolean).join(', ');
  const suffixe = lieuDate ? `, ${lieuDate}` : '';
  if (!ed) return lieuDate ? `D’après l’édition de ${lieuDate}` : '';

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

/** Nettoyage d'AFFICHAGE d'un nom de traducteur (les données restent intactes) :
 *  masque « — prénom non établi » (gardé en base pour les passes de recherche),
 *  retire un « signalé(e) » superflu en fin, met le titre en minuscule. */
function nettoyerNomTrad(nom: string): string {
  return nom
    .replace(/\s*[—–-]\s*prénom non établi/gi, '')
    .replace(/\s+signalée?\.?\s*$/i, '')
    .replace(TITRE_MINUSCULE_RE, m => m.toLowerCase())
    .trim()
}

export function libelleTrad(trad: string | null | undefined): string {
  const brut = (trad ?? '').split(/\s*;\s*/).map(s => s.trim()).filter(Boolean)
  // « Non établi » n'est pas un nom : traducteur inconnu.
  const noms = brut.map(nettoyerNomTrad).filter(n => n && !/^non établi/i.test(n))
  if (noms.length === 0) {
    return brut.some(b => /^non établi/i.test(b)) ? 'Traducteur non identifié' : ''
  }
  if (noms.length > 1) {
    // Uniformité : préfixe « : » dès qu'un titre (abbé, dom…) est en tête.
    const prefixe = TITRES_RE.test(noms[0]) ? 'Traduction : ' : 'Traduction par '
    return `${prefixe}${enumererNoms(noms)}`
  }
  const t = noms[0]
  if (t.toLowerCase() === 'anonyme') return 'Traduction anonyme'
  if (TITRES_RE.test(t)) return `Traduction : ${t}`
  if (t.includes(' ')) return `Traduction par ${t}`
  return `Traduction de ${t}`
}

const BTN: React.CSSProperties = {
  position: 'absolute', fontSize: '0.6875rem', color: '#c8c0b4',
  background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1,
}

// ── Page de titre ─────────────────────────────────────────────────────────────
export default function PageTitre({ auteur, oeuvre, titre, estAdmin, onModifier, mobile = false }: {
  auteur: string
  oeuvre: Props['oeuvre']
  titre: string
  estAdmin: boolean
  onModifier: (champ: ChampOeuvre, valeurActuelle: string) => void
  mobile?: boolean
}) {
  const SERIF = "var(--font-source-serif), Georgia, serif"
  // Millésime de l'édition en ligne (colophon), estampillé en base à la première
  // publication de l'œuvre (colonne `date_mise_en_ligne`). Absent → ligne masquée.
  const anneeEnLigne = oeuvre.date_mise_en_ligne
    ? new Date(oeuvre.date_mise_en_ligne).getFullYear()
    : null
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', fontFamily: SERIF,
      // Desktop : padding droit plus grand pour recentrer le titre sur le CORPS DU
      // TEXTE seul, en excluant la gouttière des boutons d'action (~62px à droite).
      // Le centre visuel se décale ainsi d'environ 31px vers la gauche. Sur mobile,
      // pas de colonne d'actions : padding symétrique et sobre.
      padding: mobile ? '48px 22px 28px' : '80px 110px 40px 48px',
      marginBottom: '8px', textAlign: 'center',
    }}>
      {/* Nom d'auteur : sérif, corps agrandi, interlettrage resserré (approche des
          lettres) pour une capitale plus dense et plus posée. */}
      <p style={{ fontFamily: SERIF, fontSize: '1.0625rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#345c44', marginBottom: '34px', paddingLeft: '0.12em' }}>
        {auteur}
      </p>

      {/* Titre principal (nom de l'œuvre en français) — agrandi */}
      <div style={{ position: 'relative', maxWidth: '35rem' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(33px, 4.7vw, 50px)', fontWeight: 'normal', color: '#141f18', lineHeight: 1.18, marginBottom: oeuvre.sous_titre ? '14px' : oeuvre.titre_original ? '20px' : '34px', whiteSpace: 'pre-line' }}>
          {/* Affichage = titre_affichage (avec sauts de ligne éditoriaux) si présent,
              sinon le titre canonique. L'édition admin ci-dessous vise le titre canonique. */}
          {rendreTexteEnrichi(sansPointFinal(oeuvre.titre_affichage || titre))}
        </h1>
        {estAdmin && (
          <button onClick={() => onModifier('titre', titre)} title="Modifier le titre de l'œuvre"
            style={{ ...BTN, right: '-24px', top: 0 }}><IconeCrayon size={12} /></button>
        )}
      </div>

      {/* Sous-titre — agrandi, foncé, un peu plus détaché du titre */}
      {(oeuvre.sous_titre || estAdmin) && (
        <div style={{ position: 'relative', maxWidth: '35rem' }}>
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(18px, 2.4vw, 24px)', fontStyle: 'normal', color: '#4a443c', margin: oeuvre.titre_original ? '0 0 24px' : '0 0 42px', lineHeight: 1.34, whiteSpace: 'pre-line', minHeight: oeuvre.sous_titre ? undefined : estAdmin ? '1em' : undefined }}>
            {oeuvre.sous_titre ? rendreTexteEnrichi(sansPointFinal(oeuvre.sous_titre)) : estAdmin ? <span style={{ color: '#d6d0c4', fontStyle: 'italic', fontSize: '0.8125rem' }}>Sous-titre…</span> : null}
          </p>
          {estAdmin && (
            <button onClick={() => onModifier('sous_titre', oeuvre.sous_titre ?? '')} title="Modifier le sous-titre"
              style={{ ...BTN, right: '-20px', top: 0 }}><IconeCrayon size={12} /></button>
          )}
        </div>
      )}

      {/* Titre original */}
      {(oeuvre.titre_original || estAdmin) && (
        <div style={{ position: 'relative', maxWidth: '35rem' }}>
          <p style={{ fontFamily: SERIF, fontSize: 'clamp(16px, 2.1vw, 21px)', fontStyle: 'italic', color: '#7c7369', marginBottom: '42px', letterSpacing: 0, whiteSpace: 'pre-line' }}>
            {oeuvre.titre_original ? oeuvre.titre_original : estAdmin ? <span style={{ color: '#d6d0c4', fontSize: '0.8125rem' }}>Titre original…</span> : null}
          </p>
          {estAdmin && (
            <button onClick={() => onModifier('titre_original', oeuvre.titre_original ?? '')} title="Modifier le titre original"
              style={{ ...BTN, right: '-20px', top: 0 }}><IconeCrayon size={12} /></button>
          )}
        </div>
      )}

      {/* Traducteur — vient AVANT la marque d'imprimeur */}
      {(oeuvre.trad_auteur || estAdmin) && (
        <div style={{ position: 'relative' }}>
          <p style={{ fontFamily: SERIF, fontSize: '0.875rem', color: '#655d54', marginBottom: '6px' }}>
            {oeuvre.trad_auteur ? <>{libelleTrad(oeuvre.trad_auteur)}</> : estAdmin ? <span style={{ color: '#d6d0c4', fontStyle: 'italic', fontSize: '0.75rem' }}>Traduction de…</span> : null}
          </p>
          {estAdmin && (
            <button onClick={() => onModifier('trad_auteur', oeuvre.trad_auteur ?? '')} title="Modifier le traducteur"
              style={{ ...BTN, right: '-18px', top: 0 }}><IconeCrayon size={12} /></button>
          )}
        </div>
      )}

      {/* Commentaire sur la traduction (ex. attribution discutée) — note discrète. */}
      {oeuvre.commentaire_traduction?.trim() && (
        <p style={{ fontFamily: SERIF, fontSize: '0.75rem', fontStyle: 'italic', color: '#8a8278', maxWidth: '30rem', lineHeight: 1.4, margin: '0 0 2px' }}>
          {sansPointFinal(oeuvre.commentaire_traduction)}
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
      {(oeuvre.editeur || oeuvre.ville || oeuvre.date_publication) && (
        <p style={{ fontFamily: SERIF, fontSize: '0.6875rem', color: '#a89f95', marginBottom: '3px' }}>
          {formulerProvenance(oeuvre.editeur, oeuvre.ville, formaterDateHistorique(oeuvre.date_publication))}
        </p>
      )}
      {anneeEnLigne && (
        <p style={{ fontFamily: SERIF, fontSize: '0.6875rem', color: '#a89f95' }}>
          Édition en ligne, {anneeEnLigne}
        </p>
      )}
    </div>
  )
}
