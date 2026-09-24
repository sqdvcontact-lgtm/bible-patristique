'use client'

// Les groupes d'une division, en deux colonnes, et les deux gestes de l'atelier :
// COUPER un groupe à une jonction de segments, FUSIONNER deux groupes voisins.
//
// ⛔ Le composant ne calcule aucun plan qu'on écrirait : il montre ce que la coupe
// ferait (par les fonctions de `atelierAlignement.ts`) et n'envoie que le GESTE et ce
// qu'il a vu. La route rebâtit le plan sur l'état de la base, et refuse s'il a changé.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  coupeOriginaleProposee,
  degreDeLEmpan,
  empanDuGroupe,
  jonctionsDeParagraphe,
  signesTraduits,
  type GroupeAtelier,
  type SegmentAtelier,
} from '@/app/lib/atelierAlignement'
import { LIMITE_EMPAN, REPERE_EMPAN } from '@/app/lib/grainAlignement'
import { sansAppelsDeNote } from '@/app/lib/appelsDeNote'

const nb = (n: number) => n.toLocaleString('fr-FR')

const LIBELLE_DEGRE = {
  'a-cheval': 'Enjambe un paragraphe traduit',
  limite: `Au-delà de ${nb(LIMITE_EMPAN)} signes`,
  repere: `Au-dessus de ${nb(REPERE_EMPAN)} signes`,
} as const

type Coupe = { groupe: string; k: number; j: number }
type Message = { ok: boolean; texte: string }

const vu = (g: GroupeAtelier) => ({ traduits: g.traduits.map(s => s.cle), originaux: g.originaux.map(s => s.cle) })

function Degre({ g }: { g: GroupeAtelier }) {
  const e = empanDuGroupe(g)
  const d = e ? degreDeLEmpan(e) : null
  if (!d) return null
  return <span className={`atl-degre atl-degre--${d}`}>{LIBELLE_DEGRE[d]}</span>
}

function Segment({ s }: { s: SegmentAtelier }) {
  const texte = sansAppelsDeNote(s.texte).trim()
  return (
    <p className={`atl-segment${texte ? '' : ' atl-segment--vide'}`} title={s.cle}>
      {texte || 'Segment vide'}
    </p>
  )
}

