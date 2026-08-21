// RAPPORT DE CONTRÔLE après triage automatique (§10 de la consigne).
//
// Le rapport précédent listait toutes les corrections, à plat : 150 entrées à relire pour 35 pages.
// Celui-ci part du principe inverse : par défaut il n'affiche QUE ce qui reste à décider, ordonné du
// plus difficile au plus simple. Tout le reste — auto-accepté, ocr0 conservé, lignes faibles
// confirmées — demeure consultable, mais replié : c'est de l'audit, pas du travail.
//
// Module PUR : ni I/O, ni réseau, ni horloge (l'appelant passe la date). Testé.

import { mesurerTriage } from './triage.mjs'

const ech = (s) => String(s ?? '').replace(/</g, '&lt;').replace(/\|/g, '\\|')
const pct = (x) => (x == null ? '—' : Math.round(x * 100) + ' %')
const nb2 = (x) => (x == null ? '—' : String(Math.round(x * 100) / 100).replace('.', ','))

/** Repère lisible d'une intervention : page et ligne(s). */
export function repere(f) {
  const l = Array.isArray(f?.ligne_ids) && f.ligne_ids.length ? ' L' + f.ligne_ids.join(',') : ''
  return 'p.' + (f?.page ?? '?') + l
}

const MOTIFS = {
  desaccord: 'les deux vérifications visuelles se contredisent',
  lecture_tierce: 'une troisième lecture est apparue sur l’image',
  image_ambigue: 'l’image ne permet pas de trancher',
  confirmation_manquante: 'cas à risque : une seule vérification concluante sur les deux requises',
  confiance_insuffisante: 'aucune vérification n’atteint le seuil',
  sans_verification: 'aucune vérification visuelle n’a pu être menée',
  politique_couche: 'graphie ancienne réintroduite : contraire à la règle de couche du projet',
}
/** Traduit le motif technique en une phrase qui dit à l'humain POURQUOI on le dérange. */
export function expliquerMotif(raison) {
  const code = String(raison || '').split(' — ')[0]
  return MOTIFS[code] || String(raison || 'motif non précisé')
}

/** Lecture retenue par les vérificateurs, telle qu'ils l'ont recopiée. */
function lecturesVues(t) {
  return (t?.verdicts || [])
    .map((v, k) => `${k + 1}. ${v.verdict}${v.exact_reading ? ' « ' + ech(v.exact_reading) + ' »' : ''} · confiance ${nb2(v.confidence)} · image ${v.crop_quality}${v.visual_evidence ? ' · ' + ech(v.visual_evidence) : ''}`)
}

/** Une entrée de la file humaine, avec tout ce qu'il faut pour décider sans rouvrir l'atelier. */
function entreeRevue(f, { lienCrop = null } = {}) {
  const t = f.triage || {}
  const out = []
  out.push('#### ' + repere(f) + ' — ' + expliquerMotif(t.auto_decision_reason))
  out.push('')
  if (lienCrop) out.push('![crop](' + lienCrop + ')', '')
  out.push('| | |')
  out.push('|---|---|')
  out.push('| lecture machine (`ocr0`) | ' + (ech(f.texte_original) || '_∅_') + ' |')
  out.push('| candidat proposé | ' + (ech(f.texte_candidat) || '_∅_') + ' |')
  const vues = lecturesVues(t)
  out.push('| vérifications visuelles | ' + (vues.length ? vues.map(ech).join('<br>') : '_aucune_') + ' |')
  out.push('| classe · drapeaux | ' + (t.classe || '—') + (t.risk_flags?.length ? ' · ' + t.risk_flags.join(', ') : '') + ' |')
  out.push('| scores | générateur ' + pct(t.generator_confidence) + ' · vérificateur ' + pct(t.visual_verifier_confidence) + ' · distance ' + (t.distance_edition ?? '—') + ' |')
  out.push('| difficulté | ' + (t.review_priority ?? 0) + ' |')
  out.push('')
  return out
}

/** Ligne condensée, pour les sections d'audit (on ne déplie que si l'on doute). */
function entreeAudit(f) {
  const t = f.triage || {}
  return '- **' + repere(f) + '** · ' + (ech(f.texte_original) || '∅') + ' → ' + (ech(f.texte_candidat) || '∅') +
    ' · ' + (t.classe || '—') + (t.risk_flags?.length ? ' [' + t.risk_flags.join(', ') + ']' : '') +
    ' · ' + ech(t.auto_decision_reason || '')
}

const FILTRES = [
  ['a-verifier', 'À vérifier'],
  ['auto-acceptees', 'Auto-acceptées'],
  ['ocr-conserve', 'OCR conservé'],
  ['toutes', 'Toutes'],
  ['references-nombres', 'Références / nombres'],
  ['structure', 'Structure'],
  ['caracteres-speciaux', 'Caractères spéciaux'],
]

