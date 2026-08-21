import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const i = source.indexOf(before)
  if (i < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, i + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, i) + after + source.slice(i + before.length)
}

// ── Agrégation AELF : conserver merges + liens de chapitre ──────────────────
{
  const path = 'app/lib/liens.ts'
  let s = fs.readFileSync(path, 'utf8')

  s = replaceOnce(s,
`  const textesParEntree = new Map<string, Record<string, string>>()
  for (const c of cellules) {
    if (!textesParEntree.has(c.aelf_entry_id)) textesParEntree.set(c.aelf_entry_id, {})
    if (codesTraductions.includes(c.trad_id) && c.texte) textesParEntree.get(c.aelf_entry_id)![c.trad_id] = c.texte
  }`,
`  const fragmentsParEntree = new Map<string, Map<string, string[]>>()
  for (const c of cellules) {
    if (!codesTraductions.includes(c.trad_id) || !c.texte) continue
    if (!fragmentsParEntree.has(c.aelf_entry_id)) fragmentsParEntree.set(c.aelf_entry_id, new Map())
    const parTrad = fragmentsParEntree.get(c.aelf_entry_id)!
    if (!parTrad.has(c.trad_id)) parTrad.set(c.trad_id, [])
    const fragments = parTrad.get(c.trad_id)!
    if (!fragments.includes(c.texte)) fragments.push(c.texte)
  }
  const textesParEntree = new Map<string, Record<string, string>>()
  for (const [entryId, parTrad] of fragmentsParEntree) {
    textesParEntree.set(entryId, Object.fromEntries(
      [...parTrad.entries()].map(([trad, fragments]) => [trad, fragments.join(' ')]),
    ))
  }`,
    'agrégation des cellules merge')

  s = replaceOnce(s,
`      if (!lien.aelf_entry_id && !lien.historical_canon_id) continue
      const cle = lien.aelf_entry_id ? \`aelf:${'${lien.aelf_entry_id}'}\` : \`legacy:${'${lien.historical_canon_id}'}\``,
`      const chapitreSeul = lien.resolution_status === 'chapter_only' && Boolean(lien.livre) && lien.chapitre != null
      if (!lien.aelf_entry_id && !lien.historical_canon_id && !chapitreSeul) continue
      const cle = lien.aelf_entry_id
        ? \`aelf:${'${lien.aelf_entry_id}'}\`
        : lien.historical_canon_id
          ? \`legacy:${'${lien.historical_canon_id}'}\`
          : \`chapter:${'${lien.livre}'}:${'${lien.chapitre}'}\``,
    'clé des liens de chapitre')

  s = replaceOnce(s,
`            label: verset ? \`${'${livre}'} ${'${chapitre}'}, ${'${verset}'}\` : \`${'${livre}'} ${'${chapitre}'}\`,`,
`            label: verset ? \`${'${ABREV_FR[livre] ?? livre}'} ${'${chapitre}'}, ${'${verset}'}\` : \`${'${ABREV_FR[livre] ?? livre}'} ${'${chapitre}'}\`,`,
    'libellé français AELF')

  s = replaceOnce(s,
`        } else {
          const canon = lien.historical_canon_id as string`,
`        } else if (lien.historical_canon_id) {
          const canon = lien.historical_canon_id`,
    'branche legacy explicite')

  s = replaceOnce(s,
`            linkIds: [], natures: [], ordreAelf: null,
          }
        }
        refs.set(cle, ref)`,
`            linkIds: [], natures: [], ordreAelf: null,
          }
        } else {
          const livre = lien.livre ?? ''
          const chapitre = lien.chapitre == null ? '' : String(lien.chapitre)
          ref = {
            id: \`CHAPTER:${'${livre}'}:${'${chapitre}'}\`,
            label: \`${'${ABREV_FR[livre] ?? livre}'} ${'${chapitre}'}\`.trim(),
            textes: {}, livre, chapitre, verset: '',
            aelfVersionId: null, aelfEntryId: null, aelfReference: null,
            historicalCanonId: null, resolutionStatus: 'chapter_only',
            validationStatus: lien.validation_status, confidenceLevel: lien.confidence_level,
            linkIds: [], natures: [], ordreAelf: null,
          }
        }
        refs.set(cle, ref)`,
    'construction chapter_only')

  fs.writeFileSync(path, s)
}

