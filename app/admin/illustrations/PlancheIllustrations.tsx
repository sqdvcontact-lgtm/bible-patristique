'use client'

import { useEffect, useMemo, useState } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { FONCTIONS, ICONES_ONGLET, ILLUSTRATIONS, type CleFonction, type Illustration } from './inventaire'

/** Le poids de chaque fichier, par chemin public.
 *
 *  ⛔ Il se prend ICI, dans le navigateur, et non sur le disque au rendu serveur.
 *  Mesurer côté serveur obligeait à embarquer `public/` dans la fonction, ce qui
 *  l'a portée à 259 Mo pour un plafond Vercel de 250 : le déploiement du
 *  2026-08-24 a échoué et le site est resté sur la version d'avant. Le navigateur,
 *  lui, charge ces images de toute façon. */
type Poids = Record<string, number>

export type EchantillonFamille = {
  cle: string
  nom: string
  emploi: string
  lieu: { href: string; label: string } | null
  origine: string
  nombre: number
  complet: boolean
  echantillon: { nom: string; url: string }[]
}

// ── Fonds d'épreuve ──────────────────────────────────────────────────────────
//
// Une illustration ne s'apprécie pas dans l'absolu : elle s'apprécie SUR SON
// FOND. Les quatre fonds sont ceux du site, aux valeurs exactes de globals.css,
// plus un damier qui trahit les fichiers restés blancs au lieu d'être détourés.
const FONDS = {
  papier: { nom: 'Papier', fond: '#f7f4ef', encre: '#2f2a22', sombre: false },
  surface: { nom: 'Surface', fond: '#ffffff', encre: '#2f2a22', sombre: false },
  cuir: { nom: 'Cuir', fond: '#1c1813', encre: '#e6ded0', sombre: true },
  damier: { nom: 'Damier', fond: 'transparent', encre: '#2f2a22', sombre: false },
} as const
type CleFond = keyof typeof FONDS

/** Le filtre que `globals.css` applique à toute image de classe `cs-ornement`
 *  en thème Cuir. Reproduit tel quel : c'est lui qui décide de l'aspect d'un
 *  ornement dans le sombre, et l'ignorer serait juger une autre image. */
const FILTRE_CUIR = 'invert(0.88) sepia(0.5) saturate(0.6)'

const DAMIER = `
  linear-gradient(45deg, var(--cs-bord) 25%, transparent 25%, transparent 75%, var(--cs-bord) 75%),
  linear-gradient(45deg, var(--cs-bord) 25%, transparent 25%, transparent 75%, var(--cs-bord) 75%)`

