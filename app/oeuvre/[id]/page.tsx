import { hydraterLiensHerites } from '@/app/lib/liens'
import { codesTraductionsLecture } from '@/app/lib/traductions'
import type { Metadata } from 'next'
import { estAdmin as verifierEstAdmin } from '@/app/lib/verifAdmin'
import { ABREV_FR } from '@/app/lib/bible'
import { parseNotes } from '@/app/lib/notes'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { JsonLd, donneesLivre, donneesFilAriane } from '@/app/lib/donneesStructurees'
import OeuvreClient from './OeuvreClient'

// Base fermée au rôle anonyme : chaque entrée serveur (métadonnées, page) crée
// son client lisant la session du visiteur. Sans cela, la page s'exécutait en
// `anon` et ne recevait plus ni segments ni versets.
type Client = Awaited<ReturnType<typeof creerSupabaseServeur>>

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const supabase = await creerSupabaseServeur()
  const { data } = await supabase
    .from('oeuvres')
    .select('titre, titre_original, sous_titre, trad_auteur, auteurs(nom, nom_original)')
    .eq('id_oeuvre', id).maybeSingle()
  if (!data) return { title: 'Corpus Scriptura' }
  const auteur = (data.auteurs as any)?.nom
  // Mots-clés = toutes les formes sous lesquelles on cherche l'œuvre et l'auteur.
  const motsCles = [data.titre, data.titre_original, auteur, (data.auteurs as any)?.nom_original]
    .filter((v): v is string => !!v)
  const description = [
    auteur ? `${data.titre}, ${auteur}` : data.titre,
    data.sous_titre || null,
    data.trad_auteur ? `traduction de ${data.trad_auteur}` : null,
  ].filter(Boolean).join('. ') + '. Texte et notice sur Corpus Scriptura.'
  return {
    title: auteur ? `${data.titre} — ${auteur} · Corpus Scriptura` : `${data.titre} · Corpus Scriptura`,
    description: description.slice(0, 300),
    keywords: motsCles,
  }
}

type Segment = {
  id: number; segment_numero: number; segment_texte: string
  ref_niv1: string|null; ref_niv2: string|null; ref_niv3: string|null
  ref_niv4: string|null; ref_niv5: string|null
  ref_niv1_texte: string|null; ref_niv2_texte: string|null
  ref_niv3_texte: string|null; ref_niv4_texte: string|null
  lien_1: string|null; lien_2: string|null; lien_3: string|null; lien_4: string|null
  nature: string|null
  paragraphe: number|null; rang: number|null; texte_original: string|null
}

// Un même verset peut être visé par plusieurs liens du même segment — chez un
// commentateur, il est cité PUIS commenté, et l'arbitrage n°17 rend ce cumul
// obligatoire. Il ne doit pour autant paraître qu'une fois dans le volet : on
// dédoublonne, et l'on garde la trace des natures rencontrées pour les dire.
const NATURE_LIEN = ['citation', 'reprise', 'doctrine', 'écho'] as const

function extraireVersetsAvecNature(s: Segment): { id: string; natures: string[] }[] {
  const ordre: string[] = []
  const natures = new Map<string, string[]>()
  ;[s.lien_1, s.lien_2, s.lien_3, s.lien_4].forEach((col, i) => {
    String(col ?? '').split(';').map(v => v.trim()).filter(Boolean).forEach(vid => {
      if (!natures.has(vid)) { natures.set(vid, []); ordre.push(vid) }
      const n = NATURE_LIEN[i]
      if (!natures.get(vid)!.includes(n)) natures.get(vid)!.push(n)
    })
  })
  return ordre.map(id => ({ id, natures: natures.get(id)! }))
}

function extraireVersets(s: Segment): string[] {
  return extraireVersetsAvecNature(s).map(v => v.id)
}

function segmentAffichable(s: Segment) {
  if (s.nature === 'separateur') return false
  return Boolean((s.segment_texte ?? '').trim() || extraireVersets(s).length > 0)
}

