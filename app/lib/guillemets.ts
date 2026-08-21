// Bornage des guillemets d'une citation affichée SEULE. Fonctions PURES, testées
// dans guillemets.test.ts.
//
// Une traduction ponctue le discours direct sur plusieurs versets : Crampon ouvre
// au verset 1 et ferme au verset 3. Sorti de son contexte, chaque verset porte
// donc un guillemet orphelin — « en disant : « Voici que nous sommes tes os »
// s'ouvre sans se fermer, « … dans les jours de Saül. » se ferme sans s'ouvrir.
// Relevé du 2026-08-17 : sur 7 221 versets de Crampon portant des guillemets,
// 3 468 sont déséquilibrés, soit près d'un sur deux.
//
// La citation affichée seule doit être bornée des deux côtés : on ajoute le
// guillemet manquant à sa place, jamais on ne retire celui qui est là.

const FINE = ' '

const compter = (texte: string, signe: string) => texte.split(signe).length - 1

/** Les guillemets anglais ORPHELINS passent au français. Une paire anglaise
 *  complète est la convention d'imbrication du site (charte §3.3) : elle reste.
 *  Seul l'excédent, qui n'imbrique rien, devient un guillemet de premier niveau. */
export function franciserGuillemetsOrphelins(texte: string): string {
  let sortie = texte
  const excedentOuvrants = compter(sortie, '“') - compter(sortie, '”')
  for (let i = 0; i < excedentOuvrants; i++) sortie = sortie.replace('“', '«' + FINE)
  const excedentFermants = compter(sortie, '”') - compter(sortie, '“')
  for (let i = 0; i < excedentFermants; i++) {
    const dernier = sortie.lastIndexOf('”')
    sortie = sortie.slice(0, dernier) + FINE + '»' + sortie.slice(dernier + 1)
  }
  return sortie
}

/** Borne une citation affichée seule : le guillemet manquant est ajouté à sa
 *  place, en tête ou en fin, avec la fine insécable qu'exige le français.
 *  Idempotente : une citation déjà bornée ne bouge pas. */
export function bornerGuillemets(texte: string): string {
  const brut = texte.trim()
  if (!brut) return texte
  let sortie = franciserGuillemetsOrphelins(brut)

  const ouvrants = compter(sortie, '«')
  const fermants = compter(sortie, '»')

  // Il ferme sans avoir ouvert : la citation avait commencé plus haut.
  for (let i = 0; i < fermants - ouvrants; i++) sortie = '«' + FINE + sortie
  // Il ouvre sans fermer : la citation se poursuit plus bas.
  for (let i = 0; i < ouvrants - fermants; i++) sortie = sortie + FINE + '»'

  return sortie
}
