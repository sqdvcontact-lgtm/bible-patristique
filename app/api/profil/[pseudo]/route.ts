import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { estRefOriginal, idOeuvreDeRef } from '@/app/lib/refsFavoris'
import { familleDeRef, identifiantDeRef, refPortraitValide, urlPortrait } from '@/app/lib/portraits'
import { lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import {
  COLONNES_PRELEVEMENT_FAVORITE,
  composerFavorites,
  lireFavorite,
  oeuvresDesFavorites,
  textesDesFavorites,
  type TexteCite,
  prelevementsDesFavorites,
  type PrelevementDeFavorite,
} from '@/app/lib/citationsFavorites'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Les prélèvements qui portent les citations favorites, et eux seuls.
 *
 * ⛔ Toujours bornés au LECTEUR (`user_id`) : un identifiant écrit dans une colonne de
 * favorite ne doit pas faire paraître le prélèvement d'un autre. Et les clauses `in` se
 * découpent en octets d'adresse, jamais en nombre de valeurs.
 * ⚠️ Couche SECONDAIRE : un échec se journalise, et la page paraît sans ses favorites
 * plutôt que de tomber.
 */
async function chargerPrelevementsFavoris(idLecteur: string, ids: string[]): Promise<PrelevementDeFavorite[]> {
  if (!ids.length) return []
  const reponses = await Promise.all(lotsPourClauseIn(ids).map(lot =>
    sb.from('prelevements').select(COLONNES_PRELEVEMENT_FAVORITE).eq('user_id', idLecteur).in('id', lot),
  ))
  const lignes: PrelevementDeFavorite[] = []
  for (const { data, error } of reponses) {
    if (error) {
      console.error('[profil] citations favorites non relues :', error.message)
      return []
    }
    lignes.push(...((data ?? []) as unknown as PrelevementDeFavorite[]))
  }
  return lignes
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
  // avatar_* et les deux citations favorites sont publics (portrait choisi, passages choisis
  // pour cette page, faible sensibilité) : c'est pour les montrer qu'on les choisit.
  const { data: profil, error } = await sb
    .from('profils')
    .select('id, pseudo, bio, created_at, pub_rang, pub_essais, pub_favoris_oeuvre, avatar_ref, avatar_pos_x, avatar_pos_y, avatar_zoom, citation_favorite_biblique, citation_favorite_patristique, mecene_depuis, pub_mecene')
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

  // ── Les citations favorites ──
  // ⛔ « Ma page » ne montre plus, de ce que le lecteur a retenu, que ses deux favorites :
  // une de l'Écriture, une des Pères (décision de l'auteur, 2026-09-14). Les colonnes sont
  // écrites par le navigateur du lecteur : on les LIT, et tout ce qui n'a pas la forme
  // attendue vaut « aucune favorite ».
  const favorites = [
    lireFavorite(profil.citation_favorite_biblique, 'biblique'),
    lireFavorite(profil.citation_favorite_patristique, 'patristique'),
  ]

  const rep: Record<string, unknown> = {
    pseudo: profil.pseudo,
    bio: profil.bio ?? null,
    membre_depuis: profil.created_at,
    avatar,
    // ⛔ On ne rend que l'ANNÉE, et seulement si le lecteur laisse paraître sa marque.
    // La date pleine dirait le jour du don, ce qui, croisé avec un relevé, le nomme ;
    // et le montant, lui, n'existe nulle part en base.
    mecene_depuis: profil.pub_mecene && profil.mecene_depuis
      ? new Date(profil.mecene_depuis as string).getFullYear()
      : null,
  }

  // Toutes les sections conditionnelles exécutées en parallèle (réduction de N requêtes séquentielles → 1 batch)
  const [classementRes, essaisRes, favsRes, lignesFavorites, nomReelRes] = await Promise.all([
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
    // Les prélèvements des deux favorites, et eux seuls : la liste des passages retenus
    // n'est plus servie.
    chargerPrelevementsFavoris(profil.id, prelevementsDesFavorites(favorites)),
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

  // ── Les citations favorites, composées ──
  // ⛔ Le TITRE d'une œuvre retirée de la lecture ne doit pas paraître, ni son texte. La
  // ligne de prélèvement en garde une copie, écrite au jour du prélèvement, que dépublier
  // l'œuvre ne rattrape pas : c'est la même garde que la bibliothèque, plus haut. Une
  // lecture en échec ferme la porte plutôt que de l'ouvrir.
  // ⛔ Et le TEXTE cité est une édition à part entière (charte § 5.5.1) : retiré de la
  // lecture, il ne paraît pas ; hors du texte par défaut, le lien le rouvre.
  const oeuvresCitees = oeuvresDesFavorites(lignesFavorites)
  const textesCites = textesDesFavorites(lignesFavorites)
  const publiees = new Set<string>()
  const textes = new Map<string, TexteCite>()
  const [oeuvresLues, textesLus] = await Promise.all([
    oeuvresCitees.length
      ? sb.from('oeuvres').select('id_oeuvre, acces_public').in('id_oeuvre', oeuvresCitees)
      : null,
    textesCites.length
      ? sb.from('oeuvre_textes').select('id_texte, is_default, is_public').in('id_texte', textesCites)
      : null,
  ])
  if (oeuvresLues?.error) console.error('[profil] ouverture des œuvres citées non lue :', oeuvresLues.error.message)
  for (const o of (oeuvresLues?.data ?? []) as { id_oeuvre: string; acces_public: boolean | null }[]) {
    if (estOeuvrePubliee(o)) publiees.add(o.id_oeuvre)
  }
  if (textesLus?.error) console.error('[profil] textes cités non lus :', textesLus.error.message)
  for (const t of (textesLus?.data ?? []) as ({ id_texte: string } & TexteCite)[]) {
    textes.set(t.id_texte, { is_default: t.is_default, is_public: t.is_public })
  }
  rep.citations_favorites = composerFavorites(favorites, lignesFavorites, publiees, textes)

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
