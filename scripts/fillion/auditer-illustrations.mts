/**
 * AUDIT DE CHAQUE GRAVURE — un défaut à la fois, mesuré, et consigné.
 *
 *   npx tsx --env-file=.env.local scripts/fillion/auditer-illustrations.mts
 *
 * ⛔ TOUT SE MESURE À LA TAILLE D'AFFICHAGE, jamais au double : c'est là que la
 *    gravure se juge, et la charte l'a payé deux fois (§ 35.16.9).
 * ⛔ ET LA MESURE NE CONCLUT PAS. Elle dit où REGARDER. Le registre distingue ce
 *    qui est mesuré de ce qui est VU : trois mesures ont déjà accusé à tort — les
 *    coins d'un fichier rogné, la confrontation au scan, le filet d'un cadre
 *    gravé pris pour un filet de page (§ 35.16.20).
 *
 * Il n'écrit rien en base et ne remplace aucun fichier servi. Il tire au besoin
 * les dérivés dans `tmp/`, qui n'est pas versionné.
 */
import sharp from 'sharp'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  MESURE_COLONNE, estDetouree, estHabillable, regimeEtPartDeLActif,
} from '../../app/lib/bibleEdition'
import { rendreRegistre, type Defaut as DefautRegistre, type Gravure } from './registreIllustrations'
import { largeurImprimee } from './regime-gravure.mjs'

const SERVIS = 'tmp/verif-servis'
const MASTERS = 'tmp/verif-masters'
const FEUILLETS = 'tmp/jp2-png'
const SORTIE = 'work/fillion/AUDIT_ILLUSTRATIONS.json'
const REGISTRE = 'work/fillion/AUDIT_ILLUSTRATIONS.md'
/** ⛔ Les arbitrages sont tenus À LA MAIN et ne se réécrivent jamais : un relevé
 *  qui les recalculerait effacerait la décision au passage suivant. */
const DECISIONS = 'work/fillion/AUDIT_DECISIONS.json'

/** Les seuils, et d'où ils viennent. Chacun est posé sur la DISTRIBUTION relevée
 *  du corpus le 31 août 2026, non sur une idée de ce qui serait bien. */
const SEUILS = {
  /** Sous un pixel, la hachure ne se rend plus : elle se moud en gris. Médiane du corpus 1,88 px. */
  traitFin: 1.0,
  traitTresFin: 0.8,
  /** Le fichier se sert au DOUBLE de sa taille d'affichage (§ 35.16.7). */
  rapportBas: 1.75,
  rapportHaut: 2.3,
  /** Ce que la chaîne rend du master réduit à la même taille. Médiane 99 %, minimum 86. */
  renduBas: 0.85,
  /** Plus haute qu'un écran de portable : la gravure se lit en deux fois. */
  hauteurGrande: 480,
  hauteurTresGrande: 640,
  /** Le plancher relève la LARGEUR, et la hauteur suit. Facteur médian 1,35. */
  plancherFort: 2.0,
  /** Masse du pic de papier : une demi-teinte rend 2,7 à 9,2 %, un bois 10,4 à 44 (§ 35.16.20). */
  massePapier: 10,
  /** Un voile est PLAT : part de la surface sur UNE valeur d'alpha faible. Médiane 0,53 %. */
  voile: 3,
  /** Encre réellement vue à la taille d'affichage. Médiane 6,7 %. */
  encrePale: 3,
}

type Gravite = 'bloquant' | 'a_revoir' | 'signale'
type Defaut = { code: string; gravite: Gravite; detail: string; vu?: boolean }

/** ⚠️ Ce que j'ai VU à l'agrandissement, et que la mesure manque ou invente.
 *  L'œil tranche ; le relevé automatique ne fait que désigner. */
const VUES: Record<string, Defaut[]> = {
  'fillion-t07-p0064-i01': [{ code: 'decoupe_serree', gravite: 'signale', detail: 'les avirons sortent du cadre à gauche : la découpe les coupe' }],
}

/** ⚠️ Ce qui a été VU puis CORRIGÉ. On garde la trace, non le signalement : un
 *  défaut réglé qui continue de paraître au registre finit par ne plus être lu.
 *    p0055, p0059 — la légende imprimée était dans la découpe (corrigé le 31/08)
 *    p0417, p0418 — un filet de colonne longeait un bord (corrigé le 31/08)
 */

