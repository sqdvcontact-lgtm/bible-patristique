'use client'

import { useMemo, useState } from 'react'
import { LIVRES } from '@/app/lib/bible'
import {
  calculerOuvragesFillionEnAttente,
  urlLectureFillion,
  type IllustrationFillionEnRevue,
} from './modele'

const NOMS_LIVRES = Object.fromEntries(LIVRES.map((livre) => [livre.code, livre.nom]))
const ORDRE_REGIMES = ['vignette', 'au-fil', 'hors-texte'] as const
const NOMS_REGIMES = { vignette: 'Vignette', 'au-fil': 'Scène cadrée', 'hors-texte': 'Planche hors-texte' } as const

function poidsLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`
  return `${(octets / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`
}

function pourcentage(part: number): string {
  return `${Math.round(part * 100)} %`
}

function reference(illustration: IllustrationFillionEnRevue): string {
  if (!illustration.canonDebut) return NOMS_LIVRES[illustration.livre] ?? illustration.livre
  if (!illustration.canonFin || illustration.canonFin === illustration.canonDebut) return illustration.canonDebut
  return `${illustration.canonDebut}–${illustration.canonFin}`
}

export default function RevueFillion({
  illustrations,
  apercuLocal = false,
}: {
  illustrations: IllustrationFillionEnRevue[]
  /** L'épreuve de développement emprunte la page de lecture sans session. */
  apercuLocal?: boolean
}) {
  const livresPublies = useMemo(() => [...new Set(illustrations.map((image) => image.livre))], [illustrations])
  const [livre, setLivre] = useState('tous')
  const [regime, setRegime] = useState<'tous' | IllustrationFillionEnRevue['regime']>('tous')
  const [recherche, setRecherche] = useState('')
  const [cleChoisie, setCleChoisie] = useState(illustrations[0]?.cle ?? '')
  const ouvragesEnAttente = useMemo(() => calculerOuvragesFillionEnAttente(illustrations), [illustrations])

  const visibles = useMemo(() => {
    const terme = recherche.trim().toLocaleLowerCase('fr')
    return illustrations.filter((image) => {
      if (livre !== 'tous' && image.livre !== livre) return false
      if (regime !== 'tous' && image.regime !== regime) return false
      if (!terme) return true
      return [image.cle, image.legende, image.description, image.canonDebut, image.blocEditorialTitre]
        .some((valeur) => valeur?.toLocaleLowerCase('fr').includes(terme))
    })
  }, [illustrations, livre, recherche, regime])

  const choisie = visibles.find((image) => image.cle === cleChoisie) ?? visibles[0] ?? null
  const urlLecture = choisie ? urlLectureFillion(choisie) : null
  const urlContexte = urlLecture
    ? urlLecture.replace(
      '/?',
      apercuLocal ? '/auth/apercu-audit-fillion?' : '/admin/illustrations/fillion/contexte?',
    )
    : null
  const totalAttente = ouvragesEnAttente.reduce((somme, ouvrage) => somme + ouvrage.illustrations, 0)

  return (
    <main className="revue-fillion">
      <style>{CSS}</style>
      <header className="revue-entete">
        <div>
          <a href="/admin/illustrations" className="revue-retour">← Illustrations</a>
          <p className="revue-sur-titre">Atelier éditorial</p>
          <h1>Revue des illustrations Fillion</h1>
          <p className="revue-intro">
            Chaque image est confrontée à sa légende, à son ancre et à sa composition réelle dans la page de lecture.
            Le cadre inférieur est le site lui-même : il ne s’agit pas d’une maquette.
          </p>
        </div>
        <dl className="revue-bilan">
          <div><dt>Déjà publiées</dt><dd>{illustrations.length}</dd></div>
          <div><dt>Livres illustrés</dt><dd>{livresPublies.length}</dd></div>
          <div><dt>Encore à intégrer</dt><dd>{totalAttente}</dd></div>
          <div><dt>Livres en attente</dt><dd>{ouvragesEnAttente.length}</dd></div>
        </dl>
      </header>

      <section className="revue-attente" aria-labelledby="revue-attente-titre">
        <div>
          <p className="revue-sur-titre">File de traitement</p>
          <h2 id="revue-attente-titre">Ouvrages publiés dont les images restent à intégrer</h2>
        </div>
        <div className="revue-puces">
          {ouvragesEnAttente.map((ouvrage) => (
            <span key={ouvrage.livre}>{NOMS_LIVRES[ouvrage.livre] ?? ouvrage.livre} <strong>{ouvrage.illustrations}</strong></span>
          ))}
        </div>
        <p className="revue-note">
          Une image ne quitte cette file qu’après contrôle des quatre bords, redressement, séparation de la légende,
          classement du régime, preuve de placement et vérification du fichier public.
        </p>
      </section>

      <section className="revue-outils" aria-label="Filtres de la revue">
        <label>
          <span>Livre</span>
          <select value={livre} onChange={(evenement) => { setLivre(evenement.target.value); setCleChoisie('') }}>
            <option value="tous">Tous les livres</option>
            {livresPublies.map((code) => <option key={code} value={code}>{NOMS_LIVRES[code] ?? code}</option>)}
          </select>
        </label>
        <label>
          <span>Composition</span>
          <select value={regime} onChange={(evenement) => { setRegime(evenement.target.value as typeof regime); setCleChoisie('') }}>
            <option value="tous">Tous les régimes</option>
            {ORDRE_REGIMES.map((code) => <option key={code} value={code}>{NOMS_REGIMES[code]}</option>)}
          </select>
        </label>
        <label className="revue-recherche">
          <span>Rechercher</span>
          <input value={recherche} onChange={(evenement) => { setRecherche(evenement.target.value); setCleChoisie('') }} placeholder="Clé, légende, verset…" />
        </label>
        <p className="revue-resultats"><strong>{visibles.length}</strong> image{visibles.length > 1 ? 's' : ''}</p>
      </section>

      {choisie ? (
        <div className="revue-pupitre">
          <aside className="revue-liste" aria-label="Illustrations">
            {visibles.map((image) => (
              <button
                key={image.cle}
                type="button"
                aria-pressed={image.cle === choisie.cle}
                className={image.cle === choisie.cle ? 'revue-ligne revue-ligne--active' : 'revue-ligne'}
                onClick={() => setCleChoisie(image.cle)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${image.url}?v=${image.empreinte}`} alt="" loading="lazy" decoding="async" />
                <span><strong>{image.cle}</strong><small>{reference(image)}</small></span>
              </button>
            ))}
          </aside>

          <article className="revue-fiche">
            <header>
              <div>
                <p className="revue-sur-titre">{NOMS_REGIMES[choisie.regime]} · {NOMS_LIVRES[choisie.livre] ?? choisie.livre}</p>
                <h2>{choisie.cle}</h2>
              </div>
              {choisie.demandeRelecture && <span className="revue-alerte">Relecture demandée</span>}
            </header>

            <div className="revue-image-isolee">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${choisie.url}?v=${choisie.empreinte}`}
                alt={choisie.description}
                width={choisie.largeur}
                height={choisie.hauteur}
              />
            </div>
            {choisie.legende && <p className="revue-legende">{choisie.legende}</p>}

            <dl className="revue-metadonnees">
              <div><dt>Ancre</dt><dd>{reference(choisie)}</dd></div>
              <div><dt>Pose</dt><dd>{choisie.placement} · {pourcentage(choisie.partColonne)} de la colonne</dd></div>
              <div><dt>Source</dt><dd>{choisie.pageSource ? `vue ${choisie.pageSource}` : '—'}{choisie.pageImprimee ? ` · page ${choisie.pageImprimee}` : ''}</dd></div>
              <div><dt>Fichier</dt><dd>{choisie.largeur} × {choisie.hauteur} px · {poidsLisible(choisie.poids)}</dd></div>
              <div><dt>Bloc éditorial</dt><dd>{choisie.blocEditorialTitre ?? choisie.blocEditorialCle ?? 'Ancre canonique directe'}</dd></div>
              <div><dt>Texte alternatif</dt><dd>{choisie.description || '—'}</dd></div>
            </dl>

            <p className="revue-actions">
              <a href={choisie.url} target="_blank" rel="noreferrer">Ouvrir le fichier seul ↗</a>
              {urlContexte && <a href={urlContexte} target="_blank" rel="noreferrer">Ouvrir dans la lecture ↗</a>}
            </p>
          </article>

          <section className="revue-contexte" aria-labelledby="revue-contexte-titre">
            <header>
              <div>
                <p className="revue-sur-titre">Contexte réel</p>
                <h2 id="revue-contexte-titre">La page telle que le lecteur la voit</h2>
              </div>
              {urlContexte && <a href={urlContexte} target="_blank" rel="noreferrer">Pleine page ↗</a>}
            </header>
            {urlLecture ? (
              <iframe key={urlContexte} src={urlContexte ?? undefined} title={`Contexte de ${choisie.cle}`} loading="lazy" />
            ) : (
              <div className="revue-sans-contexte">Cette matière liminaire ne possède pas d’ancre de chapitre directe.</div>
            )}
          </section>
        </div>
      ) : (
        <p className="revue-vide">Aucune illustration ne répond à ces filtres.</p>
      )}
    </main>
  )
}

const CSS = `
  .revue-fillion{min-height:calc(100vh - 3.5rem);background:var(--cs-fond);color:var(--cs-texte);padding:2rem clamp(1rem,3vw,3rem) 4rem;font-family:var(--font-source-sans),Arial,sans-serif}
  .revue-entete{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2rem;max-width:112rem;margin:0 auto 1.5rem;align-items:end}
  .revue-retour{display:inline-block;color:var(--cs-vert);text-decoration:none;font-size:.8125rem;margin-bottom:1.25rem}
  .revue-sur-titre{margin:0 0 .35rem;color:var(--cs-texte-faible);font-size:.6875rem;font-weight:650;letter-spacing:.09em;text-transform:uppercase}
  .revue-entete h1,.revue-fiche h2,.revue-contexte h2,.revue-attente h2{font-family:var(--font-source-serif),Georgia,serif;color:var(--cs-encre-fonce);font-weight:450;margin:0}
  .revue-entete h1{font-size:clamp(2rem,4vw,3.4rem);line-height:1.04}
  .revue-intro{max-width:54rem;color:var(--cs-texte-second);line-height:1.6;margin:.75rem 0 0}
  .revue-bilan{display:grid;grid-template-columns:repeat(2,minmax(8rem,1fr));gap:1px;background:var(--cs-bord);border:1px solid var(--cs-bord);border-radius:12px;overflow:hidden;margin:0}
  .revue-bilan div{background:var(--cs-surface);padding:.8rem 1rem}.revue-bilan dt{font-size:.6875rem;color:var(--cs-texte-faible)}.revue-bilan dd{font-family:var(--font-source-serif),Georgia,serif;font-size:1.625rem;margin:.15rem 0 0;color:var(--cs-encre-fonce)}
  .revue-attente{max-width:112rem;margin:0 auto 1rem;background:color-mix(in srgb,var(--cs-surface) 82%,var(--cs-or-doux));border:1px solid var(--cs-bord);border-radius:12px;padding:1rem 1.25rem}
  .revue-attente h2{font-size:1.125rem}.revue-puces{display:flex;flex-wrap:wrap;gap:.4rem;margin:.85rem 0}.revue-puces span{background:var(--cs-surface);border:1px solid var(--cs-bord);border-radius:999px;padding:.3rem .6rem;font-size:.75rem}.revue-puces strong{color:var(--cs-vert);margin-left:.25rem}.revue-note{font-family:var(--font-source-serif),Georgia,serif;font-style:italic;font-size:.8125rem;color:var(--cs-texte-second);margin:.6rem 0 0;line-height:1.5}
  .revue-outils{position:sticky;top:3.5rem;z-index:5;max-width:112rem;margin:0 auto 1rem;display:flex;gap:.75rem;align-items:end;flex-wrap:wrap;background:color-mix(in srgb,var(--cs-fond) 94%,transparent);backdrop-filter:blur(12px);border:1px solid var(--cs-bord);border-radius:12px;padding:.75rem}
  .revue-outils label{display:grid;gap:.25rem}.revue-outils label span{font-size:.625rem;text-transform:uppercase;letter-spacing:.07em;color:var(--cs-texte-faible)}.revue-outils select,.revue-outils input{height:2.35rem;border:1px solid var(--cs-bord);border-radius:8px;background:var(--cs-surface);color:var(--cs-texte);padding:0 .65rem;font:inherit;font-size:.8125rem}.revue-recherche{flex:1;min-width:13rem}.revue-resultats{margin:0 0 .55rem auto;font-size:.75rem;color:var(--cs-texte-second)}
  .revue-pupitre{max-width:112rem;margin:0 auto;display:grid;grid-template-columns:minmax(14rem,18rem) minmax(22rem,30rem) minmax(32rem,1fr);gap:1rem;align-items:start}
  .revue-liste,.revue-fiche,.revue-contexte{background:var(--cs-surface);border:1px solid var(--cs-bord);border-radius:12px;overflow:hidden}
  .revue-liste{max-height:calc(100vh - 11rem);overflow:auto;padding:.35rem}.revue-ligne{width:100%;border:0;border-bottom:1px solid var(--cs-bord);background:transparent;color:inherit;display:grid;grid-template-columns:3rem minmax(0,1fr);gap:.65rem;text-align:left;align-items:center;padding:.55rem;cursor:pointer;border-radius:4px}.revue-ligne:last-child{border-bottom:0}.revue-ligne:hover{background:var(--cs-fond)}.revue-ligne--active{background:color-mix(in srgb,var(--cs-vert) 9%,var(--cs-surface));box-shadow:inset .18rem 0 var(--cs-vert)}.revue-ligne img{display:block;width:3rem;height:3.35rem;object-fit:contain;background:var(--cs-fond)}.revue-ligne span{min-width:0}.revue-ligne strong{display:block;overflow:hidden;text-overflow:ellipsis;font-size:.75rem}.revue-ligne small{display:block;color:var(--cs-texte-faible);font-size:.6875rem;margin-top:.2rem}
  .revue-fiche{padding:1rem;position:sticky;top:8.75rem}.revue-fiche>header,.revue-contexte>header{display:flex;align-items:start;justify-content:space-between;gap:1rem}.revue-fiche h2,.revue-contexte h2{font-size:1.125rem}.revue-alerte{font-size:.625rem;text-transform:uppercase;letter-spacing:.06em;background:var(--cs-danger-fond);color:var(--cs-danger-fonce);padding:.3rem .45rem;border-radius:4px}.revue-image-isolee{display:grid;place-items:center;min-height:19rem;max-height:38vh;margin:1rem 0 .6rem;padding:1rem;background:var(--cs-fond);border:1px solid var(--cs-bord);border-radius:8px;overflow:auto}.revue-image-isolee img{display:block;max-width:100%;max-height:34vh;width:auto;height:auto}.revue-legende{font-family:var(--font-source-serif),Georgia,serif;font-style:italic;text-align:center;font-size:.8125rem;line-height:1.4;margin:.6rem 0 1rem}.revue-metadonnees{margin:0}.revue-metadonnees div{display:grid;grid-template-columns:6.5rem minmax(0,1fr);gap:.75rem;padding:.45rem 0;border-top:1px solid var(--cs-bord)}.revue-metadonnees dt{font-size:.6875rem;color:var(--cs-texte-faible)}.revue-metadonnees dd{font-size:.75rem;line-height:1.4;margin:0;overflow-wrap:anywhere}.revue-actions{display:flex;gap:.8rem;flex-wrap:wrap;margin:1rem 0 0}.revue-actions a,.revue-contexte header a{font-size:.75rem;color:var(--cs-vert);text-decoration:none}
  .revue-contexte{min-height:44rem}.revue-contexte>header{padding:.9rem 1rem;border-bottom:1px solid var(--cs-bord)}.revue-contexte iframe{display:block;width:100%;height:calc(100vh - 13rem);min-height:40rem;border:0;background:var(--cs-fond)}.revue-sans-contexte,.revue-vide{display:grid;place-items:center;min-height:25rem;color:var(--cs-texte-faible);font-style:italic}.revue-vide{max-width:112rem;margin:auto;background:var(--cs-surface);border:1px solid var(--cs-bord);border-radius:12px}
  @media(max-width:78rem){.revue-pupitre{grid-template-columns:15rem minmax(0,1fr)}.revue-contexte{grid-column:1/-1}.revue-fiche{position:static}}
  @media(max-width:48rem){.revue-fillion{padding:1rem .65rem 3rem}.revue-entete{grid-template-columns:1fr}.revue-bilan{width:100%}.revue-pupitre{grid-template-columns:1fr}.revue-liste{max-height:18rem}.revue-contexte{grid-column:auto}.revue-outils{top:3.25rem}.revue-resultats{width:100%;margin:.2rem 0}.revue-contexte iframe{height:70vh;min-height:32rem}}
`
