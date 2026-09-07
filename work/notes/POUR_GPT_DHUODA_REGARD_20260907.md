# Pour GPT — le latin en regard du français chez Dhuoda (7 septembre 2026, le soir)

Seconde passation du jour. Elle **prolonge** `POUR_GPT_STROPHES_ET_VERS_20260907.md` et ne
la répète pas : la question de `stanza_before` t'est déjà passée le matin, et elle reste
entière. Ici, autre chose.

Le rendu est corrigé, commité et poussé. Rien n'a été écrit en base : ni `segments`, ni
`segment_metadata`, ni `oeuvre_textes`, ni les tables d'alignement.

---

## 1. Ce qui a été corrigé côté rendu — pour que tu ne cherches pas un défaut résolu

L'auteur signalait qu'il n'avait « pas le lien entre le latin et le français » sur le
*Manuel pour mon fils*. **Ce n'était pas la donnée.** Tout ce que tu as posé est sain, et
je l'ai mesuré avant de toucher au code :

- l'œuvre est ouverte, ses deux textes sont `is_public` et `published` ;
- `TXT_A0176O0001_1887_BONDURAND` est bien le **latin**, et sa `langue = 'Latin'` est juste
  (vérifié sur le texte : « Cernens plurimos cum suis in sæculo gaudere proles… ») ;
- l'ensemble `A0176O0001:BONDURAND1887-CSIA2026:LA-FR:PARAGRAPH` couvre **exactement** les
  treize segments traduits, en cinq groupes, 13 membres de référence contre 13 alignés ;
- le second ensemble, au grain du segment, est `retired`, et le site l'écarte correctement ;
- la paire de lecture se calculait juste, et le menu offrait bien « Français & latin ».

C'était une **surface de rendu**, la même que le matin, prise par l'autre bout. Tes treize
segments français sont tous de nature `introduction` — et ce typage est juste, la mission
s'appelle `traduction-ia-prolegomenes`. Or l'introduction se rend hors des groupes, par une
branche à elle, et la grille bilingue ne vivait que dans la boucle des groupes, laquelle
écarte précisément ces segments. Bouton allumé, une seule colonne.

Corrigé : la branche de l'argument découpe désormais ses blocs par `repartirGroupes` et
compose sa colonne en regard. Charte **§ 12.3**, `AGENTS.md` mis à jour. **La correction ne
sert pas que Dhuoda** — trois œuvres publiques portent des segments d'introduction sur ce
chemin ET un alignement vivant :

| œuvre | segments d'introduction concernés |
|---|---:|
| `A0176O0001` — *Manuel pour mon fils* | 107 |
| `A0010O0023` — *Questions sur l'Heptateuque* | 12 |
| `A0010O0002` — *La Cité de Dieu* | 6 |

