// Phase D — CONTRÔLE. Schéma d'intervention traçable (§15), classification de risque R0-R4 (§10),
// lecture du catalogue d'erreurs, et passe de contrôle DÉTERMINISTE (aucun réseau : confiance faible,
// lignes vides, doublons, pages anormales). Les corrections vont dans la COUCHE CANDIDATE ; l'OCR
// brut reste immuable ; rien n'est validé sans l'humain.

import { pageAnormale } from './diagnostic.mjs'
import { appelerIA } from './fournisseur.mjs'
import { moderniserGlyphes, contientGlyphesAnciens, reparerDerives } from '../typographie.mjs'
import { notesDeLaPage, apparierNotesImprimees, numeroterAncrages } from '../notes-ancrage.mjs'

/** Intervention normalisée (provenance complète, §15). Statut par défaut : propose_ia. */
export function intervention(c = {}) {
  return {
    id: c.id ?? null, type: c.type || 'correction_ocr', page: c.page ?? null, ligne_ids: c.ligne_ids || [],
    bbox: c.bbox || [], texte_original: c.texte_original ?? '', texte_candidat: c.texte_candidat ?? '',
    modele: c.modele ?? null, fournisseur: c.fournisseur ?? null, version_modele: c.version_modele ?? null,
    version_prompt: c.version_prompt ?? null, sha256_image: c.sha256_image ?? null, regle: c.regle ?? null,
    severite: c.severite ?? null, // Phase 5 : information | avertissement | critique | bloquant
    preuves: c.preuves || [], lecture_fondee_sur_image: !!c.lecture_fondee_sur_image,
    inference_contextuelle: !!c.inference_contextuelle, confiance_modele: c.confiance_modele ?? 0,
    niveau_risque: c.niveau_risque || 'R0', statut: c.statut || 'propose_ia', validation_humaine: false,
    interdit_entrainement: !!c.interdit_entrainement, date: c.date ?? null, historique: [],
  }
}

/**
 * Niveau de risque R0-R4 (§10) — la confiance du modèle NE SUFFIT PAS. On classe d'après des signaux
 * explicites (preuve visuelle, stabilité de la règle, portée, caractère conjectural…).
 */
export function niveauRisque(s = {}) {
  if (s.bloquant || s.page_non_traitee || s.ordre_indeterminable || s.contradiction || s.conjectural_non_signale) return 'R4'
  if (s.lettre_partielle || s.lectures_multiples || s.change_hierarchie || s.ordre_lecture || s.note_vs_corps || s.correction_contextuelle || (s.suppression_ajout && (s.nb_chars || 0) >= 3)) return 'R3'
  if (s.nouveau_motif || s.fusion_fragments || s.lettrine_lisible || s.niveau_titre_nouveau || s.cesure_probable) return 'R2'
  if (s.repetition_validee || s.folio_stable || s.marque_cahier_confirmee || (s.erreur_connue && s.preuve_visuelle_forte)) return 'R1'
  return 'R0'
}

