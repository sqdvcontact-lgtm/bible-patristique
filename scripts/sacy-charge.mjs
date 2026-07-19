// Charge un livre de Sacy transcrit dans versets_v2 (TR0001).
// Respecte la versification de l'édition dans ch_orig/v_orig ; la rattache au canon par
// une table explicite. Exporte l'état antérieur avant écriture (charte §23.10).
//   node scripts/sacy-charge.mjs EXO exo_ [--dry]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { corrigerTypographie } from './typographie.mjs'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const [CODE, PREFIXE] = process.argv.slice(2)
const DRY = process.argv.includes('--dry')
const NB = ' '
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// ── corrections de lecture communes à TOUS les livres ──
// Dans les lettrines, le « È » accentué est régulièrement lu comme « E » suivi d'une
// apostrophe : « APRE’s » pour « APRÈS ». Vu en Jos 1,1 puis en 2 R 1,1 — assez pour
// en faire une règle générale plutôt qu'une correction par livre.
// Second cas, plus général : une apostrophe mise pour un « l » ou un « i ». Vu en Jos 7,19
// (« fi’s »), 2 R 11,11 (« I’s »), 1 Par 20,4 (« ce’a ») et 21,12 (« mo’s »). Le défaut ne
// se voit à aucun autre contrôle — le mot reste prononçable et la typographie est correcte.
// Le contrôle « apostrophes mises pour une lettre » de audit-traduction.mjs le débusque.
// « ajourd’hui » pour « aujourd’hui » : vu en Dt 28,13 puis en Esd 9,7 — deux livres
// éloignés, donc une règle commune plutôt qu'une correction par livre.
const LECTURES_COMMUNES = [
  [/\bAPRE’s\b/g, 'Après'], [/\bApre’s\b/g, 'Après'],
  [/\bI’s\b/g, 'Ils'],
  [/\bajourd’hui\b/g, 'aujourd’hui'],
  [/\blorqu’il\b/g, 'lorsqu’il'],        // « s » manquant, vu en Est 1,2
]

// Borne de mot SÛRE, à employer partout où le motif commence ou finit par une lettre
// accentuée. En JavaScript, `\b` ne connaît que [A-Za-z0-9_] : « \béreindre\b » ne rencontre
// JAMAIS « éreindre », puisque « é » n'est pas un caractère de mot et qu'il n'y a donc pas de
// frontière entre l'espace et lui. La règle échoue alors EN SILENCE — c'est arrivé deux fois,
// sur « vis- à-vis » puis sur quatre corrections de Jérémie.
const mot = s => new RegExp(`(?<![a-zà-ÿ0-9])${s}(?![a-zà-ÿ0-9])`, 'g')

// ── CAPITALES D'EMPHASE DE L'ÉDITION (§23.9) ───────────────────────────────────────────
// Distinct de la lettrine, que la fusion normalise déjà. Sacy imprime EN CAPITALES, au
// milieu du verset, certains passages qu'il tient pour messianiques. La charte interdit les
// capitales dans le texte : on les rend donc à la casse ordinaire — mais on CONSIGNE le fait
// en note, pour que l'intention du traducteur ne se perde pas avec sa typographie.
// « NE’ » est la manière de 1730 d'accentuer une capitale : l'apostrophe y tient lieu
// d'accent aigu. Le mot est donc « né », et non un sigle.
const CAPITALES = {
  ISA: [
    { ch: 7, v: 14, de: 'EMMANUEL',        a: 'Emmanuel' },
    { ch: 9, v: 6,  de: 'UN PETIT ENFANT', a: 'un petit enfant' },
    { ch: 9, v: 6,  de: 'NE’',             a: 'né' },
  ],
  JER: [
    { ch: 31, v: 22, de: 'UNE FEMME ENVIRONNERA UN HOMME', a: 'une femme environnera un homme' },
  ],
  EZK: [
    // L'édition écrit « Je SUSCITERAI SUR ELLES… » : le premier mot n'est pas en capitales.
    { ch: 34, v: 23, de: 'SUSCITERAI SUR ELLES LE PASTEUR UNIQUE', a: 'susciterai sur elles le pasteur unique' },
  ],
}
const NOTE_CAPITALES = 'L’édition de 1730 imprime ce passage en capitales, pour en marquer la portée prophétique. La casse ordinaire est rétablie ici, conformément à la charte ; l’emphase de l’édition est signalée par cette note.'

