export type SegmentDiff = { texte: string; type: 'commun' | 'ajoute' | 'supprime' }

// Diff au niveau du mot (LCS) — suffisant pour repérer ce qui a changé dans un
// essai sans avoir besoin d'une bibliothèque externe.
export function diffMots(a: string, b: string): { gauche: SegmentDiff[]; droite: SegmentDiff[] } {
  const ta = a.split(/(\s+)/)
  const tb = b.split(/(\s+)/)
  const n = ta.length, m = tb.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const gauche: SegmentDiff[] = [], droite: SegmentDiff[] = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (ta[i] === tb[j]) { gauche.push({ texte: ta[i], type: 'commun' }); droite.push({ texte: tb[j], type: 'commun' }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { gauche.push({ texte: ta[i], type: 'supprime' }); i++ }
    else { droite.push({ texte: tb[j], type: 'ajoute' }); j++ }
  }
  while (i < n) { gauche.push({ texte: ta[i], type: 'supprime' }); i++ }
  while (j < m) { droite.push({ texte: tb[j], type: 'ajoute' }); j++ }
  return { gauche, droite }
}