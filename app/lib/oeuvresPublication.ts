// ── Une œuvre est-elle offerte à la lecture ? ────────────────────────────────
//
// ⛔ UN SEUL DRAPEAU, `oeuvres.acces_public`, et c'est celui de la base (2026-09-03).
// Toutes les politiques RLS le lisent — œuvres, textes, segments, notes, alignements —
// et le trigger `oeuvres_depublication_textes` le garde : on ne retire pas une œuvre
// dont un texte est encore public. Le site lit donc ce que la base applique, et il
// n'y a plus deux avis à départager.
//
// Il y en avait deux. Le site jugeait sur un MARQUEUR, la chaîne
// `[Corpus Scriptura:depublie]` écrite dans `oeuvres.note`, quand la base jugeait sur
// `acces_public` : « juger de la publication sur un seul, c'est se tromper une fois
// sur deux », disait AGENTS.md, et c'était l'aveu du problème plutôt que sa règle.
// Le pire n'était pas là : `note` portait AUSSI dix-neuf notes éditoriales rédigées,
// que dépublier écrasait du marqueur et que republier effaçait. Elles vivent
// maintenant dans `note_editoriale_complement`, et `note` n'existe plus.
//
// ⚠️ La colonne doit être DEMANDÉE : une lecture qui ne la sélectionne pas rend
// `undefined`, et `undefined` n'est pas publié. C'est voulu — mieux vaut une œuvre
// qui manque à une liste qu'une œuvre retirée qui y paraît — mais c'est le piège à
// connaître quand une liste se vide sans raison.
export function estOeuvrePubliee(oeuvre: { acces_public?: boolean | null } | null | undefined) {
  return oeuvre?.acces_public === true
}
