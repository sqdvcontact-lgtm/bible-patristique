/**
 * UN TEXTE EN LANGUE ORIGINALE EST UNE ÉDITION À PART ENTIÈRE : PORTE-T-IL SON IDENTITÉ ?
 *
 * Demande de l'auteur, 16 septembre 2026 : « Les textes latins doivent contenir toutes les
 * informations éditoriales nécessaires ; ce sont des œuvres à part entière. Il faut
 * contrôler ça. »
 *
 * Pour chaque texte en langue originale (sans traducteur, dans la langue demandée), le
 * contrôle rejoue les fonctions MÊMES du site (`versionTextuelleDepuisLigne`,
 * `identiteEdition`, `intituleEdition`, `formulerProvenance`, `mentionEditionEnRegard`,
 * `libelleVersionComplet`, `identiteCitee`, `citationPatristique`) et imprime ce que le
 * lecteur voit : la page de titre, le menu des éditions, la citation copiée et la page de
 * titre du document extrait. Puis il juge chaque rubrique d'après la charte :
 *
 *  - INTITULÉ : le titre propre de l'édition (§ 5.3, § 38.25.1), non une étiquette de
 *    travail (« … — texte latin (Zycha) ») ;
 *  - ADRESSE : `edition_label` sous sa forme normative « Ville, éditeur, année » (§ 19.2,
 *    § 47.7), l'éditeur sous son nom d'autorité (§ 16.6), l'année d'accord avec
 *    `annee_edition` ;
 *  - TEXTE ÉTABLI PAR et COLLECTION : ce que la fiche doit dire d'une édition savante
 *    (§ 38.25.1). ⚠️ Aucun champ ne les porte : l'écran ne les lit que dans
 *    `edition_label`, que le § 19.2 leur interdit. Le contrôle dit donc aussi ce que les
 *    métadonnées d'atelier en savent, et que la page ne lit pas ;
 *  - SOURCE : l'adresse de la source consultée (§ 5.3) ;
 *  - INFORMATIONS COMPLÉMENTAIRES : la clé d'un apparat à sigles (§ 5.6). Le contrôle
 *    relève les sigles que l'apparat emploie et ceux que la rubrique ne déclare pas ;
 *  - PUBLICATION : un texte non publié ne se voit pas (§ 52).
 *
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/controle-editions-originales.mts
 *   … --langue=Grec        un autre corpus que le latin
 *   … --reseau             interroge aussi chaque adresse de source
 *   … --sortie=chemin.md   écrit le rapport dans un fichier
 *
 * ⛔ Il LIT, il ne corrige rien. Les données appartiennent à la chaîne éditoriale, et un
 * intitulé, un responsable ou une liste de sigles se lisent sur le fac-similé, jamais
 * dans ce rapport. ⚠️ Deux jugements y sont des HEURISTIQUES et le disent : l'étiquette
 * de travail (des mots d'atelier dans un titre) et l'apparat à sigles (des leçons
 * critiques dans les notes).
 */
import { writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

import { adresseEdition } from '@/app/lib/adresseEdition'
import { citationPatristique } from '@/app/lib/citation'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import {
  construireIndexEditeurs,
  normaliserNomEditeur,
  resoudreNomEditeur,
  type IndexEditeurs,
} from '@/app/lib/editeursNormalisation'
import { identiteCitee } from '@/app/lib/identiteCitee'
import { formulerProvenance, mentionEditionEnRegard } from '@/app/oeuvre/[id]/PageTitre'
import type { VersionTextuelle } from '@/app/oeuvre/[id]/oeuvreTypes'
import {
  identiteEdition,
  intituleEdition,
  libelleVersionComplet,
  versionTextuelleDepuisLigne,
  type LigneVersionTextuelle,
} from '@/app/oeuvre/[id]/versionTextuelle'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
const sb = createClient(url, cle, { auth: { persistSession: false } })

const argument = (nom: string) => process.argv.find(a => a.startsWith(`--${nom}=`))?.split('=').slice(1).join('=')
const LANGUE = argument('langue') ?? 'Latin'
const RESEAU = process.argv.includes('--reseau')
const SORTIE = argument('sortie')

// ── Ce que la base porte ─────────────────────────────────────────────────────

type LigneTexte = LigneVersionTextuelle & {
  id_oeuvre: string
  source_url: string | null
  nb_signes: number
  motif_non_publication: string | null
  informations_complementaires: string | null
  // Les seules clés d'atelier qui décrivent l'ÉDITION. ⚠️ `metadata` entier pèse jusqu'à
  // 72 000 signes par texte : on n'en tire que ces chemins.
  m_editor: unknown
  m_series: unknown
  m_volume: unknown
  m_edition: unknown
  m_critical_edition: unknown
  m_textual_edition: unknown
  m_pl_reference: unknown
  m_edition_volumes: unknown
}

type LigneOeuvre = {
  id_oeuvre: string
  titre: string | null
  sous_titre: string | null
  titre_original: string | null
  trad_auteur: string | null
  editeur: string | null
  ville: string | null
  date_publication: string | null
  collection: string | null
  auteurs: { nom: string | null } | null
}

async function toutLire<T>(requete: (debut: number, fin: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const lignes: T[] = []
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await requete(debut, debut + 999)
    if (error) throw error
    lignes.push(...(data ?? []))
    if (!data || data.length < 1000) return lignes
  }
}

const { data: textesLus, error: e1 } = await sb
  .from('oeuvre_textes')
  .select([
    'id_texte, id_oeuvre, titre_version, langue, traducteur, edition_label, annee_edition, source_url',
    'catalogue_notice_id_ligne, is_default, is_public, statut, nb_signes, motif_non_publication, informations_complementaires',
    'm_editor:metadata->editor, m_series:metadata->series, m_volume:metadata->volume, m_edition:metadata->edition',
    'm_critical_edition:metadata->critical_edition, m_textual_edition:metadata->textual_edition',
    'm_pl_reference:metadata->pl_reference, m_edition_volumes:metadata->edition_volumes',
  ].join(', '))
  .eq('langue', LANGUE)
  .order('id_oeuvre')
if (e1) throw e1
// ⛔ Une traduction ANCIENNE dans cette langue n'est pas un original (charte § 12.1) : le
// texte original n'a pas de traducteur.
const textes = ((textesLus ?? []) as unknown as LigneTexte[]).filter(t => !(t.traducteur ?? '').trim())

const idsOeuvres = [...new Set(textes.map(t => t.id_oeuvre))]
const [{ data: oeuvresLues, error: e2 }, { data: editeurs, error: e3 }, { data: villes, error: e4 }] = await Promise.all([
  sb.from('oeuvres')
    .select('id_oeuvre, titre, sous_titre, titre_original, trad_auteur, editeur, ville, date_publication, collection, auteurs!oeuvres_id_auteur_fkey(nom)')
    .in('id_oeuvre', idsOeuvres),
  sb.from('editeurs').select('nom_complet, variantes, ville'),
  sb.from('oeuvres').select('ville'),
])
if (e2 || e3 || e4) throw e2 ?? e3 ?? e4
const oeuvres = new Map(((oeuvresLues ?? []) as unknown as LigneOeuvre[]).map(o => [o.id_oeuvre, o]))
// L'index de la page : les maisons répertoriées, et les villes des œuvres (`editeursServeur.ts`).
const index: IndexEditeurs = construireIndexEditeurs(
  (editeurs ?? []) as { nom_complet: string; variantes: string[] | null; ville: string | null }[],
  ((villes ?? []) as { ville: string | null }[]).map(v => v.ville),
)
const nomsDAutorite = new Set(((editeurs ?? []) as { nom_complet: string }[]).map(e => e.nom_complet.trim()))

// ── Les jugements ────────────────────────────────────────────────────────────

type Verdict = 'ok' | 'manque' | 'non conforme' | 'à vérifier' | 'sans objet'
type Rubrique = { verdict: Verdict; ecran: string; detail: string[] }

const chaine = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : typeof v === 'number' ? String(v) : null)
const objet = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null)

