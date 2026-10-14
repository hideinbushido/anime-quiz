"""Fabrique la bande-son des règles d'Anya : les sons du présentateur, posés sur les scènes.

- le jingle Family Feud ouvre la vidéo et la referme ;
- un fond léger, synthétisé ici, porte les scènes de règles ;
- « bonne réponse » quand la case se retourne, « faaah » sur le premier strike ;
- huit notes qui montent quand les valeurs tombent.

Usage : python scripts/bande-son.py   (depuis le dossier de la vidéo)
"""
import subprocess
import numpy as np

SR = 44100
DUREE = 33.0
rng = np.random.default_rng(11)
n = int(DUREE * SR)
t = np.arange(n) / SR


def lire(chemin):
    brut = subprocess.run(["ffmpeg", "-v", "error", "-i", chemin, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                          capture_output=True, check=True).stdout
    son = np.frombuffer(brut, dtype=np.float32).astype(np.float64)
    return son / max(1e-6, np.abs(son).max())


def temps(d):
    return np.arange(int(d * SR)) / SR


def souffle(d=0.9):
    """Le passage de la coupe d'or : un bruit qui s'ouvre puis se referme."""
    x = temps(d); bruit = rng.standard_normal(len(x))
    ouverture = np.sin(np.pi * x / d) ** 2
    out = np.zeros(len(x)); y = 0.0
    for i in range(len(x)):
        a = 0.02 + 0.45 * ouverture[i]
        y += a * (bruit[i] - y); out[i] = y
    return out * ouverture * 0.9


def impact(d=0.7, grave=110.0):
    """Un tampon qui tombe : un coup sourd et un claquement bref."""
    x = temps(d)
    f = 38 + (grave - 38) * np.exp(-x * 18)
    corps = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 7)
    clac = rng.standard_normal(len(x)) * np.exp(-x * 90) * 0.5
    return corps * 0.95 + clac


def note(freq, d=0.3):
    x = temps(d)
    return (np.sin(2 * np.pi * freq * x) + 0.35 * np.sin(4 * np.pi * freq * x)) * np.exp(-x * 11) * 0.55


def pop(d=0.18):
    """La bulle de parole qui s'ouvre."""
    x = temps(d)
    f = 300 + 900 * x / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 22) * 0.6


# Le fond : quatre accords tenus (fa, ré mineur, si bémol, do), une pulsation douce à 100 BPM
ACCORDS = [(174.61, 220.0, 261.63), (146.83, 174.61, 220.0), (116.54, 146.83, 174.61), (130.81, 164.81, 196.0)]
fond = np.zeros(n)
debut, fin = 4.2, 29.0
mesure = 2.4
for k in range(int((fin - debut) / mesure) + 1):
    a = debut + k * mesure
    i = int(a * SR); d = min(mesure + 0.4, DUREE - a)
    if d <= 0:
        break
    x = temps(d)
    env = np.minimum(1, x / 0.3) * np.minimum(1, (d - x) / 0.4)
    accord = sum(np.sin(2 * np.pi * f * x) + 0.3 * np.sin(4 * np.pi * f * x + 0.5) for f in ACCORDS[k % 4]) / 3
    fond[i:i + len(x)] += accord * env * 0.16
battement = 60 / 100
for k in range(int((fin - debut) / battement)):
    a = debut + k * battement
    i = int(a * SR); x = temps(0.25)
    coup = np.sin(2 * np.pi * (50 + 60 * np.exp(-x * 30)) * x) * np.exp(-x * 14)
    fond[i:i + len(x)] += coup * (0.32 if k % 2 == 0 else 0.18)
fond *= np.clip((t - debut) / 0.8, 0, 1) * np.clip((fin + 0.6 - t) / 0.8, 0, 1)

mix = fond.copy()


def poser(son, a, volume=1.0):
    i = int(a * SR); son = son[: n - i]
    mix[i:i + len(son)] += son * volume


jingle = lire("assets/sting.mp3")
bonne = lire("assets/bonne-reponse.mp3")
faaah = lire("assets/faaah.mp3")

poser(jingle, 0.0, 0.55)                       # le titre
for coupe in (4, 10, 16, 23, 29):
    poser(souffle(), coupe - 0.45, 0.45)
poser(impact(), 0.5, 0.45)                     # le logo tombe
poser(pop(), 12.0, 0.6)                        # « Luffy ! »
poser(impact(grave=140), 13.5, 0.5)            # « À la main »
poser(bonne, 17.5, 0.6)                        # la case se retourne
poser(faaah, 19.6, 0.65)                       # premier strike
poser(impact(grave=95), 20.45, 0.5)
poser(impact(grave=85), 21.3, 0.5)
poser(impact(grave=70), 21.9, 0.6)             # hors manche
for k, freq in enumerate((392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99)):
    poser(note(freq), 24.48 + 0.42 * k, 0.6)   # les huit valeurs, de la moins citée à la plus citée
poser(jingle, 29.2, 0.55)                      # la fin
poser(impact(grave=120), 29.22, 0.5)

mix *= np.clip((DUREE - t) / 1.2, 0, 1)
mix = np.tanh(mix * 1.2) / np.tanh(1.2) * 0.89
stereo = np.repeat(mix[:, None], 2, axis=1)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-c:a", "libmp3lame", "-b:a", "256k", "assets/bande-son.mp3"], input=stereo.astype(np.float32).tobytes(), check=True)
print("assets/bande-son.mp3", DUREE, "s")
