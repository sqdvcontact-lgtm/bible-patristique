# Audit OCR — Juges, pages scan 589 à 591

Contrôle intégral direct des fichiers `ws` contre les fac-similés `img`. Chaque objet JSONL donne une sous-chaîne exacte du `ws` et la leçon contrôlée au fac-similé. `⟦sic⟧` produit `[sic]` avec *sic* en italique.

## Page 589 — couverture confirmée : page entière

```json
{"page":589,"find":"Jug. 6, 31","replace":"Jug. VI, 31."}
{"page":589,"find":"d’avoir fabriqué, avec l’or du butin","replace":"d’avoir fabriqué avec l’or du butin"}
{"page":589,"find":"Id. 8, 27","replace":"Ib. VIII, 27."}
{"page":589,"find":"« qui, par la foi ont dompté","replace":"« qui par la foi ont dompté"}
{"page":589,"find":"à la foi et a la justice","replace":"à la foi et à la justice"}
{"page":589,"find":"Ib, 6, 39","replace":"Ib. VI, 39."}
{"page":589,"find":"ne pécha, point, contre","replace":"ne pécha point contre"}
{"page":589,"find":"Deu. 6, 16","replace":"Deut. VI, 16."}
{"page":589,"find":"à l’avance, ainsi, la toison","replace":"à l’avance ; ainsi, la toison"}
{"page":589,"find":"L’Esprit du Seigneur, fut sur Jephté","replace":"L’Esprit du Seigneur fut sur Jephté"}
{"page":589,"find":"tout ce qui arriva, ensuite","replace":"tout ce qui arriva ensuite"}
{"page":589,"find":"succès obtenu par ses arrhes","replace":"succès obtenu par ses armes"}
{"page":589,"find":"carnage de.l'ennemi","replace":"carnage de l’ennemi"}
{"page":589,"find":"servir a ses desseins","replace":"servir à ses desseins"}
{"page":589,"find":"lorsqu’il.persécutaitDavid","replace":"lorsqu’il persécutait David"}
{"page":589,"find":"1Sa. 19, 20-24","replace":"I Rois, XIX, 20-24."}
{"page":589,"find":"inspira, à ce juge d’Israël","replace":"inspira à ce juge d’Israël"}
{"page":589,"find":"Jn. 11, 49-51","replace":"Jean, XI, 49-51."}
```

Anomalie/doute : aucun.

## Page 590 — couverture confirmée : page entière

```json
{"page":590,"find":"Gédeon, en tout ceci","replace":"Gédéon, en tout ceci"}
{"page":590,"find":"par la même, comme le stratagème","replace":"par là même, comme le stratagème"}
{"page":590,"find":"Gen. 27, 15,16","replace":"Gen. XXVII, 15, 16."}
{"page":590,"find":"Jug. 7, 16-22","replace":"Jug. VII, 16-22."}
{"page":590,"find":"Gédéon parait avoir agi","replace":"Gédéon paraît avoir agi"}
{"page":590,"find":"selon cette parole de l’Apôtre« Nous portons","replace":"selon cette parole de l’Apôtre : « Nous portons"}
{"page":590,"find":"2Co. 4, 7","replace":"II Cor. IV, 7."}
{"page":590,"find":"fussent-ils figuré de ce qu’il convient de croire","replace":"fussent-ils figure de ce qu’il convient de croire"}
{"page":590,"find":"suivant la, justice","replace":"suivant la justice"}
{"page":590,"find":"victimes d’animaux étant d’un lisage quotidien","replace":"victimes d’animaux étant d’un usage quotidien"}
```

Anomalie/doute : le fac-similé imprime bien « les sacrifices humains, fussent-ils figure de ce qu’il convient de croire ». Le singulier « figure » paraît grammaticalement suspect, mais la leçon est conservée sans `[sic]` automatique : il ne s’agit pas avec certitude d’une coquille orthographique au sens de la nouvelle règle.

## Page 591 — couverture confirmée : page entière

```json
{"page":591,"find":"Cité de Dieu, l. 1, ch. 21.","replace":"Cité de Dieu, l. I, ch. 21."}
{"page":591,"find":"Luc. 24, 45, 27","replace":"Luc. XXIV, 45, 27."}
{"page":591,"find":"Jug. 8, 27 ; 10, 6-8","replace":"Jug. VIII, 27 ; X, 6, 8."}
```

Anomalie/doute : aucun.

## Total

- 31 corrections exactes : p. 589 = 18 ; p. 590 = 10 ; p. 591 = 3.
- 3/3 pages entièrement contrôlées au fac-similé.
- Une leçon imprimée douteuse consignée, sans ajout automatique de `[sic]`.
