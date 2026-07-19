/**
 * Tables de correspondance versification catholique ↔ protestante.
 *
 * La numérotation de référence dans cette base est CATHOLIQUE/VULGATE.
 * Ce module convertit les références protestantes (hébreu/LXX anglicane)
 * en catholiques pour l'import, et vice-versa pour l'export.
 *
 * Livres concernés : PSA, EXO, LEV, NUM, DEU, HOS, JOL, MAL
 */

export type Ref = { ch: number; v: number };

// ─── Psaumes ────────────────────────────────────────────────────────────────
// Règle générale : les psaumes 1-8 et 148-150 sont identiques dans les deux
// traditions. Entre les deux, la Vulgate fusionne Ps 9 et 10 hébreux → Ps 9
// catholique (39v), puis décale de -1 jusqu'à Ps 112 cath = Ps 113 héb,
// avant de fusionner à nouveau Ps 113 héb en 114+115 cath, etc.
//
// Tables complètes de la divergence (sens cath → prot) :
//   Cath 9:1-21    → Prot 9:1-21
//   Cath 9:22-39   → Prot 10:1-18   (v_prot = v_cath - 21)
//   Cath 10-112    → Prot ch+1      (même verset)
//   Cath 113:1-8   → Prot 114:1-8
//   Cath 113:9-26  → Prot 115:1-18  (v_prot = v_cath - 8)
//   Cath 114:1-9   → Prot 116:1-9
//   Cath 115:1-10  → Prot 116:10-19 (v_prot = v_cath + 9)
//   Cath 116-145   → Prot ch+1      (même verset)
//   Cath 146:1-11  → Prot 147:1-11
//   Cath 147:1-20  → Prot 147:12-31 (v_prot = v_cath + 11)
//   Cath 148-150   → Prot 148-150

export function psaCathVerseProt(ch: number, v: number): Ref {
  if (ch <= 8) return { ch, v };

  if (ch === 9) {
    if (v <= 21) return { ch: 9, v };
    return { ch: 10, v: v - 21 };
  }

  if (ch >= 10 && ch <= 112) return { ch: ch + 1, v };

  if (ch === 113) {
    if (v <= 8) return { ch: 114, v };
    return { ch: 115, v: v - 8 };
  }

  if (ch === 114) return { ch: 116, v };
  if (ch === 115) return { ch: 116, v: v + 9 };

  if (ch >= 116 && ch <= 145) return { ch: ch + 1, v };

  if (ch === 146) return { ch: 147, v };
  if (ch === 147) return { ch: 147, v: v + 11 };

  // 148-150
  return { ch, v };
}

export function psaProtVerseCath(ch: number, v: number): Ref {
  if (ch <= 8) return { ch, v };

  if (ch === 9) return { ch: 9, v };
  if (ch === 10) return { ch: 9, v: v + 21 };

  if (ch >= 11 && ch <= 113) return { ch: ch - 1, v };

  if (ch === 114) return { ch: 113, v };
  if (ch === 115) return { ch: 113, v: v + 8 };
  if (ch === 116) {
    if (v <= 9) return { ch: 114, v };
    return { ch: 115, v: v - 9 };
  }

  if (ch >= 117 && ch <= 146) return { ch: ch - 1, v };

  if (ch === 147) {
    if (v <= 11) return { ch: 146, v };
    return { ch: 147, v: v - 11 };
  }

  // 148-150
  return { ch, v };
}

// ─── Exode ──────────────────────────────────────────────────────────────────
// Cath 8:1-4   → Prot 7:26-29   (ch=7, v_prot = v_cath + 25)
// Cath 8:5+    → Prot 8:1+      (v_prot = v_cath - 4)
// Cath 7:1-25  → Prot 7:1-25    (identique)

export function exoCathVerseProt(ch: number, v: number): Ref {
  if (ch !== 8) return { ch, v };
  if (v <= 4) return { ch: 7, v: v + 25 };
  return { ch: 8, v: v - 4 };
}

export function exoProtVerseCath(ch: number, v: number): Ref {
  if (ch === 7 && v >= 26) return { ch: 8, v: v - 25 };
  if (ch === 8) return { ch: 8, v: v + 4 };
  return { ch, v };
}

// ─── Lévitique ──────────────────────────────────────────────────────────────
// Cath 5:20-26 → Prot 6:1-7    (ch=6, v_prot = v_cath - 19)
// Cath 6:1-23  → Prot 6:8-30   (ch=6, v_prot = v_cath + 7)
// Tout le reste identique.

export function levCathVerseProt(ch: number, v: number): Ref {
  if (ch === 5 && v >= 20) return { ch: 6, v: v - 19 };
  if (ch === 6) return { ch: 6, v: v + 7 };
  return { ch, v };
}

export function levProtVerseCath(ch: number, v: number): Ref {
  if (ch === 6) {
    if (v <= 7) return { ch: 5, v: v + 19 };
    return { ch: 6, v: v - 7 };
  }
  return { ch, v };
}

// ─── Nombres ────────────────────────────────────────────────────────────────
// Cath 17:1-15  → Prot 16:36-50  (ch=16, v_prot = v_cath + 35)
// Cath 17:16-28 → Prot 17:1-13   (ch=17, v_prot = v_cath - 15)
// Cath 16:1-35  → Prot 16:1-35   (identique)

