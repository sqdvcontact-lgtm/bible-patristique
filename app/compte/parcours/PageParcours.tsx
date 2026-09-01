'use client'

// « MON PARCOURS » — ce qu'on revient voir, d'un seul tenant.
//
// Refonte du 1er septembre 2026. Le rang, les premiers pas et les hauts faits
// vivaient sur deux pages ; ils n'en font qu'une, et le sommaire porte les SÉRIES
// exactement comme le volet de la Bible porte les livres — c'est le même geste,
// sauter à un endroit d'une longue page.
//
// ⛔ La distinction avec « Mon compte » est celle de la NATURE, non du sujet : ici
// l'on regarde, là l'on règle. On ne revient pas voir son mot de passe.

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { CADRAGE_PAR_DEFAUT } from '@/app/lib/portraits'
import PortraitLecteur from '@/app/components/PortraitLecteur'
import { useEspace } from '@/app/compte/EspaceCompte'
import { BandeauEspace, Section, SommaireEspace } from '@/app/compte/piecesEspace'
import { ancresParcours } from '@/app/lib/espaceLecteurNavigation'
import type { MarquesLecteur } from '@/app/lib/parcoursLecteur'
import ParcoursDecouverte from '@/app/compte/ParcoursDecouverte'
import { ContenuHautsFaits, type Reponse } from './TableauHautsFaits'

type Lecture = { nb_auteurs: number; total_auteurs: number }

