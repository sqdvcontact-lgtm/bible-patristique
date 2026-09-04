'use client'

// Volet des notifications — ouvert depuis la cloche de la barre de navigation
// (remplace l'ancienne page /notifications). Descend sous la navbar, à droite,
// défile, et propose « Tout archiver ». L'archivage reste local (localStorage) et
// prévient la navbar par l'évènement notifications-archivees.
//
// ⛔ PLUS DE BLOC DANS UN BLOC (demande de l'auteur, 2026-09-04 : « ne pas faire un
// bloc dans un bloc ; utiliser tout l'espace disponible »). Chaque notification était
// une CARTE — fond propre, filet, coins arrondis, rembourrage — posée dans un volet
// qui a déjà tout cela : deux cadres emboîtés, et une gouttière perdue de chaque côté
// pour un volet de 26 rem. Ce sont maintenant des RANGÉES, pleine largeur, séparées
// d'un filet.
//
// ⛔ ET PLUS DE BANDEAU VERT au flanc gauche (même demande) : il disait « nouvelle »,
// ce que l'onglet dit déjà, et il rentrait le texte de trois pixels de plus.
//
// ⚠️ TROIS RANGS, ET TROIS SEULEMENT. La carte en portait SIX — un titre en capitales
// vertes, l'objet en sérif, la date, un « À propos : … » en italique, une ligne
// « Message de X », le corps —, dont trois disaient la même chose sous trois formes.
// Il reste l'expéditeur et la date sur une ligne, l'objet, le message. Le titre est
// devenu une COULEUR (voir « ton » dans notificationsClient) : vert pour une
// validation, danger pour un refus, gris pour le reste.
//
// ⛔ « ARCHIVER » NE PARAÎT QU'AU SURVOL (même demande). ⚠️ Mais il paraît aussi au
// FOYER et sur un écran TACTILE, où rien ne se survole : c'est la règle déjà payée sur
// la gouttière d'actions des prélèvements, où une action qui ne venait qu'au survol
// était hors d'atteinte au doigt et invisible au clavier.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import {
  chargerNotificationsUtilisateur,
  cleArchivesNotifications,
  enregistrerSetLocalStorage,
  lireSetLocalStorage,
  type NotificationItem,
  type TonNotification,
} from '@/app/lib/notificationsClient'

type Onglet = 'nouvelles' | 'archivees'

function dateCourte(date: string | null) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * L'encre de l'objet — le seul endroit où le ton se voit.
 *
 * ⚠️ LE REFUS PREND `--cs-danger-fonce`, ET NON LE MAROQUIN (l'auteur, 2026-09-04 :
 * « un message de refus doit être rouge (maroquin ?) »). Le maroquin est
 * `--cs-peres` : il DIT un domaine du corpus, sur la page de recherche comme sur le
 * carton de l'accueil, et le prêter à un rôle d'interface le ferait dire deux choses.
 * `--cs-danger-fonce` est l'encre du danger CONFIRMÉ de la palette, transposée dans les
 * deux thèmes, et c'est exactement ce qu'un refus annonce.
 */
const ENCRE_TON: Record<TonNotification, string> = {
  validation: 'var(--cs-vert)',
  refus: 'var(--cs-danger-fonce)',
  neutre: 'var(--cs-texte-second)',
}

