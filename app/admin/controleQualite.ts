// CONTRÔLE QUALITÉ DES SEGMENTS
//
// Deux régimes, parce que deux objets différents :
//   · corpus  — qualité TYPOGRAPHIQUE et TEXTUELLE d'un texte patristique océrisé.
//               Les critères viennent de la charte (§3 typographie, §22 apparat) et
//               des pièges d'OCR constatés. On ne juge pas l'auteur, on juge l'édition.
//   · perso   — qualité de STYLE et de propos d'un texte personnel. Les critères sont
//               mesurables (rythme, richesse, redites, chevilles) ; ils ne prétendent
//               pas juger l'intelligence du propos, seulement ce qui se compte.
//
// Le score est sur 20. Le rang en découle MÉCANIQUEMENT — c'était le défaut du
// dispositif précédent, où « bon » et « à revoir » avaient la même moyenne (13,4 contre
// 13,0 sur 623 segments), donc ne triaient rien.
//
// Sans complaisance : aucune note n'est produite quand tout va bien côté corpus. Une
// boîte vide est une information, « aucun problème détecté » n'en est pas une.

export type Rang = 'bon' | 'moyen' | 'critique'
export type Verdict = {
  score: number          // 0 à 20
  rang: Rang             // découle du score
  rouge: string[]        // ce qu'il faut reprendre
  vert: string[]         // ce qui est réussi (régime perso seulement)
}

export const RANGS: Record<Rang, { label: string; fond: string; bord: string; texte: string }> = {
  bon:      { label: 'Bon',      fond: '#f2f8f4', bord: '#3d6b4f', texte: '#2f6046' },
  moyen:    { label: 'Moyen',    fond: '#fff8ec', bord: '#c7832f', texte: '#8a541d' },
  critique: { label: 'Critique', fond: '#fff0ed', bord: '#c0562a', texte: '#9a2a2a' },
}

export function rangDepuisScore(score: number): Rang {
  if (score >= 15) return 'bon'
  if (score >= 10) return 'moyen'
  return 'critique'
}

type EntreeCorpus = {
  segment_texte: string | null
  ref_niv1: string | null
  ref_niv1_texte: string | null
  nature: string | null
  commentaire_ia?: string | null
}