// ── Rendu : un lien de chapitre n'est pas un faux verset ────────────────────
{
  const path = 'app/oeuvre/[id]/OeuvreClient.tsx'
  let s = fs.readFileSync(path, 'utf8')

  s = replaceOnce(s,
`    if (prec && prec.livre === v.livre && prec.chapitre === v.chapitre
        && Number.isFinite(nPrec) && Number.isFinite(nCur) && nCur === nPrec + 1) {`,
`    if (prec && prec.verset && v.verset && prec.livre === v.livre && prec.chapitre === v.chapitre
        && Number.isFinite(nPrec) && Number.isFinite(nCur) && nCur === nPrec + 1) {`,
    'ne pas fusionner chapitre et verset 1')

  s = replaceOnce(s,
`                          const multiple = groupe.length > 1
                          // Versets réunis`,
`                          const multiple = groupe.length > 1
                          const chapitreSeul = premier.resolutionStatus === 'chapter_only'
                          // Versets réunis`,
    'détection chapter_only')

  s = replaceOnce(s,
`                                  <a href={\`/?livre=${'${encodeURIComponent(premier.livre)}'}&chapitre=${'${encodeURIComponent(premier.chapitre)}'}&verset=${'${encodeURIComponent(premier.verset)}'}&trad=${'${encodeURIComponent(trad)}'}\`} target="_blank" rel="noopener noreferrer" className="ref-lien" style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0, textDecoration: 'none' }}>{labelGroupe}</a>`,
`                                  <a href={\`/?livre=${'${encodeURIComponent(premier.livre)}'}&chapitre=${'${encodeURIComponent(premier.chapitre)}'}${'${chapitreSeul ? \'\' : `&verset=${encodeURIComponent(premier.verset)}`}'}&trad=${'${encodeURIComponent(trad)}'}\`} target="_blank" rel="noopener noreferrer" className="ref-lien" style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0, textDecoration: 'none' }}>{labelGroupe}</a>`,
    'navigation chapter_only')

  s = replaceOnce(s,
`                                <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                  <BoutonEnregistrerVerset verset={versetAction} trad={trad} userId={userId} />
                                  <BoutonCopieVerset texte={corps} label={labelGroupe} />
                                  <BoutonSignalerVerset versetId={premier.id} label={labelGroupe} texte={corps} segmentId={segActifData.id} />
                                </div>`,
`                                {!chapitreSeul && (
                                  <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                    <BoutonEnregistrerVerset verset={versetAction} trad={trad} userId={userId} />
                                    <BoutonCopieVerset texte={corps} label={labelGroupe} />
                                    <BoutonSignalerVerset versetId={premier.id} label={labelGroupe} texte={corps} segmentId={segActifData.id} />
                                  </div>
                                )}`,
    'actions verset seulement')

  s = replaceOnce(s,
`                                {corps ? rendreTexteEnrichi(corps) : '—'}`,
`                                {chapitreSeul
                                  ? <em style={{ color: 'var(--cs-texte-doux)' }}>Lien au chapitre entier.</em>
                                  : corps ? rendreTexteEnrichi(corps) : '—'}`,
    'corps chapter_only')

  fs.writeFileSync(path, s)
}

// Assertions de non-régression ciblées.
const liens = fs.readFileSync('app/lib/liens.ts', 'utf8')
if (!liens.includes("resolutionStatus: 'chapter_only'")) throw new Error('chapter_only non conservé')
if (!liens.includes("fragments.join(' ')")) throw new Error('merge de cellules non agrégé')
const oeuvre = fs.readFileSync('app/oeuvre/[id]/OeuvreClient.tsx', 'utf8')
if (!oeuvre.includes('Lien au chapitre entier.')) throw new Error('rendu chapter_only absent')
if (!oeuvre.includes('prec.verset && v.verset')) throw new Error('groupement chapitre/verset non protégé')
console.log('Cas limites AELF corrigés : chapter_only conservé, merges textuels agrégés.')
