'use client'

// « Où j'en suis » : la première rubrique de l'espace, celle où l'on revient.
//
// ⛔ Elle ne REFAIT PAS la page publique. L'ancienne page du compte y recopiait la
// bibliothèque et les publications, cartes entières servies deux fois : elles sont
// ici deux lignes comptées qui mènent à la page publique, laquelle les montre déjà.

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/app/lib/supabase'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
import { useEspace } from '@/app/compte/EspaceCompte'
import { Carte } from '@/app/compte/champsCompte'

type Classement = { score: number; nb_commentaires: number; nb_valides: number; nb_likes_recus: number; nb_essais_publies: number }
type Comptes = { essais: number; passages: number; oeuvres: number }

export default function ApercuCompte() {
  const { user, profil } = useEspace()
  const [classement, setClassement] = useState<Classement | null>(null)
  const [comptes, setComptes] = useState<Comptes | null>(null)

  useEffect(() => {
    supabase.from('classement_utilisateurs')
      .select('score, nb_commentaires, nb_valides, nb_likes_recus, nb_essais_publies')
      .eq('user_id', user.id).maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Où j’en suis : le rang n’a pas pu être lu.', error)
        setClassement(data ?? { score: 0, nb_commentaires: 0, nb_valides: 0, nb_likes_recus: 0, nb_essais_publies: 0 })
      })

    Promise.all([
      supabase.from('essais').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('statut', 'publie'),
      supabase.from('prelevements').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('favoris').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('type', 'oeuvre'),
    ]).then(([e, p, o]) => {
      // ⚠️ Un comptage qui échoue rend `count` nul, ce qui se lit comme « rien encore
      // fait » : sans ce signalement, une étape ne se cocherait jamais sans qu'on sache
      // pourquoi. C'est ce qui masquait le décalage de `essais.auteur_id`.
      const erreur = e.error ?? p.error ?? o.error
      if (erreur) console.error('Où j’en suis : l’avancement n’a pas pu être compté.', erreur)
      setComptes({ essais: e.count ?? 0, passages: p.count ?? 0, oeuvres: o.count ?? 0 })
    })
  }, [user.id])

  const annee = profil.membre_depuis ? new Date(profil.membre_depuis).getFullYear() : null
  const hrefPublic = `/profil/${encodeURIComponent(profil.pseudo)}`

  return (
    <>
      {/* ── Qui je suis ── */}
      <Carte>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          {profil.avatar_url ? (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', position: 'relative', border: '2px solid var(--cs-bord)', flexShrink: 0 }}>
              <Image src={profil.avatar_url} alt={profil.avatar_nom ?? ''} fill sizes="72px" unoptimized
                style={{ objectFit: 'cover', objectPosition: `${profil.avatar_pos_x ?? 50}% ${profil.avatar_pos_y ?? 20}%`, transform: `scale(${profil.avatar_zoom ?? 1})`, transformOrigin: 'center center' }} />
            </div>
          ) : (
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--cs-vert-aplat),var(--cs-vert-aplat-profond))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--cs-bord)', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.5rem', color: 'var(--cs-fond-doux)' }}>
                {profil.pseudo.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
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

      {/* ── Pour commencer ── */}
      {comptes && <PourCommencer profilBio={profil.bio} comptes={comptes} nbCommentaires={classement?.nb_commentaires ?? 0} />}

      {/* ── Ce que je garde ── */}
      {comptes && (
        <Carte titre="Ce que je garde">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <LigneComptee nombre={comptes.oeuvres} singulier="œuvre en bibliothèque" pluriel="œuvres en bibliothèque" href={hrefPublic} />
            <LigneComptee nombre={comptes.passages} singulier="passage enregistré" pluriel="passages enregistrés" href="/prelevements" dernier={comptes.essais === 0} />
            {comptes.essais > 0 && <LigneComptee nombre={comptes.essais} singulier="publication" pluriel="publications" href={hrefPublic} dernier />}
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

// ── Pour commencer ───────────────────────────────────────────────────────────
// ⛔ PLUS AUCUNE MENTION DE POINTS ICI. La liste annonçait « +2 pts » pour la
// présentation, « +1 pt » pour un passage enregistré et « +1 pt » pour un favori :
// aucun des trois n'existe dans la formule du rang (vue `classement_utilisateurs`),
// qui ne compte que les commentaires, leur validation, les mentions reçues et les
// essais. Trois promesses sur cinq étaient fausses.
//
// ⚠️ Elles ne reviendront pas sous une autre forme : une étape de découverte ne
// s'achète pas. Deci, Koestner et Ryan (1999) mesurent sur 128 expériences que la
// récompense tangible et attendue MINE la motivation qu'elle prétend soutenir. Ce
// qui remplacera cette liste est un parcours qui ENSEIGNE, non qui paie. Voir la
// tâche [compte-parcours] du centre de contrôle.
function PourCommencer({ profilBio, comptes, nbCommentaires }: { profilBio: string | null; comptes: Comptes; nbCommentaires: number }) {
  const etapes = [
    { fait: !!profilBio?.trim(), label: 'Vous présenter en deux lignes', href: '/compte/presentation' },
    { fait: comptes.passages > 0, label: 'Enregistrer un passage qui vous arrête', href: '/bible' },
    { fait: comptes.oeuvres > 0, label: 'Mettre une œuvre dans votre bibliothèque', href: '/bibliotheque' },
    { fait: nbCommentaires >= 3, label: 'Commenter trois passages', href: '/bible' },
    { fait: comptes.essais > 0, label: 'Publier un premier essai', href: '/essais/nouveau' },
  ]
  const restantes = etapes.filter(e => !e.fait).length
  if (restantes === 0) return null

  // ⚠️ On affiche le PLUS PETIT des deux nombres : ce qui est fait tant qu'on
  // commence, ce qui reste dès qu'on approche (Koo et Fishbach, « small-area
  // hypothesis »). « Il vous en reste deux » porte quand « 3 sur 5 » n'apprend rien.
  const faites = etapes.length - restantes
  const entete = restantes <= faites
    ? `Il vous en reste ${restantes === 1 ? 'une' : restantes}`
    : `${faites} sur ${etapes.length}`

  return (
    <Carte titre="Pour commencer">
      <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: '-8px 0 16px', lineHeight: 1.6 }}>
        Cinq gestes qui font le tour du site. {entete}.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
        {etapes.map(({ fait, label, href }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span aria-hidden="true" style={{ width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', background: 'var(--cs-fond)', border: `1.5px solid ${fait ? 'var(--cs-vert-clair)' : 'var(--cs-bord)'}`, color: fait ? 'var(--cs-vert)' : 'transparent' }}>
              {fait ? '✓' : ''}
            </span>
            {fait ? (
              <span style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', textDecoration: 'line-through' }}>{label}</span>
            ) : (
              <a href={href} style={{ fontSize: '0.8125rem', color: 'var(--cs-vert)', textDecoration: 'none' }}>{label}</a>
            )}
          </div>
        ))}
      </div>
    </Carte>
  )
}
