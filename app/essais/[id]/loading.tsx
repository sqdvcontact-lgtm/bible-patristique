import { HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'
import { Barre, Blanc, MotAttente, StyleVoletsEnCreux, VoletEnCreux } from '@/app/lib/attenteEnCreux'

// L'écran d'attente d'une publication, dessiné EN CREUX comme la Bible et l'œuvre
// (`app/loading.tsx`, `app/oeuvre/[id]/loading.tsx`) : le volet de gauche à la largeur
// de son premier rendu (`EssaiClient`, 15 rem), vide, et le mot centré dans le bloc de
// lecture, là où le texte va paraître. Il ne paraît qu'en changeant de ROUTE, depuis la
// liste des publications ; le mot ne vient qu'au bout d'un instant
// (`cs-attente-paraitre`), une arrivée rapide ne montrant que le châssis.
//
// ⛔ Pas de rembourrage sous la barre : `#cs-corps` le pose déjà (AGENTS.md).
export default function EssaiLoading() {
  return (
    <main aria-busy="true" style={{ display: 'flex', height: HAUTEUR_SOUS_NAVBAR, overflow: 'hidden', background: 'var(--cs-fond)' }}>
      <StyleVoletsEnCreux />
      <VoletEnCreux largeur="15rem" fond="var(--cs-fond-clair)" cote="gauche">
        <Barre largeur="38%" />
        <Barre largeur="88%" />
        <Barre largeur="64%" />
        <Blanc />
        <Barre largeur="30%" />
        <Blanc />
        <Barre largeur="72%" />
        <Barre largeur="58%" />
        <Barre largeur="66%" />
      </VoletEnCreux>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <MotAttente />
      </div>
    </main>
  )
}
