import { createHash } from 'node:crypto'

// Empreinte ANONYME d'un visiteur, côté serveur seulement.
//
// Elle sert partout où l'on a besoin de reconnaître « la même personne dans la
// journée » sans rien garder de nominatif : la mesure d'audience, la limitation
// de débit du formulaire de contact, la trace d'une proposition d'œuvre. L'adresse
// IP entre dans un hachage avec un sel qui change chaque jour, et n'en ressort
// jamais : ce qui est écrit en base ne permet ni de la retrouver, ni de suivre
// quelqu'un d'un jour à l'autre. C'est ce que promet la page Confidentialité
// (« votre adresse IP n'est enregistrée à aucun moment »), et jusqu'au 2026-09-02
// le formulaire de contact la contredisait en écrivant l'adresse en clair.
//
// Le sel se dérive d'un secret qui ne quitte jamais le serveur. À défaut
// d'AUDIENCE_SEL, la clé de service fait l'affaire : elle est déjà secrète, déjà
// présente en production, et le hachage ne permet pas de la retrouver. Poser
// AUDIENCE_SEL reste préférable, ne serait-ce que pour pouvoir la faire tourner
// sans toucher à l'accès à la base.
const SECRET_SEL = process.env.AUDIENCE_SEL ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'sel-absent'

export function empreinteAnonyme(
  ip: string,
  userAgent: string,
  options?: { sel?: string; jour?: string },
): string {
  const sel = options?.sel ?? SECRET_SEL
  const jour = options?.jour ?? new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${sel}|${jour}|${ip}|${userAgent}`).digest('hex').slice(0, 32)
}

/** L'adresse telle que l'hébergeur la transmet ; ne sert qu'à nourrir l'empreinte. */
export function adresseDuClient(request: Request): string {
  return (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'inconnue'
}