function grouper(segments: Segment[]) {
  type G = { niv1:string; niv2:string; niv3:string; niv4:string
    niv1_texte:string; niv2_texte:string; niv3_texte:string; niv4_texte:string
    items:Segment[] }
  const gs:G[]=[]
  let cur={niv1:'',niv2:'',niv3:'',niv4:'',niv1_texte:'',niv2_texte:'',niv3_texte:'',niv4_texte:'',items:[] as Segment[]}
  for(const s of segments){
    // Ignorer les séparateurs et les rubriques réellement vides.
    if(!segmentAffichable(s)) continue
    // Les introductions sont rendues à part (en tête d'homélie), hors des groupes
    // et de la pagination.
    if(s.nature==='introduction') continue
    const n1=s.ref_niv1||'',n2=s.ref_niv2||'',n3=s.ref_niv3||'',n4=s.ref_niv4||''
    if(n1!==cur.niv1||n2!==cur.niv2||n3!==cur.niv3||n4!==cur.niv4){
      if(cur.items.length>0)gs.push({...cur})
      cur={niv1:n1,niv2:n2,niv3:n3,niv4:n4,
        niv1_texte:s.ref_niv1_texte||'',niv2_texte:s.ref_niv2_texte||'',
        niv3_texte:s.ref_niv3_texte||'',niv4_texte:s.ref_niv4_texte||'',
        items:[s]}
    }
    else cur.items.push(s)
  }
  if(cur.items.length>0)gs.push({...cur})
  return gs
}

function numerotationLocale(segments: Segment[]): Map<number,number> {
  const map=new Map<number,number>()
  let c=0,n1c=''
  for(const s of segments){
    if(!segmentAffichable(s)) continue
    if(s.nature==='introduction') continue
    const n1=s.ref_niv1||'';if(n1!==n1c){c=0;n1c=n1};map.set(s.id,++c)
  }
  return map
}


function detailsRefBiblique(ref:string): { label: string; livre: string; chapitre: string; verset: string } {
  const p=ref.trim().split(' ')
  if(p.length<2)return { label: ref, livre: '', chapitre: '', verset: '' }
  const cv=p[1].split(':')
  const label = cv[1]?`${ABREV_FR[p[0]]||p[0]} ${cv[0]}, ${cv[1]}`:`${ABREV_FR[p[0]]||p[0]} ${cv[0]}`
  return { label, livre: p[0], chapitre: cv[0] || '', verset: cv[1] || '' }
}

// N'expose que les traductions réellement matérialisées dans `versets_lecture` :
// une colonne inexistante dans le select fait échouer toute la requête (voir
// app/lib/traductions.ts).
async function chargerCodesTraductions(supabase: Client) {
  return codesTraductionsLecture(supabase)
}

async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]) {
  const tousIds = new Set<string>()
  segments.forEach(s => extraireVersets(s).forEach(v => tousIds.add(v)))
  const tousIdsArray = Array.from(tousIds)
  if (tousIdsArray.length === 0) return {}
  const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => `"${code}"`)].join(', ')
  const batchSize = 500
  const batches = Array.from({ length: Math.ceil(tousIdsArray.length / batchSize) }, (_, i) =>
    tousIdsArray.slice(i * batchSize, (i + 1) * batchSize))
  const results = await Promise.all(batches.map(batch =>
    supabase.from('versets_lecture').select(selectVersets).in('id_verset', batch)))
  const versetsData = results.flatMap(r => r.data ?? []) as any[]

  const versetMap: Record<string,{label:string;textes:Record<string,string>}> = {}
  versetsData.forEach(v => {
    const textes = Object.fromEntries(codesTraductions.map(code => [code, v[code] || '']))
    const ref = detailsRefBiblique(v.ref)
    versetMap[v.id_verset] = {
      ...ref,
      textes,
    }
  })
  return versetMap
}

