"""Extrai uma paleta PROPOSTA da logo real (somente leitura do arquivo original).

Uso: python3 -I extract_palette.py "<caminho>/Logo moderna Savana 1.png" [k]

Ignora pixels transparentes e quase brancos/pretos de fundo, agrupa as cores
por k-means simples e imprime HEX, participação (%) e luminância relativa.
O resultado é uma proposta para recalibrar o motor de preview, não uma
declaração de cores oficiais da marca.
"""

import sys

import numpy as np
from PIL import Image


def relative_luminance(rgb):
    c = np.array(rgb, dtype=float) / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return float(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])


def main(path, k=6):
    img = Image.open(path).convert("RGBA")
    print(f"arquivo: {path}  tamanho: {img.width}x{img.height}")
    px = np.asarray(img).reshape(-1, 4).astype(float)
    px = px[px[:, 3] > 200][:, :3]
    if len(px) == 0:
        sys.exit("nenhum pixel opaco encontrado")
    rng = np.random.default_rng(0)
    if len(px) > 60000:
        px = px[rng.choice(len(px), 60000, replace=False)]
    centers = px[rng.choice(len(px), k, replace=False)]
    for _ in range(30):
        labels = np.argmin(((px[:, None, :] - centers[None]) ** 2).sum(-1), axis=1)
        centers = np.array(
            [px[labels == i].mean(0) if np.any(labels == i) else centers[i] for i in range(k)]
        )
    counts = np.bincount(labels, minlength=k) / len(labels)
    for i in np.argsort(-counts):
        rgb = tuple(int(round(v)) for v in centers[i])
        print(f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}  {counts[i] * 100:5.1f}%  L={relative_luminance(rgb):.3f}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 6)
