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

export function libelleTrad(trad: string | null | undefined): string {
  const noms = (trad ?? '').split(/\s*;\s*/).map(s => s.trim()).filter(Boolean)
  if (noms.length > 1) return `Traduction par ${enumererNoms(noms)}`
  const t = noms[0] ?? ''
  if (!t) return ''
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
          D&rsquo;après l&rsquo;édition de {[oeuvre.editeur, oeuvre.ville, formaterDateHistorique(oeuvre.date_publication)].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  )
}
