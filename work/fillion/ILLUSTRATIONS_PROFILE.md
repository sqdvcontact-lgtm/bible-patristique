# Profil des illustrations Fillion

## Autorité et dérivés

Le PDF haché demeure la source d’autorité. Une exécution du profil `fillion-illustration` produit deux fichiers fonctionnellement distincts :

| Rôle | Format | Paramètres | Accès prévu |
|---|---|---|---|
| `master` | PNG, gris 8 bits | résolution d’extraction, 400 ppp par défaut, sans perte | seau privé `bible-illustrations-master` |
| `web` | WebP | 1 600 px au plus, sans agrandissement, qualité 90, Lanczos | seau public `bible-illustrations-web` |

Le WebP est toujours dérivé du master PNG. Les transformations dynamiques de Supabase ne sont pas l’autorité du fichier web : elles dépendent du forfait et peuvent servir plus tard à créer des tailles responsives supplémentaires.

Chemin cible recommandé :

```text
fillion/<code-volume>/<asset-key>/master.png
fillion/<code-volume>/<asset-key>/web.webp
```

## Détection et nettoyage

1. rendre la page à 120 ppp pour l’analyse et à 400 ppp pour le master ;
2. projeter les boîtes OCR DjVu et masquer le texte reconnu ;
3. repérer les composantes graphiques restantes ;
4. supprimer les candidats presque entièrement contenus dans une figure composite ;
5. reporter le recadrage sur le rendu à 400 ppp ;
6. convertir en niveaux de gris, normaliser le fond jauni et blanchir le papier résiduel ;
7. supprimer seulement les petites composantes sombres isolées sous le seuil versionné ;
8. écarter la légende voisine lorsqu’un blanc horizontal la sépare nettement de la figure ;
9. produire le master, le WebP, les SHA-256, le manifeste et les planches QA.

La légende imprimée est transcrite dans les métadonnées ; elle n’a pas besoin d’être incluse dans le bitmap nettoyé.

## Contrôle

Toute sortie porte `validation_status = review` et `requires_review = true`. Le contrôle visuel vérifie au minimum :

- aucun paragraphe ou morceau d’une figure voisine dans le master ;
- aucune amputation de trait, hachure, lettre interne ou bord de carte ;
- absence de poussière ou d’ombre de page gênante ;
- identité logique du master et du WebP ;
- recadrage, page, dimensions, poids et empreintes présents dans le manifeste ;
- texte alternatif et légende éditoriale préparés avant publication ;
- ancre sémantique relue sans effacer la position matérielle.

Une figure composite reste un seul actif lorsque l’édition la présente comme un ensemble. Deux figures voisines dont les rectangles se chevauchent sont conservées comme candidats séparés mais exigent une vérification du masque ou du recadrage.

## Commande pilote

```powershell
python scripts/fillion/process_illustrations.py `
  --pdf tmp/pdfs/fillion/lasaintebibletex07fill.pdf `
  --ocr tmp/pdfs/fillion/lasaintebibletex07fill_djvu.xml `
  --page 92 `
  --volume-code t07 `
  --output work/fillion/pilot_illustrations/page_0092_current
```

Le script accepte `--pdftoppm` ou la variable `PDFTOPPM` lorsque Poppler n’est pas dans le `PATH`.