/** Parse un catalogue d'erreurs au format JSONL (une entrée par ligne). Ignore les lignes vides. */
export function chargerCatalogue(texte) {
  return String(texte || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
}

/**
 * Détecte une ligne CHARABIA — typiquement l'OCR d'un bandeau ornemental ou d'une gravure (« Cocc oc
 * sc coc oiccccccscsc »). Signaux : répétition d'un même caractère (≥4), longue suite de consonnes
 * (≥5), ou majorité de jetons ultra-courts (≤2 lettres) sur une ligne d'au moins 3 jetons. Prudent :
 * ne vise que des non-mots manifestes ; renvoie une raison ou null.
 */
const VOYELLE = /[aeiouyàâäéèêëîïôöùûüœæ]/i
const ROMAIN = /^[IVXLCDM]+$/i

export function ligneCharabia(texte) {
  const t = String(texte ?? '').trim()
  if (t.length < 4) return null
  if (/(.)\1{3,}/.test(t)) return 'répétition d’un même caractère (bandeau ornemental probable)'
  if (/[bcdfghjklmnpqrstvwxzçñ]{5,}/i.test(t)) return 'longue suite de consonnes (gravure probable)'
  const jetons = t.split(/\s+/).map((j) => j.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean)
  if (jetons.length < 3) return null
  // UN SEUL mot plausible suffit à disqualifier le charabia. Une gravure n'en produit pas ; du
  // texte, si. C'est le garde-fou décisif : sans lui, la règle prenait « la coagmentation du Ciel
  // & de la terre » pour un ornement.
  if (jetons.some((j) => j.length >= 4 && VOYELLE.test(j))) return null
  // ⚠️ L'ancienne règle comptait les jetons « ultra-courts » (≤2 lettres) : elle mesurait donc la
  // présence de MOTS-OUTILS (la, du, de, &, en…) et concluait l'inverse — elle condamnait le
  // français le plus ordinaire, la page de titre, les titres courants et jusqu'à la date
  // « M. DC. IV. ». On compte désormais les fragments SANS VOYELLE, qui, eux, ne sont pas des mots
  // — en épargnant chiffres et chiffres romains, qui en sont.
  const nonMots = jetons.filter((j) => !VOYELLE.test(j) && !/^\d+$/.test(j) && !ROMAIN.test(j))
  if (nonMots.length / jetons.length > 0.6) return 'majorité de fragments sans voyelle (ornement probable)'
  return null
}

/**
 * Page INUTILE à conserver dans le corps (retour utilisateur) : garde / feuillet blanc, page de
 * mention « Google », ou page d'ornement (toutes les lignes sont du charabia). Renvoie une raison ou
 * null. À signaler pour exclusion du corps ; ne supprime jamais la source.
 */
// Formules propres aux avertissements de numériseur (Google Livres et assimilés). Aucune n'a de
// raison de figurer dans une œuvre du XVIIᵉ siècle.
const AVIS_NUMERISEUR = [
  /\bgoogle\b/i, /\bdigitized\b/i, /à propos de ce livre/i, /consignes d.utilisation/i,
  /domaine public/i, /recherche de livres/i, /filigrane/i, /^https?:\/\//i, /\bbooks\.google\b/i,
]

export function pageIgnorable(lignes) {
  const textes = (Array.isArray(lignes) ? lignes : []).map((l) => String(l?.dip ?? l?.texte ?? '').trim()).filter(Boolean)
  if (textes.length === 0) return 'page vide (garde / feuillet blanc)'
  // ⚠️ L'ancienne règle exigeait que TOUTES les lignes mentionnent le numériseur : une page de
  // garde Google en compte une dizaine sur quarante, le reste étant de la prose juridique — elle
  // n'était donc jamais reconnue. On juge sur un FAISCEAU : plusieurs formules caractéristiques,
  // ou une proportion notable de lignes concernées.
  const marquees = textes.filter((t) => AVIS_NUMERISEUR.some((re) => re.test(t))).length
  // Trois cas : un faisceau de formules ; une proportion notable ; ou une page entièrement faite
  // de ces mentions (le cas d'une simple estampille « Digitized by Google » sur une page nue).
  if (marquees >= 3 || (marquees >= 2 && marquees / textes.length >= 0.1) || marquees === textes.length) {
    return `page d’avertissement du numériseur (${marquees} ligne(s) caractéristique(s) sur ${textes.length})`
  }
  if (textes.every((t) => ligneCharabia(t))) return 'page d’ornement (OCR de gravure)'
  return null
}

/**
 * Passe de contrôle DÉTERMINISTE (§8.2-A) : sans IA, sans réseau. Produit des findings (interventions)
 * et des compteurs. Ne modifie PAS le projet. La couche candidate est alimentée ailleurs, après revue.
 */
export function controlerDeterministe(projet, { seuilConfiance = 0.8 } = {}) {
  const findings = []
  const compteurs = { pages: 0, lignes: 0, confiance_faible: 0, lignes_vides: 0, doublons: 0, pages_anormales: 0, charabia: 0, pages_ignorables: 0 }
  const nums = Object.keys(projet?.pages || {}).map(Number).sort((a, b) => a - b)
  for (const n of nums) {
    // Règle n°1 : ne contrôler QUE les pages océrisées. Une entrée sans tableau `lignes` est une simple
    // coquille (vignette du tri IA, aperçu du PDF) — jamais océrisée : on la saute (sinon on la compterait
    // et `pageAnormale([])` la signalerait à tort comme page anormale bloquante).
    const lignes = projet.pages[n]?.lignes
    if (!Array.isArray(lignes)) continue
    compteurs.pages++
    const anom = pageAnormale(lignes)
    if (anom) {
      compteurs.pages_anormales++
      // Phase 5 : une page COURTE / peu remplie (page de titre, faux-titre, fin de chapitre, garde…) est
      // légitime — c'est un AVERTISSEMENT, pas un blocage. Ne bloque plus l'export « complet ».
      findings.push(intervention({ id: 'page-courte-' + n, type: 'controle_page', page: n, regle: 'page_courte', preuves: [anom], niveau_risque: 'R2', statut: 'avertissement', severite: 'avertissement' }))
    }
    const ign = pageIgnorable(lignes)
    if (ign) {
      compteurs.pages_ignorables++
      findings.push(intervention({ id: 'page-ignorable', type: 'controle_page', page: n, regle: 'page_ignorable', preuves: [ign], niveau_risque: 'R1', statut: 'propose_ia' }))
    }
    let prev = null
    lignes.forEach((l, i) => {
      compteurs.lignes++
      const t = String(l.dip ?? l.texte ?? '').trim()
      // Toute intervention porte le TEXTE et la BOÎTE de sa ligne : sans eux, l'atelier affiche une
      // citation vide (« indications pas assez précises ») et ne peut ni zoomer sur le fac-similé
      // ni pointer la ligne. L'information est ici, elle doit voyager avec le signalement.
      const situe = { texte_original: t, bbox: Array.isArray(l.bbox) ? l.bbox : [] }
      if (Array.isArray(l.bbox) && !t) {
        compteurs.lignes_vides++
        findings.push(intervention({ id: 'deter-ligne-vide', page: n, ligne_ids: [i], ...situe, regle: 'ligne_vide', niveau_risque: 'R0', statut: 'applique_deterministe' }))
      }
      if (l.confiance != null && l.confiance < seuilConfiance) {
        compteurs.confiance_faible++
        findings.push(intervention({
          id: 'deter-confiance-faible', page: n, ligne_ids: [i], ...situe, regle: 'confiance_faible',
          confiance_modele: l.confiance, lecture_fondee_sur_image: true, niveau_risque: 'R2', statut: 'propose_ia',
          preuves: ['reconnaissance à ' + Math.round(l.confiance * 100) + ' % sur cette ligne'],
        }))
      }
      if (t && prev != null && t === prev) {
        compteurs.doublons++
        findings.push(intervention({
          id: 'struct-ligne-dupliquee', type: 'structure', page: n, ligne_ids: [i - 1, i], ...situe,
          regle: 'doublon', niveau_risque: 'R1', statut: 'propose_ia',
          preuves: ['ligne identique à la précédente'],
        }))
      }
      const cha = t && ligneCharabia(t)
      if (cha) {
        compteurs.charabia++
        // §31.4 : un bandeau gravé lu en charabia se RECLASSE (« ornement »), il ne se vide pas.
        // Proposer « texte_candidat: '' » revenait à demander une suppression — interdite (§23.8) —
        // et la ligne doit rester dans la source, seulement écartée du corps.
        const iv = intervention({
          id: 'bruit-ornement', type: 'reclassement_role', page: n, ligne_ids: [i],
          regle: 'charabia_ornement', preuves: [cha], texte_original: t,
          texte_candidat: '[ornement]', bbox: Array.isArray(l.bbox) ? l.bbox : [],
          niveau_risque: 'R2', statut: 'propose_ia', interdit_entrainement: true,
        })
        iv.role_avant = l?.suggestion?.role_confirme ?? l?.suggestion?.role_suggere ?? 'corps'
        iv.role_apres = 'ornement'
        findings.push(iv)
      }
      prev = t
    })
  }
  return { findings, compteurs }
}

/**
 * Mappe une sortie IA (lettrine / titre / correction) en INTERVENTION §15, avec provenance et risque.
 * Une abstention → aucune intervention (null). Une lecture CONJECTURALE (inférée du contexte, non
 * fondée sur l'image) → R3 ET interdit_entrainement (jamais au ground-truth).
 */
export function interventionDepuisSortieIA(sortie, ctx = {}) {
  if (!sortie || sortie.abstention) return null
  const contextuel = !!sortie.inference_contextuelle
  const fondeeImage = sortie.lecture_fondee_sur_image !== false && !contextuel
  let risque = 'R2'
  if (contextuel || sortie.presence === 'probable' || sortie.lecture_partielle || sortie.restitution_editoriale) risque = 'R3'
  return intervention({
    id: ctx.id || sortie.type, type: sortie.type || 'correction_ocr', page: ctx.page ?? null,
    ligne_ids: ctx.ligne_ids || [], bbox: ctx.bbox || [],
    texte_original: ctx.texte_original ?? sortie.texte_ocr ?? '',
    texte_candidat: sortie.lecture_candidate ?? sortie.texte_propose ?? sortie.texte_reconstruit ?? '',
    modele: sortie.modele ?? null, fournisseur: sortie.fournisseur ?? null,
    regle: ctx.regle || sortie.type, preuves: sortie.preuves || [],
    lecture_fondee_sur_image: fondeeImage, inference_contextuelle: contextuel,
    confiance_modele: sortie.confiance ?? 0, niveau_risque: risque,
    statut: 'propose_ia', interdit_entrainement: contextuel || !!sortie.restitution_editoriale,
  })
}

/**
 * Convertit la sortie d'une RELECTURE de page (corrections ligne à ligne) en interventions §15. Ne garde
 * qu'une correction qui CHANGE réellement le texte d'une ligne existante (indice valide, texte non vide,
 * différent de l'OCR) : on écarte le bruit et les « corrections » identiques. Pur / testable.
 */
export function interventionsDepuisRelecture(sortie, { page, lignes = [], modele = null, fournisseur = null, kind = 'imprime' } = {}) {
  if (!sortie || sortie.abstention || !Array.isArray(sortie.corrections)) return []
  const manuscrit = kind === 'manuscrit'
  const out = []
  for (const c of sortie.corrections) {
    const i = Number(c?.i)
    if (!Number.isInteger(i) || i < 0 || i >= lignes.length) continue
    const orig = String(lignes[i]?.dip ?? lignes[i]?.texte ?? '')
    // GARDE-FOU §14.3 — sur un IMPRIMÉ, la couche candidate ne porte pas de caractère purement
    // glyphique : si le modèle archaïse (« estre » → « eſtre »), on modernise sa proposition au lieu
    // de la refuser — la correction utile (lettre, accent) est conservée, l'archaïsme neutralisé.
    // Sur un MANUSCRIT (§14.4, transcription diplomatique), on ne touche à rien.
    const brut = String(c?.texte_corrige ?? '')
    // Glissements de ponctuation et de graphie réparés avant tout : ils ne viennent jamais d'une
    // lecture de l'image (césure ¬ perdue, apostrophe dégradée, espace avant un point, virgule
    // changée en point devant une minuscule).
    const { texte: redresse, reparees } = reparerDerives(String(lignes[i]?.dip ?? lignes[i]?.texte ?? ''), brut)
    const corr = manuscrit ? redresse : moderniserGlyphes(redresse)
    // §14.2 / §23.8 : jamais de suppression d'une ligne imprimée par une « correction » vide.
    if (!corr.trim() || corr === orig) continue
    const iv = intervention({
      id: 'relecture-p' + page + '-l' + i, type: 'correction_ocr', page, ligne_ids: [i],
      bbox: lignes[i]?.bbox || [], texte_original: orig, texte_candidat: corr,
      modele, fournisseur, regle: 'relecture_page', preuves: c?.motif ? [String(c.motif)] : [],
      lecture_fondee_sur_image: true, inference_contextuelle: false,
      confiance_modele: Number(c?.confiance) || 0, niveau_risque: 'R2', statut: 'propose_ia',
    })
    // Verdict de l'IA : « certaine » (auto-applicable) / « incertaine » (soumise à l'humain) — sinon null.
    iv.certitude = (c?.certitude === 'certaine' || c?.certitude === 'incertaine') ? c.certitude : null
    // Une proposition qui archaïsait est neutralisée mais reste tracée : jamais appliquée en aveugle.
    if (!manuscrit && contientGlyphesAnciens(brut)) {
      iv.certitude = 'incertaine'
      iv.preuves = [...(iv.preuves || []), 'archaïsme proposé par le modèle, modernisé (charte §14.3)']
    }
    // Une proposition qu'il a fallu redresser n'est plus « certaine » : elle passe sous les yeux.
    if (reparees.length) {
      iv.certitude = 'incertaine'
      iv.preuves = [...(iv.preuves || []), ...reparees]
    }
    out.push(iv)
  }
  return out
}

/**
 * LIGNES OMISES (§1.2 « les endroits où l'OCR saute facilement une ligne ») : une ligne visible sur
 * l'image mais absente de la reconnaissance. Proposée en AJOUT, jamais silencieusement : la ligne
 * ajoutée n'a ni bbox ni `ocr0`, donc elle est écartée du ground-truth (interdit_entrainement) tout
 * en étant comptée dans le texte. R3 : ajoute du contenu, donc jamais appliquée en aveugle.
 */
export function interventionsLignesOmises(sortie, { page, lignes = [], modele = null, fournisseur = null } = {}) {
  if (!sortie || sortie.abstention || !Array.isArray(sortie.lignes_omises)) return []
  const out = []
  for (const o of sortie.lignes_omises) {
    const texte = String(o?.texte ?? '').trim()
    if (!texte) continue
    const apres = Number(o?.apres_i)
    if (!Number.isInteger(apres) || apres < -1 || apres >= lignes.length) continue
    const iv = intervention({
      id: 'omise-p' + page + '-a' + apres, type: 'ligne_omise', page, ligne_ids: [apres],
      texte_original: '', texte_candidat: texte, modele, fournisseur, regle: 'ligne_omise',
      preuves: o?.motif ? [String(o.motif)] : ['ligne visible sur l’image, absente de la reconnaissance'],
      lecture_fondee_sur_image: true, confiance_modele: Number(o?.confiance) || 0,
      niveau_risque: 'R3', statut: 'propose_ia', interdit_entrainement: true,
    })
    iv.certitude = 'incertaine' // un ajout de contenu passe toujours par l'humain
    iv.apres_i = apres
    out.push(iv)
  }
  return out
}

// Rôles de reclassement que la relecture peut proposer (vocabulaire UNIQUE de structure.mjs).
// `note_marginale` / `note_bas_page` : les notes sont CONSERVÉES (§13.1) — sorties du flux de prose,
// jamais supprimées. `paratexte_titre` : mentions de page de titre (imprimeur, lieu, millésime, §5.1).
const ROLES_RECLASSEMENT = new Set([
  'ornement', 'titre_courant', 'numero_page', 'signature', 'reclame', 'bruit',
  'note_marginale', 'note_bas_page', 'paratexte_titre',
])

/**
 * Convertit les CLASSIFICATIONS d'une relecture (lignes non textuelles) en interventions de reclassement
 * de rôle (§8.3-A, Phase 3). Ne garde qu'un rôle connu, pour une ligne existante, différent du rôle
 * courant. Ne touche pas le texte : la ligne sera écartée du corps mais conservée en source. Pur.
 */
export function interventionsReclassement(sortie, { page, lignes = [], modele = null, fournisseur = null } = {}) {
  if (!sortie || sortie.abstention || !Array.isArray(sortie.classifications)) return []
  const out = []
  for (const c of sortie.classifications) {
    const i = Number(c?.i)
    if (!Number.isInteger(i) || i < 0 || i >= lignes.length) continue
    const role = String(c?.role ?? '')
    if (!ROLES_RECLASSEMENT.has(role)) continue
    const l = lignes[i]
    const roleActuel = l?.suggestion?.role_confirme ?? l?.suggestion?.role_suggere ?? 'corps'
    if (roleActuel === role) continue
    const iv = intervention({
      id: 'reclass-p' + page + '-l' + i, type: 'reclassement_role', page, ligne_ids: [i],
      bbox: l?.bbox || [], texte_original: String(l?.dip ?? l?.texte ?? ''), texte_candidat: '[' + role + ']',
      modele, fournisseur, regle: 'relecture_role', preuves: c?.motif ? [String(c.motif)] : [],
      lecture_fondee_sur_image: true, confiance_modele: Number(c?.confiance) || 0,
      niveau_risque: 'R2', statut: 'propose_ia', interdit_entrainement: true,
    })
    iv.role_avant = roleActuel; iv.role_apres = role
    out.push(iv)
  }
  return out
}

/**
 * Passe de contrôle IA PAR PAGE (§8.3-A, retour 2026-08-09) : relit l'IMAGE de CHAQUE page océrisée et
 * en récolte les corrections (une requête / page). C'est la seule façon d'attraper les erreurs que l'OCR
 * commet avec assurance (bonne confiance mais faux), invisibles à la passe déterministe. `preparerCharge`
 * (fourni par le serveur) construit la charge — image + consigne — adaptée au fournisseur (chemin pour le
 * CLI local, messages pour l'API). Ne modifie JAMAIS le projet ; renvoie des interventions candidates.
 */
/**
 * Une PAGE ENTIÈRE hors œuvre (feuillet blanc, planche gravée, page de bibliothèque numérique…) :
 * §31.6 — une particularité éditoriale ne se traite pas en cinquante décisions ligne à ligne. Le
 * modèle la signale d'un bloc ; on en fait UNE intervention de page. Renvoie null sinon.
 */
export function interventionPageExclue(sortie, { page, modele = null, fournisseur = null } = {}) {
  const p = sortie?.page
  if (!p || p.exclure !== true) return null
  return intervention({
    id: 'page-exclure-' + page, type: 'controle_page', page, regle: 'page_exclure',
    preuves: p.motif ? [String(p.motif)] : ['page hors œuvre'], modele, fournisseur,
    lecture_fondee_sur_image: true, niveau_risque: 'R2', statut: 'propose_ia', severite: 'avertissement',
  })
}

/** Une intervention d'ANCRAGE : rattache une note au passage annoté. Jamais de numéro ici. */
function interventionAncrage(a, { page, lignes, modele = null, fournisseur = null, methode }) {
  const iNote = Array.isArray(a.lignes_note) ? a.lignes_note[0] : a.note_i
  const texteNote = String(lignes?.[iNote]?.dip ?? lignes?.[iNote]?.texte ?? '')
  const iv = intervention({
    id: 'ancrage-p' + page + '-n' + iNote, type: 'ancrage_note', page,
    ligne_ids: Array.isArray(a.lignes_note) ? a.lignes_note : [iNote],
    texte_original: texteNote, texte_candidat: '→ ligne ' + a.corps_i,
    modele, fournisseur, regle: methode, preuves: a.motif ? [String(a.motif)] : [],
    lecture_fondee_sur_image: methode !== 'appel_imprime',
    confiance_modele: Number(a.confiance) || (methode === 'appel_imprime' ? 1 : 0),
    // Un rattachement change la STRUCTURE du texte : R3, jamais appliqué en aveugle (sauf appel imprimé).
    niveau_risque: methode === 'appel_imprime' ? 'R1' : 'R3', statut: 'propose_ia',
  })
  iv.certitude = a.certitude === 'certaine' ? 'certaine' : 'incertaine'
  iv.corps_i = a.corps_i ?? null
  iv.lignes_note = Array.isArray(a.lignes_note) ? a.lignes_note : [iNote]
  iv.apres = a.apres ?? null
  return iv
}

/**
 * Passe d'ANCRAGE des notes (§13) — une passe SÉMANTIQUE de plus dans le Contrôle IA, appelée
 * seulement là où il y a des notes. Économe par construction :
 *   1. le MÉCANIQUE d'abord — une note à appel imprimé (« (1) ») est appariée sans aucun appel IA ;
 *   2. l'IA ENSUITE, sur les seules notes restantes (gloses de marge, sans marque).
 * La numérotation « [[n]] » n'est jamais demandée au modèle : elle est posée ici, globale à l'œuvre.
 * Ne modifie pas le projet ; renvoie des interventions candidates.
 */
export async function ancrerNotesIA(projet, { fournisseur, consentement = false, preparerCharge = null, pages = null } = {}) {
  const interventions = []
  const meta = { pages_avec_notes: 0, ancrages_mecaniques: 0, ancrages_ia: 0, erreur: null }
  const dispo = Object.keys(projet?.pages || {}).map(Number)
  const nums = (Array.isArray(pages) && pages.length ? pages.map(Number).filter((n) => dispo.includes(n)) : dispo).sort((a, b) => a - b)
  const bruts = []
  for (const n of nums) {
    const lignes = projet?.pages?.[n]?.lignes || []
    if (!lignes.length) continue
    const { corps, notes } = notesDeLaPage(lignes)
    if (!notes.length) continue
    meta.pages_avec_notes++
    // 1. Appariement mécanique par appel imprimé — gratuit, certain.
    const { ancrages, restantes } = apparierNotesImprimees(corps, notes)
    for (const a of ancrages) { bruts.push({ page: n, lignes, a: { ...a, lignes_note: [a.note_i], certitude: 'certaine' }, methode: 'appel_imprime' }); meta.ancrages_mecaniques++ }
    // 2. Passe sémantique, sur ce qui reste seulement.
    if (!restantes.length || !fournisseur || !preparerCharge) continue
    const charge = await preparerCharge(n, corps, restantes)
    if (!charge) continue
    const out = await appelerIA(fournisseur, 'notes', charge, { consentement })
    if (out?.erreur && !meta.erreur) meta.erreur = out.erreur
    if (out?.abstention || !Array.isArray(out?.ancrages)) continue
    for (const a of out.ancrages) {
      if (a?.corps_i == null) continue // « rien de sûr » : on ne rattache pas au hasard (§25.0)
      bruts.push({ page: n, lignes, a, methode: 'ancrage_semantique', modele: out.modele, fournisseur: out.fournisseur })
      meta.ancrages_ia++
    }
  }
  // Numérotation globale, dans l'ordre de lecture (§13.2) — jamais celle du fac-similé.
  const numerotes = numeroterAncrages(bruts.map((b, k) => ({ ...b.a, page: b.page, note_i: Array.isArray(b.a.lignes_note) ? b.a.lignes_note[0] : b.a.note_i, _k: k })))
  for (const nu of numerotes) {
    const b = bruts[nu._k]
    const iv = interventionAncrage(nu, { page: b.page, lignes: b.lignes, modele: b.modele, fournisseur: b.fournisseur, methode: b.methode })
    iv.numero_note = nu.numero
    iv.texte_candidat = '[[' + nu.numero + ']] → ligne ' + nu.corps_i
    interventions.push(iv)
  }
  return { interventions, meta }
}

export async function controlerPageIA(projet, { fournisseur, consentement = false, preparerCharge = null, pages = null, cache = null, cleDe = null } = {}) {
  const interventions = []
  const meta = { pages_relues: 0, erreur: null, depuis_cache: 0 }
  if (!fournisseur || !preparerCharge) return { interventions, meta }
  const kind = projet?.kind === 'manuscrit' ? 'manuscrit' : 'imprime'
  const dispo = Object.keys(projet?.pages || {}).map(Number)
  const nums = (Array.isArray(pages) && pages.length ? pages.map(Number).filter((n) => dispo.includes(n)) : dispo).sort((a, b) => a - b)
  for (const n of nums) {
    const lignes = projet?.pages?.[n]?.lignes || []
    if (!lignes.length) continue
    const charge = await preparerCharge(n, lignes)
    if (!charge) continue
    // Clé de cache calculée par l'appelant (il seul connaît l'image et le prompt réellement
    // envoyés). Sans clé, l'appel se fait normalement : le cache est un confort, jamais un passage
    // obligé.
    const cacheCle = cleDe ? await cleDe(n, charge) : null
    const out = await appelerIA(fournisseur, 'page', charge, { consentement, cache, cacheCle })
    meta.pages_relues++
    if (out?._cache) meta.depuis_cache++
    if (out?.erreur && !meta.erreur) meta.erreur = out.erreur
    const ctx = { page: n, lignes, modele: out?.modele || null, fournisseur: out?.fournisseur || null }
    // Page entière hors œuvre : une seule décision, on ne descend pas au détail des lignes.
    const pageExclue = interventionPageExclue(out, ctx)
    if (pageExclue) { interventions.push(pageExclue); continue }
    interventions.push(...interventionsDepuisRelecture(out, { ...ctx, kind }))
    interventions.push(...interventionsReclassement(out, ctx))
    interventions.push(...interventionsLignesOmises(out, ctx))
  }
  return { interventions, meta }
}

/**
 * Passe de contrôle IA (§8.3-8.5) : sur les lettrines candidates et les lignes à faible confiance,
 * demande un avis au fournisseur (mock → s'abstient, donc AUCUNE intervention par défaut ; un vrai
 * fournisseur n'agit que derrière clé + consentement). Ne modifie JAMAIS le projet ; renvoie des
 * interventions candidates traçables.
 */
export async function controlerIA(projet, { fournisseur, consentement = false, cache = null, seuilConfiance = 0.8, preparerCharge = null } = {}) {
  const interventions = []
  if (!fournisseur) return { interventions }
  const nums = Object.keys(projet?.pages || {}).map(Number).sort((a, b) => a - b)
  for (const n of nums) {
    const lignes = projet.pages[n].lignes || []
    for (let i = 0; i < lignes.length; i++) {
      const l = lignes[i], s = l.suggestion
      const ctx = { page: n, ligne_ids: [i], bbox: l.bbox, texte_original: l.dip }
      const estLettrine = s && /^lettrine_candidate$/.test(s.role_suggere || '')
      const faibleConf = l.confiance != null && l.confiance < seuilConfiance
      if (!estLettrine && !faibleConf) continue
      const tache = estLettrine ? 'lettrine' : 'ligne'
      // preparerCharge (serveur) construit le crop + les messages ; sinon charge texte simple (mock).
      const charge = preparerCharge ? await preparerCharge(tache, { page: n, ligne: i, ligne_obj: l, projet }) : { page: n, ligne: i, texte: l.dip }
      const out = await appelerIA(fournisseur, tache, charge, { consentement, cache })
      const iv = interventionDepuisSortieIA(out, { ...ctx, regle: estLettrine ? 'lettrine' : 'correction_ocr' }); if (iv) interventions.push(iv)
    }
  }
  return { interventions }
}