export default function PageParcours() {
  const { user, profil } = useEspace()
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [marques, setMarques] = useState<MarquesLecteur | null>(null)
  const [hautsFaits, setHautsFaits] = useState<Reponse | null>(null)

  useEffect(() => {
    let annule = false

    // ⛔ Le rang ne se lit plus dans `classement_utilisateurs`, qui comptait les
    // commentaires et les essais : il mesure la LECTURE (app/lib/classement.ts).
    supabase.from('lecture_utilisateurs')
      .select('nb_auteurs, total_auteurs')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Mon parcours : le rang n’a pas pu être lu.', error)
        if (!annule) setLecture(data ?? { nb_auteurs: 0, total_auteurs: 0 })
      })

    // ⛔ On compte les commentaires SANS filtrer sur `valide` : le parcours coche un
    // GESTE, il n'a pas à dépendre du délai d'une modération. C'est le rang, lui,
    // qui ne compte que le validé.
    const compte = (table: string, filtres: Record<string, string> = {}) => {
      let q = supabase.from(table).select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      for (const [col, val] of Object.entries(filtres)) q = q.eq(col, val)
      return q
    }
    Promise.all([
      compte('prelevements', { type: 'biblique' }),
      compte('prelevements', { type: 'patristique' }),
      compte('favoris', { type: 'oeuvre' }),
      compte('commentaires'),
      compte('essais', { statut: 'publie' }),
    ]).then(([bibliques, patristiques, oeuvres, commentaires, essais]) => {
      // ⚠️ Un comptage qui échoue rend `count` nul, ce qui se lit comme « pas encore
      // fait » : sans ce signalement, une étape ne se cocherait jamais sans qu'on
      // sache pourquoi. C'est ce qui masquait le décalage de `essais.auteur_id`.
      const erreur = bibliques.error ?? patristiques.error ?? oeuvres.error ?? commentaires.error ?? essais.error
      if (erreur) console.error('Mon parcours : l’avancement n’a pas pu être compté.', erreur)
      if (annule) return
      setMarques({
        versets: bibliques.count ?? 0,
        peres: patristiques.count ?? 0,
        oeuvres: oeuvres.count ?? 0,
        commentaires: commentaires.count ?? 0,
        essais: essais.count ?? 0,
      })
    })

    fetch('/api/compte/hauts-faits')
      .then(res => (res.ok ? res.json() : null))
      .then((r: Reponse | null) => { if (!annule && r) setHautsFaits(r) })
      .catch(e => console.error('Mon parcours : les hauts faits n’ont pas pu être lus.', e))

    return () => { annule = true }
  }, [user.id])

  const score = hautsFaits?.score
  const reperes = [
    score ? `${score.obtenus} points` : null,
    score ? `${score.cases} cases sur ${score.total}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="esp-cadre">
      {/* ⚠️ Les séries viennent de la réponse, non d'une liste écrite ici : un
          sommaire qui nommerait une série disparue renverrait à une ancre absente. */}
      <SommaireEspace page="parcours" groupes={ancresParcours(hautsFaits?.series ?? [])} />

      <div className="esp-page">
        <BandeauEspace
          pseudo={profil.pseudo}
          reperes={reperes || 'Votre parcours'}
          hrefPublic={`/profil/${encodeURIComponent(profil.pseudo)}`}
          visage={
            <PortraitLecteur
              refPortrait={profil.avatar_ref}
              cadrage={{
                posX: profil.avatar_pos_x ?? CADRAGE_PAR_DEFAUT.posX,
                posY: profil.avatar_pos_y ?? CADRAGE_PAR_DEFAUT.posY,
                zoom: profil.avatar_zoom ?? CADRAGE_PAR_DEFAUT.zoom,
              }}
              initiale={profil.pseudo}
              taille={52} />
          } />

        <Section id="rang" titre="Rang">
          {lecture
            ? <BarreRang nbAuteurs={lecture.nb_auteurs} totalAuteurs={lecture.total_auteurs} />
            : <p className="esp-note">Chargement…</p>}
        </Section>

        <Section id="premiers-pas" titre="Premiers pas">
          {marques
            ? <ParcoursDecouverte marques={marques} aUnPortrait={!!profil.avatar_ref} aUneBio={!!profil.bio?.trim()} />
            : <p className="esp-note">Chargement…</p>}
        </Section>

        {hautsFaits && <ContenuHautsFaits etat={hautsFaits} />}
      </div>
    </div>
  )
}

// ── Le rang ──────────────────────────────────────────────────────────────────
//
// ⛔ PLUS D'ÉCHELLE COMPLÈTE SOUS LA BARRE. Elle portait les trois degrés d'autrefois ;
// ils sont six désormais, et six noms alignés sur la largeur d'une colonne ne se
// lisent plus. On montre le degré tenu, le chemin vers le suivant, et ce qu'il
// demande — ce que l'échelle entière ne disait pas mieux.
function BarreRang({ nbAuteurs, totalAuteurs }: { nbAuteurs: number; totalAuteurs: number }) {
  const { rang, rangSuivant, seuilSuivant, seuilPrecedent } = calculerRang(nbAuteurs, totalAuteurs)
  const couleurs = couleurRang(rang)
  const [largeur, setLargeur] = useState(0)

  const pourcentage = rangSuivant && seuilSuivant
    ? Math.min(Math.max(((nbAuteurs - seuilPrecedent) / (seuilSuivant - seuilPrecedent)) * 100, 0), 100)
    : 100

  useEffect(() => {
    const t = setTimeout(() => setLargeur(pourcentage), 80)
    return () => clearTimeout(t)
  }, [pourcentage])

  const manquent = rangSuivant && seuilSuivant ? seuilSuivant - nbAuteurs : 0

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.875rem', fontWeight: 600, color: couleurs.texte, background: couleurs.fond, padding: '3px 12px', borderRadius: '8px' }}>
          {rang}
        </span>
        <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.75rem', color: 'var(--cs-texte-gris)' }}>
          {nbAuteurs} Père{nbAuteurs !== 1 ? 's' : ''} retenu{nbAuteurs !== 1 ? 's' : ''}
          {totalAuteurs > 0 && <> sur {totalAuteurs}</>}
        </span>
      </div>

      <div style={{ position: 'relative', height: '5px', background: 'var(--cs-fond-doux)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${largeur}%`, background: couleurs.texte, borderRadius: '999px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1), background 0.4s ease' }} />
      </div>

      {/* ⚠️ Ce qui RESTE, jamais le chemin parcouru : le lecteur est déjà engagé, et
          c'est le petit reste qui porte (Koo et Fishbach). */}
      <p className="esp-note" style={{ marginTop: '7px' }}>
        {rangSuivant && manquent > 0
          ? <>Encore {manquent} Père{manquent > 1 ? 's' : ''} à retenir avant <em>{rangSuivant}</em>.</>
          : 'Le dernier degré. Il se déplacera quand la bibliothèque s’élargira.'}
      </p>
    </>
  )
}
