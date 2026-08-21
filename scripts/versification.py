"""
Tables de correspondance versification catholique ↔ protestante.

La numérotation de référence dans cette base est CATHOLIQUE/VULGATE.
Ce module convertit les références protestantes en catholiques pour
l'import, et vice-versa pour l'export.

Livres concernés : PSA, EXO, LEV, NUM, DEU, HOS, JOL, MAL

Usage:
    from versification import cath_vers_prot, prot_vers_cath

    ch_prot, v_prot = cath_vers_prot("PSA", 9, 25)   # → (10, 4)
    ch_cath, v_cath = prot_vers_cath("PSA", 10, 4)    # → (9, 25)
"""


def psa_cath_vers_prot(ch, v):
    if ch <= 8:
        return ch, v
    if ch == 9:
        return (9, v) if v <= 21 else (10, v - 21)
    if 10 <= ch <= 112:
        return ch + 1, v
    if ch == 113:
        return (114, v) if v <= 8 else (115, v - 8)
    if ch == 114:
        return 116, v
    if ch == 115:
        return 116, v + 9
    if 116 <= ch <= 145:
        return ch + 1, v
    if ch == 146:
        return 147, v
    if ch == 147:
        return 147, v + 11
    return ch, v  # 148-150


def psa_prot_vers_cath(ch, v):
    if ch <= 8:
        return ch, v
    if ch == 9:
        return 9, v
    if ch == 10:
        return 9, v + 21
    if 11 <= ch <= 113:
        return ch - 1, v
    if ch == 114:
        return 113, v
    if ch == 115:
        return 113, v + 8
    if ch == 116:
        return (114, v) if v <= 9 else (115, v - 9)
    if 117 <= ch <= 146:
        return ch - 1, v
    if ch == 147:
        return (146, v) if v <= 11 else (147, v - 11)
    return ch, v  # 148-150


def exo_cath_vers_prot(ch, v):
    if ch != 8:
        return ch, v
    if v <= 4:
        return 7, v + 25
    return 8, v - 4


def exo_prot_vers_cath(ch, v):
    if ch == 7 and v >= 26:
        return 8, v - 25
    if ch == 8:
        return 8, v + 4
    return ch, v


def lev_cath_vers_prot(ch, v):
    if ch == 5 and v >= 20:
        return 6, v - 19
    if ch == 6:
        return 6, v + 7
    return ch, v


def lev_prot_vers_cath(ch, v):
    if ch == 6:
        return (5, v + 19) if v <= 7 else (6, v - 7)
    return ch, v


def num_cath_vers_prot(ch, v):
    if ch == 17:
        return (16, v + 35) if v <= 15 else (17, v - 15)
    return ch, v


def num_prot_vers_cath(ch, v):
    if ch == 16 and v >= 36:
        return 17, v - 35
    if ch == 17:
        return 17, v + 15
    return ch, v


def deu_cath_vers_prot(ch, v):
    if ch == 13:
        return (12, 32) if v == 1 else (13, v - 1)
    return ch, v


def deu_prot_vers_cath(ch, v):
    if ch == 12 and v == 32:
        return 13, 1
    if ch == 13:
        return 13, v + 1
    return ch, v


def hos_cath_vers_prot(ch, v):
    if ch == 2:
        return (1, v + 9) if v <= 2 else (2, v - 2)
    return ch, v


def hos_prot_vers_cath(ch, v):
    if ch == 1 and v >= 10:
        return 2, v - 9
    if ch == 2:
        return 2, v + 2
    return ch, v


def jol_cath_vers_prot(ch, v):
    if ch == 3:
        return 2, v + 27
    if ch == 4:
        return 3, v
    return ch, v


def jol_prot_vers_cath(ch, v):
    if ch == 2 and v >= 28:
        return 3, v - 27
    if ch == 3:
        return 4, v
    return ch, v


def mal_cath_vers_prot(ch, v):
    if ch == 4:
        return 3, v + 18
    return ch, v


def mal_prot_vers_cath(ch, v):
    if ch == 3 and v >= 19:
        return 4, v - 18
    return ch, v


