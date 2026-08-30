// Espaces typographiques (charte §3.2). Fonctions PURES, testées dans typographie.test.ts.
// U+00A0 = espace insécable ; U+202F = espace fine insécable.

// Les trois espaces que le corpus emploie indifféremment là où la typographie
// française n'en veut qu'une. Le remplacement se fait CARACTÈRE POUR CARACTÈRE
// (jamais `+`) : la longueur du texte ne change pas, ce dont dépend le
// surlignage de la page Recherche, qui découpe par indices.
const ESPACES = '[   ]'
const FINE = ' '
const INSECABLE = ' '

// Texte FRANÇAIS. Le corpus porte déjà l'espacement de son édition source, mais
// pas d'un seul caractère : autour des guillemets, un relevé sur 20 000 segments
// donne ~14 600 espaces insécables pleine chasse, ~3 000 espaces ordinaires et
// ~1 530 fines. Trois caractères pour une seule intention, résidus de lots
// d'import successifs. On harmonise donc le TYPE d'espace au rendu, sans jamais
// en ajouter là où l'édition n'en met pas, ni en retirer.
//
// Fine insécable avant ; ! ? et autour des guillemets ; insécable PLEINE CHASSE avant le
// DEUX-POINTS, à qui la règle de l'Imprimerie nationale la réserve (charte §3.2).
//
// ⚠️ Le deux-points était auparavant LAISSÉ INTACT, au motif que sa place lui est reconnue.
// Le motif valait tant que le corpus la lui donnait : Sacy (11 081 versets), Crampon (8 608),
// Segond (7 578) et la Vulgate (18 211) portent bien l'insécable. Mais l'AELF n'en porte
// AUCUNE — 10 954 versets à l'espace ordinaire, sécable — et la Bible 899 non plus (556).
// « Laisser intact » y revenait donc à laisser le deux-points PASSER À LA LIGNE, ce que la
// règle interdit précisément. Relevé le 2026-08-30 dans la Polyglotte, où les colonnes sont
// étroites et le cas donc fréquent.
//
// ⛔ On CONVERTIT le type d'espace, on n'en AJOUTE jamais : « mot: suite » reste tel quel, et
// « https:// » n'a pas d'espace devant son deux-points. C'est ce qui garde le remplacement
// caractère pour caractère, dont dépend le surlignage de la page Recherche. Une fine déjà
// posée devant un deux-points est ramenée à l'insécable (1 261 segments patristiques) : c'est
// le même travail d'harmonisation du TYPE, et il va dans le sens de la règle.
export function normaliserEspaces(texte: string): string {
  return texte
    .replace(new RegExp(`${ESPACES}([?!;])`, 'g'), `${FINE}$1`)
    .replace(new RegExp(`${ESPACES}(:)`, 'g'), `${INSECABLE}$1`)
    .replace(new RegExp(`(«)${ESPACES}`, 'g'), `$1${FINE}`)
    .replace(new RegExp(`${ESPACES}(»)`, 'g'), `${FINE}$1`)
}

// Règles déterministes 1 et 3 de la charte §3.8 :
// 1. une citation ne se ferme jamais sur une ponctuation faible ;
// 3. si elle porte déjà une ponctuation forte à l'intérieur, une seconde
//    ponctuation juste après le guillemet fermant disparaît.
//
// Les trois points placés APRÈS le guillemet sont volontairement préservés :
// dans plusieurs éditions ils servent de marque d'omission entre deux citations
// (« phrase. »... « reprise ») et ne constituent donc pas un doublon univoque.
// La donnée source n'est jamais réécrite : tout ceci appartient au rendu.
export function normaliserPonctuationCitations(texte: string): string {
  const sansPonctuationFaible = texte.replace(
    new RegExp(`${ESPACES}*[,;:]${ESPACES}*»`, 'g'),
    `${FINE}»`,
  )

  return sansPonctuationFaible.replace(
    new RegExp(`([.!?…])(${ESPACES}*»)${ESPACES}*(?:[,;:!?]+|\\.(?!\\.))`, 'g'),
    '$1$2',
  )
}

