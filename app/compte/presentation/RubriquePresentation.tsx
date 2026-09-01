'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import IconeCrayon from '@/app/components/IconeCrayon'
import PortraitLecteur from '@/app/components/PortraitLecteur'
import { CADRAGE_PAR_DEFAUT, type Cadrage } from '@/app/lib/portraits'
import { useEspace } from '@/app/compte/EspaceCompte'
import { Carte, EnTeteRubrique, inputStyle, Interrupteur, labelStyle, LigneEnregistrer, type Statut } from '@/app/compte/champsCompte'
import { ModaleCadrage, ModalePortrait, type PortraitChoisi } from './ModalesPortrait'

const BIO_MAX = 500

export default function RubriquePresentation() {
  const { user, profil, majProfil } = useEspace()

  const [prenom, setPrenom] = useState(profil.prenom ?? '')
  const [nom, setNom] = useState(profil.nom ?? '')
  const [bio, setBio] = useState(profil.bio ?? '')
  const [contactEmail, setContactEmail] = useState(profil.contact_email ?? '')
  const [pubRang, setPubRang] = useState(profil.pub_rang ?? true)
  const [pubEssais, setPubEssais] = useState(profil.pub_essais ?? true)
  const [pubFavorisOeuvre, setPubFavorisOeuvre] = useState(profil.pub_favoris_oeuvre ?? false)
  const [pubFavorisVersets, setPubFavorisVersets] = useState(profil.pub_favoris_versets ?? false)
  const [statut, setStatut] = useState<Statut>(null)
  const [enregistrement, setEnregistrement] = useState(false)

  // ⛔ Le portrait se lit du PROFIL, non du stockage local, qui en était la source de
  // vérité jusqu'ici : sur un second appareil, la page du compte se croyait donc sans
  // portrait quand la page publique en affichait un.
  const cadrage: Cadrage = {
    posX: profil.avatar_pos_x ?? CADRAGE_PAR_DEFAUT.posX,
    posY: profil.avatar_pos_y ?? CADRAGE_PAR_DEFAUT.posY,
    zoom: profil.avatar_zoom ?? CADRAGE_PAR_DEFAUT.zoom,
  }
  const [nomPortrait, setNomPortrait] = useState('')
  const [choixOuvert, setChoixOuvert] = useState(false)
  const [cadrageOuvert, setCadrageOuvert] = useState(false)

  // Le nom du visage choisi ne se garde PAS en base : il se résout de la référence.
  // Une copie du nom y serait aussi falsifiable que l'ancienne adresse, et paraîtrait
  // telle quelle sur la page publique. La liste est en cache cinq minutes côté
  // navigateur, si bien que l'ouverture de la modale ne la redemande pas.
  useEffect(() => {
    if (!profil.avatar_ref) { setNomPortrait(''); return }
    let annule = false
    fetch('/api/compte/portraits')
      .then(res => res.ok ? res.json() : null)
      .then((j: { familles?: { portraits: { ref: string; nom: string }[] }[] } | null) => {
        if (annule || !j?.familles) return
        const trouve = j.familles.flatMap(f => f.portraits).find(p => p.ref === profil.avatar_ref)
        setNomPortrait(trouve?.nom ?? '')
      })
      .catch(() => {})
    return () => { annule = true }
  }, [profil.avatar_ref])

  const ecrirePortrait = (ref: string | null, cadre: Cadrage | null) => {
    const champs = {
      avatar_ref: ref,
      avatar_pos_x: cadre?.posX ?? null,
      avatar_pos_y: cadre?.posY ?? null,
      avatar_zoom: cadre?.zoom ?? null,
    }
    majProfil(champs)
    supabase.from('profils').update(champs).eq('id', user.id)
      .then(({ error }) => { if (error) console.error('Présentation : le portrait n’a pas pu être enregistré.', error) })
  }

  const choisirPortrait = (choix: PortraitChoisi) => {
    // Le cadrage arrive avec le visage : c'est celui que la bibliothèque a déjà réglé
    // pour la fiche de cet auteur. Personne n'a à recadrer ce qui l'a été.
    setNomPortrait(choix.nom)
    ecrirePortrait(choix.ref, choix.cadrage)
    setChoixOuvert(false); setCadrageOuvert(false)
  }

  const cadrerPortrait = (cadre: Cadrage) => {
    if (!profil.avatar_ref) return
    ecrirePortrait(profil.avatar_ref, cadre)
    setCadrageOuvert(false)
  }

  const enregistrer = async () => {
    setEnregistrement(true); setStatut(null)
    // Deux écritures, deux voies. Le nom et le prénom passent en direct, comme le
    // portrait ; la bio, l'adresse de contact et la visibilité passent par l'API,
    // qui les borne et les nettoie côté serveur.
    const { error } = await supabase.from('profils')
      .update({ prenom: prenom.trim() || null, nom: nom.trim() || null }).eq('id', user.id)
    let erreurPage: unknown = null
    try {
      const res = await fetch('/api/profil/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio, contact_email: contactEmail,
          pub_rang: pubRang, pub_essais: pubEssais,
          pub_favoris_oeuvre: pubFavorisOeuvre, pub_favoris_versets: pubFavorisVersets,
        }),
      })
      if (!res.ok) erreurPage = await res.json().catch(() => ({ error: 'profil' }))
    } catch (e) { erreurPage = e }
    setEnregistrement(false)

    if (error || erreurPage) {
      console.error('Présentation : la page publique n’a pas pu être mise à jour.', error ?? erreurPage)
      setStatut({ ok: false, msg: 'Les modifications n’ont pas pu être enregistrées. Réessayez.' })
      return
    }
    majProfil({
      prenom: prenom.trim() || null, nom: nom.trim() || null,
      bio: bio.trim() || null, contact_email: contactEmail.trim() || null,
      pub_rang: pubRang, pub_essais: pubEssais,
      pub_favoris_oeuvre: pubFavorisOeuvre, pub_favoris_versets: pubFavorisVersets,
    })
    setStatut({ ok: true, msg: 'Présentation mise à jour.' })
    setTimeout(() => setStatut(null), 2500)
  }

  const visibilite = [
    { cle: 'pub_rang', libelle: 'Rang', valeur: pubRang, poser: setPubRang },
    { cle: 'pub_essais', libelle: 'Publications', valeur: pubEssais, poser: setPubEssais },
    { cle: 'pub_favoris_oeuvre', libelle: 'Œuvres favorites', valeur: pubFavorisOeuvre, poser: setPubFavorisOeuvre },
    { cle: 'pub_favoris_versets', libelle: 'Versets enregistrés', valeur: pubFavorisVersets, poser: setPubFavorisVersets },
  ]

  return (
    <>
      <EnTeteRubrique titre="Présentation">
        Tout ce que règle cette page paraît sur votre page publique. Ce que vous n’y mettez pas ne se voit nulle part.
      </EnTeteRubrique>

      <Carte titre="Portrait">
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <PortraitLecteur refPortrait={profil.avatar_ref} cadrage={cadrage} initiale={profil.pseudo} taille={80} />
            <button
              onClick={() => profil.avatar_ref ? setCadrageOuvert(true) : setChoixOuvert(true)}
              title={profil.avatar_ref ? 'Recadrer le portrait' : 'Choisir un visage'}
              aria-label={profil.avatar_ref ? 'Recadrer le portrait' : 'Choisir un visage'}
              style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid var(--cs-bord)', background: 'var(--cs-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cs-texte-gris)' }}>
              <IconeCrayon size={11} />
            </button>
          </div>
          <div style={{ flex: 1, minWidth: '12rem' }}>
            {profil.avatar_ref ? (
              <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte)', margin: 0, lineHeight: 1.6 }}>
                {nomPortrait || 'Visage choisi'}
                {' · '}
                <button onClick={() => { setNomPortrait(''); ecrirePortrait(null, null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78125rem', color: 'var(--cs-danger)', padding: 0 }}>retirer</button>
              </p>
            ) : (
              <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', margin: 0, lineHeight: 1.6 }}>
                Prenez le visage d’un Père de l’Église ou d’un traducteur du corpus. À défaut, l’initiale de votre pseudonyme en tient lieu.
              </p>
            )}
          </div>
        </div>
      </Carte>

      <Carte titre="Nom">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label htmlFor="prenom" style={labelStyle}>PRÉNOM</label>
            <input id="prenom" type="text" value={prenom} onChange={e => setPrenom(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="nom" style={labelStyle}>NOM</label>
            <input id="nom" type="text" value={nom} onChange={e => setNom(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', margin: '8px 0 0', lineHeight: 1.5 }}>
          Ils ne paraissent que si vous choisissez de signer une publication de votre nom. Partout ailleurs, c’est votre pseudonyme qui vous nomme.
        </p>
      </Carte>

      <Carte titre="Page publique">
        <div style={{ marginBottom: '14px' }}>
          <label htmlFor="bio" style={labelStyle}>PRÉSENTATION</label>
          <textarea id="bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={BIO_MAX} placeholder="Quelques mots sur vous…"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem' }} />
          <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', margin: '3px 0 0', textAlign: 'right' }}>{bio.length}/{BIO_MAX}</p>
        </div>
        <div style={{ marginBottom: '18px' }}>
          <label htmlFor="contact" style={labelStyle}>E-MAIL DE CONTACT</label>
          <input id="contact" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Visible publiquement" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', paddingTop: '14px', borderTop: '1px solid var(--cs-fond-doux)' }}>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: 0 }}>Ce qui paraît sur ma page</p>
          {visibilite.map(({ cle, libelle, valeur, poser }) => (
            <Interrupteur key={cle} actif={valeur} onChange={poser} libelle={libelle} />
          ))}
        </div>
        <LigneEnregistrer onClick={enregistrer} occupe={enregistrement} statut={statut} />
      </Carte>

      {cadrageOuvert && profil.avatar_ref && (
        <ModaleCadrage refPortrait={profil.avatar_ref} nom={nomPortrait} cadrage={cadrage} onSauvegarder={cadrerPortrait}
          onChanger={() => { setCadrageOuvert(false); setChoixOuvert(true) }}
          onClose={() => setCadrageOuvert(false)} />
      )}
      {choixOuvert && <ModalePortrait onChoisir={choisirPortrait} onClose={() => setChoixOuvert(false)} />}
    </>
  )
}
