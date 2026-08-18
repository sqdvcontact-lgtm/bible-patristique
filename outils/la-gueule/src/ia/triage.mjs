// TRIAGE AUTOMATIQUE des corrections OCR.
//
// Problème (retour utilisateur 2026-08-11) : sur 35 pages, le contrôle produisait ~150 corrections
// à relire une par une. Relire 150 propositions coûte plus cher que de relire le livre.
//
// Principe directeur : un « cas à risque » ne part PAS à l'humain — il part à une VÉRIFICATION
// VISUELLE renforcée, et l'humain n'est appelé que si l'image reste ambiguë. Un chiffre, une
// référence biblique, une ponctuation, un diacritique : ce sont des raisons de REGARDER MIEUX, pas
// des raisons de déranger quelqu'un.
//
// Ce module est PUR : il ne lit ni image ni réseau. Il classe, il décide, il ordonne. Les verdicts
// visuels lui sont donnés par `verificateur.mjs`. Testé dans test/triage.test.mjs.

import { distanceEdition } from './validation.mjs'

/** Classes de pré-classement déterministe (§4 de la consigne). */
export const CLASSES = ['LOW_RISK', 'HIGH_RISK_AUTO_CHECK', 'STRUCTURAL']

/**
 * Décisions. Les trois premières sont AUTOMATIQUES et ne valent JAMAIS validation humaine : une
 * correction auto-acceptée alimente la couche candidate, elle n'ouvre pas le ground-truth (§11.7).
 * Les deux dernières sont posées par l'humain depuis l'atelier.
 */
export const DECISIONS = ['AUTO_ACCEPT', 'AUTO_KEEP_OCR0', 'HUMAN_REVIEW', 'HUMAN_ACCEPT', 'HUMAN_REJECT']

/** Verdicts que peut rendre le vérificateur visuel. */
export const VERDICTS = ['CANDIDATE', 'OCR0', 'OTHER', 'UNREADABLE']

