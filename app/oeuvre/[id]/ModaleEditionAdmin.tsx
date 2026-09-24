'use client'

import { Z_MODALE } from '@/app/lib/empilement'
import { useState, useRef, useEffect, useId } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import type { ChampTitre, EditionCible, VarianteTitre } from './oeuvreTypes'
import { cleTitreCompose } from './compositionTitres'
import { SANS } from '@/app/lib/polices'
import IconeCroix from '@/app/components/IconeCroix'
import { TEXTE_ERREUR } from '@/app/lib/texteErreur'

const BTN_MODAL: React.CSSProperties = { fontSize: '0.6875rem', padding: '4px 9px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)', cursor: 'pointer' }

// Le verrou du site ne refuse pas un appel non authentifié : il le REDIRIGE vers
// /chantier. Or `fetch` suit les redirections, si bien qu'une session non
// reconnue revenait en 200 porteur de HTML : `res.ok` était vrai, `res.json()`
// échouait, l'échec était avalé par le `.catch`, et la fonction annonçait un
// succès. La modale se fermait alors sur une modification jamais écrite, sans le
// moindre message. On contrôle donc la redirection et le type de la réponse
// AVANT de la lire (règle posée dans AGENTS.md).
async function appelerAPI(chemin: string, corps: object): Promise<{ ok: boolean; error?: string }> {
  let res: Response
  try {
    res = await fetch(chemin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
  } catch {
    return { ok: false, error: 'Le serveur n’a pas répondu. Vérifiez la connexion, puis réessayez.' }
  }
  const typeReponse = res.headers.get('content-type') ?? ''
  if (res.redirected || !typeReponse.includes('application/json')) {
    console.error('Édition refusée : réponse inattendue', { chemin, statut: res.status, redirige: res.redirected, url: res.url, type: typeReponse })
    return { ok: false, error: 'Session non reconnue : rien n’a été enregistré. Rechargez la page ou reconnectez-vous, puis réessayez.' }
  }
  const json = await res.json().catch(() => null)
  if (!res.ok || !json) {
    console.error('Édition refusée', { chemin, statut: res.status, json })
    return { ok: false, error: json?.error ?? `Échec de l’enregistrement (HTTP ${res.status}).` }
  }
  return { ok: true }
}

// ── Modale d'édition admin (segment, titre de niveau, ou titre de l'œuvre) ───
// Toutes les écritures passent par des routes serveur (/api/admin/...), qui
// vérifient elles-mêmes le cookie admin avant d'utiliser la clé de service.
// Aucune écriture directe n'est faite depuis ce composant.
const CHAMP_LABEL: Record<string, string> = {
  titre: "Modifier le titre de l'œuvre",
  titre_affichage: "Modifier le titre de l'œuvre",
  sous_titre: 'Modifier le sous-titre',
  sous_titre_affichage: 'Modifier le sous-titre',
  titre_original: 'Modifier le titre original',
  titre_original_affichage: 'Modifier le titre original',
  trad_auteur: 'Modifier le traducteur',
  trad_auteur_affichage: 'Modifier le traducteur',
  auteur_affichage: 'Composer le nom d’auteur',
  provenance_affichage: 'Composer la ligne de provenance',
}

export default function ModaleEditionAdmin({ cible, idOeuvre, onClose, onEnregistre, onTitreOeuvreModifie, onTitreComposeModifie }: {
  cible: EditionCible; idOeuvre: string; onClose: () => void; onEnregistre: () => void
  onTitreOeuvreModifie?: (champ: string, valeur: string) => void
  /** Une COMPOSITION d'intertitre vient d'être écrite : la page la reporte sur sa copie
   *  locale (`titresComposes`) sans recharger la division. */
  onTitreComposeModifie?: (cle: string, valeur: string) => void
}) {
  const [valeur, setValeur] = useState(cible.type === 'segment' ? cible.seg.texte : cible.texteActuel)
  const [etape, setEtape] = useState<'edition' | 'confirmation' | 'confirmation-suppression'>('edition')
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'erreur'>('idle')
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)
  // ⛔ Échap ferme, et c'est le SEUL chemin du clavier : le voile et la croix ne
  //    servent que le curseur. C'est la règle des cinq autres fenêtres de la page.
  const idTitre = useId()
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [onClose])
  const taRef = useRef<HTMLTextAreaElement>(null)
  const boite = useRef<HTMLDivElement>(null)
  useFenetreModale(boite)

  // Le titre de l'œuvre a deux colonnes : celle du catalogue et celle du
  // frontispice. On choisit ici laquelle on modifie, au lieu d'écrire à l'aveugle
  // dans l'une pendant que l'écran montre l'autre. Les saisies en cours sont
  // gardées de part et d'autre : passer d'un onglet à l'autre ne perd rien.
  // ⚠️ Les DEUX cibles à titres en ont désormais : le titre de l'œuvre depuis toujours, les
  // intertitres depuis le 2026-09-20 (l'identité de la division d'un côté, sa composition
  // de l'autre). Le champ actif n'est donc plus forcément une colonne d'`oeuvres` : une
  // variante composée d'intertitre porte un nom suffixé, que `variante.compose` distingue.
  const variantes = cible.type === 'segment' ? [] : cible.variantes ?? []
  const [champActif, setChampActif] = useState<string | null>(
    cible.type === 'titre_oeuvre' ? cible.champ
      : cible.type === 'titre' ? (cible.variantes?.[0]?.champ ?? null)
      : null,
  )
  const [brouillons, setBrouillons] = useState<Record<string, string>>({})
  const varianteActive = variantes.find(v => v.champ === champActif) ?? null

  const changerDeColonne = (variante: VarianteTitre) => {
    if (!champActif || variante.champ === champActif) return
    setBrouillons(prev => ({ ...prev, [champActif]: valeur }))
    setValeur(brouillons[variante.champ] ?? variante.texte)
    setChampActif(variante.champ)
    setStatut('idle'); setErreurMsg(null)
  }

  const entourer = (avant: string, apres: string = avant) => {
    const ta = taRef.current
    if (!ta) return
    const d = ta.selectionStart, f = ta.selectionEnd
    const selection = valeur.slice(d, f) || 'texte'
    const nouveau = valeur.slice(0, d) + avant + selection + apres + valeur.slice(f)
    setValeur(nouveau)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + avant.length, d + avant.length + selection.length) }, 0)
  }

  const inserrerLien = () => {
    const url = window.prompt('URL du lien :', 'https://')
    if (url) entourer('[', `](${url})`)
  }

  const enregistrer = async () => {
    setStatut('envoi')
    let resultat: { ok: boolean; error?: string }
    if (cible.type === 'segment') {
      resultat = await appelerAPI('/api/admin/segment-modifier', { id: cible.seg.id, segment_texte: valeur })
    } else if (cible.type === 'titre_oeuvre') {
      resultat = await appelerAPI('/api/admin/update-oeuvre', { id_oeuvre: idOeuvre, champ: champActif ?? cible.champ, valeur: valeur || null })
    } else if (varianteActive?.compose) {
      // ⛔ Une COMPOSITION d'intertitre ne touche pas `segments` : elle vit sur l'œuvre, par
      // chemin de division (`compositionTitres.ts`). L'identité de la division ne bouge pas.
      resultat = await appelerAPI('/api/admin/titre-compose', {
        id_oeuvre: idOeuvre, champ: champDeLIntertitre(cible), groupe: cible.groupe, valeur,
      })
    } else {
      resultat = await appelerAPI('/api/admin/segment-titre', {
        id_oeuvre: idOeuvre, niveau: cible.niveau, action: 'modifier', valeur,
        schemaTexte: cible.schemaTexte, groupe: cible.groupe,
      })
    }
    if (!resultat.ok) { setStatut('erreur'); setErreurMsg(resultat.error ?? null); setEtape('edition'); return }
    if (cible.type === 'titre_oeuvre') onTitreOeuvreModifie?.(champActif ?? cible.champ, valeur)
    else if (varianteActive?.compose && cible.type === 'titre') {
      onTitreComposeModifie?.(cleTitreCompose(champDeLIntertitre(cible), cible.groupe), valeur)
    }
    else onEnregistre()
    onClose()
  }

  // Le champ de division que la cible vise, dans le vocabulaire de `GroupeData` :
  // le niveau, plus le suffixe du complément quand le crayon vise le sous-titre.
  function champDeLIntertitre(c: Extract<EditionCible, { type: 'titre' }>): ChampTitre {
    return `niv${c.niveau}${c.schemaTexte ? '_texte' : ''}` as ChampTitre
  }

  const viderChampOeuvre = async (champ: string) => {
    setStatut('envoi')
    const resultat = await appelerAPI('/api/admin/update-oeuvre', { id_oeuvre: idOeuvre, champ, valeur: null })
    if (!resultat.ok) { setStatut('erreur'); setErreurMsg(resultat.error ?? null); setEtape('edition'); return }
    onTitreOeuvreModifie?.(champ, '')
    onClose()
  }

  const supprimerTitre = async () => {
    if (cible.type !== 'titre') return
    setStatut('envoi')
    // Sous l'onglet COMPOSÉ, « supprimer » rend l'intertitre à son identité : on retire la
    // composition, jamais le titre de la division, qui porte la navigation.
    if (varianteActive?.compose) {
      const champ = champDeLIntertitre(cible)
      const res = await appelerAPI('/api/admin/titre-compose', {
        id_oeuvre: idOeuvre, champ, groupe: cible.groupe, valeur: '',
      })
      if (!res.ok) { setStatut('erreur'); setErreurMsg(res.error ?? null); setEtape('edition'); return }
      onTitreComposeModifie?.(cleTitreCompose(champ, cible.groupe), '')
      onClose()
      return
    }
    // schemaTexte = true → on vide uniquement le champ _texte (ne pas toucher au titre principal)
    const resultat = cible.schemaTexte
      ? await appelerAPI('/api/admin/segment-titre', {
          id_oeuvre: idOeuvre, niveau: cible.niveau, action: 'modifier', valeur: '', schemaTexte: true, groupe: cible.groupe,
        })
      : await appelerAPI('/api/admin/segment-titre', {
          id_oeuvre: idOeuvre, niveau: cible.niveau, action: 'supprimer', groupe: cible.groupe,
        })
    if (!resultat.ok) { setStatut('erreur'); setErreurMsg(resultat.error ?? null); setEtape('edition'); return }
    onEnregistre(); onClose()
  }

  // Supprime le segment puis décale d'un rang tous les segments numérotés
  // après lui, dans la même œuvre, pour ne jamais laisser de trou de
  // numérotation (citations, sommaire, etc. restent cohérents).
  const supprimerSegment = async () => {
    if (cible.type !== 'segment') return
    setStatut('envoi')
    const resultat = await appelerAPI('/api/admin/segment-supprimer', { id: cible.seg.id })
    if (!resultat.ok) { setStatut('erreur'); setErreurMsg(resultat.error ?? null); setEtape('edition'); return }
    onEnregistre(); onClose()
  }

  return (
    // ⛔ LE CALQUE PART DE LA BARRE, et il ne DÉFILE PAS (charte des fenêtres
    //    contextuelles, 17 août 2026) : en `inset: 0`, la boîte remontait sous la barre
    //    de navigation, peinte par-dessus. C'est le CONTENU qui défile, d'où le
    //    `maxHeight: 100%` de la boîte.
    // ⛔ Et le rang passe de 1100 à 1200, celui que la page donne à ses fenêtres : à
    //    1100, une fenêtre d'administration ouverte derrière « Proposer un lien » ou
    //    « Niveaux d'affichage » se serait retrouvée DESSOUS.
    <div ref={boite} role="dialog" aria-modal="true" aria-labelledby={idTitre}
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'var(--cs-calque-modale)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', overflow: 'hidden' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '12px', padding: '20px 22px', width: '42.5rem', maxWidth: '100%', maxHeight: '100%', overflowY: 'auto', boxShadow: 'var(--cs-ombre-modale)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p id={idTitre} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0 }}>
            {cible.type === 'segment' ? 'Modifier le segment' : cible.type === 'titre_oeuvre' ? (CHAMP_LABEL[cible.champ] ?? "Modifier le titre de l'œuvre") : `Modifier le titre de niveau ${cible.niveau}`}
          </p>
          <button onClick={onClose} aria-label="Fermer" className="cs-croix-fermer"><IconeCroix /></button>
        </div>

        {etape === 'edition' ? <>
          {/* ⚠️ L'AIDE paraît même quand il n'y a qu'une variante : le nom d'auteur et la
              ligne de provenance n'ont pas de face de catalogue qu'on puisse éditer ici, et
              c'est justement ce qu'il faut dire. */}
          {variantes.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              {variantes.length > 1 && (
              <div style={{ display: 'flex', gap: '4px' }}>
                {variantes.map(variante => {
                  const actif = variante.champ === champActif
                  return (
                    <button key={variante.champ} onClick={() => changerDeColonne(variante)}
                      style={{
                        fontSize: '0.6875rem', padding: '5px 11px', borderRadius: '4px', cursor: actif ? 'default' : 'pointer',
                        border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord)'}`,
                        background: actif ? 'var(--cs-vert-pale)' : 'var(--cs-surface)',
                        color: actif ? 'var(--cs-vert-fonce)' : 'var(--cs-texte-second)',
                        fontWeight: actif ? 600 : 400,
                      }}>
                      {variante.libelle}
                    </button>
                  )
                })}
              </div>
              )}
              <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', margin: variantes.length > 1 ? '6px 0 0' : 0, lineHeight: 1.45 }}>
                {varianteActive?.aide}
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => entourer('**')} title="Gras" style={{ ...BTN_MODAL, fontWeight: 700 }}>G</button>
            <button onClick={() => entourer('*')} title="Italique" style={{ ...BTN_MODAL, fontStyle: 'italic' }}>I</button>
            <button onClick={() => entourer('^^')} title="Exposant" style={BTN_MODAL}>x²</button>
            <button onClick={inserrerLien} title="Insérer un lien" style={BTN_MODAL}>Lien</button>
            <span style={{ width: '1px', background: 'var(--cs-bord-clair)' }} />
            <button onClick={() => entourer('« ', ' »')} title="Guillemets français" style={BTN_MODAL}>« »</button>
            <button onClick={() => entourer('“', '”')} title="Guillemets anglais (citation imbriquée)" style={BTN_MODAL}>” ”</button>
          </div>
          <textarea aria-label="Texte en cours d’édition" ref={taRef} value={valeur} onChange={e => setValeur(e.target.value)}
            rows={cible.type === 'segment' ? 8 : varianteActive?.compose || champActif === 'titre' ? 3 : 2} autoFocus
            style={{ width: '100%', fontSize: '0.78125rem', padding: '8px 10px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', lineHeight: 1.55, boxSizing: 'border-box', fontFamily: cible.type === 'segment' ? SANS : 'inherit' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            {cible.type === 'titre' ? (
              <button onClick={supprimerTitre} style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {varianteActive?.compose ? 'Revenir au titre de catalogue' : 'Supprimer'}
              </button>
            ) : cible.type === 'segment' ? (
              <button onClick={() => setEtape('confirmation-suppression')} style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Supprimer
              </button>
            ) : cible.type === 'titre_oeuvre' && champActif && champActif !== 'titre' ? (
              // `titre` ne se supprime jamais : c'est le nom de l'œuvre. Vider
              // `titre_affichage` est en revanche légitime, et rend le frontispice
              // au titre de catalogue.
              <button onClick={() => viderChampOeuvre(champActif)} style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {varianteActive?.compose ? 'Revenir au champ de catalogue' : 'Supprimer'}
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose} style={{ fontSize: '0.71875rem', padding: '0.3125rem 0.875rem', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => setEtape('confirmation')} disabled={!valeur.trim()}
                className="cs-bouton-plein cs-bouton-plein--compact">
                Modifier
              </button>
            </div>
          </div>
          {statut === 'erreur' && (
            <p style={{ ...TEXTE_ERREUR, marginTop: '8px' }}>
              Erreur d&rsquo;enregistrement{erreurMsg ? ` — ${erreurMsg}` : ' — rien n’a été modifié.'}
            </p>
          )}
        </> : etape === 'confirmation' ? <>
          <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', marginBottom: '10px' }}>Confirmer cette modification ?</p>
          <div style={{ background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-fond-doux)', borderRadius: '4px', padding: '8px 10px', fontSize: '0.71875rem', color: 'var(--cs-texte-fort)', marginBottom: '12px', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {valeur}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setEtape('edition')} disabled={statut === 'envoi'} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Retour</button>
            <button onClick={enregistrer} disabled={statut === 'envoi'} className="cs-bouton-plein cs-bouton-plein--compact">
              {statut === 'envoi' ? 'Envoi…' : 'Confirmer'}
            </button>
          </div>
        </> : <>
          <p style={{ ...TEXTE_ERREUR, marginBottom: '10px' }}>Supprimer définitivement ce segment ? La numérotation des segments suivants sera décalée automatiquement.</p>
          <div style={{ background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-fond-doux)', borderRadius: '4px', padding: '8px 10px', fontSize: '0.71875rem', color: 'var(--cs-texte-fort)', marginBottom: '12px', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {valeur}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setEtape('edition')} disabled={statut === 'envoi'} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Retour</button>
            <button onClick={supprimerSegment} disabled={statut === 'envoi'} style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'var(--cs-danger-aplat)', color: 'var(--cs-sur-aplat)', fontWeight: 500 }}>
              {statut === 'envoi' ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </div>
        </>}
      </div>
    </div>
  )
}
