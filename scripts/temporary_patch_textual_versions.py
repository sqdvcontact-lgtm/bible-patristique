from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    n = text.count(old)
    if n != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {n}")
    return text.replace(old, new, 1)


# ── Server reader ─────────────────────────────────────────────────────────────
path = Path("app/oeuvre/[id]/page.tsx")
text = path.read_text()

text = replace_once(
    text,
    "  searchParams?:Promise<{segment?:string}>\n",
    "  searchParams?:Promise<{segment?:string; texte?:string}>\n",
    "searchParams textual version",
)

marker = "  // Admin = connecté avec le compte administrateur (adresse fixe), vérifié\n"
insertion = """  // Une œuvre peut posséder plusieurs témoins textuels publics (par exemple
  // une traduction française et le texte latin). Le témoin demandé dans l'URL
  // prime ; à défaut, un lien profond vers un segment choisit son propre témoin ;
  // enfin on retombe sur la version marquée par défaut.
  const [{ data: versionsTextuellesRaw }, { data: segmentCibleProbe }] = await Promise.all([
    supabase.from('oeuvre_textes')
      .select('id_texte,titre_version,langue,traducteur,is_default,is_public,statut')
      .eq('id_oeuvre', id)
      .eq('is_public', true)
      .eq('statut', 'published')
      .order('is_default', { ascending: false }),
    Number.isFinite(segmentCibleId) && segmentCibleId > 0
      ? supabase.from('segments').select('id,id_texte,ref_niv1,nature').eq('id_oeuvre', id).eq('id', segmentCibleId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const versionsTextuelles = (versionsTextuellesRaw ?? []).map((v: any) => ({
    id_texte: String(v.id_texte),
    titre_version: v.titre_version || (String(v.langue || '').toLowerCase().startsWith('lat') ? 'Texte latin' : 'Texte français'),
    langue: v.langue ?? null,
    traducteur: v.traducteur ?? null,
    is_default: v.is_default === true,
  }))
  const idTexteDemande = typeof sp.texte === 'string' ? sp.texte.trim() : ''
  const idTexteCible = segmentCibleProbe?.id_texte ? String(segmentCibleProbe.id_texte) : ''
  const versionActive = versionsTextuelles.find(v => v.id_texte === idTexteDemande)
    ?? versionsTextuelles.find(v => v.id_texte === idTexteCible)
    ?? versionsTextuelles.find(v => v.is_default)
    ?? versionsTextuelles[0]
    ?? null
  const idTexteActif = versionActive?.id_texte ?? null

""" + marker
text = replace_once(text, marker, insertion, "insert active textual version")

old_apply = """    const appliquer = (q: any) => {
      for (const [k, v] of Object.entries(filtre)) {
"""
new_apply = """    const appliquer = (q: any) => {
      if (idTexteActif) q = q.eq('id_texte', idTexteActif)
      for (const [k, v] of Object.entries(filtre)) {
"""
if text.count(old_apply) != 2:
    raise SystemExit(f"active text filter: expected 2 appliquer blocks, got {text.count(old_apply)}")
text = text.replace(old_apply, new_apply)

vague_marker = "  // ── Vague 1 : 6 requêtes indépendantes en parallèle ──────────────────────\n"
helper = """  // Le sommaire doit provenir du même témoin que le corps. Les anciennes RPC
  // ne connaissaient que l'œuvre et mélangeaient donc les ref_niv1 de plusieurs
  // id_texte. On lit ici uniquement les en-têtes du témoin actif puis on dédoublonne
  // en conservant l'ordre de lecture.
  async function chargerEntetesTexte() {
    const SELECT_ENTETE = 'segment_numero,ref_niv1,ref_niv1_texte,nature'
    const lot = async (from: number, avecCount = false) => {
      let q = supabase.from('segments')
        .select(SELECT_ENTETE, avecCount ? { count: 'exact' } : undefined)
        .eq('id_oeuvre', id)
        .in('nature', NATURES_TEXTE)
      if (idTexteActif) q = q.eq('id_texte', idTexteActif)
      return q.order('segment_numero', { ascending: true }).range(from, from + 999)
    }
    const premier = await lot(0, true)
    const acc: any[] = [...((premier.data as any[]) ?? [])]
    const total = premier.count ?? acc.length
    if (total > 1000) {
      const restes = await Promise.all(
        Array.from({ length: Math.ceil(total / 1000) - 1 }, (_, i) => lot((i + 1) * 1000))
      )
      for (const r of restes) acc.push(...((r.data as any[]) ?? []))
    }
    return acc
  }

  // ── Vague 1 : métadonnées et données du témoin actif en parallèle ─────────
"""
text = replace_once(text, vague_marker, helper, "replace wave marker")

