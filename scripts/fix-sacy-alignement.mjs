// Correction alignement Sacy (TR0001) pour décalages protestant/catholique
// Sources : https://fr.wikisource.org/wiki/Bible_Sacy/Joël (ch3 = notre ch4)
//           https://fr.wikisource.org/wiki/Bible_Sacy/Malachie (ch4 = nos v3:19-24)
//           https://fr.wikisource.org/wiki/Bible_Sacy/I_Paralipomènes (ch5 v27-41)
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  'https://oucotpxcjalwgetylfbz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y290cHhjamFsd2dldHlsZmJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMyODUyOCwiZXhwIjoyMDk2OTA0NTI4fQ.qAzdbqG1xqL3zkZ9I-pEwlk5Nek8778-Ph0-HkNxPr0'
)

// ── JOL.4.1-21 ──────────────────────────────────────────────────────────────
// Notre base utilise la numérotation LXX (4 chapitres).
// Sacy (éd. 1855, canon protestant) n'a que 3 chapitres : son ch3 = notre ch4.
const jolCh3 = [
  "CAR en ces jours-là, lorsque j'aurai fait revenir les captifs de Juda et de Jérusalem,",
  "j'assemblerai tous les peuples, et je les amènerai dans la vallée de Josaphat, où j'entrerai en jugement avec eux, touchant Israël, mon peuple et mon héritage, qu'ils ont dispersé parmi les nations, et touchant ma terre qu'ils ont divisée entre eux.",
  "Ils ont partagé mon peuple au sort, ils ont exposé les jeunes enfants dans des lieux de prostitution, et ils ont vendu les jeunes filles pour avoir du vin, et pour s'enivrer.",
  "Mais qu'y avait-il à démêler entre vous et moi, Tyr et Sidon, et vous terre des Philistins ? Est-ce que je vous ai fait quelque injure dont vous vouliez vous venger ? Mais si vous entreprenez de vous venger de moi, je ferai bientôt retomber sur votre tête le mal que vous voulez me faire.",
  "Car vous avez enlevé mon argent et mon or ; et vous avez emporté dans vos temples ce que j'avais de plus précieux et de plus beau.",
  "Vous avez vendu les enfants de Juda et de Jérusalem aux enfants des Grecs, pour les transporter bien loin de leur pays.",
  "Mais je vais les retirer du lieu où vous les avez vendus, et je ferai retomber sur votre tête le mal que vous leur avez fait.",
  "Je livrerai vos fils et vos filles entre les mains des enfants de Juda, et ils les vendront aux Sabéens, à un peuple très-éloigné ; c'est le Seigneur qui l'a dit.",
  "Publiez ceci parmi les peuples : Qu'ils se liguent entre eux par les serments les plus saints ; que leurs braves s'animent au combat : que tout ce qu'il y a d'hommes de guerre marche, et se mette en campagne.",
  "Forgez des épées du coutre de vos charrues, et des lances du fer de vos hoyaux : que le faible dise : Je suis fort.",
  "Peuples, venez tous en foule ; accourez et assemblez-vous de toutes parts en un même lieu : c'est là que le Seigneur fera périr tous vos braves.",
  "Que les peuples viennent se rendre à la vallée de Josaphat ; j'y serai assis sur mon trône, pour y juger tous les peuples qui y viendront de toutes parts.",
  "Mettez la faucille dans le blé, parce qu'il est déjà mûr : venez, et descendez, le pressoir est plein, les cuves regorgent ; parce que leur malice est montée a son comble.",
  "Peuples, peuples, accourez dans la vallée du carnage : car le jour du Seigneur est proche : accourez dans la vallée du carnage.",
  "Le soleil et la lune se couvriront de ténèbres, et les étoiles retireront leur lumière.",
  "Le Seigneur rugira du haut de Sion, et sa voix retentira du milieu de Jérusalem : le ciel et la terre trembleront ; et alors le Seigneur sera l'espérance de son peuple, et la force des enfants d'Israël.",
  "Vous saurez en ce jour-là que j'habite sur ma montagne sainte de Sion, moi qui suis le Seigneur, votre Dieu : et Jérusalem sera sainte, sans que les étrangers passent désormais au milieu d'elle.",
  "En ce jour-là la douceur du miel dégouttera des montagnes, le lait coulera des collines, et les eaux vives couleront dans tous les ruisseaux de Juda. il sortira de la maison du Seigneur une fontaine qui remplira le torrent des épines.",
  "L'Égypte sera toute désolée, et l'Idumée deviendra un désert affreux ; parce qu'ils ont opprimé injustement les enfants de Juda, et qu'ils ont répandu dans leur pays le sang innocent.",
  "La Judée sera habitée éternellement, Jérusalem subsistera dans toutes les races.",
  "Je purifierai alors leur sang que je n'aurai point purifié auparavant : et le Seigneur habitera dans Sion.",
]

