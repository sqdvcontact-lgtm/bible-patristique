'use client'

// « MON COMPTE » — tout ce qui se règle, sur UNE page.
//
// Refonte du 1er septembre 2026. Les réglages tenaient sur trois pages —
// « Présentation », « Lecture », « Connexion » — pour treize contrôles en tout, et
// la page « Lecture » entière ne portait que deux menus déroulants : 74 px de
// réglages utiles pour 160 px de chrome avant d'y arriver, sous une colonne de
// navigation d'une fois et demie sa hauteur. L'auteur : « tout afficher sur une
// seule page ; le sommaire sert à circuler ».
//
// ⛔ ELLE RESTE UN FORMULAIRE. Une maquette intermédiaire donnait les valeurs en
// lecture seule, un mot « modifier » ne paraissant qu'au survol : c'était plus beau
// et plus long à l'usage, inatteignable au doigt, et l'auteur l'a écarté. Les champs
// sont là, sous la main.
//
// ⛔ UN SEUL BOUTON D'ENREGISTREMENT pour toute la page. Il y en avait deux sur la
// seule « Présentation », sans que rien ne dise lequel couvrait quoi. ⚠️ Le thème et
// la traduction font exception et s'appliquent AUSSITÔT : le thème le fait déjà
// depuis le menu de la barre, et deux façons de poser le même réglage divergeraient.

import React, { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useCompte } from '@/app/lib/contexteCompte'
import { themeValide, type Theme } from '@/app/lib/theme'
import { useEspace } from '@/app/compte/EspaceCompte'
import { BandeauEspace, Rangee, Section, SommaireEspace } from '@/app/compte/piecesEspace'
import { ANCRES_COMPTE } from '@/app/lib/espaceLecteurNavigation'
import { Interrupteur, inputStyle, LigneEnregistrer, type Statut } from '@/app/compte/champsCompte'
import PortraitLecteur from '@/app/components/PortraitLecteur'
import { CADRAGE_PAR_DEFAUT, type Cadrage } from '@/app/lib/portraits'
import { ModaleCadrage, ModalePortrait, type PortraitChoisi } from '@/app/compte/ModalesPortrait'
import BlocConnexion from '@/app/compte/BlocConnexion'

const BIO_MAX = 400