start = text.index("  const [estAdmin, { data: oeuvre }, { data: niv1Raw")
end_marker = "  const segmentCible = segmentCibleData\n"
end = text.index(end_marker, start) + len(end_marker)
replacement = """  const [estAdmin, { data: oeuvre }, entetesTexteRaw, segmentsApparatRaw, codesTraductions] = await Promise.all([
    verifierEstAdmin(),
    supabase.from('oeuvres').select('*, auteurs(id_auteur, nom)').eq('id_oeuvre', id).single(),
    chargerEntetesTexte(),
    chargerTousSegments({ nature: 'apparat_critique' }),
    chargerCodesTraductions(supabase),
  ])

  if (!oeuvre || (!estAdmin && !estOeuvrePubliee(oeuvre as any))) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cs-fond)'}}>
      <p style={{color:'#8a8278'}}>Œuvre introuvable.</p>
    </div>
  )

  const niv1List: string[] = []
  const niv1TexteMap: Record<string, string> = {}
  const niv1Vus = new Set<string>()
  ;(entetesTexteRaw ?? []).forEach((r: any) => {
    const n1 = r.ref_niv1 ? String(r.ref_niv1) : ''
    if (!n1) return
    if (!niv1Vus.has(n1)) { niv1Vus.add(n1); niv1List.push(n1) }
    if (r.ref_niv1_texte && !niv1TexteMap[n1]) niv1TexteMap[n1] = String(r.ref_niv1_texte)
  })

  const segmentCible = segmentCibleProbe
"""
text = text[:start] + replacement + text[end:]

text = replace_once(
    text,
    "      estAdmin={estAdmin}\n      niv1List={niv1List}\n",
    "      estAdmin={estAdmin}\n      idTexteActif={idTexteActif}\n      versionsTextuelles={versionsTextuelles}\n      langueTexteActive={versionActive?.langue ?? null}\n      niv1List={niv1List}\n",
    "client textual props",
)

text = replace_once(
    text,
    "trad_auteur:oeuvre.trad_auteur,trad_date:oeuvre.trad_date",
    "trad_auteur:(String(versionActive?.langue || '').toLowerCase().startsWith('lat') ? undefined : (versionActive?.traducteur || oeuvre.trad_auteur)),trad_date:oeuvre.trad_date",
    "active witness translator",
)

path.write_text(text)


# ── Client reader ─────────────────────────────────────────────────────────────
path = Path("app/oeuvre/[id]/OeuvreClient.tsx")
text = path.read_text()

old_sig = "export default function OeuvreClient({ auteur, auteurId, idOeuvre, estAdmin: estAdminReel, niv1List: niv1ListProp, niv1TexteMap: niv1TexteMapProp = {}, niveauxSommaire = 1, niveauxCorps = 1, txtSommaire = [], txtCorps = [], afficherNumeros = true, lectureTexteEntier = false, oeuvre, groupes: groupesInit, segments: segmentsInit, tocApparat, groupesApparat: groupesApparatInit, segmentsApparat: segmentsApparatInit, segmentCibleId = null, niv1Initial = null, vueInitiale = 'texte', eligibleParagraphes = false, niv1InitialPartiel = false }: Props) {"
new_sig = "export default function OeuvreClient({ auteur, auteurId, idOeuvre, estAdmin: estAdminReel, idTexteActif = null, versionsTextuelles = [], langueTexteActive = null, niv1List: niv1ListProp, niv1TexteMap: niv1TexteMapProp = {}, niveauxSommaire = 1, niveauxCorps = 1, txtSommaire = [], txtCorps = [], afficherNumeros = true, lectureTexteEntier = false, oeuvre, groupes: groupesInit, segments: segmentsInit, tocApparat, groupesApparat: groupesApparatInit, segmentsApparat: segmentsApparatInit, segmentCibleId = null, niv1Initial = null, vueInitiale = 'texte', eligibleParagraphes = false, niv1InitialPartiel = false }: Props) {"
text = replace_once(text, old_sig, new_sig, "client signature")

router_anchor = "  const router = useRouter()\n"
router_block = """  const router = useRouter()
  const changerVersionTextuelle = (nouvelIdTexte: string) => {
    if (!nouvelIdTexte || nouvelIdTexte === idTexteActif || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    params.set('texte', nouvelIdTexte)
    params.delete('segment')
    params.delete('mt')
    // Rechargement complet volontaire : le sommaire, le corps, l'apparat et les
    // caches de niveau 1 appartiennent tous au témoin sélectionné.
    window.location.assign(`${window.location.pathname}?${params.toString()}`)
  }
"""
text = replace_once(text, router_anchor, router_block, "textual version switcher")