/** Des mots d'ATELIER dans un titre : la langue du texte, une édition, une parenthèse datée. */
const ETIQUETTE_RE = /\btexte\s+(?:latin|grec|original)\b|\blatin\s+imprimé\b|\bédition\s+de\b|\([^)]*\b1[0-9]{3}\b[^)]*\)/iu

function jugerIntitule(t: LigneTexte, v: VersionTextuelle, o: LigneOeuvre): Rubrique {
  const brut = (t.titre_version ?? '').trim()
  const ecran = intituleEdition(v, o.titre) ?? '(rien)'
  if (!brut) return { verdict: 'manque', ecran, detail: ['`titre_version` est vide.'] }
  if (intituleEdition(v, o.titre) === null) {
    return { verdict: 'manque', ecran, detail: [`« ${brut} » n'est qu'une étiquette de colonne, ou redit le titre de l'œuvre : la fiche ne montre aucun intitulé.`] }
  }
  if (ETIQUETTE_RE.test(brut)) {
    return { verdict: 'non conforme', ecran, detail: [`« ${brut} » est une étiquette de travail, non le titre imprimé de l'édition. Elle paraît telle quelle dans la fiche et dans le menu des éditions.`] }
  }
  return { verdict: 'ok', ecran, detail: [] }
}

/** Les éditeurs d'une adresse, séparés comme la base les sépare. */
const decouperEditeurs = (s: string) => s.split(/\s*(?:;|\/|–|—|\bet\b|&)\s*/u).map(p => p.trim()).filter(Boolean)
const RESPONSABLE_RE = /\((?:éd|ed|dir|hrsg)\.?\)/iu
const ANNEE_SEULE_RE = /^[0-9]{4}(?: *[–-] *[0-9]{4})?$/u

function jugerAdresse(t: LigneTexte, v: VersionTextuelle): Rubrique {
  const brut = (t.edition_label ?? '').trim()
  const provenance = formulerProvenance(v.editeurEdition, v.villeEdition, formaterDateHistorique(v.dateEdition))
  const ecran = provenance || '(rien)'
  if (!brut) return { verdict: 'manque', ecran, detail: ['`edition_label` est vide : ni page de titre, ni adresse dans la fiche.'] }
  const detail: string[] = []
  const morceaux = brut.split(/\s*,\s*/u)
  // ⛔ Ce que le § 19.2 exclut du libellé : le responsable, la collection, la tomaison, les pages.
  if (RESPONSABLE_RE.test(brut)) detail.push('Le libellé porte le responsable scientifique (« (éd.) »), que le § 19.2 en exclut.')
  if (/\b(?:CSEL|CCSL|CCL|SC|PL|PG|Patrologia|Corpus\s+Scriptorum|Sources\s+chrétiennes)\b/iu.test(brut)) detail.push('Le libellé porte la collection, que le § 19.2 en exclut.')
  if (/\b(?:t|vol|col|p|pp)\.\s*[0-9IVXLC]/iu.test(brut)) detail.push('Le libellé porte une tomaison, des colonnes ou des pages, que le § 19.2 en exclut.')
  if (!ANNEE_SEULE_RE.test(morceaux.at(-1) ?? '')) detail.push('Le libellé ne finit pas par l\'année seule.')
  if (!v.villeEdition) detail.push('La page n\'y trouve aucun lieu.')
  if (!v.editeurEdition) detail.push('La page n\'y trouve aucun éditeur.')
  if (v.villeEdition && /[–—]/u.test(v.villeEdition)) detail.push(`Les lieux sont joints par un tiret (« ${v.villeEdition} ») : le § 47.7 en fait une donnée à corriger, la base les sépare par « ; ».`)
  const annee = brut.match(/\b(1[0-9]{3}|20[0-9]{2})\b(?!.*\b(1[0-9]{3}|20[0-9]{2})\b)/u)?.[1]
  if (t.annee_edition == null) detail.push('`annee_edition` est vide.')
  else if (annee && Number(annee) !== t.annee_edition) detail.push(`L'année du libellé (${annee}) diffère d'\`annee_edition\` (${t.annee_edition}).`)
  // L'éditeur « reprend exactement `editeurs.nom_complet` » (§ 19.2) : une variante se
  // résout à l'écran, mais la donnée reste à reprendre. ⚠️ Une notice SAVANTE se lit par
  // la fin, la maison la ferme ; une adresse ordinaire place la maison après le lieu.
  const utiles = morceaux.filter(m => !ANNEE_SEULE_RE.test(m) && !RESPONSABLE_RE.test(m))
  const segmentEditeur = v.responsableEdition ? (utiles.at(-1) ?? null) : utiles.length >= 2 ? utiles.slice(1).join(', ') : null
  if (segmentEditeur && !nomsDAutorite.has(segmentEditeur)) {
    const entier = resoudreNomEditeur(segmentEditeur, index)
    if (entier) {
      detail.push(`« ${segmentEditeur} » est une variante : l'autorité est « ${entier} » (§ 16.6).`)
    } else {
      for (const nom of decouperEditeurs(segmentEditeur)) {
        if (nomsDAutorite.has(nom)) continue
        const autorite = resoudreNomEditeur(nom, index)
        detail.push(autorite
          ? `« ${nom} » est une variante : l'autorité est « ${autorite} » (§ 16.6).`
          : `« ${nom} » n'a aucune autorité dans \`editeurs\` (§ 16.6).`)
      }
    }
  }
  return { verdict: detail.length ? 'non conforme' : 'ok', ecran, detail }
}

