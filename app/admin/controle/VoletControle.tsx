'use client'

// Le volet du centre de contrôle : l'intitulé de chaque mission, puis l'état du contrôle v2.
//
// ⚠️ Client pour une seule raison : dire quelle entrée est ouverte. Le layout ne se rend pas
// de nouveau d'une mission à l'autre, et c'est ce qui garde le volet en place sans relire la
// liste ; il ne sait donc pas laquelle on regarde, quand `useSelectedLayoutSegment` le sait.
//
// ⛔ `prefetch={false}` sur chaque lien. Une quinzaine d'entrées préchargées à l'ouverture
// feraient autant de rendus serveur pour un centre qu'on ouvre une mission à la fois, et le
// temps de calcul des fonctions est le budget le plus disputé du site.
import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import { ADRESSE_SYSTEME, SEGMENT_SYSTEME, adresseDeMission } from './missions'

type EntreeVolet = { cle: string; titre: string }

function LienVolet({ href, actif, children }: { href: string; actif: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} prefetch={false} className="cv-nav-lien" aria-current={actif ? 'page' : undefined}>
      <span className="cv-nav-titre">{children}</span>
    </Link>
  )
}

export default function VoletControle({ missions, erreur }: { missions: EntreeVolet[]; erreur: string | null }) {
  const segment = useSelectedLayoutSegment()
  return (
    <aside className="cv-volet">
      <div className="cv-volet-dedans cs-defilement-discret">
        <p className="cv-volet-titre">Centre de contrôle</p>

        <nav className="cv-nav" aria-label="Sommaire du centre de contrôle">
          <div className="cv-nav-groupe">
            <div className="cv-nav-tete" id="volet-controle-missions">Missions</div>
            {erreur && <p className="cv-volet-erreur">La liste des missions n’a pas pu être lue : {erreur}</p>}
            <ul aria-labelledby="volet-controle-missions">
              {missions.map((mission) => (
                <li key={mission.cle}>
                  <LienVolet href={adresseDeMission(mission.cle)} actif={segment === mission.cle}>
                    {mission.titre}
                  </LienVolet>
                </li>
              ))}
            </ul>
          </div>

          <div className="cv-nav-groupe">
            <div className="cv-nav-tete" id="volet-controle-systeme">Système</div>
            <ul aria-labelledby="volet-controle-systeme">
              <li>
                <LienVolet href={ADRESSE_SYSTEME} actif={segment === SEGMENT_SYSTEME}>
                  État du contrôle v2
                </LienVolet>
              </li>
            </ul>
          </div>
        </nav>

        <div className="cv-volet-pied">
          <Link href="/admin/audience" prefetch={false} className="cv-lien">Audience du site →</Link>
        </div>
      </div>
    </aside>
  )
}