export default async function OeuvrePage({
  params,
  searchParams,
}:{
  params:Promise<{id:string}>
  searchParams?:Promise<{segment?:string}>
}) {
  const {id}=await params
  const sp = searchParams ? await searchParams : {}
  const segmentCibleId = Number(sp.segment ?? '')

  // Client lisant la session : les fonctions imbriquées ci-dessous le capturent.
  const supabase = await creerSupabaseServeur()

  // Admin = connecté avec le compte administrateur (adresse fixe), vérifié
  // côté serveur via la session Supabase Auth — remplace l'ancien cookie
  // bp_admin_session, qui n'est plus jamais posé depuis la suppression de la
  // page de connexion par mot de passe.
  const SELECT_SEG = 'id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,nature,notes,paragraphe,rang,texte_original'
  const NATURES_TEXTE = ['texte', 'introduction', 'citation', 'dialogue', 'texte absent']

  async function chargerTousSegments(filtre: Record<string, string>) {
    // Applique le filtre à une requête (nature « texte » embarque les introductions).
    const appliquer = (q: any) => {
      for (const [k, v] of Object.entries(filtre)) {
        if (k === 'nature' && v === 'texte') q = q.in('nature', NATURES_TEXTE)
        else q = q.eq(k, v)
      }
      return q
    }
    const lot = (from: number) =>
      appliquer(supabase.from('segments').select(SELECT_SEG).eq('id_oeuvre', id))
        .order('segment_numero', { ascending: true }).range(from, from + 999)

    // 1er lot AVEC le total exact (une seule requête) : les grosses divisions
    // (ex. Somme théologique, ~6500 segments par niv1) se chargeaient auparavant
    // par allers-retours SÉQUENTIELS de 1000. On récupère le total tout de suite,
    // puis on tire les lots restants EN PARALLÈLE.
    const premier = await appliquer(
      supabase.from('segments').select(SELECT_SEG, { count: 'exact' }).eq('id_oeuvre', id)
    ).order('segment_numero', { ascending: true }).range(0, 999)

    const acc: any[] = [...((premier.data as any[]) ?? [])]
    const total = premier.count ?? acc.length
    if (total > 1000) {
      const restes = await Promise.all(
        Array.from({ length: Math.ceil(total / 1000) - 1 }, (_, i) => lot((i + 1) * 1000))
      )
      for (const r of restes) acc.push(...((r.data as any[]) ?? []))
    }
    // Les liens ne sont plus portés par le segment : on les repose au format
    // attendu, avec le client du serveur — c'est ce rendu que le lecteur voit.
    await hydraterLiensHerites(acc, supabase)
    return acc
  }

  // Première tranche d'un niveau 1 (ordre de LECTURE = segment_numero, comme le
  // chargeur client `chargerNiv1Data`, pour que la tranche soit un vrai préfixe du
  // chargement complet), plus l'indication qu'il reste des segments. Sert à peindre
  // vite les grosses divisions (ex. Somme théologique, ~9000 segments dans un seul
  // niv1) sans tout charger d'un coup : le reste est complété en tâche de fond côté
  // client, pendant que le lecteur lit déjà la première page.
  const PLAFOND_TRANCHE = 1000
  async function chargerTrancheTexte(filtre: Record<string, string>): Promise<{ segments: Segment[]; partiel: boolean }> {
    const appliquer = (q: any) => {
      for (const [k, v] of Object.entries(filtre)) {
        if (k === 'nature' && v === 'texte') q = q.in('nature', NATURES_TEXTE)
        else q = q.eq(k, v)
      }
      return q
    }
    const premier = await appliquer(
      supabase.from('segments').select(SELECT_SEG, { count: 'exact' }).eq('id_oeuvre', id)
    ).order('segment_numero', { ascending: true }).range(0, PLAFOND_TRANCHE - 1)
    const acc: any[] = [...((premier.data as any[]) ?? [])]
    const total = premier.count ?? acc.length
    await hydraterLiensHerites(acc, supabase)
    return { segments: acc as Segment[], partiel: total > acc.length }
  }

  // ── Vague 1 : 6 requêtes indépendantes en parallèle ──────────────────────
  const [estAdmin, { data: oeuvre }, { data: niv1Raw, error: rpcError }, { data: niv1TexteRaw }, { data: segmentCibleData }, segmentsApparatRaw, codesTraductions] = await Promise.all([
    verifierEstAdmin(),
    supabase.from('oeuvres').select('*, auteurs(id_auteur, nom)').eq('id_oeuvre', id).single(),
    supabase.rpc('get_niv1_list', { p_id_oeuvre: id }),
    supabase.rpc('get_niv1_texte', { p_id_oeuvre: id }),
    Number.isFinite(segmentCibleId) && segmentCibleId > 0
      ? supabase.from('segments').select('id,ref_niv1,nature').eq('id_oeuvre', id).eq('id', segmentCibleId).maybeSingle()
      : Promise.resolve({ data: null }),
    chargerTousSegments({ nature: 'apparat_critique' }),
    chargerCodesTraductions(supabase),
  ])

  if (!oeuvre || (!estAdmin && !estOeuvrePubliee(oeuvre as any))) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cs-fond)'}}>
      <p style={{color:'#8a8278'}}>Œuvre introuvable.</p>
    </div>
  )

  if (rpcError) console.error('get_niv1_list error:', rpcError)

  // niv1 ayant du texte + libellés ref_niv1_texte : une seule RPC agrégée
  // (get_niv1_texte) remplace l'ancien N+1 (un count par niv1 pour exclure les niv1
  // uniquement apparat) et la pagination séquentielle de reconstitution des libellés.
  const niv1Complet: string[] = (niv1Raw ?? []).map((r: any) => r.ref_niv1).filter(Boolean)
  const niv1TexteMap: Record<string, string> = {}
  const niv1AvecTexte = new Set<string>()
  ;(niv1TexteRaw ?? []).forEach((r: any) => {
    if (!r.ref_niv1) return
    niv1AvecTexte.add(r.ref_niv1)
    if (r.ref_niv1_texte) niv1TexteMap[r.ref_niv1] = r.ref_niv1_texte
  })
  // On conserve l'ordre du sommaire (get_niv1_list) et on exclut les niv1 sans
  // segment texte (apparat critique seul).
  const niv1List = niv1Complet.filter(n1 => niv1AvecTexte.has(n1))

  const segmentCible = segmentCibleData
  const vueInitiale = segmentCible?.nature === 'apparat_critique' ? 'apparat' : 'texte'
  const texteSansNiveaux = niv1List.length === 0
  const lectureTexteEntier = oeuvre.lecture_texte_entier === true
  const premierNiv1 = vueInitiale === 'texte' && segmentCible?.ref_niv1
    ? segmentCible.ref_niv1
    : niv1List[0] ?? null

  // ── Vague 2 : PREMIÈRE TRANCHE du texte du premier niv1 (apparat exclus) ──
  // On ne charge plus tout le niv1 avant le premier rendu : seule la 1re tranche
  // (~1000 segments) part du serveur ; le client complète le reste en tâche de fond.
  const trancheInitiale = lectureTexteEntier
    ? { segments: await chargerTousSegments({ nature: 'texte' }) as Segment[], partiel: false }
    : texteSansNiveaux
      ? await chargerTrancheTexte({ nature: 'texte' })
      : premierNiv1
        ? await chargerTrancheTexte({ ref_niv1: premierNiv1, nature: 'texte' })
        : { segments: [] as Segment[], partiel: false }
  const segmentsTexteRaw = trancheInitiale.segments
  const niv1InitialPartiel = trancheInitiale.partiel

  const segmentsTexte = segmentsTexteRaw as Segment[]
  const segmentsApparat = segmentsApparatRaw as Segment[]

  // 4. Versets pour le premier livre seulement
  const versetMap = await enrichirAvecVersets(supabase, segmentsTexte, codesTraductions)

  const versetParSegment: Record<number, any[]> = {}
  segmentsTexte.forEach(s => {
    versetParSegment[s.id] = extraireVersetsAvecNature(s).map(({ id: vid, natures }) => ({
      id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {} })
    }))
  })

  const auteur = (oeuvre.auteurs as any)?.nom || ''
  const auteurId = (oeuvre.auteurs as any)?.id_auteur?.toString() ?? ''

  // Éligibilité au mode Paragraphes : l'œuvre doit porter la colonne `paragraphe`
  // (charte §6.1). On l'estime sur le premier niv1 chargé, représentatif — la
  // colonne est peuplée uniformément par œuvre. Les œuvres sans `paragraphe` ne
  // proposent pas le mode (bouton grisé côté client).
  const eligibleParagraphes = segmentsTexte.some(s => s.paragraphe != null)

  const groupes = grouper(segmentsTexte)
  const groupesApparat = grouper(segmentsApparat)
  const numLocaux = numerotationLocale(segmentsTexte)
  const numLocauxApparat = numerotationLocale(segmentsApparat)

  type TocEntry = { niv1:string; niv2:string; anchor:string }
  const tocApparat: TocEntry[] = []
  let la1='', la2=''
  groupesApparat.forEach((g, i) => {
    if (g.niv1 !== la1 || g.niv2 !== la2) { tocApparat.push({niv1:g.niv1,niv2:g.niv2,anchor:`a${i}`}); la1=g.niv1; la2=g.niv2 }
  })

  const segmentsData = segmentsTexte
    .filter(segmentAffichable)
    .map(s => ({
      id: s.id, numero: numLocaux.get(s.id) || s.segment_numero,
      texte: s.segment_texte, versets: versetParSegment[s.id] || [],
      notes: parseNotes((s as any).notes),
      paragraphe: s.paragraphe, rang: s.rang, texteOriginal: s.texte_original,
      nature: s.nature,
    }))

  const groupesData = groupes.map((g, gi) => ({
    niv1: g.niv1, niv2: g.niv2, niv3: g.niv3, niv4: g.niv4,
    niv1_texte: g.niv1_texte, niv2_texte: g.niv2_texte,
    niv3_texte: g.niv3_texte, niv4_texte: g.niv4_texte,
    anchor: `g${gi}`, itemIds: g.items.map(s => s.id),
  }))

  const segmentsApparatData = segmentsApparat
    .filter(segmentAffichable)
    .map(s => ({
      id: s.id, numero: numLocauxApparat.get(s.id) || s.segment_numero,
      texte: s.segment_texte, versets: [],
      notes: parseNotes((s as any).notes),
      paragraphe: s.paragraphe, rang: s.rang, texteOriginal: s.texte_original,
      nature: s.nature,
    }))

  const groupesApparatData = groupesApparat.map((g, gi) => ({
    niv1: g.niv1, niv2: g.niv2, niv3: g.niv3, niv4: g.niv4,
    niv1_texte: g.niv1_texte, niv2_texte: g.niv2_texte,
    niv3_texte: g.niv3_texte, niv4_texte: g.niv4_texte,
    anchor: `a${gi}`, itemIds: g.items.map(s => s.id),
  }))

  return (
    <>
      {/* Book JSON-LD — seulement pour une œuvre publique (jamais un brouillon admin). */}
      {estOeuvrePubliee(oeuvre as any) && (
        <>
          <JsonLd donnees={donneesLivre({
            id,
            titre: oeuvre.titre,
            titreOriginal: oeuvre.titre_original,
            auteur, auteurId: auteurId || null,
            traducteur: oeuvre.trad_auteur,
            editeur: oeuvre.editeur,
          })} />
          <JsonLd donnees={donneesFilAriane([
            { nom: 'Accueil', url: '/accueil' },
            { nom: 'Bibliothèque', url: '/bibliotheque' },
            ...(auteur ? [{ nom: auteur, url: `/auteur/${auteurId}` }] : []),
            { nom: oeuvre.titre, url: `/oeuvre/${id}` },
          ])} />
        </>
      )}
    <OeuvreClient
      auteur={auteur}
      auteurId={auteurId}
      idOeuvre={id}
      estAdmin={estAdmin}
      niv1List={niv1List}
      niv1TexteMap={niv1TexteMap}
      niveauxSommaire={oeuvre.niveaux_sommaire ?? oeuvre.profondeur_sommaire ?? 1}
      niveauxCorps={oeuvre.niveaux_corps ?? 1}
      txtSommaire={(oeuvre.texte_sommaire ?? '0,0,0,0,0').split(',').map((v: string) => v === '1')}
      txtCorps={(oeuvre.texte_corps ?? '0,0,0,0,0').split(',').map((v: string) => v === '1')}
      afficherNumeros={oeuvre.afficher_numeros !== false}
      lectureTexteEntier={lectureTexteEntier}
      oeuvre={{titre:oeuvre.titre,titre_affichage:oeuvre.titre_affichage,sous_titre:oeuvre.sous_titre,titre_original:oeuvre.titre_original,trad_auteur:oeuvre.trad_auteur,trad_date:oeuvre.trad_date,commentaire_traduction:oeuvre.commentaire_traduction,editeur:oeuvre.editeur,collection:oeuvre.collection,ville:oeuvre.ville,date_publication:oeuvre.date_publication,date_mise_en_ligne:oeuvre.date_mise_en_ligne,id_oeuvre:oeuvre.id_oeuvre,date_composition:oeuvre.date_composition,langue_originale:oeuvre.langue_originale,genres:oeuvre.genres,url_source:oeuvre.url_source}}
      groupes={groupesData} segments={segmentsData}
      tocApparat={tocApparat} groupesApparat={groupesApparatData} segmentsApparat={segmentsApparatData}
      segmentCibleId={Number.isFinite(segmentCibleId) && segmentCibleId > 0 ? segmentCibleId : null}
      niv1Initial={premierNiv1 ?? niv1List[0] ?? null}
      vueInitiale={vueInitiale}
      eligibleParagraphes={eligibleParagraphes}
      niv1InitialPartiel={niv1InitialPartiel}
    />
    </>
  )
}
