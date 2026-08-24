// Habillage commun du centre de contrôle et de sa page de statistiques.
// Les deux écrans partagent les mêmes cartes, tuiles et jauges ; seule la
// matière change. Un seul fichier évite que l'un dérive de l'autre.
export const CSS_CONTROLE = `
  .cc-page { min-height: calc(100vh - 3.5rem); background: var(--cs-fond); padding: 1.75rem 1.5rem 3rem; }
  .cc-entete { max-width: 74rem; margin: 0 auto 1.25rem; display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .cc-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.75rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0; }
  .cc-sous-titre { font-size: 0.875rem; color: var(--cs-texte-doux); margin: 2px 0 0; font-style: italic; font-family: var(--font-source-serif), Georgia, serif; }
  .cc-horodatage { font-size: 0.75rem; color: var(--cs-texte-doux); font-family: var(--font-source-sans), Arial, sans-serif; }

  .cc-grille { max-width: 74rem; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 30rem), 1fr)); gap: 1.25rem; align-items: start; }

  .cc-carte { background: var(--cs-surface); border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 1.125rem 1.25rem 0.875rem; display: flex; flex-direction: column; }
  .cc-carte-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.1875rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0 0 0.875rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--cs-bord-clair); }
  .cc-carte-corps { display: flex; flex-direction: column; gap: 0.5rem; }
  .cc-carte-pied { margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--cs-bord-clair); font-size: 0.6875rem; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; }

  .cc-tuiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: 0.625rem; }
  .cc-tuile { background: var(--cs-fond-clair); border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 0.625rem 0.75rem; }
  .cc-tuile-val { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.375rem; line-height: 1.1; }
  .cc-tuile-lbl { font-size: 0.6875rem; color: var(--cs-texte-second); margin-top: 0.25rem; font-family: var(--font-source-sans), Arial, sans-serif; line-height: 1.3; }

  .cc-jauge { margin: 0.375rem 0; }
  .cc-jauge-tete { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
  .cc-jauge-lbl { font-size: 0.8125rem; color: var(--cs-texte); font-family: var(--font-source-sans), Arial, sans-serif; }
  .cc-jauge-pct { font-family: var(--font-source-serif), Georgia, serif; font-size: 1rem; font-weight: 600; }
  .cc-jauge-piste { height: 7px; background: var(--cs-fond-doux); border-radius: 4px; overflow: hidden; margin: 0.3125rem 0 0.25rem; }
  .cc-jauge-remplissage { height: 100%; border-radius: 4px; transition: none; }
  .cc-jauge-detail { font-size: 0.6875rem; color: var(--cs-texte-doux); font-family: var(--font-source-sans), Arial, sans-serif; }

  .cc-note { margin-top: 0.875rem; background: var(--cs-vert-pale); border-left: 3px solid var(--cs-vert-aplat); border-radius: 0 8px 8px 0; padding: 0.625rem 0.75rem; }
  .cc-note-tete { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-vert); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin-bottom: 0.25rem; }
  /* ⚠️ « pre-line » : les notes de section sont RÉDIGÉES en paragraphes, et six des neuf en
     contenaient déjà au 2026-08-24. Sans lui, le rendu les coule d'un seul tenant : la note
     de la Chronologie ouvrait sur « [AUDIT_CHRONOLOGIE_2026-08-12] » collé à sa première
     phrase, et l'on ne pouvait plus lire une note un peu longue. Il n'écrase que les suites
     d'espaces, jamais les retours voulus. */
  .cc-note-txt { font-size: 0.8125rem; color: var(--cs-texte); line-height: 1.5; margin: 0; font-family: var(--font-source-serif), Georgia, serif; white-space: pre-line; }

  .cc-todos { margin-top: 0.75rem; }
  .cc-todos-tete { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-second); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin-bottom: 0.375rem; }
  .cc-todos-compte { color: var(--cs-texte-doux); font-weight: 500; margin-left: 0.25rem; }
  .cc-todos-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
  .cc-todo { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8125rem; color: var(--cs-texte); font-family: var(--font-source-sans), Arial, sans-serif; line-height: 1.4; }
  .cc-todo-case { flex-shrink: 0; width: 1rem; height: 1rem; border: 1px solid var(--cs-bord); border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--cs-vert); margin-top: 0.0625rem; }
  .cc-todo-fait .cc-todo-case { background: var(--cs-vert-aplat); border-color: var(--cs-vert-aplat); color: var(--cs-sur-aplat); }
  .cc-todo-fait .cc-todo-txt { color: var(--cs-texte-doux); text-decoration: line-through; }

  /* — Édition discrète des todos — */
  .cc-todo { position: relative; padding-right: 3rem; }
  .cc-todo-txt { flex: 1; }
  button.cc-todo-case { cursor: pointer; padding: 0; background: transparent; transition: border-color .12s; }
  button.cc-todo-case:hover { border-color: var(--cs-vert); }
  button.cc-todo-case:disabled { cursor: default; }
  .cc-todo-actions { position: absolute; right: 0; top: 0; display: inline-flex; gap: 0.125rem; opacity: 0; transition: opacity .12s; }
  .cc-todo:hover .cc-todo-actions, .cc-todo:focus-within .cc-todo-actions { opacity: 1; }
  .cc-todo-btn { border: none; background: transparent; cursor: pointer; font-size: 0.8125rem; line-height: 1; color: var(--cs-texte-faible); padding: 0.125rem 0.3125rem; border-radius: 4px; font-family: var(--font-source-sans), Arial, sans-serif; }
  .cc-todo-btn:hover { color: var(--cs-texte); background: var(--cs-fond-doux); }
  .cc-todo-btn-suppr { font-size: 1rem; }
  .cc-todo-btn-suppr:hover { color: var(--cs-danger); background: var(--cs-danger-fond); }
  .cc-todo-input { flex: 1; width: 100%; font-size: 0.8125rem; font-family: var(--font-source-sans), Arial, sans-serif; color: var(--cs-texte); line-height: 1.4; border: 1px solid var(--cs-bord); border-radius: 4px; padding: 0.1875rem 0.375rem; background: var(--cs-surface); resize: vertical; }
  .cc-todo-input:focus { outline: none; border-color: var(--cs-vert); }
  .cc-todo-ajout { margin-top: 0.375rem; }
  .cc-todo-ajout-btn { border: none; background: transparent; cursor: pointer; font-size: 0.75rem; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; padding: 0.125rem 0; opacity: 0.55; transition: opacity .12s, color .12s; }
  .cc-todos:hover .cc-todo-ajout-btn { opacity: 1; }
  .cc-todo-ajout-btn:hover { color: var(--cs-vert); }
  .cc-todo-erreur { font-size: 0.6875rem; color: var(--cs-danger); margin-top: 0.25rem; font-family: var(--font-source-sans), Arial, sans-serif; }
  @media (hover: none) { .cc-todo-actions { opacity: 1; } .cc-todo-ajout-btn { opacity: 1; } }

  /* Navigation entre le centre de contrôle et ses annexes. */
  .cc-retour { display: inline-block; font-size: 0.75rem; color: var(--cs-texte-doux); text-decoration: none; font-family: var(--font-source-sans), Arial, sans-serif; margin-bottom: 0.25rem; }
  .cc-retour:hover { color: var(--cs-vert); }

  .cc-mention { font-size: 0.6875rem; color: var(--cs-texte-doux); font-family: var(--font-source-sans), Arial, sans-serif; margin-top: 0.5rem; font-style: italic; }

  /* Mobile : les grilles sont déjà en auto-fill (une colonne sur téléphone) ; on
     resserre seulement les gouttières et le titre pour gagner de la place. */
  @media (max-width: 640px) {
    .cc-page { padding: 1rem 0.75rem 2.5rem; }
    .cc-entete { margin-bottom: 1rem; }
    .cc-titre { font-size: 1.375rem; }
    .cc-carte { padding: 1rem 0.875rem 0.75rem; }
    .cc-carte-titre { font-size: 1.0625rem; }
  }
`
