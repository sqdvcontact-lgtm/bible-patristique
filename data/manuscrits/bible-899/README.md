# Bible 899 : source, manifeste et import

## Source maîtresse

Le lecteur de `app/manuscrits/bible-899` est construit directement depuis :

```text
data/manuscrits/bible-899/Bible_899_master.xml
```

Ce TEI est l’unique source textuelle maîtresse de la page. Aucun JSON textuel intermédiaire n’est conservé dans Corpus Scriptura.

Le fichier `manifest.json` enregistre la version éditoriale, l’empreinte SHA-256, la date de génération, les comptages structurels et la liste contrôlée des fac-similés. Le chargement échoue si le TEI ou une image ne correspond plus au manifeste.

Le fichier historique `app/manuscrits/bible-899/_lib/fixtures/prototype-v0.4.xml` est uniquement une fixture immuable de non-régression. Il permet de vérifier que le moteur général continue à produire les 120 lignes et les trois modes du prototype v0.4. Il n’est jamais lu par le site et ne constitue pas une source éditoriale active.

## Validation

Le schéma Relax NG documentaire se trouve ici :

```text
data/manuscrits/bible-899/schema/bible899-subset.rng
```

La validation TypeScript équivalente est exécutée par les tests, la génération du manifeste, l’import et la compilation. Elle fournit des erreurs localisées et vérifie notamment :

- les couples `abbr` et `expan` ;
- les attributs `reason` ou `cause` des `gap` ;
- le contenu identifiable des `unclear` ;
- les ajouts marginaux `add place="margin"`, affichés comme interventions éditoriales explicites ;
- la présence et l’unicité des `xml:id` de lignes ;
- les valeurs de `break` et la conservation de `break="no"` ;
- l’existence des images et des zones référencées.

Le parseur accepte des lignes contenues dans `<l>` ou introduites par des jalons `<lb>`. Le nombre de folios, de colonnes, de lignes et de paragraphes modernisés n’est pas fixé dans le moteur.

## Régénérer le manifeste

Après une modification éditoriale explicitement validée du TEI ou un remplacement autorisé d’image :

```powershell
Set-Location 'C:\Corpus Scriptura\bible-patristique'
& 'C:\Program Files\nodejs\npm.cmd' run bible899:manifest
```

Cette commande valide le TEI, vérifie les images, calcule toutes les empreintes et remplace uniquement `manifest.json`. Elle ne modifie jamais le TEI.

## Importer ou remplacer un TEI éditorial

Avant l’import, placer les images référencées dans :

```text
public/manuscrits/bible-899
```

Le nom de chaque fichier doit correspondre au dernier segment de sa référence `facs` ou `graphic` dans le TEI. Aucune coordonnée ne doit être inventée. Les références sans zone restent admises et sont signalées dans `control.missingCoordinates`.

Lancer ensuite :

```powershell
Set-Location 'C:\Corpus Scriptura\bible-patristique'
& 'C:\Program Files\nodejs\npm.cmd' run bible899:import -- 'C:\chemin\vers\le-nouveau-lot.xml'
```

La commande réalise dans cet ordre :

1. lecture du fichier candidat sans transformation ;
2. validation XML et TEI avec localisation des erreurs ;
3. vérification de tous les fac-similés ;
4. copie octet pour octet vers `Bible_899_master.xml` ;
5. calcul de l’empreinte et régénération du manifeste ;
6. exécution de tous les tests ;
7. compilation de production du site.

Si les tests ou la compilation échouent, le TEI maître et le manifeste précédents sont restaurés. La commande ne modernise, ne corrige et ne réécrit aucun contenu textuel.

## Vérifications manuelles

```powershell
& 'C:\Program Files\nodejs\npm.cmd' test
& 'C:\Program Files\nodejs\npx.cmd' eslint 'app/manuscrits/bible-899/**/*.{ts,tsx}' 'scripts/bible899/**/*.ts'
& 'C:\Program Files\nodejs\npm.cmd' run build
```
