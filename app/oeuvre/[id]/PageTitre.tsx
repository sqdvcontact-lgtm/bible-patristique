import type { Props } from './oeuvreTypes'
import { rendreTexteEnrichi } from './texteEnrichi'

// ── Page de titre ─────────────────────────────────────────────────────────────
export default function PageTitre({ auteur, oeuvre, titre, estAdmin, onModifierTitre }: { auteur: string; oeuvre: Props['oeuvre']; titre: string; estAdmin: boolean; onModifierTitre: () => void }) {
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
      <div style={{ position: 'relative', maxWidth: '560px' }}>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 'normal', color: '#1e2e24', lineHeight: 1.2, marginBottom: oeuvre.sous_titre ? '4px' : oeuvre.titre_original ? '18px' : '32px', whiteSpace: 'pre-line' }}>
          {rendreTexteEnrichi(titre)}
        </h1>
        {estAdmin && (
          <button onClick={onModifierTitre} title="Modifier le titre de l'œuvre (admin)"
            style={{ position: 'absolute', right: '-24px', top: 0, fontSize: '13px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>✎</button>
        )}
      </div>
      {oeuvre.sous_titre && (
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(16px, 2vw, 20px)', fontStyle: 'normal', color: '#6f675f', margin: oeuvre.titre_original ? '0 0 22px' : '0 0 40px', lineHeight: 1.32 }}>
          {rendreTexteEnrichi(oeuvre.sous_titre)}
        </p>
      )}
      {oeuvre.titre_original && (
        <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 'clamp(15px, 2vw, 19px)', fontStyle: 'italic', color: '#8a8278', marginBottom: '40px', letterSpacing: 0 }}>
          {oeuvre.titre_original}
        </p>
      )}
      <div style={{ width: '40px', height: '1px', background: '#c8c0b4', marginBottom: '32px' }} />
      {oeuvre.trad_auteur && (
        <p style={{ fontSize: '13px', color: '#7a7268', marginBottom: '6px' }}>
          Traduction de {oeuvre.trad_auteur}
        </p>
      )}
      <p style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#b0a89e', marginBottom: '4px' }}>
        Corpus Scriptura
      </p>
      {(oeuvre.editeur || oeuvre.ville || oeuvre.date_publication) && (
        <p style={{ fontSize: '11px', color: '#c0b8b0' }}>
          D&rsquo;après l&rsquo;édition de {[oeuvre.editeur, oeuvre.ville, oeuvre.date_publication].filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  )
}
