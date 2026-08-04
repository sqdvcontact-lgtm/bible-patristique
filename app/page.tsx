import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import BibleLayout from './components/BibleLayout'
import { LIVRES } from '@/app/lib/bible'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'

// La base est désormais fermée au rôle anonyme : une page serveur doit
// interroger avec la session du visiteur (client lisant les cookies), sinon elle
// s'exécute en `anon` et ne reçoit plus rien. Sans cela, la page Bible se rendait
// vide — texte et traductions introuvables.

const NOMS_LIVRES = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))

// Titre unique par chapitre lu (« Genèse 1 · Corpus Scriptura ») plutôt que le titre
// générique du site. Sans paramètre, la page redirige vers l'accueil : titre neutre.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string }>
}) {
  const p = await searchParams
  if (!p.livre && !p.chapitre) return {}
  const nom = NOMS_LIVRES[p.livre || 'GEN'] || 'Bible'
  const ch = parseInt(p.chapitre || '1')
  // Le gabarit « %s · Corpus Scriptura » du layout racine ne s'applique pas à la page
  // racine (même segment) : on compose donc le suffixe ici, pour rester cohérent.
  return { title: { absolute: `${nom} ${Number.isFinite(ch) ? ch : 1} · Corpus Scriptura` } }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string; trad?: string }>
}) {
  const params = await searchParams
  if (!params.livre && !params.chapitre && !params.trad) redirect('/accueil')

  const livre = params.livre || 'GEN'
  const chapitre = parseInt(params.chapitre || '1')
  const trad = params.trad || 'TR0001'

  const supabase = await creerSupabaseServeur()
  const [{ data: versets }, { data: traductions }] = await Promise.all([
    // `versets_lecture` et non `versets` : la vue sert le texte établi dans `versets_v2`,
    // sur l'ossature canonique. C'est ce travail-là — alignements, scissions recollées,
    // coquilles relevées — que la page Bible doit montrer.
    supabase.from('versets_lecture').select('*').eq('livre', livre).eq('chapitre', chapitre).order('verset'),
    // `dates` = vie et mort de l'auteur ; `source_edition` = référence complète de
    // l'édition présentée (ville, éditeur, date), toutes deux pour l'encart Traduction.
    supabase.from('traductions').select('trad_id, nom, auteur, dates, source_edition, date_publication, confession, langue').order('ordre', { ascending: true }),
  ])

  return (
    <Suspense fallback={null}>
      <BibleLayout
        livres={LIVRES}
        versets={versets || []}
        traductions={(traductions || []).map(t => ({ code: t.trad_id, label: t.nom, auteur: t.auteur, auteurDates: t.dates ?? null, editionRef: t.source_edition ?? null, datePublication: t.date_publication, confession: t.confession, langue: t.langue }))}
        livreActif={livre}
        chapitreActif={chapitre}
        nomLivre={NOMS_LIVRES[livre] || livre}
        tradInitiale={trad}
      />
    </Suspense>
  )
}
