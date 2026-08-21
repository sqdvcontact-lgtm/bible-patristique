import fs from 'node:fs'

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: motif introuvable`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: motif non unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

// 1. La lecture AELF conserve les matières sans cible dans un bloc explicitement hors axe.
{
  const path = 'app/page.tsx'
  let s = fs.readFileSync(path, 'utf8')
  s = replaceOnce(s,
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
`    const [axe, horsAxe] = await Promise.all([
      supabase
        // Axe de lecture actif : une ligne = une entrée de la spine AELF/TOL.
        .from('v_aelf_bible_lecture')
        .select('*')
        .eq('livre', livre)
        .eq('chapitre', chapitre)
        .order('ordre'),
      supabase
        // Matières natives sans cible AELF : elles restent lisibles séparément et
        // ne reçoivent jamais d'aelf_entry_id artificiel.
        .from('v_aelf_bible_lecture_extras')
        .select('*')
        .eq('livre', livre)
        .eq('chapitre', chapitre)
        .order('est_suscription', { ascending: false })
        .order('verset'),
    ])
    if (axe.error) throw new Error(\`Lecture AELF indisponible : \${axe.error.message}\`)
    if (horsAxe.error) throw new Error(\`Matières hors axe AELF indisponibles : \${horsAxe.error.message}\`)
    versets = [...(axe.data || []), ...(horsAxe.data || [])]`,
    'lecture principale + hors axe')

  s = replaceOnce(s,
`    const payload = await loadBibleEditionChapter(supabase, {
      familyId: editionMember.family_id,
      bookCode: livre,
      canonIds: versets.map((verset) => verset.id_verset),
      includeBookFrontMatter: chapitre === 1,
    })`,
`    const canonIdsEdition = [...new Set(versets.flatMap((verset) => {
      const historique = typeof verset.historical_canon_id === 'string' && verset.historical_canon_id
        ? verset.historical_canon_id
        : null
      if (historique) return [historique]
      return verset.id_verset.startsWith('AELF:') || verset.id_verset.startsWith('EXTRA:')
        ? []
        : [verset.id_verset]
    }))]
    const payload = await loadBibleEditionChapter(supabase, {
      familyId: editionMember.family_id,
      bookCode: livre,
      canonIds: canonIdsEdition,
      includeBookFrontMatter: chapitre === 1,
    })`,
    'paratexte / canon historique seulement')

  fs.writeFileSync(path, s)
}

