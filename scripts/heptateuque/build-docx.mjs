// DOCX de relecture (Genèse, pages 383-384 du scan = impr. 375-376).
// Titre 1 = livre ; Titre 2 = Introduction + chaque question ; sous-titre =
// réf biblique (ref_niv2_texte) ; notes de bas de page = SEULES les vraies notes
// de l'édition, renumérotées globalement ; réfs en romain ; [sic] sur les erreurs
// certaines de l'édition (conservées). Pas de marqueur de page.
import { Document, Packer, Paragraph, TextRun, HeadingLevel, FootnoteReferenceRun } from "docx";
import { writeFileSync } from "fs";

const T = (text, italics = false) => new TextRun({ text, italics });
const SIC = ["[", { i: "sic" }, "]"]; // à épandre dans les tokens

// tokens: "chaîne" | {i:"italique"} | {fn:n}
function runs(tokens) {
  return tokens.map((t) => {
    if (typeof t === "string") return T(t);
    if (t.i !== undefined) return T(t.i, true);
    if (t.fn !== undefined) return new FootnoteReferenceRun(t.fn);
  });
}
const P = (tokens, heading) => new Paragraph(heading ? { heading, children: runs(tokens) } : { children: runs(tokens) });
// sous-titre = réf biblique de la question (ref_niv2_texte)
const SOUS = (ref) => new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: ref, italics: true, color: "7a746d" })] });
const Q = (label, ref, bodyTokens) => [P([label], HeadingLevel.HEADING_2), SOUS(ref), P(bodyTokens)];
const note = (s) => ({ children: [new Paragraph({ children: [T(s)] })] });

const footnotes = {
  1: note("Voir ci-devant les trois ouvrages sur la Genèse."),
  2: note("Gen. V, 4."),
  3: note("Malach. III, 1."),
  4: note("Act. VII, 22."),
};

