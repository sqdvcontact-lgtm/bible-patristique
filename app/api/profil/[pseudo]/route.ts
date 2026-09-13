import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { estRefOriginal, idOeuvreDeRef } from '@/app/lib/refsFavoris'
import { ABREV_FR } from '@/app/lib/bible'
import { familleDeRef, identifiantDeRef, refPortraitValide, urlPortrait } from '@/app/lib/portraits'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/** L'inverse d'ABREV_FR : « Gn » → « GEN ». Un prélèvement biblique ne garde que
 *  l'abréviation française, quand la page Bible ne connaît que le code : sans cette
 *  table, une citation ne saurait pas ramener à son chapitre. */
const CODE_PAR_ABREV: Record<string, string> = Object.fromEntries(
  Object.entries(ABREV_FR).map(([code, abrev]) => [abrev, code])
)

/** Une ligne de `prelevements`, telle qu'on la lit pour la page publique. */
type PrelevementLu = {
  id: string
  type: 'biblique' | 'patristique'
  texte: string
  ref_livre_abr: string | null
  ref_chapitre: number | null
  ref_verset: number | null
  traduction: string | null
  auteur: string | null
  titre_oeuvre: string | null
  id_oeuvre: string | null
  segment_numero: number | null
}

/** Le nom du visage choisi, lu de la table qui fait autorité.
 *
 *  Une seule ligne, et seulement si un portrait a été choisi : la page publique d'un
 *  lecteur sans portrait ne paie rien pour cette résolution. */
async function nomDuPortrait(ref: string): Promise<string> {
  const famille = familleDeRef(ref)
  const identifiant = identifiantDeRef(ref)
  if (!famille || !identifiant) return ''
  if (famille === 'auteur') {
    const { data } = await sb.from('auteurs').select('nom').eq('id_auteur', identifiant).maybeSingle()
    return (data?.nom as string) ?? ''
  }
  const { data } = await sb.from('traductions').select('nom, auteur').eq('trad_id', identifiant).maybeSingle()
  return ((data?.auteur as string) || (data?.nom as string)) ?? ''
}