export default function RubriqueCompte({ traductions }: { traductions: { id: string; nom: string }[] }) {
  const { user, profil, majProfil } = useEspace()
  const { theme, changerTheme } = useCompte()

  const [pseudo, setPseudo] = useState(profil.pseudo)
  const [prenom, setPrenom] = useState(profil.prenom ?? '')
  const [nom, setNom] = useState(profil.nom ?? '')
  const [bio, setBio] = useState(profil.bio ?? '')
  const [contact, setContact] = useState(profil.contact_email ?? '')
  const [trad, setTrad] = useState(profil.traduction_defaut)
  const [vis, setVis] = useState({
    pub_rang: profil.pub_rang ?? true,
    pub_essais: profil.pub_essais ?? true,
    pub_favoris_oeuvre: profil.pub_favoris_oeuvre ?? false,
    pub_favoris_versets: profil.pub_favoris_versets ?? false,
  })
  const [nomPortrait, setNomPortrait] = useState('')
  const [choixOuvert, setChoixOuvert] = useState(false)
  const [cadrageOuvert, setCadrageOuvert] = useState(false)
  const [suppressionOuverte, setSuppressionOuverte] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [statut, setStatut] = useState<Statut>(null)

  const cadrage: Cadrage = {
    posX: profil.avatar_pos_x ?? CADRAGE_PAR_DEFAUT.posX,
    posY: profil.avatar_pos_y ?? CADRAGE_PAR_DEFAUT.posY,
    zoom: profil.avatar_zoom ?? CADRAGE_PAR_DEFAUT.zoom,
  }

  // ⛔ Le nom du visage ne se garde PAS en base : il se résout de la référence. Une
  // copie du nom y serait aussi falsifiable que l'ancienne adresse, et paraîtrait
  // telle quelle sur la page publique.
  useEffect(() => {
    if (!profil.avatar_ref) { setNomPortrait(''); return }
    let annule = false
    fetch('/api/compte/portraits')
      .then(res => (res.ok ? res.json() : null))
      .then((j: { familles?: { portraits: { ref: string; nom: string }[] }[] } | null) => {
        if (annule || !j?.familles) return
        setNomPortrait(j.familles.flatMap(f => f.portraits).find(x => x.ref === profil.avatar_ref)?.nom ?? '')
      })
      .catch(() => {})
    return () => { annule = true }
  }, [profil.avatar_ref])

  // ⚠️ Le portrait s'écrit AUSSITÔT, hors du bouton : il se choisit dans une fenêtre,
  // et un visage qu'on vient de retenir doit paraître sans qu'on enregistre la page.
  const ecrirePortrait = (ref: string | null, cadre: Cadrage | null) => {
    const champs = {
      avatar_ref: ref,
      avatar_pos_x: cadre?.posX ?? null,
      avatar_pos_y: cadre?.posY ?? null,
      avatar_zoom: cadre?.zoom ?? null,
    }
    majProfil(champs)
    supabase.from('profils').update(champs).eq('id', user.id)
      .then(({ error }) => { if (error) console.error('Mon compte : le portrait n’a pas pu être enregistré.', error) })
  }

  const choisirPortrait = (choix: PortraitChoisi) => {
    // Le cadrage arrive avec le visage : c'est celui que la bibliothèque a déjà réglé
    // pour la fiche de cet auteur. Personne n'a à recadrer ce qui l'a été.
    setNomPortrait(choix.nom)
    ecrirePortrait(choix.ref, choix.cadrage)
    setChoixOuvert(false); setCadrageOuvert(false)
  }

  const enregistrer = async () => {
    setOccupe(true); setStatut(null)
    const champs = {
      pseudo: pseudo.trim(), prenom: prenom.trim() || null, nom: nom.trim() || null,
      bio: bio.trim() || null, contact_email: contact.trim() || null,
      traduction_defaut: trad, ...vis,
    }
    const { error } = await supabase.from('profils').update(champs).eq('id', user.id)
    setOccupe(false)
    if (error) {
      // ⚠️ Le pseudonyme est unique en base : c'est la seule erreur qu'un lecteur
      // puisse provoquer sans se tromper, et elle mérite son mot à elle.
      console.error('Mon compte : l’enregistrement a échoué.', error)
      setStatut({ ok: false, msg: error.code === '23505' ? 'Ce pseudonyme est déjà pris.' : 'L’enregistrement a échoué.' })
      return
    }
    majProfil(champs)
    setStatut({ ok: true, msg: 'Enregistré.' })
  }

  // ⛔ Le thème ne passe PAS par le bouton : il s'applique à l'instant, comme depuis
  // le menu de la barre, et `changerTheme` écrit l'écran, le miroir local et le
  // compte ensemble (charte, « Le thème est une préférence de COMPTE »).
  const poserTheme = (t: Theme) => { void changerTheme(t) }

  const annee = profil.membre_depuis ? new Date(profil.membre_depuis).getFullYear() : null
  const civil = [prenom.trim(), nom.trim()].filter(Boolean).join(' ')
  const reperes = [civil, annee ? `lecteur depuis ${annee}` : null].filter(Boolean).join(' · ')

  return (
    <div className="esp-cadre">
      <SommaireEspace page="compte" groupes={ANCRES_COMPTE} />

      <div className="esp-page">
        <BandeauEspace
          pseudo={profil.pseudo}
          reperes={reperes || 'Votre compte'}
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

        <Section id="identite" titre="Identité">
          <Rangee label="Portrait" note="Choisi parmi les visages qui illustrent déjà les Pères et les traducteurs.">
            <span style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="esp-fixe">{nomPortrait || (profil.avatar_ref ? 'Un visage est choisi' : 'Aucun visage')}</span>
              <button type="button" onClick={() => setChoixOuvert(true)} style={BTN_DISCRET}>
                {profil.avatar_ref ? 'Changer' : 'Choisir'}
              </button>
              {profil.avatar_ref && (
                <button type="button" onClick={() => setCadrageOuvert(true)} style={BTN_DISCRET}>Recadrer</button>
              )}
            </span>
          </Rangee>
          <Rangee label="Pseudonyme" pour="pseudo" note="C’est le nom sous lequel les autres lecteurs vous voient.">
            <input id="pseudo" className="esp-court" style={inputStyle} value={pseudo}
              onChange={e => { setPseudo(e.target.value); setStatut(null) }} maxLength={40} />
          </Rangee>
          <Rangee label="Prénom" pour="prenom">
            <input id="prenom" className="esp-court" style={inputStyle} value={prenom}
              onChange={e => { setPrenom(e.target.value); setStatut(null) }} maxLength={60} />
          </Rangee>
          <Rangee label="Nom" pour="nom">
            <input id="nom" className="esp-court" style={inputStyle} value={nom}
              onChange={e => { setNom(e.target.value); setStatut(null) }} maxLength={60} />
          </Rangee>
        </Section>

        <Section id="page-publique" titre="Page publique">
          <Rangee label="Quelques mots" pour="bio" note={`${bio.length} / ${BIO_MAX}`}>
            <textarea id="bio" className="esp-long" style={inputStyle} rows={3} maxLength={BIO_MAX}
              placeholder="Quelques mots sur vous…" value={bio}
              onChange={e => { setBio(e.target.value); setStatut(null) }} />
          </Rangee>
          <Rangee label="Adresse de contact" pour="contact">
            <input id="contact" type="email" className="esp-moyen" style={inputStyle}
              placeholder="Visible publiquement" value={contact}
              onChange={e => { setContact(e.target.value); setStatut(null) }} />
          </Rangee>
          {/* ⛔ EN COLONNE (auteur, 1er septembre 2026) : en rang, les quatre
              bascules débordaient la mesure et la dernière se coupait. */}
          <Rangee label="Ce qui paraît">
            <div className="esp-bascules">
              {([
                ['pub_rang', 'Rang'],
                ['pub_essais', 'Publications'],
                ['pub_favoris_oeuvre', 'Œuvres favorites'],
                ['pub_favoris_versets', 'Versets enregistrés'],
              ] as const).map(([cle, libelle]) => (
                <Interrupteur key={cle} libelle={libelle} actif={vis[cle]}
                  onChange={v => { setVis(x => ({ ...x, [cle]: v })); setStatut(null) }} />
              ))}
            </div>
          </Rangee>
        </Section>

        <Section id="lecture" titre="Lecture">
          <Rangee label="Traduction" pour="trad">
            <select id="trad" className="esp-menu" style={inputStyle} value={trad}
              onChange={e => { setTrad(e.target.value); setStatut(null) }}>
              {traductions.map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </select>
          </Rangee>
          <Rangee label="Thème" pour="theme" note="S’applique aussitôt, ici comme depuis le menu de la barre.">
            <select id="theme" className="esp-menu" style={inputStyle} value={theme}
              onChange={e => poserTheme(themeValide(e.target.value) ?? 'clair')}>
              <option value="clair">Clair</option>
              <option value="sombre">Cuir</option>
            </select>
          </Rangee>
        </Section>

        <Section id="connexion" titre="Connexion">
          <BlocConnexion ouvrirSuppression={suppressionOuverte} onSuppressionOuverte={setSuppressionOuverte} />
        </Section>

        <div className="esp-enregistrer">
          <LigneEnregistrer onClick={enregistrer} occupe={occupe} statut={statut} />
        </div>

        <div className="esp-pied">
          <button onClick={() => { void supabase.auth.signOut().then(() => { window.location.href = '/' }) }}>
            Se déconnecter
          </button>
          <button className="esp-danger" onClick={() => setSuppressionOuverte(true)}>Supprimer mon compte</button>
        </div>
      </div>

      {choixOuvert && <ModalePortrait onChoisir={choisirPortrait} onClose={() => setChoixOuvert(false)} />}
      {cadrageOuvert && profil.avatar_ref && (
        <ModaleCadrage refPortrait={profil.avatar_ref} nom={nomPortrait} cadrage={cadrage}
          onSauvegarder={cadre => { ecrirePortrait(profil.avatar_ref, cadre); setCadrageOuvert(false) }}
          onChanger={() => { setCadrageOuvert(false); setChoixOuvert(true) }}
          onClose={() => setCadrageOuvert(false)} />
      )}
    </div>
  )
}

/** Le bouton d'une action secondaire, à côté d'un champ. */
const BTN_DISCRET: React.CSSProperties = {
  padding: '6px 13px', borderRadius: '4px', border: '1px solid var(--cs-bord)',
  background: 'var(--cs-surface)', color: 'var(--cs-vert)', fontSize: '0.71875rem',
  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
}