/** Ce que l'atelier sait du responsable et de la collection, sous ses formes diverses. */
function atelier(t: LigneTexte): { responsable: string | null; collection: string | null } {
  const edition = objet(t.m_edition)
  const critique = objet(t.m_critical_edition)
  const textuelle = chaine(t.m_textual_edition)
  const serie = chaine(t.m_series) ?? chaine(edition?.series) ?? chaine(critique?.series)
  const volume = chaine(t.m_volume) ?? chaine(edition?.volume) ?? chaine(critique?.series_volume)
  const volumes = Array.isArray(t.m_edition_volumes)
    ? (t.m_edition_volumes as Record<string, unknown>[]).map(x => chaine(x.tome)).filter(Boolean).join(', ')
    : null
  return {
    responsable: chaine(t.m_editor) ?? chaine(edition?.editor) ?? chaine(critique?.editor)
      ?? (textuelle ? textuelle.split(',')[0].trim() : null),
    collection: (serie ? [serie, volume].filter(Boolean).join(', ') : null)
      ?? chaine(t.m_pl_reference)
      ?? (typeof t.m_edition === 'string' ? t.m_edition : null)
      ?? (textuelle && textuelle.includes(',') ? textuelle.split(',').slice(1).join(',').trim() : null)
      ?? (volumes ? `tomes ${volumes}` : null),
  }
}

function jugerChampSavant(ecran: string | null, connu: string | null, nom: string): Rubrique {
  if (ecran) return { verdict: 'ok', ecran, detail: connu && connu !== ecran ? [`L'atelier le nomme « ${connu} ».`] : [] }
  if (connu) return { verdict: 'manque', ecran: '(rien)', detail: [`Connu de l'atelier (« ${connu} ») mais absent de l'écran : aucun champ ne porte ${nom}.`] }
  return { verdict: 'à vérifier', ecran: '(rien)', detail: [`Ni l'écran ni l'atelier ne le connaissent : à établir sur le fac-similé, ou à déclarer sans objet.`] }
}

