from pathlib import Path


def replace_exact(path: str, old: str, new: str, expected: int = 1) -> None:
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: attendu {expected} occurrence(s), trouvé {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new), encoding="utf-8")


# Lecteur serveur : toutes les natures du corps, y compris l'apparat d'auteur ;
# apparat éditorial nouveau + compatibilité legacy séparés du corps.
page = "app/oeuvre/[id]/page.tsx"
replace_exact(
    page,
    "  const NATURES_TEXTE = ['texte', 'introduction', 'citation', 'lemme', 'dialogue', 'texte absent']\n",
    "  const NATURES_TEXTE = ['texte', 'introduction', 'citation', 'lemme', 'vers', 'rubrique', 'dialogue', 'apparat_auteur', 'texte absent']\n"
    "  const NATURES_APPARAT = ['apparat_critique', 'apparat_editeur']\n",
)
replace_exact(
    page,
    "        if (k === 'nature' && v === 'texte') q = q.in('nature', NATURES_TEXTE)\n        else q = q.eq(k, v)",
    "        if (k === 'nature' && v === 'texte') q = q.in('nature', NATURES_TEXTE)\n"
    "        else if (k === 'nature' && v === 'apparat') q = q.in('nature', NATURES_APPARAT)\n"
    "        else q = q.eq(k, v)",
    expected=2,
)
replace_exact(page, "    chargerTousSegments({ nature: 'apparat_critique' }),", "    chargerTousSegments({ nature: 'apparat' }),")
replace_exact(
    page,
    "  const vueInitiale = segmentCible?.nature === 'apparat_critique' ? 'apparat' : 'texte'",
    "  const vueInitiale = NATURES_APPARAT.includes(segmentCible?.nature ?? '') ? 'apparat' : 'texte'",
)

# Lecteur client lazy : même vocabulaire que le serveur.
client = "app/oeuvre/[id]/OeuvreClient.tsx"
replace_exact(
    client,
    "    const NATURES_TEXTE = ['texte', 'introduction', 'citation', 'dialogue', 'texte absent']",
    "    const NATURES_TEXTE = ['texte', 'introduction', 'citation', 'lemme', 'vers', 'rubrique', 'dialogue', 'apparat_auteur', 'texte absent']",
)
replace_exact(client, "      .eq('nature', 'apparat_critique')", "      .in('nature', ['apparat_critique', 'apparat_editeur'])")
replace_exact(client, "const NBSP_TITRE_COLOPHON = '\\u00A0'\n", "const NBSP_TITRE_COLOPHON = '\\u00A0'\nconst FINE_TITRE_COLOPHON = '\\u202F'\n")
replace_exact(
    client,
    "    .replace(/\\s+([;:!?»])/g, `${NBSP_TITRE_COLOPHON}$1`)\n    .replace(/([«])\\s+/g, `$1${NBSP_TITRE_COLOPHON}`)",
    "    .replace(/\\s+([;!?])/g, `${FINE_TITRE_COLOPHON}$1`)\n"
    "    .replace(/\\s+([:»])/g, `${NBSP_TITRE_COLOPHON}$1`)\n"
    "    .replace(/([«])\\s+/g, `$1${NBSP_TITRE_COLOPHON}`)",
)
replace_exact(client, ">APPARAT CRITIQUE</span>", ">APPARAT</span>")

# Bouton de guillemets de l'éditeur : U+00A0 conformément à la charte.
modal = "app/oeuvre/[id]/ModaleEditionAdmin.tsx"
replace_exact(modal, "entourer('« ', ' »')", "entourer('« ', ' »')")

# Typographie : NBSP avant :, NBSP à l'intérieur de « », FINE avant ; ! ?.
typo = Path("app/lib/typographie.ts")
s = typo.read_text(encoding="utf-8")
if "const NBSP = '\\u00A0'" not in s:
    s = s.replace("const FINE = '\\u202F'\n", "const FINE = '\\u202F'\nconst NBSP = '\\u00A0'\n", 1)

