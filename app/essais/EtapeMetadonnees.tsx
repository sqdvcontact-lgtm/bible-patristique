export const CATEGORIES_ESSAIS = ['Exégèse', 'Fiction', 'Histoire', 'Méditation', 'Patristique', 'Philosophie', 'Poésie', 'Prière', 'Spiritualité', 'Théologie']
export const RESUME_MIN = 50
export const RESUME_MAX = 200

export const CONDITIONS = `En publiant un essai ou une méditation sur ce site, vous reconnaissez et acceptez ce qui suit :

– L'œuvre que vous publiez, ainsi que les droits qui s'y rattachent, vous appartiennent en propre, de façon absolue et irrévocable. Vous garantissez en être l'auteur, ou détenir les droits nécessaires à sa publication.

– Nul, hormis vous-même, titulaire du compte, ne peut s'approprier cette œuvre. Elle peut être citée par d'autres, mais seulement ponctuellement, dans le respect du droit de citation, et jamais reprise dans son intégralité sans votre accord.

– Le contenu publié doit respecter les lois en vigueur en France, et s'inscrire dans un esprit de partage, de développement intellectuel, de transmission du savoir et d'intelligence de la foi.

– Vous autorisez l'éditeur du site à apporter des corrections mineures (mise en forme, typographie, orthographe) qui n'altèrent pas le sens de votre texte.

– Vous accordez à Corpus Scriptura le droit d'héberger, d'afficher et de rendre votre texte consultable sur le site, sans que cela ne transfère la propriété de l'œuvre ni n'en restreigne l'usage que vous pourriez en faire ailleurs.

– Le site se réserve le droit de retirer ou de refuser tout contenu manifestement illicite, diffamatoire, ou contraire à l'esprit du projet, après examen par l'administration.

– Vous pouvez à tout moment demander le retrait définitif de votre texte du site.`

export type Metadonnees = { titre: string; sousTitre: string; resume: string; categories: string[] }
