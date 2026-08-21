// Relecture certaine du fac-similé, pages imprimées 1–25 (PDF 30–54).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(x => x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const write = process.argv.includes('--write')

// [segment, lecture OCR fautive, lecture attestée par le fac-similé]
const fixes = [
  [98, 'sũr ses forces', 'sur ses forces'],
  [99, 'Ne suisje', 'Ne suis-je'], [99, 'n’estelle', 'n’est-elle'],
  [104, 'contr elle', 'contre elle'],
  [105, 'avan tage', 'avantage'], [105, 'se laislent', 'se laissent'],
  [106, 'admité', 'admiré'], [107, 'tour le reste', 'tout le reste'],
  [109, 'voisinãge', 'voisinage'], [112, 'conseib', 'conseil'],
  [116, 'l’eau a certains temperamens', 'l’eau à certains temperamens'],
  [117, 'Usons -donc', 'Usons-donc'],
  [120, 'boiré', 'boire'], [120, 'mais e eft un crime', 'mais c’est un crime'],
  [120, 'Diré que', 'Dire que'], [120, 'l’a donne', 'l’a donné'],
  [121, 'Qu’on ne blâme donc pay le vin', 'Qu’on ne blâme donc pas le vin'],
  [124, 'su nous prenons du vin', 'si nous prenons du vin'],
  [128, 'Pourquoy fautil', 'Pourquoy faut-il'],
  [130, 'arrêter a l’avenir vos murmu, res', 'arrêter à l’avenir vos murmures'],
  [134, 'La fixiéme', 'La sixiéme'], [134, 'il autoit', 'il auroit'],
  [138, 'ses taviffemens', 'ses ravissemens'], [138, 'de l’ergueil', 'de l’orgueil'],
  [140, 'peut-êtré', 'peut-être'], [140, 'les plus patfaits', 'les plus parfaits'],
  [141, 'qui croid', 'qui croit'], [141, 'point pat impuissance', 'point par impuissance'],
  [145, 'pas feulement', 'pas seulement'],
  [148, 'venoient a la connoissance', 'venoient à la connoissance'],
  [149, 'ayant guert un boiteux', 'ayant gueri un boiteux'],
  [149, 'ne voyons nous pas', 'ne voyons-nous pas'],
  [150, 'Car ça esté', 'Car ç’a esté'],
  [153, 'ont merite les honneurs', 'ont merité les honneurs'],
  [153, 'fort pètites où fort ordinaires', 'fort petites ou fort ordinaires'],
  [154, 'les Samts', 'les Saints'], [154, 'ce qu on', 'ce qu’on'],
  [154, 'de platfirs', 'de plaisirs'], [155, 'mal conseille', 'mal conseillé'],
  [156, 'jusqu’a sa santé', 'jusqu’à sa santé'],
  [157, 'n’alterent point', 'n’altérent point'],
  [158, 'pour petter Job', 'pour jetter Job'], [158, 'luy samain', 'luy sa main'],
  [158, 'il le luy abandonnc', 'il le luy abandonne'],
  [160, 'comme vétu', 'comme vêtu'],
  [161, 'n’euît pas esté', 'n’eût pas esté'],
  [171, 'parlant d’Elie, Tacobe dit', 'parlant d’Elie, dit'],
  [175, 'conforme a celle', 'conforme à celle'], [175, 'dont les mais sont', 'dont les mains sont'],
  [178, 'encore a tout', 'encore à tout'],
  [180, 'se reglerasur', 'se reglera sur'], [180, 'nos lervices', 'nos services'],
  [181, 'des adverfitez', 'des adversitez'], [182, 'tom bée', 'tombée'],
  [189, 'qui fervent de nourriture', 'qui servent de nourriture'],
  [190, 'les conferver', 'les conserver'], [191, 'de cé courage', 'de ce courage'],
  [193, 'leurs adverfitez', 'leurs adversitez'], [193, 'des trefors de gloire', 'des tresors de gloire'],
  [195, 'continuel lement', 'continuellement'], [195, 'de là faim', 'de la faim'],
  [197, 'plusque le blasphême', 'plus que le blasphême'],
  [199, 'enfaisant', 'en faisant'], [200, 'justement opprimé', 'injustement opprimé'],
  [204, 'preparez-vous à souffrir[[32]], Il', 'preparez-vous à souffrir[[32]]. Il'],
  [205, 'promis du repos, C’est', 'promis du repos. C’est'],
  [206, 'imitateurs dé la vertu', 'imitateurs de la vertu'],
  [206, 'même dans les naufrages, Soyez', 'même dans les naufrages. Soyez'],
  [207, 'Gét Esprit', 'Cet Esprit'],
  [208, 'Aussi cę de. S. Jean Chrysostome.', 'Aussi ce'],
  [211, 'les diffieultez', 'les difficultez'], [211, 'un grand tresor', 'un grand trésor'],
  [211, 'une armûte', 'une armure'], [211, 'elle ne répate point', 'elle ne répare point'],
  [213, 'sur fe blaspheme', 'sur ce blaspheme'], [213, 'quelque reconnoifsance', 'quelque reconnoissance'],
  [215, '& fr l’on', '& si l’on'], [215, 'avez vangé', 'avez vengé'], [215, 'Car fi l’on', 'Car si l’on'],
  [216, 'un crime publie', 'un crime public'], [217, 'reprocha bien a un Prince', 'reprocha bien à un Prince'],
  [218, 'On nexigeoit', 'On n’exigeoit'],
  [219, 's’il eût pù', 's’il eût pû'], [219, 'pour la justsée', 'pour la justice'],
  [219, 'Qu y a-t-il', 'Qu’y a-t-il'],
  [221, 'Pour moy, joserois', 'Pour moy, j’oserois'], [221, 'qu en qu’en peu', 'qu’en peu'],
  [222, 'est çapable', 'est capable'], [224, 'par la prace', 'par la grace'],
  [224, 'au SaintEsprit', 'au Saint-Esprit'],
]

const nums = [...new Set(fixes.map(x => x[0]))]
const { data, error } = await sb.from('segments').select('id,segment_numero,segment_texte')
  .eq('id_oeuvre', 'A0014O0038').in('segment_numero', nums)
if (error) throw error
const byNum = new Map(data.map(s => [s.segment_numero, s]))
const changed = new Map()
for (const [num, before, after] of fixes) {
  const s = byNum.get(num)
  if (!s) throw new Error(`Segment S${num} introuvable`)
  const current = changed.get(num) ?? s.segment_texte
  if (current.includes(after)) continue
  if (current.includes(before)) changed.set(num, current.replace(before, after))
  else throw new Error(`S${num}: ni lecture fautive ni lecture corrigée: ${before}`)
}

console.log(`${changed.size} segments à modifier (${fixes.length} corrections certaines), mode ${write ? 'ÉCRITURE' : 'SIMULATION'}.`)
for (const [num, segment_texte] of changed) {
  console.log(`S${num}`)
  if (write) {
    const { error } = await sb.from('segments').update({ segment_texte }).eq('id', byNum.get(num).id)
    if (error) throw error
  }
}
