import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

// 1. La page Bible ne lit plus versets_lecture : son axe vient de la spine AELF/TOL.
{
  const path = 'app/page.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
`    const { data } = await supabase
      // Vue de compatibilité canonique. Elle reste le chemin exclusif des éditions
      // historiques et n'est jamais utilisée pour simuler un mode source.
      .from('versets_lecture')
      .select('*')
      .eq('livre', livre)
      .eq('chapitre', chapitre)
      .order('verset')
    versets = data || []`,
`    const { data, error } = await supabase
      // Axe de lecture actif : spine AELF/TOL. Les textes restent ceux de chaque
      // traduction et leurs numérotations natives demeurent dans num_TRxxxx.
      .from('v_aelf_bible_lecture')
      .select('*')
      .eq('livre', livre)
      .eq('chapitre', chapitre)
      .order('ordre')
    if (error) throw new Error(\`Lecture AELF indisponible : \${error.message}\`)
    versets = data || []`,
    'page Bible / lecture historique')
  s = s.replace('éditions historiques (TR0001–TR0005) : vue large `versets_lecture` ;', 'éditions historiques (TR0001–TR0005) : projection large sur la spine AELF/TOL ;')
  fs.writeFileSync(path, s)
}

// 2. Le catalogue de capacités ne déduit plus les traductions canoniques de la vue legacy.
{
  const path = 'app/lib/bibleMultimodeServer.ts'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
    "client.from('versets_lecture').select('*').limit(1),",
    "client.from('v_aelf_bible_lecture').select('*').limit(1),",
    'catalogue lecture / échantillon AELF')
  s = s.replace('Vue canonique illisible:', 'Vue AELF de lecture illisible:')
  fs.writeFileSync(path, s)
}