async function jugerSource(t: LigneTexte): Promise<Rubrique> {
  const adresse = (t.source_url ?? '').trim()
  if (!adresse) return { verdict: 'manque', ecran: '(rien)', detail: ['`source_url` est vide : la fiche n\'offre pas de source à consulter.'] }
  const detail: string[] = []
  if (/catalogue\.bnf\.fr|worldcat|sudoc/iu.test(adresse)) detail.push('L\'adresse mène à une notice de catalogue, non à la source consultée.')
  if (/raw\.githubusercontent\.com|\.xml$/iu.test(adresse)) detail.push('L\'adresse mène à un fichier de données brut, illisible pour un lecteur.')
  if (RESEAU) {
    try {
      const reponse = await fetch(adresse, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(20000) })
      if (!reponse.ok) detail.push(`La source répond ${reponse.status}.`)
      await reponse.body?.cancel()
    } catch (erreur) {
      detail.push(`La source ne répond pas (${(erreur as Error).name}).`)
    }
  }
  return { verdict: detail.length ? 'à vérifier' : 'ok', ecran: adresse, detail }
}

/** Une LEÇON CRITIQUE : un lemme fermé, une omission, un témoin en tête de note (« P, … »,
 *  « P ajoute … »), ou une note qui finit sur ses sigles. */
const LECON_RE = /\S\]\s|\b(?:om|add|del|corr|transp)\.\s|^[A-Z]{1,3}[¹²³]?,\s|^[A-Z]{1,3}[¹²³]?\s(?:ajoute|omet|porte|donne|lit|répète)\b|[a-zà-ÿ*]\s[A-Z]{1,9}[¹²³]?\s*[.;]?\s*$/u
/** Un groupe de sigles : « P », « M¹ », « FO¹VW » ; « BCFHOPbm » y ajoute des éditions en bas de casse. */
const GROUPE_SIGLES_RE = /^(?:[A-Z][¹²³]?)+$|^(?:[A-Z][¹²³]?){2,}[a-z]{1,3}$/u
const ROMAIN_RE = /^M{0,4}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/u
/** Les mots qui annoncent une NUMÉROTATION : un chiffre romain qui les suit n'est pas un sigle
 *  (« chapitre LXXII », « Éclaircissements, X », « tom. I »). */
const NUMEROTATION = new Set([
  'chapitre', 'chapitres', 'chap', 'ch', 'cap', 'c', 'tome', 'tomes', 'tom', 't', 'livre', 'livres', 'liv', 'lib', 'l',
  'vol', 'p', 'pag', 'col', 'psaume', 'ps', 'éclaircissement', 'éclaircissements', 'préface', 'note', 'n', 'art',
  'canon', 'can', 'lettre', 'ép', 'epist', 'hom', 'homélie', 'sermon', 'serm', 'q', 'quaest', 'question',
])

/**
 * Les sigles d'une leçon, un par TÉMOIN (« FO¹VW » en compte quatre).
 *
 * ⚠️ Trois pièges écartés, relevés sur l'apparat de Bondurand, où le premier contrôle
 * voyait I, X, L et V pour des sigles non déclarés :
 *  - l'ITALIQUE porte la leçon, jamais un sigle : « P, *XLVII* » cite un chiffre du témoin ;
 *  - un chiffre romain annoncé par un mot de numérotation (« chapitres X et LXII ») ;
 *  - la suite d'une liste de chiffres romains (« I, II, III »), un chiffre qui répète une
 *    lettre (« XXVII », « CIII » : un témoin ne se cite pas deux fois) ou un ordinal (« XIe »).
 * ⛔ Un groupe qui FORME un chiffre romain n'est pas écarté pour autant : « MV » ou « CM »
 * réunissent deux témoins dans l'apparat de Knöll.
 */
