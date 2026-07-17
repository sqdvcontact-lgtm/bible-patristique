export const MARQUEUR_OEUVRE_DEPUBLIEE = '[Corpus Scriptura:depublie]'

export function estOeuvrePubliee(oeuvre: { note?: string | null } | null | undefined) {
  return oeuvre?.note !== MARQUEUR_OEUVRE_DEPUBLIEE
}
