// Le cadre du centre de contrôle, et la composition de l'état du contrôle v2.
//
// `CSS_CADRE` sert toutes les vues : la colonne qui porte la vue ouverte, et les écrans de
// panne. Les vues se nomment dans le sommaire de l'administration, sous l'entrée « Centre de
// contrôle » (14 septembre 2026) : le centre avait son propre volet, qui se serait posé à côté
// du sommaire dès que celui-ci a gagné toutes les pages. `CSS_SYSTEME` ne sert que l'état du
// contrôle v2, dont les tableaux et les listes n'existent nulle part ailleurs. Les cartes, les
// tuiles, les jauges, la note et les tâches restent dans `stylesControle.ts`, que la page
// d'audience emprunte aussi.
//
// ⚠️ Chaque feuille se pose dans son PROPRE bloc `<style>`, jamais en somme de constantes :
// la garde des accents graves ne reconnaît que le nom seul, et la feuille du contrôle v2 a
// vécu hors de sa vue tant qu'elle s'écrivait en somme.
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

export const CSS_CADRE = `
  /* La colonne porte la vue ouverte, et elle seule se charge : un calcul qui dépasse son
     délai ne ferme que sa propre vue. Sa mesure est celle qu'elle avait à côté de l'ancien
     volet des missions. */
  .cv-page { min-height: calc(100vh - ${HAUTEUR_NAVBAR}); background: var(--cs-fond); padding: 1.5rem 1.5rem 3rem;
             max-width: 59rem; margin: 0 auto; }

  /* Le sommaire de l'état du contrôle v2, en tête de sa vue. */
  .cv-nav-groupe ul { list-style: none; margin: 0; padding: 0; }
  .cv-nav-tete { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-doux);
                 font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin: 0 0 0.25rem; }
  .cv-nav-lien { display: flex; align-items: baseline; gap: 0.4375rem; padding: 0.25rem 0.375rem; border-radius: 4px;
                 text-decoration: none; font-family: var(--font-source-sans), Arial, sans-serif; }
  .cv-nav-lien:hover { background: var(--cs-fond-doux); }
  .cv-nav-titre { flex: 1; font-size: 0.8125rem; color: var(--cs-texte); line-height: 1.35; }
  .cv-nav-chiffre { font-size: 0.8125rem; color: var(--cs-texte-second); font-variant-numeric: tabular-nums; }
  .cv-nav-lien:hover .cv-nav-titre { color: var(--cs-vert); }

  .cv-lien { color: var(--cs-vert); text-decoration: none; }
  .cv-lien:hover { text-decoration: underline; }

  .cv-corps { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }
  .cv-entete { margin-bottom: -0.25rem; }
  /* La cible d'une ancre ne se pose pas sous la barre de navigation. */
  .cv-section { scroll-margin-top: calc(${HAUTEUR_NAVBAR} + 1rem); }

  /* Un titre de section passe AU-DESSUS des chiffres qu'il organise. */
  .cv-corps .cc-carte-titre { font-size: 1.375rem; }

  /* Une mission se lit sur une mesure de prose : sa note court sur des pages entières, et
     elle ne se lit plus sur toute la largeur d'un grand écran. */
  .cv-mission { max-width: 52rem; }
  .cv-presentation { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.55; margin: 0;
                     font-family: var(--font-source-serif), Georgia, serif; }
  .cv-vide { font-size: 0.8125rem; color: var(--cs-texte-doux); font-style: italic; margin: 0.5rem 0 0;
             font-family: var(--font-source-serif), Georgia, serif; }

  .cv-panne { border-color: var(--cs-danger-bord); }
  .cv-panne--en-ligne { display: flex; flex-direction: column; border: 1px solid var(--cs-danger-bord); border-radius: 8px;
                        padding: 0.75rem 0.875rem; background: var(--cs-surface); }
  .cv-panne-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.375rem; font-weight: normal;
                    color: var(--cs-danger-fonce); margin: 0 0 0.5rem; }
  .cv-panne--en-ligne .cv-panne-titre { font-size: 1.0625rem; }
  .cv-panne-texte { font-size: 0.875rem; color: var(--cs-texte-second); line-height: 1.6; margin: 0 0 0.75rem;
                    font-family: var(--font-source-serif), Georgia, serif; }
  .cv-panne-detail { font-size: 0.75rem; font-family: ui-monospace, monospace; color: var(--cs-texte); background: var(--cs-fond-doux);
                     border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 0.75rem; margin: 0 0 0.75rem;
                     white-space: pre-wrap; overflow-wrap: anywhere; }
  .cv-panne .cv-lien { align-self: flex-start; font-size: 0.875rem; font-family: var(--font-source-sans), Arial, sans-serif; }

  /* Sous le seuil de la charte, la colonne resserre ses marges. */
  @media (max-width: 900px) {
    .cv-page { padding: 1rem 0.75rem 2.5rem; }
  }
`

