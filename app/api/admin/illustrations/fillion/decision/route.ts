import { NextResponse } from 'next/server'
import { estAdmin } from '@/app/lib/verifAdmin'
import { clientAdministration } from '@/app/admin/illustrations/fillion/donnees'

export const dynamic = 'force-dynamic'

const LONGUEUR_MAX_INSTRUCTION = 4000
const FORME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Objet = Record<string, unknown>

function reponseErreur(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/** Un objet JSON, ou un objet vide : `metadata` et `processing_parameters` se
 *  complètent, ils ne se remplacent jamais. */
function objet(valeur: unknown): Objet {
  return valeur && typeof valeur === 'object' && !Array.isArray(valeur) ? valeur as Objet : {}
}

/** Un navigateur envoie l'origine de tout POST : son absence désigne un client hors
 *  navigateur, que la vérification administrateur arrête ensuite. */
function memeOrigine(request: Request): boolean {
  const origine = request.headers.get('origin')
  const hote = request.headers.get('host')
  if (!origine || !hote) return true
  try {
    return new URL(origine).host === hote
  } catch {
    return false
  }
}

/**
 * La décision de l'auteur sur une gravure de Fillion : la valider (et la verrouiller),
 * ou demander une reprise avec une indication.
 *
 * ⛔ AUCUNE DÉROGATION, PAS MÊME EN DÉVELOPPEMENT. La route écrit en service role, et
 * le serveur local lit ET écrit la base de production : une porte ouverte « en
 * développement » était une porte ouverte sur la base, pour quiconque atteint le poste.
 */
export async function POST(request: Request) {
  if (!memeOrigine(request)) return reponseErreur('Origine de la requête refusée.', 403)
  if (!(await estAdmin())) return reponseErreur('Non autorisé.', 403)

  let corps: { assetId?: unknown; decision?: unknown; instruction?: unknown }
  try {
    corps = await request.json()
  } catch {
    return reponseErreur('Requête illisible.', 400)
  }

  const assetId = typeof corps.assetId === 'string' ? corps.assetId.trim() : ''
  const decision = corps.decision
  const instruction = typeof corps.instruction === 'string' ? corps.instruction.trim() : ''
  if (!FORME_UUID.test(assetId)) return reponseErreur('Illustration manquante ou mal désignée.', 400)
  if (decision !== 'validated' && decision !== 'review') return reponseErreur('Décision inconnue.', 400)
  if (decision === 'review' && !instruction) return reponseErreur('Ajoutez une indication avant d’enregistrer « À revoir ».', 400)
  if (instruction.length > LONGUEUR_MAX_INSTRUCTION) return reponseErreur(`L’indication ne peut pas dépasser ${LONGUEUR_MAX_INSTRUCTION} caractères.`, 400)

  const supabase = clientAdministration()
  const { data: membre, error: erreurMembre } = await supabase
    .from('v_bible_edition_catalog')
    .select('family_id')
    .eq('trad_id', 'TR0010')
    .limit(1)
    .maybeSingle()
  if (erreurMembre || !membre?.family_id) return reponseErreur('Famille Fillion introuvable.', 500)

  const [{ data: actif, error: erreurActif }, { data: fichiers, error: erreurFichiers }] = await Promise.all([
    supabase
      .from('bible_edition_assets')
      .select('id,asset_key,metadata')
      .eq('id', assetId)
      .eq('family_id', membre.family_id)
      .maybeSingle(),
    supabase
      .from('bible_edition_asset_files')
      .select('id,variant_role,processing_parameters')
      .eq('asset_id', assetId)
      .eq('family_id', membre.family_id),
  ])
  if (erreurActif) return reponseErreur('Impossible de lire l’illustration.', 500)
  if (!actif?.asset_key?.startsWith('fillion-')) return reponseErreur('Illustration Fillion introuvable.', 404)
  if (erreurFichiers) return reponseErreur('Impossible de lire les fichiers de l’illustration.', 500)
  const web = fichiers?.find((fichier) => fichier.variant_role === 'web')
  const masters = fichiers?.filter((fichier) => fichier.variant_role === 'master') ?? []
  if (!web) return reponseErreur('Le dérivé destiné à la Bible est introuvable.', 409)

  const maintenant = new Date().toISOString()
  const valide = decision === 'validated'
  const metadataActuelles = objet(actif.metadata)
  const controlesActuels = objet(metadataActuelles.quality_controls)
  const metadata = {
    ...metadataActuelles,
    editorial_decision: {
      status: valide ? 'validated' : 'review_requested',
      instruction: valide ? null : instruction,
      locked: valide,
      decided_at: maintenant,
      source: 'fillion_review_reader',
    },
    quality_revision: {
      ...objet(metadataActuelles.quality_revision),
      ...(valide
        ? { status: 'approved_by_author', approved_at: maintenant, author_instruction: null, author_validation_claimed: true }
        : { status: 'changes_requested_by_author', requested_at: maintenant, author_instruction: instruction, author_validation_claimed: false }),
    },
    quality_controls: {
      ...controlesActuels,
      checks: {
        ...objet(controlesActuels.checks),
        author_review_still_required: !valide,
        author_approved: valide,
        editorial_lock_active: valide,
      },
    },
    technical_publication_override: true,
    editorial_validation_claimed: valide,
  }
  const decisionFichier = { status: decision, decided_at: maintenant, instruction: valide ? null : instruction }

  // La visibilité dans la Bible est indépendante de la décision éditoriale : le WebP
  // reste techniquement validé et public, le master demeure privé.
  const erreursMasters = await Promise.all(masters.map(async (master) => {
    const { error } = await supabase
      .from('bible_edition_asset_files')
      .update({
        validation_status: 'review',
        is_public: false,
        processing_parameters: { ...objet(master.processing_parameters), author_decision: decisionFichier },
      })
      .eq('id', master.id)
    return error
  }))
  const erreurMaster = erreursMasters.find(Boolean)
  if (erreurMaster) {
    console.error('[revue Fillion] master', actif.asset_key, erreurMaster.message)
    return reponseErreur('La décision n’a pas pu être appliquée au master.', 500)
  }

  const { error: erreurWeb } = await supabase
    .from('bible_edition_asset_files')
    .update({
      validation_status: 'validated',
      is_public: true,
      processing_parameters: { ...objet(web.processing_parameters), author_decision: decisionFichier },
    })
    .eq('id', web.id)
  if (erreurWeb) {
    console.error('[revue Fillion] web', actif.asset_key, erreurWeb.message)
    return reponseErreur('La décision n’a pas pu être appliquée au fichier affiché.', 500)
  }

  const { data: resultat, error: erreurDecision } = await supabase
    .from('bible_edition_assets')
    .update({
      metadata,
      // validation_status atteste ici la diffusabilité technique. La décision de
      // l’auteur reste portée séparément par requires_review et metadata.
      validation_status: 'validated',
      requires_review: !valide,
      is_public: true,
    })
    .eq('id', actif.id)
    .select('id,asset_key,validation_status,requires_review,is_public,metadata')
    .single()
  if (erreurDecision) {
    console.error('[revue Fillion] actif', actif.asset_key, erreurDecision.message)
    return reponseErreur('La décision n’a pas pu être enregistrée.', 500)
  }

  return NextResponse.json({
    ok: true,
    illustration: resultat.asset_key,
    decision: resultat.metadata?.editorial_decision?.status,
    locked: resultat.metadata?.editorial_decision?.locked === true,
    instruction: resultat.metadata?.editorial_decision?.instruction ?? null,
    visibleInBible: resultat.is_public === true,
    requiresReview: resultat.requires_review === true,
  })
}