// ── Normalisation TECHNIQUE ───────────────────────────────────────────────────────────────────
// Seule normalisation autorisée pour comparer la lecture rendue par le vérificateur au candidat
// (§6A). Elle ne touche QUE ce qui ne porte aucun sens éditorial : espaces, variantes d'apostrophe
// et de guillemet. Elle ne modernise ni la casse, ni les accents, ni l'orthographe, ni la
// ponctuation — sans quoi le triage deviendrait la modernisation silencieuse que §7D interdit.
const APOSTROPHES = /[’ʼʹ′`´]/g
const GUILLEMETS = /[“”„″]/g
const ESPACES = /[\s    ]+/g

export function normaliserTechnique(s) {
  return String(s ?? '').replace(APOSTROPHES, "'").replace(GUILLEMETS, '"').replace(ESPACES, ' ').trim()
}

/** Deux chaînes sont-elles la MÊME lecture, aux seules variantes techniques près ? */
export const memeLecture = (a, b) => normaliserTechnique(a) === normaliserTechnique(b)

// ── Détection des éléments sensibles ──────────────────────────────────────────────────────────

const RE_CHIFFRE = /\d/
// Un chiffre romain n'est reconnu qu'à partir de deux caractères, ou suivi d'un point : « I » seul
// est trop souvent un « l » mal lu ou le pronom latin, et un faux positif ici coûte une passe de
// vérification inutile sur chaque ligne du livre.
const RE_ROMAIN = /\b(?:[IVXLCDM]{2,}|[IVXLCDM]\.)/
// Renvoi scripturaire ou patristique tel qu'imprimé : « Deut.22. », « Psal. 81. », « Luc. 6. »,
// « Esa.40. », « Ps. 61. 11. ». Abréviation capitalisée, point, puis un nombre.
const RE_REFERENCE = /\b\p{Lu}\p{L}{0,9}\.\s*[0-9IVXLC]/u
const RE_PONCTUATION = /[.,;:!?«»""''()[\]{}—–-]/g
// Signes abréviatifs et lettres à tilde de l'imprimé ancien : « ẽ » vaut « en », « õ » vaut « on ».
// Les ajouter ou les retirer change la LECTURE du mot, pas seulement son dessin.
const ABREVIATIFS = /[̃ãẽĩõũñⱥ⁊]/
// Caractères typographiques anciens que la couche « développée » ne doit pas réintroduire (§7C).
const GLYPHES_ANCIENS = /[ſﬁﬂﬀﬃﬄﬅﬆ]/
const LIGATURES_LETTRES = /[æœÆŒ]/
// Jeu de caractères attendu d'un imprimé français ancien océrisé. Tout ce qui en sort est suspect :
// un candidat qui introduit un caractère inconnu de ce jeu n'est presque jamais une lecture.
const JEU_ATTENDU = /^[\p{L}\p{M}\p{N}\s.,;:!?'"«»“”‘’()[\]{}\-—–…&*†‡§¶/\\%°ª+=_|@#~¬⁊]*$/u

const decomposer = (s) => String(s ?? '').normalize('NFD')
const marquesCombinantes = (s) => (decomposer(s).match(/\p{M}/gu) || []).length
const jetons = (s) => String(s ?? '').split(/\s+/).filter(Boolean)
const ponctuationSeule = (s) => (String(s ?? '').match(RE_PONCTUATION) || []).join('')
const sansCasse = (s) => String(s ?? '').toLowerCase()
const chiffresDe = (s) => (String(s ?? '').match(/\d+/g) || []).join(' ')

/** Un jeton a-t-il été fortement transformé (au moins un mot méconnaissable) ? */
function motFortementTransforme(avant, apres) {
  const a = jetons(avant), b = jetons(apres)
  if (a.length !== b.length) return true            // découpage changé : traité aussi par `segmentation`
  for (let k = 0; k < a.length; k++) {
    if (a[k] === b[k]) continue
    const d = distanceEdition(a[k], b[k])
    if (d >= 3 || d / Math.max(1, a[k].length) > 0.5) return true
  }
  return false
}

/** Nombre de jetons réellement modifiés entre deux états d'une même ligne. */
export function jetonsModifies(avant, apres) {
  const a = jetons(avant), b = jetons(apres)
  if (a.length !== b.length) return Math.max(a.length, b.length)
  let n = 0
  for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) n++
  return n
}

// Types d'intervention qui touchent la STRUCTURE du texte, jamais seulement ses lettres.
const TYPES_STRUCTURELS = new Set(['reclassement_role', 'scission_marge', 'ligne_omise', 'ancrage_note', 'controle_page', 'structure'])
// Rôles dont la lecture est particulièrement piégeuse (chiffres isolés, mots-repères) et qui
// n'appartiennent pas au corps : une erreur y est indétectable au sens.
const ROLES_SENSIBLES = new Set(['numero_page', 'signature', 'reclame', 'titre_courant', 'note_marginale', 'note_bas_page'])

/**
 * Pré-classement DÉTERMINISTE d'une intervention (§4). Renvoie sa classe et la liste des drapeaux
 * qui l'ont motivée. Les drapeaux ne condamnent rien : ils disent où regarder de plus près.
 *
 * `contexte` peut porter `role` (rôle courant ou proposé de la ligne) et `zone` (mesure de
 * `zones.mjs`) — quand ils sont connus, ils enrichissent le classement sans être nécessaires.
 */
export function classerIntervention(iv, contexte = {}) {
  const flags = []
  const type = iv?.type || 'correction_ocr'
  const avant = String(iv?.texte_original ?? '')
  const apres = String(iv?.texte_candidat ?? '')

  if (TYPES_STRUCTURELS.has(type)) {
    flags.push('structure:' + type)
    return { classe: 'STRUCTURAL', flags, distance: distanceEdition(avant, apres) }
  }

  const d = distanceEdition(avant, apres)
  const role = contexte.role || iv?.role_avant || null
  const zone = contexte.zone || null

  // Nombres et renvois : la lecture ne peut pas être contrôlée par le sens, seulement par l'œil.
  if (RE_CHIFFRE.test(avant) || RE_CHIFFRE.test(apres)) {
    flags.push('chiffre')
    if (chiffresDe(avant) !== chiffresDe(apres)) flags.push('chiffre_modifie')
  }
  if (RE_ROMAIN.test(avant) || RE_ROMAIN.test(apres)) flags.push('chiffre_romain')
  if (RE_REFERENCE.test(avant) || RE_REFERENCE.test(apres)) flags.push('reference')
  if (role && ROLES_SENSIBLES.has(role)) flags.push('role:' + role)
  if (zone && zone !== 'corps') flags.push('zone:' + zone)

  // Ponctuation, apostrophes, espaces : souvent une vraie faute d'OCR, souvent aussi une préférence
  // du modèle. Seule l'image départage — d'où la vérification, et non le renvoi à l'humain.
  if (ponctuationSeule(avant) !== ponctuationSeule(apres)) flags.push('ponctuation')
  if (String(avant).replace(/[^'’]/g, '') !== String(apres).replace(/[^'’]/g, '')) flags.push('apostrophe')
  if (jetons(avant).length !== jetons(apres).length) flags.push('segmentation')
  // Césure de fin de ligne : le trait d'union ou le « ¬ » terminal ne se supprime pas à la légère,
  // c'est l'outil qui recolle les mots coupés.
  if (/[-¬]\s*$/.test(avant) !== /[-¬]\s*$/.test(apres)) flags.push('cesure')

  // Signes qui changent la LECTURE sans changer beaucoup le dessin.
  if (marquesCombinantes(avant) !== marquesCombinantes(apres)) flags.push('diacritique')
  if (ABREVIATIFS.test(avant) !== ABREVIATIFS.test(apres)) flags.push('abreviatif')
  if (GLYPHES_ANCIENS.test(apres) && !GLYPHES_ANCIENS.test(avant)) flags.push('glyphe_ancien_introduit')
  if (LIGATURES_LETTRES.test(avant) !== LIGATURES_LETTRES.test(apres)) flags.push('ligature')

  // Casse : « ROY » vs « Roy » peut être typographique (capitales d'imprimeur) ou porteur de sens.
  if (avant !== apres && sansCasse(avant) === sansCasse(apres)) flags.push('casse')

  const nbJetons = jetonsModifies(avant, apres)
  if (nbJetons > 1) flags.push('plusieurs_jetons')
  if (motFortementTransforme(avant, apres)) flags.push('mot_transforme')
  if (d > 4) flags.push('distance_elevee')
  if (apres && !JEU_ATTENDU.test(apres)) flags.push('caractere_hors_jeu')

  return { classe: flags.length ? 'HIGH_RISK_AUTO_CHECK' : 'LOW_RISK', flags, distance: d }
}

// ── Verdicts visuels ──────────────────────────────────────────────────────────────────────────

/** Verdict normalisé, tolérant à une sortie incomplète du modèle. Jamais d'exception. */
export function normaliserVerdict(v) {
  const verdict = VERDICTS.includes(v?.verdict) ? v.verdict : 'UNREADABLE'
  const q = ['GOOD', 'MEDIUM', 'BAD'].includes(v?.crop_quality) ? v.crop_quality : 'BAD'
  const c = Number(v?.confidence)
  return {
    verdict,
    exact_reading: String(v?.exact_reading ?? ''),
    confidence: Number.isFinite(c) ? Math.max(0, Math.min(1, c)) : 0,
    visual_evidence: String(v?.visual_evidence ?? ''),
    editorial_change_detected: !!v?.editorial_change_detected,
    crop_quality: q,
    modele: v?.modele ?? null,
    fournisseur: v?.fournisseur ?? null,
    abstention: !!v?.abstention,
  }
}

/**
 * Un verdict est-il CONCLUANT pour la lecture qu'il désigne ? Trois conditions cumulées : il ne
 * s'abstient pas, l'image est exploitable, et il est franc. Un verdict `OTHER` (troisième lecture)
 * ou `UNREADABLE` n'est jamais concluant : il dit précisément qu'on ne peut pas conclure.
 */
export function verdictConcluant(v, { seuilConfiance = 0.97 } = {}) {
  if (!v || v.abstention) return false
  if (v.verdict !== 'CANDIDATE' && v.verdict !== 'OCR0') return false
  if (v.crop_quality === 'BAD') return false
  return v.confidence >= seuilConfiance
}

/**
 * La lecture exacte rendue par le vérificateur confirme-t-elle la cible qu'il a désignée ? On ne
 * croit pas le verdict sur parole : s'il dit « CANDIDATE » mais recopie autre chose que le candidat,
 * c'est en réalité une TROISIÈME lecture, et elle doit être traitée comme telle.
 */
export function lectureCoherente(v, { avant, apres }) {
  if (!v || !v.exact_reading) return true      // pas de lecture rendue : on s'en tient au verdict
  const cible = v.verdict === 'CANDIDATE' ? apres : avant
  return memeLecture(v.exact_reading, cible)
}

// ── Décision ──────────────────────────────────────────────────────────────────────────────────

const raison = (code, detail) => (detail ? code + ' — ' + detail : code)

/**
 * Décision automatique (§6, §9). `verdicts` est la liste des vérifications visuelles menées, dans
 * l'ordre. Le nombre EXIGÉ dépend de la classe :
 *   - LOW_RISK : un verdict concluant suffit ;
 *   - HIGH_RISK_AUTO_CHECK et STRUCTURAL : deux verdicts indépendants et CONCORDANTS.
 *
 * Aucune décision automatique ne s'appuie sur la seule confiance du générateur : celle-ci est
 * conservée pour l'audit (§3) mais n'entre pas dans le seuil.
 */
export function deciderTriage(iv, verdicts = [], opts = {}) {
  const { seuilConfiance = 0.97, contexte = {} } = opts
  const cls = opts.classement || classerIntervention(iv, contexte)
  const avant = String(iv?.texte_original ?? '')
  const apres = String(iv?.texte_candidat ?? '')
  const vs = (Array.isArray(verdicts) ? verdicts : []).map(normaliserVerdict)
  const exigeDeux = cls.classe !== 'LOW_RISK'

  const base = {
    classe: cls.classe,
    risk_flags: cls.flags,
    distance_edition: cls.distance,
    generator_confidence: Number(iv?.confiance_modele) || 0,
    visual_verifier_confidence: vs.length ? vs[0].confidence : null,
    verdicts: vs,
  }
  const sortie = (decision, motif, priorite) => ({
    ...base, auto_decision: decision, auto_decision_reason: motif,
    review_priority: decision === 'HUMAN_REVIEW' ? (priorite ?? prioriteRevue(iv, cls, vs)) : 0,
  })

  // §7C / §7D — un candidat qui réintroduit une graphie ancienne sur un imprimé va CONTRE la
  // politique de couche du projet (modernisation glyphique, charte §14.3). Aucune concordance
  // visuelle ne peut l'autoriser : ce serait la modernisation à l'envers, décidée en silence.
  if (cls.flags.includes('glyphe_ancien_introduit') && opts.regime !== 'manuscrit') {
    return sortie('HUMAN_REVIEW', raison('politique_couche', 'graphie ancienne réintroduite sur un imprimé (charte §14.3)'))
  }

  if (!vs.length) return sortie('HUMAN_REVIEW', raison('sans_verification', 'aucune vérification visuelle disponible'))

  // Sur une intervention STRUCTURELLE, la « lecture exacte » n'a pas d'objet : la question posée
  // n'est pas « quels caractères sont imprimés » mais « quelle est la nature de cette ligne ». On
  // n'exige donc pas que le vérificateur recopie « [note_marginale] ».
  const coherente = (v) => cls.classe === 'STRUCTURAL' || lectureCoherente(v, { avant, apres })
  const concluants = vs.filter((v) => verdictConcluant(v, { seuilConfiance }) && coherente(v))
  // Une lecture TIERCE : le vérificateur dit « CANDIDATE » mais recopie autre chose. On ne la
  // requalifie pas en accord — c'est justement le cas où l'humain doit voir.
  const tierce = vs.some((v) => !v.abstention && v.exact_reading && !coherente(v))

  const pourCandidat = concluants.filter((v) => v.verdict === 'CANDIDATE').length
  const pourOcr0 = concluants.filter((v) => v.verdict === 'OCR0').length

  if (pourCandidat && pourOcr0) {
    return sortie('HUMAN_REVIEW', raison('desaccord', 'les vérifications visuelles se contredisent'))
  }
  if (tierce) return sortie('HUMAN_REVIEW', raison('lecture_tierce', 'une lecture différente des deux propositions a été relevée'))

  const requis = exigeDeux ? 2 : 1
  if (pourCandidat >= requis) {
    return sortie('AUTO_ACCEPT', raison('image_concordante', `${pourCandidat} vérification(s) visuelle(s) pour le candidat`))
  }
  if (pourOcr0 >= requis) {
    return sortie('AUTO_KEEP_OCR0', raison('image_contraire', `${pourOcr0} vérification(s) visuelle(s) pour la lecture machine`))
  }

  // Pas assez de preuves : on dit POURQUOI, ce que l'humain lira dans la file.
  const illisible = vs.some((v) => v.verdict === 'UNREADABLE' || v.crop_quality === 'BAD')
  if (illisible) return sortie('HUMAN_REVIEW', raison('image_ambigue', 'image insuffisante pour trancher'))
  if (exigeDeux && (pourCandidat === 1 || pourOcr0 === 1)) {
    return sortie('HUMAN_REVIEW', raison('confirmation_manquante', 'cas à risque : une seule vérification concluante sur deux'))
  }
  return sortie('HUMAN_REVIEW', raison('confiance_insuffisante', 'aucune vérification n’atteint le seuil'))
}

/**
 * Difficulté d'un cas, UNIQUEMENT pour ordonner la file humaine (§11) : le plus dur en premier,
 * parce que c'est là que l'attention est la plus utile. Ce score ne déclenche jamais une
 * auto-validation.
 */
export function prioriteRevue(iv, classement = null, verdicts = []) {
  const cls = classement || classerIntervention(iv)
  const vs = (Array.isArray(verdicts) ? verdicts : []).map(normaliserVerdict)
  let p = 0
  const dit = new Set(vs.filter((v) => !v.abstention).map((v) => v.verdict))
  if (dit.has('CANDIDATE') && dit.has('OCR0')) p += 40      // désaccord franc
  if (dit.has('OTHER')) p += 30                             // une troisième lecture est apparue
  if (vs.some((v) => v.crop_quality === 'BAD')) p += 25
  if (vs.some((v) => v.verdict === 'UNREADABLE')) p += 20
  if (vs.length && Math.min(...vs.map((v) => v.confidence)) < 0.8) p += 15
  if (cls.flags.includes('chiffre_modifie') || cls.flags.includes('reference')) p += 15
  if (cls.flags.includes('segmentation')) p += 10
  if (cls.flags.includes('plusieurs_jetons')) p += 10
  if (cls.flags.includes('mot_transforme')) p += 10
  if (cls.classe === 'STRUCTURAL') p += 12
  p += Math.min(20, (cls.distance || 0) * 2)
  return p
}

/**
 * Métriques d'un lot trié (§13). `human_review_rate` est le KPI : ce que l'outil laisse encore à
 * faire. On ne le fait jamais baisser en écartant des candidats — le dénominateur est le total.
 */
export function mesurerTriage(decisions = []) {
  const m = {
    total_candidats: 0, auto_accept: 0, auto_keep_ocr0: 0, human_review: 0,
    risques_resolus_auto: 0, structurels: 0, lignes_faibles_confirmees: 0,
    caracteres_speciaux: 0, references_nombres: 0,
  }
  for (const d of (decisions || [])) {
    if (!d) continue
    if (d.regle_triage === 'ligne_faible_confirmee') { m.lignes_faibles_confirmees++; continue }
    m.total_candidats++
    if (d.auto_decision === 'AUTO_ACCEPT') m.auto_accept++
    else if (d.auto_decision === 'AUTO_KEEP_OCR0') m.auto_keep_ocr0++
    else if (d.auto_decision === 'HUMAN_REVIEW') m.human_review++
    const f = d.risk_flags || []
    if (d.classe === 'STRUCTURAL') m.structurels++
    if (d.classe !== 'LOW_RISK' && d.auto_decision !== 'HUMAN_REVIEW') m.risques_resolus_auto++
    if (f.some((x) => x === 'diacritique' || x === 'abreviatif' || x === 'ligature' || x === 'glyphe_ancien_introduit' || x === 'caractere_hors_jeu')) m.caracteres_speciaux++
    if (f.some((x) => x === 'chiffre' || x === 'chiffre_modifie' || x === 'chiffre_romain' || x === 'reference')) m.references_nombres++
  }
  const t = m.total_candidats || 1
  m.human_review_rate = Math.round((m.human_review / t) * 1000) / 1000
  m.automation_resolution_rate = Math.round(((m.auto_accept + m.auto_keep_ocr0) / t) * 1000) / 1000
  return m
}