// ── corrections de lecture vérifiées, par livre ──
const LECTURES = {
  // ISA : caractères brisés à l'impression, signalés par les transcripteurs et conservés par
  // eux — c'est la bonne conduite : on ne corrige pas en transcrivant, on corrige ici, où la
  // correction est écrite et vérifiable. « toures » et « sout » ne sont pas des mots français.
  // Les autres lectures signalées par le détecteur ont été vérifiées et laissées : « sables »
  // (Is 10,22, le sable de la mer), « bale » (Is 22,18, la balle qu'on roule), « meur »
  // (Is 28,4, mûr en graphie de 1730) et « soulé » (Is 43,24) sont justes.
  ISA: [[/\btoures\b/g,'toutes'], [/\bsout\b/g,'sont']],
  // JER : le tirage de Jérémie est nettement plus fautif que celui d'Isaïe. On ne corrige
  // ici que les NON-MOTS dont la cause est un caractère brisé, absent ou dédoublé — chacun
  // signalé par un transcripteur ou par le détecteur de lectures suspectes.
  // Sont au contraire CONSERVÉES, parce qu'elles appartiennent à l'édition et non au tirage :
  // « J'envoyera » (8,17) · « nous ne laisseront pas de trouver » (18,18) · « on fait
  // dessein » (48,2) · « toutes leurs fortes » (49,35) · « Je viens à roi » (50,31) ·
  // « grandes eux » (51,13) · « successeront » (51,46).
  // Vérifiées et laissées telles quelles, le détecteur s'étant trompé : « jouet » (24,9,
  // l'objet de risée), « jaunes » (30,6, les visages), « édifiée » (31,4), « soulera »
  // (46,10, le glaive qui se soûle de sang — la Vulgate porte « inebriabitur »).
  JER: [
    [mot('éreindre'),'éteindre'], [mot('Seigneut'),'Seigneur'], [mot('persidie'),'perfidie'],
    [mot('Sgneur'),'Seigneur'], [mot('du prophe'),'du prophete'], [mot('di le Seigneur'),'dit le Seigneur'],
    [mot('abanbonneront'),'abandonneront'], [mot('Babyone'),'Babylone'],
    [mot('détruisen'),'détruisent'], [mot('tranferé'),'transferé'],
    [mot('se viteurs'),'serviteurs'],
    [mot('n’ont pont prêté'),'n’ont point prêté'], [/par un un chemin/g,'par un chemin'],
    // ⚠️ « santifie » / « santifiez » ont d'abord été « corrigés » ici en sanctifie(z).
    // C'ÉTAIT UNE FAUTE, retirée le 19/07/2026 : le dénombrement sur toute la transcription
    // donne 262 formes en « sant… » contre 30 en « sanct… ». « santuaire », « santifier »
    // sont donc l'ORTHOGRAPHE DE L'ÉDITION, non des coquilles — et la règle est de la
    // conserver à la lettre. Une graphie qui se répète n'est jamais une coquille : c'est le
    // meilleur critère pour les distinguer, et il se vérifie en comptant.
  ],
  // LAM : caractères brisés ou absents, chacun vérifié en contexte.
  LAM: [
    [mot('épagner'),'épargner'], [mot('Vout'),'Vous'],
    [mot('autrucbe'),'autruche'], [mot('avengles'),'aveugles'],
    [/souffert nne mort/g,'souffert une mort'],
    [mot('l’epnemi'),'l’ennemi'], [mot('frapppé'),'frappé'],
  ],
  // EZK : idem. Sont au contraire CONSERVÉS, comme graphies de l'édition : « santuaire »
  // (11 fois), « Santifiez », « envoiera » (4 fois) — ce sont des formes, pas des accidents.
  EZK: [
    [/s’étendoient eu haut/g,'s’étendoient en haut'], [mot('leus aîles'),'leurs aîles'],
    [mot('sélevoit'),'s’élevoit'], [/il baissoient/g,'ils baissoient'],
    [/qui mirrite/g,'qui m’irrite'],              // apostrophe soudée : « qui m'irrite »
    [/de eurs idoles/g,'de leurs idoles'], [/à l entrée/g,'à l’entrée'],
    [/de l iniquité/g,'de l’iniquité'], [mot('illustrue'),'illustre'],
    [/montent à valche/g,'montent à cheval'],     // « equos ascendentes » dans la Vulgate
    [/lé Seigneur/g,'le Seigneur'], [/toutes le étoiles/g,'toutes les étoiles'],
    [/il enseveliront/g,'ils enseveliront'], [/dires-vous/g,'dites-vous'],
  ],
  // LAM : trois caractères brisés, signalés par les transcripteurs. « de repas » (1,3) est
  // en revanche CONSERVÉ : « elle n'y a point trouvé de repas » est la leçon de l'édition.
  EXO: [[/\bqni\b/g,'qui'], [/\bsils\b/g,'fils']],
  // « an Seigneur » (Lv 1,14) : le lexique ne peut pas l'attraper, « an » étant un mot valide.
  LEV: [[/\bpat\b/g,'par'], [/holocauste an Seigneur/g,'holocauste au Seigneur']],
  // DEU : confusions u/n et t/r confirmées par le lexique, plus les lettres manquantes
  // signalées par les transcripteurs (que la permutation ne peut pas détecter).
  DEU: [
    [/\bcetre\b/g,'cette'], [/\bpenple\b/g,'peuple'], [/\bqni\b/g,'qui'], [/\btont\b/g,'tout'],
    [/\bSeigneut\b/g,'Seigneur'], [/\bpete\b/g,'pere'], [/\bDien\b/g,'Dieu'], [/\bparrie\b/g,'partie'],
    [/\baptès\b/g,'après'], [/\bpleuples\b/g,'peuples'], [/\bprohete\b/g,'prophete'],
    [/\bmaintnant\b/g,'maintenant'], [/l’Egyte/g,'l’Egypte'], [/\bajourd’hui\b/g,'aujourd’hui'],
    [/\bsouliés\b/g,'souliers'], [/venez à dite/g,'venez à dire'], [/\bMai comme\b/g,'Mais comme'],
  ],
  // JOS/JDG/RUT : uniquement des erreurs de LECTURE du fac-similé (ſ lu f, n lu u,
  // apostrophe lue l), chacune vérifiée sur son contexte. Les coquilles propres à
  // l'édition (« mont fait », « aux autres homme », « grans ») sont conservées.
  JOS: [
    [/\bmatcher\b/g,'marcher'], [/\bHafersual\b/g,'Hasersual'],
    [/\bMon fi’s\b/g,'Mon fils'], [/\bver Baala\b/g,'vers Baala'],
    [/extermi-\s+neront/g,'extermineront'],      // césure : soudure absente du lexique moderne
  ],
  JDG: [
    [/\bréponditent\b/g,'répondirent'], [/\bSeignenr\b/g,'Seigneur'],
    [/\bvoulureut\b/g,'voulurent'], [/\bSamsom\b/g,'Samson'],
    [/en-\s+fuyoient/g,'enfuyoient'],            // césure : forme de 1730, absente du lexique
  ],
  RUT: [[/\bMoablite\b/g,'Moabite']],
  '1SA': [
    [/\bSeigneut\b/g,'Seigneur'],
    [/\bli-\s+vterez\b/g,'livrerez'],          // césure + confusion t/r
  ],
  // 2SA : confusions de lecture t/r et u/n. « sies » (12,31) est en revanche CONSERVÉ :
  // la même forme reparaît en 1 R 7,9 (« siés »), ce qui en fait une graphie de l'édition
  // pour « scie / scié » et non une erreur de lecture.
  '2SA': [
    [/la victoire fur changée/g, 'la victoire fut changée'],
    [/\bcoucubines\b/g, 'concubines'],
    [/\bexrrêmement\b/g, 'extrêmement'],
  ],
  // 2KI : « ses ser- teurs » — césure de « serviteurs » dont la seconde moitié a été mal
  // lue ; la soudure « serteurs » n'est pas un mot, le contrôle automatique l'a donc
  // signalée sans la souder.
  // EZR : « Sil est necessaire » — apostrophe absente dans l'impression.
  'EZR': [[/\bSil est necessaire\b/g, 'S’il est necessaire']],
  '2KI': [
    [/\bser-\s+teurs\b/g, 'serviteurs'],
    [/\baugmen-\s+toit\b/g, 'augmentoit'],   // césure : forme de 1730, absente du lexique
  ],
  // 1CH : confusion u/n, et deux apostrophes mises pour une lettre (voir LECTURES_COMMUNES).
  '1CH': [
    [/\bgenerensement\b/g, 'genereusement'],
    [/Après ce’a\b/g, 'Après cela'],
    [/\btrois mo’s\b/g, 'trois mois'],
  ],
}