// 2. Les opérations encore legacy utilisent la cible historique de LA traduction,
// jamais l'identité AELF ni un canon global ambigu.
{
  const path = 'app/components/TexteBible.tsx'
  let s = fs.readFileSync(path, 'utf8')

  s = replaceOnce(s,
`  historical_canon_id?: string | null
  chapitre_alternatif?: number | null; verset_alternatif?: number | null`,
`  historical_canon_id?: string | null
  hors_axe_aelf?: boolean
  chapitre_alternatif?: number | null; verset_alternatif?: number | null`,
    'type hors axe')

  s = replaceOnce(s,
`function clePrelevement(v: Verset): string {
  return v.aelf_entry_id ?? \`legacy:\${v.chapitre}:\${v.verset}\`
}`,
`function canonHistoriquePour(v: Verset, traduction: string): string | null {
  const specifique = v[\`canon_\${traduction}\`]
  if (typeof specifique === 'string' && specifique) return specifique
  return typeof v.historical_canon_id === 'string' && v.historical_canon_id
    ? v.historical_canon_id
    : null
}

function clePrelevement(v: Verset): string {
  return v.aelf_entry_id ?? \`legacy:\${v.chapitre}:\${v.verset}:\${v.id_verset}\`
}`,
    'résolveur canon par traduction')

  s = replaceOnce(s,
`function ModaleEditionVerset({ verset, traduction, traductionLabel, refCourt, valeurActuelle, onClose, onEnregistre }: {
  verset: Verset; traduction: string; traductionLabel: string; refCourt: string; valeurActuelle: string
  onClose: () => void; onEnregistre: (nouvelleValeur: string) => void
}) {`,
`function ModaleEditionVerset({ verset, canonId, traduction, traductionLabel, refCourt, valeurActuelle, onClose, onEnregistre }: {
  verset: Verset; canonId: string; traduction: string; traductionLabel: string; refCourt: string; valeurActuelle: string
  onClose: () => void; onEnregistre: (nouvelleValeur: string) => void
}) {`,
    'modale canon explicite')

  s = replaceOnce(s,
    "      body: JSON.stringify({ id_verset: verset.id_verset, traduction, valeur }),",
    "      body: JSON.stringify({ id_verset: canonId, traduction, valeur }),",
    'édition sur canon explicite')

  s = replaceOnce(s,
`          {!chapitreToutLacune && versets.filter(v => estLigne899(v) || v[traduction]).map(v => {
            const actif = versetSelectionne?.id_verset === v.id_verset
            const ligne899 = estLigne899(v)
            const ligneEditoriale = estLigneEditoriale(v)
            const ligneSource = ligne899 || ligneEditoriale
            const lacune = estLacune899(v)`,
`          {!chapitreToutLacune && versets.filter(v => estLigne899(v) || v[traduction]).map((v, index, lignesAffichees) => {
            const actif = versetSelectionne?.id_verset === v.id_verset
            const ligne899 = estLigne899(v)
            const ligneEditoriale = estLigneEditoriale(v)
            const ligneHorsAxe = v.hors_axe_aelf === true
            const premiereLigneHorsAxe = ligneHorsAxe && (index === 0 || lignesAffichees[index - 1]?.hors_axe_aelf !== true)
            const ligneSource = ligne899 || ligneEditoriale || ligneHorsAxe
            const canonHistorique = canonHistoriquePour(v, traduction)
            const lacune = estLacune899(v)`,
    'qualification lignes hors axe')

  s = replaceOnce(s,
`            <Fragment key={v.id_verset}>
            {rendreFluxEditorial(blocsAvant, illustrationsAvant)}`,
`            <Fragment key={v.id_verset}>
            {premiereLigneHorsAxe && (
              <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '1.75rem auto 0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--cs-bord)' }}>
                <p style={{ margin: 0, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-faible)' }}>
                  Hors numérotation AELF — matière conservée dans la structure propre de cette traduction.
                </p>
              </div>
            )}
            {rendreFluxEditorial(blocsAvant, illustrationsAvant)}`,
    'séparateur hors axe')

  s = replaceOnce(s,
`                const incrementer = () => {
                  if (!v.historical_canon_id) return Promise.resolve()
                  return fetch('/api/versets/incrementer-lecture', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_verset: v.historical_canon_id }),
                  }).catch(() => {})
                }`,
`                const incrementer = () => {
                  if (!canonHistorique) return Promise.resolve()
                  return fetch('/api/versets/incrementer-lecture', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_verset: canonHistorique }),
                  }).catch(() => {})
                }`,
    'compteur par canon traduction')

  s = replaceOnce(s,
`                      <BoutonSignaler versetId={v.id_verset} versetRef={v.ref} texte={String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? '')} />
                      {estAdmin && !modeUtilisateurStandard && (
                        <button onClick={e => { e.stopPropagation(); setEditionCible(v) }} title="Modifier ce verset" className="bouton-action-verset"`,
`                      {canonHistorique && (
                        <BoutonSignaler versetId={canonHistorique} versetRef={v.ref} texte={String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? '')} />
                      )}
                      {estAdmin && !modeUtilisateurStandard && canonHistorique && (
                        <button onClick={e => { e.stopPropagation(); setEditionCible(v) }} title="Modifier ce verset" className="bouton-action-verset"`,
    'signalement et édition legacy sûrs')

  s = replaceOnce(s,
`      {editionCible && (
        <ModaleEditionVerset
          verset={editionCible}
          traduction={traduction}
          traductionLabel={traductionLabel}
          refCourt={\`${'${ABREV_FR[livreActif] || livreActif}'} ${'${chapitreActif}'}, ${'${editionCible.verset}'}\`}`,
`      {editionCible && canonHistoriquePour(editionCible, traduction) && (
        <ModaleEditionVerset
          verset={editionCible}
          canonId={canonHistoriquePour(editionCible, traduction)!}
          traduction={traduction}
          traductionLabel={traductionLabel}
          refCourt={\`${'${ABREV_FR[livreActif] || livreActif}'} ${'${nettoyerLabelAelf(editionCible.chapitre_label ?? chapitreActif)}'}, ${'${nettoyerLabelAelf(editionCible.verset_label ?? editionCible.verset)}'}\`}`,
    'modale finale sécurisée')

  fs.writeFileSync(path, s)
}

for (const path of ['app/page.tsx', 'app/lib/bibleMultimodeServer.ts', 'app/components/TexteBible.tsx']) {
  const s = fs.readFileSync(path, 'utf8')
  if (s.includes(".from('versets_lecture')")) throw new Error(`${path}: lecture versets_lecture résiduelle`)
}
const page = fs.readFileSync('app/page.tsx','utf8')
if (!page.includes(".from('v_aelf_bible_lecture_extras')")) throw new Error('Page Bible: hors axe AELF non chargé')
const texte = fs.readFileSync('app/components/TexteBible.tsx','utf8')
if (!texte.includes('Hors numérotation AELF')) throw new Error('TexteBible: hors axe AELF non signalé')
if (texte.includes('id_verset: verset.id_verset')) throw new Error('TexteBible: édition admin utilise encore id_verset actif')
console.log('Bible classique AELF finalisée : axe, hors-axe et opérations legacy séparés.')
