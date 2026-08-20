#!/usr/bin/env python3
"""Valide les manifests et dérivés produits par process_illustrations.py."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_page_manifest(path: Path) -> list[str]:
    errors: list[str] = []
    page = json.loads(path.read_text(encoding="utf-8"))
    assets = page.get("assets", [])
    if page.get("candidate_count") != len(assets):
        errors.append(f"{path}: candidate_count incohérent")
    detection_qa = Path(page.get("detection_qa_path", ""))
    if not detection_qa.is_file():
        errors.append(f"{path}: planche de détection absente ({detection_qa})")

    for asset in assets:
        asset_key = asset.get("asset_key", "asset-inconnu")
        files = {item.get("variant_role"): item for item in asset.get("files", [])}
        if set(files) != {"master", "web"}:
            errors.append(f"{path}: {asset_key} doit posséder exactement master et web")
            continue
        if asset.get("validation_status") != "review" or asset.get("requires_review") is not True:
            errors.append(f"{path}: {asset_key} ne doit pas être autovalidé")
        dimensions: dict[str, tuple[int, int]] = {}
        for role, record in files.items():
            file_path = Path(record.get("path", ""))
            if not file_path.is_file():
                errors.append(f"{path}: fichier absent {file_path}")
                continue
            if file_path.stat().st_size != record.get("byte_size"):
                errors.append(f"{file_path}: poids différent du manifeste")
            if sha256_file(file_path) != record.get("sha256"):
                errors.append(f"{file_path}: SHA-256 différent du manifeste")
            with Image.open(file_path) as image:
                dimensions[role] = image.size
            if list(dimensions[role]) != [record.get("width_px"), record.get("height_px")]:
                errors.append(f"{file_path}: dimensions différentes du manifeste")
            if role == "master":
                if record.get("mime_type") != "image/png" or record.get("is_public") is not False:
                    errors.append(f"{file_path}: master non privé ou non PNG")
            elif role == "web":
                if record.get("mime_type") != "image/webp" or max(dimensions[role]) > 1600:
                    errors.append(f"{file_path}: dérivé web non WebP ou supérieur à 1 600 px")
        if set(dimensions) == {"master", "web"}:
            master_ratio = dimensions["master"][0] / dimensions["master"][1]
            web_ratio = dimensions["web"][0] / dimensions["web"][1]
            if abs(master_ratio - web_ratio) > 0.003:
                errors.append(f"{path}: {asset_key} change de proportions entre master et web")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("roots", nargs="+", type=Path)
    args = parser.parse_args()
    manifests: set[Path] = set()
    for root in args.roots:
        if root.is_file() and root.name.startswith("page-") and root.name.endswith("-manifest.json"):
            manifests.add(root.resolve())
        elif root.is_dir():
            manifests.update(path.resolve() for path in root.rglob("page-*-manifest.json"))
    if not manifests:
        raise SystemExit("Aucun manifeste de page trouvé.")
    ordered_manifests = sorted(manifests)
    errors = [error for manifest in ordered_manifests for error in validate_page_manifest(manifest)]
    if errors:
        print("\n".join(errors))
        return 1
    print(f"{len(ordered_manifests)} manifeste(s) de page et tous leurs dérivés sont cohérents.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
