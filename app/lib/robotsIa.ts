// ── Robots d'IA refusés par le proxy ─────────────────────────────────────────
// Un refus de robot a DEUX verrous, et ils doivent dire la même chose : ce que le
// robot lit (app/robots.txt) et ce que le proxy lui rend en 403 (ce motif). Un
// robots.txt accueillant devant un proxy qui refuse est pire que les deux verrous
// fermés, car rien ne le signale. robotsIa.test.ts les confronte.
//
// Ceux qui ENTRAÎNENT sont refusés : réservation TDM (art. L122-5-3 CPI). Ceux qui
// CITENT EN RÉPONDANT (OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User,
// Claude-SearchBot, Claude-User) ne doivent jamais y entrer : les refuser rendrait
// seulement le site introuvable depuis les assistants.
//
// ⚠️ `ClaudeBot` ENTRAÎNE : Anthropic le décrit comme son robot de collecte pour
// l'entraînement (documentation relue le 2026-09-13). Le motif porte la barre
// (`ClaudeBot/`) pour ne viser que le nom du produit, jamais une adresse de contact.
//
// Un navigateur ordinaire, y compris un assistant qui pilote le navigateur d'un
// lecteur, a un agent de navigateur : il n'est jamais concerné.
export const AGENTS_IA_REFUSES =
  /(GPTBot|ClaudeBot\/|anthropic-ai|Claude-Web|CCBot|Bytespider|Amazonbot|Meta-ExternalAgent|meta-externalfetcher|FacebookBot|Diffbot|Omgilibot|omgili|ImagesiftBot|YouBot|cohere-ai|Timpibot|DataForSeoBot|magpie-crawler|Scrapy)/i