// ── correspondance édition → canon, par livre (vérifiée sur le fac-similé) ──
// EXO : l'édition suit la Vulgate, le canon suit l'hébreu.
//   Sacy 8,1-4    → canon 7,26-29      (frontière 7/8 décalée)
//   Sacy 8,5-32   → canon 8,1-28
//   Sacy 22,1     → canon 21,37        (frontière 21/22 décalée)
//   Sacy 22,2-31  → canon 22,1-30
//   Sacy 40,13    → canon 40,13-15     (l'édition condense trois versets en un)
//   Sacy 40,14-36 → canon 40,16-38
const MAP = {
  EXO: v => {
    if (v.ch === 8)  return v.v <= 4 ? `EXO.7.${v.v + 25}` : `EXO.8.${v.v - 4}`
    if (v.ch === 22) return v.v === 1 ? 'EXO.21.37' : `EXO.22.${v.v - 1}`
    if (v.ch === 40 && v.v >= 14) return `EXO.40.${v.v + 2}`
    return `${CODE}.${v.ch}.${v.v}`
  },
}
// LEV : ici c'est l'inverse de l'Exode — l'édition suit l'hébreu, le canon la Vulgate.
//   Sacy 6,1-7   → canon 5,20-26     (19+30 = 26+23 = 49 : les totaux concordent)
//   Sacy 6,8-30  → canon 6,1-23
//   Sacy 26,45   → canon 26,45-46    (l'édition fusionne les deux derniers versets)
MAP.LEV = v => {
  if (v.ch === 6) return v.v <= 7 ? `LEV.5.${v.v + 19}` : `LEV.6.${v.v - 7}`
  return `LEV.${v.ch}.${v.v}`
}

// NUM : l'édition suit l'hébreu, le canon la Vulgate. Deux frontières établies avec
// certitude ; cinq chapitres restent à trancher sur le fac-similé (voir DOUTEUX).
//   Sacy 13,1      → canon 12,16   (alignement de contenu à 0,86)
//   Sacy 13,2-34   → canon 13,1-33
//   Sacy 16,36-50  → canon 17,1-15 (50+13 = 35+28 : les totaux concordent)
//   Sacy 17,1-13   → canon 17,16-28
MAP.NUM = v => {
  if (v.ch === 13) return v.v === 1 ? 'NUM.12.16' : `NUM.13.${v.v - 1}`
  if (v.ch === 16 && v.v >= 36) return `NUM.17.${v.v - 35}`
  if (v.ch === 17) return `NUM.17.${v.v + 15}`
  return `NUM.${v.ch}.${v.v}`
}
// Résolu le 18/07/2026 : le test de rupture (sacy-fusion-point.mjs) a montré un alignement
// 1:1 sur toute la longueur de ces chapitres — seul le DERNIER verset du canon est sans
// équivalent. Vérifié sur le fac-similé p.172 pour Nb 11 : le v.34 de l'édition absorbe
// bien le v.35 du canon (« ils vinrent à Haseroth, où ils demeurerent »).
//   Nb 23 : le v.15 n'est pas imprimé (saut de numérotation de l'édition)
//   Nb 25 : le v.19 du canon est un fragment que la Vulgate rattache au chapitre suivant
//   Nb 26 : le v.66 du canon est vide — rien à aligner
//   Nb 20 : l'édition a un verset de PLUS (20,30), sans slot canon
// DEU : l'édition suit l'hébreu, le canon la Vulgate. Trois frontières décalées, chacune
// vérifiée par le contrôle arithmétique (les totaux de chaque paire de chapitres coïncident).
//   Sacy 12,32 → canon 13,1   · Sacy 13,v → canon 13,v+1   (32+18 = 31+19 = 50)
//   Sacy 22,30 → canon 23,1   · Sacy 23,v → canon 23,v+1   (30+25 = 29+26 = 55)
//   Sacy 29,1  → canon 28,69  · Sacy 29,v → canon 29,v-1   (68+29 = 69+28 = 97)
MAP.DEU = v => {
  if (v.ch === 12 && v.v === 32) return 'DEU.13.1'
  if (v.ch === 13) return `DEU.13.${v.v + 1}`
  if (v.ch === 22 && v.v === 30) return 'DEU.23.1'
  if (v.ch === 23) return `DEU.23.${v.v + 1}`
  if (v.ch === 29) return v.v === 1 ? 'DEU.28.69' : `DEU.29.${v.v - 1}`
  return `DEU.${v.ch}.${v.v}`
}

// JOS : l'édition SCINDE deux versets que le canon garde entiers — cas inverse des livres
// précédents. Deux versets de l'édition partagent alors un seul créneau du canon ; ils y
// sont rangés par ordre_slot, et la Polyglotte les affiche à la suite.
//   Sacy 2,23     → canon 2,23-24   (l'édition fusionne, comme ailleurs)
//   Sacy 4,23+24  → canon 4,23      · Sacy 4,v≥25 → canon 4,v-1
//   Sacy 5,14+15  → canon 5,14      · Sacy 5,16   → canon 5,15
// Jos 21 : l'édition a 43 versets, le canon 45 — mais les créneaux 44 et 45 sont VIDES
// dans la Crampon. L'alignement est donc 1:1 sur toute la longueur, sans rien à décaler.
MAP.JOS = v => {
  if (v.ch === 4) return v.v <= 23 ? 'JOS.4.' + v.v : (v.v === 24 ? 'JOS.4.23' : `JOS.4.${v.v - 1}`)
  if (v.ch === 5) return v.v <= 14 ? 'JOS.5.' + v.v : (v.v === 15 ? 'JOS.5.14' : `JOS.5.${v.v - 1}`)
  return `JOS.${v.ch}.${v.v}`
}

// 1SA : une seule frontière décalée, au passage du ch. 20 au ch. 21. L'édition suit la
// Vulgate (dernier verset de l'entrevue de David et Jonathas rattaché au ch. 20), le canon
// suit l'hébreu (il ouvre le ch. 21). Contrôle arithmétique : 43 + 15 = 42 + 16 = 58.
//   Sacy 20,43 → canon 21,1   ·   Sacy 21,v → canon 21,v+1
// Vérifié mot pour mot : Sacy 20,43 « David en même-tems se retira, & Jonathas rentra dans
// la ville » = Crampon 21,1 ; Sacy 21,1 « David alla à Nobé » = Crampon 21,2.
MAP['1SA'] = v => {
  if (v.ch === 20 && v.v === 43) return '1SA.21.1'
  if (v.ch === 21) return `1SA.21.${v.v + 1}`
  return `1SA.${v.ch}.${v.v}`
}

