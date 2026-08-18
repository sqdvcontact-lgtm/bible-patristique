#!/usr/bin/env bash
# La Gueule — installation des moteurs OCR/HTR dans Ubuntu (WSL2).
# À lancer UNE FOIS, en root : les binaires sont exposés sur le PATH de tous les
# utilisateurs, pour que La Gueule (côté Windows) les appelle via `wsl -e kraken …`.
#
#   wsl -u root -e bash /mnt/c/Corpus\ Scriptura/bible-patristique/outils/la-gueule/scripts/installer-wsl.sh
#
# Rien ici ne modifie le corpus ni Windows : uniquement l'environnement Linux.

set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "== 1. Paquets système (Python, Tesseract, poppler, ImageMagick) =="
apt-get update -y
apt-get install -y --no-install-recommends \
  python3 python3-venv python3-pip \
  tesseract-ocr tesseract-ocr-fra tesseract-ocr-lat \
  poppler-utils imagemagick ca-certificates curl git

echo "== 2. Kraken (moteur HTR/OCR) dans un venv partagé /opt/la-gueule/venv =="
python3 -m venv /opt/la-gueule/venv
/opt/la-gueule/venv/bin/pip install --upgrade pip wheel
# Kraken tire PyTorch (CPU) : le téléchargement peut être long la première fois.
/opt/la-gueule/venv/bin/pip install kraken

echo "== 3. Exposer kraken / ketos sur le PATH global =="
ln -sf /opt/la-gueule/venv/bin/kraken /usr/local/bin/kraken
ln -sf /opt/la-gueule/venv/bin/ketos  /usr/local/bin/ketos

echo "== 4. Vérifications =="
kraken --version || true
ketos --version || true
tesseract --version | head -1 || true
pdfimages -v 2>&1 | head -1 || true

echo
echo "OK. Étape suivante (modèle de reconnaissance) :"
echo "  kraken list                 # modèles publics disponibles"
echo "  kraken get <identifiant>    # télécharge un modèle .mlmodel"
echo "On choisira ensemble un modèle adapté à l'écriture du témoin."
