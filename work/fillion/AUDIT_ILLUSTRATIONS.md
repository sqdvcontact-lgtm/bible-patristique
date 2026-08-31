# Audit des gravures de Fillion

⛔ **Ce fichier est ENGENDRÉ à chaque relevé.** Les arbitrages vivent dans
`AUDIT_DECISIONS.json`, qui se tient à la main : un relevé qui les recalculerait
effacerait la décision au passage suivant.

```bash
npx tsx --env-file=.env.local scripts/fillion/auditer-illustrations.mts
```

Relevé du 2026-08-31 · **208 gravures**, dont **114** portent au moins un défaut.

⚠️ **La mesure ne conclut pas : elle dit où REGARDER.** Trois mesures ont déjà
accusé à tort — les coins d’un fichier rogné, la confrontation au scan, le filet
d’un cadre gravé pris pour un filet de page. Un défaut marqué **vu** a été
contrôlé à l’agrandissement ; les autres attendent l’œil.

| défaut | ⛔ | ⚠️ | · | état |
|---|---:|---:|---:|---|
| [`planche_tournee_trop_petite`](#planchetourneetroppetite) |  | 28 |  | à traiter |
| [`legende_emportee`](#legendeemportee) | 1 | 1 |  | à traiter |
| [`trait_sous_le_pixel`](#traitsouslepixel) |  | 9 | 10 | à traiter |
| [`trop_haute`](#trophaute) |  | 5 | 3 | à traiter |
| [`filet_de_bord`](#filetdebord) |  |  | 39 | à traiter |
| [`trop_large_pour_habiller`](#troplargepourhabiller) |  |  | 30 | accepté |
| [`trop_pale`](#troppale) |  |  | 27 | à traiter |
| [`filet_de_page`](#filetdepage) |  | 2 |  | à traiter |
| [`agrandie_par_le_plancher`](#agrandieparleplancher) |  |  | 6 | à traiter |
| [`voile`](#voile) |  |  | 4 | accepté |
| [`bande_en_pied`](#bandeenpied) |  |  | 3 | à traiter |
| [`regime_force`](#regimeforce) |  |  | 3 | accepté |
| [`sans_legende`](#sanslegende) |  |  | 2 | accepté |
| [`decoupe_serree`](#decoupeserree) |  |  | 1 | à traiter |
| [`cle_hors_convention`](#clehorsconvention) |  |  | 1 | à traiter |

## `planche_tournee_trop_petite` — 28 gravures · à traiter

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t01-p0143-i01` | GEN | hors-texte | 440×297 | ⚠️ | planche redressée, 440×297 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0185-i01` | GEN | hors-texte | 440×279 | ⚠️ | planche redressée, 440×279 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0201-i01` | GEN | hors-texte | 440×279 | ⚠️ | planche redressée, 440×279 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0215-i01` | GEN | hors-texte | 440×279 | ⚠️ | planche redressée, 440×279 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0237-i01` | EXO | hors-texte | 440×249 | ⚠️ | planche redressée, 440×249 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0259-i01` | EXO | hors-texte | 440×270 | ⚠️ | planche redressée, 440×270 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0283-i01` | EXO | hors-texte | 440×273 | ⚠️ | planche redressée, 440×273 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0357-i01` | EXO | hors-texte | 440×282 | ⚠️ | planche redressée, 440×282 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0443-i01` | LEV | hors-texte | 440×273 | ⚠️ | planche redressée, 440×273 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0485-i01` | NUM | hors-texte | 440×276 | ⚠️ | planche redressée, 440×276 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0533-i01` | NUM | hors-texte | 440×276 | ⚠️ | planche redressée, 440×276 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0577-i01` | NUM | hors-texte | 440×279 | ⚠️ | planche redressée, 440×279 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0651-i01` | DEU | hors-texte | 440×279 | ⚠️ | planche redressée, 440×279 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0691-i01` | DEU | hors-texte | 440×279 | ⚠️ | planche redressée, 440×279 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0707-i01` | DEU | hors-texte | 440×279 | ⚠️ | planche redressée, 440×279 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0379-i01` | LEV | hors-texte | 440×273 | ⚠️ | planche redressée, 440×273 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0405-i01` | LEV | hors-texte | 440×270 | ⚠️ | planche redressée, 440×270 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0515-i01` | NUM | hors-texte | 440×276 | ⚠️ | planche redressée, 440×276 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0529-i01` | NUM | hors-texte | 440×276 | ⚠️ | planche redressée, 440×276 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0059-i01` | GEN | hors-texte | 440×269 | ⚠️ | planche redressée, 440×269 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0071-i01` | GEN | hors-texte | 440×287 | ⚠️ | planche redressée, 440×287 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0083-i01` | GEN | hors-texte | 440×276 | ⚠️ | planche redressée, 440×276 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0111-i01` | GEN | hors-texte | 440×276 | ⚠️ | planche redressée, 440×276 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0135-i01` | GEN | hors-texte | 440×290 | ⚠️ | planche redressée, 440×290 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0163-i01` | GEN | hors-texte | 440×276 | ⚠️ | planche redressée, 440×276 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0291-i01` | EXO | hors-texte | 440×240 | ⚠️ | planche redressée, 440×240 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0725-i01` | DEU | hors-texte | 440×279 | ⚠️ | planche redressée, 440×279 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |
| `t01-p0741-i01` | DEU | hors-texte | 440×274 | ⚠️ | planche redressée, 440×274 px : son contenu est réduit de moitié en plus qu'une planche debout, et ses légendes imprimées ne se lisent plus |

## `legende_emportee` — 2 gravures · à traiter

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0059-i01` | MAT | vignette | 218×163 | ⛔ **vu** | la légende imprimée est dans la découpe ET COUPÉE EN DEUX : on n’en lit que le haut des lettres |
| `t07-p0055-i01` | MAT | vignette | 219×200 | ⚠️ **vu** | la légende imprimée est dans la découpe, sur deux lignes, et la page la recompose dessous : elle paraît deux fois |

## `trait_sous_le_pixel` — 19 gravures · à traiter

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t01-p0143-i01` | GEN | hors-texte | 440×297 | · | le trait mesure 0.84 px à l’arrivée |
| `t01-p0185-i01` | GEN | hors-texte | 440×279 | ⚠️ | le trait mesure 0.74 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0201-i01` | GEN | hors-texte | 440×279 | · | le trait mesure 0.85 px à l’arrivée |
| `t01-p0215-i01` | GEN | hors-texte | 440×279 | ⚠️ | le trait mesure 0.71 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0237-i01` | EXO | hors-texte | 440×249 | ⚠️ | le trait mesure 0.46 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0259-i01` | EXO | hors-texte | 440×270 | · | le trait mesure 0.99 px à l’arrivée |
| `t01-p0283-i01` | EXO | hors-texte | 440×273 | ⚠️ | le trait mesure 0.70 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0357-i01` | EXO | hors-texte | 440×282 | ⚠️ | le trait mesure 0.77 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0443-i01` | LEV | hors-texte | 440×273 | ⚠️ | le trait mesure 0.73 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0485-i01` | NUM | hors-texte | 440×276 | ⚠️ | le trait mesure 0.56 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0533-i01` | NUM | hors-texte | 440×276 | ⚠️ | le trait mesure 0.64 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0577-i01` | NUM | hors-texte | 440×279 | ⚠️ | le trait mesure 0.54 px à l’arrivée : la hachure ne peut plus être rendue |
| `t01-p0651-i01` | DEU | hors-texte | 440×279 | · | le trait mesure 0.93 px à l’arrivée |
| `t01-p0691-i01` | DEU | hors-texte | 440×279 | · | le trait mesure 0.91 px à l’arrivée |
| `t01-p0707-i01` | DEU | hors-texte | 440×279 | · | le trait mesure 0.88 px à l’arrivée |
| `t07-p0056-i01` | MAT | vignette | 202×204 | · | le trait mesure 0.94 px à l’arrivée |
| `t07-p0458-i01` | LUK | vignette | 280×160 | · | le trait mesure 0.98 px à l’arrivée |
| `t07-p0192-i01` | MAT | vignette | 180×139 | · | le trait mesure 0.99 px à l’arrivée |
| `t07-p0402-i01` | LUK | vignette | 202×203 | · | le trait mesure 0.86 px à l’arrivée |

## `trop_haute` — 8 gravures · à traiter

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t01-p0043-i01` | GEN | hors-texte | 440×718 | ⚠️ | 440×718 px : plus haute qu’un écran de portable |
| `t01-p0323-i01` | EXO | hors-texte | 440×679 | ⚠️ | 440×679 px : plus haute qu’un écran de portable |
| `t07-p0098-i01` | MAT | vignette | 180×864 | ⚠️ | 180×864 px : plus haute qu’un écran de portable |
| `t01-p0115-i01` | GEN | hors-texte | 440×970 | ⚠️ | 440×970 px : plus haute qu’un écran de portable |
| `t01-p0225-i01` | EXO | hors-texte | 440×680 | ⚠️ | 440×680 px : plus haute qu’un écran de portable |
| `t07-p0343-i01` | LUK | vignette | 180×487 | · | 180×487 px |
| `t07-p0449-i01` | LUK | vignette | 196×516 | · | 196×516 px |
| `t07-p0493-i01` | JHN | vignette | 180×595 | · | 180×595 px |

## `filet_de_bord` — 39 gravures · à traiter

> La mesure confond un filet de page avec le cadre GRAVÉ d'un bas-relief : chaque cas se regarde avant d'être cru.

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0417-i01` | LUK | vignette | 230×129 | · | une règle droite longe le bord droite : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0217-composite-proposal` | MRK | vignette | 249×157 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0179-i01` | MAT | au-fil | 180×153 | · | une règle droite longe les bords droite et haut : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0225-i01` | MRK | vignette | 280×166 | · | une règle droite longe le bord droite : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0351-i01` | LUK | vignette | 256×195 | · | une règle droite longe les bords haut et bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0388-i01` | LUK | vignette | 267×178 | · | une règle droite longe le bord droite : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0389-i01` | LUK | vignette | 238×152 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0395-i01` | LUK | vignette | 276×190 | · | une règle droite longe les bords gauche et droite et haut : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0439-i01` | LUK | vignette | 235×188 | · | une règle droite longe le bord droite : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0443-i01` | LUK | au-fil | 280×413 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0452-i01` | LUK | vignette | 280×211 | · | une règle droite longe le bord gauche : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0033-i01` | MAT | au-fil | 413×234 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0037-i01` | MAT | vignette | 180×227 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0044-i01` | MAT | au-fil | 418×248 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0054-i01` | MAT | vignette | 180×208 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0066-i01` | MAT | au-fil | 407×280 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0072-i01` | MAT | vignette | 180×234 | · | une règle droite longe le bord haut : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0085-i01` | MAT | au-fil | 358×214 | · | une règle droite longe les bords gauche et droite et bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0087-i01` | MAT | vignette | 180×237 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0107-i01` | MAT | au-fil | 346×212 | · | une règle droite longe le bord droite : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0116-i01` | MAT | au-fil | 395×266 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0139-i01` | MAT | vignette | 222×174 | · | une règle droite longe les bords haut et bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0202-i01` | MRK | au-fil | 344×213 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0212-i01` | MRK | au-fil | 423×295 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0221-i01` | MRK | vignette | 180×224 | · | une règle droite longe le bord haut : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0305-i01` | LUK | au-fil | 401×251 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0310-i01` | LUK | vignette | 195×140 | · | une règle droite longe le bord haut : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0326-i01` | LUK | au-fil | 410×241 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0354-i01` | LUK | au-fil | 335×194 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0359-i01` | LUK | vignette | 180×244 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0434-i01` | LUK | au-fil | 367×220 | · | une règle droite longe les bords gauche et bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0446-i01` | LUK | vignette | 186×176 | · | une règle droite longe les bords gauche et haut : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0453-i01` | LUK | vignette | 180×354 | · | une règle droite longe les bords gauche et bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0479-i01` | JHN | vignette | 370×283 | · | une règle droite longe le bord droite : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0490-i01` | JHN | vignette | 405×239 | · | une règle droite longe les bords gauche et droite : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0491-i01` | JHN | au-fil | 423×281 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0497-i01` | JHN | au-fil | 409×270 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0507-i01` | JHN | au-fil | 440×279 | · | une règle droite longe les bords gauche et droite et haut : filet de page, ou cadre gravé incomplet — à regarder |
| `t07-p0564-i01` | JHN | vignette | 192×191 | · | une règle droite longe le bord bas : filet de page, ou cadre gravé incomplet — à regarder |

## `trop_large_pour_habiller` — 30 gravures · accepté

> Décision du 30 août 2026 : au-delà de 45 % de la colonne il ne reste pas deux cents pixels de piste, et la gravure se centre. Ce n'est pas un défaut mais la règle.

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0417-i01` | LUK | vignette | 230×129 | · | 46 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0418-i01` | LUK | vignette | 233×273 | · | 47 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0064-i01` | MAT | vignette | 239×104 | · | 48 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0217-composite-proposal` | MRK | vignette | 249×157 | · | 50 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0225-i01` | MRK | vignette | 280×166 | · | 56 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0344-i01` | LUK | vignette | 241×141 | · | 48 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0351-i01` | LUK | vignette | 256×195 | · | 51 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0388-i01` | LUK | vignette | 267×178 | · | 53 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0389-i01` | LUK | vignette | 238×152 | · | 48 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0395-i01` | LUK | vignette | 276×190 | · | 55 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0408-i01` | LUK | vignette | 230×165 | · | 46 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0439-i01` | LUK | vignette | 235×188 | · | 47 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0452-i01` | LUK | vignette | 280×211 | · | 56 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0458-i01` | LUK | vignette | 280×160 | · | 56 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0078-i01` | MAT | vignette | 279×125 | · | 56 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0124-i01` | MAT | vignette | 255×118 | · | 51 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0141-i01` | MAT | vignette | 225×146 | · | 45 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0152-i01` | MAT | vignette | 277×144 | · | 55 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0163-i01` | MAT | vignette | 280×157 | · | 56 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0173-i01` | MAT | vignette | 254×147 | · | 51 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0177-i01` | MAT | vignette | 280×184 | · | 56 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0213-i01` | MRK | vignette | 227×117 | · | 45 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0321-i02` | LUK | vignette | 240×170 | · | 48 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0333-i01` | LUK | vignette | 233×238 | · | 47 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0376-i01` | LUK | vignette | 269×133 | · | 54 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0383-i01` | LUK | vignette | 230×316 | · | 46 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0386-i01` | LUK | vignette | 235×208 | · | 47 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0399-i01` | LUK | vignette | 279×127 | · | 56 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0436-i01` | LUK | vignette | 228×149 | · | 46 % de la colonne : elle se centre au lieu d’être habillée par le texte |
| `t07-p0461-i01` | LUK | vignette | 241×244 | · | 48 % de la colonne : elle se centre au lieu d’être habillée par le texte |

## `trop_pale` — 27 gravures · à traiter

> Recouvre en grande partie les planches tournées, dont tout le contenu est réduit.

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t01-p0143-i01` | GEN | hors-texte | 440×297 | · | 1.5 % d’encre vue à la taille d’affichage |
| `t01-p0185-i01` | GEN | hors-texte | 440×279 | · | 1.5 % d’encre vue à la taille d’affichage |
| `t01-p0201-i01` | GEN | hors-texte | 440×279 | · | 1.1 % d’encre vue à la taille d’affichage |
| `t01-p0215-i01` | GEN | hors-texte | 440×279 | · | 0.4 % d’encre vue à la taille d’affichage |
| `t01-p0237-i01` | EXO | hors-texte | 440×249 | · | 0.8 % d’encre vue à la taille d’affichage |
| `t01-p0259-i01` | EXO | hors-texte | 440×270 | · | 1.8 % d’encre vue à la taille d’affichage |
| `t01-p0283-i01` | EXO | hors-texte | 440×273 | · | 0.4 % d’encre vue à la taille d’affichage |
| `t01-p0357-i01` | EXO | hors-texte | 440×282 | · | 0.9 % d’encre vue à la taille d’affichage |
| `t01-p0443-i01` | LEV | hors-texte | 440×273 | · | 0.6 % d’encre vue à la taille d’affichage |
| `t01-p0485-i01` | NUM | hors-texte | 440×276 | · | 0.2 % d’encre vue à la taille d’affichage |
| `t01-p0533-i01` | NUM | hors-texte | 440×276 | · | 1.7 % d’encre vue à la taille d’affichage |
| `t01-p0577-i01` | NUM | hors-texte | 440×279 | · | 0.1 % d’encre vue à la taille d’affichage |
| `t01-p0651-i01` | DEU | hors-texte | 440×279 | · | 0.7 % d’encre vue à la taille d’affichage |
| `t01-p0691-i01` | DEU | hors-texte | 440×279 | · | 1.8 % d’encre vue à la taille d’affichage |
| `t01-p0707-i01` | DEU | hors-texte | 440×279 | · | 0.7 % d’encre vue à la taille d’affichage |
| `t07-p0418-i01` | LUK | vignette | 233×273 | · | 2.8 % d’encre vue à la taille d’affichage |
| `t01-p0043-i01` | GEN | hors-texte | 440×718 | · | 3.0 % d’encre vue à la taille d’affichage |
| `t01-p0323-i01` | EXO | hors-texte | 440×679 | · | 1.4 % d’encre vue à la taille d’affichage |
| `t01-p0379-i01` | LEV | hors-texte | 440×273 | · | 2.8 % d’encre vue à la taille d’affichage |
| `t01-p0405-i01` | LEV | hors-texte | 440×270 | · | 0.5 % d’encre vue à la taille d’affichage |
| `t01-p0515-i01` | NUM | hors-texte | 440×276 | · | 2.0 % d’encre vue à la taille d’affichage |
| `t01-p0529-i01` | NUM | hors-texte | 440×276 | · | 1.9 % d’encre vue à la taille d’affichage |
| `t07-p0064-i01` | MAT | vignette | 239×104 | · | 2.9 % d’encre vue à la taille d’affichage |
| `t07-p0056-i01` | MAT | vignette | 202×204 | · | 2.8 % d’encre vue à la taille d’affichage |
| `t07-p0344-i01` | LUK | vignette | 241×141 | · | 3.0 % d’encre vue à la taille d’affichage |
| `t07-p0408-i01` | LUK | vignette | 230×165 | · | 2.6 % d’encre vue à la taille d’affichage |
| `t07-p0322-i01` | LUK | vignette | 220×214 | · | 2.7 % d’encre vue à la taille d’affichage |

## `filet_de_page` — 2 gravures · à traiter

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0417-i01` | LUK | vignette | 230×129 | ⚠️ **vu** | un filet de colonne de la page court le long du bord droit, séparé du dessin par du papier vide |
| `t07-p0418-i01` | LUK | vignette | 233×273 | ⚠️ **vu** | un filet de colonne court le long du bord gauche, sur du papier vide |

## `agrandie_par_le_plancher` — 6 gravures · à traiter

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0098-i01` | MAT | vignette | 180×864 | · | montrée 2.53 fois plus large que Fillion ne l’imprime : 14 % de sa page contre 36 % de la colonne |
| `t07-p0343-i01` | LUK | vignette | 180×487 | · | montrée 2.07 fois plus large que Fillion ne l’imprime : 17 % de sa page contre 36 % de la colonne |
| `t07-p0349-i01` | LUK | vignette | 180×404 | · | montrée 2.37 fois plus large que Fillion ne l’imprime : 15 % de sa page contre 36 % de la colonne |
| `t07-p0357-i01` | LUK | vignette | 180×421 | · | montrée 2.25 fois plus large que Fillion ne l’imprime : 16 % de sa page contre 36 % de la colonne |
| `t07-p0403-i01` | LUK | vignette | 180×457 | · | montrée 2.05 fois plus large que Fillion ne l’imprime : 18 % de sa page contre 36 % de la colonne |
| `t07-p0424-i01` | LUK | vignette | 180×235 | · | montrée 2.07 fois plus large que Fillion ne l’imprime : 17 % de sa page contre 36 % de la colonne |

## `voile` — 4 gravures · accepté

> Mesuré à un alpha de 3 à 7 sur 3 à 5 % de la surface : sous le seuil de l'œil. À reprendre si un relevé le voit monter.

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0168-i01` | MAT | vignette | 437×97 | · | 3.6 % de la surface tient sur l’alpha 3 : un fond plat subsiste |
| `t07-p0092-i01` | MAT | vignette | 400×135 | · | 3.1 % de la surface tient sur l’alpha 7 : un fond plat subsiste |
| `t07-p0154-i02` | MAT | vignette | 220×71 | · | 3.2 % de la surface tient sur l’alpha 3 : un fond plat subsiste |
| `t07-p0187-i01` | MAT | vignette | 180×249 | · | 4.9 % de la surface tient sur l’alpha 3 : un fond plat subsiste |

## `bande_en_pied` — 3 gravures · à traiter

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0059-i01` | MAT | vignette | 218×163 | · | une bande d’encre isolée, 1.8 % de la hauteur, ferme la découpe : légende imprimée, ou filet |
| `t07-p0168-i01` | MAT | vignette | 437×97 | · | une bande d’encre isolée, 1.0 % de la hauteur, ferme la découpe : légende imprimée, ou filet |
| `t07-p0227-i01` | MRK | vignette | 180×208 | · | une bande d’encre isolée, 0.5 % de la hauteur, ferme la découpe : légende imprimée, ou filet |

## `regime_force` — 3 gravures · accepté

> Trois demi-teintes que la légende ne déclare pas, forcées après contrôle visuel le 31 août 2026 (charte § 35.16.19). Le signalement existe pour qu'on les retrouve, non pour qu'on les corrige.

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0179-i01` | MAT | au-fil | 180×153 | · | régime forcé à « au-fil » : demi-teinte : trame de points visible à l’agrandissement, légende sans mention de procédé |
| `t07-p0443-i01` | LUK | au-fil | 280×413 | · | régime forcé à « au-fil » : demi-teinte : trame de points visible à l’agrandissement, légende sans mention de procédé |
| `t07-p0309-i01` | LUK | au-fil | 397×290 | · | régime forcé à « au-fil » : demi-teinte : trame de points visible à l’agrandissement, légende sans mention de procédé |

## `sans_legende` — 2 gravures · accepté

> p0194 et p0462 sont des ORNEMENTS, un cul-de-lampe et un fleuron : un ornement ne porte pas de légende.

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0194-i01` | MAT | vignette | 333×84 | · | aucune légende, ni imprimée ni éditoriale |
| `t07-p0462-i01` | LUK | vignette | 385×97 | · | aucune légende, ni imprimée ni éditoriale |

## `decoupe_serree` — 1 gravures · à traiter

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0064-i01` | MAT | vignette | 239×104 | · **vu** | les avirons sortent du cadre à gauche : la découpe les coupe |

## `cle_hors_convention` — 1 gravures · à traiter

> p0217-composite-proposal, reste d'une manche abandonnée. La renommer déplace son chemin de stockage.

| gravure | livre | régime | affiché | | détail |
|---|---|---|---|---|---|
| `t07-p0217-composite-proposal` | MRK | vignette | 249×157 | · | la clé ne suit pas p<feuillet>-i<rang>, et elle voyage jusque dans le chemin de stockage |

## Sans défaut relevé — 94 gravures

`t07-p0025-i01` · `t07-p0029-i01` · `t07-p0031-i01` · `t07-p0032-i01` · `t07-p0041-i01` · `t07-p0043-i01` · `t07-p0046-i01` · `t07-p0051-i01` · `t07-p0052-i01` · `t07-p0058-i01` · `t07-p0061-i01` · `t07-p0067-i01` · `t07-p0070-i01` · `t07-p0075-i01` · `t07-p0083-i01` · `t07-p0093-i01` · `t07-p0098-i02` · `t07-p0099-i01` · `t07-p0104-i01` · `t07-p0108-i01` · `t07-p0109-i01` · `t07-p0112-i01` · `t07-p0115-i01` · `t07-p0123-i01` · `t07-p0126-i01` · `t07-p0132-i01` · `t07-p0133-i01` · `t07-p0146-i01` · `t07-p0148-i01` · `t07-p0154-i01` · `t07-p0155-i01` · `t07-p0160-i01` · `t07-p0165-i01` · `t07-p0185-i01` · `t07-p0190-i01` · `t07-p0207-i01` · `t07-p0209-i01` · `t07-p0219-i01` · `t07-p0224-i01` · `t07-p0294-i01` · `t07-p0297-i01` · `t07-p0308-i01` · `t07-p0318-i01` · `t07-p0321-i01` · `t07-p0327-i01` · `t07-p0329-i01` · `t07-p0336-i01` · `t07-p0338-i01` · `t07-p0338-i02` · `t07-p0340-i01` · `t07-p0346-i01` · `t07-p0347-i01` · `t07-p0350-i01` · `t07-p0356-i01` · `t07-p0360-i01` · `t07-p0363-i01` · `t07-p0370-i01` · `t07-p0372-i01` · `t07-p0379-i01` · `t07-p0381-i01` · `t07-p0383-i02` · `t07-p0387-i01` · `t07-p0390-i01` · `t07-p0393-i01` · `t07-p0397-i01` · `t07-p0404-i01` · `t07-p0405-i01` · `t07-p0406-i01` · `t07-p0411-i01` · `t07-p0413-i01` · `t07-p0414-i01` · `t07-p0422-i01` · `t07-p0427-i01` · `t07-p0430-i01` · `t07-p0432-i01` · `t07-p0442-i01` · `t07-p0442-i02` · `t07-p0457-i01` · `t07-p0471-i01` · `t07-p0472-i01` · `t07-p0473-i01` · `t07-p0475-i01` · `t07-p0477-i01` · `t07-p0478-i01` · `t07-p0483-i01` · `t07-p0486-i01` · `t07-p0488-i01` · `t07-p0494-i01` · `t07-p0498-i01` · `t07-p0512-i01` · `t07-p0555-i01` · `t07-p0583-i01` · `t07-p0593-i01` · `t07-p0606-i01`