export default function AtelierDivision({
  ensemble,
  libelleTraduit,
  libelleOriginal,
  groupes,
}: {
  ensemble: string
  libelleTraduit: string
  libelleOriginal: string
  groupes: GroupeAtelier[]
}) {
  const router = useRouter()
  const [coupe, setCoupe] = useState<Coupe | null>(null)
  const [fusion, setFusion] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  async function envoyer(corps: Record<string, unknown>, reussite: string) {
    setEnCours(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/alignements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ensemble, ...corps }),
      })
      // ⚠️ Le verrou de bêta redirige au lieu de refuser : sa page revient en 200.
      if (res.redirected || !(res.headers.get('content-type') ?? '').includes('application/json')) {
        throw new Error('La session d’administration n’est pas reconnue : rechargez la page.')
      }
      const donnees = await res.json()
      if (!res.ok) throw new Error(donnees?.error ?? `Échec (${res.status}).`)
      setCoupe(null)
      setFusion(null)
      setMessage({ ok: true, texte: reussite })
      router.refresh()
    } catch (e) {
      setMessage({ ok: false, texte: (e as Error).message })
    } finally {
      setEnCours(false)
    }
  }

  if (groupes.length === 0) return <p className="atl-sous-titre">Aucun groupe dans cette division.</p>

  return (
    <div>
      {message && (
        <p className={`atl-message atl-message--${message.ok ? 'ok' : 'erreur'}`} role="status">{message.texte}</p>
      )}
      {groupes.map((g, i) => {
        const suivant = groupes[i + 1] ?? null
        const e = empanDuGroupe(g)
        const aRevoir = e ? degreDeLEmpan(e) !== null : false
        const frontieres = jonctionsDeParagraphe(g.traduits)
        const enCoupe = coupe?.groupe === g.alignmentId ? coupe : null
        const signes = signesTraduits(g)
        const signesGarde = enCoupe ? signesTraduits({ traduits: g.traduits.slice(0, enCoupe.k) }) : 0
        const fusionne = fusion === g.alignmentId && suivant
          ? { ...g, traduits: [...g.traduits, ...suivant.traduits], originaux: [...g.originaux, ...suivant.originaux] }
          : null
        const empanFusion = fusionne ? empanDuGroupe(fusionne) : null

        return (
          <section key={g.alignmentId} className={`atl-groupe${aRevoir ? ' atl-groupe--revoir' : ''}`} aria-label={`Groupe ${g.alignmentId}`}>
            <div className="atl-groupe-tete">
              <strong>Groupe {g.groupOrder}</strong>
              <span className="atl-code">{g.alignmentId}</span>
              <span>{nb(signes)} signes traduits</span>
              {g.cardinality && <span>{g.cardinality}</span>}
              {e && e.paragraphes.length > 1 && <span>{e.paragraphes.length} paragraphes</span>}
              {e?.paragrapheInconnu && <span>paragraphe inconnu</span>}
              <Degre g={g} />
            </div>

            <div className="atl-colonnes">
              <div className="atl-colonne">
                <p className="atl-colonne-titre">{libelleTraduit}</p>
                {g.traduits.length === 0 && <p className="atl-segment atl-segment--vide">Aucun segment traduit</p>}
                {g.traduits.map((s, n) => (
                  <div key={s.cle}>
                    {n > 0 && (
                      <div className={`atl-jonction${frontieres[n - 1] ? ' atl-jonction--paragraphe' : ''}${enCoupe?.k === n ? ' atl-jonction--retenue' : ''}`}>
                        {enCoupe?.k === n
                          ? <span className="atl-jonction-note">La coupe passe ici</span>
                          : (
                            <>
                              {frontieres[n - 1] && <span className="atl-jonction-note">Fin de paragraphe</span>}
                              <button
                                type="button"
                                className="cs-bouton-lien atl-couper"
                                disabled={enCours}
                                onClick={() => { setFusion(null); setCoupe({ groupe: g.alignmentId, k: n, j: coupeOriginaleProposee(g, n) }) }}
                              >
                                Couper ici
                              </button>
                            </>
                          )}
                      </div>
                    )}
                    <Segment s={s} />
                  </div>
                ))}
              </div>

              <div className="atl-colonne">
                <p className="atl-colonne-titre">{libelleOriginal}</p>
                {g.originaux.length === 0 && !enCoupe && <p className="atl-segment atl-segment--vide">Aucun segment original</p>}
                {Array.from({ length: g.originaux.length + 1 }, (_, n) => (
                  <div key={n}>
                    {enCoupe && (
                      <div className={`atl-jonction${enCoupe.j === n ? ' atl-jonction--retenue' : ''}`}>
                        {enCoupe.j === n
                          ? <span className="atl-jonction-note">La coupe passe ici</span>
                          : (
                            <button
                              type="button"
                              className="cs-bouton-lien atl-couper"
                              disabled={enCours}
                              onClick={() => setCoupe({ ...enCoupe, j: n })}
                            >
                              Couper ici
                            </button>
                          )}
                      </div>
                    )}
                    {n < g.originaux.length && <Segment s={g.originaux[n]} />}
                  </div>
                ))}
              </div>
            </div>

            {enCoupe && (
              <div className="atl-pied atl-pied--confirmation">
                <span>
                  Le groupe garderait {nb(signesGarde)} signes, le groupe neuf en prendrait {nb(signes - signesGarde)}.
                  {' '}La coupe de l’original se déplace d’un clic.
                </span>
                <button
                  type="button"
                  className="cs-bouton-plein cs-bouton-plein--compact"
                  disabled={enCours}
                  onClick={() => envoyer(
                    { op: 'couper', groupe: g.alignmentId, k: enCoupe.k, j: enCoupe.j, attendus: vu(g) },
                    'Le groupe est coupé.',
                  )}
                >
                  Couper
                </button>
                <button type="button" className="cs-bouton-lien" disabled={enCours} onClick={() => setCoupe(null)}>Annuler</button>
              </div>
            )}

            {suivant && !enCoupe && (
              <div className={`atl-pied${fusionne ? ' atl-pied--confirmation' : ''}`}>
                {fusionne && empanFusion ? (
                  <>
                    <span>
                      Le groupe fusionné ferait {nb(empanFusion.signes)} signes.
                      {empanFusion.aCheval && <span className="atl-alerte"> Il enjamberait un paragraphe traduit.</span>}
                    </span>
                    <button
                      type="button"
                      className="cs-bouton-plein cs-bouton-plein--compact"
                      disabled={enCours}
                      onClick={() => envoyer(
                        { op: 'fusionner', groupe: g.alignmentId, suivant: suivant.alignmentId, attendus: { premier: vu(g), second: vu(suivant) } },
                        'Les deux groupes sont fusionnés.',
                      )}
                    >
                      Fusionner
                    </button>
                    <button type="button" className="cs-bouton-lien" disabled={enCours} onClick={() => setFusion(null)}>Annuler</button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="cs-bouton-lien"
                    disabled={enCours}
                    onClick={() => { setCoupe(null); setFusion(g.alignmentId) }}
                  >
                    Fusionner avec le groupe suivant
                  </button>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
