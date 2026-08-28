/**
 * Le SIGLE d'une bible — son nom réduit au mot qui la distingue
 *
 * La page de recherche listait, sous chaque verset, toutes les bibles qui portent le mot
 * cherché, EN TOUTES LETTRES : « Bible de Sacy · Bible Segond · Bible Crampon · Vulgate
 * clémentine · Septante de Swete · Bible française du XIIIe siècle · Bible Fillion ».
 * Sept noms, répétés sur chacun des vingt résultats d'une page, et qui reviennent à la
 * ligne dès que la fenêtre se resserre : un verset y occupait trois rangs au lieu de deux.
 * Personne ne lit cette ligne ; on y cherche un nom, et un seul.
 *
 * ⛔ Pas de table écrite à la main. La charte a déjà vu ce qu'il en advient à propos des
 * noms de livres : « Une table écrite à la main ici a dérivé : il y manquait les
 * deutérocanoniques ». Une bible ajoutée demain doit recevoir son sigle du même coup,
 * sans que personne ait à y penser. Le sigle se DÉRIVE donc du nom, par une règle.
 *
 * La règle, dans l'ordre :
 *   1. Un sigle entre parenthèses en CAPITALES est le sigle : « Traduction officielle
 *      liturgique (AELF) » → « AELF ».
 *   2. Sinon, le premier mot DISTINCTIF, c'est-à-dire qui commence par une capitale ou un
 *      chiffre, les mots génériques écartés (« Bible », « Traduction », « Testament »…) :
 *      « Bible de Sacy » → « Sacy », « Vulgate clémentine » → « Vulgate »,
 *      « Bible française du XIIIe siècle » → « XIIIe ».
 *   3. À défaut, le nom entier — mieux vaut long que faux.
 *
 * ⚠️ Deux bibles peuvent réduire au même sigle : « Vulgate clémentine » et « Vulgate
 * latine (Fillion) » donnent toutes deux « Vulgate ». Un sigle ambigu est pire que pas de
 * sigle, puisqu'il désigne alors la mauvaise bible. `siglesTraductions` règle le cas en
 * rallongeant les seuls noms qui se heurtent, et retombe sur le nom entier si le
 * rallongement ne suffit pas. ⛔ Ne jamais employer `sigleTraduction` seul sur une LISTE :
 * pris un par un, les sigles ne savent rien les uns des autres.
 *
 * Le nom entier n'est jamais perdu pour autant : il est porté en `title` sur chaque sigle.
 */

/** Les mots qui nomment le GENRE de l'ouvrage et ne distinguent donc aucune bible. */
const GENERIQUES = new Set([
  'bible', 'bibles', 'traduction', 'traductions', 'version',
  'testament', 'nouveau', 'ancien', 'saint', 'sainte', 'saintes', 'écriture', 'écritures',
  'la', 'le', 'les', 'du', 'de', 'des', "d'", 'en', 'et',
])

/** Un mot DISTINCTIF ouvre sur une capitale ou un chiffre : un nom propre, un siècle. */
function estDistinctif(mot: string): boolean {
  return /^[A-ZÀ-ÖØ-Þ0-9]/.test(mot)
}

function mots(nom: string): string[] {
  return nom.replace(/[()]/g, ' ').split(/[\s·]+/).filter(Boolean)
}

function estGenerique(mot: string): boolean {
  return GENERIQUES.has(mot.toLowerCase().replace(/[.,;:]$/, ''))
}

/**
 * Le sigle d'UN nom, pris isolément. Voir l'avertissement en tête : sur une liste, passer
 * par `siglesTraductions`, qui seul sait défaire les homonymies.
 */
export function sigleTraduction(nom: string): string {
  const propre = (nom ?? '').trim()
  if (!propre) return ''

  // 1. Un sigle en capitales entre parenthèses parle pour tout le nom.
  const capitales = propre.match(/\(([A-ZÀ-ÖØ-Þ]{2,})\)\s*$/)
  if (capitales) return capitales[1]

  // 2. Le premier mot distinctif, les génériques écartés.
  for (const mot of mots(propre)) {
    if (estGenerique(mot)) continue
    if (estDistinctif(mot)) return mot
  }

  // 3. Rien de distinctif : le nom entier.
  return propre
}

/**
 * Les sigles d'une LISTE de noms, sans homonymie.
 *
 * Rend un tableau de la même longueur et dans le même ordre que celui reçu. Les noms qui
 * réduisent au même sigle sont rallongés d'un mot, puis rendus entiers si cela ne suffit
 * pas encore : à la sortie, deux bibles n'ont jamais le même sigle.
 */
export function siglesTraductions(noms: string[]): string[] {
  const sigles = noms.map(sigleTraduction)

  const comptes = new Map<string, number>()
  for (const s of sigles) comptes.set(s, (comptes.get(s) ?? 0) + 1)

  return sigles.map((sigle, i) => {
    if ((comptes.get(sigle) ?? 0) < 2) return sigle
    // Homonymie : on rallonge du mot suivant, générique ou non, celui-là même que la
    // règle avait écarté parce qu'il ne portait pas de capitale.
    const suite = mots(noms[i])
    const rang = suite.findIndex(m => m === sigle)
    const rallonge = rang >= 0 && suite[rang + 1] ? `${sigle} ${suite[rang + 1]}` : noms[i].trim()
    // Le rallongement ne lève l'homonymie que s'il est lui-même unique.
    const jumeaux = noms.filter((_, j) => sigles[j] === sigle)
    const rallonges = jumeaux.map(n => {
      const s = mots(n)
      const r = s.findIndex(m => m === sigle)
      return r >= 0 && s[r + 1] ? `${sigle} ${s[r + 1]}` : n.trim()
    })
    return new Set(rallonges).size === rallonges.length ? rallonge : noms[i].trim()
  })
}