*(Les Confessions et le Discours 38 ont aussi des segments d'`espace_textuel = 'introduction'`,
mais d'une autre nature : ils coulent dans le corps et se composaient déjà juste.)*

---

## 2. Ce qui te revient : l'ÉTENDUE de la traduction

C'est le seul vrai manque, et aucune correction de rendu ne le remplacera.

| `TXT_A0176O0001_1887_BONDURAND` (latin) | segments | dont vers |
|---|---:|---:|
| introduction / `introduction` | 94 | 79 |
| corps / `texte` | **690** | 56 |
| corps / `citation` | 19 | 19 |
| corps / `apparat_auteur` | 3 | 0 |
| corps / `texte absent` | 1 | 0 |
| apparat critique / `apparat_editeur` | 2 | 0 |

| `TXT_A0176O0001_FR_IA_2026` (français) | segments | dont vers |
|---|---:|---:|
| introduction / `introduction` | **13** | 12 |

**Treize segments français contre 809 latins.** La grille réparée ne met donc en regard
que le prologue et l'épigramme ; les 690 segments du *Manuel* proprement dit n'ont aucun
français en face, et c'est ce que le lecteur verra. Ton ensemble d'alignement le dit déjà
lui-même (`incremental_progressive_translation_alignment`), et sa politique incrémentale
tient : chaque passe ajoute ses segments français au groupe de paragraphe latin
correspondant, sans rien changer au dispositif.

### ⛔ Le piège de la passe suivante : la NATURE des segments à venir

Quand la traduction sortira des prolégomènes, ses segments doivent porter
`espace_textuel = 'corps'` et `nature = 'texte'`, comme le latin qu'ils traduisent.

**Ne pas continuer en `introduction` par inertie.** Ce serait ranger tout le *Manuel* dans
son propre argument : il se composerait en petit corps italique effacé, hors des groupes,
hors de la pagination, hors du sommaire — et sans lettrine. Les treize actuels sont en
`introduction` parce que ce SONT les prolégomènes, non parce que c'est le typage de ce
texte.

---

## 3. Une trouvaille au passage : l'ACROSTICHE, à ne pas « corriger »

`segment_metadata.indent_inches` est **nul sur les 822 segments de l'œuvre**, latin
compris : tous les vers se composent au fer, rang 0.

⚠️ **Pour l'*Epigramma*, c'est vraisemblablement juste, et il ne faut pas y toucher.** Le
poème est un acrostiche, et il le déclare : « Lector qui cupis formulam hanc nosse, **capita
perquiras apta versorum** ». Un alinéa poétique casserait l'alignement des initiales, qui
EST le sens du poème. Si tu relèves un jour les alinéas de Bondurand, ce poème est
l'exception à écrire.

⚠️ **Et cela touche la question de la strophe qui t'est passée ce matin.** Sur un acrostiche,
une frontière de strophe posée au mauvais endroit ne fait pas qu'ouvrir un blanc : elle
coupe la phrase à lire en colonne. Les 17 strophes de l'introduction sont toutes déduites
de `paragraphe`, et 8 d'entre elles (47 %) s'ouvrent au milieu d'une phrase, contre 7,7 %
chez Ceriziers, le seul témoin dont les strophes aient été lues sur la page. Le fac-similé
Bondurand 1887 tranchera les deux questions d'un coup.

⚠️ **Question d'auteur, que je signale sans la trancher** : la colonne française ne porte
aucun acrostiche — une traduction ne le conserve pas. Faut-il le dire au lecteur qui lit
les deux colonnes en regard ? Ce n'est ni un défaut de donnée ni un défaut de rendu.

---

## 4. Ce qu'il ne faut PAS faire

- ⛔ **Ne pas re-typer les treize segments français en `corps`** pour obtenir la grille :
  elle fonctionne maintenant sur l'introduction, et le typage actuel est juste.
- ⛔ **Ne pas remplir `segments.texte_original`.** La colonne est vide des deux côtés, et
  c'est bien : l'alignement prime sans condition, et cette colonne est en extinction
  (charte § 12.1). La remplir créerait une seconde vérité qui ne peut que diverger.
- ⛔ **Ne pas toucher `langue = 'Latin'` sur Bondurand** : c'est juste. *(Une note
  d'`AGENTS.md` décrivait ce texte comme « l'édition française Bondurand 1887 » ; c'est la
  note qui avait tort, et je ne l'ai pas corrigée — elle est à toi.)*
- ⛔ **Ne pas supprimer ni réveiller l'ensemble `…:SEGMENT`** : `retired` est le bon état,
  et le site l'écarte comme il doit.

---

## 5. Comment vérifier, quand tu auras traduit

Rien à faire côté site. Ouvre `/oeuvre/A0176O0001`, choisis « Français & latin » dans le
volet de gauche : les paragraphes que tu auras alignés paraîtront en deux colonnes, le
français à gauche, le latin à droite, un filet entre les rangées. Un empan que l'alignement
couvre sans que tu l'aies traduit garde sa grille avec une colonne droite vide — c'est
voulu, et c'est ce qui dit au lecteur où la traduction s'arrête.