export default function VoletNotifications({ uid, onFermer }: { uid: string; onFermer: () => void }) {
  const [items, setItems] = useState<NotificationItem[] | null>(null)
  const [erreurChargement, setErreurChargement] = useState(false)
  const [archives, setArchives] = useState<Set<string>>(new Set())
  const [onglet, setOnglet] = useState<Onglet>('nouvelles')

  useEffect(() => {
    setArchives(lireSetLocalStorage(cleArchivesNotifications(uid)))
    setItems(null)
    setErreurChargement(false)
    chargerNotificationsUtilisateur(uid)
      .then(setItems)
      .catch(() => {
        setErreurChargement(true)
        setItems([])
      })
  }, [uid])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFermer])

  const nouvelles = useMemo(() => (items ?? []).filter(n => !archives.has(n.key)), [items, archives])
  const archivees = useMemo(() => (items ?? []).filter(n => archives.has(n.key)), [items, archives])
  const liste = onglet === 'nouvelles' ? nouvelles : archivees

  const persister = (s: Set<string>) => {
    setArchives(s)
    enregistrerSetLocalStorage(cleArchivesNotifications(uid), s)
    window.dispatchEvent(new Event('notifications-archivees'))
  }
  const archiver = (n: NotificationItem) => {
    if (archives.has(n.key)) return
    const s = new Set(archives); s.add(n.key); persister(s)
  }
  const archiverTout = () => {
    if (nouvelles.length === 0) return
    const s = new Set(archives); nouvelles.forEach(n => s.add(n.key)); persister(s)
  }

  if (typeof document === 'undefined') return null

  const messageVide = (texte: string) => (
    <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', textAlign: 'center', padding: '22px 14px', margin: 0 }}>{texte}</p>
  )

  return createPortal(
    <>
      <div onClick={onFermer} style={{ position: 'fixed', inset: 0, zIndex: 2400 }} />
      <div role="dialog" aria-label="Notifications"
        style={{
          position: 'fixed', top: 'calc(3.5rem + 6px)', right: '12px',
          width: 'min(26rem, calc(100vw - 20px))', maxHeight: 'calc(100vh - 3.5rem - 22px)',
          background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px',
          boxShadow: 'var(--cs-ombre-modale)', zIndex: 2500,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 14px 10px', borderBottom: '1px solid var(--cs-fond-doux)' }}>
          <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', color: 'var(--cs-encre-fonce)' }}>Notifications</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onglet === 'nouvelles' && nouvelles.length > 0 && (
              <button onClick={archiverTout} style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, letterSpacing: '0.01em' }}>
                Tout archiver
              </button>
            )}
            <button onClick={onFermer} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'var(--cs-texte-faible)', cursor: 'pointer', fontSize: '0.9375rem', lineHeight: 1, padding: 0 }}>✕</button>
          </div>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--cs-fond-doux)', padding: '0 6px' }}>
          {([
            { key: 'nouvelles' as Onglet, label: 'Nouvelles', count: nouvelles.length },
            { key: 'archivees' as Onglet, label: 'Archivées', count: archivees.length },
          ]).map(o => (
            <button key={o.key} onClick={() => setOnglet(o.key)}
              style={{ padding: '8px 12px', fontSize: '0.71875rem', fontWeight: onglet === o.key ? 600 : 400, color: onglet === o.key ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', background: 'transparent', border: 'none', borderBottom: onglet === o.key ? '2px solid var(--cs-vert)' : '2px solid transparent', cursor: 'pointer' }}>
              {o.label}<span style={{ marginLeft: '5px', fontSize: '0.5625rem', color: 'var(--cs-texte-faible)' }}>({o.count})</span>
            </button>
          ))}
        </div>

        {/* ⛔ Aucun rembourrage ni écart ici : les rangées prennent TOUTE la largeur du
            volet, et c'est leur filet qui les sépare. Le rembourrage est DANS la rangée,
            à la mesure de l'en-tête, pour que les trois fers tombent au même endroit. */}
        <div style={{ overflowY: 'auto' }}>
          {items === null ? messageVide('Chargement…')
            : erreurChargement ? (
              <p role="alert" style={{ fontSize: '0.78125rem', color: 'var(--cs-danger-fonce)', textAlign: 'center', padding: '22px 14px', margin: 0 }}>
                Les notifications n’ont pas pu être chargées. Réessayez.
              </p>
            )
            : liste.length === 0 ? messageVide(onglet === 'nouvelles' ? 'Aucune notification nouvelle.' : 'Aucune notification archivée.')
            : liste.map(n => (
              <article key={n.key} className="cs-notif">
                {/* Ligne d'en-tête : l'expéditeur et la date, et « Archiver » à sa place
                    réservée — il paraît au survol, sans déplacer une ligne en paraissant. */}
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontSize: '0.625rem', color: 'var(--cs-texte-doux)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.auteur}{n.date ? ` · ${dateCourte(n.date)}` : ''}
                  </span>
                  {onglet === 'nouvelles' && (
                    <button onClick={() => archiver(n)} className="cs-notif-archiver"
                      style={{ fontSize: '0.625rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                      Archiver
                    </button>
                  )}
                </div>
                <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', lineHeight: 1.35, color: ENCRE_TON[n.ton], margin: '2px 0 0' }}>{n.objet}</p>
                {n.message && (
                  <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte)', lineHeight: 1.45, whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{n.message}</p>
                )}
                {n.href && (
                  <Link href={n.href} onClick={() => { archiver(n); onFermer() }}
                    style={{ display: 'inline-block', fontSize: '0.6875rem', color: 'var(--cs-vert)', fontWeight: 600, textDecoration: 'none', marginTop: '6px' }}>
                    {n.action ?? 'Ouvrir'}
                  </Link>
                )}
              </article>
            ))}
        </div>
      </div>
    </>,
    document.body,
  )
}
