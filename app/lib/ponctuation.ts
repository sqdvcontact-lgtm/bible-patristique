// Retire la ponctuation finale parasite (virgule, deux-points, tiret…)
// sans toucher aux fins de phrase légitimes (? ! . ; …) ni aux guillemets.
export function nettoyerFin(texte: string): string {
  return texte.replace(/\s*[,:\-–—]+\s*$/, '')
}
