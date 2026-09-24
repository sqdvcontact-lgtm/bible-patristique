'use client'

/**
 * La fiche d'un LECTEUR, ouverte en fenêtre depuis la page de lecture d'un essai.
 *
 * Demande de l'auteur, 2026-09-24 : le nom de l'auteur d'un essai ouvre sa page « en
 * fenêtre, comme une notice auteur, sans illustration toutefois ». Elle prend donc le
 * cadre des fiches (`ModaleFiche`, `CorpsFiche`, `EnTeteFiche`).
 * Revirement de l'auteur : « ajoute, finalement, la photo choisie, en petit ». Le
 * portrait choisi par le lecteur se pose en PASTILLE ronde devant son nom, jamais dans
 * le grand cadre flottant des fiches (`PortraitFiche`) : ce n'est pas une illustration.
 * Sans portrait, ou si l'image ne vient pas, rien ne la remplace.
 *
 * ⚠️ Les données viennent de `/api/profil/[pseudo]`, la même source que la page
 * publique : ce que la fenêtre montre, la page le montre aussi, et rien de plus.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { ChampFiche, CorpsFiche, EnTeteFiche, ModaleFiche, SectionFiche } from '@/app/components/FicheModele'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { calculerRang } from '@/app/lib/classement'
import { SERIF, SANS } from '@/app/lib/polices'

type ProfilFiche = {
  pseudo: string
  nom_reel?: string | null
  bio: string | null
  membre_depuis: string
  lecture?: { nb_auteurs: number; total_auteurs: number }
  essais?: { id: number; titre: string; sous_titre: string | null; publie_at: string | null }[]
  avatar?: { imageUrl: string; nom: string; posX: number | null; posY: number | null; zoom: number | null } | null
}

/** Le portrait du lecteur, en petit, avec le recadrage qu'il a choisi. */
function PastillePortrait({ avatar }: { avatar: NonNullable<ProfilFiche['avatar']> }) {
  const [casse, setCasse] = useState(false)
  if (casse) return null
  return (
    <div title={avatar.nom} style={{ flex: 'none', width: '2.75rem', height: '2.75rem', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--cs-or-doux)', position: 'relative' }}>
      <Image
        src={avatar.imageUrl} alt={avatar.nom} fill sizes="64px" unoptimized onError={() => setCasse(true)}
        style={{
          objectFit: 'cover',
          objectPosition: `${avatar.posX ?? 50}% ${avatar.posY ?? 20}%`,
          transform: `scale(${avatar.zoom ?? 1})`,
          transformOrigin: 'center center',
        }}
      />
    </div>
  )
}

export default function ModaleProfilLecteur({ pseudo, onClose }: { pseudo: string | null; onClose: () => void }) {
  const titreId = useId()
  const [profil, setProfil] = useState<ProfilFiche | null>(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!pseudo) return
    let annule = false
    setProfil(null); setErreur(false)
    fetch(`/api/profil/${encodeURIComponent(pseudo)}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then((p: ProfilFiche) => { if (!annule) setProfil(p) })
      .catch(() => { if (!annule) setErreur(true) })
    return () => { annule = true }
  }, [pseudo])

  if (!pseudo) return null

  const rang = profil?.lecture ? calculerRang(profil.lecture.nb_auteurs, profil.lecture.total_auteurs).rang : null
  const essais = profil?.essais ?? []

  return (
    <ModaleFiche titreId={titreId} libelle="À propos de cet auteur" onFermer={onClose}>
      {erreur ? (
        <p style={{ fontFamily: SERIF, fontSize: '1rem', color: 'var(--cs-texte-second)', textAlign: 'center', margin: '30px 0' }}>Profil introuvable.</p>
      ) : !profil ? (
        <MotAttente centre marge="30px 0" />
      ) : (
        <CorpsFiche
          className="cs-fiche-auteur"
          entete={
            <div className="cs-fiche-tete">
              {profil.avatar?.imageUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <PastillePortrait avatar={profil.avatar} />
                  <EnTeteFiche titre={profil.pseudo} titreId={titreId} sousTitre={profil.nom_reel || undefined} />
                </div>
              ) : (
                <EnTeteFiche titre={profil.pseudo} titreId={titreId} sousTitre={profil.nom_reel || undefined} />
              )}
              <dl className="cs-fiche-identite" aria-label="Repères sur l’auteur">
                <ChampFiche libelle="Membre depuis">{String(new Date(profil.membre_depuis).getFullYear())}</ChampFiche>
                <ChampFiche libelle="Rang">{rang}</ChampFiche>
                <ChampFiche libelle="Lectures">{profil.lecture ? `${profil.lecture.nb_auteurs} auteur${profil.lecture.nb_auteurs > 1 ? 's' : ''} sur ${profil.lecture.total_auteurs}` : null}</ChampFiche>
              </dl>
            </div>
          }
          complement={essais.length > 0 ? (
            <SectionFiche titre={essais.length > 1 ? 'Publications' : 'Publication'}>
              <ul className="cs-fiche-liste-colonne">
                {essais.map(e => (
                  <li key={e.id} className="cs-fiche-rangee-colonne">
                    <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: 'var(--cs-date)' }}>
                      {e.publie_at ? new Date(e.publie_at).getFullYear() : ''}
                    </span>
                    <span style={{ lineHeight: 1.38 }}>
                      <Link href={`/essais/${e.id}`} onClick={onClose} className="cs-fiche-oeuvre"
                        style={{ fontFamily: SERIF, fontSize: '0.78125rem', color: 'var(--cs-texte)' }}>{e.titre}</Link>
                      {e.sous_titre && (
                        <span style={{ display: 'block', fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', lineHeight: 1.3 }}>{e.sous_titre}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionFiche>
          ) : null}
          pied={
            <Link href={`/profil/${encodeURIComponent(profil.pseudo)}`} onClick={onClose} className="cs-bouton-lien">
              Voir la page de {profil.pseudo}
            </Link>
          }
        >
          <SectionFiche titre="Présentation">
            {profil.bio
              ? <p className="cs-notice-prose" style={{ whiteSpace: 'pre-line' }}>{profil.bio}</p>
              : <p className="cs-notice-prose" style={{ color: 'var(--cs-texte-gris)', fontStyle: 'italic' }}>{profil.pseudo} n’a pas encore écrit de présentation.</p>}
          </SectionFiche>
        </CorpsFiche>
      )}
    </ModaleFiche>
  )
}