function acutance(g: Buffer, L: number, H: number) {
  let s = 0, n = 0, moy = 0, v2 = 0
  for (const v of g) moy += v
  moy /= g.length
  for (const v of g) v2 += (v - moy) ** 2
  const ecart = Math.sqrt(v2 / g.length)
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < L - 1; x++) {
    const i = y * L + x
    const gx = -g[i - L - 1] - 2 * g[i - 1] - g[i + L - 1] + g[i - L + 1] + 2 * g[i + 1] + g[i + L + 1]
    const gy = -g[i - L - 1] - 2 * g[i - L] - g[i - L + 1] + g[i + L - 1] + 2 * g[i + L] + g[i + L + 1]
    s += Math.hypot(gx, gy); n++
  }
  return ecart > 1 ? (s / n) / ecart : 0
}

/** Le plan que le LECTEUR voit : l'alpha pour un masque, le gris pour une image. */
async function plan(src: Buffer, largeur: number, masque: boolean) {
  const p = sharp(src).resize({ width: largeur, kernel: 'lanczos3' })
  const r = masque
    ? await p.clone().ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
    : await p.clone().removeAlpha().toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
  return { g: r.data as Buffer, L: r.info.width, H: r.info.height }
}

/** Le trait, mesuré en courses d'encre le long des lignes du master. */
function courseDEncre(g: Buffer, L: number, H: number, masque: boolean) {
  const hist = new Uint32Array(256); for (const v of g) hist[v]++
  const T = L * H
  let bas = 0, haut = 255, cum = 0
  for (let v = 0; v < 256; v++) { cum += hist[v]; if (cum > 0.02 * T) { bas = v; break } }
  cum = 0; for (let v = 255; v >= 0; v--) { cum += hist[v]; if (cum > 0.02 * T) { haut = v; break } }
  const seuil = (bas + haut) / 2
  const encre = (v: number) => masque ? v > seuil : v < seuil
  let somme = 0, n = 0
  for (let y = 1; y < H; y += Math.max(1, Math.floor(H / 400))) {
    let c = 0
    for (let x = 0; x < L; x++) {
      if (encre(g[y * L + x])) c++
      else if (c) { if (c < L / 3) { somme += c; n++ } c = 0 }
    }
    if (c && c < L / 3) { somme += c; n++ }
  }
  return n ? somme / n : null
}

/** Combien des quatre bords portent une règle droite. QUATRE = cadre gravé,
 *  légitime. UN ou DEUX = filet de page, à regarder. */
function filetsDeBord(g: Buffer, L: number, H: number, masque: boolean) {
  const encre = (x: number, y: number) => { const v = g[y * L + x]; return masque ? v > 110 : v < 145 }
  const cotes: string[] = []
  const bords: Array<[string, boolean, boolean]> = [['gauche', true, false], ['droite', true, true], ['haut', false, false], ['bas', false, true]]
  for (const [nom, vertical, depuisFin] of bords) {
    const n = vertical ? H : L
    for (let d = 0; d < 4; d++) {
      const k = depuisFin ? (vertical ? L : H) - 1 - d : d
      let c = 0
      for (let i = 0; i < n; i++) if (vertical ? encre(k, i) : encre(i, k)) c++
      if (c / n < 0.86) continue
      cotes.push(nom); break
    }
  }
  return cotes
}

/** Une bande d'encre ISOLÉE du dessin, basse, dans le dernier quart : une ligne
 *  de texte imprimée qu'on a emportée dans la découpe. */
function bandeEnPied(g: Buffer, L: number, H: number, masque: boolean) {
  const part = new Float64Array(H)
  for (let y = 0; y < H; y++) {
    let n = 0
    for (let x = 0; x < L; x++) { const v = g[y * L + x]; if (masque ? v > 128 : v < 128) n++ }
    part[y] = n / L
  }
  const VIDE = 0.004
  let y = H - 1
  while (y >= 0 && part[y] <= VIDE) y--
  const bas = y
  while (y >= 0 && part[y] > VIDE) y--
  const haut = y + 1
  let blanc = 0
  while (y >= 0 && part[y] <= VIDE) { blanc++; y-- }
  const hauteur = bas - haut + 1
  if (y >= 0 && blanc >= Math.max(3, 0.015 * H) && hauteur <= 0.13 * H && haut > 0.72 * H) return 100 * hauteur / H
  return null
}

