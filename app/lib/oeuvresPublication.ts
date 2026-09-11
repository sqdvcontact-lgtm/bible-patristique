// ── Une œuvre est-elle offerte à la lecture ? ────────────────────────────────
//
// ⛔ UN SEUL DRAPEAU, `oeuvres.acces_public`, et c'est la BASE qui le pose (charte § 52,
// 11 septembre 2026) : vrai quand l'œuvre porte au moins un texte publié et aucun motif
// de non-publication. Le site ne l'écrit jamais ; il le lit, comme toutes les politiques
// RLS (œuvres, textes, segments, notes, alignements). Une œuvre annoncée sans rien à
// lire ne peut donc plus exister, alors que six l'étaient encore le matin de la règle.
//
// Il y avait eu deux avis. Le site jugeait sur un MARQUEUR, la chaîne
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