_CATH_PROT = {
    "PSA": psa_cath_vers_prot,
    "EXO": exo_cath_vers_prot,
    "LEV": lev_cath_vers_prot,
    "NUM": num_cath_vers_prot,
    "DEU": deu_cath_vers_prot,
    "HOS": hos_cath_vers_prot,
    "JOL": jol_cath_vers_prot,
    "MAL": mal_cath_vers_prot,
}

_PROT_CATH = {
    "PSA": psa_prot_vers_cath,
    "EXO": exo_prot_vers_cath,
    "LEV": lev_prot_vers_cath,
    "NUM": num_prot_vers_cath,
    "DEU": deu_prot_vers_cath,
    "HOS": hos_prot_vers_cath,
    "JOL": jol_prot_vers_cath,
    "MAL": mal_prot_vers_cath,
}


def cath_vers_prot(livre, ch, v):
    """Convertit une référence catholique en référence protestante.
    Retourne (ch_prot, v_prot). Identité si le livre ne diverge pas."""
    fn = _CATH_PROT.get(livre)
    return fn(ch, v) if fn else (ch, v)


def prot_vers_cath(livre, ch, v):
    """Convertit une référence protestante en référence catholique.
    Retourne (ch_cath, v_cath). Identité si le livre ne diverge pas."""
    fn = _PROT_CATH.get(livre)
    return fn(ch, v) if fn else (ch, v)


def a_des_divergences(livre):
    """Retourne True si le livre a des différences de numérotation."""
    return livre in _CATH_PROT


# ─── Tests rapides ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    cas = [
        # (livre, sens, ch_in, v_in, ch_out_attendu, v_out_attendu)
        ("PSA", "c→p", 9, 1,   9, 1),
        ("PSA", "c→p", 9, 21,  9, 21),
        ("PSA", "c→p", 9, 22, 10, 1),
        ("PSA", "c→p", 9, 39, 10, 18),
        ("PSA", "c→p", 10, 1, 11, 1),
        ("PSA", "c→p", 112, 1, 113, 1),
        ("PSA", "c→p", 113, 1, 114, 1),
        ("PSA", "c→p", 113, 8, 114, 8),
        ("PSA", "c→p", 113, 9, 115, 1),
        ("PSA", "c→p", 113, 26, 115, 18),
        ("PSA", "c→p", 114, 1, 116, 1),
        ("PSA", "c→p", 115, 1, 116, 10),
        ("PSA", "c→p", 146, 5, 147, 5),
        ("PSA", "c→p", 147, 1, 147, 12),
        ("PSA", "c→p", 150, 6, 150, 6),
        ("EXO", "c→p", 8, 1, 7, 26),
        ("EXO", "c→p", 8, 4, 7, 29),
        ("EXO", "c→p", 8, 5, 8, 1),
        ("LEV", "c→p", 5, 20, 6, 1),
        ("LEV", "c→p", 6, 1, 6, 8),
        ("NUM", "c→p", 17, 1, 16, 36),
        ("NUM", "c→p", 17, 15, 16, 50),
        ("NUM", "c→p", 17, 16, 17, 1),
        ("DEU", "c→p", 13, 1, 12, 32),
        ("DEU", "c→p", 13, 2, 13, 1),
        ("HOS", "c→p", 2, 1, 1, 10),
        ("HOS", "c→p", 2, 2, 1, 11),
        ("HOS", "c→p", 2, 3, 2, 1),
        ("JOL", "c→p", 3, 1, 2, 28),
        ("JOL", "c→p", 4, 1, 3, 1),
        ("MAL", "c→p", 4, 1, 3, 19),
        ("MAL", "c→p", 4, 6, 3, 24),
    ]

    erreurs = 0
    for livre, sens, ch_in, v_in, ch_exp, v_exp in cas:
        if sens == "c→p":
            ch_out, v_out = cath_vers_prot(livre, ch_in, v_in)
        else:
            ch_out, v_out = prot_vers_cath(livre, ch_in, v_in)
        ok = ch_out == ch_exp and v_out == v_exp
        if not ok:
            print(f"ERREUR {livre} {sens} {ch_in}:{v_in} → {ch_out}:{v_out}  (attendu {ch_exp}:{v_exp})")
            erreurs += 1

    if erreurs == 0:
        print(f"OK — {len(cas)} cas vérifiés sans erreur.")
    else:
        print(f"{erreurs} erreur(s) sur {len(cas)} cas.")
