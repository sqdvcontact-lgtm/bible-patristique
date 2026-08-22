// Tirets d'incise d'un verset affiché SEUL. Fonctions PURES, testées dans tirets.test.ts.
//
// Pendant du bornage des guillemets (voir app/lib/guillemets.ts), et même cause : une
// traduction ponctue par-dessus les versets, si bien qu'un verset sorti de son contexte
// hérite d'une ponctuation qui désigne un texte absent.
//
// Crampon emploie le cadratin comme SÉPARATEUR de segments, non comme parenthèse. Gn 25
// le montre bien : le verset 2 finit par « … Jesboc et Sué. — », le 3 par « … et les
// Laomim. — », et le 4 porte « … et Eldaa. — Ce sont là tous les fils de Cétura. » Le
// tiret sépare toujours ce qui précède de ce qui suit.
//
// ⛔ D'où la règle, qui est POSITIONNELLE et non arithmétique. Un tiret au BORD de
// l'extrait sépare celui-ci de quelque chose qu'on ne montre pas : il ne sépare donc
// rien, et il s'efface. Un tiret À L'INTÉRIEUR sépare deux segments tous deux présents :
// il fait son office, et il reste. « Gn 25, 1-2 » perd son tiret final ; « Gn 25, 4 »
// garde le sien, qui est au milieu.
//
// ⚠️ Différence avec les guillemets, et elle est de nature : un guillemet orphelin
// s'AJOUTE (on borne la citation des deux côtés), un tiret orphelin se RETRANCHE. Le
// guillemet manquant est une information qu'on peut rétablir — on sait de quel côté il
// va. Le tiret, lui, ne peut pas être complété : on ne va pas inventer le segment
// auquel il renvoie.
//
// Relevé du 2026-08-22 sur les 35 588 versets de Crampon : 1 293 portent un tiret. 497
// l'ont en fin, 67 en tête, 27 aux deux bords, et 702 seulement à l'intérieur — ces
// derniers ne bougent pas. La règle touche donc 591 versets sur 1 293, et jamais les
// deux tiers qui ponctuent réellement quelque chose de visible.

/** Cadratin (U+2014) et demi-cadratin (U+2013). Le trait d'union ordinaire est EXCLU :
 *  il appartient aux mots, non à la phrase. */
const TIRETS = '—–'

// `\s` de JavaScript couvre l'espace fine insécable (U+202F) et l'insécable (U+00A0),
// que la composition française pose autour d'un tiret d'incise : elles partent avec lui.
const BORD_TETE = new RegExp(`^(?:\\s*[${TIRETS}])+\\s*`, 'u')
const BORD_FIN = new RegExp(`\\s*(?:[${TIRETS}]\\s*)+$`, 'u')

/** Retire les tirets d'incise qui touchent le bord d'un extrait affiché seul.
 *  Idempotente. Ne touche pas aux tirets intérieurs, ni au trait d'union. */
export function effacerTiretsDeBordure(texte: string): string {
  if (!texte) return texte
  const sortie = texte.replace(BORD_TETE, '').replace(BORD_FIN, '')
  // Un extrait qui ne serait QUE des tirets se viderait : on préfère alors le laisser
  // tel quel, un vide n'étant jamais une amélioration.
  return sortie.trim() ? sortie : texte
}
