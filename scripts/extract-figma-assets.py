"""
Extrai as ilustracoes dos NFTs a partir dos frames exportados do Figma (design/*.png)
e gera WebP otimizados em public/images/nft.

Uso: python scripts/extract-figma-assets.py   (requer Pillow)

Para cada personagem sao geradas 3 imagens da galeria:
  <nome>.webp    retrato completo
  <nome>-2.webp  detalhe do rosto (recorte ampliado)
  <nome>-3.webp  versao espelhada
"""
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DESIGN = ROOT / "design"
OUT = ROOT / "public" / "images" / "nft"
SIZE = 480

# (arquivo de origem, caixa de recorte em pixels do frame de 1440 px)
SOURCES = {
    "emerald": ("home-desktop.png", (884, 115, 1305, 536)),
    "nomad": ("login-desktop.png", (518, 1080, 718, 1280)),
    "baron": ("login-desktop.png", (1083, 1086, 1309, 1312)),
    "golden": ("login-desktop.png", (792, 1086, 1018, 1312)),
}


def save(img: Image.Image, name: str) -> None:
    img.resize((SIZE, SIZE), Image.LANCZOS).save(OUT / f"{name}.webp", "WEBP", quality=82, method=6)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (file, box) in SOURCES.items():
        img = Image.open(DESIGN / file).convert("RGB").crop(box)
        w, h = img.size
        save(img, name)
        save(img.crop((int(w * 0.15), int(h * 0.05), int(w * 0.85), int(h * 0.75))), f"{name}-2")
        save(ImageOps.mirror(img), f"{name}-3")
        print(f"{name}: ok")


if __name__ == "__main__":
    main()
