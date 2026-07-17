import { createClient } from '@supabase/supabase-js'
import { estAdmin as verifierEstAdmin } from '@/app/lib/verifAdmin'
import { ABREV_FR } from '@/app/lib/bible'
import { parseNotes } from '@/app/lib/notes'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import OeuvreClient from './OeuvreClient'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Segment = {
  id: number; segment_numero: number; segment_texte: string
  ref_niv1: string|null; ref_niv2: string|null; ref_niv3: string|null
  ref_niv4: string|null; ref_niv5: string|null
  ref_niv1_texte: string|null; ref_niv2_texte: string|null
  ref_niv3_texte: string|null; ref_niv4_texte: string|null
  lien_1: string|null; lien_2: string|null; lien_3: string|null; lien_4: string|null
  nature: string|null
}

function extraireVersets(s: Segment): string[] {
  return [s.lien_1,s.lien_2,s.lien_3,s.lien_4].filter(Boolean).join(';').split(';').map(v=>v.trim()).filter(Boolean)
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

async function chargerCodesTraductions() {
  const { data } = await supabase.from('traductions').select('trad_id').order('ordre', { ascending: true })
  const codes = (data ?? []).map((t: any) => t.trad_id).filter((code: string) => /^TR\d{4}$/.test(code))
  return codes.length > 0 ? codes : ['TR0001', 'TR0002', 'TR0003', 'TR0004']
}

async function enrichirAvecVersets(segments: Segment[], codesTraductions: string[]) {
  const tousIds = new Set<string>()
  segments.forEach(s => extraireVersets(s).forEach(v => tousIds.add(v)))
  const tousIdsArray = Array.from(tousIds)
  if (tousIdsArray.length === 0) return {}
  const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => `"${code}"`)].join(', ')
  const batchSize = 500
  const batches = Array.from({ length: Math.ceil(tousIdsArray.length / batchSize) }, (_, i) =>
    tousIdsArray.slice(i * batchSize, (i + 1) * batchSize))
  const results = await Promise.all(batches.map(batch =>
    supabase.from('versets').select(selectVersets).in('id_verset', batch)))
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

  // Admin = connecté avec le compte administrateur (adresse fixe), vérifié
  // côté serveur via la session Supabase Auth — remplace l'ancien cookie
  // bp_admin_session, qui n'est plus jamais posé depuis la suppression de la
  // page de connexion par mot de passe.
  const SELECT_SEG = 'id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,lien_1,lien_2,lien_3,lien_4,nature,notes'

  async function chargerTousSegments(filtre: Record<string, string>) {
    const acc: any[] = []
    let from = 0
    while (true) {
      let q = supabase.from('segments').select(SELECT_SEG).eq('id_oeuvre', id).order('id', { ascending: true }).range(from, from + 999)
      for (const [k, v] of Object.entries(filtre)) q = q.eq(k, v)
      const { data: batch } = await q
      if (!batch || batch.length === 0) break
      acc.push(...batch)
      if (batch.length < 1000) break
      from += 1000
    }
    return acc
  }

  async function completerNiv1TexteMap(niv1Cibles: string[], cible: Record<string, string>) {
    const manquants = niv1Cibles.filter(n1 => n1 && !cible[n1])
    if (manquants.length === 0) return

    const tailleLot = 25
    for (let i = 0; i < manquants.length; i += tailleLot) {
      const lot = manquants.slice(i, i + tailleLot)
      const attendus = new Set(lot)
      let from = 0

      while (attendus.size > 0) {
        const { data: batch } = await supabase
          .from('segments')
          .select('ref_niv1, ref_niv1_texte')
          .eq('id_oeuvre', id)
          .eq('nature', 'texte')
          .in('ref_niv1', lot)
          .not('ref_niv1_texte', 'is', null)
          .order('id', { ascending: true })
          .range(from, from + 999)

        if (!batch || batch.length === 0) break

        batch.forEach((r: any) => {
          if (r.ref_niv1 && r.ref_niv1_texte && attendus.has(r.ref_niv1)) {
            cible[r.ref_niv1] = r.ref_niv1_texte
            attendus.delete(r.ref_niv1)
          }
        })

        if (batch.length < 1000) break
        from += 1000
      }
    }
  }

  // ── Vague 1 : 6 requêtes indépendantes en parallèle ──────────────────────
  const [estAdmin, { data: oeuvre }, { data: niv1Raw, error: rpcError }, { data: segmentCibleData }, segmentsApparatRaw, codesTraductions] = await Promise.all([
    verifierEstAdmin(),
    supabase.from('oeuvres').select('*, auteurs(id_auteur, nom)').eq('id_oeuvre', id).single(),
    supabase.rpc('get_niv1_list', { p_id_oeuvre: id }),
    Number.isFinite(segmentCibleId) && segmentCibleId > 0
      ? supabase.from('segments').select('id,ref_niv1,nature').eq('id_oeuvre', id).eq('id', segmentCibleId).maybeSingle()
      : Promise.resolve({ data: null }),
    chargerTousSegments({ nature: 'apparat_critique' }),
    chargerCodesTraductions(),
  ])

  if (!oeuvre || (!estAdmin && !estOeuvrePubliee(oeuvre as any))) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#f7f4ef'}}>
      <p style={{color:'#8a8278'}}>Œuvre introuvable.</p>
    </div>
  )

  if (rpcError) console.error('get_niv1_list error:', rpcError)

  // Calcul des niv1 + niv1TexteMap
  const niv1Complet: string[] = (niv1Raw ?? []).map((r: any) => r.ref_niv1).filter(Boolean)
  const niv1TexteMap: Record<string, string> = {}
  ;(niv1Raw ?? []).forEach((r: any) => {
    if (r.ref_niv1 && r.ref_niv1_texte) niv1TexteMap[r.ref_niv1] = r.ref_niv1_texte
  })

  // Exclure du sommaire les niv1 qui n'ont AUCUN segment texte (uniquement apparat).
  // Stratégie : on part des niv1 présents dans segmentsApparatRaw (déjà chargés
  // en entier via pagination) et on vérifie en parallèle si chacun a aussi des
  // segments texte. Évite de scanner tous les segments texte, ce qui était limité
  // à 1000 lignes et cassait les grandes œuvres (ex. Discours sur les Psaumes).
  const apparatNiv1List = Array.from(
    new Set((segmentsApparatRaw as Segment[]).map(s => s.ref_niv1).filter(Boolean) as string[])
  )
  const niv1OnlyApparat = new Set<string>()
  if (apparatNiv1List.length > 0) {
    const texteChecks = await Promise.all(
      apparatNiv1List.map(n1 =>
        supabase.from('segments').select('id', { count: 'estimated', head: true })
          .eq('id_oeuvre', id).eq('ref_niv1', n1).eq('nature', 'texte')
      )
    )
    apparatNiv1List.forEach((n1, i) => {
      if ((texteChecks[i].count ?? 0) === 0) niv1OnlyApparat.add(n1)
    })
  }
  const niv1List = niv1Complet.filter(n1 => !niv1OnlyApparat.has(n1))
  await completerNiv1TexteMap(niv1List, niv1TexteMap)

  const segmentCible = segmentCibleData
  const vueInitiale = segmentCible?.nature === 'apparat_critique' ? 'apparat' : 'texte'
  const texteSansNiveaux = niv1List.length === 0
  const premierNiv1 = vueInitiale === 'texte' && segmentCible?.ref_niv1
    ? segmentCible.ref_niv1
    : niv1List[0] ?? null

  // ── Vague 2 : segments texte du premier niv1 (apparat_critique exclus) ──
  const segmentsTexteRaw = texteSansNiveaux
    ? await chargerTousSegments({ nature: 'texte' })
    : premierNiv1
      ? await chargerTousSegments({ ref_niv1: premierNiv1, nature: 'texte' })
      : []

  const segmentsTexte = segmentsTexteRaw as Segment[]
  const segmentsApparat = segmentsApparatRaw as Segment[]

  // 4. Versets pour le premier livre seulement
  const versetMap = await enrichirAvecVersets(segmentsTexte, codesTraductions)

  const versetParSegment: Record<number, any[]> = {}
  segmentsTexte.forEach(s => {
    versetParSegment[s.id] = extraireVersets(s).map(vid => ({
      id: vid, ...(versetMap[vid] || { label: vid, textes: {} })
    }))
  })

  const auteur = (oeuvre.auteurs as any)?.nom || ''
  const auteurId = (oeuvre.auteurs as any)?.id_auteur?.toString() ?? ''

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
    }))

  const groupesApparatData = groupesApparat.map((g, gi) => ({
    niv1: g.niv1, niv2: g.niv2, niv3: g.niv3, niv4: g.niv4,
    niv1_texte: g.niv1_texte, niv2_texte: g.niv2_texte,
    niv3_texte: g.niv3_texte, niv4_texte: g.niv4_texte,
    anchor: `a${gi}`, itemIds: g.items.map(s => s.id),
  }))

  return (
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
      oeuvre={{titre:oeuvre.titre,sous_titre:oeuvre.sous_titre,titre_original:oeuvre.titre_original,trad_auteur:oeuvre.trad_auteur,trad_date:oeuvre.trad_date,editeur:oeuvre.editeur,collection:oeuvre.collection,ville:oeuvre.ville,date_publication:oeuvre.date_publication,id_oeuvre:oeuvre.id_oeuvre,date_composition:oeuvre.date_composition,langue:oeuvre.langue,genres:oeuvre.genres,url_source:oeuvre.url_source}}
      groupes={groupesData} segments={segmentsData}
      tocApparat={tocApparat} groupesApparat={groupesApparatData} segmentsApparat={segmentsApparatData}
      segmentCibleId={Number.isFinite(segmentCibleId) && segmentCibleId > 0 ? segmentCibleId : null}
      niv1Initial={premierNiv1 ?? niv1List[0] ?? null}
      vueInitiale={vueInitiale}
    />
  )
}
