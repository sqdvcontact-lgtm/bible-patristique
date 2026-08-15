from pathlib import Path

path = Path('app/oeuvre/[id]/page.tsx')
text = path.read_text(encoding='utf-8')

old = """      let q = supabase.from('segments')
        .select(SELECT_ENTETE, avecCount ? { count: 'exact' } : undefined)
        .eq('id_oeuvre', id)
        .in('nature', NATURES_TEXTE)
"""
new = """      let q = supabase.from('segments')
        .select(SELECT_ENTETE, avecCount ? { count: 'exact' } : undefined)
        .eq('id_oeuvre', id)
        // Les liminaires sont chargés avec leur niveau au moment de la lecture,
        // mais ne doivent pas créer à eux seuls une entrée de sommaire.
        .in('nature', NATURES_TEXTE.filter(nature => nature !== 'introduction'))
"""
if text.count(old) != 1:
    raise SystemExit(f'entetes nature: attendu 1, trouvé {text.count(old)}')
text = text.replace(old, new, 1)

old2 = """  ;(entetesTexteRaw ?? []).forEach((r: any) => {
    const n1 = r.ref_niv1 ? String(r.ref_niv1) : ''
    if (!n1) return
    if (!niv1Vus.has(n1)) { niv1Vus.add(n1); niv1List.push(n1) }
    if (r.ref_niv1_texte && !niv1TexteMap[n1]) niv1TexteMap[n1] = String(r.ref_niv1_texte)
  })

  const segmentCible = segmentCibleProbe
"""
new2 = """  ;(entetesTexteRaw ?? []).forEach((r: any) => {
    const n1 = r.ref_niv1 ? String(r.ref_niv1) : ''
    if (!n1) return
    if (!niv1Vus.has(n1)) { niv1Vus.add(n1); niv1List.push(n1) }
    if (r.ref_niv1_texte && !niv1TexteMap[n1]) niv1TexteMap[n1] = String(r.ref_niv1_texte)
  })
  // Une préface générale est structurellement antérieure aux livres numérotés,
  // même lorsque ses segments ont été ajoutés plus tard dans la numérotation technique.
  const indexPreface = niv1List.indexOf('Préface')
  if (indexPreface > 0) {
    const preface = niv1List.splice(indexPreface, 1)[0]
    if (preface) niv1List.unshift(preface)
  }

  const segmentCible = segmentCibleProbe
"""
if text.count(old2) != 1:
    raise SystemExit(f'ordre preface: attendu 1, trouvé {text.count(old2)}')
text = text.replace(old2, new2, 1)

path.write_text(text, encoding='utf-8')
print('patch preface order applied')
