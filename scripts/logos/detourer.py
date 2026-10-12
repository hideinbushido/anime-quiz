"""Détoure un personnage posé sur fond blanc.

Usage : python detourer.py <entree> <sortie.png> [--seuil 244] [--trous 600] [--bords haut,gauche,droite]

Le fond est la zone presque blanche reliée aux bords indiqués. Les « trous »
(zones blanches enfermées, entre un bras et le corps par exemple) sont aussi
retirés quand ils dépassent la surface donnée ; les petits blancs du dessin
(dents, reflets) restent en place.
"""
import argparse
import cv2
import numpy as np

p = argparse.ArgumentParser()
p.add_argument("entree")
p.add_argument("sortie")
p.add_argument("--seuil", type=int, default=244)
p.add_argument("--trous", type=int, default=600, help="surface minimale d'un trou blanc à retirer ; 0 = ne retirer aucun trou")
p.add_argument("--bords", default="haut,gauche,droite")
p.add_argument("--rogne", type=int, default=2, help="pixels retirés sur le contour, pour effacer le liseré clair")
a = p.parse_args()

img = cv2.imread(a.entree, cv2.IMREAD_COLOR)
h, w = img.shape[:2]
blanc = (img.min(axis=2) >= a.seuil).astype(np.uint8)
n, labels, stats, _ = cv2.connectedComponentsWithStats(blanc, 8)

bords = set(a.bords.split(","))
touche = set()
if "haut" in bords: touche |= set(labels[0, :])
if "bas" in bords: touche |= set(labels[h - 1, :])
if "gauche" in bords: touche |= set(labels[:, 0])
if "droite" in bords: touche |= set(labels[:, w - 1])
touche.discard(0)

fond = np.zeros((h, w), bool)
for i in range(1, n):
    if i in touche or (a.trous and stats[i, cv2.CC_STAT_AREA] >= a.trous):
        fond |= labels == i

# Le JPEG laisse un liseré clair autour du trait : on rogne le contour, puis on l'adoucit
masque = (~fond).astype(np.uint8) * 255
masque = cv2.erode(masque, np.ones((3, 3), np.uint8), iterations=a.rogne)
masque = cv2.GaussianBlur(masque, (0, 0), 0.9)

# Recadrage serré sur le personnage
ys, xs = np.where(masque > 8)
y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
rgba = np.dstack([img, masque])[y0:y1, x0:x1]
cv2.imwrite(a.sortie, rgba)
print(f"{a.sortie} : {x1 - x0}x{y1 - y0}, fond retiré sur {fond.mean() * 100:.0f} % de l'image")
