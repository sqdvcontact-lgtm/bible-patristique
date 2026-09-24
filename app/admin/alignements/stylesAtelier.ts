// La feuille de l'atelier d'alignement. Des jetons seulement, et les rangs de l'échelle.
// ⛔ Aucun accent grave dans cette feuille : elle vit dans un littéral de gabarit.
export const CSS_ATELIER = `
.atl-page { max-width: 72rem; margin: 0 auto; padding: 1.5rem clamp(16px, 4vw, 24px) 4rem; color: var(--cs-texte); }
.atl-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.75rem; font-weight: normal; line-height: 1.15; color: var(--cs-encre-fonce); margin: 0 0 0.375rem; }
.atl-sous-titre { font-size: 0.8125rem; line-height: 1.5; color: var(--cs-texte-second); margin: 0 0 1.5rem; max-width: 46rem; }
.atl-retour { font-size: 0.75rem; color: var(--cs-texte-second); text-decoration: none; }
.atl-retour:hover { color: var(--cs-vert); }
.atl-rubrique { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cs-texte-second); margin: 1.75rem 0 0.5rem; }
.atl-tableau { width: 100%; border-collapse: collapse; font-size: 0.8125rem; }
.atl-tableau th { text-align: left; font-weight: 600; font-size: 0.6875rem; color: var(--cs-texte-second); padding: 0.375rem 0.5rem; border-bottom: 1px solid var(--cs-bord); }
.atl-tableau td { padding: 0.4375rem 0.5rem; border-bottom: 1px solid var(--cs-bord-clair); vertical-align: top; }
.atl-tableau .atl-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.atl-tableau a { color: var(--cs-vert); text-decoration: none; }
.atl-tableau a:hover { text-decoration: underline; }
.atl-code { font-family: ui-monospace, monospace; font-size: 0.6875rem; color: var(--cs-texte-gris); overflow-wrap: anywhere; }
.atl-tuiles { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; margin: 0.75rem 0 0; }
.atl-tuile { display: flex; flex-direction: column; }
.atl-tuile-val { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.375rem; color: var(--cs-encre-fonce); font-variant-numeric: tabular-nums; }
.atl-tuile-lbl { font-size: 0.6875rem; color: var(--cs-texte-second); }
.atl-tuile--alerte .atl-tuile-val { color: var(--cs-danger-fonce); }
.atl-degre { display: inline-block; font-size: 0.6875rem; font-weight: 600; padding: 0.0625rem 0.4375rem; border-radius: 999px; white-space: nowrap; }
.atl-degre--a-cheval { background: var(--cs-danger-fond); color: var(--cs-danger-fonce); }
.atl-degre--limite { background: var(--cs-danger-fond); color: var(--cs-danger-fonce); }
.atl-degre--repere { background: var(--cs-fond-doux); color: var(--cs-attente); }
.atl-divisions { display: flex; flex-direction: column; }
.atl-division { display: flex; align-items: baseline; gap: 0.75rem; padding: 0.375rem 0.5rem; border-radius: 4px; text-decoration: none; color: var(--cs-texte); font-size: 0.8125rem; }
.atl-division:hover { background: var(--cs-fond-doux); }
.atl-division--active { background: var(--cs-fond-doux); font-weight: 600; }
.atl-division-libelle { flex: 1 1 auto; min-width: 0; }
.atl-division-compte { font-size: 0.75rem; color: var(--cs-texte-second); white-space: nowrap; font-variant-numeric: tabular-nums; }
.atl-nav { display: flex; justify-content: space-between; gap: 1rem; margin: 1rem 0; font-size: 0.8125rem; }
.atl-nav a { color: var(--cs-vert); text-decoration: none; }
.atl-message { font-size: 0.8125rem; padding: 0.5rem 0.75rem; border-radius: 8px; margin: 0.75rem 0; }
.atl-message--ok { background: var(--cs-vert-pale); color: var(--cs-encre-fonce); }
.atl-message--erreur { background: var(--cs-danger-fond); color: var(--cs-danger-fonce); }
.atl-groupe { border: 1px solid var(--cs-bord); border-radius: 8px; background: var(--cs-surface); margin: 0 0 1rem; }
.atl-groupe--revoir { border-color: var(--cs-danger-bord); }
.atl-groupe-tete { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.5rem 1rem; padding: 0.5rem 0.875rem; border-bottom: 1px solid var(--cs-bord-clair); font-size: 0.75rem; color: var(--cs-texte-second); }
.atl-groupe-tete strong { color: var(--cs-texte); font-weight: 600; }
.atl-colonnes { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.atl-colonne { padding: 0.625rem 0.875rem; min-width: 0; }
.atl-colonne + .atl-colonne { border-left: 1px solid var(--cs-bord-clair); }
.atl-colonne-titre { font-size: 0.625rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cs-texte-gris); margin: 0 0 0.375rem; }
.atl-segment { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.875rem; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
.atl-segment--vide { font-style: italic; color: var(--cs-texte-gris); }
.atl-jonction { display: flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0; min-height: 1.25rem; }
.atl-jonction::before { content: ""; flex: 1 1 auto; border-top: 1px dashed var(--cs-bord-clair); }
.atl-jonction--paragraphe::before { border-top: 1px solid var(--cs-attente); }
.atl-jonction-note { font-size: 0.6875rem; color: var(--cs-attente); white-space: nowrap; }
.atl-jonction--retenue::before { border-top: 2px solid var(--cs-danger); }
.atl-jonction--retenue .atl-jonction-note { color: var(--cs-danger-fonce); font-weight: 600; }
.atl-pied { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; padding: 0.5rem 0.875rem; border-top: 1px solid var(--cs-bord-clair); font-size: 0.75rem; color: var(--cs-texte-second); }
.atl-pied--confirmation { background: var(--cs-fond-doux); }
.atl-alerte { color: var(--cs-danger-fonce); font-weight: 600; }
@media (max-width: 900px) {
  .atl-colonnes { grid-template-columns: minmax(0, 1fr); }
  .atl-colonne + .atl-colonne { border-left: none; border-top: 1px solid var(--cs-bord-clair); }
}
`
