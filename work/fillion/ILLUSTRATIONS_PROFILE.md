# Profil des illustrations Fillion

## Autorité et dérivés

Le PDF haché demeure la source d’autorité. Une exécution du profil `fillion-illustration` 1.1.0 produit deux fichiers fonctionnellement distincts :

| Rôle | Format | Paramètres | Accès prévu |
|---|---|---|---|
| `master` | PNG, gris 8 bits | résolution d’extraction, 400 ppp par défaut, sans perte | seau privé `bible-illustrations-master` |
| `web` | WebP | **le DOUBLE de la taille d’affichage**, sans agrandissement, qualité 90, Lanczos | seau public `bible-illustrations-web` |

> ⛔ **La ligne `web` ne dit plus « 1 600 px au plus », et ce n’est pas un
> assouplissement.** Un fichier se sert au double de sa taille d’affichage, jamais
> plus : au delà, le navigateur en fait une SECONDE réduction et deux réductions
> successives moyennent le trait en un gris mou. La taille d’affichage se calcule
> par `partIllustration` (`app/lib/bibleEdition.ts`), bornée à 0,36-0,88 de la
> colonne de 500 px — soit **360 à 880 px servis**. Les 32 planches du tome I ont
> vécu à 1 600 px pour 440 affichés, c’est-à-dire 3,64×, jusqu’au 30 août 2026.
>
> ⚠️ **Toucher à ces bornes oblige à rejouer `scripts/fillion/reduire-planches.mjs`**,
> sans quoi la page compose à une taille et les fichiers sont faits pour une autre.
>
> Doctrine complète : charte `parametres.charte_ia`, § 35.16.5 et § 35.16.12 à
> 35.16.16 — les deux bornes, le rattrapage bridé du ton continu, le nettoyage
> chirurgical du papier, et ce que la base doit dire de chaque fichier servi.

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
6. pour une planche sans aucun mot OCR, couvrant au moins 30 % de la page et nettement verticale, appliquer automatiquement la rotation horaire de 90° et l’inscrire au manifeste ;
7. convertir en niveaux de gris, puis blanchir le papier **CHIRURGICALEMENT** :
   étalement au pic de papier, qui ne perd rien, puis passage au blanc des seuls
   pixels clairs **sans encre dans un rayon de trois** — un trait clair est toujours
   bordé de trait plus sombre, le papier ouvert jamais. ⛔ Ne PAS blanchir tout ce
   qui dépasse le plancher : cela coûte 11 % de l’encre, 17 % sur le trait fin, et
   l’œil ne le voit pas (charte § 35.16.16) ;
8. supprimer seulement les petites composantes sombres isolées sous le seuil versionné ;
9. écarter la légende voisine lorsqu’un blanc horizontal la sépare nettement de la figure ;
10. produire le master, le WebP, les SHA-256, le manifeste et les planches QA.

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
  --page 202 `
  --volume-code t07 `
  --output work/fillion/pilot_illustrations/page_0202
```

Le script accepte `--pdftoppm` ou la variable `PDFTOPPM` lorsque Poppler n’est pas dans le `PATH`.