// 2SA : frontière 18/19 décalée. L'édition suit la Vulgate, qui rattache au ch. 18 le
// verset où David monte pleurer Absalon ; le canon suit l'hébreu, qui en ouvre le ch. 19.
// Contrôle arithmétique : 33 + 43 = 32 + 44 = 76.
//   Sacy 18,33 → canon 19,1   ·   Sacy 19,v → canon 19,v+1
// Vérifié : Sacy 18,33 « Le roi étant donc saisi de douleur, monta à la chambre » = Crampon
// 19,1 ; Sacy 19,43 = Crampon 19,44.
MAP['2SA'] = v => {
  if (v.ch === 18 && v.v === 33) return '2SA.19.1'
  if (v.ch === 19) return `2SA.19.${v.v + 1}`
  return `2SA.${v.ch}.${v.v}`
}

// 1KI : frontière 4/5 décalée, et de quatorze versets. L'édition suit la Vulgate (ch. 4 de
// 34 versets), le canon suit l'hébreu (ch. 4 de 20 versets, le reste ouvrant le ch. 5).
// Contrôle arithmétique : 34 + 18 = 20 + 32 = 52.
//   Sacy 4,21-34 → canon 5,1-14    ·   Sacy 5,v → canon 5,v+14
// Vérifié : Sacy 4,21 « Salomon avoit sous sa domination tous les royaumes » = Crampon 5,1 ;
// Sacy 4,34 = Crampon 5,14 ; Sacy 5,1 « Hiram roi de Tyr envoya » = Crampon 5,15.
MAP['1KI'] = v => {
  if (v.ch === 4 && v.v >= 21) return `1KI.5.${v.v - 20}`
  if (v.ch === 5) return `1KI.5.${v.v + 14}`
  return `1KI.${v.ch}.${v.v}`
}

// 2KI : frontière 11/12 décalée. L'édition suit la Vulgate, qui clôt le ch. 11 sur l'âge
// de Joas ; le canon suit l'hébreu, qui en ouvre le ch. 12.
// Contrôle arithmétique : 21 + 21 = 20 + 22 = 42.
//   Sacy 11,21 → canon 12,1   ·   Sacy 12,v → canon 12,v+1
// Vérifié : Sacy 11,21 « Joas avoit sept ans lorsqu'il commença à regner » = Crampon 12,1.
MAP['2KI'] = v => {
  if (v.ch === 11 && v.v === 21) return '2KI.12.1'
  if (v.ch === 12) return `2KI.12.${v.v + 1}`
  return `2KI.${v.ch}.${v.v}`
}

// 1CH : frontière 5/6 décalée de quinze versets. La Vulgate ouvre son ch. 6 sur la
// généalogie de Lévi, que l'hébreu rattache encore au ch. 5 ; le canon suit l'hébreu.
// Contrôle arithmétique : 26 + 81 = 41 + 66 = 107.
//   Sacy 6,1-15  → canon 5,27-41    ·   Sacy 6,16-81 → canon 6,1-66
// Vérifié : Sacy 6,1 « Les fils de Levi furent Gerson, Caath & Merari » = Crampon 5,27 ;
// Sacy 6,15 « Josedec sortit du païs » = Crampon 5,41 ; Sacy 6,16 = Crampon 6,1.
// ⚠️ L'édition répète bel et bien la liste des fils de Lévi en 6,1 et en 6,16 : ce n'est
// pas un doublon de transcription, la Vulgate porte les deux.
MAP['1CH'] = v => {
  if (v.ch === 6) return v.v <= 15 ? `1CH.5.${v.v + 26}` : `1CH.6.${v.v - 15}`
  return `1CH.${v.ch}.${v.v}`
}

// 2CH : deux frontières décalées, toutes deux d'un verset. La Vulgate rattache au chapitre
// SUIVANT le verset que l'hébreu clôt le chapitre précédent ; le canon suit l'hébreu.
// Contrôles arithmétiques : 17 + 18 = 18 + 17 = 35   et   22 + 15 = 23 + 14 = 37.
//   Sacy 2,1  → canon 1,18   ·   Sacy 2,v≥2  → canon 2,v-1
//   Sacy 14,1 → canon 13,23  ·   Sacy 14,v≥2 → canon 14,v-1
// Vérifié : Sacy 2,1 « Salomon resolut donc de bâtir un temple » = Crampon 1,18 ;
// Sacy 14,1 « Abia s'endormit avec ses peres » = Crampon 13,23 ; Sacy 14,2 = Crampon 14,1.
MAP['2CH'] = v => {
  if (v.ch === 2)  return v.v === 1 ? '2CH.1.18'  : `2CH.2.${v.v - 1}`
  if (v.ch === 14) return v.v === 1 ? '2CH.13.23' : `2CH.14.${v.v - 1}`
  return `2CH.${v.ch}.${v.v}`
}

// NEH : deux frontières décalées et deux fusions, toutes vérifiées contre le texte du
// référent verset par verset (source JesusMarie, correctement découpée).
//   Sacy 3,30    → canon 3,30-31  (l'édition réunit Mosollam et Melchias l'orfèvre)
//   Sacy 3,31    → canon 3,32
//   Sacy 4,1-6   → canon 3,33-38  (la Vulgate ouvre le ch. 4 là où l'hébreu poursuit le 3)
//   Sacy 4,7-23  → canon 4,1-17
//   Sacy 9,38    → canon 10,1     (« nous faisons une alliance » = Crampon 10,1)
//   Sacy 10,v    → canon 10,v+1
//   Sacy 7,44    → canon 7,43    CRÉNEAU PARTAGÉ avec Sacy 7,43 : l'édition coupe
//                                « Cedmihel fils | d'Oduïa » en deux, le canon n'en fait
//                                qu'un verset. Les deux moitiés se rangent par ordre_slot.
//   Sacy 7,45-47 → canon 7,44-46 (décalage ouvert par cette coupe)
//   Sacy 7,48    → canon 7,47-48 (SCINDÉ ; c'est ici que le décalage se referme)
//   Sacy 12,33   → canon 12,33-34 (SCINDÉ)
//   Sacy 12,v≥34 → canon 12,v+1
// Le ch. 12 était auparavant décalé de +1 dès le v. 7, sur la foi d'une plage 12,6 → 12,6-7 :
// c'était une erreur. Sacy 12,7 « Idaïa. C'étoient-là les principaux » répond au 12,7 du
// référent, et 12,30 comme 12,32 s'y accordent aussi — la correspondance est directe
// jusqu'au 12,33, seul verset réellement condensé.
MAP.NEH = v => {
  if (v.ch === 3)  return v.v <= 30 ? `NEH.3.${v.v}` : 'NEH.3.32'
  if (v.ch === 4)  return v.v <= 6 ? `NEH.3.${v.v + 32}` : `NEH.4.${v.v - 6}`
  if (v.ch === 7)  return v.v >= 44 && v.v <= 47 ? `NEH.7.${v.v - 1}` : `NEH.7.${v.v}`
  if (v.ch === 9)  return v.v === 38 ? 'NEH.10.1' : `NEH.9.${v.v}`
  if (v.ch === 10) return `NEH.10.${v.v + 1}`
  if (v.ch === 12) return v.v <= 33 ? `NEH.12.${v.v}` : `NEH.12.${v.v + 1}`
  return `NEH.${v.ch}.${v.v}`
}

