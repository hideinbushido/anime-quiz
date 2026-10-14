"""Fabrique la bande-son des règles d'Anya, sans fichier extérieur sauf les deux bruitages du présentateur.

- un petit jazz d'espion, synthétisé ici : contrebasse qui marche, balais, accords de vibraphone ;
- des scintillements de télépathie sur les transitions ;
- « bonne réponse » quand la case est trouvée, « faaah » sur le premier strike ;
- huit notes qui montent quand les points tombent.

Usage : python scripts/bande-son.py   (depuis le dossier de la vidéo)
"""
import subprocess
import numpy as np

SR = 44100
DUREE = 33.0
TEMPO = 126
rng = np.random.default_rng(5)
n = int(DUREE * SR)
t = np.arange(n) / SR
mix = np.zeros(n)


def lire(chemin):
    brut = subprocess.run(["ffmpeg", "-v", "error", "-i", chemin, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                          capture_output=True, check=True).stdout
    son = np.frombuffer(brut, dtype=np.float32).astype(np.float64)
    return son / max(1e-6, np.abs(son).max())


def temps(d):
    return np.arange(int(d * SR)) / SR


def poser(son, a, volume=1.0):
    i = int(a * SR)
    if i >= n:
        return
    son = son[: n - i]
    mix[i:i + len(son)] += son * volume


def contrebasse(freq, d):
    x = temps(d)
    corde = np.sin(2 * np.pi * freq * x) + 0.45 * np.sin(4 * np.pi * freq * x) + 0.15 * np.sin(6 * np.pi * freq * x)
    return corde * np.exp(-x * 5.5) * np.minimum(1, x / 0.006)


def balai(d=0.18, fort=1.0):
    x = temps(d)
    bruit = np.diff(rng.standard_normal(len(x)), prepend=0)
    return bruit * np.exp(-x * 26) * 0.18 * fort


def vibraphone(freqs, d=1.6):
    x = temps(d)
    tremolo = 1 + 0.25 * np.sin(2 * np.pi * 5.5 * x)
    son = sum(np.sin(2 * np.pi * f * x) + 0.2 * np.sin(2 * np.pi * 4 * f * x) * np.exp(-x * 8) for f in freqs) / len(freqs)
    return son * np.exp(-x * 2.2) * tremolo * 0.5


def scintillement(base=1046.5, d=0.9):
    """La télépathie : des notes aiguës qui montent en cascade."""
    out = np.zeros(int(d * SR))
    for k, ratio in enumerate((1, 1.25, 1.5, 2, 2.5, 3)):
        x = temps(d - k * 0.06)
        note = np.sin(2 * np.pi * base * ratio * x) * np.exp(-x * 9) * 0.22
        i = int(k * 0.06 * SR)
        note = note[: len(out) - i]
        out[i:i + len(note)] += note
    return out


def coup_sourd(d=0.5, grave=90.0):
    """Un tampon qui s'écrase sur le papier."""
    x = temps(d)
    f = 40 + (grave - 40) * np.exp(-x * 20)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 9) + rng.standard_normal(len(x)) * np.exp(-x * 70) * 0.4


def note(freq, d=0.35):
    x = temps(d)
    return (np.sin(2 * np.pi * freq * x) + 0.3 * np.sin(4 * np.pi * freq * x)) * np.exp(-x * 9) * 0.5


def pop(d=0.16):
    x = temps(d)
    return np.sin(2 * np.pi * np.cumsum(300 + 1100 * x / d) / SR) * np.exp(-x * 20) * 0.5


# ── Le jazz d'espion : de 0,4 s à 32 s, en ré mineur, avec un pont sur les règles
noire = 60 / TEMPO
LIGNE = [  # une mesure = quatre noires, la contrebasse marche
    (73.42, 87.31, 98.0, 110.0), (116.54, 110.0, 98.0, 87.31),
    (73.42, 82.41, 87.31, 103.83), (110.0, 103.83, 98.0, 92.5),
]
ACCORDS = [(293.66, 349.23, 440.0, 523.25), (233.08, 293.66, 349.23, 440.0), (293.66, 349.23, 440.0, 523.25), (220.0, 277.18, 329.63, 392.0)]
debut, fin = 0.4, 31.8
temps_total = int((fin - debut) / noire)
for k in range(temps_total):
    a = debut + k * noire
    mesure, temps_dans = divmod(k, 4)
    poser(contrebasse(LIGNE[mesure % 4][temps_dans], noire * 1.1), a, 0.55)
    # Les balais en swing : sur le temps, et une croche « en retard » sur les temps 2 et 4
    poser(balai(fort=1.0 if temps_dans % 2 else 0.6), a, 1.0)
    if temps_dans % 2:
        poser(balai(fort=0.5), a + noire * 0.66, 1.0)
    if temps_dans == 0 and mesure % 2 == 0:
        poser(vibraphone(ACCORDS[(mesure // 2) % 4]), a + noire * 0.66, 0.28)
mix *= np.clip((t - debut) / 0.4, 0, 1) * np.clip((fin - t) / 1.5, 0, 1)

bonne = lire("assets/bonne-reponse.mp3")
faaah = lire("assets/faaah.mp3")

poser(scintillement(), 0.15, 0.9)                 # la photo d'Anya tombe
poser(coup_sourd(), 0.7, 0.35)                    # le tampon « top secret »
for coupe in (4, 10, 16, 23, 29):
    poser(scintillement(1318.5, 0.7), coupe - 0.42, 0.7)   # la vague de télépathie
for regle in (4, 10, 16, 23):
    poser(coup_sourd(grave=110), regle + 0.6, 0.3)          # le tampon « Règle n° »
poser(pop(), 11.6, 0.6)                           # « Luffy ! »
poser(note(784.0, 0.5), 13.2, 0.5)                # « À toi ! »
poser(bonne, 17.5, 0.6)                           # la réponse est trouvée
poser(faaah, 19.6, 0.65)                          # premier strike
poser(coup_sourd(grave=85), 20.4, 0.5)
poser(coup_sourd(grave=75), 21.2, 0.5)
poser(coup_sourd(grave=65), 22.0, 0.6)            # hors manche
for k, freq in enumerate((392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 739.99, 783.99)):
    poser(note(freq), 24.5 + 0.4 * k, 0.6)        # les huit points, du plus petit au plus gros
poser(coup_sourd(grave=100), 27.9, 0.4)
poser(scintillement(1046.5, 1.4), 29.5, 1.0)      # trop génial
poser(vibraphone((587.33, 698.46, 880.0, 1046.5), 3.0), 30.0, 0.5)

mix *= np.clip((DUREE - t) / 1.2, 0, 1)
mix = np.tanh(mix * 1.3) / np.tanh(1.3) * 0.89
stereo = np.repeat(mix[:, None], 2, axis=1)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-c:a", "libmp3lame", "-b:a", "256k", "assets/bande-son.mp3"], input=stereo.astype(np.float32).tobytes(), check=True)
print("assets/bande-son.mp3", DUREE, "s")
