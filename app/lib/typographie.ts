// Espaces typographiques (charte §3.2). Fonctions PURES, testées dans typographie.test.ts.
// U+00A0 = espace insécable ; U+202F = espace fine insécable.

// Texte FRANÇAIS déjà espacé par le corpus (l'édition source porte les insécables) :
// on se contente d'harmoniser le TYPE d'espace — fine insécable avant ; ! ? et autour
// des guillemets. Le « : » conserve l'espace déjà présente (le corpus rend une fine).
export function normaliserEspaces(texte: string): string {
  return texte
    .replace(/ ([?!;])/g, ' $1')
    .replace(/« /g, '« ')
    .replace(/ »/g, ' »')
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
    .replace(/[   ]*([:;!?])/g, ' $1')
    .replace(/«[   ]*/g, '« ')
    .replace(/[   ]*»/g, ' »')
}
