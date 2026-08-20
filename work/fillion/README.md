# Atelier Fillion

Ce dossier reçoit les artefacts locaux du chantier Fillion. Les fac-similés restent les sources d’autorité. Aucun fichier placé ici ne devient publiable par sa seule présence.

## Ordre de travail

1. enregistrer chaque volume dans le registre des sources ;
2. calculer son empreinte SHA-256 ;
3. relever les pages présentes, absentes, répétées ou illisibles ;
4. produire les images ou extractions de travail ;
5. séparer texte latin, traduction française, blocs du corps, notes et illustrations ;
6. classer chaque bloc avec un niveau de confiance ;
7. conserver les références natives ;
8. proposer l’alignement canonique sans modifier les coordonnées natives ;
9. valider humainement les limites, les notes et les illustrations ;
10. produire un lot importable et un rapport de contrôle.

## Illustrations

Le pipeline `scripts/fillion/process_illustrations.py` part du PDF et de son XML DjVu OCR. Il masque les zones de texte reconnues, repère les régions graphiques, extrait les candidats à la résolution source et remet automatiquement à l’horizontale les planches hors texte qui satisfont la règle conservatrice du profil 1.1.0, puis produit :

- un master PNG en niveaux de gris, sans perte et non public ;
- un dérivé WebP limité à 1 600 px, qualité 90, destiné au site ;
- un manifeste JSON avec page, recadrage, profil, dimensions, poids et SHA-256 ;
- une planche de contrôle comparant la découpe source, le master et le dérivé web.

Le PDF reste l’autorité. La détection et le nettoyage ne confèrent jamais le statut `valide`. Les candidats ambigus, les recadrages proches du texte et les illustrations comportant plusieurs sujets distincts restent `a_valider`.

Après une production, `scripts/fillion/validate_illustration_manifests.py` recalcule les empreintes, relit les dimensions et vérifie récursivement toutes les paires master/web d’un lot, sans modifier les fichiers :

```powershell
python scripts/fillion/validate_illustration_manifests.py work/fillion/pilot_illustrations
```

## États admis

- `inventorie` : source décrite et hachée ;
- `a_preparer` : images ou pagination à préparer ;
- `ocr_candidat` : transcription automatique non relue ;
- `structure_candidate` : blocs classés automatiquement ;
- `a_valider` : arbitrage humain nécessaire ;
- `valide` : texte et structure confrontés au fac-similé ;
- `pret_import` : contrôles techniques réussis ;
- `importe` : relu depuis la base ;
- `publie` : visible après validation explicite.

Le statut `vérifié` n’est jamais déduit d’un score de confiance.
