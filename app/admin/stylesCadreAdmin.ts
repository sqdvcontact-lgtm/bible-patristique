// Le cadre de l'administration : le sommaire en volet à gauche, la page dans la colonne.
//
// ⚠️ Une seule feuille, posée par le layout. Le volet était dessiné en styles EN LIGNE dans la
// page /admin, et son survol ne tenait que par des « !important » : une règle de feuille perd
// contre un style en ligne. Tout son dessin vit donc ici, en classes, et la teinte de chaque
// famille passe par une propriété que le composant pose (« --adm-teinte »).
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

export const CSS_CADRE_ADMIN = `
  .adm-cadre { display: flex; align-items: flex-start; }
  .adm-colonne { flex: 1 1 auto; min-width: 0; }

  /* Le volet est COLLANT et prend la hauteur de la fenêtre : il se lit comme une colonne,
     quelle que soit la longueur de la page à sa droite, et défile de lui-même quand la
     fenêtre est plus basse que lui. */
  .adm-sommaire { position: sticky; top: ${HAUTEUR_NAVBAR}; flex: 0 0 14.5rem; box-sizing: border-box;
                  height: calc(100dvh - ${HAUTEUR_NAVBAR}); overflow-y: auto; overscroll-behavior: contain;
                  padding: 18px 10px 28px 12px; background: var(--cs-surface); border-right: 1px solid var(--cs-vert-pale);
                  font-family: var(--font-source-sans), Arial, sans-serif; }
  .adm-sommaire ul { list-style: none; margin: 0; padding: 0; }
  .adm-famille + .adm-famille { margin-top: 18px; }

  /* Le titre de famille, dans la teinte du domaine. Il s'aligne sur le texte des entrées :
     trois pixels de filet, dix de rembourrage. */
  .adm-famille-titre { margin: 0 0 5px; padding: 0 8px 0 13px; font-size: 0.5625rem; font-weight: 700;
                       letter-spacing: 0.09em; text-transform: uppercase; color: var(--adm-teinte); opacity: 0.9; }

  .adm-lien { display: flex; align-items: center; gap: 8px; box-sizing: border-box; width: 100%;
              padding: 5px 8px 5px 10px; border-left: 3px solid transparent; border-radius: 0 4px 4px 0;
              font-size: 0.8125rem; line-height: 1.3; font-weight: 500; color: var(--cs-texte-second);
              text-decoration: none; transition: color 0.12s, background-color 0.12s; }
  .adm-lien:hover { color: var(--adm-teinte); background: color-mix(in srgb, var(--adm-teinte) 5%, transparent); }
  /* L'entrée ouverte se dit par le filet, l'encre, la graisse et le fond : un fond seul se
     confondrait avec le survol, qui pose le même. */
  .adm-lien[aria-current] { color: var(--adm-teinte); font-weight: 600; border-left-color: var(--adm-teinte);
                            background: color-mix(in srgb, var(--adm-teinte) 8%, transparent); }
  .adm-pastille { margin-left: auto; padding: 1px 6px; border-radius: 8px; font-size: 0.71875rem; font-weight: 600;
                  line-height: 1.4; font-variant-numeric: tabular-nums; background: var(--cs-danger-aplat); color: var(--cs-sur-aplat); }
  .adm-filet { height: 1px; margin: 6px 8px 6px 13px; background: var(--cs-vert-pale); }

  /* Les vues du centre de contrôle, sous son entrée, tant qu'on y est. Deux classes au
     sélecteur : la remise à zéro des listes du volet l'emporterait sinon. */
  .adm-sommaire .adm-sous { margin: 3px 0 8px 13px; padding-left: 9px; border-left: 1px solid var(--cs-bord-clair); }
  .adm-sous-lien { display: block; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; line-height: 1.35;
                   color: var(--cs-texte-second); text-decoration: none; transition: color 0.12s, background-color 0.12s; }
  .adm-sous-lien:hover { color: var(--adm-teinte); background: color-mix(in srgb, var(--adm-teinte) 5%, transparent); }
  .adm-sous-lien[aria-current] { color: var(--adm-teinte); font-weight: 600;
                                 background: color-mix(in srgb, var(--adm-teinte) 8%, transparent); }
  .adm-sous-filet { height: 1px; margin: 4px 8px; background: var(--cs-bord-clair); }
  .adm-sous-erreur { margin: 2px 8px 4px; font-size: 0.71875rem; line-height: 1.4; color: var(--cs-danger); }

  /* Sur un écran étroit, le sommaire devient un choix posé au-dessus de la page. */
  .adm-choix { display: none; }

  @media (max-width: 900px) {
    /* La hauteur du bandeau se NOMME : une page fixe la retranche de la sienne. */
    .adm-cadre { display: block; --adm-bandeau: 3.25rem; }
    .adm-sommaire { display: none; }
    .adm-choix { position: sticky; top: ${HAUTEUR_NAVBAR}; z-index: 40; display: flex; align-items: center;
                 box-sizing: border-box; height: var(--adm-bandeau); padding: 0 12px;
                 background: var(--cs-surface); border-bottom: 1px solid var(--cs-vert-pale); box-shadow: var(--cs-ombre-posee); }
    .adm-choix select { flex: 1 1 auto; min-width: 0; height: 2.25rem; padding: 0 10px; border: 1px solid var(--cs-bord);
                        border-radius: 8px; background: var(--cs-fond-clair); color: var(--cs-encre);
                        font: inherit; font-size: 0.9375rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .adm-lien, .adm-sous-lien { transition: none; }
  }
`
