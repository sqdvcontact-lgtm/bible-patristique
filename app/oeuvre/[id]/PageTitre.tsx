import type { Props, ChampOeuvre } from './oeuvreTypes'
import { rendreTexteEnrichi } from './texteEnrichi'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'

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

/** « / » pour les co-éditeurs, jamais le « ; » brut du catalogue. */
export function formaterEditeur(editeur: string | null | undefined): string {
  return (editeur ?? '').replace(/\s*;\s*/g, ' / ').trim()
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
  position: 'absolute', fontSize: '11px', color: '#c8c0b4',
  background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1,
}

// ── Page de titre ─────────────────────────────────────────────────────────────
export default function PageTitre({ auteur, oeuvre, titre, estAdmin, onModifier }: {
  auteur: string
  oeuvre: Props['oeuvre']
  titre: string
  estAdmin: boolean
  onModifier: (champ: ChampOeuvre, valeurActuelle: string) => void
}) {
  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 118px 60px 48px', borderBottom: '1px solid #d6d0c4',
      marginBottom: '56px', textAlign: 'center',
    }}>
      <p style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#3d6b4f', marginBottom: '32px' }}>
        {auteur}
      </p>

      {/* Titre principal */}
      <div style={{ position: 'relative', maxWidth: '560px' }}>
        <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 'normal', color: '#1e2e24', lineHeight: 1.2, marginBottom: oeuvre.sous_titre ? '4px' : oeuvre.titre_original ? '18px' : '32px', whiteSpace: 'pre-line' }}>
          {rendreTexteEnrichi(titre)}
        </h1>
        {estAdmin && (
          <button onClick={() => onModifier('titre', titre)} title="Modifier le titre de l'œuvre"
            style={{ ...BTN, right: '-24px', top: 0 }}>✎</button>
        )}
      </div>

      {/* Sous-titre */}
      {(oeuvre.sous_titre || estAdmin) && (
        <div style={{ position: 'relative', maxWidth: '560px' }}>
          <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 'clamp(16px, 2vw, 20px)', fontStyle: 'normal', color: '#6f675f', margin: oeuvre.titre_original ? '0 0 22px' : '0 0 40px', lineHeight: 1.32, whiteSpace: 'pre-line', minHeight: oeuvre.sous_titre ? undefined : estAdmin ? '1em' : undefined }}>
            {oeuvre.sous_titre ? rendreTexteEnrichi(oeuvre.sous_titre) : estAdmin ? <span style={{ color: '#d6d0c4', fontStyle: 'italic', fontSize: '13px' }}>Sous-titre…</span> : null}
          </p>
          {estAdmin && (
            <button onClick={() => onModifier('sous_titre', oeuvre.sous_titre ?? '')} title="Modifier le sous-titre"
              style={{ ...BTN, right: '-20px', top: 0 }}>✎</button>
          )}
        </div>
      )}

      {/* Titre original */}
      {(oeuvre.titre_original || estAdmin) && (
        <div style={{ position: 'relative', maxWidth: '560px' }}>
          <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: 'clamp(15px, 2vw, 19px)', fontStyle: 'italic', color: '#8a8278', marginBottom: '40px', letterSpacing: 0, whiteSpace: 'pre-line' }}>
            {oeuvre.titre_original ? oeuvre.titre_original : estAdmin ? <span style={{ color: '#d6d0c4', fontSize: '13px' }}>Titre original…</span> : null}
          </p>
          {estAdmin && (
            <button onClick={() => onModifier('titre_original', oeuvre.titre_original ?? '')} title="Modifier le titre original"
              style={{ ...BTN, right: '-20px', top: 0 }}>✎</button>
          )}
        </div>
      )}

      <div style={{ width: '40px', height: '1px', background: '#c8c0b4', marginBottom: '32px' }} />

      {/* Traducteur */}
      {(oeuvre.trad_auteur || estAdmin) && (
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: '13px', color: '#7a7268', marginBottom: '6px' }}>
            {oeuvre.trad_auteur ? <>{libelleTrad(oeuvre.trad_auteur)}</> : estAdmin ? <span style={{ color: '#d6d0c4', fontStyle: 'italic', fontSize: '12px' }}>Traduction de…</span> : null}
          </p>
          {estAdmin && (
            <button onClick={() => onModifier('trad_auteur', oeuvre.trad_auteur ?? '')} title="Modifier le traducteur"
              style={{ ...BTN, right: '-18px', top: 0 }}>✎</button>
          )}
        </div>
      )}

      <p style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#b0a89e', marginBottom: '4px' }}>
        Corpus Scriptura
      </p>
      {(oeuvre.editeur || oeuvre.ville || oeuvre.date_publication) && (
        <p style={{ fontSize: '11px', color: '#c0b8b0' }}>
          {formulerProvenance(oeuvre.editeur, oeuvre.ville, formaterDateHistorique(oeuvre.date_publication))}
        </p>
      )}
    </div>
  )
}