// JOB : l'édition suit la Vulgate, le canon l'hébreu. Quatre écarts, chacun vérifié.
//   Sacy 16,5 + 16,6 → canon 16,5   (l'édition scinde ; rupture localisée par le test
//                                    de rupture, gain 0,189 — cf. §23.12)
//   Sacy 16,v≥7      → canon 16,v-1
//   Sacy 39,31-35    → canon 40,1-5  (« Le Seigneur parla de nouveau à Job » = Crampon 40,1)
//   Sacy 40,v≤27     → canon 40,v+5  (Sacy 40,1 « du milieu d'un tourbillon » = Crampon 40,6)
//   Sacy 40,28       → canon 41,1    (« Il se verra trompé dans ses esperances »)
//   Sacy 41,v        → canon 41,v+1  (Sacy 41,25 = Crampon 41,26, « le roi des superbes »)
//   Sacy 42,16       → canon 42,16-17 (l'édition réunit « il vit ses fils » et « il mourut
//                                    fort âgé & plein de jours »)
// Jb 25 et 27 : les créneaux du canon qui restent découverts sont VIDES chez le référent.
MAP.JOB = v => {
  if (v.ch === 16) return v.v <= 6 ? `JOB.16.${Math.min(v.v, 5)}` : `JOB.16.${v.v - 1}`
  if (v.ch === 39) return v.v <= 30 ? `JOB.39.${v.v}` : `JOB.40.${v.v - 30}`
  if (v.ch === 40) return v.v <= 27 ? `JOB.40.${v.v + 5}` : 'JOB.41.1'
  if (v.ch === 41) return `JOB.41.${v.v + 1}`
  return `JOB.${v.ch}.${v.v}`
}

// ECC : la Vulgate ouvre son ch. 7 sur le verset que l'hébreu clôt le ch. 6.
//   Sacy 7,1 → canon 6,12 (« Qu'est-il necessaire à un homme de rechercher… »)
//   Sacy 7,v≥2 → canon 7,v-1
MAP.ECC = v => {
  if (v.ch === 7) return v.v === 1 ? 'ECC.6.12' : `ECC.7.${v.v - 1}`
  return `ECC.${v.ch}.${v.v}`
}

// SNG : l'édition ne compte PAS le titre « Cantique des cantiques » comme verset, là où le
// canon en fait le v.1 du ch. 1 — d'où un décalage de +1 sur tout le premier chapitre.
// Deux frontières glissent ensuite. Contrôle arithmétique : 17 + 12 + 13 = 16 + 12 + 14 = 42.
//   Sacy 1,v    → canon 1,v+1
//   Sacy 5,17   → canon 6,1     ·  Sacy 6,v≤11 → canon 6,v+1
//   Sacy 6,12   → canon 7,1     ·  Sacy 7,v    → canon 7,v+1
MAP.SNG = v => {
  if (v.ch === 1) return `SNG.1.${v.v + 1}`
  if (v.ch === 5) return v.v <= 16 ? `SNG.5.${v.v}` : 'SNG.6.1'
  if (v.ch === 6) return v.v <= 11 ? `SNG.6.${v.v + 1}` : 'SNG.7.1'
  if (v.ch === 7) return `SNG.7.${v.v + 1}`
  return `SNG.${v.ch}.${v.v}`
}

// ISA : deux ruptures, et deux seulement sur 66 chapitres — les deux points classiques où la
// Vulgate ouvre un chapitre là où l'hébreu clôt le précédent. Tout le reste est direct.
//   Sacy 9,1     → canon 8,23  (« Au commencement Dieu a soulagé la terre de Zabulon & la
//                               terre de Nephthali » = Crampon 8,23, « le pays de Zabulon
//                               et le pays de Nephtali »)
//   Sacy 9,v≥2   → canon 9,v-1 (contrôle : Sacy 9,21 « sa fureur n'est point encore
//                               appaisée, & son bras est toujours étendu » = Crampon 9,20)
//   Sacy 64,1    → canon 63,19 — le créneau est PARTAGÉ avec Sacy 63,19 : le référent tient
//                  en un seul verset « Nous sommes depuis longtemps comme un peuple que vous
//                  ne gouvernez pas » ET « Ah ! si vous déchiriez les cieux », que l'édition
//                  sépare de part et d'autre d'une frontière de chapitre. Les deux parts sont
//                  chargées, rangées par ordre_slot (cf. §23.15).
//   Sacy 64,v≥2  → canon 64,v-1 (contrôle : Sacy 64,12 « vous retiendrez-vous encore ?
//                               Demeurerez-vous dans le silence » = Crampon 64,11)
// Les créneaux 8,24 et 9,21 du canon restent découverts : ils sont VIDES chez le référent.
MAP.ISA = v => {
  if (v.ch === 9)  return v.v === 1 ? 'ISA.8.23'  : `ISA.9.${v.v - 1}`
  if (v.ch === 64) return v.v === 1 ? 'ISA.63.19' : `ISA.64.${v.v - 1}`
  return `ISA.${v.ch}.${v.v}`
}

