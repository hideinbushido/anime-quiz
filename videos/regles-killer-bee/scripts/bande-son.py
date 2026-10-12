"""Fabrique la bande-son du pilote : l'instru calée sur les scènes + les bruitages.

L'instru est à 120 BPM, son premier temps tombe à 0,17 s : on la fait partir de là,
si bien que chaque temps tombe sur une demi-seconde de la vidéo et chaque mesure
sur un nombre pair de secondes — là où changent les scènes.
Les bruitages sont synthétisés ici, sans fichier extérieur.

Usage : python scripts/bande-son.py "<instru.mp3>"   (depuis le dossier de la vidéo)
"""
import subprocess, sys
import numpy as np

SR = 44100
DUREE = 32.0
PREMIER_TEMPS = 0.17
rng = np.random.default_rng(7)

def temps(d):
    return np.arange(int(d * SR)) / SR

def souffle(d=0.9):
    """Le passage de la coupe d'or : un bruit qui s'ouvre puis se referme."""
    t = temps(d); bruit = rng.standard_normal(len(t))
    ouverture = np.sin(np.pi * t / d) ** 2
    out = np.zeros(len(t)); y = 0.0
    for i in range(len(t)):
        a = 0.02 + 0.45 * ouverture[i]
        y += a * (bruit[i] - y); out[i] = y
    return out * ouverture * 0.9

def impact(d=0.7, grave=110.0):
    """Un sceau qui tombe : un coup sourd et un claquement bref."""
    t = temps(d)
    f = 38 + (grave - 38) * np.exp(-t * 18)
    corps = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    clac = rng.standard_normal(len(t)) * np.exp(-t * 90) * 0.5
    return corps * 0.95 + clac

def buzzer(d=0.55):
    t = temps(d)
    onde = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (146.0, 149.5, 293.0)) / 3
    env = np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.06)
    return onde * env * 0.55

def note(freq, d=0.22):
    t = temps(d)
    return (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t)) * np.exp(-t * 16) * 0.5

def cymbale(d=1.6):
    t = temps(d); bruit = rng.standard_normal(len(t))
    aigu = np.diff(bruit, prepend=0)
    return aigu * np.exp(-t * 3.2) * 0.22

brut = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(PREMIER_TEMPS), "-t", str(DUREE), "-i", sys.argv[1],
                       "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
instru = np.frombuffer(brut, dtype=np.float32).reshape(-1, 2).astype(np.float64)
n = int(DUREE * SR)
instru = np.pad(instru, ((0, max(0, n - len(instru))), (0, 0)))[:n]
instru *= 0.7 / np.abs(instru).max()

# L'instru joue d'un bout à l'autre, sans coupure : seul un fondu la referme à la fin
t = np.arange(n) / SR
gain = np.clip((DUREE - t) / 1.6, 0, 1)
mix = instru * gain[:, None]

def poser(son, a, volume=1.0):
    i = int(a * SR); son = son[: n - i]
    mix[i : i + len(son)] += (son * volume * 0.6)[:, None]

for coupe in (4, 10, 16, 22, 28):
    poser(souffle(), coupe - 0.45, 0.8)
poser(impact(), 0.5, 0.9)            # le logo tombe
poser(buzzer(), 12.0, 0.9)           # le Joueur 1 buzze
poser(impact(grave=140), 17.5, 0.9)  # VRAI
poser(impact(grave=90), 18.5, 0.9)   # FAUX
for k, freq in enumerate((523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 1046.5)):
    poser(note(freq), 23.0 + 0.25 * k, 0.8)   # les sept valeurs, une par demi-temps
poser(impact(grave=120), 28.5, 1.0)  # le sceau final
poser(cymbale(), 28.5, 1.0)

mix = np.tanh(mix * 1.1) / np.tanh(1.1) * 0.89
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-c:a", "libmp3lame", "-b:a", "256k", "assets/bande-son.mp3"], input=mix.astype(np.float32).tobytes(), check=True)
print("assets/bande-son.mp3", DUREE, "s")
