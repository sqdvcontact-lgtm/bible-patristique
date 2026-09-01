'use client'

// « Où j'en suis » : la première rubrique de l'espace, celle où l'on revient.
//
// ⛔ Elle ne REFAIT PAS la page publique. L'ancienne page du compte y recopiait la
// bibliothèque et les publications, cartes entières servies deux fois : elles sont
// ici deux lignes comptées qui mènent à la page publique, laquelle les montre déjà.

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { CADRAGE_PAR_DEFAUT } from '@/app/lib/portraits'
import PortraitLecteur from '@/app/components/PortraitLecteur'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import { useEspace } from '@/app/compte/EspaceCompte'
import { Carte } from '@/app/compte/champsCompte'
import type { MarquesLecteur } from '@/app/lib/parcoursLecteur'
import ParcoursDecouverte from './ParcoursDecouverte'

type Classement = { score: number; nb_commentaires: number; nb_valides: number; nb_likes_recus: number; nb_essais_publies: number }

export default function ApercuCompte() {
  const { user, profil } = useEspace()
  const [classement, setClassement] = useState<Classement | null>(null)
  const [marques, setMarques] = useState<MarquesLecteur | null>(null)

  useEffect(() => {
    supabase.from('classement_utilisateurs')
      .select('score, nb_commentaires, nb_valides, nb_likes_recus, nb_essais_publies')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Où j’en suis : le rang n’a pas pu être lu.', error)
        setClassement(data ?? { score: 0, nb_commentaires: 0, nb_valides: 0, nb_likes_recus: 0, nb_essais_publies: 0 })
      })

    // ⚠️ Cinq comptages, et rien de plus : le parcours se DÉDUIT entièrement de ce
    // que le lecteur a déjà marqué. Rien n'est stocké, donc rien ne peut se
    // désynchroniser — la liste précédente se refermait dans le stockage local, si
    // bien qu'elle disparaissait sur un navigateur et revenait sur un autre.
    //
    // ⛔ On compte les commentaires SANS filtrer sur `valide` : le parcours coche un
    // GESTE, il n'a pas à dépendre du délai d'une modération. C'est le rang, lui, qui
    // ne comptera que le validé.
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
      // Un comptage qui échoue rend `count` nul, ce qui se lit comme « pas encore
      // fait » : sans ce signalement, une étape ne se cocherait jamais sans qu'on
      // sache pourquoi. C'est ce qui masquait le décalage de `essais.auteur_id`.
      const erreur = bibliques.error ?? patristiques.error ?? oeuvres.error ?? commentaires.error ?? essais.error
      if (erreur) console.error('Où j’en suis : l’avancement n’a pas pu être compté.', erreur)
      setMarques({
        versets: bibliques.count ?? 0,
        peres: patristiques.count ?? 0,
        oeuvres: oeuvres.count ?? 0,
        commentaires: commentaires.count ?? 0,
        essais: essais.count ?? 0,
      })
    })
  }, [user.id])

  const annee = profil.membre_depuis ? new Date(profil.membre_depuis).getFullYear() : null
  const hrefPublic = `/profil/${encodeURIComponent(profil.pseudo)}`

  return (
    <>
      {/* ── Qui je suis ── */}
      <Carte>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <PortraitLecteur
            refPortrait={profil.avatar_ref}
            cadrage={{
              posX: profil.avatar_pos_x ?? CADRAGE_PAR_DEFAUT.posX,
              posY: profil.avatar_pos_y ?? CADRAGE_PAR_DEFAUT.posY,
              zoom: profil.avatar_zoom ?? CADRAGE_PAR_DEFAUT.zoom,
            }}
            initiale={profil.pseudo}
            taille={72} />
          <div style={{ flex: 1, minWidth: '11rem' }}>
            <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, margin: 0, letterSpacing: '-0.01em' }}>
              {profil.pseudo}
            </h1>
            {annee && (
              <p style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)', margin: '4px 0 0', letterSpacing: '0.06em' }}>
                Lecteur depuis {annee}
              </p>
            )}
          </div>
          <a href={hrefPublic} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 16px', border: '1px solid var(--cs-vert)', borderRadius: '999px', fontSize: '0.71875rem', color: 'var(--cs-vert)', textDecoration: 'none', letterSpacing: '0.03em', fontWeight: 500, flexShrink: 0 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Voir ma page publique
          </a>
        </div>

        {classement && (
          <div style={{ marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--cs-fond-doux)' }}>
            <BarreRang score={classement.score} />
          </div>
        )}
      </Carte>

      {/* ── Les premiers pas ── */}
      {marques && (
        <ParcoursDecouverte
          marques={marques}
          aUnPortrait={!!profil.avatar_ref}
          aUneBio={!!profil.bio?.trim()}
        />
      )}

      {/* ── Ce que je garde ── */}
      {marques && (marques.versets + marques.peres + marques.oeuvres + marques.essais > 0) && (
        <Carte titre="Ce que je garde">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {marques.oeuvres > 0 && <LigneComptee nombre={marques.oeuvres} singulier="œuvre en bibliothèque" pluriel="œuvres en bibliothèque" href={hrefPublic} />}
            {marques.versets + marques.peres > 0 && <LigneComptee nombre={marques.versets + marques.peres} singulier="passage retenu" pluriel="passages retenus" href="/prelevements" />}
            {marques.essais > 0 && <LigneComptee nombre={marques.essais} singulier="publication" pluriel="publications" href={hrefPublic} dernier />}
          </div>
        </Carte>
      )}
    </>
  )
}

