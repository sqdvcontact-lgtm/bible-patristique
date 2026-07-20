// Correction des 30 PSA versets vides — tous sont des erreurs d'import, pas des absences réelles.
// Sources : https://fr.wikisource.org/wiki/Bible_Sacy/Psaumes (numérotation Vulgate)
// Mapping : DB PSA ch = Sacy Psaume (Vulgate) correspondant (décalage -1 pour ch 11-113 etc.)
// PSA 92:16 est laissé vide (genuinement absent de la Vulgate/Sacy).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))


const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

// [chapitre, verset, texte Sacy]
const corrections = [
  [12, 8, "Vous donc, Seigneur ! vous nous garderez, et vous nous mettrez éternellement à couvert de cette nation corrompue."],
  [25, 19, "(Resh.) Jetez les yeux sur mes ennemis, sur leur multitude, et sur la haine injuste qu'ils me portent."],
  [46, 12, "Le Seigneur des armées est avec nous ; le Dieu de Jacob est notre défenseur."],
  [52, 10, "Mais pour moi, je suis comme un olivier qui porte du fruit dans la maison de Dieu : j'ai établi mon espérance dans la miséricorde de Dieu pour tous les siècles et pour l'éternité."],
  [52, 11, "Je vous louerai éternellement, parce que vous avez agi ainsi : et j'attendrai les effets de l'assistance de votre saint nom ; parce qu'il est rempli de bonté devant les yeux de vos saints."],
  [60, 14, "Avec Dieu nous ferons des actions de vertu et de courage ; et il réduira lui-même au néant tous ceux qui nous persécutent."],
  [62, 13, "et qu'à vous, Seigneur ! est la miséricorde ; l'autre, Que vous rendrez à chacun selon ses œuvres."],
  [63, 12, "Mais pour le Roi, il se réjouira en Dieu : tous ceux qui se sont engagés à lui par serment, recevront des louanges ; parce que la bouche de ceux qui disaient des choses injustes a été fermée."],
  [66, 20, "Que Dieu soit béni, lui qui n'a point rejeté ma prière, ni retiré sa miséricorde de dessus moi."],
  [78, 58, "Ils irritèrent sa colère sur leurs collines ; et ils le piquèrent d'une jalousie d'indignation par les idoles qu'ils se fabriquaient."],
  [78, 64, "Leurs prêtres furent mis à mort par l'épée, et nul ne versait des larmes sur leurs veuves."],
  [81, 16, "Les ennemis du Seigneur lui ont manqué de parole ; et le temps de leur misère durera autant que les siècles."],
  [81, 17, "Et cependant il les a nourris de la plus pure farine de froment ; et il les a rassasiés du miel sorti de la pierre."],
  [83, 18, "Qu'ils rougissent, et soient troublés pour toujours ; qu'ils soient confondus, et qu'ils périssent."],
  [83, 19, "Et qu'ils connaissent enfin que votre nom est le Seigneur ; et que vous seul êtes le Très-Haut qui dominez sur toute la terre."],
  [86, 17, "Faites éclater quelque signe en ma faveur ; afin que ceux qui me haïssent le voient, et qu'ils soient confondus en voyant que vous, Seigneur ! m'avez secouru, et que vous m'avez consolé."],
  [89, 52, "du reproche de vos ennemis, de ce reproche qu'ils ont fait, Seigneur ! que vous avez changé à l'égard de votre Christ."],
  [89, 53, "Que le Seigneur soit béni éternellement ! que cela soit ainsi ! que cela soit ainsi !"],
  [92, 11, "Et mon œil a regardé mes ennemis avec mépris ; et mon oreille entendra parler de la punition des méchants qui s'élèvent contre moi."],
  // PSA 92:16 → absent de Sacy (Ps XCI v17 n'existe pas) — volontairement omis
  [106, 48, "Que le Seigneur, le Dieu d'Israël, soit béni dans tous les siècles ! Et tout le peuple dira : Ainsi soit-il ! ainsi soit-il !"],
  [109, 31, "parce qu'il s'est tenu à la droite du pauvre, afin de sauver mon âme de la violence de ceux qui la persécutent."],
  [112, 10, "(Resh.) Le pécheur le verra, et en sera irrité : (Shin.) il grincera des dents, et séchera de dépit : (Thau.) le désir des pécheurs périra."],
  // PSA 116 — Sacy a Ps CXIV (v1-9 = Protestant 116:1-9) et Ps CXV (v10-18 continu = 116:10-18)
  // Le v18 de Sacy CXV contient le (19) incorporé
  [116, 18, "Je m'acquitterai de mes vœux envers le Seigneur devant tout son peuple ; (19) à l'entrée de la maison du Seigneur, au milieu de vous, ô Jérusalem !"],
  [116, 19, "à l'entrée de la maison du Seigneur, au milieu de vous, ô Jérusalem !"],
  [119, 136, "Mes yeux ont répandu des ruisseaux de larmes ; parce qu'ils n'ont pas gardé votre loi. (tsadé.)"],
  [119, 147, "Je me suis hâté, et j'ai crié de bonne heure ; parce que j'ai mis mon espérance en vos promesses."],
  [124, 8, "Notre secours est dans le nom du Seigneur, qui a fait le ciel et la terre."],
  [132, 14, "C'est là pour toujours le lieu de mon repos : c'est là que j'habiterai, parce que je l'ai choisie."],
  [136, 24, "Et il nous a rachetés de la servitude de nos ennemis ; parce que sa miséricorde est éternelle."],
  [139, 24, "Voyez si la voie de l'iniquité se trouve en moi ; et conduisez-moi dans la voie qui est éternelle."],
]

async function main() {
  console.log(`=== CORRECTION ${corrections.length} PSA VIDES ===`)
  let ok = 0, err = 0

  for (const [ch, v, text] of corrections) {
    const { error } = await sb.from('versets')
      .update({ TR0001: text })
      .eq('livre', 'PSA')
      .eq('chapitre', ch)
      .eq('verset', v)
    if (error) {
      console.error(`  ✗ PSA ${ch}:${v} — ${error.message}`)
      err++
    } else {
      console.log(`  ✓ PSA ${ch}:${v}`)
      ok++
    }
  }

  console.log(`\n→ ${ok}/${corrections.length} versets corrigés, ${err} erreurs`)
  console.log('  (PSA 92:16 laissé vide — genuinement absent de Sacy/Vulgate)')

  // Vérification finale
  const { data: restants } = await sb.from('versets')
    .select('chapitre,verset')
    .eq('livre', 'PSA')
    .or('TR0001.is.null,TR0001.eq.')
    .order('chapitre').order('verset')
  console.log(`\n=== PSA ENCORE VIDES : ${restants?.length} ===`)
  for (const v of restants || []) console.log(`  PSA ${v.chapitre}:${v.verset}`)
}

main().catch(console.error)