export const CSS_SYSTEME = `
  /* L'état du contrôle v2 ouvre sur ce qu'on vient y chercher : le verdict, les sévérités du
     dernier run et le sommaire des sections, réunis en tête de colonne. */
  .cv-sys-tete { display: grid; gap: 0.875rem; }
  .cv-sys-verdict { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 18rem); gap: 1rem; align-items: stretch; }
  .cv-sys-nav { display: grid; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); gap: 0.75rem 1.5rem; }

  .cv-verdict { background: var(--cs-fond-clair); border: 1px solid var(--cs-bord-clair); border-left-width: 4px;
                border-radius: 8px; padding: 0.75rem 0.875rem; }
  .cv-verdict-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.375rem; line-height: 1.2; }
  .cv-verdict-phrase { font-size: 0.8125rem; color: var(--cs-texte-second); margin: 0.25rem 0 0; line-height: 1.45;
                       font-family: var(--font-source-serif), Georgia, serif; }

  .cv-severites { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem; align-content: center; }
  .cv-severites li { text-align: center; background: var(--cs-fond-clair); border: 1px solid var(--cs-bord-clair);
                     border-radius: 4px; padding: 0.375rem 0.125rem; }
  .cv-sev-val { display: block; font-family: var(--font-source-serif), Georgia, serif; font-size: 1.0625rem; line-height: 1.1; }
  .cv-sev-lbl { display: block; font-size: 0.5625rem; letter-spacing: 0.03em; color: var(--cs-texte-doux);
                font-family: var(--font-source-sans), Arial, sans-serif; margin-top: 0.125rem; }

  .cv-puce { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0; margin-top: 0.3125rem; }
  .cv-nav-lien .cv-puce { margin-top: 0; }

  .cv-sous { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.5; margin: -0.5rem 0 0.75rem;
             font-family: var(--font-source-serif), Georgia, serif; }

  .cv-tuile--action .cc-tuile-val { font-size: 1.25rem; }
  .cv-tuile--normal .cc-tuile-val { font-size: 1.0625rem; }
  .cv-tuile--contexte .cc-tuile-val { font-size: 0.9375rem; }
  .cv-tuile--contexte .cc-tuile-lbl { color: var(--cs-texte-doux); }

  .cv-liste { list-style: none; margin: 0.75rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .cv-liste--serree { gap: 0.3125rem; }
  .cv-ligne { display: flex; align-items: flex-start; gap: 0.5rem; }
  .cv-ligne-titre { font-size: 0.8125rem; color: var(--cs-texte); font-family: var(--font-source-sans), Arial, sans-serif; font-weight: 600; }
  .cv-ligne-detail { font-size: 0.75rem; color: var(--cs-texte-second); line-height: 1.5; font-family: var(--font-source-sans), Arial, sans-serif; }
  .cv-etiquette { font-size: 0.6875rem; font-weight: 500; margin-left: 0.5rem; letter-spacing: 0.02em; }

  .cv-tete-tableau { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-second); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin: 1rem 0 0.375rem; }
  .cv-tableau { width: 100%; border-collapse: collapse; font-size: 0.75rem; font-family: var(--font-source-sans), Arial, sans-serif; }
  .cv-tableau th { text-align: left; font-weight: 600; color: var(--cs-texte-second); border-bottom: 1px solid var(--cs-bord-clair); padding: 0.25rem 0.375rem; }
  .cv-tableau td { color: var(--cs-texte); border-bottom: 1px solid var(--cs-bord-clair); padding: 0.375rem; vertical-align: top; overflow-wrap: anywhere; }
  .cv-tableau .cv-num { text-align: right; font-variant-numeric: tabular-nums; }
  /* Le nom d'une mission peut se couper n'importe où, un verdict de routage non :
     « ambigu » coupé en deux ne se lit plus. */
  .cv-tableau .cv-routage { overflow-wrap: normal; white-space: nowrap; }

  @media (max-width: 640px) {
    .cv-sys-verdict { grid-template-columns: minmax(0, 1fr); }
  }
`