// ── Régime corpus : typographie et texte ────────────────────────────────────
export function analyserCorpus(s: EntreeCorpus): Verdict {
  const texte = (s.segment_texte ?? '').trim()
  const rouge: string[] = []
  let malus = 0
  const fauter = (poids: number, message: string) => { malus += poids; rouge.push(message) }

  if (!texte) {
    return { score: 0, rang: 'critique', rouge: ['Segment vide : à supprimer, à fusionner, ou à confirmer comme blanc voulu.'], vert: [] }
  }

  // — Intégrité du texte (les fautes les plus lourdes : elles corrompent le sens)
  const encodage = texte.match(/[�]|Ã[-¿]|Â[-¿]|â€/g)
  if (encodage) fauter(8, `Encodage corrompu : ${encodage.length} occurrence(s), dont « ${encodage[0]} ». Le fichier a été lu dans le mauvais jeu de caractères.`)

  const chiffresDansMots = texte.match(/\b[a-zà-ÿ]+[0-9]+[a-zà-ÿ]+\b/gi)
  if (chiffresDansMots) fauter(7, `Chiffre au milieu d'un mot — signature d'OCR : ${chiffresDansMots.slice(0, 3).map(m => `« ${m} »`).join(', ')}.`)

  if (/[-‐‑‒–—''']$/.test(texte)) fauter(6, 'Le segment se termine sur un tiret ou une apostrophe : mot coupé, la fin manque.')

  if (/(?:,|;|:)\s*$/.test(texte) || /\b(?:de|du|des|le|la|les|un|une|et|ou|que|qui|dont|dans|avec|pour|par|en|à|au|aux|ne|se|ce|ces|son|sa|ses)\s*$/i.test(texte)) {
    fauter(6, 'Le segment se termine sur une virgule ou un mot outil : la phrase est tronquée.')
  }

  if (texte.length > 80 && !/[.,;:!?…»”\])]/.test(texte)) {
    fauter(5, 'Aucune ponctuation sur plus de 80 signes : fragment probablement mal importé.')
  }

  // — Typographie française (charte §3)
  if (/"/.test(texte)) fauter(3, 'Guillemets droits ("). La charte §3.3 impose « … » au premier niveau, "…" au second.')
  if (/'/.test(texte)) fauter(2, "Apostrophe droite ('). Il faut l'apostrophe courbe ’.")

  const manqueInsecable = texte.match(/[^  \s][;:!?»]/g)
  if (manqueInsecable) fauter(2, `Espace insécable manquante avant une ponctuation double : ${manqueInsecable.length} cas, dont « ${manqueInsecable[0]} ».`)
  if (/«[^  ]/.test(texte)) fauter(1, 'Espace insécable manquante après un guillemet ouvrant.')

  if (/\s+[,.]/.test(texte)) fauter(2, 'Espace avant une virgule ou un point.')
  if (/\s{3,}/.test(texte)) fauter(1, 'Espaces multiples dans le texte.')
  if (texte.includes('\n\n\n')) fauter(1, 'Sauts de ligne excessifs.')

  if (/—/.test(texte)) fauter(1, 'Tiret cadratin (—). Le site compose au demi-cadratin (–).')

  // Au moins DEUX capitales romaines : « [IVXLCDM]+ » prenait le L de « Le », le C de
  // « Ce » et le D de « De » pour des ordinaux, et noyait la boîte sous du bruit.
  const ordinaux = texte.match(/\b\d+(?:e|è|ème|eme|°)\b|\b[IVXLCDM]{2,}(?:e|è|ème|°)\b/g)
  if (ordinaux) fauter(2, `Ordinal en chiffres : ${ordinaux.slice(0, 3).map(o => `« ${o} »`).join(', ')}. La charte §3.16 impose les lettres — « Quarantième », non « 40e ».`)

  const siecles = texte.match(/\b[IVXLCDM]{1,7}e\s+si[èe]cle/gi)
  if (siecles) fauter(1, `Siècle sans exposant ni petites capitales : « ${siecles[0]} » (charte §3.15).`)

  // — Découpage
  if (texte.length > 2600) fauter(4, `Segment de ${texte.length} signes : le découpage n'a pas eu lieu, le lien biblique ne pourra pas être précis.`)
  else if (texte.length > 1500) fauter(2, `Segment de ${texte.length} signes : vérifier qu'il ne réunit pas plusieurs unités de sens.`)
  if (texte.length < 18 && s.nature !== 'separateur') fauter(2, `Segment de ${texte.length} signes seulement : titre résiduel ou fragment ?`)

  // — Apparat
  if (!s.ref_niv1) fauter(3, 'Référence de niveau 1 absente : le segment est hors de toute structure.')
  if (s.ref_niv1 && s.ref_niv1_texte && s.ref_niv1.trim().toLowerCase() === s.ref_niv1_texte.trim().toLowerCase()) {
    fauter(1, 'Titre et sous-titre de niveau 1 identiques : le sous-titre n’apporte rien.')
  }
  if (s.commentaire_ia) rouge.push(`Correction IA déjà passée sur ce segment, à contrôler — ${s.commentaire_ia}`)

  const score = Math.max(0, Math.min(20, 20 - malus))
  return { score, rang: rangDepuisScore(score), rouge, vert: [] }
}

// ── Régime perso : style et propos ──────────────────────────────────────────
const CHEVILLES = ['très', 'vraiment', 'un peu', 'assez', 'plutôt', 'quelque peu', 'il y a', 'il y avait', 'chose', 'choses', 'beaucoup de', 'tout à fait', 'en quelque sorte']
const CLICHES = ['force est de constater', 'il va sans dire', 'à l’heure actuelle', 'de nos jours', 'depuis la nuit des temps', 'plus que jamais', 'au final', 'cela étant dit']

function phrases(texte: string) {
  return texte.split(/(?<=[.!?…])\s+/).map(p => p.trim()).filter(p => p.length > 1)
}

function motsDe(texte: string) {
  return texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/\b[a-z]{4,}\b/g) ?? []
}

export function analyserPerso(s: { segment_texte: string | null; note_style?: number | null; notes?: string[] | null }): Verdict {
  const texte = (s.segment_texte ?? '').trim()
  const rouge: string[] = []
  const vert: string[] = []

  if (!texte) return { score: 0, rang: 'critique', rouge: ['Segment vide.'], vert: [] }

  const ph = phrases(texte)
  const mots = motsDe(texte)
  const longueurs = ph.map(p => p.split(/\s+/).length)
  const moyenne = longueurs.reduce((a, b) => a + b, 0) / Math.max(1, longueurs.length)
  const ecart = Math.sqrt(longueurs.reduce((a, l) => a + (l - moyenne) ** 2, 0) / Math.max(1, longueurs.length))

  let malus = 0
  let bonus = 0

  // — Rythme
  if (ph.length >= 3) {
    if (ecart < 3.2) { malus += 3; rouge.push(`Rythme monotone : ${ph.length} phrases de longueur presque égale (écart type ${ecart.toFixed(1)} mot). Rien ne se détache.`) }
    else if (ecart > 7) { bonus += 2; vert.push(`Rythme franchement varié (écart type ${ecart.toFixed(1)} mots) : les ruptures de longueur portent le sens.`) }
  }
  const trop = ph.filter(p => p.split(/\s+/).length > 45)
  if (trop.length) { malus += 2; rouge.push(`${trop.length} phrase(s) de plus de 45 mots : « ${trop[0].slice(0, 70)}… ». Le lecteur perd la construction.`) }

  // — Redites
  const compte = new Map<string, number>()
  mots.forEach(m => compte.set(m, (compte.get(m) ?? 0) + 1))
  const redites = [...compte.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1])
  if (redites.length) { malus += 2; rouge.push(`Redite : ${redites.slice(0, 3).map(([m, n]) => `« ${m} » ${n} fois`).join(', ')} dans un seul segment.`) }

  // — Richesse
  const richesse = mots.length ? new Set(mots).size / mots.length : 1
  if (mots.length >= 40) {
    if (richesse < 0.6) { malus += 2; rouge.push(`Vocabulaire pauvre : ${Math.round(richesse * 100)} % de mots distincts.`) }
    else if (richesse > 0.82) { bonus += 2; vert.push(`Vocabulaire riche : ${Math.round(richesse * 100)} % de mots distincts, sans effet de liste.`) }
  }

  // — Chevilles et clichés
  const bas = texte.toLowerCase()
  const chev = CHEVILLES.filter(c => bas.includes(c))
  if (chev.length >= 2) { malus += 2; rouge.push(`Chevilles : ${chev.slice(0, 4).map(c => `« ${c} »`).join(', ')}. Elles allongent sans rien ajouter.`) }
  else if (chev.length === 0 && mots.length >= 30) { bonus += 1; vert.push('Aucune cheville : la phrase porte son poids sans remplissage.') }

  const cl = CLICHES.filter(c => bas.includes(c))
  if (cl.length) { malus += 3; rouge.push(`Formule toute faite : ${cl.map(c => `« ${c} »`).join(', ')}.`) }

  // — Adverbes en -ment
  const adv = texte.match(/\b\w+ment\b/gi) ?? []
  if (mots.length >= 40 && adv.length / mots.length > 0.055) {
    malus += 1
    rouge.push(`Adverbes en -ment trop denses : ${adv.length} pour ${mots.length} mots (${adv.slice(0, 3).join(', ')}).`)
  }

  // — Le score : la note_style existante fait foi si elle est là (elle vient d'une
  //   lecture, non d'un comptage) ; sinon on la calcule.
  const calcule = Math.max(0, Math.min(20, 13 + bonus - malus))
  const score = s.note_style != null ? s.note_style : calcule

  // Pas de repêchage : « rien à redire » n'est pas un compliment, c'est une politesse.
  // Si aucune qualité ne se mesure, la boîte verte reste vide — comme la rouge.
  return { score, rang: rangDepuisScore(score), rouge, vert }
}