// ── MAL.3.19-24 ─────────────────────────────────────────────────────────────
// Notre base utilise la numérotation protestante (3 chapitres, 24 versets au ch3).
// Sacy (éd. 1855) a 4 chapitres : son ch4 v1-6 = nos MAL.3.19-24.
const malCh4 = [
  "CAR il viendra un jour de feu semblable à une fournaise ardente : tous les superbes et tous ceux qui commettent l'impiété seront alors comme de la paille : et ce jour qui doit venir les embrasera, dit le Seigneur des armées, sans leur laisser ni germe, ni racine.",
  "Le Soleil de justice se lèvera pour vous qui avez une crainte respectueuse pour mon nom, et vous trouverez votre salut sous ses ailes : vous sortirez alors, et vous tressaillirez de joie comme les jeunes bœufs d'un troupeau bondissent sur l'herbe.",
  "Vous foulerez aux pieds les impies, lorsqu'ils seront devenus comme de la cendre sous la plante de vos pieds, en ce jour où j'agirai moi-même, dit le Seigneur des armées.",
  "Souvenez-vous de la loi de Moïse, mon serviteur, que je lui ai donnée sur la montagne d'Horeb, afin qu'il portât à tout le peuple d'Israël mes préceptes et mes ordonnances.",
  "Je vous enverrai le prophète Élie, avant que le grand et épouvantable jour du Seigneur arrive :",
  "et il réunira le cœur des pères avec leurs enfants, et le cœur des enfants avec leurs pères ; de peur qu'en venant je ne frappe la terre d'anathème.",
]

// ── 1CH.5.27-41 ─────────────────────────────────────────────────────────────
// Notre base utilise la numérotation Vulgate : 1 Chr 5 a 41 versets (v27-41 = généalogie lévitique).
// Sacy (éd. 1855) suit la numérotation protestante : ch5 s'arrête à v26, ch6 v1-15 = notre ch5:27-41.
// → note "(I Par. 6, X dans l'édition de Sacy)" pour signaler le décalage.
// Source : https://fr.wikisource.org/wiki/Bible_Sacy/I_Paralipomènes ch6 v1-15
const iparCh5v27 = [
  "LES fils de Lévi furent Gerson, Caath, et Mérari.",
  "Les fils de Caath sont Amram, Isaar, Hébron, et Oziel.",
  "Les fils d'Amram sont Aaron, Moïse, et Marie leur sœur. Les fils d'Aaron sont Nadab et Abiu, Éléazar et Ithamar.",
  "Éléazar engendra Phinéès, et Phinéès engendra Abisué.",
  "Abisué engendra Bocci ; et Bocci engendra Ozi ;",
  "Ozi engendra Zaraïas, et Zaraïas engendra Méraïoth.",
  "Méraïoth engendra Amarias, et Amarias engendra Achitob.",
  "Achitob engendra Sadoc, et Sadoc engendra Achimaas.",
  "Achimaas engendra Azarias, et Azarias engendra Johanan.",
  "Johanan engendra Azarias : ce fut lui qui exerça le sacerdoce dans le temple que Salomon avait fait bâtir dans Jérusalem.",
  "Or Azarias engendra Amarias, et Amarias engendra Achitob.",
  "Achitob engendra Sadoc, et Sadoc engendra Sellum.",
  "Sellum engendra Helcias, et Helcias engendra Azarias.",
  "Azarias engendra Saraïas, et Saraïas engendra Josédec.",
  "Or Josédec sortit du pays quand le Seigneur transféra en Babylone la tribu de Juda et le peuple de Jérusalem par la main de Nabuchodonosor.",
]

async function updateVerset(livre, chapitre, verset, text) {
  const { error } = await sb.from('versets')
    .update({ TR0001: text })
    .eq('livre', livre)
    .eq('chapitre', chapitre)
    .eq('verset', verset)
  if (error) {
    console.error(`  ✗ ${livre}.${chapitre}.${verset} : ${error.message}`)
    return false
  }
  return true
}