old_fr = """export function normaliserEspaces(texte: string): string {
  return horsUrls(texte, fragment => fragment
    .replace(/[ \\u00A0\\u202F]*([;!?])(?=[\\s)\\]»”\"'….,;:]|$)/g, `${FINE}$1`)
    .replace(/[ \\u00A0\\u202F]*:(?=[\\s)\\]»”\"'….,;!?]|$)/g, `${FINE}:`)
    .replace(/«[ \\u00A0\\u202F]*/g, `«${FINE}`)
    .replace(/[ \\u00A0\\u202F]*»/g, `${FINE}»`)
    .replace(/\\([ \\u00A0\\u202F]+/g, '(')
    .replace(/[ \\u00A0\\u202F]+\\)/g, ')')
    .replace(/(\\p{L})'(\\p{L})/gu, '$1’$2')
  )
}
"""
new_fr = """export function normaliserEspaces(texte: string): string {
  return horsUrls(texte, fragment => fragment
    .replace(/[ \\u00A0\\u202F]*([;!?])(?=[\\s)\\]»”\"'….,;:]|$)/g, `${FINE}$1`)
    .replace(/[ \\u00A0\\u202F]*:(?=[\\s)\\]»”\"'….,;!?]|$)/g, `${NBSP}:`)
    .replace(/«[ \\u00A0\\u202F]*/g, `«${NBSP}`)
    .replace(/[ \\u00A0\\u202F]*»/g, `${NBSP}»`)
    .replace(/\\([ \\u00A0\\u202F]+/g, '(')
    .replace(/[ \\u00A0\\u202F]+\\)/g, ')')
    .replace(/(\\p{L})'(\\p{L})/gu, '$1’$2')
  )
}
"""
if old_fr not in s:
    raise SystemExit("typographie.ts: bloc français attendu introuvable")
s = s.replace(old_fr, new_fr, 1)

old_orig = """export function normaliserEspacesOriginal(texte: string): string {
  return texte
    .replace(/[ \\u00A0\\u202F]*([:;!?])/g, `${FINE}$1`)
    .replace(/«[ \\u00A0\\u202F]*/g, `«${FINE}`)
    .replace(/[ \\u00A0\\u202F]*»/g, `${FINE}»`)
}
"""
new_orig = """export function normaliserEspacesOriginal(texte: string): string {
  return texte
    .replace(/[ \\u00A0\\u202F]*([;!?])/g, `${FINE}$1`)
    .replace(/[ \\u00A0\\u202F]*:/g, `${NBSP}:`)
    .replace(/«[ \\u00A0\\u202F]*/g, `«${NBSP}`)
    .replace(/[ \\u00A0\\u202F]*»/g, `${NBSP}»`)
}
"""
if old_orig not in s:
    raise SystemExit("typographie.ts: bloc langue originale attendu introuvable")
s = s.replace(old_orig, new_orig, 1)

marker = "\n// Texte en LANGUE ORIGINALE (latin, grec)"
addition = """

/** Normalise uniquement des variantes glyphiques de présentation d'une édition non médiévale. */
export function normaliserGlyphesEdition(texte: string): string {
  return texte
    .replace(/ſ/g, 's')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    .replace(/ﬅ/g, 'st')
    .replace(/ﬆ/g, 'st')
}

/** Couche éditoriale des éditions non médiévales. Ne pas employer sur une transcription diplomatique médiévale. */
export function normaliserTypographieEdition(texte: string, langueOriginale = false): string {
  const glyphes = normaliserGlyphesEdition(texte)
  return langueOriginale ? normaliserEspacesOriginal(glyphes) : normaliserEspaces(glyphes)
}
"""
if marker not in s:
    raise SystemExit("typographie.ts: point d'insertion introuvable")
s = s.replace(marker, addition + marker, 1)
s = s.replace(
    "Une fine insécable U+202F est imposée avant les\n// ponctuations hautes françaises (: ; ! ?)",
    "Une espace insécable U+00A0 est imposée avant le deux-points et une fine insécable U+202F avant\n// les autres ponctuations hautes françaises (; ! ?)",
)
s = s.replace(
    "// Texte en LANGUE ORIGINALE (latin, grec) : l'édition source porte la ponctuation\n// COLLÉE (« valde: », « dixit: »), à l'anglaise, alors que le corpus français rend déjà\n// une fine insécable avant les hautes ponctuations. Pour un couple bilingue homogène, on\n// applique la même typographie (charte §3.1-3.2 : harmonisation mécanique « sans réécrire\n// la langue de l'édition ») en AJOUTANT une fine insécable U+202F avant : ; ! ? et autour\n// des guillemets. Idempotent : une espace déjà présente (simple, insécable ou fine) est\n// ramenée à la fine unique ; rien n'est ajouté avant , . … .",
    "// Texte en LANGUE ORIGINALE (latin, grec) : même convention Corpus Scriptura pour les\n// éditions non médiévales. U+00A0 avant le deux-points et autour des guillemets français ;\n// U+202F avant ; ! ?. Cette fonction est idempotente et ne modernise jamais la langue.",
)
typo.write_text(s, encoding="utf-8")

