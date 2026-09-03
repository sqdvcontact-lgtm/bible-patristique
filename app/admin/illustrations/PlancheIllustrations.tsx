'use client'

import { useEffect, useMemo, useState } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import OngletsPage, { type OngletPage } from '@/app/components/OngletsPage'
import { FONCTIONS, ICONES_ONGLET, ILLUSTRATIONS, type CleFonction, type CleSol, type Illustration, type Pose } from './inventaire'
import {
  MESURE_COLONNE, ORDRE_REGIMES, REGIMES, SPECIMEN_HABILLAGE,
  type GravureFillion,
} from './regimesFillion'
import type { RegimeIllustration } from '@/app/lib/bibleEdition'
import { STYLE_CORPS } from '@/app/lib/compositionBible'
import { colorMix } from '@/app/lib/couleurs'

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

/** Les trois PANNEAUX de la planche. Ils ne sont pas trois façons de trier une
 *  même liste mais trois objets distincts, et trois jugements distincts : les
 *  images qu'on a dessinées, celles qui viennent par milliers d'ailleurs, et la
 *  composition proposée aux gravures d'une édition. D'où `panneaux` et non
 *  `filtres` sur la barre. */
const ONGLETS: readonly OngletPage<ClePanneau>[] = [
  { cle: 'ornements', libelle: 'Ornements du site' },
  { cle: 'familles', libelle: 'Familles nombreuses' },
  { cle: 'fillion', libelle: 'Gravures de Fillion' },
]
type ClePanneau = 'ornements' | 'familles' | 'fillion'

/** Deux façons de regarder les ornements, et elles ne se remplacent pas.
 *  La PLANCHE met tout à la même échelle, sur un fond qu'on choisit : c'est ce
 *  qu'il faut pour juger d'une harmonie. La vue EN CONTEXTE rend chaque image à
 *  sa taille et sur son sol : c'est ce qu'il faut pour juger d'une pose. Un
 *  cul-de-lampe de 1 088 px et une silhouette de 19 px ne se comparent pas côte
 *  à côte, et une image jugée hors de sa mesure ne se juge pas. */
type CleVue = 'planche' | 'contexte'

const ORDRE_FONCTIONS = Object.keys(FONCTIONS) as CleFonction[]
/** Repliés d'entrée : ils ne participent pas au jugement d'harmonie, et les
 *  tuiles du jeu pèsent à elles seules neuf mégaoctets. */
const REPLIES_AU_DEPART: CleFonction[] = ['jeu']