// JER : deux ruptures sur 52 chapitres. La première est celle d'Isaïe — la Vulgate ouvre le
// chapitre là où l'hébreu clôt le précédent ; la seconde est une condensation.
//   Sacy 9,1     → canon 8,23   (« Qui donnera de l'eau à ma tête, & à mes yeux une fontaine
//                                de larmes » = Crampon 8,23, « Qui changera ma tête en eaux »)
//   Sacy 9,v≥2   → canon 9,v-1  (contrôle : Sacy 9,26, dernier du chapitre, = Crampon 9,25)
//   Sacy 37,4    → canon 37,4-5 SCINDÉ : l'édition réunit « Jeremie alloit alors librement
//                                parmi le peuple » et « Cependant l'armée de Pharaon étant
//                                sortie de l'Egypte », que le canon compte séparément.
//   Sacy 37,v≥5  → canon 37,v+1 (contrôle : Sacy 37,20 « Le roi Sedecias ordonna donc que
//                                Jeremie fût mis dans le vestibule » = Crampon 37,21)
// EZK : une seule rupture sur 48 chapitres, à la frontière 20/21 — la Vulgate y clôt son
// chapitre 20 cinq versets plus loin que l'hébreu.
//   Sacy 20,45-49 → canon 21,1-5  (Sacy 20,45 « Le Seigneur me parla encore » = Crampon
//                                  21,1 ; Sacy 20,49 « Helas, helas, helas » = Crampon 21,5)
//   Sacy 21,v     → canon 21,v+5  (contrôle : Sacy 21,32 « Tu seras la pâture du feu » =
//                                  Crampon 21,37, dernier verset du chapitre)
// Contrôle arithmétique : Sacy 49 + 32 = canon 44 + 37 = 81.
MAP.EZK = v => {
  if (v.ch === 20 && v.v >= 45) return `EZK.21.${v.v - 44}`
  if (v.ch === 21) return `EZK.21.${v.v + 5}`
  return `EZK.${v.ch}.${v.v}`
}

MAP.JER = v => {
  if (v.ch === 9)  return v.v === 1 ? 'JER.8.23' : `JER.9.${v.v - 1}`
  if (v.ch === 37) return v.v >= 5 ? `JER.37.${v.v + 1}` : `JER.37.${v.v}`
  return `JER.${v.ch}.${v.v}`
}

const DOUTEUX = {}

const COUVRE_DEUX = {
  EXO: { '40.13': 'EXO.40.15' },
  LEV: { '26.45': 'LEV.26.46' },
  NUM: { '11.34': 'NUM.11.35' },
  JOS: { '2.23': 'JOS.2.24' },
  // Sacy 1 Par. 20,7 porte à lui seul les v. 7 et 8 du canon : « … Jonathan le tua. Ce
  // sont-là les enfans des geans qui se trouverent à Geth, & qui furent tués par David. »
  '1CH': { '20.7': '1CH.20.8' },

}

// ── SCISSIONS — quand l'édition condense deux versets du canon en un seul ──────────────
// RÈGLE GÉNÉRALE. Une plage canon_id → canon_id_fin ne suffit pas : le second créneau
// reste VIDE à l'écran, et toutes les traductions de la colonne se décalent d'un cran
// jusqu'au point où l'édition se recolle. On COUPE donc le verset de l'édition en autant de
// parts qu'il couvre de créneaux ; chaque part reçoit son propre canon_id, et TOUTES gardent
// la numérotation d'origine (v_orig inchangé, distingué par v_orig_suffixe a/b/c).
// Le lecteur voit ainsi « 30 » deux fois de suite dans la colonne Sacy, ce qui est la vérité
// de l'édition, et les traductions restent alignées, ce qui est la vérité du canon.
//
// Le point de coupe est désigné PAR SON TEXTE, jamais par une position : il reste vérifiable
// à l'œil nu, et une coupe devenue introuvable est signalée au lieu de glisser en silence.
// Chaque coupe ci-dessous a été établie en confrontant le verset au référent.
const SCISSIONS = {
  NEH: [
    // Sacy 3,30 tient les v. 30 et 31 du canon ; la césure est à Melchias l'orfèvre.
    { ch: 3,  v: 30, coupes: ['Melchias fils de l’orfévre'], canons: ['NEH.3.30', 'NEH.3.31'] },
    // Sacy 7,48 réunit deux versets de la liste des Nathinéens — c'est ce verset qui
    // rattrape le décalage ouvert par le surnuméraire 7,44 (cf. SURNUMERAIRES).
    { ch: 7,  v: 48, coupes: ['les enfans de Lebana'],       canons: ['NEH.7.47', 'NEH.7.48'] },
    // Sacy 12,33 réunit les deux moitiés de la liste des princes de Juda.
    { ch: 12, v: 33, coupes: ['Judas, Benjamin'],            canons: ['NEH.12.33', 'NEH.12.34'] },
  ],
  JER: [
    // Sacy 37,4 réunit la liberté de Jérémie et la retraite des Chaldéens. Le référent
    // tranche : son 37,4 s'arrête à « on ne l'avait pas encore mis en prison », son 37,5
    // ouvre sur « Or l'armée de Pharaon était sortie d'Égypte ».
    { ch: 37, v: 4, coupes: ['Cependant l’armée de Pharaon'], canons: ['JER.37.4', 'JER.37.5'] },
  ],
  JOB: [
    // Sacy 42,16 réunit la longue vie de Job et sa mort, que le canon compte séparément.
    // Le référent tranche : son 42,16 s'arrête à « les fils de ses fils », son 42,17 porte
    // « Et Job mourut vieux et rassasié de jours ».
    { ch: 42, v: 16, coupes: ['& il mourut fort âgé'], canons: ['JOB.42.16', 'JOB.42.17'] },
  ],
}

// ── SURNUMÉRAIRES déclarés ─────────────────────────────────────────────────────────────
// Un verset que l'édition porte et dont le canon n'a aucun créneau. À n'employer QUE dans ce
// cas. Quand l'édition coupe en deux ce que le canon tient d'un seul tenant, ce n'est PAS un
// surnuméraire : le créneau existe, il est simplement partagé — voir la note ci-dessous.
const SURNUMERAIRES = {
  // Préambules non numérotés que la Vulgate imprime en tête de livre et auxquels le canon
  // de l'AELF ne donne aucun créneau. Ce sont bien des surnuméraires : du texte que
  // l'édition porte et que l'ossature ignore — à ne pas confondre avec un titre éditorial,
  // qui ne se transcrit pas du tout.
  LAM: new Set(['1.0']),   // « Après que le peuple d'Israel eut été mené en captivité… »
  BAR: new Set(['6.0']),   // « Copie de la lettre que Jeremie envoya… », en tête de Ba 6
}

// ── L'ÉDITION COUPE LÀ OÙ LE CANON NE COUPE PAS : créneau PARTAGÉ, jamais surnuméraire ──
// Sacy arrête son Ne 7,43 sur « Cedmihel fils » et ouvre le 7,44 sur « d'Oduïa, au nombre de
// soixante & quatorze » ; le canon n'en fait qu'un verset. La seconde moitié avait d'abord
// été traitée en surnuméraire — c'était une erreur : un surnuméraire sort de l'ossature et
// désaligne la colonne, alors qu'ici le créneau existe bel et bien.
// Les deux versets de l'édition reçoivent donc LE MÊME canon_id. Le chargeur les range par
// ordre_slot, la Polyglotte les affiche à la suite dans une seule case, et la colonne des
// numéros porte les deux numéros d'origine l'un sous l'autre. Les traductions restent
// alignées, et la forme propre de l'édition reste lisible.
// C'est le mécanisme déjà employé pour Sacy Is 63,19 + 64,1 (§23.15).