# Tests ciblés réécrits sur la convention normative actuelle.
Path("app/lib/typographie.test.ts").write_text("""import { describe, it, expect } from 'vitest'
import { normaliserEspaces, normaliserEspacesOriginal, normaliserGlyphesEdition, normaliserTypographieEdition } from './typographie'

const FINE = ' '
const NBSP = ' '

describe('normaliserEspacesOriginal (latin, grec)', () => {
  it('applique NBSP avant : et FINE avant ; ! ?', () => {
    expect(normaliserEspacesOriginal('magna virtus tua: et')).toBe(`magna virtus tua${NBSP}: et`)
    expect(normaliserEspacesOriginal('quid dicam?')).toBe(`quid dicam${FINE}?`)
    expect(normaliserEspacesOriginal('o magnum!')).toBe(`o magnum${FINE}!`)
    expect(normaliserEspacesOriginal('primum; deinde')).toBe(`primum${FINE}; deinde`)
  })
  it('normalise les espaces existantes et reste idempotent', () => {
    expect(normaliserEspacesOriginal('tua : et')).toBe(`tua${NBSP}: et`)
    expect(normaliserEspacesOriginal(`tua${FINE}: et`)).toBe(`tua${NBSP}: et`)
    expect(normaliserEspacesOriginal(`quid${NBSP}?`)).toBe(`quid${FINE}?`)
  })
  it('emploie NBSP à l’intérieur des guillemets français', () => {
    expect(normaliserEspacesOriginal('dixit «verbum»')).toBe(`dixit «${NBSP}verbum${NBSP}»`)
  })
  it('ne touche pas la virgule, le point ni les points de suspension', () => {
    expect(normaliserEspacesOriginal('a, b. c... fin.')).toBe('a, b. c... fin.')
  })
})

describe('normaliserEspaces (français)', () => {
  it('applique NBSP avant : et FINE avant ; ! ?', () => {
    expect(normaliserEspaces('Maistresse: que dites-vous? Helas! enfin;')).toBe(
      `Maistresse${NBSP}: que dites-vous${FINE}? Helas${FINE}! enfin${FINE};`,
    )
  })
  it('normalise les apostrophes droites internes aux mots', () => {
    expect(normaliserEspaces("D'vn costé, l'Histoire; semble-t'il vrai? C'est fait.")).toBe(
      `D’vn costé, l’Histoire${FINE}; semble-t’il vrai${FINE}? C’est fait.`,
    )
  })
  it('emploie NBSP à l’intérieur des guillemets français', () => {
    expect(normaliserEspaces('Il dit «mot».')).toBe(`Il dit «${NBSP}mot${NBSP}».`)
  })
  it('supprime les espaces immédiatement à l’intérieur des parenthèses', () => {
    expect(normaliserEspaces('( repris-ie)')).toBe('(repris-ie)')
    expect(normaliserEspaces(`(${NBSP}ma chere Maistresse${FINE})`)).toBe('(ma chere Maistresse)')
  })
  it('préserve heures, références numériques et URL', () => {
    const texte = 'Rendez-vous 10:30; Jn 3:16; https://exemple.fr/a:b?x=1; fin.'
    expect(normaliserEspaces(texte)).toBe(
      `Rendez-vous 10:30${FINE}; Jn 3:16${FINE}; https://exemple.fr/a:b?x=1${FINE}; fin.`,
    )
  })
  it('reste idempotent', () => {
    const texte = `(Pourquoi${FINE}? parce que${NBSP}: oui${FINE}; vraiment${FINE}!)`
    expect(normaliserEspaces(normaliserEspaces(texte))).toBe(texte)
  })
})

describe('normalisation glyphique non médiévale', () => {
  it('modernise les glyphes sans moderniser la langue', () => {
    expect(normaliserGlyphesEdition('il ſçavoit ﬁdèlement')).toBe('il sçavoit fidèlement')
    expect(normaliserTypographieEdition('il ſçavoit: oui;')).toBe(`il sçavoit${NBSP}: oui${FINE};`)
  })
})
""", encoding="utf-8")