function siglesDeLaLecon(texte: string): string[] {
  let t = texte.replace(/\*[^*\n]*\*/gu, ' lecture ')
  const crochet = t.indexOf(']')
  if (crochet >= 0) t = t.slice(crochet + 1)
  const sigles: string[] = []
  for (const segment of t.split(/;|\s[-–—]\s/u)) {
    const jetons = segment.split(/[\s,:.()]+/u).filter(Boolean)
    let numerotation = false
    let romainPrecedent = false
    jetons.forEach((jeton, rang) => {
      if (NUMEROTATION.has((jetons[rang - 1] ?? '').toLocaleLowerCase('fr-FR'))) numerotation = true
      if (!GROUPE_SIGLES_RE.test(jeton)) { romainPrecedent = false; return }
      const majuscules = jeton.replace(/[a-z]+$/u, '')
      const romain = !/[¹²³]/u.test(majuscules) && ROMAIN_RE.test(majuscules)
      // Un témoin ne se cite pas deux fois dans un même groupe : « XXVII » ou « CIII » sont des
      // nombres. Et un ordinal (« XXVIIIe », « XIe ») aussi.
      const repete = new Set(majuscules).size < majuscules.length
      const ordinal = /^(?:e|er|re|es)$/u.test(jeton.slice(majuscules.length))
      if (romain && (numerotation || romainPrecedent || repete || ordinal)) { romainPrecedent = true; return }
      romainPrecedent = false
      sigles.push(...(majuscules.match(/[A-Z][¹²³]?/gu) ?? []))
    })
  }
  return sigles
}

/** Un sigle se DÉCLARE en tête de ligne ou après un tiret : « P — Paris, … », « — B : … ».
 *  ⚠️ La main (« M¹ ») n'a pas à l'être : c'est le témoin qu'on déclare. */
const estDeclare = (sigle: string, declare: string) =>
  new RegExp(`(?:^|\\n|[—–:]\\s)\\s*${sigle}\\s*[—–:]`, 'u').test(declare)

async function jugerInformations(t: LigneTexte): Promise<Rubrique> {
  const notes = await toutLire<{ text: string | null }>((debut, fin) => sb
    .from('texte_note_blocs').select('text').eq('id_texte', t.id_texte).eq('rank', 1).range(debut, fin))
  const lecons = notes.map(n => n.text ?? '').filter(texte => LECON_RE.test(texte))
  const declare = (t.informations_complementaires ?? '').trim()
  const part = notes.length ? lecons.length / notes.length : 0
  const apparat = lecons.length >= 20 && part >= 0.2
  if (!apparat) {
    return declare
      ? { verdict: 'ok', ecran: `${declare.length} signes`, detail: [] }
      : { verdict: 'sans objet', ecran: '(rien)', detail: notes.length ? [`${notes.length} notes, aucun apparat à sigles décelé.`] : [] }
  }
  const compte = new Map<string, number>()
  for (const lecon of lecons) {
    for (const sigle of siglesDeLaLecon(lecon)) {
      const temoin = sigle.replace(/[¹²³]/gu, '')
      compte.set(temoin, (compte.get(temoin) ?? 0) + 1)
    }
  }
  const nonDeclares = [...compte.entries()]
    .filter(([sigle, n]) => n >= 5 && !estDeclare(sigle, declare))
    .sort((a, b) => b[1] - a[1])
  const resume = `${lecons.length} leçons critiques sur ${notes.length} notes`
  if (!declare) {
    return { verdict: 'manque', ecran: '(rien)', detail: [`${resume}, et aucune clé : ${nonDeclares.map(([s, n]) => `${s} (${n})`).join(', ')}.`] }
  }
  return nonDeclares.length
    ? { verdict: 'à vérifier', ecran: `${declare.length} signes`, detail: [`${resume} ; sigles employés sans déclaration : ${nonDeclares.map(([s, n]) => `${s} (${n})`).join(', ')}.`] }
    : { verdict: 'ok', ecran: `${declare.length} signes`, detail: [resume] }
}

function jugerPublication(t: LigneTexte): Rubrique {
  const ecran = `${t.statut}, ${t.is_public ? 'publié' : 'non publié'}, ${t.nb_signes.toLocaleString('fr-FR')} signes`
  if (t.is_public) return { verdict: 'ok', ecran, detail: [] }
  return { verdict: 'à vérifier', ecran, detail: [t.nb_signes === 0 ? 'Texte vide : une réservation, invisible au lecteur.' : `Invisible au lecteur${t.motif_non_publication ? ` (motif : ${t.motif_non_publication})` : ''}.`] }
}

