// Met à jour la charte d'accentuation (parametres.cle='charte_accentuation').
// Elle était vide : on l'initialise avec le modèle de référence et on ajoute la section
// des occurrences rencontrées sur la Bible Segond 1910 (TR0002).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const SEGOND = `### Bible Segond 1910 — TR0002 (juillet 2026)

**Préposition et interjection**
A → À (préposition « à » en tête de proposition — 463 occurrences)
O → Ô (interjection d'invocation « ô » : Ô Éternel, Ô Dieu, Ô roi… — 108 occurrences)

**Mots courants**
Egypte → Égypte · Epouvantés → Épouvantés · Etranglait → Étranglait · Ote → Ôte · Otez → Ôtez · Oter → Ôter · Iles → Îles

**Nom propre**
Eve → Ève

**Fusions corrigées (espace manquant, hors accentuation mais rencontré)**
Etquiconque → Et quiconque · Etce → Et ce · Etsi → Et si

**Rencontré et NON corrigé (à dessein)**
Mots en Ec-/Es-/Ex- (Ecclésiaste, Espère, Exalté, Examinez…) : pas d'accent initial.
Noms propres hébreux non accentués en français (Esther, Esdras, Elkana, Emmanuel, Esrom…) : inchangés.`

const charte = `# Charte d'accentuation des majuscules — Corpus Scriptura

Document vivant. Chaque passe de correction sur une nouvelle œuvre alimente ce registre. Ne pas pré-remplir théoriquement : n'inscrire que ce qui a été rencontré et corrigé.

Règle générale : en français, les majuscules s'accentuent (Académie française). Une majuscule non accentuée est une faute, jamais une option. Principaux cas : É (le plus fréquent), À, Â, Ô, Î, Ç, Œ.

---

## Occurrences confirmées

### La Cité de Dieu — A0010O0002 (juillet 2026)

**Noms propres bibliques**
Elie → Élie · Elisée → Élisée · Elisabeth → Élisabeth · Ezéchias → Ézéchias

**Noms propres géographiques et philosophiques**
Epire → Épire · Epicure / Epicuriens → Épicure / Épicuriens · Epictète → Épictète · Epiphane → Épiphane · Etrusque → Étrusque

**Verbes et adjectifs courants**
Ecoutez → Écoutez · Etrange → Étrange · Etait → Était · Etaient → Étaient · Egalement → Également · Eprouvez → Éprouvez

${SEGOND}

---

## Faux positifs à ne pas toucher

En, Et, Elle, Elles, Eux, Entre, Est, Enfin, Encore, Ensuite, Entier, Environ, Envers, Envoi — pas d'accent en minuscule, donc pas d'accent en majuscule.

Mots latins en début de segment (Ecce, Esto, Ergo…) : ne pas accentuer.

---

## Règles typographiques générales

### Majuscules accentuées

Eglise → Église

### Ligatures

oe → œ · Oe → Œ

### Majuscules abusives sur adjectifs / noms communs à valeur générique

Les noms « saint/sainte » employés comme adjectif qualificatif ou épithète ne prennent pas de majuscule :

- les Saints → les saints
- le Saint → le saint
- les Saintes → les saintes
- la Sainte → la sainte
- des Saints → des saints
- un Saint → un saint
- des Saintes → des saintes
- une Sainte → une sainte

⚠ Exception : Saint + nom propre (Saint Pierre, Saint Paul…) conserve la majuscule.

### Saint-Esprit

- saint Esprit → Saint-Esprit
- Saint Esprit → Saint-Esprit
- Esprit-Saint → Esprit saint
- Esprit Saint → Esprit saint

### Espaces multiples

- [espace][espace] → [espace] (supprimer les doubles espaces)

---

## Requête de diagnostic (à adapter par œuvre)

\`\`\`sql
SELECT id, segment_numero, segment_texte
FROM segments
WHERE segment_texte ~ '(^|[[:space:]«—])E[clbgptzéèêîïr]'
  AND id_oeuvre = 'XXXXXXXX'
ORDER BY segment_numero;
\`\`\`
`

const mis_a_jour = new Date().toISOString()
const { error } = await sb.from('parametres').upsert({ cle:'charte_accentuation', valeur: charte, mis_a_jour })
console.log(error ? ('ERR '+error.message) : ('Charte enregistrée : '+charte.length+' caractères, maj '+mis_a_jour))
