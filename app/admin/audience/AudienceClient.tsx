'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CSS_CONTROLE } from '../controle/stylesControle'
import { CSS_AUDIENCE } from './stylesAudience'
import { formaterPlageCanonique, nomLivreReference } from '@/app/lib/referencesBibliques'
import type { TableauAudience, SerieJour } from './types'

// ── Présentation pure ────────────────────────────────────────────────────────
const nb = (n: number | null | undefined) => (n ?? 0).toLocaleString('fr-FR')

function dateCourte(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}
function dateLongue(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso.length === 10 ? iso + 'T12:00:00' : iso)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}
function horodatage(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

// Le pays arrive en code ISO à deux lettres, tel que l'hébergeur le donne. On le
// nomme quand le navigateur sait le faire, ce qui évite d'entretenir une liste.
const NOM_PAYS = new Intl.DisplayNames(['fr'], { type: 'region' })
function nomPays(code: string): string {
  if (!code || code === '??') return 'Origine inconnue'
  try { return NOM_PAYS.of(code) ?? code } catch { return code }
}

// ── Briques d'affichage ──────────────────────────────────────────────────────
/**
 * Un libellé de tuile est soit invariable (« sur la liste d'attente »), soit un
 * couple singulier/pluriel.
 *
 * ⚠️ La tuile accorde elle-même. Écrire « 1 actifs sur 7 jours » est le défaut le
 * plus visible d'un tableau de bord, parce qu'un compteur passe par 1 tous les
 * jours. Le zéro prend le SINGULIER, comme le veut l'usage français : « 0 compte
 * créé », non « 0 comptes créés ».
 */
type Libelle = string | [singulier: string, pluriel: string]

function accorder(n: number, label: Libelle): string {
  if (typeof label === 'string') return label
  return Math.abs(n) < 2 ? label[0] : label[1]
}

function Tuile({ n, label, delta }: { n: number; label: Libelle; delta?: number | null }) {
  return (
    <div className="cc-tuile">
      <div className="cc-tuile-val" style={{ color: 'var(--cs-encre-fonce)' }}>{nb(n)}</div>
      <div className="cc-tuile-lbl">{accorder(n, label)}</div>
      {delta != null && (
        <div className={`au-delta ${delta > 0 ? 'au-delta-hausse' : delta < 0 ? 'au-delta-baisse' : 'au-delta-plat'}`}>
          {delta > 0 ? `+${nb(delta)}` : delta < 0 ? nb(delta) : 'inchangé'} depuis la veille
        </div>
      )}
    </div>
  )
}

function Carte({ titre, children, pleineLargeur }: { titre: string; children: React.ReactNode; pleineLargeur?: boolean }) {
  return (
    <section className="cc-carte" style={pleineLargeur ? { gridColumn: '1 / -1' } : undefined}>
      <h2 className="cc-carte-titre">{titre}</h2>
      <div className="cc-carte-corps">{children}</div>
    </section>
  )
}

function Vide({ texte }: { texte: string }) {
  return <p className="au-vide">{texte}</p>
}

/** Classement : un nom, un nombre, une barre de proportion. */
function Classement({
  lignes, vide, lien,
}: {
  lignes: { nom: string; valeur: number; detail?: string }[]
  vide: string
  lien?: (nom: string) => string | null
}) {
  if (lignes.length === 0) return <Vide texte={vide} />
  const sommet = Math.max(...lignes.map(l => l.valeur), 1)
  return (
    <ul className="au-liste">
      {lignes.map((l, i) => {
        const href = lien?.(l.nom) ?? null
        return (
          <li key={`${l.nom}-${i}`} className="au-ligne">
            <span className="au-ligne-nom" title={l.nom}>
              {href ? <Link href={href}>{l.nom}</Link> : l.nom}
              {l.detail && <span className="au-ligne-detail">{l.detail}</span>}
            </span>
            <span className="au-ligne-val">{nb(l.valeur)}</span>
            <span className="au-ligne-piste">
              <span className="au-ligne-part" style={{ width: `${Math.max((l.valeur / sommet) * 100, l.valeur > 0 ? 2 : 0)}%` }} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Courbe de période. Une aire pour la série principale, un trait pointillé pour
 * la seconde.
 *
 * ⚠️ Le SVG garde son viewBox et s'étire en largeur SANS `preserveAspectRatio="none"` :
 * l'étirement non uniforme écraserait les traits, qui paraîtraient plus fins en haut
 * qu'en bas. On accepte donc qu'il grandisse en hauteur avec la largeur.
 */
function Courbe({
  serie, principale, seconde, labelPrincipale, labelSeconde,
}: {
  serie: SerieJour[]
  principale: keyof SerieJour
  seconde?: keyof SerieJour
  labelPrincipale: string
  labelSeconde?: string
}) {
  if (serie.length === 0) return <Vide texte="La période ne contient aucun jour." />

  const L = 720, H = 150, HAUT = 10, BAS = 6
  const valeurs = (cle: keyof SerieJour) => serie.map(j => Number(j[cle]) || 0)
  const toutes = [...valeurs(principale), ...(seconde ? valeurs(seconde) : [])]
  const sommet = Math.max(...toutes, 1)
  const rienDuTout = toutes.every(v => v === 0)

  const x = (i: number) => (serie.length === 1 ? L / 2 : (i * L) / (serie.length - 1))
  const y = (v: number) => H - BAS - (v / sommet) * (H - HAUT - BAS)

  const trace = (cle: keyof SerieJour) =>
    valeurs(cle).map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const aire = `${trace(principale)} L ${x(serie.length - 1).toFixed(1)} ${H - BAS} L ${x(0).toFixed(1)} ${H - BAS} Z`

  return (
    <div>
      <svg className="au-courbe" viewBox={`0 0 ${L} ${H}`} role="img"
        aria-label={`${labelPrincipale} du ${dateLongue(serie[0].jour)} au ${dateLongue(serie[serie.length - 1].jour)}`}>
        {[0, 0.5, 1].map(p => (
          <line key={p} className="au-courbe-grille" x1={0} x2={L} y1={HAUT + p * (H - HAUT - BAS)} y2={HAUT + p * (H - HAUT - BAS)} />
        ))}
        {!rienDuTout && (
          <>
            <path className="au-courbe-aire" d={aire} />
            <path className="au-courbe-trait" d={trace(principale)} />
            {seconde && <path className="au-courbe-second" d={trace(seconde)} />}
          </>
        )}
      </svg>
      <div className="au-courbe-bornes">
        <span>{dateCourte(serie[0].jour)}</span>
        <span>{rienDuTout ? 'aucun relevé' : `sommet ${nb(sommet)}`}</span>
        <span>{dateCourte(serie[serie.length - 1].jour)}</span>
      </div>
      <div className="au-courbe-legende">
        <span className="au-courbe-cle">
          <span className="au-courbe-pastille" style={{ background: 'var(--cs-vert)' }} />{labelPrincipale}
        </span>
        {seconde && labelSeconde && (
          <span className="au-courbe-cle">
            <span className="au-courbe-pastille" style={{ background: 'var(--cs-or)' }} />{labelSeconde}
          </span>
        )}
      </div>
    </div>
  )
}

// ── La page ──────────────────────────────────────────────────────────────────
const ONGLETS = [
  { cle: 'ensemble', label: 'Vue d’ensemble' },
  { cle: 'visites', label: 'Visites' },
  { cle: 'comptes', label: 'Comptes' },
  { cle: 'lectures', label: 'Lectures' },
] as const
type CleOnglet = (typeof ONGLETS)[number]['cle']

const PERIODES = [7, 30, 90, 365]

export default function AudienceClient({ tb, ongletInitial }: { tb: TableauAudience; ongletInitial: CleOnglet }) {
  const [onglet, setOnglet] = useState<CleOnglet>(ongletInitial)
  const r = tb.resume
  // La collecte a commencé le jour de sa pose : tant qu'aucune vue n'est arrivée,
  // les zéros de la page ne veulent rien dire, et il faut le dire plutôt que de
  // laisser croire à une fréquentation nulle.
  const collecteVide = !tb.premiere_vue

  return (
    <main className="cc-page">
      <style dangerouslySetInnerHTML={{ __html: CSS_CONTROLE + CSS_AUDIENCE }} />

      <div className="cc-entete">
        <div>
          <Link href="/admin/controle" className="cc-retour">← Centre de contrôle</Link>
          <h1 className="cc-titre">Audience</h1>
          <p className="cc-sous-titre">Ce que le site reçoit, et ce qu’on y fait.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="au-periodes">
            {PERIODES.map(n => (
              <Link key={n} href={`/admin/audience?jours=${n}&onglet=${onglet}`}
                className={`au-periode ${tb.jours === n ? 'au-periode-active' : ''}`}>
                {n === 365 ? '1 an' : `${n} j`}
              </Link>
            ))}
          </div>
          <div className="cc-horodatage" style={{ marginTop: '0.375rem' }}>Relevé du {horodatage(tb.genere_le)}</div>
        </div>
      </div>

      <nav className="au-onglets" aria-label="Sections de l’audience">
        {ONGLETS.map(o => (
          <button key={o.cle} type="button" onClick={() => setOnglet(o.cle)}
            className={`au-onglet ${onglet === o.cle ? 'au-onglet-actif' : ''}`}
            aria-current={onglet === o.cle ? 'page' : undefined}>
            {o.label}
          </button>
        ))}
      </nav>

      <div className="cc-grille">
        {collecteVide && (
          <div className="au-attente">
            <div className="au-attente-tete">La collecte vient d’être posée</div>
            <p className="au-attente-txt">
              Aucune vue n’a encore été enregistrée. La mesure ne compte que le site en ligne : rien
              n’est relevé depuis le poste de travail, ni des pages d’administration, ni de votre
              propre lecture, un administrateur n’étant pas le public du site. Les chiffres de
              fréquentation resteront donc à zéro jusqu’à la première visite d’un tiers. Tout ce qui
              vient de la base, dans les onglets Comptes et Lectures, est en revanche déjà juste.
            </p>
          </div>
        )}

        {onglet === 'ensemble' && (
          <>
            <Carte titre="Aujourd’hui">
              <div className="cc-tuiles">
                <Tuile n={r.vues_jour} label={['page vue', 'pages vues']} delta={r.vues_jour - r.vues_veille} />
                <Tuile n={r.visiteurs_jour} label={['visiteur', 'visiteurs']} />
                <Tuile n={r.vues_veille} label={['vue la veille', 'vues la veille']} />
              </div>
            </Carte>

            <Carte titre={`Sur ${tb.jours} jours`}>
              <div className="cc-tuiles">
                <Tuile n={r.vues_periode} label={['page vue', 'pages vues']} />
                <Tuile n={r.visiteurs_periode} label={['visiteur', 'visiteurs']} />
                <Tuile n={r.comptes_periode} label={['compte créé', 'comptes créés']} />
                <Tuile n={r.livres_periode} label={['livre marqué lu', 'livres marqués lus']} />
              </div>
            </Carte>

            <Carte titre="La fréquentation, jour par jour" pleineLargeur>
              <Courbe serie={tb.serie} principale="vues" seconde="visiteurs"
                labelPrincipale="pages vues" labelSeconde="visiteurs" />
            </Carte>

            <Carte titre="Où l’on va">
              <Classement
                lignes={tb.rubriques.map(x => ({ nom: x.rubrique, valeur: x.vues }))}
                vide="Aucune vue à répartir pour l’instant."
              />
            </Carte>

            <Carte titre="Le site en un coup d’œil">
              <div className="cc-tuiles">
                <Tuile n={r.comptes_total} label={['compte', 'comptes']} />
                <Tuile n={tb.comptes.actifs_30j} label={['actif sur 30 jours', 'actifs sur 30 jours']} />
                <Tuile n={tb.lectures.essais_publies} label={['essai publié', 'essais publiés']} />
                <Tuile n={r.liste_attente} label="sur la liste d’attente" />
              </div>
            </Carte>
          </>
        )}

        {onglet === 'visites' && (
          <>
            <Carte titre="Pages vues et visiteurs" pleineLargeur>
              <Courbe serie={tb.serie} principale="vues" seconde="visiteurs"
                labelPrincipale="pages vues" labelSeconde="visiteurs" />
            </Carte>

            <Carte titre="Les pages les plus vues">
              <Classement
                lignes={tb.pages.map(p => ({
                  nom: p.chemin,
                  valeur: p.vues,
                  detail: p.visiteurs !== p.vues ? `${nb(p.visiteurs)} visiteur${p.visiteurs > 1 ? 's' : ''}` : undefined,
                }))}
                vide="Aucune page vue sur la période."
                lien={chemin => chemin}
              />
            </Carte>

            <Carte titre="D’où l’on vient">
              <Classement
                lignes={tb.referents.map(x => ({ nom: x.referent, valeur: x.vues }))}
                vide="Aucune provenance relevée. Une visite sans référent est un accès direct, par signet ou par saisie de l’adresse."
              />
            </Carte>

            <Carte titre="Les pays">
              <Classement
                lignes={tb.pays.map(x => ({ nom: nomPays(x.pays), valeur: x.vues }))}
                vide="Aucun pays relevé. Le pays vient de l’hébergeur, il n’est donc connu qu’en ligne."
              />
            </Carte>

            <Carte titre="Sur quoi l’on lit">
              <Classement
                lignes={tb.appareils.map(x => ({ nom: x.appareil, valeur: x.vues }))}
                vide="Aucun appareil relevé."
              />
            </Carte>

            <Carte titre="Les rubriques">
              <Classement
                lignes={tb.rubriques.map(x => ({ nom: x.rubrique, valeur: x.vues }))}
                vide="Aucune vue à répartir."
              />
            </Carte>
          </>
        )}

        {onglet === 'comptes' && (
          <>
            <Carte titre="L’état des comptes">
              <div className="cc-tuiles">
                <Tuile n={tb.comptes.total} label={['compte en tout', 'comptes en tout']} />
                <Tuile n={r.comptes_periode} label={[`créé sur ${tb.jours} jours`, `créés sur ${tb.jours} jours`]} />
                <Tuile n={tb.comptes.actifs_7j} label={['actif sur 7 jours', 'actifs sur 7 jours']} />
                <Tuile n={tb.comptes.actifs_30j} label={['actif sur 30 jours', 'actifs sur 30 jours']} />
                <Tuile n={tb.comptes.avec_essai} label={['a écrit un essai', 'ont écrit un essai']} />
                <Tuile n={tb.comptes.liste_attente_a_prevenir} label="à prévenir de l’ouverture" />
              </div>
              <p className="cc-mention">
                Un compte est dit actif s’il a laissé une trace datée sur la période : un livre marqué lu,
                un favori, un prélèvement, un commentaire ou un essai. Une simple lecture ne compte pas,
                la mesure d’audience étant anonyme et ne sachant pas de quel compte vient une page.
              </p>
            </Carte>

            <Carte titre="Les inscriptions, jour par jour" pleineLargeur>
              <Courbe serie={tb.serie} principale="comptes" labelPrincipale="comptes créés" />
            </Carte>

            <Carte titre="Les derniers inscrits">
              {tb.comptes.derniers.length === 0
                ? <Vide texte="Aucun compte." />
                : (
                  <ul className="au-liste">
                    {tb.comptes.derniers.map(c => (
                      <li key={`${c.pseudo}-${c.created_at}`} className="au-ligne">
                        <span className="au-ligne-nom">{c.pseudo || 'sans pseudonyme'}</span>
                        <span className="au-ligne-date">{dateLongue(c.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                )}
            </Carte>
          </>
        )}

        {onglet === 'lectures' && (
          <>
            <Carte titre="Ce qu’on y fait">
              <div className="cc-tuiles">
                <Tuile n={r.livres_periode} label={[`livre marqué lu sur ${tb.jours} j`, `livres marqués lus sur ${tb.jours} j`]} />
                <Tuile n={tb.lectures.livres_total} label="depuis toujours" />
                <Tuile n={tb.lectures.prelevements_periode} label={['prélèvement', 'prélèvements']} />
                <Tuile n={tb.lectures.favoris_periode} label={['favori', 'favoris']} />
                <Tuile n={tb.lectures.commentaires_periode} label={['commentaire', 'commentaires']} />
                <Tuile n={tb.lectures.essais_publies} label={['essai publié', 'essais publiés']} />
              </div>
            </Carte>

            <Carte titre="Les livres, jour par jour" pleineLargeur>
              <Courbe serie={tb.serie} principale="livres" labelPrincipale="livres marqués lus" />
            </Carte>

            <Carte titre="Les livres bibliques les plus suivis">
              <Classement
                lignes={tb.lectures.livres.map(l => ({
                  nom: nomLivreReference(l.livre_code),
                  valeur: l.lectures,
                  detail: `${nb(l.lecteurs)} lecteur${l.lecteurs > 1 ? 's' : ''}`,
                }))}
                vide="Personne n’a encore marqué de livre comme lu."
              />
            </Carte>

            <Carte titre="Les versets les plus lus">
              <Classement
                lignes={tb.lectures.versets.map(v => ({ nom: formaterPlageCanonique(v.id_verset), valeur: v.nb_lectures }))}
                vide="Aucune lecture de verset relevée."
              />
              <p className="cc-mention">
                Ce compteur est antérieur à la mesure d’audience et n’a pas de date : il dit le total
                depuis toujours, non la période choisie.
              </p>
            </Carte>

            <Carte titre="Les essais les plus lus">
              <Classement
                lignes={tb.lectures.essais.map(e => ({ nom: e.titre, valeur: e.nb_vues ?? 0 }))}
                vide="Aucun essai publié."
              />
            </Carte>
          </>
        )}
      </div>

      <p className="cc-mention" style={{ maxWidth: '74rem', margin: '1.25rem auto 0' }}>
        Mesure maison, sans cookie et sans outil tiers. L’adresse IP n’est jamais écrite : elle sert à
        calculer une empreinte dont le sel change chaque jour. Ne sont comptés ni le poste de travail,
        ni les pages d’administration, ni la lecture d’un compte administrateur.
        Première vue enregistrée : {dateLongue(tb.premiere_vue)}.
      </p>
    </main>
  )
}