async function tirer(db: SupabaseClient, seau: string, chemin: string, dst: string) {
  if (existsSync(dst)) return true
  const { data, error } = await db.storage.from(seau).download(chemin)
  if (error) return false
  writeFileSync(dst, Buffer.from(await data.arrayBuffer()))
  return true
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
mkdirSync(SERVIS, { recursive: true })
mkdirSync(MASTERS, { recursive: true })

const { data: actifs } = await db.from('bible_edition_assets')
  .select('id,asset_key,asset_kind,scope_book_code,source_page_index,source_crop_box,printed_caption,editorial_caption,alt_text,canon_id_start,metadata,regime,part_colonne')
  .order('asset_key')
const { data: fichiers } = await db.from('bible_edition_asset_files')
  .select('asset_id,variant_role,storage_bucket,storage_path,width_px,height_px,byte_size')
const parAsset: Record<string, Record<string, Record<string, unknown>>> = {}
for (const f of fichiers!) (parAsset[f.asset_id as string] ??= {})[f.variant_role as string] = f as Record<string, unknown>

const registre: Record<string, unknown>[] = []
for (const a of actifs!) {
  const cle = a.asset_key as string
  const f = parAsset[a.id as string] ?? {}
  if (!f.web) {
    registre.push({ cle, livre: a.scope_book_code, defauts: [{ code: 'sans_fichier', gravite: 'bloquant', detail: 'aucun dérivé web' }] })
    continue
  }
  const web = `${SERVIS}/${cle}.webp`
  const master = `${MASTERS}/${cle}.png`
  await tirer(db, f.web.storage_bucket as string, f.web.storage_path as string, web)
  if (f.master) await tirer(db, f.master.storage_bucket as string, f.master.storage_path as string, master)
  if (!existsSync(web)) {
    registre.push({ cle, livre: a.scope_book_code, defauts: [{ code: 'dérivé_introuvable', gravite: 'bloquant', detail: 'le seau ne rend pas le fichier servi' }] })
    continue
  }

  // ⛔ Le régime et la part se LISENT dans la base, où la chaîne les a écrits :
  //    l'audit juge ce que la page compose, il ne le recalcule pas. La largeur
  //    imprimée ne sert qu'à dire de combien le plancher agrandit la gravure.
  const { regime, part } = regimeEtPartDeLActif({ asset_key: a.asset_key as string, regime: a.regime, part_colonne: a.part_colonne })
  const li = largeurImprimee(a.source_crop_box as never, a.metadata)
  const larg = f.web.width_px as number
  const haut = f.web.height_px as number
  const afficheLarg = Math.round(part * MESURE_COLONNE)
  const afficheHaut = Math.round(afficheLarg * haut / larg)
  const masque = estDetouree(regime)

  const brut = readFileSync(web)
  const vu = await plan(brut, afficheLarg, masque)
  const hist = new Uint32Array(256); for (const v of vu.g) hist[v]++
  const T = vu.L * vu.H
  const encreVue = masque
    ? hist.slice(200).reduce((s, v) => s + v, 0)
    : hist.slice(0, 56).reduce((s, v) => s + v, 0)
  let pic = 0, picAlpha = 0
  for (let x = 3; x <= 40; x++) if (hist[x] > pic) { pic = hist[x]; picAlpha = x }

  const m: Record<string, number | null> = {
    rapportServi: larg / afficheLarg,
    encreVue: 100 * encreVue / T,
    voile: 100 * pic / T,
    voileAlpha: picAlpha,
    facteurPlancher: li && part > li ? part / li : 1,
    traitAffiche: null,
    renduTrait: null,
    massePapier: null,
  }

  if (existsSync(master)) {
    const meta = await sharp(master).metadata()
    const masqueM = masque && (meta.channels ?? 3) === 4
    const brutM = readFileSync(master)
    const ref = await plan(brutM, afficheLarg, masqueM)
    const aRef = acutance(ref.g, ref.L, ref.H)
    m.renduTrait = aRef > 0 ? acutance(vu.g, vu.L, vu.H) / aRef : null
    const pleine = masqueM
      ? await sharp(brutM).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
      : await sharp(brutM).removeAlpha().toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
    const course = courseDEncre(pleine.data as Buffer, pleine.info.width, pleine.info.height, masqueM)
    m.traitAffiche = course === null ? null : course * afficheLarg / pleine.info.width
  }

  // La masse du pic de papier se lit sur le SCAN, à sa définition.
  const boite = a.source_crop_box as Record<string, number | number[]> | null
  const n = (boite?.normalized as number[] | undefined)
    ?? (boite?.page_width_px
      ? [(boite.left as number) / (boite.page_width_px as number), (boite.top as number) / (boite.page_height_px as number),
         (boite.right as number) / (boite.page_width_px as number), (boite.bottom as number) / (boite.page_height_px as number)]
      : null)
  const feuillet = `${FEUILLETS}/f${String(a.source_page_index).padStart(3, '0')}.png`
  if (n && a.asset_kind !== 'plate' && existsSync(feuillet)) {
    const md = await sharp(feuillet).metadata()
    const box = {
      left: Math.max(0, Math.round(n[0] * md.width!)), top: Math.max(0, Math.round(n[1] * md.height!)),
      width: 0, height: 0,
    }
    box.width = Math.min(md.width! - box.left, Math.round((n[2] - n[0]) * md.width!))
    box.height = Math.min(md.height! - box.top, Math.round((n[3] - n[1]) * md.height!))
    const g = await sharp(feuillet).extract(box).removeAlpha().toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
    const h = new Uint32Array(256); for (const v of g.data) h[v]++
    let p = 120; for (let v = 120; v < 256; v++) if (h[v] > h[p]) p = v
    let masse = 0; for (let v = p - 2; v <= Math.min(255, p + 2); v++) masse += h[v]
    m.massePapier = 100 * masse / g.data.length
  }

  const defauts: Defaut[] = []
  const dit = (code: string, gravite: Gravite, detail: string) => defauts.push({ code, gravite, detail })

  if (m.traitAffiche !== null && m.traitAffiche < SEUILS.traitTresFin)
    dit('trait_sous_le_pixel', 'a_revoir', `le trait mesure ${m.traitAffiche.toFixed(2)} px à l’arrivée : la hachure ne peut plus être rendue`)
  else if (m.traitAffiche !== null && m.traitAffiche < SEUILS.traitFin)
    dit('trait_sous_le_pixel', 'signale', `le trait mesure ${m.traitAffiche.toFixed(2)} px à l’arrivée`)
  if (m.rapportServi! < SEUILS.rapportBas)
    dit('servi_trop_petit', 'a_revoir', `rapport ${m.rapportServi!.toFixed(2)} au lieu de 2 : ${larg} px servis pour ${afficheLarg} affichés`)
  if (m.rapportServi! > SEUILS.rapportHaut)
    dit('servi_trop_grand', 'signale', `rapport ${m.rapportServi!.toFixed(2)} : le navigateur réduit une seconde fois`)
  if (m.renduTrait !== null && m.renduTrait < SEUILS.renduBas)
    dit('trait_perdu', 'a_revoir', `la chaîne ne rend que ${(100 * m.renduTrait).toFixed(0)} % de ce que le master porte à cette taille`)
  if (afficheHaut > SEUILS.hauteurTresGrande)
    dit('trop_haute', 'a_revoir', `${afficheLarg}×${afficheHaut} px : plus haute qu’un écran de portable`)
  else if (afficheHaut > SEUILS.hauteurGrande)
    dit('trop_haute', 'signale', `${afficheLarg}×${afficheHaut} px`)
  if ((m.facteurPlancher ?? 1) > SEUILS.plancherFort)
    dit('agrandie_par_le_plancher', 'signale', `montrée ${m.facteurPlancher!.toFixed(2)} fois plus large que Fillion ne l’imprime : ${(100 * li!).toFixed(0)} % de sa page contre ${Math.round(100 * part)} % de la colonne`)
  if (masque && m.massePapier !== null && m.massePapier < SEUILS.massePapier)
    dit('demi_teinte_detouree', 'bloquant', `masse du pic de papier ${m.massePapier.toFixed(1)} % : c’est une demi-teinte, et le détourage écrase ses tons`)
  if (m.voile! > SEUILS.voile)
    dit('voile', 'signale', `${m.voile!.toFixed(1)} % de la surface tient sur l’alpha ${m.voileAlpha} : un fond plat subsiste`)
  if (m.encreVue! < SEUILS.encrePale)
    dit('trop_pale', 'signale', `${m.encreVue!.toFixed(1)} % d’encre vue à la taille d’affichage`)

  if (a.asset_kind !== 'plate') {
    const cotes = filetsDeBord(vu.g, vu.L, vu.H, masque)
    if (cotes.length && cotes.length < 4)
      dit('filet_de_bord', 'signale', `une règle droite longe ${cotes.length === 1 ? 'le bord' : 'les bords'} ${cotes.join(' et ')} : filet de page, ou cadre gravé incomplet — à regarder`)
    const bande = bandeEnPied(vu.g, vu.L, vu.H, masque)
    if (bande !== null)
      dit('bande_en_pied', 'signale', `une bande d’encre isolée, ${bande.toFixed(1)} % de la hauteur, ferme la découpe : légende imprimée, ou filet`)
  }

  // ⛔ UNE PLANCHE TOURNÉE EST MONTRÉE 1,6 FOIS PLUS PETITE QU'UNE PLANCHE DEBOUT.
  //    Fillion imprime en paysage, sur une page portrait, les planches qui ne
  //    tiendraient pas autrement ; on les redresse (§ 35.16). Mais le site borne
  //    la LARGEUR : une planche redressée présente alors sa longue dimension aux
  //    440 px de la colonne, quand une planche debout n'y présente que sa courte.
  //    Son contenu tombe à 0,157 de sa taille au lieu de 0,256, et ses légendes
  //    imprimées cessent d'être lisibles. Mesuré à l'œil sur p0577 et p0237
  //    contre p0043 : trois pixels de hauteur de caractère au lieu de cinq.
  if (a.asset_kind === 'plate' && larg > haut)
    dit('planche_tournee_trop_petite', 'a_revoir', `planche redressée, ${afficheLarg}×${afficheHaut} px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus`)
  if (!a.printed_caption && !a.editorial_caption) dit('sans_legende', 'signale', 'aucune légende, ni imprimée ni éditoriale')
  if (!a.alt_text) dit('sans_texte_alternatif', 'a_revoir', 'aucun texte alternatif')
  if (!a.canon_id_start) dit('sans_ancre', 'bloquant', 'aucune ancre canonique')
  if (!/^fillion-t\d{2}-p\d{4}-i\d{2}$/.test(cle))
    dit('cle_hors_convention', 'signale', 'la clé ne suit pas p<feuillet>-i<rang>, et elle voyage jusque dans le chemin de stockage')
  const force = (a.metadata as Record<string, unknown> | null)?.regime
  if (force) dit('regime_force', 'signale', `régime forcé à « ${force} » : ${(a.metadata as Record<string, string>).regime_motif ?? 'sans motif'}`)
  if (masque && regime === 'vignette' && !estHabillable(part) && part <= 0.56)
    dit('trop_large_pour_habiller', 'signale', `${Math.round(100 * part)} % de la colonne : elle se centre au lieu d’être habillée par le texte`)

  for (const d of VUES[cle] ?? []) defauts.push({ ...d, vu: true })

  registre.push({
    cle, livre: a.scope_book_code, feuillet: a.source_page_index, regime,
    legende: (a.editorial_caption ?? a.printed_caption ?? null),
    part: Math.round(100 * part), affichage: `${afficheLarg}×${afficheHaut}`,
    fichier: `${larg}×${haut}`, kio: Math.round((f.web.byte_size as number) / 1024),
    mesures: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v === null ? null : Number(v.toFixed(3))])),
    defauts,
  })
}