old_lot = """      let q = supabase.from('segments').select(SELECT).eq('id_oeuvre', idOeuvre)
        .in('nature', NATURES_TEXTE).order('segment_numero').range(from, from + 999)
      if (!lectureTexteEntier && !texteSansNiveaux && n1) q = q.eq('ref_niv1', n1)
"""
new_lot = """      let q = supabase.from('segments').select(SELECT).eq('id_oeuvre', idOeuvre)
        .in('nature', NATURES_TEXTE).order('segment_numero').range(from, from + 999)
      if (idTexteActif) q = q.eq('id_texte', idTexteActif)
      if (!lectureTexteEntier && !texteSansNiveaux && n1) q = q.eq('ref_niv1', n1)
"""
text = replace_once(text, old_lot, new_lot, "lazy lot active text")

old_first = """    let premierReq = supabase.from('segments').select(SELECT, { count: 'exact' }).eq('id_oeuvre', idOeuvre)
      .in('nature', NATURES_TEXTE).order('segment_numero').range(0, 999)
    if (!lectureTexteEntier && !texteSansNiveaux && n1) premierReq = premierReq.eq('ref_niv1', n1)
"""
new_first = """    let premierReq = supabase.from('segments').select(SELECT, { count: 'exact' }).eq('id_oeuvre', idOeuvre)
      .in('nature', NATURES_TEXTE).order('segment_numero').range(0, 999)
    if (idTexteActif) premierReq = premierReq.eq('id_texte', idTexteActif)
    if (!lectureTexteEntier && !texteSansNiveaux && n1) premierReq = premierReq.eq('ref_niv1', n1)
"""
text = replace_once(text, old_first, new_first, "lazy first active text")

old_app = """  const chargerApparatData = async () => {
    const { data } = await supabase
      .from('segments')
      .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,nature,notes,paragraphe,rang,texte_original')
      .eq('id_oeuvre', idOeuvre)
      .eq('nature', 'apparat_critique')
      .order('segment_numero')
"""
new_app = """  const chargerApparatData = async () => {
    let requeteApparat = supabase
      .from('segments')
      .select('id,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,nature,notes,paragraphe,rang,texte_original')
      .eq('id_oeuvre', idOeuvre)
      .eq('nature', 'apparat_critique')
    if (idTexteActif) requeteApparat = requeteApparat.eq('id_texte', idTexteActif)
    const { data } = await requeteApparat.order('segment_numero')
"""
text = replace_once(text, old_app, new_app, "apparatus active text")

old_problem = """      const { data: segsOeuvre } = await supabase.from('segments')
        .select('id, segment_numero, segment_texte, reference_manuelle, ref_niv1')
        .eq('id_oeuvre', idOeuvre).order('segment_numero')
"""
new_problem = """      let requeteSegmentsOeuvre = supabase.from('segments')
        .select('id, segment_numero, segment_texte, reference_manuelle, ref_niv1')
        .eq('id_oeuvre', idOeuvre)
      if (idTexteActif) requeteSegmentsOeuvre = requeteSegmentsOeuvre.eq('id_texte', idTexteActif)
      const { data: segsOeuvre } = await requeteSegmentsOeuvre.order('segment_numero')
"""
text = replace_once(text, old_problem, new_problem, "problems active text")
text = replace_once(
    text,
    "  }, [ongletDroit, idOeuvre, problemesCharges])\n",
    "  }, [ongletDroit, idOeuvre, idTexteActif, problemesCharges])\n",
    "problems deps",
)

lecture_comment = "            {/* Lecture : trois lignes de texte (Français, Français & Latin, Latin). Le\n"
selector = """            {versionsTextuelles.length > 1 && (
              <div style={{ marginTop: '10px' }}>
                <span style={LABEL_VOLET}>Versions textuelles</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {versionsTextuelles.map(v => {
                    const actif = v.id_texte === idTexteActif
                    const label = v.titre_version || (String(v.langue || '').toLowerCase().startsWith('lat') ? 'Texte latin' : 'Texte français')
                    return (
                      <button key={v.id_texte} disabled={actif}
                        onClick={() => changerVersionTextuelle(v.id_texte)}
                        title={actif ? 'Version textuelle affichée' : `Afficher : ${label}`}
                        style={{ ...BTN_VOLET(actif), cursor: actif ? 'default' : 'pointer' }}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

""" + lecture_comment
text = replace_once(text, lecture_comment, selector, "textual versions selector")

text = replace_once(
    text,
    "            {versions.length > 1 && (\n",
    "            {versionsTextuelles.length <= 1 && versions.length > 1 && (\n",
    "hide sibling translations when textual versions exist",
)

label_anchor = "  const labelBilingue = estGrec ? 'Français & Grec' : 'Français & Latin'\n"
text = replace_once(
    text,
    label_anchor,
    label_anchor + "  const langueHtml = String(langueTexteActive || '').toLowerCase().startsWith('lat') ? 'la' : 'fr'\n",
    "active html language",
)
text = replace_once(text, '<main lang="fr" ', '<main lang={langueHtml} ', "main language")

path.write_text(text)
print("textual version patch applied")