// Composition complète d'un texte de corpus à l'écran. Contrairement à
// `normaliserEspaces`, cette fonction peut changer la longueur : elle n'est donc
// jamais employée dans les parcours qui dépendent d'indices source (notamment le
// surlignage de la recherche). Elle sert au lecteur, une fois les ancres et les
// offsets de la donnée déjà établis.
export function normaliserTypographieLecture(texte: string): string {
  const espace = texte
    .replace(new RegExp(`${ESPACES}*([;!?]+)`, 'g'), `${FINE}$1`)
    // Le deux-points n'est composé que lorsqu'il joue visiblement son rôle de
    // ponctuation (suivi d'une espace, d'un guillemet, d'une parenthèse ou de la
    // fin). Ainsi le « : » de https:// reste strictement intact.
    .replace(new RegExp(`${ESPACES}*:(?=[\\s«“"(]|$)`, 'g'), `${INSECABLE}:`)
    .replace(new RegExp(`«${ESPACES}*`, 'g'), `«${FINE}`)
    .replace(new RegExp(`${ESPACES}*»`, 'g'), `${FINE}»`)
  return normaliserPonctuationCitations(espace)
}

// Texte en LANGUE ORIGINALE (latin, grec) : l'édition source porte la ponctuation
// COLLÉE (« valde: », « dixit: »), à l'anglaise, alors que le corpus français rend déjà
// une fine insécable avant les hautes ponctuations. Pour un couple bilingue homogène, on
// applique la même typographie (charte §3.1-3.2 : harmonisation mécanique « sans réécrire
// la langue de l'édition ») en AJOUTANT une fine insécable U+202F avant : ; ! ? et autour
// des guillemets. Idempotent : une espace déjà présente (simple, insécable ou fine) est
// ramenée à la fine unique ; rien n'est ajouté avant , . … .
export function normaliserEspacesOriginal(texte: string): string {
  return texte
    .replace(new RegExp(`${ESPACES}*([:;!?])`, 'g'), `${FINE}$1`)
    .replace(new RegExp(`«${ESPACES}*`, 'g'), `«${FINE}`)
    .replace(new RegExp(`${ESPACES}*»`, 'g'), `${FINE}»`)
}

// Texte SAISI par un auteur du site — titre, sous-titre et résumé d'une
// publication. À la différence du corpus, il n'a traversé aucun atelier
// d'édition : il arrive tel que le clavier l'a produit, apostrophe droite,
// ponctuation collée, guillemets droits, points de suspension en trois points.
// On lui applique donc la norme AU RENDU, jamais dans la donnée — l'auteur
// reste maître de son texte, et une règle qui changerait demain ne laisserait
// pas derrière elle un corpus à moitié converti.
//
// Fine insécable avant ; ! ? et autour des guillemets ; insécable PLEINE CHASSE
// avant le deux-points (règle de l'Imprimerie nationale, charte §3.2). Idempotente.
export function normaliserSaisie(texte: string): string {
  return texte
    .replace(/\.\.\./g, '…')
    // Les guillemets droits vont par paires : on ne convertit que les paires
    // complètes, un guillemet orphelin restant tel quel plutôt que de fermer
    // au hasard.
    .replace(/"([^"]*)"/g, `«${FINE}$1${FINE}»`)
    .replace(/'/g, '’')
    // Une suite de hautes ponctuations (« quoi ?! ») ne prend qu'UNE fine, en
    // tête : une par signe les écarterait les uns des autres.
    .replace(new RegExp(`${ESPACES}*([;!?]+)`, 'g'), `${FINE}$1`)
    .replace(new RegExp(`${ESPACES}*:`, 'g'), `${INSECABLE}:`)
    .replace(new RegExp(`«${ESPACES}*`, 'g'), `«${FINE}`)
    .replace(new RegExp(`${ESPACES}*»`, 'g'), `${FINE}»`)
    .trim()
}