function LigneComptee({ nombre, singulier, pluriel, href, dernier }: { nombre: number; singulier: string; pluriel: string; href: string; dernier?: boolean }) {
  return (
    <a href={href} style={{ display: 'flex', alignItems: 'baseline', gap: '10px', padding: '9px 0', textDecoration: 'none', borderBottom: dernier ? 'none' : '1px solid var(--cs-fond-doux)' }}>
      <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', color: 'var(--cs-encre)', minWidth: '1.75rem' }}>{nombre}</span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)', flex: 1 }}>{nombre === 1 ? singulier : pluriel}</span>
      <span style={{ fontSize: '0.65625rem', color: 'var(--cs-vert)' }}>voir</span>
    </a>
  )
}

// ── Le rang ──────────────────────────────────────────────────────────────────
function BarreRang({ score }: { score: number }) {
  const { rang, rangSuivant, seuilSuivant, seuilPrecedent } = calculerRang(score)
  const couleurs = couleurRang(rang)
  const [largeur, setLargeur] = useState(0)

  const pourcentage = rangSuivant
    ? Math.min(((score - seuilPrecedent) / (seuilSuivant! - seuilPrecedent)) * 100, 100)
    : 100

  useEffect(() => {
    const t = setTimeout(() => setLargeur(pourcentage), 80)
    return () => clearTimeout(t)
  }, [pourcentage])

  const RANGS = ['Catéchumène', 'Disciple', 'Docteur']
  const barreColor = rang === 'Catéchumène' ? 'var(--cs-vert-clair)' : rang === 'Disciple' ? 'var(--cs-vert-aplat-fonce)' : 'var(--cs-attente)'
  const barreWidth = rang === 'Catéchumène' ? `${largeur / 3}%` : rang === 'Disciple' ? `${33.33 + largeur / 3}%` : '100%'

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: couleurs.texte, background: couleurs.fond, padding: '4px 13px', borderRadius: '8px', letterSpacing: '0.01em', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
          {rang}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
          {score} point{score !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        {RANGS.map((r, i) => (
          <span key={r} style={{ fontSize: '0.53125rem', fontWeight: r === rang ? 700 : 400, color: r === rang ? couleurs.texte : 'var(--cs-texte-faible)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1, textAlign: i === 0 ? 'left' : i === 2 ? 'right' : 'center' }}>
            {r}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative', height: '5px', background: 'var(--cs-fond-doux)', borderRadius: '999px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: barreWidth, background: barreColor, borderRadius: '999px', transition: 'width 1s cubic-bezier(0.4,0,0.2,1), background 0.4s ease' }} />
        <div style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, width: '2px', background: 'var(--cs-fond)', zIndex: 1 }} />
        <div style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, width: '2px', background: 'var(--cs-fond)', zIndex: 1 }} />
      </div>
      {rangSuivant && (
        <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', margin: '4px 0 0', fontStyle: 'italic', textAlign: 'right' }}>
          {seuilSuivant! - score} point{seuilSuivant! - score > 1 ? 's' : ''} avant <em>{rangSuivant}</em>
        </p>
      )}
    </>
  )
}