void (0 as unknown as DefautRegistre)
const rang: Record<Gravite, number> = { bloquant: 0, a_revoir: 1, signale: 2 }
for (const l of registre) (l.defauts as Defaut[]).sort((a, b) => rang[a.gravite] - rang[b.gravite])
const pire = (l: Record<string, unknown>) => {
  const d = l.defauts as Defaut[]
  return d.length ? Math.min(...d.map((x) => rang[x.gravite])) : 9
}
registre.sort((a, b) => pire(a) - pire(b)
  || (b.defauts as Defaut[]).length - (a.defauts as Defaut[]).length
  || (a.cle as string).localeCompare(b.cle as string))

mkdirSync('work/fillion', { recursive: true })
writeFileSync(SORTIE, `${JSON.stringify({ releve: new Date().toISOString().slice(0, 10), seuils: SEUILS, gravures: registre }, null, 1)}\n`)

const releve = new Date().toISOString().slice(0, 10)
writeFileSync(REGISTRE, rendreRegistre(registre as unknown as Gravure[], { decisions: DECISIONS, releve }))

const compte: Record<string, Record<Gravite, number>> = {}
for (const l of registre) for (const d of l.defauts as Defaut[]) {
  compte[d.code] ??= { bloquant: 0, a_revoir: 0, signale: 0 }
  compte[d.code][d.gravite]++
}
const poids = (v: Record<Gravite, number>) => v.bloquant * 100 + v.a_revoir * 10 + v.signale
console.log(`${registre.length} gravures · ${registre.filter((l) => (l.defauts as Defaut[]).length).length} portent au moins un défaut\n`)
console.log('défaut'.padEnd(28), 'bloquant', 'à revoir', 'signalé')
for (const [k, v] of Object.entries(compte).sort((a, b) => poids(b[1]) - poids(a[1])))
  console.log(k.padEnd(28), String(v.bloquant).padStart(8), String(v.a_revoir).padStart(9), String(v.signale).padStart(8))
console.log(`
→ ${SORTIE}
→ ${REGISTRE}`)