export default function PlancheIllustrations({ familles, gravures, planches, planche }: {
  familles: EchantillonFamille[]
  gravures: GravureFillion[]
  planches: number
  planche: { url: string; legende: string; part: number } | null
}) {
  const [panneau, setPanneau] = useState<ClePanneau>('ornements')
  const [vue, setVue] = useState<CleVue>('planche')
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
    const dormant = TOUTES.filter(i => i.fonction === 'reserve')
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
          <p className="ill-sous-titre">Les images dessinées du site, les familles qui viennent d’ailleurs, et la composition proposée aux gravures de Fillion.</p>
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

      {/* ── Les trois panneaux ──
          ⛔ On prend le MODÈLE de barre du site, on ne le redessine pas : c'est
          ainsi que six barres en étaient venues à six combinaisons de police, de
          corps et de gris sans qu'aucune décision les sépare. */}
      <OngletsPage
        onglets={ONGLETS}
        actif={panneau}
        choisir={setPanneau}
        intitule="Ce que la planche montre"
        className="ill-onglets"
      />

      {panneau === 'ornements' && (
      <>
      {/* ── Réglages ── */}
      <div className="ill-reglages">
        <div className="ill-groupe-reglage">
          <span className="ill-etiquette">Vue</span>
          <button onClick={() => setVue('planche')} className={`ill-bouton${vue === 'planche' ? ' ill-bouton--actif' : ''}`}>Planche</button>
          <button onClick={() => setVue('contexte')} className={`ill-bouton${vue === 'contexte' ? ' ill-bouton--actif' : ''}`}>En contexte</button>
        </div>
        {vue === 'planche' && <>
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
        </>}
      </div>
      {vue === 'contexte' ? <VueEnContexte images={TOUTES} poids={poids} /> : <>
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
      </>}
      </>
      )}

      {/* ── Familles nombreuses ── */}
      {panneau === 'familles' && (
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
      )}

      {/* ── Gravures de Fillion : les trois régimes ── */}
      {panneau === 'fillion' && (
        <SectionRegimes gravures={gravures} planches={planches} planche={planche} fond={fond} />
      )}

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
          {t.pose && <span className="ill-dim">servie à {libellePose(t.pose)}</span>}
        </span>
        {illustration.note && <span className="ill-note">{illustration.note}</span>}
        {illustration.lieu
          ? <a className="ill-lien" href={illustration.lieu.href} target="_blank" rel="noreferrer" title={illustration.lieu.repere}>Voir en place : {illustration.lieu.label} ↗</a>
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
            {t.pose && <><dt>Servie à</dt><dd>{libellePose(t.pose)}</dd></>}
            {t.pose && <><dt>Sol</dt><dd>{SOLS[t.pose.sol].nom}</dd></>}
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

          {illustration.lieu ? (
            <div className="ill-ou">
              <p className="ill-ou-tete">Où la voir</p>
              <p className="ill-ou-txt">{illustration.lieu.repere}</p>
              <a className="ill-lien ill-lien--fort" href={illustration.lieu.href} target="_blank" rel="noreferrer">
                Ouvrir {illustration.lieu.label} ↗
              </a>
            </div>
          ) : (
            <div className="ill-ou">
              <p className="ill-ou-tete">Où la voir</p>
              <p className="ill-ou-txt">Nulle part : aucune page du site n’appelle ce fichier.</p>
            </div>
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
// ── LES SOLS RÉELS ───────────────────────────────────────────────────────────
//
// Les FONDS d'épreuve, plus haut, sont un banc d'essai : on y pose n'importe
// quelle image sur n'importe quel fond pour juger d'une harmonie. Les SOLS, eux,
// disent où chaque image paraît VRAIMENT. Une silhouette de la barre ne
// rencontre jamais le papier ; l'icône d'une carte d'accueil ne rencontre jamais
// le blanc. Les juger là serait les juger ailleurs que chez elles.
const SOLS: Record<CleSol, { nom: string; fond: string; sombre: boolean }> = {
  papier: { nom: 'Papier du site', fond: 'var(--cs-fond)', sombre: false },
  surface: { nom: 'Surface blanche', fond: 'var(--cs-surface)', sombre: false },
  vert: { nom: 'Aplat de la barre', fond: 'var(--cs-vert-aplat)', sombre: true },
  // ⚠️ La vraie carte porte des valeurs LITTÉRALES et son propre jeu pour le
  // Cuir, parce qu'un dégradé composé de jetons d'ENCRE s'inverse avec le thème
  // (charte, « un dégradé de CARTE composé avec des jetons d'ENCRE inverse ses
  // valeurs »). Ici les jetons suffisent : la planche est servie en Clair.
  carte: { nom: 'Carton de l’accueil', fond: 'linear-gradient(160deg, var(--cs-encre) 0%, var(--cs-encre-fonce) 100%)', sombre: true },
}

/** La pose, dite en clair. ⛔ Elle se COMPOSE de ce que la donnée porte, elle ne
 *  se recopie pas d'une phrase : c'est la prose recopiée à la main qui avait
 *  laissé trois écrans d'attente à « 51rem » quand leur source pose 68. */
function libellePose(p: Pose): string {
  const bouts: string[] = []
  if (p.largeur) bouts.push(p.largeur)
  if (p.hauteur) bouts.push(`${p.hauteur} de haut`)
  if (p.largeurMax) bouts.push(`au plus ${p.largeurMax}`)
  if (p.hauteurMax) bouts.push(`bornée à ${p.hauteurMax}`)
  return bouts.join(', ')
}

/** Les dimensions que la page écrit, appliquées telles quelles.
 *  ⚠️ `height: auto` n'est pas un ornement : sans lui, une image qui ne pose
 *  qu'une largeur et deux maxima s'écrase au lieu de tenir son rapport. */
function dimensionsPose(p: Pose): React.CSSProperties {
  return {
    width: p.largeur ?? 'auto',
    height: p.hauteur ?? 'auto',
    maxWidth: p.largeurMax ?? '100%',
    maxHeight: p.hauteurMax,
  }
}

// ── La vue EN CONTEXTE ───────────────────────────────────────────────────────

/** Chaque image sur SON sol, à SA taille, avec SON traitement.
 *
 *  ⛔ Elle ne remplace pas la planche : celle-ci met tout à la même échelle pour
 *  juger d'une harmonie, ce que la taille réelle rend impossible — un cul-de-lampe
 *  de 1 088 px et une silhouette de 19 px ne se comparent pas côte à côte. Les
 *  deux vues répondent à deux questions, et aucune ne dispense de l'autre.
 *
 *  ⚠️ Ce que cette vue ne peut PAS reproduire : les pourcentages se résolvent
 *  contre la bande, les `vw` et `dvh` contre la fenêtre de la planche. Une
 *  largeur en rem ou en pixels est juste au pixel près ; `min(68rem, 96 %)` ne
 *  l'est que tant que la bande est plus large que 68rem. La bande porte donc sa
 *  largeur mesurée, et l'on sait à quoi le pourcentage s'applique. */
export function VueEnContexte({ images, poids }: { images: Illustration[]; poids: Poids }) {
  const posees = images.filter(i => i.traitement?.pose)
  const sansPose = images.filter(i => !i.traitement?.pose)

  return (
    <>
      <p className="ill-explication">
        Chaque image sur le sol où elle paraît vraiment, à la taille que sa page lui donne, avec son opacité et sa
        fusion. Les largeurs en rem et en pixels sont justes au pixel près. Un pourcentage, lui, se résout contre la
        bande et non contre la colonne de la vraie page, et les unités de fenêtre suivent celle de la planche.
      </p>

      {posees.map(img => {
        const pose = img.traitement!.pose!
        const sol = SOLS[pose.sol]
        return (
          <article key={img.chemin} className="ill-ctx">
            <div className="ill-ctx-tete">
              <h3 className="ill-ctx-nom">{img.nom}</h3>
              <span className="ill-ctx-pose">{libellePose(pose)}</span>
              <span className="ill-ctx-sol">{sol.nom}</span>
            </div>
            <div className="ill-ctx-bande" style={{ background: sol.fond }}>
              {img.traitement?.masque ? (
                // Le fichier ne s'affiche pas : il DÉCOUPE, et la couleur vient du
                // texte alentour. La bande lui rend donc l'encre de son sol.
                <span
                  className="ill-ctx-masque"
                  role="img"
                  aria-label={img.nom}
                  style={{
                    ...dimensionsPose(pose),
                    backgroundColor: sol.sombre ? 'var(--cs-sur-aplat)' : 'var(--cs-encre)',
                    WebkitMaskImage: `url("${img.chemin}")`,
                    maskImage: `url("${img.chemin}")`,
                    WebkitMaskSize: 'contain',
                    maskSize: 'contain',
                    WebkitMaskRepeat: 'no-repeat',
                    maskRepeat: 'no-repeat',
                    WebkitMaskPosition: 'center',
                    maskPosition: 'center',
                  }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.chemin}
                  alt={img.nom}
                  style={{
                    ...dimensionsPose(pose),
                    opacity: img.traitement?.opacite,
                    mixBlendMode: img.traitement?.fusion,
                    // ⚠️ Le filtre du Cuir ne s'applique qu'aux ornements, et seulement
                    // sur un sol sombre : c'est là qu'il entre en jeu sur le vrai site.
                    filter: sol.sombre && img.traitement?.ornement ? FILTRE_CUIR : undefined,
                  }}
                />
              )}
            </div>
            <p className="ill-ctx-emploi">{img.emploi}</p>
            {img.lieu && <p className="ill-ctx-repere">{img.lieu.repere}</p>}
            <p className="ill-ctx-pied">
              {poids[img.chemin] !== undefined && <span className={`ill-poids--${tonPoids(poids[img.chemin])}`}>{poidsLisible(poids[img.chemin])}</span>}
              {img.traitement?.opacite !== undefined && <span>opacité {String(img.traitement.opacite).replace('.', ',')}</span>}
              {img.traitement?.fusion && <span>fusion {img.traitement.fusion}</span>}
              {img.traitement?.masque && <span>posée en masque</span>}
              {img.source && <span><code className="ill-code">{img.source}</code></span>}
              {img.lieu && <a href={img.lieu.href} target="_blank" rel="noreferrer">Voir en place ↗</a>}
            </p>
          </article>
        )
      })}

      {sansPose.length > 0 && (
        <div className="ill-ctx-reste">
          <h3 className="ill-ctx-nom">Pose non relevée</h3>
          <p className="ill-ctx-emploi">
            {sansPose.length} images n’ont pas de pose au recensement, et la planche ne l’invente pas. Ce sont, pour
            l’essentiel, celles qu’aucune page n’appelle : les variantes écartées et la frise du
            jeu, dont la route est neutralisée. Une pose se relève sur la SOURCE, jamais de mémoire.
          </p>
          <ul className="ill-ctx-liste">
            {sansPose.map(i => <li key={i.chemin}>{i.nom}<span>{FONCTIONS[i.fonction].titre}</span></li>)}
          </ul>
        </div>
      )}
    </>
  )
}

// ── Gravures de Fillion : les trois régimes ──────────────────────────────────
//
// ⚠️ Le spécimen d'habillage prend `STYLE_CORPS`, le style RÉEL du paratexte
// biblique, et le régime comme la part sont ceux que la base porte, écrits par
// la chaîne d'image et lus par la page de lecture. Rejouer une composition de mémoire dérive au premier
// réglage — c'est la règle de la planche des styles, et elle vaut ici.

export function SectionRegimes({ gravures, planches, planche, fond }: {
  gravures: GravureFillion[]
  planches: number
  planche: { url: string; legende: string; part: number } | null
  fond: CleFond
}) {
  const f = FONDS[fond]
  const parRegime = (r: RegimeIllustration) => gravures.filter(g => g.regime === r)
  const compte = (r: RegimeIllustration) => (r === 'hors-texte' ? planches : parRegime(r).length)
  const boisseau = gravures.find(g => g.cle === 'fillion-t07-p0219-i01') ?? parRegime('vignette')[0] ?? null
  const scene = parRegime('au-fil')[0] ?? null

  return (
    <section className="ill-section">
      <div className="ill-section-tete ill-section-tete--fixe">
        <h2 className="ill-section-titre">Gravures de Fillion : trois régimes</h2>
        <span className="ill-compte">{gravures.length + planches}</span>
      </div>
      <p className="ill-section-propos">
        Une seule composition servait les quarante-trois, du boisseau romain de trois centimètres à la planche double
        page. Trois régimes désormais, et c’est la LARGEUR IMPRIMÉE qui les départage : la page de Fillion est à deux
        colonnes, une gravure qui tient dans une colonne est une vignette, une gravure qui les enjambe est une scène.
        Le régime et la part de colonne sont écrits dans la base par la chaîne d’image, dont la règle vit dans
        <code className="ill-code">scripts/fillion/regime-gravure.mjs</code>, et la page de lecture les lit tels quels ;
        les fichiers se refont par <code className="ill-code">scripts/fillion/detourer-gravures.mjs</code>.
      </p>

      {/* ── Ce que la mesure range ── */}
      <div className="ill-reg-critere">
        <h3 className="ill-reg-titre3">La part de colonne écrite, et ce qu’elle range</h3>
        <ul className="ill-reg-mesures">
          {gravures.map(g => (
            <li key={g.cle} className={`ill-reg-mesure ill-reg-mesure--${g.regime}`}>
              <span className="ill-reg-part">{`${Math.round(g.part * 100)} %`}</span>
              <span className="ill-reg-nom">{g.legende}</span>
              <span className="ill-reg-verset">{g.verset}</span>
              <span className="ill-reg-jeton">{REGIMES[g.regime].titre}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Les trois régimes ── */}
      {ORDRE_REGIMES.map(cle => {
        const r = REGIMES[cle]
        // ⚠️ Une vignette n'a pas UNE part mais une PLAGE : chacune suit la
        //    largeur imprimée, écrite par la chaîne. On montre ce que la base porte.
        const parts = cle === 'hors-texte' ? (planche ? [planche.part] : []) : parRegime(cle).map(g => g.part)
        const plage = parts.length === 0
          ? '—'
          : Math.min(...parts) !== Math.max(...parts)
            ? `${Math.round(Math.min(...parts) * 100)} à ${Math.round(Math.max(...parts) * 100)} %`
            : `${Math.round(Math.max(...parts) * 100)} %`
        return (
          <article key={cle} className="ill-reg">
            <div className="ill-reg-tete">
              <h3 className="ill-reg-nom-regime">{r.titre}</h3>
              <span className="ill-reg-pour">{r.pour}</span>
              <span className="ill-reg-compte">{compte(cle)}</span>
            </div>
            <p className="ill-reg-texte">{r.propos}</p>
            <dl className="ill-reg-fiche">
              <dt>Largeur</dt><dd>{plage} de la colonne, écrite par la chaîne d’après la largeur imprimée</dd>
              <dt>Détourage</dt><dd>{r.detourage ? 'oui, encre reposée au rendu' : 'jamais, elle garde son papier'}</dd>
              <dt>Habillage</dt><dd>{r.habillage ? 'oui, dans le commentaire qui couvre son verset, un bord après l’autre' : 'non'}</dd>
              <dt>Cadre</dt><dd>{r.cadre ? 'filet du site, rogné EN DEDANS du filet gravé' : cle === 'hors-texte' ? 'passe-partout' : 'aucun'}</dd>
            </dl>

            {cle === 'vignette' && boisseau && <SpecimenHabillage gravure={boisseau} fond={fond} />}
            {cle === 'au-fil' && scene && (
              <div className="ill-reg-scene" style={{ backgroundColor: f.fond }}>
                <div className="ill-reg-colonne">
                  <figure className="ill-reg-cadre" style={{ width: `${Math.round(scene.part * 100)}%`, borderColor: colorMix(f.encre, 30) }}>
                    {/* ⛔ Une SCÈNE est opaque : la poser en masque la rendrait
                        en aplat d'encre. Elle garde son papier. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={scene.url} alt={scene.legende} style={{ display: 'block', width: '100%', height: 'auto', border: `1px solid ${colorMix(f.encre, 30)}` }} />
                    <figcaption style={{ ...STYLE_CORPS, textAlign: 'center', color: colorMix(f.encre, 70), fontStyle: 'italic', marginTop: '0.375rem' }}>
                      {scene.legende}
                    </figcaption>
                  </figure>
                </div>
              </div>
            )}
            {cle === 'hors-texte' && planche && (
              <div className="ill-reg-scene" style={{ backgroundColor: f.fond }}>
                <div className="ill-reg-colonne">
                  <figure className="ill-reg-passe" style={{ backgroundColor: colorMix(f.encre, 6) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={planche.url} alt={planche.legende} />
                  </figure>
                  <p style={{ ...STYLE_CORPS, textAlign: 'center', color: colorMix(f.encre, 70), fontStyle: 'italic', marginTop: '0.375rem' }}>
                    Planche hors-texte, tome I. <span style={{ color: 'var(--cs-or)' }}>Agrandir</span>
                  </p>
                </div>
              </div>
            )}
          </article>
        )
      })}

      {/* ── Les gravures détourées, à leur taille servie ── */}
      <div className="ill-reg-avant-apres">
        <h3 className="ill-reg-titre3">Les onze gravures de Marc, à leur taille servie</h3>
        <p className="ill-reg-texte">
          Toutes tirées du feuillet JP2 de l’archive, jamais de la page composée du PDF : le trait y est entier et la
          taille de la gravure survit. L’encre est reposée au rendu, si bien qu’un seul fichier sert le papier et le cuir.
        </p>
        <div className="ill-reg-paires">
          {gravures.map(g => (
            <div key={g.cle} className="ill-reg-servie">
              <div className="ill-reg-case" style={{ backgroundColor: f.fond }}>
                {g.regime === 'vignette'
                  ? <span className="ill-reg-encree" style={{ ...encree(g.url, f.encre), aspectRatio: `${g.largeur} / ${g.hauteur}` }} role="img" aria-label={g.legende} />
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={g.url} alt={g.legende} style={{ display: 'block', width: '100%', height: 'auto' }} />}
              </div>
              <p className="ill-reg-paire-nom">{g.legende}<br /><span>{g.largeur} × {g.hauteur} px servis · {REGIMES[g.regime].titre.toLowerCase()}</span></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** L'encre se REPOSE : le fichier ne sert que d'alpha, la couleur vient du fond
 *  d'épreuve. C'est la règle de la charte pour le monogramme et les ornements, et
 *  c'est ce qui permet à un seul fichier de servir les deux thèmes. */
function encree(url: string, encre: string): React.CSSProperties {
  return {
    backgroundColor: encre,
    WebkitMaskImage: `url("${url}")`,
    maskImage: `url("${url}")`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
  }
}

/** Le spécimen d'habillage, sur le texte RÉEL de Fillion pour Marc 4, 21-25.
 *
 *  ⛔ La vignette n'est pas posée en tête du bloc : la manchette occupe déjà sept
 *  rem à gauche, et une vignette posée en face ne laisserait que deux cents pixels
 *  de texte justifié entre les deux. Elle se pose à l'endroit du texte où elle
 *  tombe, une fois la manchette passée.
 *
 *  ⚠️ Ce spécimen montre ce que l'habillage DONNERAIT. Aucune des onze gravures
 *  n'est aujourd'hui dans ce cas : elles sont ancrées sur un VERSET, donc posées
 *  entre deux versets, où elles ont leur propre axe et n'ont rien à habiller.
 *  L'habillage se gagne en déplaçant l'ancre vers le bloc de commentaire, ce qui
 *  est une décision éditoriale et non un réglage de rendu. */
function SpecimenHabillage({ gravure, fond }: { gravure: GravureFillion; fond: CleFond }) {
  const f = FONDS[fond]
  const largeur = Math.round(MESURE_COLONNE * gravure.part)
  return (
    <div className="ill-reg-scene" style={{ backgroundColor: f.fond }}>
      <div className="ill-reg-colonne">
        <div style={{ ...STYLE_CORPS, display: 'flow-root', color: colorMix(f.encre, 85) }}>
          <span className="ill-reg-manchette" style={{ color: f.encre }}>{SPECIMEN_HABILLAGE.manchette}</span>
          {SPECIMEN_HABILLAGE.avant}
          <figure className="ill-reg-vignette" style={{ width: `${largeur}px` }}>
            <span
              className="ill-reg-encree"
              style={{ ...encree(gravure.url, f.encre), aspectRatio: `${gravure.largeur} / ${gravure.hauteur}` }}
              role="img"
              aria-label={gravure.legende}
            />
            <figcaption style={{ color: colorMix(f.encre, 62) }}>{gravure.legende}</figcaption>
          </figure>
          {' '}{SPECIMEN_HABILLAGE.apres}
        </div>
      </div>
    </div>
  )
}

// ── Feuille de la planche ────────────────────────────────────────────────────

export const CSS = `
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


  /* ── Gravures de Fillion : les trois régimes ─────────────────────────────
     ⚠️ Le SPÉCIMEN porte les mesures RÉELLES de la page de lecture : colonne de
     502 px, manchette de 7 rem, corps d'apparat par son jeton. Les changer ici
     ferait juger une composition que la page ne sert pas. */
  .ill-reg-avis { max-width: 52rem; margin: 0 0 1.25rem; font-size: 0.75rem; line-height: 1.5; color: var(--cs-attente); font-family: var(--font-source-sans), Arial, sans-serif; }
  .ill-code { font-family: ui-monospace, monospace; font-size: 0.6875rem; color: var(--cs-texte); }
  .ill-reg-titre3 { font-family: var(--font-source-serif), Georgia, serif; font-size: 1rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0 0 0.4375rem; }
  .ill-reg-texte { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.8125rem; line-height: 1.6; color: var(--cs-texte-second); margin: 0 0 0.75rem; max-width: 52rem; }

  .ill-reg-critere { background: var(--cs-surface); border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 1rem 1.125rem; margin-bottom: 1.5rem; }
  .ill-reg-mesures { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; background: var(--cs-bord-clair); border: 1px solid var(--cs-bord-clair); border-radius: 4px; overflow: hidden; }
  .ill-reg-mesure { display: grid; grid-template-columns: 3.5rem 1fr auto 9rem; gap: 0.75rem; align-items: baseline; background: var(--cs-fond-clair); padding: 0.3125rem 0.6875rem; font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.75rem; }
  .ill-reg-part { font-variant-numeric: tabular-nums; text-align: right; color: var(--cs-texte); font-weight: 600; }
  .ill-reg-nom { color: var(--cs-texte-second); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ill-reg-verset { color: var(--cs-texte-faible); font-size: 0.6875rem; }
  .ill-reg-jeton { text-align: right; font-weight: 600; color: var(--cs-vert); white-space: nowrap; }
  .ill-reg-mesure--au-fil .ill-reg-part, .ill-reg-mesure--au-fil .ill-reg-jeton { color: var(--cs-or); }
  .ill-reg-servie { display: flex; flex-direction: column; gap: 0.375rem; }

  .ill-reg { border-top: 1px solid var(--cs-bord-clair); padding-top: 1.125rem; margin-top: 1.5rem; }
  .ill-reg-tete { display: flex; align-items: baseline; gap: 0.625rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
  .ill-reg-lettre { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.75rem; font-weight: 700; color: var(--cs-sur-aplat); background: var(--cs-vert-aplat); width: 1.375rem; height: 1.375rem; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; flex: none; }
  .ill-reg-nom-regime { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.1875rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0; }
  .ill-reg-pour { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; }
  .ill-reg-compte { margin-left: auto; font-family: var(--font-source-serif), Georgia, serif; font-size: 1.25rem; color: var(--cs-texte-second); }
  .ill-reg-fiche { display: grid; grid-template-columns: auto 1fr; gap: 0.1875rem 0.75rem; font-size: 0.75rem; margin: 0 0 0.875rem; max-width: 32rem; font-family: var(--font-source-sans), Arial, sans-serif; }
  .ill-reg-fiche dt { color: var(--cs-texte-faible); }
  .ill-reg-fiche dd { color: var(--cs-texte); margin: 0; }

  .ill-reg-scene { border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 1.5rem 1.25rem; overflow-x: auto; }
  .ill-reg-colonne { width: 502px; max-width: 100%; margin: 0 auto; }
  .ill-reg-manchette { float: left; width: 7rem; margin: 0 1rem 0.2rem 0; font-weight: 600; }
  .ill-reg-vignette { float: right; margin: 0.15rem 0 0.55rem 1.1rem; }
  .ill-reg-vignette figcaption { font-size: 0.625rem; line-height: 1.25; margin-top: 0.35rem; text-align: center; font-style: italic; }
  .ill-reg-encree { display: block; width: 100%; }
  .ill-reg-cadre { margin: 0 auto; padding: 5px; border: 1px solid; }
  .ill-reg-cadre img { display: block; width: 100%; height: auto; }
  .ill-reg-passe { margin: 0; padding: 10px; }
  .ill-reg-passe img { display: block; width: 100%; height: auto; }

  .ill-reg-avant-apres { border-top: 1px solid var(--cs-bord-clair); padding-top: 1.125rem; margin-top: 1.5rem; }
  .ill-reg-paires { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); gap: 1rem; }
  .ill-reg-paire { display: grid; grid-template-columns: 1fr 1fr; gap: 0.375rem; }
  .ill-reg-case { border: 1px solid var(--cs-bord-clair); border-radius: 4px; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; padding: 0.5rem; overflow: hidden; }
  .ill-reg-case img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .ill-reg-case .ill-reg-encree { width: 100%; height: 100%; }
  .ill-reg-paire-nom { grid-column: 1 / -1; margin: 0; font-size: 0.6875rem; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; line-height: 1.35; }

  @media (max-width: 640px) {
    .ill-reg-manchette { float: none; width: auto; margin: 0 0 0.3rem; }
    .ill-reg-vignette { float: none; margin: 0.6rem auto; }
    .ill-reg-mesure { grid-template-columns: 3rem 1fr 6rem; }
    .ill-reg-verset { display: none; }
  }


  /* ── Onglets et vue en contexte ─────────────────────────────────────────── */
  .ill-onglets { max-width: 82rem; margin: 0 auto 1.25rem; }

  /* ⚠️ La BANDE porte le sol réel de l'image et sa largeur mesurée : un
     pourcentage se résout contre elle, et l'on doit savoir contre quoi. */
  .ill-ctx { max-width: 82rem; margin: 0 auto 2.25rem; }
  .ill-ctx-tete { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.4375rem; }
  .ill-ctx-nom { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.1875rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0; }
  .ill-ctx-pose { font-family: ui-monospace, monospace; font-size: 0.6875rem; color: var(--cs-texte); background: var(--cs-fond-doux); border-radius: 4px; padding: 0.125rem 0.4375rem; }
  .ill-ctx-sol { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; margin-left: auto; }
  .ill-ctx-bande { border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 1.5rem; display: flex; align-items: center; justify-content: center; min-height: 5rem; overflow: hidden; }
  .ill-ctx-bande img { display: block; }
  .ill-ctx-masque { display: block; }
  .ill-ctx-emploi { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.8125rem; line-height: 1.55; color: var(--cs-texte-second); margin: 0.5rem 0 0; max-width: 52rem; }
  .ill-ctx-repere { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.75rem; font-style: italic; line-height: 1.5; color: var(--cs-texte-doux); margin: 0.1875rem 0 0; max-width: 52rem; }
  .ill-ctx-pied { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: baseline; margin: 0.4375rem 0 0; font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.6875rem; color: var(--cs-texte-faible); }
  .ill-ctx-pied a { color: var(--cs-vert); text-decoration: none; }
  .ill-ctx-pied a:hover { text-decoration: underline; }

  .ill-ctx-reste { max-width: 82rem; margin: 0 auto; border-top: 1px solid var(--cs-bord-clair); padding-top: 1.125rem; }
  .ill-ctx-liste { list-style: none; margin: 0.75rem 0 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 0.1875rem 1rem; font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.75rem; color: var(--cs-texte-second); }
  .ill-ctx-liste li { display: flex; justify-content: space-between; gap: 0.5rem; border-bottom: 1px solid var(--cs-bord-clair); padding: 0.1875rem 0; }
  .ill-ctx-liste span { color: var(--cs-texte-faible); font-size: 0.6875rem; }

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
  .ill-ou { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid var(--cs-bord-clair); }
  .ill-ou-tete { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-faible); font-weight: 700; margin: 0 0 0.25rem; }
  .ill-ou-txt { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.55; margin: 0; font-family: var(--font-source-serif), Georgia, serif; }

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