// ── Le rapport ───────────────────────────────────────────────────────────────

const RUBRIQUES = ['Intitulé', 'Adresse', 'Texte établi par', 'Collection', 'Source', 'Informations complémentaires', 'Publication'] as const
const COURT: Record<Verdict, string> = { ok: 'ok', manque: 'MANQUE', 'non conforme': 'NON CONF.', 'à vérifier': 'à vérif.', 'sans objet': '—' }

const lignes: string[] = []
const matrice: string[][] = []
lignes.push(`# Contrôle des éditions originales : ${LANGUE.toLocaleLowerCase('fr-FR')}`, '')
lignes.push(`${textes.length} textes sans traducteur, langue « ${LANGUE} ». Relevé du ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC.`, '')

for (const t of textes) {
  const o = oeuvres.get(t.id_oeuvre)
  if (!o) throw new Error(`Œuvre introuvable : ${t.id_oeuvre}`)
  const v = versionTextuelleDepuisLigne(t, index)
  const identite = identiteEdition(o, v)
  const savoir = atelier(t)
  const juges: Record<(typeof RUBRIQUES)[number], Rubrique> = {
    'Intitulé': jugerIntitule(t, v, o),
    'Adresse': jugerAdresse(t, v),
    'Texte établi par': jugerChampSavant(identite.responsable, savoir.responsable, 'le responsable scientifique'),
    'Collection': jugerChampSavant(identite.collection, savoir.collection, 'la collection'),
    'Source': await jugerSource(t),
    'Informations complémentaires': await jugerInformations(t),
    'Publication': jugerPublication(t),
  }
  const auteur = o.auteurs?.nom ?? ''
  // La citation, telle que les boutons de copie la composent (`identiteCitee`).
  const citation = citationPatristique('passage cité', {
    auteur, titre: o.titre, sousTitre: o.sous_titre, ...identiteCitee(o, t, index),
  }).texte
  // La page de titre du document extrait, telle que la route la compose.
  const extraction = [
    identite.responsable ? `Texte établi par ${identite.responsable}` : null,
    adresseEdition({
      ville: identite.ville,
      editeur: normaliserNomEditeur(identite.editeur, index) || null,
      annee: identite.datePublication,
    }),
    identite.collection,
  ].filter(Boolean).join(' · ')

  lignes.push(`## ${auteur}, ${o.titre} : \`${t.id_texte}\``, '')
  lignes.push('Ce que le lecteur voit :', '')
  lignes.push(`- page de titre, texte seul : ${formulerProvenance(identite.editeur, identite.ville, formaterDateHistorique(identite.datePublication)) || '(aucune adresse)'}`)
  lignes.push(`- page de titre, en regard du français : ${mentionEditionEnRegard(v)}`)
  lignes.push(`- menu des éditions : ${libelleVersionComplet(v)}`)
  lignes.push(`- citation copiée : ${citation}`)
  lignes.push(`- page de titre du document extrait : ${extraction || '(rien)'}`, '')
  for (const nom of RUBRIQUES) {
    const r = juges[nom]
    lignes.push(`- **${nom}** : ${r.verdict}. Écran : ${r.ecran}.${r.detail.length ? ' ' + r.detail.join(' ') : ''}`)
  }
  lignes.push('')
  matrice.push([t.id_texte, ...RUBRIQUES.map(nom => COURT[juges[nom].verdict])])
}

lignes.push('## Synthèse', '')
lignes.push(`| Texte | ${RUBRIQUES.join(' | ')} |`, `|${' --- |'.repeat(RUBRIQUES.length + 1)}`)
for (const rang of matrice) lignes.push(`| ${rang.join(' | ')} |`)

const rapport = lignes.join('\n') + '\n'
if (SORTIE) writeFileSync(SORTIE, rapport, 'utf8')
process.stdout.write(rapport)
