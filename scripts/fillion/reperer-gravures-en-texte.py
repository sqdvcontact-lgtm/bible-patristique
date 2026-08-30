# -*- coding: utf-8 -*-
"""Repérer une gravure EN PLEIN TEXTE, par la taille des traits.

⛔ POURQUOI PAS LE DÉTECTEUR EXISTANT. `process_illustrations.detect_candidates`
masque le texte reconnu par l'OCR et garde ce qui reste. Il a servi pour les
planches HORS-TEXTE du tome I, où l'OCR ne lit rien. Sur les gravures en plein
texte du tome VII, l'OCR pose de FAUX MOTS sur la hachure — 24 à 511 par page — et
le masque efface donc la gravure avec eux. Éprouvé sur les onze pages de Marc,
dont on connaît les réponses : **une seule** est retrouvée, et c'est la seule où
l'OCR ne pose aucun mot sur la gravure. La confiance ne sépare pas ces faux mots
des vrais : médiane 30 des deux côtés.

⛔ ON NE PART DONC PAS DE L'OCR, MAIS DE LA TAILLE DES TRAITS. Un caractère
d'imprimerie est une petite composante ; une gravure porte des traits longs — un
filet de cadre, un contour, une ligne d'horizon. On mesure la taille MÉDIANE des
composantes de la page, qui est celle des lettres, et l'on ne retient que ce qui
la dépasse franchement — EN HAUTEUR seule, voir le corps.

CALIBRÉ SUR LES ONZE PAGES DE MARC, dont les boîtes sont en base et servent de
témoin (charte § 35.16.15) : la bonne gravure sort au RANG 1 sur les onze, et la
boîte s'accorde à ±1 % de la page sur neuf. Les deux écarts restants portent sur
l'ÉTENDUE — un élément voisin au-dessus — et demandent un œil.

    python reperer-gravures-en-texte.py 213 219 221 ...

⚠️ Il ne fabrique AUCUN fichier et n'écrit rien en base : il rend des boîtes
NORMALISÉES et une planche de contrôle par page, à relire avant tout import. Le
rendu, lui, revient à `detourer-gravures.mjs`, qui part du feuillet JP2.
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

RACINE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import process_illustrations as pi  # noqa: E402

PNG = RACINE / "tmp" / "jp2-png"      # les feuillets décodés depuis le JP2
LARGEUR = 1400                # assez fin pour que les lettres restent séparées
GRAND_TRAIT = 3.0             # ⛔ en HAUTEUR seule : voir plus bas
FUSION = 0.014                # rayon de fusion, en fraction du petit côté


def nettoyer(g: np.ndarray) -> np.ndarray:
    hist = np.bincount(g.ravel(), minlength=256).astype(float)
    lisse = np.convolve(hist, np.ones(3) / 3, mode="same")
    pic = int(150 + np.argmax(lisse[150:]))
    demi = 1
    while pic + demi < 255 and lisse[pic + demi] >= lisse[pic] * 0.2:
        demi += 1
    cum = np.cumsum(hist) / g.size
    noir = int(np.argmax(cum >= 0.005))
    plancher = max(noir + 24, pic - demi)
    amp = max(1, plancher - noir)
    return np.clip((g.astype(np.int32) - noir) * 255 // amp, 0, 255).astype(np.uint8)


def reperer(feuillet: int, qa: Path | None = None) -> list[dict]:
    src = Image.open(PNG / f"f{feuillet:03d}.png").convert("L")
    img = src.resize((LARGEUR, round(src.height * LARGEUR / src.width)), Image.LANCZOS)
    W, H = img.size
    g = nettoyer(np.asarray(img))
    encre = g < 190

    bord = max(3, round(min(W, H) * 0.010))
    encre[:bord, :] = encre[-bord:, :] = False
    encre[:, :bord] = encre[:, -bord:] = False

    comps = pi.connected_components(encre)
    if not comps:
        return []
    # La MÉDIANE des composantes est celle des lettres : c'est l'étalon de la page.
    hauteurs = np.array([c.bottom - c.top for c in comps])
    largeurs = np.array([c.right - c.left for c in comps])
    hm, lm = float(np.median(hauteurs)), float(np.median(largeurs))

    grands = np.zeros((H, W), dtype=bool)
    for c in comps:
        # ⛔ LA HAUTEUR SEULE. Un mot serré est une composante LARGE — à cette
        #    finesse les lettres se touchent — et le critère de largeur faisait
        #    entrer des paragraphes entiers : la boîte de f213 englobait la gravure
        #    ET le paragraphe au-dessus. Un trait de gravure, lui, est HAUT, ce
        #    qu'une ligne de texte n'est jamais.
        if (c.bottom - c.top) > GRAND_TRAIT * hm:
            grands[c.top:c.bottom, c.left:c.right] = True

    # ⚠️ On fond les grands traits entre eux : les morceaux d'une même gravure sont
    #    voisins, ceux de deux gravures différentes ne le sont pas.
    r = max(5, round(min(W, H) * FUSION))
    if r % 2 == 0:
        r += 1
    fondus = np.asarray(
        Image.fromarray((grands * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(r))
    ) > 0
    retrait = r // 2

    sortie = []
    for c in pi.connected_components(fondus):
        # ⛔ La boîte se reprend sur les GRANDS TRAITS eux-mêmes, non sur la fusion :
        #    celle-ci a servi à réunir les morceaux, elle ne dit pas leur étendue.
        zone = grands[c.top:c.bottom, c.left:c.right]
        ys, xs = np.nonzero(zone)
        if not len(ys):
            continue
        gauche, haut = c.left + int(xs.min()), c.top + int(ys.min())
        droite, bas = c.left + int(xs.max()) + 1, c.top + int(ys.max()) + 1
        lb, hb = droite - gauche, bas - haut
        if lb < W * 0.08 or hb < H * 0.022:
            continue
        # ⛔ Un FILET de séparation est long et plat : ce n'est pas une gravure.
        if lb > W * 0.30 and hb < H * 0.012:
            continue
        dens = float(encre[haut:bas, gauche:droite].mean())
        if dens < 0.02:
            continue
        sortie.append({
            "normalized": [gauche / W, haut / H, droite / W, bas / H],
            "densite": round(dens, 4),
            "aire": round(lb * hb / (W * H), 5),
        })
    sortie.sort(key=lambda x: -x["aire"])

    if qa is not None:
        vue = img.convert("RGB")
        d = ImageDraw.Draw(vue)
        for i, k in enumerate(sortie, 1):
            n = k["normalized"]
            d.rectangle((n[0] * W, n[1] * H, n[2] * W, n[3] * H), outline="#b42318", width=3)
            d.text((n[0] * W + 4, n[1] * H + 4), str(i), fill="#b42318")
        qa.parent.mkdir(parents=True, exist_ok=True)
        vue.save(qa, quality=88)
    return sortie


if __name__ == "__main__":
    feuillets = [int(x) for x in sys.argv[1:]]
    tout = {}
    for f in feuillets:
        try:
            tout[f] = reperer(f, RACINE / "tmp" / "reperage2" / f"f{f:03d}.jpg")
            print(f"f{f:03d} : {len(tout[f])} candidat(s)")
        except Exception as e:  # noqa: BLE001
            print(f"f{f:03d} ⛔ {e}")
    d = RACINE / "tmp" / "reperage2"
    d.mkdir(parents=True, exist_ok=True)
    (d / "boites.json").write_text(json.dumps(tout, ensure_ascii=False, indent=1), encoding="utf-8")