// 3. Les libellés et prélèvements de la Bible classique portent l'identité AELF exacte.
{
  const path = 'app/components/TexteBible.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
`  chapitre: number; verset: number
  chapitre_alternatif?: number | null; verset_alternatif?: number | null`,
`  chapitre: number; verset: number
  chapitre_label?: string | null; verset_label?: string | null
  aelf_version_id?: string | null; aelf_entry_id?: string | null; aelf_reference?: string | null
  historical_canon_id?: string | null
  chapitre_alternatif?: number | null; verset_alternatif?: number | null`,
    'type Verset AELF')

  s = replaceOnce(s,
`function refFrBible(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  const abr = ABREV_FR[p[0]] ?? p[0]
  return cv[1] ? \`${'${abr}'} ${'${cv[0]}'}, ${'${cv[1]}'}\` : \`${'${abr}'} ${'${cv[0]}'}\`
}`,
`function nettoyerLabelAelf(label: string | number | null | undefined): string {
  const brut = String(label ?? '')
  const nettoye = brut.replace(/^0+(?=\\d)/, '')
  return nettoye || brut
}

function etiquetteVerset(v: Verset): string {
  const chapitre = nettoyerLabelAelf(v.chapitre_label ?? v.chapitre)
  const verset = nettoyerLabelAelf(v.verset_label ?? v.verset)
  return chapitre !== String(v.chapitre) ? \`${'${chapitre}'},${'${verset}'}\` : verset
}

function clePrelevement(v: Verset): string {
  return v.aelf_entry_id ?? \`legacy:${'${v.chapitre}'}:${'${v.verset}'}\`
}

function refFrBible(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  const abr = ABREV_FR[p[0]] ?? p[0]
  const chapitre = nettoyerLabelAelf(cv[0])
  const verset = cv[1] ? nettoyerLabelAelf(cv[1]) : ''
  return verset ? \`${'${abr}'} ${'${chapitre}'}, ${'${verset}'}\` : \`${'${abr}'} ${'${chapitre}'}\`
}`,
    'format référence AELF')

  s = replaceOnce(s,
    "  const [sauvegardes, setSauvegardes] = useState<Map<number, string>>(new Map())",
    "  const [sauvegardes, setSauvegardes] = useState<Map<string, string>>(new Map())",
    'clé prélèvements')

  s = replaceOnce(s,
`    const versetCible = searchParams.get('verset')
    if (!versetCible) return
    const num = parseInt(versetCible)
    const v = versets.find(v => v.verset === num)
    if (v) setVersetSelectionne(v)
    const el = document.getElementById(\`verset-${'${versetCible}'}\`)`,
`    const versetCible = searchParams.get('verset')
    if (!versetCible) return
    const v = versets.find(v => nettoyerLabelAelf(v.verset_label ?? v.verset) === nettoyerLabelAelf(versetCible))
    if (v) setVersetSelectionne(v)
    const el = v ? document.getElementById(\`verset-${'${v.aelf_entry_id ?? v.id_verset}'}\`) : null`,
    'navigation verset AELF')

  s = replaceOnce(s,
`      .select('id, ref_verset')
      .eq('user_id', uid)`,
`      .select('id, ref_verset, aelf_entry_id')
      .eq('user_id', uid)`,
    'chargement prélèvements AELF')

  s = replaceOnce(s,
`    const m = new Map<number, string>()
    ;(data ?? []).forEach((r: any) => m.set(r.ref_verset, r.id))
    setSauvegardes(m)
  }

  const marquerSauvegarde = (numVerset: number, id: string) => {
    setSauvegardes(prev => new Map([...prev, [numVerset, id]]))
  }

  const retirerSauvegarde = (numVerset: number) => {
    setSauvegardes(prev => { const n = new Map(prev); n.delete(numVerset); return n })
  }`,
`    const m = new Map<string, string>()
    ;(data ?? []).forEach((r: any) => m.set(r.aelf_entry_id ?? \`legacy:${'${chapitreActif}'}:${'${r.ref_verset}'}\`, r.id))
    setSauvegardes(m)
  }

  const marquerSauvegarde = (cle: string, id: string) => {
    setSauvegardes(prev => new Map([...prev, [cle, id]]))
  }

  const retirerSauvegarde = (cle: string) => {
    setSauvegardes(prev => { const n = new Map(prev); n.delete(cle); return n })
  }`,
    'index prélèvements AELF')

  s = replaceOnce(s,
`      ref_chapitre: chapitreActif, ref_verset: verset.verset,
      texte, traduction: traductionLabel,`,
`      ref_chapitre: chapitreActif, ref_verset: verset.verset,
      aelf_version_id: verset.aelf_version_id ?? null,
      aelf_entry_id: verset.aelf_entry_id ?? null,
      texte, traduction: traductionLabel,`,
    'écriture prélèvement AELF')

  s = replaceOnce(s,
    "              id={`verset-${v.verset}`}",
    "              id={`verset-${v.aelf_entry_id ?? v.id_verset}`}",
    'identifiant DOM AELF')

  s = replaceOnce(s,
`                const incrementer = () => fetch('/api/versets/incrementer-lecture', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id_verset: v.id_verset }),
                }).catch(() => {})`,
`                const incrementer = () => {
                  if (!v.historical_canon_id) return Promise.resolve()
                  return fetch('/api/versets/incrementer-lecture', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_verset: v.historical_canon_id }),
                  }).catch(() => {})
                }`,
    'compteur legacy non arbitraire')

  s = replaceOnce(s,
    "                    {v.verset}",
    "                    {etiquetteVerset(v)}",
    'libellé visible AELF')

  s = replaceOnce(s,
`                          dejaSauvegarde={sauvegardes.has(v.verset)}
                          idPrelevement={sauvegardes.get(v.verset) ?? null}
                          onSauvegarde={(id) => marquerSauvegarde(v.verset, id)}
                          onSupprimer={() => retirerSauvegarde(v.verset)}`,
`                          dejaSauvegarde={sauvegardes.has(clePrelevement(v))}
                          idPrelevement={sauvegardes.get(clePrelevement(v)) ?? null}
                          onSauvegarde={(id) => marquerSauvegarde(clePrelevement(v), id)}
                          onSupprimer={() => retirerSauvegarde(clePrelevement(v))}`,
    'bouton prélèvement AELF')

  s = replaceOnce(s,
    "                        `${ABREV_FR[livreActif] || nomLivre} ${chapitreActif}, ${v.verset}`,",
    "                        `${ABREV_FR[livreActif] || nomLivre} ${nettoyerLabelAelf(v.chapitre_label ?? chapitreActif)}, ${nettoyerLabelAelf(v.verset_label ?? v.verset)}`,",
    'citation référence AELF')

  fs.writeFileSync(path, s)
}

for (const path of ['app/page.tsx','app/lib/bibleMultimodeServer.ts','app/components/TexteBible.tsx']) {
  const s = fs.readFileSync(path,'utf8')
  if (s.includes(".from('versets_lecture')")) throw new Error(`${path}: lecture directe versets_lecture résiduelle`)
}
console.log('Bible classique basculée vers la spine AELF/TOL.')

// Déclenchement explicite de la validation après installation du workflow.
