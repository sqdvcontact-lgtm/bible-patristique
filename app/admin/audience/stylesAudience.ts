// Habillage propre à la page d'audience.
//
// Elle emprunte au centre de contrôle sa page, ses cartes et ses tuiles (CSS_CONTROLE,
// classes `cc-`), pour que les deux écrans de statistiques soient frères et non
// cousins. N'est écrit ici que ce que le contrôle n'a pas : une barre d'onglets, une
// courbe, des tableaux de classement, et l'état vide.
export const CSS_AUDIENCE = `
  /* — Barre d'onglets — */
  .au-onglets { max-width: 74rem; margin: 0 auto 1.25rem; display: flex; gap: 0.25rem; flex-wrap: wrap; border-bottom: 1px solid var(--cs-bord-clair); }
  .au-onglet { appearance: none; border: none; background: transparent; cursor: pointer; font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.875rem; color: var(--cs-texte-second); padding: 0.5rem 0.875rem; border-bottom: 2px solid transparent; margin-bottom: -1px; border-radius: 4px 4px 0 0; transition: color .12s, background .12s; }
  .au-onglet:hover { color: var(--cs-vert-fonce); background: rgba(var(--cs-vert-rgb), 0.05); }
  .au-onglet-actif { color: var(--cs-encre-fonce); border-bottom-color: var(--cs-vert-aplat); font-weight: 600; }

  /* — Choix de la période — */
  .au-periodes { display: inline-flex; gap: 0.25rem; align-items: center; }
  .au-periode { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.75rem; color: var(--cs-texte-doux); text-decoration: none; padding: 0.25rem 0.5rem; border: 1px solid var(--cs-bord-clair); border-radius: 4px; background: var(--cs-surface); }
  .au-periode:hover { color: var(--cs-vert); border-color: var(--cs-vert); }
  .au-periode-active { color: var(--cs-sur-aplat); background: var(--cs-vert-aplat); border-color: var(--cs-vert-aplat); font-weight: 600; }

  /* — Courbe — */
  .au-courbe { width: 100%; height: auto; display: block; overflow: visible; }
  .au-courbe-aire { fill: rgba(var(--cs-vert-rgb), 0.14); }
  .au-courbe-trait { fill: none; stroke: var(--cs-vert); stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }
  .au-courbe-second { fill: none; stroke: var(--cs-or); stroke-width: 1.3; stroke-dasharray: 3 2.5; stroke-linejoin: round; }
  .au-courbe-grille { stroke: var(--cs-bord-clair); stroke-width: 0.6; }
  .au-courbe-legende { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.6875rem; color: var(--cs-texte-doux); font-family: var(--font-source-sans), Arial, sans-serif; margin-top: 0.5rem; }
  .au-courbe-cle { display: inline-flex; align-items: center; gap: 0.375rem; }
  .au-courbe-pastille { width: 0.75rem; height: 0.1875rem; border-radius: 999px; display: inline-block; }
  .au-courbe-bornes { display: flex; justify-content: space-between; font-size: 0.6875rem; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; margin-top: 0.25rem; }

  /* — Classements — */
  .au-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .au-ligne { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 0.75rem; padding: 0.3125rem 0; border-bottom: 1px solid var(--cs-bord-clair); font-family: var(--font-source-sans), Arial, sans-serif; }
  .au-ligne:last-child { border-bottom: none; }
  .au-ligne-nom { font-size: 0.8125rem; color: var(--cs-texte); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .au-ligne-nom a { color: inherit; text-decoration: none; }
  .au-ligne-nom a:hover { color: var(--cs-vert); text-decoration: underline; }
  .au-ligne-val { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.9375rem; color: var(--cs-encre-fonce); font-variant-numeric: tabular-nums; }
  .au-ligne-detail { font-size: 0.6875rem; color: var(--cs-texte-faible); margin-left: 0.375rem; font-family: var(--font-source-sans), Arial, sans-serif; }
  /* Une DATE n'est pas une glose : elle occupe la colonne du nombre, et prend donc
     son corps. En « détail », elle tombait à 11 px dans l'encre la plus ténue du
     site, pour la seule information que la ligne apporte. */
  .au-ligne-date { font-size: 0.75rem; color: var(--cs-texte-second); font-family: var(--font-source-sans), Arial, sans-serif; font-variant-numeric: tabular-nums; }

  /* Barre de proportion, posée derrière le nom : on lit un classement d'un coup
     d'œil sans avoir à comparer des nombres. */
  .au-ligne-piste { grid-column: 1 / -1; height: 3px; background: var(--cs-fond-doux); border-radius: 999px; overflow: hidden; margin-top: 0.125rem; }
  .au-ligne-part { height: 100%; background: rgba(var(--cs-vert-rgb), 0.45); border-radius: 999px; }

  /* — État vide — */
  .au-vide { font-size: 0.8125rem; color: var(--cs-texte-doux); font-family: var(--font-source-serif), Georgia, serif; font-style: italic; line-height: 1.55; margin: 0; padding: 0.75rem 0; }

  /* Bandeau d'attente, tant que la collecte n'a rien recueilli. Il occupe la
     largeur de la grille pour ne pas être pris pour une carte parmi d'autres. */
  .au-attente { grid-column: 1 / -1; background: var(--cs-vert-pale); border-left: 3px solid var(--cs-vert-aplat); border-radius: 0 8px 8px 0; padding: 0.875rem 1rem; }
  .au-attente-tete { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-vert); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin-bottom: 0.25rem; }
  .au-attente-txt { font-size: 0.8125rem; color: var(--cs-texte); line-height: 1.55; margin: 0; font-family: var(--font-source-serif), Georgia, serif; }

  /* Témoin de panne. Il prend l'encre de l'ATTENTE et non celle du danger : le
     silence n'est pas une panne établie, seulement une chose à aller voir. */
  .au-alerte { grid-column: 1 / -1; background: var(--cs-danger-fond); border-left: 3px solid var(--cs-attente); border-radius: 0 8px 8px 0; padding: 0.875rem 1rem; }
  .au-alerte-tete { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-attente); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin-bottom: 0.25rem; }

  /* — Variation d'un jour à l'autre — */
  .au-delta { font-size: 0.6875rem; font-family: var(--font-source-sans), Arial, sans-serif; margin-top: 0.1875rem; }
  .au-delta-hausse { color: var(--cs-vert); }
  .au-delta-baisse { color: var(--cs-danger); }
  .au-delta-plat { color: var(--cs-texte-faible); }

  @media (max-width: 640px) {
    .au-onglets { gap: 0; }
    .au-onglet { font-size: 0.8125rem; padding: 0.4375rem 0.625rem; }
  }
`