async function main() {
  // 1. Vérifier l'état actuel avant de modifier
  console.log('=== VÉRIFICATION AVANT CORRECTION ===')
  const { data: before } = await sb.from('versets')
    .select('livre,chapitre,verset,TR0001')
    .or('and(livre.eq.JOL,chapitre.eq.4),and(livre.eq.MAL,chapitre.eq.3,verset.gte.19),and(livre.eq.1CH,chapitre.eq.5,verset.gte.27)')
    .order('livre').order('chapitre').order('verset')
  const vides = (before || []).filter(v => !v.TR0001)
  const remplis = (before || []).filter(v => v.TR0001)
  console.log(`  JOL ch4 + MAL 3:19-24 + 1CH 5:27-41 : ${vides.length} vides, ${remplis.length} déjà remplis`)
  if (remplis.length > 0) {
    console.log('  Versets déjà remplis (on ne les écrasera pas) :')
    for (const v of remplis) console.log(`    ${v.livre}.${v.chapitre}.${v.verset} : ${v.TR0001.slice(0, 60)}…`)
    console.log('  ARRÊT : des versets ont déjà du texte. Relancez avec --force pour écraser.')
    if (!process.argv.includes('--force')) process.exit(1)
  }

  // 2. Joël ch4 (= Sacy ch3)
  console.log('\n=== JOL.4.1-21 → Sacy Joël ch3 ===')
  let jolOk = 0
  for (let i = 0; i < jolCh3.length; i++) {
    const v = i + 1
    const note = `(Joël 3, ${v} dans l'édition de Sacy) `
    const ok = await updateVerset('JOL', 4, v, note + jolCh3[i])
    if (ok) { console.log(`  ✓ JOL.4.${v}`); jolOk++ }
  }
  console.log(`  → ${jolOk}/21 versets mis à jour`)

  // 3. Malachie 3:19-24 (= Sacy ch4 v1-6)
  console.log('\n=== MAL.3.19-24 → Sacy Malachie ch4 ===')
  let malOk = 0
  for (let i = 0; i < malCh4.length; i++) {
    const dbVerset = 19 + i     // v19 → v24 dans notre DB
    const sacyVerset = i + 1    // v1 → v6 dans Sacy ch4
    const note = `(Malachie 4, ${sacyVerset} dans l'édition de Sacy) `
    const ok = await updateVerset('MAL', 3, dbVerset, note + malCh4[i])
    if (ok) { console.log(`  ✓ MAL.3.${dbVerset} (Sacy ch4:${sacyVerset})`); malOk++ }
  }
  console.log(`  → ${malOk}/6 versets mis à jour`)

  // 4. I Paralipomènes 5:27-41 (à compléter)
  // 4. I Paralipomènes 5:27-41 (= Sacy ch6 v1-15)
  console.log('\n=== 1CH.5.27-41 → Sacy I Par ch6 ===')
  let iparOk = 0
  for (let i = 0; i < iparCh5v27.length; i++) {
    const dbVerset = 27 + i
    const sacyVerset = i + 1
    const note = `(I Par. 6, ${sacyVerset} dans l'édition de Sacy) `
    const ok = await updateVerset('1CH', 5, dbVerset, note + iparCh5v27[i])
    if (ok) { console.log(`  ✓ 1CH.5.${dbVerset} (Sacy ch6:${sacyVerset})`); iparOk++ }
  }
  console.log(`  → ${iparOk}/15 versets mis à jour`)

  // 5. Contrôle : relire les versets mis à jour
  console.log('\n=== CONTRÔLE FINAL ===')
  const { data: after } = await sb.from('versets')
    .select('livre,chapitre,verset,TR0001')
    .or('and(livre.eq.JOL,chapitre.eq.4),and(livre.eq.MAL,chapitre.eq.3,verset.gte.19),and(livre.eq.1CH,chapitre.eq.5,verset.gte.27)')
    .order('livre').order('chapitre').order('verset')
  for (const v of after || []) {
    const preview = v.TR0001 ? v.TR0001.slice(0, 90) + '…' : '(vide)'
    console.log(`  ${v.livre}.${v.chapitre}.${v.verset} : ${preview}`)
  }
}

main().catch(console.error)
