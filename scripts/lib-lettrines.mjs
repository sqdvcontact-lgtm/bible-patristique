// Le mot qui suit une lettrine élidée — « C’EST », « J’AI », « L’ANGE » — était laissé à
// moitié en capitales par la normalisation : « C’Est », « J’Ai », « L’Ange ».
//
// LA CAPITALE N'EST PAS TOUJOURS FAUTIVE, et c'est tout le problème. Sacy écrit « l’Eglise »,
// « l’Ecriture », « l’Intendant » avec une majuscule PARTOUT dans le corpus : la rétablir en
// minuscule serait corriger l'édition. On tranche donc par le COMPTAGE — la méthode qui avait
// démenti ma « correction » de santifie → sanctifie : on compare, sur tout le corpus, le
// nombre de fois où le mot suit une apostrophe avec majuscule et avec minuscule.
//
//   Ange     49 maj / 114 min  → minuscule
//   Arche     3 / 203          → minuscule
//   Eglise   76 / 0            → CAPITALE, usage de l'édition
//   Ecriture 54 / 0            → CAPITALE
//
// DEUX MOTS RESTENT HORS RÈGLE, délibérément :
//   « Esprit » (115 maj / 219 min) — les deux graphies sont justes et désignent des choses
//   différentes : l’Esprit de Dieu, l’esprit de l’homme. Aucun comptage ne peut trancher cela.
//   « Eunuque » (6 / 4) — trop serré pour conclure.
// On ne les touche pas : mieux vaut une capitale discutable qu'une correction fausse.

// Mots à remettre en minuscule après une lettrine élidée. Les formes grammaticales (Ai, Est,
// Il, Où…) ne peuvent jamais porter de capitale ; les autres ont été établies au comptage.
export const APRES_LETTRINE_MINUSCULE = new Set([
  // formes grammaticales — jamais capitalisées
  'Ai', 'Ay', 'Est', 'Eus', 'Etant', 'Entendis', 'Il', 'Où', 'An', 'Onziéme',
  // noms communs, verdict du comptage
  'Ange', 'Arche', 'Année', 'Argent', 'Injuste', 'Insensé',
])

// Applique la règle au DÉBUT du texte seulement : la lettrine n'affecte que le premier mot.
export function corrigeLettrineElidee(texte){
  return (texte || '').replace(/^([A-ZÀ-Ü])(’)([A-ZÀ-Ü][a-zà-ÿ]+)/, (tout, a, apo, mot) =>
    APRES_LETTRINE_MINUSCULE.has(mot) ? a + apo + mot[0].toLowerCase() + mot.slice(1) : tout)
}
