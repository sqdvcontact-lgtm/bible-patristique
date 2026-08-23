import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  //
  // ⚠️ Ces quatre-là ne suffisaient pas, et `npm run lint` — qui appelle `eslint`
  // sans argument — ne RENDAIT JAMAIS LA MAIN sur le poste de travail : il partait
  // à l'assaut de l'arbre entier, `public/` (1,8 Gio de fac-similés), `work/`,
  // `tmp/`, `audit/` (106 Mo de sauvegardes) et les `node_modules` imbriqués sous
  // `scripts/heptateuque/` et `outils/`. Arrêté au bout de dix minutes sans une
  // ligne de sortie ; borné à `app/`, le même lint répond en une minute.
  //
  // La CI ne voyait rien de tout cela : ces dossiers sont ignorés par git, donc
  // absents d'un `checkout`, et `verification.yml` appelle de surcroît
  // `npx eslint app` directement. Le contournement existait, la config est restée
  // cassée — et c'est le poste de travail, là où l'on écrit le code, qui perdait
  // son linter. Même remède que la suite de tests au point 4 de l'audit : on borne.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Dossiers d'atelier et de données : rien d'applicatif n'y vit.
    "public/**",
    "work/**",
    "tmp/**",
    "audit/**",
    "livraisons/**",
    "data/**",
    "sql/**",
    "supabase/**",
    "outils/**",
    "**/node_modules/**",
    "triage-temp.ts",
  ]),
  {
    rules: {
      // Le souligné en tête est notre convention pour ce qu'on écarte
      // volontairement : une capture d'erreur qu'on n'inspecte pas, un champ
      // déstructuré uniquement pour être retiré d'un objet. Le linter le
      // signalait comme du code mort, ce qui noyait les vrais oublis.
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
    },
  },
]);

export default eslintConfig;
