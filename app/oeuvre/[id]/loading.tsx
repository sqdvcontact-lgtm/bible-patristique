import { HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'
import { Barre, Blanc, MOT_ATTENTE, StyleVoletsEnCreux, VoletEnCreux } from '@/app/lib/attenteEnCreux'

// L'écran d'attente d'une œuvre. Il ne paraît qu'en changeant de ROUTE, c'est-à-dire
// d'œuvre : un autre texte de la même œuvre garde la page courante jusqu'à ce que la
// suivante soit prête. Le mot ne vient qu'au bout d'un instant (`cs-attente-paraitre`,
// `globals.css`) : une arrivée rapide ne doit rien montrer, et le texte qu'on vient de
// quitter s'est déjà effacé de lui-même (voir `passageTexte.ts`).
//
// La page est dessinée EN CREUX, comme la Bible (`app/loading.tsx`) : le sommaire à
// gauche et le volet biblique à droite, aux largeurs de leur premier rendu
// (`OeuvreClient`, `clamp(240px, 16vw, 380px)` et `clamp(280px, 21vw, 480px)`), vides ;
// le mot se centre dans le BLOC DE TEXTE, entre les deux, là où le texte va paraître.
// Il se centrait sur l'écran entier jusqu'au 2026-09-03, c'est-à-dire à côté de la
// colonne qu'il annonçait (demande de l'auteur).
//
// ⛔ Pas de rembourrage sous la barre : `#cs-corps` le pose déjà (AGENTS.md).
export default function OeuvreLoading() {
  return (
    <main aria-busy="true" style={{ display: 'flex', minHeight: HAUTEUR_SOUS_NAVBAR, background: 'var(--cs-fond)' }}>
      <StyleVoletsEnCreux />
      <VoletEnCreux largeur="clamp(240px, 16vw, 380px)" fond="var(--cs-fond-clair)" cote="gauche">
        <Barre largeur="62%" />
        <Barre largeur="44%" />
        <Blanc />
        <Barre largeur="36%" />
        <Barre largeur="78%" />
        <Barre largeur="70%" />
        <Barre largeur="82%" />
        <Barre largeur="66%" />
      </VoletEnCreux>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={MOT_ATTENTE}>Chargement…</p>
      </div>
      <VoletEnCreux largeur="clamp(280px, 21vw, 480px)" fond="var(--cs-surface)" cote="droite">
        <Barre largeur="40%" />
        <Blanc hauteur="10px" />
        <Barre largeur="88%" />
        <Barre largeur="74%" />
        <Barre largeur="80%" />
      </VoletEnCreux>
    </main>
  )
}
