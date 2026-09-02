// Le lexique de ce que le site n'admet ni dans un pseudonyme ni dans un commentaire.
//
// Décision de l'auteur (2026-09-03) : une liste noire pour le choix du pseudonyme,
// une autre pour les commentaires, « assez permissive ; simplement les insultes ».
// C'est donc une liste COURTE, et elle doit le rester : l'injure, l'insulte à
// caractère sexuel, raciste ou homophobe, et rien du registre familier ordinaire.
// « Merde », « putain » ou « débile » n'y sont pas, à dessein. Un commentaire passe
// de toute façon par la modération avant de paraître ; ce lexique n'est que le
// filet qui évite à l'administrateur de LIRE ce qu'on ne devrait pas lui écrire.
//
// ⛔ La MÊME liste vit en base, table `moderation_lexique`, où deux déclencheurs
// l'appliquent (pseudonyme de `profils`, texte de `commentaires` et
// `essais_commentaires`) pour tout écrivain qui n'est ni la clé de service ni un
// administrateur. Ce module sert le navigateur (message clair avant l'envoi) et
// les routes qui écrivent avec la clé de service (`creer-profil`). Les deux
// exemplaires sont tenus d'accord par `moderationLexique.test.ts`, qui relit la
// migration : ajouter un mot ici sans l'ajouter là fait échouer les tests.
//
// `entier` : le mot ne compte que comme MOT ENTIER (« pute » ne doit pas condamner
// « député », « pédé » ne doit pas condamner « pédestre »). Sans `entier`, le mot
// est cherché comme SOUS-CHAÎNE dans un pseudonyme (« connard42 »), et comme mot
// entier dans un commentaire. Une locution (« trou du cul ») se cherche telle
// quelle dans un commentaire, et collée dans un pseudonyme.

export type TermeInterdit = { mot: string; entier: boolean }

export const LEXIQUE_INTERDIT: readonly TermeInterdit[] = [
  // Injures
  { mot: 'connard', entier: false },
  { mot: 'connasse', entier: false },
  { mot: 'conard', entier: false },
  { mot: 'conasse', entier: false },
  { mot: 'salope', entier: false },
  { mot: 'salaud', entier: false },
  { mot: 'salopard', entier: false },
  { mot: 'enculé', entier: false },
  { mot: 'enculer', entier: false },
  { mot: 'bâtard', entier: false },
  { mot: 'pute', entier: true },
  { mot: 'fils de pute', entier: false },
  { mot: 'fdp', entier: true },
  { mot: 'ntm', entier: true },
  { mot: 'nique', entier: true },
  { mot: 'niquer', entier: true },
  { mot: 'trou du cul', entier: false },
  { mot: 'ta gueule', entier: false },
  { mot: 'tg', entier: true },
  { mot: 'abruti', entier: true },
  { mot: 'crétin', entier: true },
  // Sexuel cru
  { mot: 'bite', entier: true },
  { mot: 'couille', entier: true },
  { mot: 'couilles', entier: true },
  // Homophobe
  { mot: 'pd', entier: true },
  { mot: 'pédé', entier: true },
  { mot: 'tapette', entier: true },
  { mot: 'tarlouze', entier: false },
  { mot: 'gouine', entier: false },
  // Raciste et antisémite
  { mot: 'nègre', entier: true },
  { mot: 'négro', entier: true },
  { mot: 'bougnoule', entier: false },
  { mot: 'youpin', entier: false },
  { mot: 'bicot', entier: true },
  { mot: 'chintok', entier: false },
  { mot: 'bamboula', entier: false },
  { mot: 'nazi', entier: true },
  { mot: 'hitler', entier: false },
  // Anglais, pour les pseudonymes surtout
  { mot: 'fuck', entier: false },
  { mot: 'bitch', entier: true },
  { mot: 'asshole', entier: false },
  { mot: 'nigger', entier: false },
  { mot: 'faggot', entier: false },
  { mot: 'cunt', entier: true },
  { mot: 'shit', entier: true },
  { mot: 'dick', entier: true },
  { mot: 'whore', entier: false },
  { mot: 'slut', entier: true },
]

export const MESSAGE_PSEUDO_INTERDIT = 'Ce pseudonyme n’est pas admis.'
export const MESSAGE_COMMENTAIRE_INTERDIT = 'Le commentaire contient un terme que le site n’admet pas.'

/** Bas de casse, sans accent, tout ce qui n'est pas lettre ou chiffre devient une
 *  espace, et une lettre répétée trois fois ou plus retombe à deux (« connnnard »).
 *  ⚠️ Pas à une seule : « nigger » replié à « niger » condamnerait le Niger.
 *  Même repli que `public.replier_texte` en base. */
export function replierTexte(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/(.)\1{2,}/g, '$1$1')
    .trim()
}

const motsDe = (texteReplie: string): string[] => texteReplie.split(' ').filter(Boolean)

/** Un mot du texte vaut aussi sans son pluriel : « salopes » condamne comme « salope ». */
function contientMotEntier(texteReplie: string, motReplie: string): boolean {
  const cible = ` ${texteReplie} `
  return cible.includes(` ${motReplie} `) || cible.includes(` ${motReplie}s `)
}

/** Le terme qui interdit ce pseudonyme, ou `null`. */
export function termeInterditDansPseudo(pseudo: string): string | null {
  const replie = replierTexte(pseudo)
  // Les séparateurs s'ôtent AVANT de replier les répétitions : « Con-NNNard » doit
  // donner « connard », non « con nnard ».
  const colle = replie.replace(/ /g, '').replace(/(.)\1{2,}/g, '$1$1')
  for (const { mot, entier } of LEXIQUE_INTERDIT) {
    const m = replierTexte(mot)
    if (entier ? motsDe(replie).includes(m) : colle.includes(m.replace(/ /g, ''))) return mot
  }
  return null
}

/** Les termes interdits que ce texte contient, en mots entiers. */
export function termesInterditsDansTexte(texte: string): string[] {
  const replie = replierTexte(texte)
  return LEXIQUE_INTERDIT.filter(({ mot }) => contientMotEntier(replie, replierTexte(mot))).map(t => t.mot)
}
