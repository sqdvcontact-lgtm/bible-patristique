#!/usr/bin/env python3
"""Extraction reproductible des illustrations Fillion depuis un fac-similé PDF.

Le fac-similé reste l'autorité. Ce script ne produit que des candidats : un
master PNG sans perte, un WebP pour le site, un manifeste et une planche QA.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps


PROFILE_CODE = "fillion-illustration"
PROFILE_VERSION = "1.2.0"
DEFAULT_ANALYSIS_DPI = 120
DEFAULT_SOURCE_DPI = 400
DEFAULT_WEB_MAX_PX = 1600
DEFAULT_WEB_QUALITY = 90
DEFAULT_SPECKLE_AREA = 64
FULL_PAGE_MIN_COVERAGE = 0.30
FULL_PAGE_MIN_PORTRAIT_RATIO = 1.25


@dataclass(frozen=True)
class OcrWord:
    left: int
    top: int
    right: int
    bottom: int
    confidence: int


@dataclass(frozen=True)
class OcrPage:
    width: int
    height: int
    words: tuple[OcrWord, ...]


@dataclass(frozen=True)
class Component:
    left: int
    top: int
    right: int
    bottom: int
    area: int

    @property
    def width(self) -> int:
        return self.right - self.left

    @property
    def height(self) -> int:
        return self.bottom - self.top


@dataclass(frozen=True)
class Candidate:
    box: tuple[int, int, int, int]
    score: float
    residual_ink_pixels: int
    ink_density: float
    text_overlap_ratio: float
    confidence: str


def automatic_rotation_degrees(
    candidate: Candidate,
    page: OcrPage,
    page_size: tuple[int, int],
) -> int:
    """Oriente les planches hors texte Fillion imprimées de côté.

    La règle reste volontairement stricte : aucun mot OCR, une illustration qui
    occupe une part importante de la feuille et un cadrage nettement vertical.
    Dans les volumes Fillion, ces planches sont reliées avec leur sommet tourné
    vers la gouttière ; une rotation horaire les remet dans le sens de lecture.
    """

    if page.words:
        return 0
    page_area = max(1, page_size[0] * page_size[1])
    left, top, right, bottom = candidate.box
    width = max(0, right - left)
    height = max(0, bottom - top)
    coverage = (width * height) / page_area
    portrait_ratio = height / max(1, width)
    if coverage >= FULL_PAGE_MIN_COVERAGE and portrait_ratio >= FULL_PAGE_MIN_PORTRAIT_RATIO:
        return -90
    return 0


def rotate_clockwise_if_needed(
    image: Image.Image,
    degrees: int,
) -> Image.Image:
    if degrees == -90:
        return image.transpose(Image.Transpose.ROTATE_270)
    if degrees != 0:
        raise ValueError(f"Rotation automatique non prise en charge : {degrees}°")
    return image


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def locate_pdftoppm(explicit: str | None) -> Path:
    candidates: list[Path] = []
    if explicit:
        candidates.append(Path(explicit))
    if os.environ.get("PDFTOPPM"):
        candidates.append(Path(os.environ["PDFTOPPM"]))
    discovered = shutil.which("pdftoppm")
    if discovered:
        candidates.append(Path(discovered))
    candidates.append(
        Path.home()
        / ".cache/codex-runtimes/codex-primary-runtime/dependencies/native"
        / "poppler/Library/bin/pdftoppm.exe"
    )
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    raise FileNotFoundError(
        "pdftoppm est introuvable. Fournir --pdftoppm ou la variable PDFTOPPM."
    )


def render_pdf_page(
    pdftoppm: Path,
    pdf: Path,
    page_index: int,
    dpi: int,
    output: Path,
) -> None:
    prefix = output.with_suffix("")
    command = [
        str(pdftoppm),
        "-f",
        str(page_index),
        "-l",
        str(page_index),
        "-r",
        str(dpi),
        "-png",
        "-singlefile",
        str(pdf),
        str(prefix),
    ]
    subprocess.run(command, check=True, capture_output=True)
    rendered = prefix.with_suffix(".png")
    if not rendered.is_file():
        raise RuntimeError(f"Rendu PDF absent : {rendered}")
    if rendered != output:
        rendered.replace(output)


def read_ocr_page(xml_path: Path, page_index: int) -> OcrPage:
    current = 0
    for _event, element in ET.iterparse(xml_path, events=("end",)):
        if element.tag != "OBJECT":
            continue
        current += 1
        if current != page_index:
            element.clear()
            continue
        width = int(element.attrib["width"])
        height = int(element.attrib["height"])
        words: list[OcrWord] = []
        for word in element.iter("WORD"):
            raw = word.attrib.get("coords", "")
            try:
                x1, y1, x2, y2 = (int(value) for value in raw.split(","))
            except (TypeError, ValueError):
                continue
            left, right = sorted((x1, x2))
            # Dans l'XML DjVu d'Internet Archive, l'origine est en haut ; la
            # première ordonnée est généralement le bas du mot.
            top = min(y1, y2)
            bottom = max(y1, y2)
            confidence = int(word.attrib.get("x-confidence", "0") or 0)
            words.append(OcrWord(left, top, right, bottom, confidence))
        element.clear()
        return OcrPage(width, height, tuple(words))
    raise IndexError(f"Page OCR {page_index} absente de {xml_path}")


def normalized_gray(image: Image.Image, blur_radius: float) -> np.ndarray:
    """Étale les niveaux sans division par un fond flouté.

    ``blur_radius`` est conservé dans la signature pour ne pas casser les
    appels historiques, mais n'intervient plus dans le traitement. La
    précédente correction de champ plat effaçait les grandes plages sombres
    des demi-teintes. Les points noir et blanc sont désormais relevés sur la
    planche elle-même, avec au plus 0,5 % d'écrêtage à chaque extrémité.
    """

    del blur_radius
    return level_stretch(image)[0]


def level_stretch(
    image: Image.Image,
    clip_percent: float = 0.5,
) -> tuple[np.ndarray, dict[str, float]]:
    """Produit une rampe continue noir-blanc, sans seuil ni détourage."""

    if not 0.0 <= clip_percent <= 0.5:
        raise ValueError("clip_percent doit rester compris entre 0 et 0,5")
    values = np.asarray(ImageOps.grayscale(image), dtype=np.float32)
    low = float(np.percentile(values, clip_percent))
    high = float(np.percentile(values, 100.0 - clip_percent))
    if high - low < 1.0:
        stretched = np.clip(values, 0, 255)
    else:
        stretched = np.clip((values - low) * 255.0 / (high - low), 0, 255)
    return stretched.astype(np.uint8), {
        "black_point": round(low, 4),
        "white_point": round(high, 4),
        "clip_percent_each_end": clip_percent,
    }


def tone_statistics(values: np.ndarray) -> dict[str, float]:
    """Mesures reproductibles employées pour classer et refuser un actif."""

    return {
        "pure_white_percent": round(float((values == 255).mean() * 100.0), 4),
        "paper_over_230_percent": round(float((values > 230).mean() * 100.0), 4),
        "midtone_60_200_percent": round(
            float(((values >= 60) & (values <= 200)).mean() * 100.0),
            4,
        ),
    }


def classify_illustration_family(
    stretched_values: np.ndarray,
    threshold_percent: float = 35.0,
) -> tuple[str, dict[str, float | str]]:
    """Classe d'après la planche mesurée, jamais d'après son sujet."""

    midtone_percent = tone_statistics(stretched_values)["midtone_60_200_percent"]
    family = "line_art" if midtone_percent < threshold_percent else "halftone"
    return family, {
        "method": "midtone_mass_after_level_stretch",
        "threshold_percent": threshold_percent,
        "measured_midtone_60_200_percent": midtone_percent,
        "decision": family,
        "doubt_defaults_to": "halftone",
    }


def resize_for_web(
    image: Image.Image,
    max_px: int,
) -> tuple[Image.Image, dict[str, object]]:
    """Réduit avec moyenne de surface au-delà de 1,5× pour éviter la moire."""

    width, height = image.size
    ratio = max(width / max_px, height / max_px, 1.0)
    if ratio == 1.0:
        return image.copy(), {
            "reduction_ratio": 1.0,
            "resampling": "none",
            "anti_alias_prefilter": False,
        }
    target = (max(1, round(width / ratio)), max(1, round(height / ratio)))
    if ratio > 1.5:
        resized = image.resize(target, Image.Resampling.BOX)
        method = "area_box"
        anti_alias = True
    else:
        resized = image.resize(target, Image.Resampling.LANCZOS)
        method = "lanczos"
        anti_alias = False
    return resized, {
        "reduction_ratio": round(ratio, 6),
        "resampling": method,
        "anti_alias_prefilter": anti_alias,
    }


def make_text_mask(page: OcrPage, size: tuple[int, int], padding: int = 3) -> np.ndarray:
    width, height = size
    mask = Image.new("1", size, 0)
    draw = ImageDraw.Draw(mask)
    sx = width / page.width
    sy = height / page.height
    for word in page.words:
        left = max(0, round(word.left * sx) - padding)
        top = max(0, round(word.top * sy) - padding)
        right = min(width, round(word.right * sx) + padding)
        bottom = min(height, round(word.bottom * sy) + padding)
        if right > left and bottom > top:
            draw.rectangle((left, top, right, bottom), fill=1)
    return np.asarray(mask, dtype=bool)


def _row_runs(row: np.ndarray) -> list[tuple[int, int]]:
    padded = np.pad(row.astype(np.int8), (1, 1))
    changes = np.flatnonzero(padded[1:] != padded[:-1])
    return list(zip(changes[0::2].tolist(), changes[1::2].tolist()))


def connected_components(mask: np.ndarray) -> list[Component]:
    """Étiquette les composantes 8-connexes par plages horizontales."""
    parent: list[int] = []
    runs: list[tuple[int, int, int, int]] = []
    previous: list[tuple[int, int, int]] = []

    def find(node: int) -> int:
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def union(first: int, second: int) -> None:
        root_a, root_b = find(first), find(second)
        if root_a != root_b:
            parent[root_b] = root_a

    for y, row in enumerate(mask):
        current: list[tuple[int, int, int]] = []
        for left, right in _row_runs(row):
            run_id = len(parent)
            parent.append(run_id)
            runs.append((y, left, right, run_id))
            current.append((left, right, run_id))
            for old_left, old_right, old_id in previous:
                if old_right < left - 1:
                    continue
                if old_left > right + 1:
                    break
                union(run_id, old_id)
        previous = current

    aggregates: dict[int, list[int]] = {}
    for y, left, right, run_id in runs:
        root = find(run_id)
        if root not in aggregates:
            aggregates[root] = [left, y, right, y + 1, right - left]
            continue
        item = aggregates[root]
        item[0] = min(item[0], left)
        item[1] = min(item[1], y)
        item[2] = max(item[2], right)
        item[3] = max(item[3], y + 1)
        item[4] += right - left
    return [Component(*values) for values in aggregates.values()]


def detect_candidates(image: Image.Image, ocr_page: OcrPage) -> list[Candidate]:
    width, height = image.size
    normalized = normalized_gray(image, blur_radius=min(width, height) * 0.025)
    ink = normalized < 205
    text_mask = make_text_mask(ocr_page, image.size)
    residual = ink & ~text_mask
    edge = max(3, round(min(width, height) * 0.008))
    residual[:edge, :] = False
    residual[-edge:, :] = False
    residual[:, :edge] = False
    residual[:, -edge:] = False

    # Une dilatation courte réunit les hachures d'une gravure sans franchir le
    # blanc qui la sépare normalement des paragraphes voisins.
    dilation_size = max(5, round(min(width, height) * 0.010))
    if dilation_size % 2 == 0:
        dilation_size += 1
    grouped = Image.fromarray((residual * 255).astype(np.uint8)).filter(
        ImageFilter.MaxFilter(dilation_size)
    )
    components = connected_components(np.asarray(grouped) > 0)
    candidates: list[Candidate] = []
    page_area = width * height
    shrink = dilation_size // 2
    margin = max(5, round(min(width, height) * 0.008))

    for component in components:
        left = max(edge, component.left + shrink - margin)
        top = max(edge, component.top + shrink - margin)
        right = min(width - edge, component.right - shrink + margin)
        bottom = min(height - edge, component.bottom - shrink + margin)
        box_width, box_height = right - left, bottom - top
        box_area = box_width * box_height
        if box_width < width * 0.075 or box_height < height * 0.025:
            continue
        if box_area < page_area * 0.0018:
            continue
        if box_width > width * 0.92 and box_height < height * 0.10:
            continue
        residual_ink = int(residual[top:bottom, left:right].sum())
        density = residual_ink / max(1, box_area)
        if residual_ink < 45 or density < 0.004:
            continue
        text_overlap = float(text_mask[top:bottom, left:right].mean())
        if text_overlap > 0.30:
            continue
        score = (
            min(1.0, box_area / (page_area * 0.025)) * 0.45
            + min(1.0, density / 0.06) * 0.35
            + max(0.0, 1.0 - text_overlap / 0.30) * 0.20
        )
        confidence = "high" if score >= 0.78 and text_overlap < 0.12 else "medium"
        candidates.append(
            Candidate(
                box=(left, top, right, bottom),
                score=round(score, 4),
                residual_ink_pixels=residual_ink,
                ink_density=round(density, 6),
                text_overlap_ratio=round(text_overlap, 6),
                confidence=confidence,
            )
        )
    # Une grande figure composite peut contenir une composante déconnectée
    # détectée une seconde fois. On conserve le recadrage englobant lorsque le
    # petit candidat est presque entièrement inclus dans celui-ci.
    retained: list[Candidate] = []
    for candidate in sorted(
        candidates,
        key=lambda item: -(
            (item.box[2] - item.box[0]) * (item.box[3] - item.box[1])
        ),
    ):
        left, top, right, bottom = candidate.box
        area = (right - left) * (bottom - top)
        contained = False
        for existing in retained:
            old_left, old_top, old_right, old_bottom = existing.box
            intersection = max(0, min(right, old_right) - max(left, old_left)) * max(
                0, min(bottom, old_bottom) - max(top, old_top)
            )
            if intersection / max(1, area) >= 0.85:
                contained = True
                break
        if not contained:
            retained.append(candidate)
    retained.sort(key=lambda item: (item.box[1], item.box[0], -item.score))
    return retained


def scale_box(
    box: tuple[int, int, int, int],
    source_size: tuple[int, int],
    target_size: tuple[int, int],
) -> tuple[int, int, int, int]:
    sx = target_size[0] / source_size[0]
    sy = target_size[1] / source_size[1]
    left, top, right, bottom = box
    return (
        max(0, round(left * sx)),
        max(0, round(top * sy)),
        min(target_size[0], round(right * sx)),
        min(target_size[1], round(bottom * sy)),
    )


def mask_competing_candidates(
    raw_crop: Image.Image,
    current: Candidate,
    candidates: list[Candidate],
    analysis_size: tuple[int, int],
    source_size: tuple[int, int],
    source_box: tuple[int, int, int, int],
) -> tuple[Image.Image, np.ndarray, list[dict[str, object]]]:
    values = np.asarray(raw_crop.convert("RGB")).copy()
    forced_background = np.zeros(values.shape[:2], dtype=bool)
    luminance = values.astype(np.float32).mean(axis=2)
    paper_pixels = values[luminance >= np.percentile(luminance, 60)]
    paper_color = np.median(paper_pixels, axis=0).astype(np.uint8) if paper_pixels.size else np.array([255, 255, 255], dtype=np.uint8)
    current_left, current_top, current_right, current_bottom = current.box
    current_area = (current_right - current_left) * (current_bottom - current_top)
    current_center = (
        (current_left + current_right) / 2 * source_size[0] / analysis_size[0],
        (current_top + current_bottom) / 2 * source_size[1] / analysis_size[1],
    )
    masks: list[dict[str, object]] = []
    for other in candidates:
        if other is current:
            continue
        other_left, other_top, other_right, other_bottom = other.box
        sibling_padding = max(5, round(min(analysis_size) * 0.012))
        expanded_other = (
            max(0, other_left - sibling_padding),
            max(0, other_top - sibling_padding),
            min(analysis_size[0], other_right + sibling_padding),
            min(analysis_size[1], other_bottom + sibling_padding),
        )
        intersection = (
            max(current_left, expanded_other[0]),
            max(current_top, expanded_other[1]),
            min(current_right, expanded_other[2]),
            min(current_bottom, expanded_other[3]),
        )
        intersection_area = max(0, intersection[2] - intersection[0]) * max(
            0, intersection[3] - intersection[1]
        )
        other_area = (other_right - other_left) * (other_bottom - other_top)
        if not intersection_area:
            continue
        # Les recouvrements importants sont éditorialement ambigus et restent
        # intacts pour le contrôle. Ici on ne traite que les coins communs dus
        # aux marges rectangulaires de deux figures voisines.
        if intersection_area / current_area > 0.25 or intersection_area / other_area > 0.25:
            continue
        source_intersection = scale_box(intersection, analysis_size, source_size)
        local = (
            max(0, source_intersection[0] - source_box[0]),
            max(0, source_intersection[1] - source_box[1]),
            min(values.shape[1], source_intersection[2] - source_box[0]),
            min(values.shape[0], source_intersection[3] - source_box[1]),
        )
        if local[2] <= local[0] or local[3] <= local[1]:
            continue
        other_center = (
            (other_left + other_right) / 2 * source_size[0] / analysis_size[0],
            (other_top + other_bottom) / 2 * source_size[1] / analysis_size[1],
        )
        absolute_x = np.arange(local[0], local[2], dtype=np.float32) + source_box[0]
        absolute_y = np.arange(local[1], local[3], dtype=np.float32) + source_box[1]
        x_grid, y_grid = np.meshgrid(absolute_x, absolute_y)
        current_distance = (x_grid - current_center[0]) ** 2 + (y_grid - current_center[1]) ** 2
        other_distance = (x_grid - other_center[0]) ** 2 + (y_grid - other_center[1]) ** 2
        if current_area > other_area:
            belongs_to_other = np.ones_like(current_distance, dtype=bool)
            assignment = "smaller_candidate_priority"
        elif current_area < other_area:
            belongs_to_other = np.zeros_like(current_distance, dtype=bool)
            assignment = "smaller_candidate_priority"
        else:
            belongs_to_other = other_distance < current_distance
            assignment = "nearest_candidate_center"
        region = values[local[1] : local[3], local[0] : local[2]]
        region[belongs_to_other] = paper_color
        forced_region = forced_background[local[1] : local[3], local[0] : local[2]]
        forced_region[belongs_to_other] = True
        masks.append({
            "competing_box_analysis_px": list(other.box),
            "competing_box_padding_analysis_px": sibling_padding,
            "intersection_source_px": list(source_intersection),
            "masked_pixels": int(belongs_to_other.sum()),
            "assignment": assignment,
            "fill_rgb": paper_color.tolist(),
        })
    return Image.fromarray(values, mode="RGB"), forced_background, masks


def remove_isolated_speckles(values: np.ndarray, max_area: int) -> tuple[np.ndarray, int]:
    dark = values < 150
    removed = 0
    cleaned = values.copy()
    for component in connected_components(dark):
        if component.area > max_area or component.width > 10 or component.height > 10:
            continue
        pad = 15
        left = max(0, component.left - pad)
        top = max(0, component.top - pad)
        right = min(values.shape[1], component.right + pad)
        bottom = min(values.shape[0], component.bottom + pad)
        neighborhood = dark[top:bottom, left:right].copy()
        neighborhood[
            component.top - top : component.bottom - top,
            component.left - left : component.right - left,
        ] = False
        if neighborhood.any():
            continue
        cleaned[
            component.top : component.bottom,
            component.left : component.right,
        ] = 255
        removed += 1
    return cleaned, removed


def dominant_content_box(values: np.ndarray) -> tuple[int, int, int, int]:
    strong_ink = values < 230
    grouping_size = max(5, round(min(values.shape) * 0.012))
    if grouping_size % 2 == 0:
        grouping_size += 1
    grouped = Image.fromarray((strong_ink * 255).astype(np.uint8)).filter(
        ImageFilter.MaxFilter(grouping_size)
    )
    components = connected_components(np.asarray(grouped) > 0)
    if not components:
        return (0, 0, values.shape[1], values.shape[0])
    dominant = max(components, key=lambda item: item.width * item.height)
    shrink = grouping_size // 2
    margin = max(8, round(min(values.shape) * 0.025))
    box = (
        max(0, dominant.left + shrink - margin),
        max(0, dominant.top + shrink - margin),
        min(values.shape[1], dominant.right - shrink + margin),
        min(values.shape[0], dominant.bottom - shrink + margin),
    )

    # Une légende frôlant le bord du recadrage peut former une seconde petite
    # bande sombre. Un vrai blanc horizontal la sépare de la gravure : on garde
    # le groupe de lignes qui porte le plus d'encre et on s'arrête au milieu du
    # blanc, sans rogner le dernier trait de l'image.
    row_counts = (values < 180).sum(axis=1)
    active_rows = row_counts >= max(3, round(values.shape[1] * 0.001))
    raw_segments: list[tuple[int, int]] = []
    start: int | None = None
    for index, active in enumerate(active_rows.tolist() + [False]):
        if active and start is None:
            start = index
        elif not active and start is not None:
            raw_segments.append((start, index))
            start = None
    segments: list[tuple[int, int]] = []
    for segment in raw_segments:
        if segments and segment[0] - segments[-1][1] <= 3:
            segments[-1] = (segments[-1][0], segment[1])
        else:
            segments.append(segment)
    if segments:
        selected_index = max(
            range(len(segments)),
            key=lambda index: int(row_counts[segments[index][0] : segments[index][1]].sum()),
        )
        selected_top, selected_bottom = segments[selected_index]
        top_limit = 0
        bottom_limit = values.shape[0]
        if selected_index > 0:
            top_limit = (segments[selected_index - 1][1] + selected_top) // 2
        if selected_index + 1 < len(segments):
            bottom_limit = (selected_bottom + segments[selected_index + 1][0]) // 2
        box = (
            box[0],
            max(top_limit, min(box[1], selected_top - margin)),
            box[2],
            min(bottom_limit, max(box[3], selected_bottom + margin)),
        )
    return box


def clean_master(
    raw_crop: Image.Image,
    speckle_area: int,
    forced_background: np.ndarray | None = None,
) -> tuple[Image.Image, dict[str, object]]:
    source_values = np.asarray(ImageOps.grayscale(raw_crop), dtype=np.uint8)
    values, levels = level_stretch(raw_crop, clip_percent=0.5)
    family, classification = classify_illustration_family(values)
    removed = 0
    if forced_background is not None:
        values[forced_background] = 255
    master = Image.fromarray(values, mode="L")
    source_stats = tone_statistics(source_values)
    output_stats = tone_statistics(values)
    source_midtones = source_stats["midtone_60_200_percent"]
    retained = (
        output_stats["midtone_60_200_percent"] / source_midtones * 100.0
        if source_midtones
        else 100.0
    )
    return master, {
        "background_normalization": "none",
        "levels": levels,
        "family": family,
        "family_classification": classification,
        "source_tone_statistics": source_stats,
        "output_tone_statistics": output_stats,
        "midtone_mass_retained_percent": round(retained, 4),
        "minimum_midtone_mass_retained_percent": 55.0,
        "isolated_speckle_max_area_px": 0,
        "isolated_speckles_removed": removed,
        "paper_white_threshold": None,
        "content_trim_box_px": [0, 0, raw_crop.width, raw_crop.height],
        "legacy_speckle_area_argument_ignored": speckle_area,
    }


def save_qa(raw: Image.Image, master: Image.Image, web: Image.Image, output: Path) -> None:
    panels: list[tuple[str, Image.Image]] = []
    for label, image in (("Découpe source", raw), ("Master PNG", master), ("WebP site", web)):
        panel = image.convert("RGB")
        panel, _parameters = resize_for_web(panel, 680)
        panels.append((label, panel))
    panel_width = max(image.width for _label, image in panels) + 40
    panel_height = max(image.height for _label, image in panels) + 70
    sheet = Image.new("RGB", (panel_width * len(panels), panel_height), "white")
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate(panels):
        x = index * panel_width + (panel_width - image.width) // 2
        sheet.paste(image, (x, 42))
        draw.text((index * panel_width + 18, 16), label, fill="black")
    sheet.save(output, format="JPEG", quality=92, optimize=True)


def file_record(
    path: Path,
    role: str,
    mime_type: str,
    source_sha256: str,
    dpi: int | None,
    public: bool,
    parameters: dict[str, object],
) -> dict[str, object]:
    with Image.open(path) as image:
        width, height = image.size
        color_space = "gray" if image.mode in ("1", "L", "I;16") else "srgb"
        bit_depth = 16 if image.mode == "I;16" else 8
    return {
        "variant_role": role,
        "path": str(path),
        "mime_type": mime_type,
        "width_px": width,
        "height_px": height,
        "byte_size": path.stat().st_size,
        "sha256": sha256_file(path),
        "source_sha256": source_sha256,
        "color_space": color_space,
        "bit_depth": bit_depth,
        "dpi_x": dpi,
        "dpi_y": dpi,
        "processing_profile": PROFILE_CODE,
        "processing_version": PROFILE_VERSION,
        "processing_parameters": parameters,
        "validation_status": "review",
        "is_public": public,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", required=True, type=Path)
    parser.add_argument("--ocr", required=True, type=Path, help="XML DjVu OCR du même volume")
    parser.add_argument("--page", required=True, type=int, help="Index de page PDF, à partir de 1")
    parser.add_argument("--volume-code", required=True, help="Ex. t07")
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--pdftoppm")
    parser.add_argument("--analysis-dpi", type=int, default=DEFAULT_ANALYSIS_DPI)
    parser.add_argument("--source-dpi", type=int, default=DEFAULT_SOURCE_DPI)
    parser.add_argument("--web-max-px", type=int, default=DEFAULT_WEB_MAX_PX)
    parser.add_argument("--web-quality", type=int, default=DEFAULT_WEB_QUALITY)
    parser.add_argument("--speckle-area", type=int, default=DEFAULT_SPECKLE_AREA)
    parser.add_argument("--max-candidates", type=int, default=12)
    return parser


def process(args: argparse.Namespace) -> dict[str, object]:
    if args.page < 1:
        raise ValueError("--page commence à 1")
    for source in (args.pdf, args.ocr):
        if not source.is_file():
            raise FileNotFoundError(source)
    pdftoppm = locate_pdftoppm(args.pdftoppm)
    args.output.mkdir(parents=True, exist_ok=True)
    ocr_page = read_ocr_page(args.ocr, args.page)
    pdf_sha256 = sha256_file(args.pdf)

    with tempfile.TemporaryDirectory(prefix="fillion-illustration-") as temporary:
        temp = Path(temporary)
        analysis_path = temp / "analysis.png"
        source_path = temp / "source.png"
        render_pdf_page(pdftoppm, args.pdf, args.page, args.analysis_dpi, analysis_path)
        render_pdf_page(pdftoppm, args.pdf, args.page, args.source_dpi, source_path)
        analysis = Image.open(analysis_path).convert("RGB")
        source = Image.open(source_path).convert("RGB")
        detected = detect_candidates(analysis, ocr_page)[: args.max_candidates]
        if not detected:
            raise RuntimeError("Aucune illustration candidate détectée sur cette page.")

        detection_qa_path = args.output / f"page-{args.page:04d}-detection.jpg"
        detection_qa = analysis.copy()
        detection_draw = ImageDraw.Draw(detection_qa)
        for index, candidate in enumerate(detected, start=1):
            detection_draw.rectangle(candidate.box, outline="#b42318", width=4)
            detection_draw.text(
                (candidate.box[0] + 5, candidate.box[1] + 5),
                str(index),
                fill="#b42318",
            )
        detection_qa.save(detection_qa_path, format="JPEG", quality=92, optimize=True)

        assets: list[dict[str, object]] = []
        for index, candidate in enumerate(detected, start=1):
            asset_key = f"fillion-{args.volume_code}-p{args.page:04d}-i{index:02d}"
            asset_dir = args.output / asset_key
            asset_dir.mkdir(parents=True, exist_ok=True)
            source_box = scale_box(candidate.box, analysis.size, source.size)
            raw_crop = source.crop(source_box)
            working_crop, forced_background, competing_masks = mask_competing_candidates(
                raw_crop,
                candidate,
                detected,
                analysis.size,
                source.size,
                source_box,
            )
            auto_rotation_degrees = automatic_rotation_degrees(
                candidate,
                ocr_page,
                analysis.size,
            )
            raw_crop = rotate_clockwise_if_needed(raw_crop, auto_rotation_degrees)
            working_crop = rotate_clockwise_if_needed(working_crop, auto_rotation_degrees)
            if forced_background is not None and auto_rotation_degrees == -90:
                forced_background = np.rot90(forced_background, k=-1)
            master, cleanup = clean_master(
                working_crop,
                args.speckle_area,
                forced_background=forced_background,
            )
            master_path = asset_dir / "master.png"
            master.save(
                master_path,
                format="PNG",
                optimize=True,
                compress_level=9,
                dpi=(args.source_dpi, args.source_dpi),
            )
            web, web_resize = resize_for_web(master, args.web_max_px)
            web_path = asset_dir / "web.webp"
            web.save(
                web_path,
                format="WEBP",
                quality=args.web_quality,
                method=6,
                exact=True,
            )
            qa_path = asset_dir / "qa.jpg"
            save_qa(raw_crop, master, web, qa_path)

            crop_metadata = {
                "coordinate_space": "rendered_source_page_px",
                "page_width_px": source.width,
                "page_height_px": source.height,
                "left": source_box[0],
                "top": source_box[1],
                "right": source_box[2],
                "bottom": source_box[3],
                "normalized": [
                    round(source_box[0] / source.width, 8),
                    round(source_box[1] / source.height, 8),
                    round(source_box[2] / source.width, 8),
                    round(source_box[3] / source.height, 8),
                ],
            }
            common_parameters = {
                "analysis_dpi": args.analysis_dpi,
                "source_dpi": args.source_dpi,
                "source_crop_box": crop_metadata,
                "competing_candidate_masks": competing_masks,
                "auto_rotation_degrees": auto_rotation_degrees,
                "auto_rotation_rule": (
                    "full_page_no_ocr_clockwise"
                    if auto_rotation_degrees
                    else "none"
                ),
                **cleanup,
            }
            files = [
                file_record(
                    master_path,
                    "master",
                    "image/png",
                    pdf_sha256,
                    args.source_dpi,
                    False,
                    common_parameters,
                ),
                file_record(
                    web_path,
                    "web",
                    "image/webp",
                    pdf_sha256,
                    None,
                    False,
                    {
                        **common_parameters,
                        "web_max_px": args.web_max_px,
                        "web_quality": args.web_quality,
                        **web_resize,
                    },
                ),
            ]
            manifest = {
                "schema_version": 1,
                "asset_key": asset_key,
                "asset_kind": "illustration",
                "source": {
                    "pdf": str(args.pdf.resolve()),
                    "pdf_sha256": pdf_sha256,
                    "ocr_xml": str(args.ocr.resolve()),
                    "page_index": args.page,
                    "source_dpi": args.source_dpi,
                    "crop_box": crop_metadata,
                },
                "detection": {
                    "automatic": True,
                    "profile": PROFILE_CODE,
                    "version": PROFILE_VERSION,
                    **asdict(candidate),
                },
                "illustration_family": cleanup["family"],
                "quality_controls": {
                    "midtone_mass_retained_percent": cleanup[
                        "midtone_mass_retained_percent"
                    ],
                    "midtone_mass_minimum_percent": 55.0,
                    "halftone_pure_white_percent": (
                        cleanup["output_tone_statistics"]["pure_white_percent"]
                        if cleanup["family"] == "halftone"
                        else None
                    ),
                    "halftone_pure_white_maximum_percent": 2.0,
                    "family_declared": True,
                    "printed_frame_preserved": None,
                },
                "files": files,
                "qa_path": str(qa_path),
                "validation_status": "review",
                "requires_review": True,
            }
            manifest_path = asset_dir / "manifest.json"
            manifest_path.write_text(
                json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            assets.append(manifest)

    page_manifest = {
        "schema_version": 1,
        "profile": PROFILE_CODE,
        "profile_version": PROFILE_VERSION,
        "page_index": args.page,
        "candidate_count": len(assets),
        "detection_qa_path": str(detection_qa_path),
        "assets": assets,
    }
    page_manifest_path = args.output / f"page-{args.page:04d}-manifest.json"
    page_manifest_path.write_text(
        json.dumps(page_manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return page_manifest


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    result = process(args)
    print(
        f"{result['candidate_count']} illustration(s) candidate(s) produite(s) "
        f"avec {PROFILE_CODE} {PROFILE_VERSION}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