export async function GET(_req: Request, { params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo } = await params
  if (!pseudo) return NextResponse.json({ error: 'Pseudo manquant.' }, { status: 400 })

  // contact_email exclu intentionnellement — champ privé non consenti pour exposition publique.
  // avatar_* et citation_preferee sont publics (portrait choisi + verset préféré, faible
  // sensibilité) : le profil public a toujours été censé les afficher.
  const { data: profil, error } = await sb
    .from('profils')
    .select('id, pseudo, bio, created_at, pub_rang, pub_essais, pub_favoris_oeuvre, pub_favoris_versets, avatar_ref, avatar_pos_x, avatar_pos_y, avatar_zoom, citation_preferee, mecene_depuis, pub_mecene')
    .eq('pseudo', pseudo)
    .maybeSingle()

  if (error || !profil) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })

  // ⛔ L'adresse du portrait se FABRIQUE ici, elle ne se lit pas. La table ne porte
  // qu'une référence — « auteur:A0010 » —, précisément pour qu'aucune adresse venue
  // du navigateur d'un lecteur ne puisse être servie aux visiteurs de sa page. Le
  // NOM se résout de même, pour la même raison : une copie du nom en base serait
  // aussi falsifiable que l'ancienne adresse. Voir app/lib/portraits.ts.
  const avatar = refPortraitValide(profil.avatar_ref)
    ? {
        imageUrl: urlPortrait(profil.avatar_ref) ?? '',
        nom: await nomDuPortrait(profil.avatar_ref),
        posX: profil.avatar_pos_x, posY: profil.avatar_pos_y, zoom: profil.avatar_zoom,
      }
    : null

  const rep: Record<string, unknown> = {
    pseudo: profil.pseudo,
    bio: profil.bio ?? null,
    membre_depuis: profil.created_at,
    avatar,
    citation_preferee: profil.citation_preferee ?? null,
    // ⛔ On ne rend que l'ANNÉE, et seulement si le lecteur laisse paraître sa marque.
    // La date pleine dirait le jour du don, ce qui, croisé avec un relevé, le nomme ;
    // et le montant, lui, n'existe nulle part en base.
    mecene_depuis: profil.pub_mecene && profil.mecene_depuis
      ? new Date(profil.mecene_depuis as string).getFullYear()
      : null,
  }

  // Toutes les sections conditionnelles exécutées en parallèle (réduction de N requêtes séquentielles → 1 batch)
  const [classementRes, essaisRes, favsRes, prelevementsRes, nomReelRes] = await Promise.all([
    // ⛔ Le rang se lit dans `lecture_utilisateurs`, et non plus dans le classement :
    // il mesure la LECTURE et non la conversation depuis le 1er septembre 2026.
    // Voir app/lib/classement.ts.
    profil.pub_rang
      ? sb.from('lecture_utilisateurs')
          .select('nb_auteurs, total_auteurs')
          .eq('user_id', profil.id).maybeSingle()
      : null,
    profil.pub_essais
      ? sb.from('essais')
          .select('id, titre, sous_titre, categories, publie_at, nb_vues')
          // ⛔ Une publication anonyme ne paraît pas sur la page de son auteur.
          .eq('user_id', profil.id).eq('statut', 'publie').eq('anonyme', false)
          .order('publie_at', { ascending: false }).limit(10)
      : null,
    profil.pub_favoris_oeuvre
      ? sb.from('favoris').select('ref_id, created_at')
          .eq('user_id', profil.id).eq('type', 'oeuvre')
          .order('created_at', { ascending: false })
      : null,
    // ⚠️ Les DEUX corpus, et non plus les seuls versets : ce que le lecteur retient
    // des Pères est de même nature que ce qu'il retient de l'Écriture, et « Mes
    // citations » les garde côte à côte. On en lit large (30) pour n'en montrer que
    // six : les passages d'une œuvre dépubliée se retirent ensuite, et une liste
    // arrêtée à six d'avance aurait pu se vider entièrement.
    profil.pub_favoris_versets
      ? sb.from('prelevements')
          .select('id, type, ref_livre_abr, ref_chapitre, ref_verset, texte, traduction, auteur, titre_oeuvre, id_oeuvre, segment_numero, created_at')
          .eq('user_id', profil.id)
          .order('created_at', { ascending: false }).limit(30)
      : null,
    sb.from('essais').select('id')
      .eq('user_id', profil.id).eq('statut', 'publie')
      .eq('afficher_nom_reel', true).limit(1),
  ])

  if (profil.pub_rang) {
    rep.lecture = classementRes?.data ?? { nb_auteurs: 0, total_auteurs: 0 }
  }

  if (profil.pub_essais) {
    rep.essais = essaisRes?.data ?? []
  }

  // Bibliothèque personnelle — exposée uniquement si pub_favoris_oeuvre est activé
  if (profil.pub_favoris_oeuvre) {
    const favs = favsRes?.data ?? []
    if (favs.length) {
      // Un texte original mis en favori pour lui-même se réfère « <id>#la » : c’est
      // l’œuvre porteuse qu’il faut aller chercher, sans quoi le favori disparaîtrait
      // du profil public faute de correspondance.
      const ids = [...new Set(favs.map(f => idOeuvreDeRef(f.ref_id)))]
      const { data: oeuvreRows } = await sb
        .from('oeuvres').select('id_oeuvre, titre, id_auteur, acces_public, langue_originale').in('id_oeuvre', ids)

      const oeuvresPubliees = ((oeuvreRows ?? []) as any[]).filter(estOeuvrePubliee)
      const auteurIds = [...new Set(oeuvresPubliees.map(o => o.id_auteur).filter(Boolean))]
      const { data: auteurRows } = await sb
        .from('auteurs').select('id_auteur, nom').in('id_auteur', auteurIds)

      const auteurMap: Record<string, string> = {}
      for (const a of auteurRows ?? []) auteurMap[a.id_auteur] = a.nom

      const oeuvreMap: Record<string, { titre: string; auteur: string; langueOriginale: string | null }> = {}
      for (const o of oeuvresPubliees) {
        oeuvreMap[o.id_oeuvre] = { titre: o.titre, auteur: auteurMap[o.id_auteur] ?? '', langueOriginale: o.langue_originale ?? null }
      }

      rep.bibliotheque = favs
        .map(f => {
          const id = idOeuvreDeRef(f.ref_id)
          const oeuvre = oeuvreMap[id]
          if (!oeuvre) return null
          // Le texte original se nomme par sa langue : deux favoris d’une même œuvre,
          // la traduction et son original, doivent se distinguer dans la liste.
          // ⛔ La langue est celle de la fiche, sans défaut : tout ce qui n’était pas grec
          // s’y annonçait « latin » (relevé du 13 septembre 2026).
          const original = estRefOriginal(f.ref_id)
          const langue = (oeuvre.langueOriginale ?? '').trim().toLocaleLowerCase('fr-FR') || 'original'
          return {
            id,
            mt: original ? ('la' as const) : undefined,
            titre: original ? `${oeuvre.titre} — texte ${langue}` : oeuvre.titre,
            auteur: oeuvre.auteur,
          }
        })
        .filter(Boolean)
    } else {
      rep.bibliotheque = []
    }
  }

  // ── Les passages retenus ────────────────────────────────────────────────────
  if (profil.pub_favoris_versets) {
    const lues = (prelevementsRes?.data ?? []) as unknown as PrelevementLu[]

    // La citation d'honneur paraît déjà en tête de la page : l'y voir deux fois
    // ferait croire à un doublon plutôt qu'à un choix.
    const idHonneur = (profil.citation_preferee as { id?: string } | null)?.id ?? null

    // ⛔ Le TITRE d'une œuvre retirée de la lecture ne doit pas paraître. La ligne de
    // prélèvement en garde une copie, écrite au jour du prélèvement, que dépublier
    // l'œuvre ne rattrape pas : c'est la même garde que la bibliothèque, plus haut.
    const idsOeuvres = [...new Set(lues.filter(p => p.type === 'patristique' && p.id_oeuvre).map(p => p.id_oeuvre!))]
    const publiees = new Set<string>()
    if (idsOeuvres.length) {
      const { data: oeuvresCitees } = await sb
        .from('oeuvres').select('id_oeuvre, acces_public').in('id_oeuvre', idsOeuvres)
      for (const o of (oeuvresCitees ?? []) as { id_oeuvre: string; acces_public: boolean | null }[]) {
        if (estOeuvrePubliee(o)) publiees.add(o.id_oeuvre)
      }
    }

    rep.citations = lues
      .filter(p => p.id !== idHonneur)
      .filter(p => p.type === 'biblique' || (p.id_oeuvre != null && publiees.has(p.id_oeuvre)))
      .slice(0, 6)
      .map(p => {
        if (p.type === 'biblique') {
          const code = CODE_PAR_ABREV[p.ref_livre_abr ?? '']
          return {
            type: 'biblique' as const,
            texte: p.texte,
            ref: [p.ref_livre_abr, [p.ref_chapitre, p.ref_verset].filter(v => v != null).join(',')]
              .filter(Boolean).join(' '),
            precision: p.traduction ?? null,
            lien: code && p.ref_chapitre
              ? `/?livre=${code}&chapitre=${p.ref_chapitre}${p.ref_verset ? `&verset=${p.ref_verset}` : ''}`
              : null,
          }
        }
        return {
          type: 'patristique' as const,
          texte: p.texte,
          ref: [p.auteur, p.titre_oeuvre].filter(Boolean).join(', '),
          precision: null,
          lien: `/oeuvre/${p.id_oeuvre}${p.segment_numero ? `#s${p.segment_numero}` : ''}`,
        }
      })
  }

  // Nom réel — exposé uniquement si l'utilisateur a publié au moins un essai sous son vrai nom
  if (nomReelRes?.data?.length) {
    const { data: identite } = await sb
      .from('profils').select('nom, prenom').eq('id', profil.id).maybeSingle()
    if (identite?.nom) {
      rep.nom_reel = [identite.prenom, identite.nom].filter(Boolean).join(' ')
    }
  }

  return NextResponse.json(rep)
}