const body = [
  P(["Questions sur l’Heptateuque"], HeadingLevel.TITLE),
  P([{ i: "Œuvres complètes de saint Augustin, éd. Raulx, t. IV, Bar-le-Duc, L. Guérin & Cie, 1866. Traduction de l’abbé Pognon. Relecture de contrôle contre le fac-similé — pages 383-384 du scan." }]),

  P(["Livre premier — Questions sur la Genèse"], HeadingLevel.HEADING_1),

  P(["Introduction"], HeadingLevel.HEADING_2),
  P([{ i: "En lisant les Saintes Écritures qui portent le titre de canoniques, et en collationnant avec les autres la version des Septante, il nous a paru bon, de peur d’en perdre la mémoire, de fixer par écrit les questions qui se présentaient à notre esprit. Tantôt nous les rappellerons en peu de mots ; tantôt nous nous contenterons de les examiner ; d’autres fois encore, nous en donnerons comme à la hâte une solution quelconque. Notre dessein n’est pas de les développer autant qu’il serait nécessaire, mais de pouvoir y jeter les yeux, quand besoin sera, soit pour y retrouver l’indication des recherches qu’il reste à faire, soit pour être à même d’approfondir le sujet, à l’aide de ce que nous croyons avoir déjà pu découvrir, et de répondre aux difficultés. Si donc il est des lecteurs que ne rebutent point les négligences de ce travail précipité, et s’ils remarquent des questions proposées et non résolues, ils ne doivent pas en conclure qu’ils ont perdu leur peine : c’est déjà avoir trouvé quelque chose, que de savoir ce que l’on cherche. Quand nos solutions sembleront raisonnables, qu’on ne dédaigne pas la simplicité de notre langage, qu’on soit plutôt satisfait d’y découvrir quelque portion de la vérité : car on ne cherche pas la vérité pour discuter, mais on discute pour la chercher. Laissons de côté les questions relatives à ce qui s’est passé depuis le commencement, alors que Dieu, suivant le récit de l’Écriture, créa le ciel et la terre, jusqu’à l’époque où il chassa du paradis les deux premières créatures humaines. Ces questions peuvent être traitées de plusieurs manières, et nous les avons discutées nous-même ailleurs, selon nos forces" }, { fn: 1 }, { i: " ; voici donc celles qui nous sont venues en pensée, au courant de la lecture, et que nous avons voulu laisser par écrit." }]),

  ...Q("Question première", "Gen. IV, 17.", ["Comment Caïn a-t-il pu bâtir une ville ? Une ville exige évidemment une certaine quantité d’habitants. Or, il n’est parlé que des deux chefs de la famille humaine, et des deux fils dont l’un fut mis à mort par l’autre, et remplacé par la naissance d’un troisième. Si l’on fait cette question, n’est-ce point parce que les lecteurs s’imaginent qu’il n’y avait alors d’autres hommes que ceux dont l’Écriture rappelle la mémoire ? Mais ils ne réfléchissent pas que les deux premiers qui furent créés, et ceux qu’ils engendrèrent, vécurent assez longtemps pour en engendrer un grand nombres ", ...SIC, " d’autres. Adam lui-même n’engendra pas seulement ceux dont les noms nous ont été conservés ; l’Écriture, parlant de lui, conclut en disant qu’il engendra des fils et des filles", { fn: 2 }, ". Enfin la vie de ces premiers hommes ayant été beaucoup plus longue que celle des Israélites en Égypte, et ceux-ci ayant pu, dans un temps beaucoup moins long, se multiplier d’une manière si prodigieuse, qui ne comprend dès lors combien d’enfants ont pu naître au temps de Caïn et remplir sa cité ?"]),

  ...Q("Question deuxième", "Ib. V, 25.", ["On demande souvent ", { i: "s’il est possible que Mathusalam ait vécu après le déluge" }, " ; ce que prouve la supputation de ses années, tandis qu’il est dit que tous les hommes périrent, à l’exception de ceux qui étaient entrés dans l’arche. Mais ce qui donne lieu à cette question, c’est l’interpolation du texte dans plusieurs exemplaires. L’hébreu dit autrement, et en s’en tenant même au texte des Septante, on trouve dans plusieurs exemplaires, peu nombreux, il est vrai, mais plus dignes de foi, que Mathusalam mourut six ans avant le déluge."]),

  ...Q("Question troisième", "Ib. VI, 4.", ["On demande encore : comment les Anges ont-ils pu avoir avec les filles des hommes un commerce impur, d’où les géants, dit-on, seraient issus ? Cependant plusieurs exemplaires, tant grecs que latins, ne portent pas ", { i: "anges" }, ", mais ", { i: "fils de Dieu" }, " ; et quelques commentateurs ont cru, pour résoudre la difficulté, qu’il est question ici des hommes vertueux. Ils ont pu effectivement être appelés des anges : n’est-il pas écrit de Jean, qui pourtant était un homme : « Voici que j’envoie mon ange devant moi pour préparer ton chemin", { fn: 3 }, ". » Ce qui préoccupe, c’est de savoir comment les géants ont dû leur naissance à des hommes ; ou bien, s’il est ici question des anges, et non des hommes, comment ces anges ont pu avoir commerce avec des femmes ? Je ne vois pas, en vérité, que ce soit une merveille que des géants, c’est-à-dire des hommes d’une taille et d’une force extraordinaires, aient dû leur naissance à des hommes : il y en eut de semblables, même après le déluge, et aujourd’hui encore on trouve des hommes, et même des femmes, dont la haute stature tient du prodige. Il est donc plus rationnel de croire que les hommes justes, désignés sous le nom d’Anges ou de fils de Dieu, ont cédé à l’attrait de la concupiscence, et péché avec des femmes, que de croire les anges, spirituels par nature, capables de descendre jusqu’à cette ignominie : tout ce qu’on dit de la propension de certains démons à tourmenter les femmes, ne laisse pas cependant que de rendre difficile une définition sur cette matière."]),

  ...Q("Question quatrième", "Ib. VI, 15.", ["On demande aussi ", { i: "comment, avec ses dimensions telles qu’elles sont décrites, l’arche de Noé put contenir tous les animaux qui y sont entrés, et leur nourriture" }, ". — Origène résout cette question par le moyen de la coudée géométrique. Ce n’est pas en vain, dit-il, que l’Écriture nous représente Moïse comme ayant été instruit dans toute la sagesse des Égyptiens", { fn: 4 }, ", qui cultivaient la géométrie. La coudée géométrique, selon lui, équivaut à six de nos coudées. Or, en prenant cette grande mesure pour base de notre calcul, il ne faut plus demander si l’arche fut d’une capacité suffisante pour contenir tout cela."]),

  ...Q("Question cinquième", "Ib. VI, 15.", [{ i: "Comment une arche de dimensions si considérables a-t-elle pu être construite, dans l’espace d’un siècle, par quatre hommes" }, ", c’est-à-dire, par Noé et ses trois fils ? — Si ce travail était au-dessus de leurs forces, il ne leur était pas difficile d’employer d’autres ouvriers. Ceux-ci, tout en recevant leur salaire, ne se seront pas inquiétés si l’entreprise de Noé était sage ou insensée, et ne seront pas entrés dans l’arche, parce qu’ils n’auront pas partagé la foi de ce patriarche."]),

  ...Q("Question sixième", "Ib. VI, 16.", [{ i: "Que signifie cette parole" }, " relative à la fabrication de l’arche : « Tu y feras un bas étage, et une seconde voûte » ? — Le bas étage ne devait pas recevoir deux et trois voûtes. En se servant de cette distinction, Dieu a voulu faire entendre que l’arche tout entière devait avoir un local inférieur ; puis, au-dessus, un étage, qu’il appelle une seconde voûte ; plus haut enfin, un autre étage, ou une troisième voûte. Ainsi, dans la première habitation, je veux dire, dans la partie inférieure, l’arche avait une première voûte ; dans la seconde habitation, qui se trouvait au-dessus de la première, elle était également voûtée ; aussi l’était-elle encore et une troisième fois dans la troisième habitation, qui s’élevait au-dessus de la seconde."]),

  ...Q("Question septième", "Ib. VI, 21.", ["Dieu dit que les animaux devaient non-seulement vivre, mais encore se nourrir dans l’arche, et il donna ordre à Noé de prendre toute espèce de nourriture pour lui et tous les animaux qui devaient l’accompagner. ", { i: "Comment donc les lions et les aigles qui vivent de chair, ont-ils pu s’y nourrir" }, " ? Outre le nombre d’animaux déterminé, en a-t-on introduit dans l’arche pour servir de nourriture à d’autres. Ou bien, ce qui est plus probable, faut-il se persuader que la sagesse humaine ou la lumière divine avait fait préparer pour ces animaux des aliments autres que de la chair et cependant convenables ?"]),

  ...Q("Question huitième", "Ib. VII, 8, 9.", [{ i: "Nombre inégal des animaux purs et impurs" }, ". — « Les oiseaux purs et les oiseaux impurs, les animaux purs et les animaux impurs avec tout ce qui rampe sur la terre » sans doute, pur et impur, quoique cela ne soit pas exprimé dans l’Écriture, « entrèrent dans l’arche avec Noé, deux à deux, mâle et femelle. » Pour distinguer les animaux impurs on disait d’eux précédemment : deux à deux ; pourquoi est-il rapporté ici indistinctement des animaux purs et des animaux impurs qu’ils sont entrés deux à deux dans l’arche ? C’est que ceci n’a point rapport à la quantité, mais au sexe des animaux : dans toutes les espèces pures ou impures, il y a mâle et femelle."]),

  P([{ i: "[La Question neuvième (Ib. VII, 15) commence ici et se poursuit page 385 — non incluse dans cet échantillon.]" }]),
];

const doc = new Document({ footnotes, sections: [{ children: body }] });
const buf = await Packer.toBuffer(doc);
writeFileSync("Genese_p383-384_controle.docx", buf);
console.log("OK : " + buf.length + " octets, 4 notes de bas de page");