export function numCathVerseProt(ch: number, v: number): Ref {
  if (ch === 17) {
    if (v <= 15) return { ch: 16, v: v + 35 };
    return { ch: 17, v: v - 15 };
  }
  return { ch, v };
}

export function numProtVerseCath(ch: number, v: number): Ref {
  if (ch === 16 && v >= 36) return { ch: 17, v: v - 35 };
  if (ch === 17) return { ch: 17, v: v + 15 };
  return { ch, v };
}

// ─── Deutéronome ────────────────────────────────────────────────────────────
// Cath 13:1    → Prot 12:32   (ch=12, v=32)
// Cath 13:2-19 → Prot 13:1-18 (ch=13, v_prot = v_cath - 1)
// Cath 12:1-31 → Prot 12:1-31 (identique)

export function deuCathVerseProt(ch: number, v: number): Ref {
  if (ch === 13) {
    if (v === 1) return { ch: 12, v: 32 };
    return { ch: 13, v: v - 1 };
  }
  return { ch, v };
}

export function deuProtVerseCath(ch: number, v: number): Ref {
  if (ch === 12 && v === 32) return { ch: 13, v: 1 };
  if (ch === 13) return { ch: 13, v: v + 1 };
  return { ch, v };
}

// ─── Osée ───────────────────────────────────────────────────────────────────
// Cath 2:1-2   → Prot 1:10-11  (ch=1, v_prot = v_cath + 9)
// Cath 2:3-25  → Prot 2:1-23   (ch=2, v_prot = v_cath - 2)
// Cath 1:1-9   → Prot 1:1-9    (identique)

export function hosCathVerseProt(ch: number, v: number): Ref {
  if (ch === 2) {
    if (v <= 2) return { ch: 1, v: v + 9 };
    return { ch: 2, v: v - 2 };
  }
  return { ch, v };
}

export function hosProtVerseCath(ch: number, v: number): Ref {
  if (ch === 1 && v >= 10) return { ch: 2, v: v - 9 };
  if (ch === 2) return { ch: 2, v: v + 2 };
  return { ch, v };
}

// ─── Joël ───────────────────────────────────────────────────────────────────
// Cath 3:1-5  → Prot 2:28-32   (ch=2, v_prot = v_cath + 27)
// Cath 4:1-21 → Prot 3:1-21    (ch=3, même verset)
// Cath 1-2:27 → Prot 1-2:27    (identique)

export function jolCathVerseProt(ch: number, v: number): Ref {
  if (ch === 3) return { ch: 2, v: v + 27 };
  if (ch === 4) return { ch: 3, v };
  return { ch, v };
}

export function jolProtVerseCath(ch: number, v: number): Ref {
  if (ch === 2 && v >= 28) return { ch: 3, v: v - 27 };
  if (ch === 3) return { ch: 4, v };
  return { ch, v };
}

// ─── Malachie ───────────────────────────────────────────────────────────────
// Cath 4:1-6  → Prot 3:19-24   (ch=3, v_prot = v_cath + 18)
// Cath 1-3:18 → Prot 1-3:18    (identique)

export function malCathVerseProt(ch: number, v: number): Ref {
  if (ch === 4) return { ch: 3, v: v + 18 };
  return { ch, v };
}

export function malProtVerseCath(ch: number, v: number): Ref {
  if (ch === 3 && v >= 19) return { ch: 4, v: v - 18 };
  return { ch, v };
}

// ─── Fonction générale ───────────────────────────────────────────────────────

type Livre = "PSA" | "EXO" | "LEV" | "NUM" | "DEU" | "HOS" | "JOL" | "MAL";

const CONVERTISSEURS_CATH_PROT: Partial<
  Record<string, (ch: number, v: number) => Ref>
> = {
  PSA: psaCathVerseProt,
  EXO: exoCathVerseProt,
  LEV: levCathVerseProt,
  NUM: numCathVerseProt,
  DEU: deuCathVerseProt,
  HOS: hosCathVerseProt,
  JOL: jolCathVerseProt,
  MAL: malCathVerseProt,
};

const CONVERTISSEURS_PROT_CATH: Partial<
  Record<string, (ch: number, v: number) => Ref>
> = {
  PSA: psaProtVerseCath,
  EXO: exoProtVerseCath,
  LEV: levProtVerseCath,
  NUM: numProtVerseCath,
  DEU: deuProtVerseCath,
  HOS: hosProtVerseCath,
  JOL: jolProtVerseCath,
  MAL: malProtVerseCath,
};

/** Convertit une référence catholique en référence protestante. */
export function cathVerseProt(
  livre: string,
  ch: number,
  v: number
): Ref {
  const fn = CONVERTISSEURS_CATH_PROT[livre];
  return fn ? fn(ch, v) : { ch, v };
}

/** Convertit une référence protestante en référence catholique. */
export function protVerseCath(
  livre: string,
  ch: number,
  v: number
): Ref {
  const fn = CONVERTISSEURS_PROT_CATH[livre];
  return fn ? fn(ch, v) : { ch, v };
}

/** Retourne vrai si le livre a des divergences de numérotation. */
export function aDesConvergences(livre: string): boolean {
  return livre in CONVERTISSEURS_CATH_PROT;
}