function poidsLisible(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

/** Trois rangs de poids. Le seuil bas est celui d'une image qu'on sert sans y
 *  penser ; le seuil haut, celui d'une image qui coûte une seconde de réseau. */
function tonPoids(octets: number): 'calme' | 'attente' | 'danger' {
  if (octets > 1_500_000) return 'danger'
  if (octets > 500_000) return 'attente'
  return 'calme'
}

/** Les icônes d'onglet rejoignent la planche sous la fonction « identité » :
 *  elles vivent dans `app/`, mais ce sont des images du site comme les autres. */
const TOUTES: Illustration[] = [
  ...ILLUSTRATIONS,
  ...ICONES_ONGLET.map((i): Illustration => ({
    chemin: i.route,
    nom: i.nom,
    fonction: 'identite',
    emploi: i.emploi,
    source: i.fichier,
  })),
]

const ORDRE_FONCTIONS = Object.keys(FONCTIONS) as CleFonction[]
/** Repliés d'entrée : ils ne participent pas au jugement d'harmonie, et les
 *  tuiles du jeu pèsent à elles seules neuf mégaoctets. */
const REPLIES_AU_DEPART: CleFonction[] = ['jeu', 'gabarit']

export default function PlancheIllustrations({ familles }: { familles: EchantillonFamille[] }) {
  const [fond, setFond] = useState<CleFond>('papier')
  const [servi, setServi] = useState(true)
  const [taille, setTaille] = useState(2)
  const [replies, setReplies] = useState<CleFonction[]>(REPLIES_AU_DEPART)
  const [agrandie, setAgrandie] = useState<Illustration | null>(null)
  const [poids, setPoids] = useState<Poids>({})

  const f = FONDS[fond]
  const cases = [7, 10, 15][taille]

  const groupes = useMemo(
    () => ORDRE_FONCTIONS.map(cle => ({ cle, ...FONCTIONS[cle], images: TOUTES.filter(i => i.fonction === cle) }))
      .filter(g => g.images.length > 0),
    []
  )

  // ── Pesée ──────────────────────────────────────────────────────────────────
  // Une requête HEAD par fichier : elle rend l'en-tête sans le corps, donc le
  // poids sans le téléchargement. Un seul dépôt d'état à la fin — cinquante-huit
  // rendus successifs pour cinquante-huit chiffres n'apprendraient rien de plus.
  useEffect(() => {
    let vivant = true
    const peser = async () => {
      const releve: Poids = {}
      const chemins = TOUTES.map(i => i.chemin)
      // Par paquets de huit : le navigateur plafonne ses connexions, et une file
      // de cinquante-huit requêtes lancées d'un coup ne va pas plus vite.
      for (let i = 0; i < chemins.length; i += 8) {
        await Promise.all(chemins.slice(i, i + 8).map(async chemin => {
          try {
            const r = await fetch(chemin, { method: 'HEAD' })
            if (!r.ok) return
            const taille = Number(r.headers.get('content-length'))
            if (Number.isFinite(taille) && taille > 0) { releve[chemin] = taille; return }
            // ⚠️ Une réponse sans longueur déclarée : c'est le cas de `/favicon.ico`,
            // que Next sert par une route et non comme un fichier. On lit alors le
            // corps pour le peser. Réservé à ce repli : un GET sur les cinquante-huit
            // ferait descendre vingt-huit mégaoctets pour afficher des nombres.
            const corps = await fetch(chemin).then(x => (x.ok ? x.blob() : null))
            if (corps && corps.size > 0) releve[chemin] = corps.size
          } catch { /* un fichier illisible reste sans chiffre, la planche le dit */ }
        }))
        if (!vivant) return
      }
      if (vivant) setPoids(releve)
    }
    peser()
    return () => { vivant = false }
  }, [])

  const bilan = useMemo(() => {
    const pesees = TOUTES.filter(i => poids[i.chemin])
    const total = pesees.reduce((s, i) => s + poids[i.chemin], 0)
    const dormant = TOUTES.filter(i => i.fonction === 'reserve' || i.fonction === 'gabarit')
    const poidsDormant = dormant.reduce((s, i) => s + (poids[i.chemin] ?? 0), 0)
    const lourdes = pesees.filter(i => poids[i.chemin] > 500_000).length
    return { nb: TOUTES.length, pesees: pesees.length, total, nbDormant: dormant.length, poidsDormant, lourdes }
  }, [poids])

  // Échappement : une modale qui ne se ferme qu'à la souris se referme mal.
  useEffect(() => {
    if (!agrandie) return
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') setAgrandie(null) }
    window.addEventListener('keydown', auClavier)
    return () => window.removeEventListener('keydown', auClavier)
  }, [agrandie])

  const basculer = (cle: CleFonction) =>
    setReplies(r => (r.includes(cle) ? r.filter(c => c !== cle) : [...r, cle]))

  return (
    <main className="ill-page">
      <style>{CSS}</style>

      {/* ── En-tête ── */}
      <header className="ill-entete">
        <div>
          <a href="/admin" className="ill-retour">← Administration</a>
          <h1 className="ill-titre">Illustrations</h1>
          <p className="ill-sous-titre">Toutes les images dessinées du site, sur un même fond, à la même échelle.</p>
        </div>
        <div className="ill-bilan">
          <span><strong>{bilan.nb}</strong> images recensées</span>
          {bilan.pesees === 0 ? (
            <span>pesée en cours…</span>
          ) : (
            <>
              <span><strong>{poidsLisible(bilan.total)}</strong> au total</span>
              <span className={bilan.lourdes ? 'ill-alerte' : ''}><strong>{bilan.lourdes}</strong> au-dessus de 500 ko</span>
              <span><strong>{bilan.nbDormant}</strong> jamais servies, soit {poidsLisible(bilan.poidsDormant)}</span>
            </>
          )}
        </div>
      </header>

      {/* ── Réglages ── */}
      <div className="ill-reglages">
        <div className="ill-groupe-reglage">
          <span className="ill-etiquette">Fond</span>
          {(Object.keys(FONDS) as CleFond[]).map(c => (
            <button key={c} onClick={() => setFond(c)} className={`ill-bouton${fond === c ? ' ill-bouton--actif' : ''}`}>
              {FONDS[c].nom}
            </button>
          ))}
        </div>
        <div className="ill-groupe-reglage">
          <span className="ill-etiquette">Rendu</span>
          <button onClick={() => setServi(true)} className={`ill-bouton${servi ? ' ill-bouton--actif' : ''}`}>Telle qu’elle est servie</button>
          <button onClick={() => setServi(false)} className={`ill-bouton${!servi ? ' ill-bouton--actif' : ''}`}>Fichier brut</button>
        </div>
        <div className="ill-groupe-reglage">
          <span className="ill-etiquette">Taille</span>
          {['Petite', 'Moyenne', 'Grande'].map((nom, i) => (
            <button key={nom} onClick={() => setTaille(i)} className={`ill-bouton${taille === i ? ' ill-bouton--actif' : ''}`}>{nom}</button>
          ))}
        </div>
      </div>
      <p className="ill-explication">
        {servi
          ? 'La planche reproduit le réglage de chaque page : opacité, fusion au papier, filtre du thème Cuir, découpe en masque. C’est ce que voit le lecteur, non ce que contient le fichier.'
          : 'Les fichiers sont montrés tels qu’ils sont, sans opacité ni fusion. Le damier révèle ceux qui ont gardé un fond blanc au lieu d’être détourés.'}
      </p>

      {/* ── Les planches, une par fonction ── */}
      {groupes.map(g => {
        const replie = replies.includes(g.cle)
        return (
          <section key={g.cle} className="ill-section">
            <button className="ill-section-tete" onClick={() => basculer(g.cle)} aria-expanded={!replie}>
              <span className="ill-chevron" aria-hidden="true">{replie ? '▸' : '▾'}</span>
              <h2 className="ill-section-titre">{g.titre}</h2>
              <span className="ill-compte">{g.images.length}</span>
            </button>
            {!replie && (
              <>
                <p className="ill-section-propos">{g.propos}</p>
                <div className="ill-grille" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cases}rem, 1fr))` }}>
                  {g.images.map(img => (
                    <Vignette
                      key={img.chemin}
                      illustration={img}
                      poids={poids[img.chemin] ?? null}
                      fond={fond}
                      servi={servi}
                      onAgrandir={() => setAgrandie(img)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )
      })}

      {/* ── Familles nombreuses ── */}
      <section className="ill-section">
        <div className="ill-section-tete ill-section-tete--fixe">
          <h2 className="ill-section-titre">Familles nombreuses</h2>
        </div>
        <p className="ill-section-propos">
          Ces images se comptent par dizaines ou par milliers, et leur harmonie ne se juge pas au regard : elles viennent
          de sources extérieures, photographiées ou gravées. On les recense par leur volume, avec un échantillon pris au
          large de chaque famille.
        </p>
        <div className="ill-familles">
          {familles.map(fam => (
            <article key={fam.cle} className="ill-famille">
              <div className="ill-famille-tete">
                <h3 className="ill-famille-nom">{fam.nom}</h3>
                <span className="ill-famille-compte">
                  {fam.nombre > 0 ? `${fam.complet ? '' : 'au moins '}${fam.nombre.toLocaleString('fr-FR')}` : 'non relevé'}
                </span>
              </div>
              <p className="ill-famille-emploi">{fam.emploi}</p>
              <p className="ill-famille-origine">{fam.origine}</p>
              {fam.echantillon.length > 0 && (
                <div className="ill-bande">
                  {fam.echantillon.map(e => (
                    <a key={e.nom} href={e.url} target="_blank" rel="noreferrer" className="ill-bande-case" title={e.nom}
                      style={{ backgroundColor: f.fond, backgroundImage: f.fond === 'transparent' ? DAMIER : 'none', backgroundSize: '14px 14px', backgroundPosition: '0 0, 7px 7px' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.url} alt="" loading="lazy" />
                    </a>
                  ))}
                </div>
              )}
              {fam.lieu && <a className="ill-lien" href={fam.lieu.href} target="_blank" rel="noreferrer">Voir en place : {fam.lieu.label} ↗</a>}
            </article>
          ))}
        </div>
      </section>

      {agrandie && (
        <Agrandissement
          illustration={agrandie}
          poids={poids[agrandie.chemin] ?? null}
          fond={fond}
          onFermer={() => setAgrandie(null)}
        />
      )}
    </main>
  )
}

// ── Vignette ─────────────────────────────────────────────────────────────────

function styleImage(img: Illustration, fond: CleFond, servi: boolean): React.CSSProperties {
  if (!servi) return {}
  const t = img.traitement ?? {}
  return {
    opacity: t.opacite,
    mixBlendMode: t.fusion,
    filter: FONDS[fond].sombre && t.ornement ? FILTRE_CUIR : undefined,
  }
}

function Vignette({
  illustration, poids, fond, servi, onAgrandir,
}: {
  illustration: Illustration
  poids: number | null
  fond: CleFond
  servi: boolean
  onAgrandir: () => void
}) {
  const f = FONDS[fond]
  const t = illustration.traitement ?? {}
  // La définition se lit sur l'image que la vignette affiche DÉJÀ, et l'état
  // reste ici : remontée à la planche, chaque image chargée redessinerait les
  // cinquante-sept autres. Une vignette pèse sa propre image, voilà tout.
  const [dim, setDim] = useState<{ l: number; h: number } | null>(null)
  // Une silhouette de masque ne se REGARDE pas, elle se découpe : la montrer en
  // image donnerait un carré noir opaque, qui n'est jamais ce que la barre affiche.
  const enMasque = servi && t.masque

  return (
    <figure className="ill-vignette">
      <button
        className="ill-cadre"
        onClick={onAgrandir}
        title="Agrandir"
        style={{
          backgroundColor: f.fond,
          backgroundImage: f.fond === 'transparent' ? DAMIER : 'none',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 9px 9px',
          color: f.encre,
        }}
      >
        {enMasque ? (
          <span
            aria-hidden="true"
            className="ill-masque"
            style={{
              background: 'currentColor',
              WebkitMask: `url("${illustration.chemin}") center / contain no-repeat`,
              mask: `url("${illustration.chemin}") center / contain no-repeat`,
            }}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={illustration.chemin} alt="" loading="lazy" style={styleImage(illustration, fond, servi)}
            onLoad={e => setDim({ l: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
        )}
      </button>

      <figcaption className="ill-legende" style={{ color: undefined }}>
        <span className="ill-nom">{illustration.nom}</span>
        <span className="ill-emploi">{illustration.emploi}</span>
        <span className="ill-chiffres">
          {poids !== null && <span className={`ill-poids ill-poids--${tonPoids(poids)}`}>{poidsLisible(poids)}</span>}
          {dim && <span className="ill-dim">{dim.l} × {dim.h}</span>}
          {t.largeur && <span className="ill-dim">servie à {t.largeur}</span>}
        </span>
        {illustration.note && <span className="ill-note">{illustration.note}</span>}
        {illustration.lieu
          ? <a className="ill-lien" href={illustration.lieu.href} target="_blank" rel="noreferrer">Voir en place : {illustration.lieu.label} ↗</a>
          : <span className="ill-lien ill-lien--muet">Ne paraît sur aucune page</span>}
      </figcaption>
    </figure>
  )
}

// ── Agrandissement ───────────────────────────────────────────────────────────

function Agrandissement({
  illustration, poids, fond, onFermer,
}: {
  illustration: Illustration
  poids: number | null
  fond: CleFond
  onFermer: () => void
}) {
  // L'agrandissement montre le FICHIER, pas le réglage de la page : c'est ici
  // qu'on regarde le trait, la matière, le détourage. Le bouton rend le réglage
  // à qui veut vérifier ce que le lecteur voit.
  const [servi, setServi] = useState(false)
  const [reel, setReel] = useState(false)
  // La définition se prend sur l'image agrandie elle-même. Un SVG n'en a pas de
  // propre : son `naturalWidth` rend la boîte de dessin, ce que la fiche dit.
  const [dim, setDim] = useState<{ l: number; h: number } | null>(null)
  const f = FONDS[fond]
  const t = illustration.traitement ?? {}

  return (
    <div className="ill-modale" onClick={onFermer} role="dialog" aria-modal="true" aria-label={illustration.nom}>
      <div className="ill-modale-corps" onClick={e => e.stopPropagation()}>
        <div
          className="ill-modale-scene"
          style={{
            backgroundColor: f.fond,
            backgroundImage: f.fond === 'transparent' ? DAMIER : 'none',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0, 12px 12px',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={illustration.chemin}
            alt={illustration.nom}
            className={reel ? 'ill-modale-image ill-modale-image--reelle' : 'ill-modale-image'}
            style={styleImage(illustration, fond, servi)}
            onLoad={e => setDim({ l: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
        </div>

        <aside className="ill-modale-fiche">
          <button className="ill-fermer" onClick={onFermer} aria-label="Fermer">×</button>
          <h2 className="ill-modale-titre">{illustration.nom}</h2>
          <p className="ill-modale-fonction">{FONCTIONS[illustration.fonction].titre}</p>
          <p className="ill-modale-emploi">{illustration.emploi}</p>
          {illustration.note && <p className="ill-modale-note">{illustration.note}</p>}

          <dl className="ill-fiche">
            <dt>Fichier</dt><dd><code>{illustration.chemin}</code></dd>
            {dim && <><dt>Définition</dt><dd>{illustration.chemin.endsWith('.svg') ? `${dim.l} × ${dim.h}, vectorielle` : `${dim.l} × ${dim.h} px`}</dd></>}
            {poids !== null && <><dt>Poids</dt><dd className={`ill-poids--${tonPoids(poids)}`}>{poidsLisible(poids)}</dd></>}
            {t.largeur && <><dt>Servie à</dt><dd>{t.largeur}</dd></>}
            {t.opacite !== undefined && <><dt>Opacité</dt><dd>{String(t.opacite).replace('.', ',')}</dd></>}
            {t.fusion && <><dt>Fusion</dt><dd>{t.fusion === 'multiply' ? 'multiply, le blanc se fond dans le papier' : 'screen, le noir se fond dans la carte'}</dd></>}
            {t.masque && <><dt>Emploi</dt><dd>découpée en masque, teintée par le texte</dd></>}
            {t.ornement && <><dt>Thème Cuir</dt><dd>inversée par le filtre des ornements</dd></>}
            {illustration.source && <><dt>Posée par</dt><dd><code>{illustration.source}</code></dd></>}
          </dl>

          <div className="ill-modale-boutons">
            <button onClick={() => setServi(s => !s)} className={`ill-bouton${servi ? ' ill-bouton--actif' : ''}`}>
              {servi ? 'Réglage de la page' : 'Fichier brut'}
            </button>
            <button onClick={() => setReel(r => !r)} className={`ill-bouton${reel ? ' ill-bouton--actif' : ''}`}>
              {reel ? 'Taille réelle' : 'Ajustée à l’écran'}
            </button>
            <a className="ill-bouton" href={illustration.chemin} target="_blank" rel="noreferrer">Ouvrir le fichier ↗</a>
          </div>

          {illustration.lieu && (
            <a className="ill-lien ill-lien--fort" href={illustration.lieu.href} target="_blank" rel="noreferrer">
              Voir en place : {illustration.lieu.label} ↗
            </a>
          )}
        </aside>
      </div>
    </div>
  )
}

// ── Habillage ────────────────────────────────────────────────────────────────
//
// Le lien « Voir en place » est le seul élément qui porte un cadre plein : c'est
// la sortie de la planche vers le site, et il devait se distinguer du reste sans
// discussion possible.
const CSS = `
  .ill-page { min-height: calc(100vh - ${HAUTEUR_NAVBAR}); background: var(--cs-fond); padding: 1.75rem 1.5rem 4rem; }
  .ill-entete, .ill-reglages, .ill-explication, .ill-section { max-width: 82rem; margin-left: auto; margin-right: auto; }

  .ill-entete { display: flex; align-items: flex-end; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
  .ill-retour { display: inline-block; font-size: 0.75rem; color: var(--cs-texte-doux); text-decoration: none; font-family: var(--font-source-sans), Arial, sans-serif; margin-bottom: 0.25rem; }
  .ill-retour:hover { color: var(--cs-vert); }
  .ill-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.75rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0; }
  .ill-sous-titre { font-size: 0.875rem; color: var(--cs-texte-doux); margin: 2px 0 0; font-style: italic; font-family: var(--font-source-serif), Georgia, serif; }
  .ill-bilan { display: flex; flex-direction: column; gap: 0.125rem; font-size: 0.75rem; color: var(--cs-texte-second); font-family: var(--font-source-sans), Arial, sans-serif; text-align: right; }
  .ill-bilan strong { color: var(--cs-encre-fonce); font-weight: 600; }
  .ill-alerte strong { color: var(--cs-attente); }

  .ill-reglages { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; position: sticky; top: ${HAUTEUR_NAVBAR}; z-index: 30; background: var(--cs-surface); border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 0.625rem 0.875rem; box-shadow: var(--cs-ombre-posee); }
  .ill-groupe-reglage { display: inline-flex; align-items: center; gap: 0.3125rem; flex-wrap: wrap; }
  .ill-etiquette { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-faible); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin-right: 0.125rem; }
  .ill-bouton { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.75rem; color: var(--cs-texte-second); background: var(--cs-fond-clair); border: 1px solid var(--cs-bord-clair); border-radius: 999px; padding: 0.25rem 0.6875rem; cursor: pointer; text-decoration: none; display: inline-block; }
  .ill-bouton:hover { border-color: var(--cs-vert); color: var(--cs-vert); }
  .ill-bouton--actif { background: var(--cs-vert-pale); border-color: var(--cs-vert); color: var(--cs-vert-fonce); font-weight: 600; }
  .ill-explication { font-size: 0.75rem; color: var(--cs-texte-doux); font-style: italic; font-family: var(--font-source-serif), Georgia, serif; margin: 0.625rem auto 1.5rem; line-height: 1.5; max-width: 52rem; }

  .ill-section { margin-bottom: 2.25rem; }
  .ill-section-tete { display: flex; align-items: baseline; gap: 0.5rem; width: 100%; background: none; border: none; padding: 0 0 0.5rem; cursor: pointer; text-align: left; border-bottom: 1px solid var(--cs-bord-clair); }
  .ill-section-tete--fixe { cursor: default; }
  .ill-chevron { color: var(--cs-texte-faible); font-size: 0.75rem; }
  .ill-section-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.1875rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0; }
  .ill-compte { font-size: 0.75rem; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; }
  .ill-section-propos { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.6; margin: 0.625rem 0 1rem; max-width: 52rem; font-family: var(--font-source-serif), Georgia, serif; }

  .ill-grille { display: grid; gap: 1.25rem; }
  .ill-vignette { margin: 0; display: flex; flex-direction: column; gap: 0.4375rem; }
  .ill-cadre { border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 0.75rem; cursor: zoom-in; display: flex; align-items: center; justify-content: center; aspect-ratio: 1; overflow: hidden; }
  .ill-cadre:hover { border-color: var(--cs-vert); }
  .ill-cadre img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .ill-masque { display: block; width: 62%; height: 62%; }

  .ill-legende { flex: 1; display: flex; flex-direction: column; gap: 0.1875rem; font-family: var(--font-source-sans), Arial, sans-serif; }
  .ill-nom { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.9375rem; color: var(--cs-encre-fonce); line-height: 1.25; }
  .ill-emploi { font-size: 0.75rem; color: var(--cs-texte-second); line-height: 1.45; }
  .ill-chiffres { display: flex; flex-wrap: wrap; gap: 0.4375rem; font-size: 0.6875rem; color: var(--cs-texte-faible); }
  .ill-poids--calme { color: var(--cs-texte-faible); }
  .ill-poids--attente { color: var(--cs-attente); font-weight: 600; }
  .ill-poids--danger { color: var(--cs-danger); font-weight: 700; }
  .ill-note { font-size: 0.6875rem; color: var(--cs-attente); line-height: 1.4; font-style: italic; }

  .ill-lien { align-self: flex-start; margin-top: auto; padding-top: 0.1875rem; font-size: 0.6875rem; font-weight: 600; font-family: var(--font-source-sans), Arial, sans-serif; color: var(--cs-vert); background: var(--cs-vert-pale); border: 1px solid var(--cs-vert); border-radius: 999px; padding: 0.1875rem 0.625rem; text-decoration: none; }
  .ill-lien:hover { background: var(--cs-vert); color: var(--cs-sur-aplat); }
  .ill-lien--muet { color: var(--cs-texte-faible); background: transparent; border-color: var(--cs-bord-clair); border-style: dashed; font-weight: 400; }
  .ill-lien--fort { font-size: 0.8125rem; padding: 0.375rem 0.875rem; margin-top: 0.75rem; }

  .ill-familles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 26rem), 1fr)); gap: 1.25rem; }
  .ill-famille { background: var(--cs-surface); border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 1rem 1.125rem 1.125rem; display: flex; flex-direction: column; gap: 0.4375rem; }
  .ill-famille-tete { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; }
  .ill-famille-nom { font-family: var(--font-source-serif), Georgia, serif; font-size: 1rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0; }
  .ill-famille-compte { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.25rem; color: var(--cs-texte-second); }
  .ill-famille-emploi { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.55; margin: 0; font-family: var(--font-source-serif), Georgia, serif; }
  .ill-famille-origine { font-size: 0.6875rem; color: var(--cs-texte-faible); margin: 0; font-family: var(--font-source-sans), Arial, sans-serif; }
  .ill-bande { display: flex; gap: 0.375rem; overflow-x: auto; padding-bottom: 0.25rem; }
  .ill-bande-case { flex: 0 0 4.5rem; height: 4.5rem; border: 1px solid var(--cs-bord-clair); border-radius: 4px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .ill-bande-case img { max-width: 100%; max-height: 100%; object-fit: contain; }

  .ill-modale { position: fixed; top: ${HAUTEUR_NAVBAR}; left: 0; right: 0; bottom: 0; z-index: 200; overflow: hidden; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  .ill-modale-corps { background: var(--cs-surface); border-radius: 12px; box-shadow: var(--cs-ombre-modale); display: flex; gap: 0; max-width: 78rem; width: 100%; max-height: 100%; overflow: hidden; }
  .ill-modale-scene { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; justify-content: center; padding: 1.5rem; overflow: auto; }
  .ill-modale-image { max-width: 100%; max-height: calc(100dvh - ${HAUTEUR_NAVBAR} - 6rem); object-fit: contain; }
  .ill-modale-image--reelle { max-width: none; max-height: none; }
  .ill-modale-fiche { position: relative; flex: 0 0 22rem; border-left: 1px solid var(--cs-bord-clair); padding: 1.25rem 1.375rem; overflow-y: auto; font-family: var(--font-source-sans), Arial, sans-serif; }
  .ill-fermer { position: absolute; top: 0.5rem; right: 0.625rem; background: none; border: none; font-size: 1.5rem; line-height: 1; color: var(--cs-texte-faible); cursor: pointer; }
  .ill-fermer:hover { color: var(--cs-texte); }
  .ill-modale-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.25rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0 1.5rem 0.125rem 0; }
  .ill-modale-fonction { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-vert); font-weight: 700; margin: 0 0 0.75rem; }
  .ill-modale-emploi { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.6; margin: 0 0 0.75rem; font-family: var(--font-source-serif), Georgia, serif; }
  .ill-modale-note { font-size: 0.75rem; color: var(--cs-attente); line-height: 1.5; margin: 0 0 0.75rem; font-style: italic; }
  .ill-fiche { display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 0.75rem; font-size: 0.75rem; margin: 0 0 1rem; }
  .ill-fiche dt { color: var(--cs-texte-faible); }
  .ill-fiche dd { color: var(--cs-texte); margin: 0; overflow-wrap: anywhere; }
  .ill-fiche code { font-family: ui-monospace, monospace; font-size: 0.6875rem; }
  .ill-modale-boutons { display: flex; flex-wrap: wrap; gap: 0.375rem; }

  @media (max-width: 900px) {
    .ill-modale-corps { flex-direction: column; max-height: 100%; }
    .ill-modale-fiche { flex: 0 0 auto; border-left: none; border-top: 1px solid var(--cs-bord-clair); }
    .ill-modale-image { max-height: 44vh; }
  }
  @media (max-width: 640px) {
    .ill-page { padding: 1rem 0.75rem 3rem; }
    .ill-titre { font-size: 1.375rem; }
    .ill-bilan { text-align: left; }
    .ill-reglages { position: static; }
  }
`
