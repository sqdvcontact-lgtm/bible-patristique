/**
 * LES POINTS DE RUPTURE — une seule échelle pour la feuille et pour le script.
 *
 * Audit d'ergonomie du 2026-09-21 (volet transversal, constat 11) : onze seuils
 * différents se partageaient le site, 900, 640, 820 et 980 dans le script, 520,
 * 640, 700, 760, 820, 880, 900 et 980 dans les feuilles. Entre 820 et 980 px, la
 * feuille et le script ne disaient pas la même chose. Ils sont ramenés à quatre,
 * chacun nommé d'après ce qui change à ce point :
 *
 * - `telephone` (640) : une seule colonne, les grilles s'empilent (520, 700 et
 *   640 s'y sont rangés) ;
 * - `tablette` (820) : sous ce point la Polyglotte ne se lit plus (760 s'y range) ;
 * - `tiroirs` (900) : les volets latéraux deviennent des tiroirs ; c'est le seuil
 *   par défaut de `useEstMobile` (880 s'y range) ;
 * - `moyen` (1023) : jusque-là la barre de navigation reste repliée (elle se
 *   déploie au seuil `lg` de Tailwind, 1024), le texte en regard s'empile et la
 *   citation sortie resserre ses marges (980 s'y range ; 1023 et non 1024 pour que
 *   le script et la barre disent la même chose à 1024 px, largeur d'une tablette en
 *   paysage).
 *
 * ⛔ UNE REQUÊTE MÉDIA NE LIT PAS DE VARIABLE CSS : les feuilles écrivent donc la
 * valeur en clair (`max-width: 900px`, ou `min-width: 901px` pour le côté large).
 * Seule exception, nommée dans la garde : `min-width: 2400px`, jointe à une hauteur,
 * où la police racine atteint son plafond (page d'accueil).
 * Les gabarits des composants comme `globals.css` l'écrivent donc en chiffres,
 * et `pointsDeRupture.test.ts` refuse toute valeur hors de l'échelle.
 */
export const POINTS_DE_RUPTURE = {
  telephone: 640,
  tablette: 820,
  tiroirs: 900,
  moyen: 1023,
} as const

export type PointDeRupture = keyof typeof POINTS_DE_RUPTURE

/**
 * L'INDICE DU SERVEUR : la requête vient-elle d'un téléphone ? Sert la valeur
 * initiale de `useEstMobile`, pour que le HTML servi ait déjà la mise en page d'un
 * téléphone au lieu de basculer après le chargement du script.
 *
 * `Sec-CH-UA-Mobile` (Chromium) fait foi quand il est là ; sinon le user-agent :
 * « Mobi » couvre les téléphones Android, iPhone et Firefox mobile. ⚠️ L'iPad est
 * écarté (ses anciens user-agents portent « Mobile ») comme les tablettes Android
 * (sans « Mobile ») : une tablette est large en paysage, l'indice s'y tromperait.
 * Une erreur d'indice n'est jamais grave : le script rectifie au montage, comme
 * il le faisait toujours.
 */
export function estTelephone(secChUaMobile: string | null | undefined, userAgent: string | null | undefined): boolean {
  if (secChUaMobile === '?1') return true
  if (secChUaMobile === '?0') return false
  const ua = userAgent ?? ''
  if (/iPad/.test(ua)) return false
  return /Mobi|iPhone|iPod/.test(ua)
}