/** Une intervention relève-t-elle du filtre demandé ? Sert au rapport ET à l'atelier. */
export function passeFiltre(f, filtre) {
  const t = f?.triage || {}
  const flags = t.risk_flags || []
  switch (filtre) {
    case 'a-verifier': return t.auto_decision === 'HUMAN_REVIEW' || !t.auto_decision
    case 'auto-acceptees': return t.auto_decision === 'AUTO_ACCEPT'
    case 'ocr-conserve': return t.auto_decision === 'AUTO_KEEP_OCR0'
    case 'references-nombres': return flags.some((x) => x === 'chiffre' || x === 'chiffre_modifie' || x === 'chiffre_romain' || x === 'reference')
    case 'structure': return t.classe === 'STRUCTURAL'
    case 'caracteres-speciaux': return flags.some((x) => x === 'diacritique' || x === 'abreviatif' || x === 'ligature' || x === 'glyphe_ancien_introduit' || x === 'caractere_hors_jeu')
    case 'toutes': default: return true
  }
}

/** Compte les pages et lignes réellement océrisées (le dénominateur honnête du rapport). */
export function volumeProjet(projet) {
  let pages = 0, lignes = 0
  for (const pg of Object.values(projet?.pages || {})) {
    if (!Array.isArray(pg?.lignes)) continue
    pages++; lignes += pg.lignes.length
  }
  return { pages, lignes }
}

/**
 * Rapport Markdown. `findings` = les interventions du contrôle, chacune portant son `triage`.
 * `mode` : 'file' (défaut — seule la file humaine) ou 'audit' (tout est déplié).
 */
export function rapportTriageMarkdown(projet, findings = [], opts = {}) {
  const { nom = 'projet', date = null, mode = 'file', lienCrop = null, lignesFaiblesConfirmees = 0 } = opts
  const liste = (Array.isArray(findings) ? findings : []).filter((f) => f && f.triage)
  const m = mesurerTriage(liste.map((f) => f.triage))
  const vol = volumeProjet(projet)
  const meta = projet?.meta || {}
  const out = []

  out.push('# Contrôle OCR — file de relecture — ' + nom)
  const entete = [meta.titre, meta.auteur, meta.date_publication].filter(Boolean).join(' · ')
  if (entete) out.push('', entete)
  out.push('', 'Couche **CANDIDATE** (charte §14)' + (date ? ' — généré le ' + date : '') + '. ' +
    'L’OCR mécanique (`ocr0`) est intact et toute décision reste réversible.')
  out.push('')
  out.push('## En tête')
  out.push('')
  out.push('| | |')
  out.push('|---|---|')
  out.push('| pages océrisées | ' + vol.pages + ' |')
  out.push('| lignes | ' + vol.lignes + ' |')
  out.push('| corrections proposées | **' + m.total_candidats + '** |')
  out.push('| auto-acceptées | ' + m.auto_accept + ' |')
  out.push('| OCR mécanique conservé | ' + m.auto_keep_ocr0 + ' |')
  out.push('| **à vérifier humainement** | **' + m.human_review + '** |')
  out.push('| lignes faibles vérifiées sans modification | ' + (lignesFaiblesConfirmees || m.lignes_faibles_confirmees) + ' |')
  out.push('| cas à risque résolus automatiquement | ' + m.risques_resolus_auto + ' |')
  out.push('| cas structurels | ' + m.structurels + ' |')
  out.push('| caractères spéciaux introduits ou supprimés | ' + m.caracteres_speciaux + ' |')
  out.push('| références et nombres | ' + m.references_nombres + ' |')
  out.push('')
  out.push('Taux de relecture humaine : **' + pct(m.human_review_rate) + '** · ' +
    'résolution automatique : ' + pct(m.automation_resolution_rate) + '.')
  out.push('')
  out.push('_Filtres disponibles dans l’atelier : ' + FILTRES.map(([, l]) => l).join(' · ') + '._')
  out.push('')

  const aVerifier = liste.filter((f) => passeFiltre(f, 'a-verifier'))
    .sort((a, b) => (b.triage.review_priority || 0) - (a.triage.review_priority || 0))

  out.push('## À vérifier humainement')
  out.push('')
  if (!aVerifier.length) {
    out.push('_Rien à vérifier : l’image a tranché tous les cas._', '')
  } else {
    out.push('Du plus difficile au plus simple. ' + aVerifier.length + ' cas.')
    out.push('')
    for (const f of aVerifier) out.push(...entreeRevue(f, { lienCrop: lienCrop ? lienCrop(f) : null }))
  }

  const deplie = mode === 'audit'
  const section = (titre, items, vide) => {
    if (!items.length) return
    out.push(deplie ? '## ' + titre : '<details>')
    if (!deplie) out.push('<summary>' + titre + ' (' + items.length + ')</summary>', '')
    if (vide) out.push('_' + vide + '_', '')
    for (const f of items) out.push(entreeAudit(f))
    out.push('')
    if (!deplie) out.push('</details>', '')
  }
  section('Auto-acceptées — appliquées en couche candidate', liste.filter((f) => passeFiltre(f, 'auto-acceptees')),
    'Décidées par l’image, jamais par la confiance du modèle. Aucune n’est une validation humaine ; toutes sont annulables.')
  section('OCR mécanique conservé — proposition rejetée par l’image', liste.filter((f) => passeFiltre(f, 'ocr-conserve')),
    'Le vérificateur a donné raison à la machine : la proposition n’a pas été appliquée.')

  return out.join('\n')
}

export { FILTRES }