let versets = JSON.parse(readFileSync(D + `${PREFIXE}${CODE}_transcrit.json`, 'utf8'))

// Normaliser l'apostrophe AVANT d'appliquer les corrections de lecture. Sans cela, tout
// motif écrit avec l'apostrophe courbe (« Mon fi’s », « ajourd’hui ») ne rencontre jamais
// le texte, qui porte encore l'apostrophe droite du transcripteur — la correction échoue
// alors en silence. Quatre corrections ont été perdues ainsi avant d'être repérées.
for (const v of versets) v.texte = (v.texte || '').replace(/'/g, '’')

// ── garde-fou : une clé déclarée DEUX FOIS dans une de ces tables ────────────────────────
// En JavaScript, la seconde occurrence écrase la première EN SILENCE. C'est arrivé sur
// LECTURES.LAM : cinq règles nouvelles ont été remplacées par deux anciennes, et rien ne l'a
// dit — le contrôle « corrections sans effet » ne pouvait pas le voir, puisque les deux
// règles survivantes, elles, fonctionnaient. Seul l'écart entre le nombre de règles écrites
// et le nombre de corrections rapportées a mis sur la piste.
// On relit donc le source pour compter les clés telles qu'elles sont ÉCRITES.
{
  const src = readFileSync(new URL(import.meta.url), 'utf8')
  for (const [nom, bloc] of [['LECTURES','const LECTURES = {'], ['CAPITALES','const CAPITALES = {'],
                             ['SCISSIONS','const SCISSIONS = {'], ['SURNUMERAIRES','const SURNUMERAIRES = {']]){
    const d = src.indexOf(bloc); if (d < 0) continue
    const f = src.indexOf('\n}\n', d)
    const cles = [...src.slice(d, f).matchAll(/^ {2}'?([A-Z0-9]{2,4})'?:/gm)].map(m => m[1])
    const vus = new Set(), doubles = new Set()
    for (const c of cles){ if (vus.has(c)) doubles.add(c); vus.add(c) }
    if (doubles.size) console.log(`  ⚠ ${nom} : clé(s) déclarée(s) deux fois — la seconde écrase la première : ${[...doubles].join(' ')}`)
  }
}

let corr = 0
const REGLES = [...LECTURES_COMMUNES, ...(LECTURES[CODE] || [])]
// On ne signale « sans effet » que les règles PROPRES au livre : les règles communes ne
// s'appliquent évidemment pas partout, c'est leur raison d'être.
const inutiles = new Set((LECTURES[CODE] || []).map(([re]) => String(re)))
for (const v of versets) for (const [re, bon] of REGLES){
  const n = v.texte.replace(re, bon); if (n !== v.texte){ corr++; inutiles.delete(String(re)); v.texte = n }
}
if (inutiles.size) console.log(`  ⚠ corrections de lecture sans effet (motif introuvable) : ${[...inutiles].join(' ')}`)

// Capitales d'emphase : on remplace le passage et on marque le verset, pour que la note
// suive au chargement. Une entrée qui ne rencontre rien est signalée, jamais tue.
const capNotes = new Set()
let capsFaites = 0, capsRatees = []
for (const c of (CAPITALES[CODE] || [])){
  const cible = versets.find(v => v.ch === c.ch && v.v === c.v && v.texte.includes(c.de))
  if (!cible){ capsRatees.push(`${c.ch},${c.v} « ${c.de} »`); continue }
  cible.texte = cible.texte.split(c.de).join(c.a)
  capNotes.add(`${c.ch}.${c.v}`); capsFaites++
}
if (capsFaites) console.log(`  capitales d’emphase ramenées à la casse ordinaire : ${capsFaites}`)
if (capsRatees.length) console.log(`  ⚠ capitales déclarées SANS EFFET : ${capsRatees.join(' · ')}`)

// Passe typographique française — mutualisée avec scripts/typographie.mjs pour qu'aucun
// livre n'y échappe. NE PAS réécrire ici : une constante d'espace insécable saisie en
// littéral s'était révélée être une espace ordinaire, laissant 431 « ; » mal espacés.
const typo = corrigerTypographie

const canon = new Set((await all(sb.from('versets_canon').select('id').like('id', CODE + '.%').order('id'))).map(r => r.id))
const versCanon = MAP[CODE] || (v => `${CODE}.${v.ch}.${v.v}`)
const deux = COUVRE_DEUX[CODE] || {}
const scissions = new Map((SCISSIONS[CODE] || []).map(s => [`${s.ch}.${s.v}`, s]))

// ── plan d'alignement explicite (livres à recension divergente : Tobie, Judith) ──
// Quand il existe, il fait autorité sur la table MAP : il porte, verset par verset, soit
// un canon_id vérifié par comparaison de contenu, soit null pour un SURNUMÉRAIRE — un
// verset que l'édition porte et que le référent n'a pas. Un surnuméraire est chargé comme
// les autres, avec sa numérotation d'édition dans ch_orig/v_orig ; seul canon_id est nul.
let plan = null
const fPlan = D + `${PREFIXE}${CODE}_plan.json`
if (existsSync(fPlan)){
  plan = new Map(JSON.parse(readFileSync(fPlan, 'utf8')).map(p => [`${p.ch}.${p.v}`, p.canon_id]))
  console.log(`  plan d'alignement : ${plan.size} versets, dont ${[...plan.values()].filter(x => x === null).length} surnuméraires`)
}

const lignes = [], hors = []
for (const v of versets){
  if (plan){
    if (!plan.has(`${v.ch}.${v.v}`)){ hors.push(`${v.ch},${v.v}→absent du plan`); continue }
    const cid = plan.get(`${v.ch}.${v.v}`)
    lignes.push({ trad_id:'TR0001', livre:CODE, ch_orig:v.ch, v_orig:v.v,
      texte: typo(v.texte), canon_id: cid, canon_id_fin: null, est_suscription:false,
      notes: cid ? null : 'Verset propre à la Vulgate, sans équivalent chez le référent : la traduction latine de ce livre repose sur un original différent.',
      alignement_verifie: true })
    continue
  }
  // Surnuméraire déclaré : l'édition coupe là où le canon ne coupe pas. Pas de créneau.
  if (SURNUMERAIRES[CODE]?.has(`${v.ch}.${v.v}`)){
    lignes.push({ trad_id:'TR0001', livre:CODE, ch_orig:v.ch, v_orig:v.v, v_orig_suffixe:null,
      texte: typo(v.texte), canon_id: null, canon_id_fin: null,
      est_suscription: v.est_suscription === true,
      notes: v.est_suscription === true
        ? 'Préambule que l’édition de 1730 imprime en tête du livre, sans numéro de verset. C’est du texte, et non un titre éditorial : le canon ne lui donne simplement aucun créneau.'
        : 'Verset propre à l’édition de 1730, sans créneau dans le canon.',
      alignement_verifie: true })
    continue
  }
  // Scission : un verset de l'édition, plusieurs créneaux du canon. Chaque part garde la
  // numérotation d'origine et reçoit son propre créneau.
  const sc = scissions.get(`${v.ch}.${v.v}`)
  if (sc){
    const parts = []
    let reste = typo(v.texte), ok = true
    for (const coupe of sc.coupes){
      const i = reste.indexOf(coupe)
      if (i < 0){ hors.push(`${v.ch},${v.v}→point de coupe introuvable : « ${coupe} »`); ok = false; break }
      parts.push(reste.slice(0, i).trim()); reste = reste.slice(i)
    }
    if (!ok) continue
    parts.push(reste.trim())
    if (parts.length !== sc.canons.length){ hors.push(`${v.ch},${v.v}→${parts.length} parts pour ${sc.canons.length} créneaux`); continue }
    const manquants = sc.canons.filter(c => !canon.has(c))
    if (manquants.length){ hors.push(`${v.ch},${v.v}→créneau inconnu ${manquants.join(' ')}`); continue }
    parts.forEach((t, i) => lignes.push({ trad_id:'TR0001', livre:CODE, ch_orig:v.ch, v_orig:v.v,
      v_orig_suffixe: 'abcdefg'[i], texte: t, canon_id: sc.canons[i], canon_id_fin: null,
      est_suscription:false, alignement_verifie: true,
      notes: `L’édition de 1730 réunit en un seul verset, numéroté ${v.ch}, ${v.v}, ce que le canon compte en ${sc.canons.length} : partie ${i + 1} sur ${sc.canons.length}. La numérotation d’origine est conservée pour chaque part.` }))
    continue
  }
  const cid = versCanon(v)
  if (!canon.has(cid)){ hors.push(`${v.ch},${v.v}→${cid}`); continue }
  const fin = deux[`${v.ch}.${v.v}`] ?? null
  lignes.push({ trad_id:'TR0001', livre:CODE, ch_orig:v.ch, v_orig:v.v, v_orig_suffixe:null,
    texte: typo(v.texte), canon_id: cid, canon_id_fin: fin, est_suscription:false,
    notes: [
      v.note,
      capNotes.has(`${v.ch}.${v.v}`) ? NOTE_CAPITALES : null,
      !v.note && fin ? 'Verset unique dans l’édition de 1730, couvrant plusieurs versets du canon.' : null,
      !v.note && !fin && DOUTEUX[CODE]?.has(v.ch) ? 'Correspondance au canon à vérifier : ce chapitre compte un verset de moins que la Vulgate, la fusion n’a pas été localisée.' : null,
    ].filter(Boolean).join(' ') || null,
    alignement_verifie: !DOUTEUX[CODE]?.has(v.ch) })
}
// Plusieurs versets de l'édition peuvent partager un créneau du canon (l'édition scinde là
// où le canon garde un seul verset). NE PAS les dédoublonner : on perdrait du texte. On les
// range par ordre_slot, dans l'ordre de l'édition — la Polyglotte les affiche à la suite.
const parSlot = new Map()
// Les surnuméraires ont TOUS canon_id null : les grouper ensemble en ferait un seul créneau
// partagé de 51 versets. On les regroupe donc sous une clé propre à chacun.
for (const l of lignes){ const cle = l.canon_id ?? `surnum:${l.ch_orig}.${l.v_orig}`
  ;(parSlot.get(cle) ?? parSlot.set(cle, []).get(cle)).push(l) }
const finales = []
for (const [, groupe] of parSlot){
  groupe.sort((a, b) => a.ch_orig - b.ch_orig || a.v_orig - b.v_orig)
  groupe.forEach((l, i) => {
    l.ordre_slot = groupe.length > 1 ? i + 1 : null
    if (groupe.length > 1)
      l.notes = `Verset scindé par l’édition de 1730 : partie ${i + 1} sur ${groupe.length} du verset du canon.`
    finales.push(l)
  })
}
const scindes = [...parSlot.values()].filter(g => g.length > 1)

console.log(`${DRY?'[DRY] ':''}${CODE} — ${finales.length} versets`)
console.log(`  corrections de lecture : ${corr}`)
console.log(`  couvrant plusieurs versets du canon : ${finales.filter(l=>l.canon_id_fin).length}`)
console.log(`  créneaux du canon partagés (versets scindés) : ${scindes.length}` +
  (scindes.length ? '  → ' + scindes.map(g=>g[0].canon_id+' ← '+g.map(l=>l.ch_orig+','+l.v_orig).join(' + ')).join(' · ') : ''))
console.log(`  alignement à vérifier : ${finales.filter(l=>!l.alignement_verifie).length}`)
console.log(`  avec italiques : ${finales.filter(l=>/<i>/.test(l.texte)).length}`)
if (hors.length) console.log(`  ⚠ hors canon, écartés : ${hors.join(' ')}`)

if (!DRY){
  // §23.10 — sauvegarde de l'état antérieur avant écriture
  // Filtrer sur `livre`, et NON sur canon_id : les surnuméraires ont un canon_id nul, qu'un
  // `like('canon_id', …)` laisserait échapper — ils survivraient à la suppression et
  // s'ajouteraient aux nouveaux, en double.
  const avant = await all(sb.from('versets_v2').select('id,canon_id,texte').eq('trad_id','TR0001').eq('livre', CODE))
  const f = D + `avant_${CODE}_${new Date().toISOString().slice(0,10)}.json`
  writeFileSync(f, JSON.stringify(avant, null, 1))
  console.log(`  état antérieur sauvegardé : ${avant.length} lignes → ${f.split('/').pop()}`)

  await sb.from('versets_v2').delete().eq('trad_id','TR0001').eq('livre', CODE)
  let n = 0
  for (let i=0;i<finales.length;i+=500){
    const { error } = await sb.from('versets_v2').insert(finales.slice(i,i+500))
    if (error){ console.error('ERR ' + error.message); break }
    n += finales.slice(i,i+500).length
  }
  console.log('inséré : ' + n)
}
