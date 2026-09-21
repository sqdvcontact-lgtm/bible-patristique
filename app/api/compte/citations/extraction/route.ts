/**
 * L'EXTRACTION DES CITATIONS d'un lecteur — la route qui compose le recueil et le dépose.
 *
 * Elle reçoit ce que la page « Mes citations » a composé (voir `extractionCitations.ts`),
 * le borne, le met en page (`documentCitations.ts`) et rend le `.docx`.
 *
 * ⛔ ELLE EXIGE UNE SESSION : un lecteur n'extrait que ses propres citations, et une route
 * de composition ouverte à tous ne servirait qu'à faire tourner nos fonctions pour autrui.
 * ⚠️ Elle ne lit RIEN en base : la page lui envoie le texte qu'elle montre, et le document
 * ne va qu'à celui qui l'a demandé.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { construireDocx } from '@/app/lib/docx/ooxml'
import { composerRecueilCitations, dateDuRecueil } from '@/app/lib/docx/documentCitations'
import { OCTETS_MAX_DEMANDE, lireDemandeExtraction } from '@/app/lib/extractionCitations'
import { nomDuFichier } from '@/app/lib/extractionOeuvre'

// ⛔ Node, jamais Edge : le composeur emploie `zlib` et `Buffer`.
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await creerSupabaseServeur()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connectez-vous pour extraire vos citations.' }, { status: 401 })

  const corps = await request.text()
  if (corps.length > OCTETS_MAX_DEMANDE) {
    return NextResponse.json({ error: 'La sélection est trop longue pour un seul document.' }, { status: 413 })
  }
  let brut: unknown
  try { brut = JSON.parse(corps) } catch { brut = null }
  const demande = lireDemandeExtraction(brut)
  if (!demande) return NextResponse.json({ error: 'La sélection n’a pas pu être lue.' }, { status: 400 })

  const dateIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  const document = construireDocx({
    titre: 'Citations',
    auteur: demande.lecteur,
    description: `Citations recueillies${demande.lecteur ? ` par ${demande.lecteur}` : ''}. Extrait de Corpus Scriptura le ${dateDuRecueil(dateIso)}.`,
    dateIso,
    blocs: composerRecueilCitations(demande, dateIso),
  })

  const nom = nomDuFichier('Mes citations', dateDuRecueil(dateIso), 'docx')
  return new NextResponse(new Uint8Array(document), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // ⚠️ DEUX formes du nom : `filename` en ASCII pour les clients anciens, `filename*`
      // en UTF-8 pour les autres.
      'Content-Disposition': `attachment; filename="${nom.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(nom)}`,
      'Content-Length': String(document.length),
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}
