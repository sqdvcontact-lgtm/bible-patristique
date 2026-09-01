// Le STOCK RÉEL des illustrations qu'un lecteur peut prendre pour portrait.
//
// ⛔ On ne DEVINE plus. L'ancienne modale demandait les soixante premiers auteurs,
// tentait `A####.jpg` pour chacun et masquait les 404 sans rien dire : le seau n'en
// porte que dix-neuf, donc quarante et une requêtes tombaient à chaque ouverture, et
// la grille se remplissait par à-coups à mesure que les échecs arrivaient.
//
// ⚠️ Le listage d'un seau n'est PAS public : les politiques de `storage.objects` le
// réservent aux administrateurs, quand bien même les fichiers, eux, se téléchargent
// librement. Il faut donc passer par le serveur et la clé de service. C'est aussi ce
// qui permet de croiser les noms en une fois plutôt que par vignette.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { erreur500 } from '@/app/lib/apiErreur'
import {
  auteurDuPortrait, cadrageDepuisPhotoPosition, CADRAGE_PAR_DEFAUT,
  refPortrait, SEAU_AUTEURS, SEAU_TRADUCTIONS, traductionDeLEncart, urlPortrait,
  type Cadrage,
} from '@/app/lib/portraits'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export type Portrait = {
  ref: string
  nom: string
  /** Le siècle pour un Père, l'ouvrage pour un traducteur. */
  detail: string
  url: string
  cadrage: Cadrage
}

export type FamillePortraits = { cle: string; titre: string; portraits: Portrait[] }

/** Le rang d'un siècle écrit en chiffres romains, pour trier « IIe » avant « IVe ».
 *
 *  ⚠️ `auteurs.siecle` est du TEXTE LIBRE, et porte souvent une fourchette :
 *  « IVe siècle-Ve siècle ». On trie sur le PREMIER nombre lu, ce qui range un auteur
 *  à son entrée en scène. Un tri alphabétique mettrait « IXe » avant « IVe ». */
const ROMAINS: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18, XIX: 19, XX: 20,
}

function rangDuSiecle(siecle: string | null): number {
  if (!siecle) return 99
  const m = siecle.match(/\b([IVX]+)e?\b/)
  return m ? (ROMAINS[m[1].toUpperCase()] ?? 99) : 99
}

export async function GET() {
  // Le corpus n'est pas secret, mais cette liste ne sert qu'à régler son compte :
  // elle reste derrière la session, comme le reste de l'espace du lecteur.
  const sb = await creerSupabaseServeur()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    const [seauAuteurs, seauTraductions] = await Promise.all([
      supabaseAdmin.storage.from(SEAU_AUTEURS).list('', { limit: 1000 }),
      supabaseAdmin.storage.from(SEAU_TRADUCTIONS).list('', { limit: 1000 }),
    ])
    if (seauAuteurs.error) return erreur500(seauAuteurs.error, 'Les portraits d’auteurs n’ont pas pu être listés.')
    if (seauTraductions.error) return erreur500(seauTraductions.error, 'Les portraits de traducteurs n’ont pas pu être listés.')

    const idsAuteurs = (seauAuteurs.data ?? []).map(o => auteurDuPortrait(o.name)).filter((v): v is string => !!v)
    // ⛔ Seuls les ENCARTS. Un bandeau est couché (charte § 37) : dans un rond, il ne
    // donnerait qu'une bande de ciel. Une traduction sans encart n'est pas proposée.
    const idsTraductions = (seauTraductions.data ?? []).map(o => traductionDeLEncart(o.name)).filter((v): v is string => !!v)

    const [auteurs, traductions] = await Promise.all([
      idsAuteurs.length
        ? supabaseAdmin.from('auteurs').select('id_auteur, nom, siecle, photo_position').in('id_auteur', idsAuteurs)
        : Promise.resolve({ data: [], error: null }),
      idsTraductions.length
        ? supabaseAdmin.from('traductions').select('trad_id, nom, auteur, ordre').in('trad_id', idsTraductions)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (auteurs.error) return erreur500(auteurs.error, 'Les auteurs n’ont pas pu être lus.')
    if (traductions.error) return erreur500(traductions.error, 'Les traductions n’ont pas pu être lues.')

    const portraitsAuteurs: Portrait[] = (auteurs.data ?? [])
      .map(a => {
        const ref = refPortrait('auteur', a.id_auteur as string)
        return {
          ref,
          nom: (a.nom as string) ?? '',
          detail: (a.siecle as string | null) ?? '',
          url: urlPortrait(ref) ?? '',
          cadrage: cadrageDepuisPhotoPosition(a.photo_position),
          rang: rangDuSiecle(a.siecle as string | null),
        }
      })
      .sort((x, y) => x.rang - y.rang || x.nom.localeCompare(y.nom, 'fr'))
      .map(({ rang: _rang, ...portrait }) => portrait)

    const portraitsTraducteurs: Portrait[] = (traductions.data ?? [])
      .map(t => {
        const ref = refPortrait('traduction', t.trad_id as string)
        return {
          ref,
          // C'est le TRADUCTEUR que le lecteur choisit, non l'ouvrage : c'est donc lui
          // qui nomme la vignette, l'ouvrage venant en second.
          nom: (t.auteur as string) || (t.nom as string) || '',
          detail: (t.nom as string) ?? '',
          url: urlPortrait(ref) ?? '',
          // Un encart de traduction n'a pas de cadrage réglé pour un rond : il est
          // déjà debout et cadré serré, le centre haut lui va.
          cadrage: CADRAGE_PAR_DEFAUT,
          rang: (t.ordre as number | null) ?? 99,
        }
      })
      .sort((x, y) => x.rang - y.rang || x.nom.localeCompare(y.nom, 'fr'))
      .map(({ rang: _rang, ...portrait }) => portrait)

    const familles: FamillePortraits[] = [
      { cle: 'auteur', titre: 'Pères de l’Église', portraits: portraitsAuteurs },
      { cle: 'traduction', titre: 'Traducteurs', portraits: portraitsTraducteurs },
    ].filter(f => f.portraits.length > 0)

    return NextResponse.json({ familles }, {
      // Le stock ne bouge qu'au dépôt d'une illustration, c'est-à-dire quelques fois
      // par an. Cinq minutes de cache privé épargnent deux listages et deux lectures
      // à chaque ouverture de la modale.
      headers: { 'Cache-Control': 'private, max-age=300' },
    })
  } catch (e) {
    return erreur500(e, 'Les illustrations n’ont pas pu être listées.')
  }
}
