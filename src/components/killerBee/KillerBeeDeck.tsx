import { useEffect, useRef, type RefObject } from "react";

// Gyuki, the Eight-Tails: one tail per frequency band.
const TAILS = 8;
const BAND_EDGES = [1, 2, 4, 7, 12, 22, 40, 74, 140];
const TURN = Math.PI * 2;
const RPM_33 = 200; // degrees per second

type CapturableAudio = HTMLAudioElement & { captureStream?: () => MediaStream };

/**
 * Reads the excerpt's spectrum from a capture of the element, so playback itself is never
 * rerouted through Web Audio. Browsers without captureStream get the synthetic groove.
 */
function tapSpectrum(element: HTMLAudioElement) {
  let context: AudioContext | undefined;
  let analyser: AnalyserNode | undefined;
  let source: MediaStreamAudioSourceNode | undefined;
  let tappedSrc = "";
  let bins = new Uint8Array(0);
  const tap = () => {
    const capture = (element as CapturableAudio).captureStream;
    if (!capture || tappedSrc === element.currentSrc) return;
    try {
      const stream = capture.call(element);
      if (!stream.getAudioTracks().length) return;
      context ??= new AudioContext();
      if (!analyser) {
        analyser = context.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.72;
        analyser.maxDecibels = -14;
        bins = new Uint8Array(analyser.frequencyBinCount);
        const silent = context.createGain();
        silent.gain.value = 0;
        analyser.connect(silent).connect(context.destination);
      }
      source?.disconnect();
      source = context.createMediaStreamSource(stream);
      source.connect(analyser);
      tappedSrc = element.currentSrc;
    } catch {
      tappedSrc = "";
    }
  };
  const wake = () => {
    tap();
    context?.resume().catch(() => undefined);
  };
  element.addEventListener("playing", wake);
  if (!element.paused) wake();
  return {
    read() {
      if (!analyser || context?.state !== "running") return null;
      analyser.getByteFrequencyData(bins);
      return bins;
    },
    close() {
      element.removeEventListener("playing", wake);
      source?.disconnect();
      context?.close().catch(() => undefined);
    },
  };
}

function drawTails(ctx: CanvasRenderingContext2D, size: number, levels: Float32Array, time: number) {
  const center = size / 2;
  const vinyl = size / 2.3;
  ctx.clearRect(0, 0, size, size);
  ctx.lineCap = "round";
  for (let i = 0; i < TAILS; i++) {
    const level = levels[i];
    const base = (i / TAILS) * TURN + 0.42;
    const steps = 26;
    const step = (vinyl * (0.3 + 0.34 * level)) / steps;
    const width = vinyl * (0.08 + 0.03 * level);
    const lean = i % 2 ? 0.45 : -0.45;
    let x = center + Math.cos(base) * vinyl * 0.4;
    let y = center + Math.sin(base) * vinyl * 0.4;
    for (let k = 0; k < steps; k++) {
      const s = k / steps;
      const wave = Math.sin(time * (0.8 + i * 0.06) + i * 1.9 - s * 3.2) * (0.45 + level * 0.45);
      const heading = base + (wave + lean) * Math.pow(s, 1.3) * 1.5;
      const nx = x + Math.cos(heading) * step;
      const ny = y + Math.sin(heading) * step;
      const heat = Math.min(1, s * 0.75 + level * 0.3);
      ctx.strokeStyle = `hsl(${38 + heat * 10} 86% ${40 + heat * 34}%)`;
      ctx.lineWidth = Math.max(1.5, width * (1 - Math.pow(s, 1.7)));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      x = nx;
      y = ny;
    }
  }
}

export function KillerBeeDeck({ audio }: { audio: RefObject<HTMLAudioElement | null> }) {
  const deck = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const vinyl = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = deck.current;
    const surface = canvas.current;
    const record = vinyl.current;
    const ctx = surface?.getContext("2d");
    if (!root || !surface || !record || !ctx) return;
    const element = audio.current;
    const spectrum = element ? tapSpectrum(element) : null;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const levels = new Float32Array(TAILS);
    const averages = new Float32Array(TAILS);
    let frame = 0;
    let last = performance.now();
    let time = 0;
    let angle = 0;
    let speed = 0;
    let silentFrames = 0;
    let playing: boolean | undefined;

    const resize = () => {
      const pixels = Math.round(surface.clientWidth * Math.min(2, window.devicePixelRatio || 1));
      if (pixels && surface.width !== pixels) surface.width = surface.height = pixels;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(surface);
    resize();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const on = Boolean(element && !element.paused && !element.ended);
      if (on !== playing) {
        playing = on;
        root.dataset.playing = String(on);
      }
      if (!still) {
        // A real platter has inertia: it winds up and coasts down.
        speed += ((on ? RPM_33 : 0) - speed) * (1 - Math.exp(-dt / (on ? 0.5 : 0.32)));
        angle = (angle + speed * dt) % 360;
        record.style.transform = `rotate(${angle.toFixed(2)}deg)`;
        time += dt * (0.35 + speed / RPM_33);
      }
      const bins = on ? spectrum?.read() : null;
      let heard = false;
      if (bins) for (let b = 1; b < 64 && !heard; b++) heard = bins[b] > 0;
      silentFrames = heard ? 0 : silentFrames + 1;
      const live = Boolean(bins) && silentFrames < 45;
      let energy = 0;
      for (let i = 0; i < TAILS; i++) {
        let target = 0;
        if (live && bins) {
          let sum = 0;
          for (let b = BAND_EDGES[i]; b < BAND_EDGES[i + 1]; b++) sum += bins[b];
          const mean = sum / ((BAND_EDGES[i + 1] - BAND_EDGES[i]) * 255);
          // Follow each band's swing around its own running average, so loud mixes still dance.
          averages[i] += (mean - averages[i]) * 0.03;
          target = Math.max(0, Math.min(1, (0.34 + (mean - averages[i]) * 4) * Math.min(1, mean * 3)));
        } else if (on && !still) {
          const kick = Math.pow(Math.max(0, Math.sin(now / 1000 * Math.PI * 3.2)), 6);
          target = 0.28 + 0.22 * Math.sin(now / 1000 * (1.7 + i * 0.31) + i * 2.1) + kick * (i < 3 ? 0.4 : 0.15);
        }
        levels[i] += (target - levels[i]) * (target > levels[i] ? 0.5 : 0.12);
        energy += levels[i];
      }
      root.style.setProperty("--kb-energy", (energy / TAILS).toFixed(3));
      drawTails(ctx, surface.width, levels, time);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      spectrum?.close();
    };
  }, [audio]);

  return <div className="beats-deck" ref={deck} data-playing="false" aria-hidden="true">
    <div className="beats-deck-halo" />
    <canvas className="beats-tails" ref={canvas} />
    <div className="beats-platter">
      <div className="beats-vinyl" ref={vinyl}>
        <svg className="beats-label" viewBox="0 0 100 100">
          <defs><path id="kb-label-ring" d="M50 50 m-37 0 a37 37 0 1 1 74 0 a37 37 0 1 1 -74 0" /></defs>
          <circle cx="50" cy="50" r="50" fill="#d7ab3f" />
          <circle cx="50" cy="50" r="46.5" fill="none" stroke="#8c6618" strokeWidth="1.2" />
          <text className="beats-label-ring"><textPath href="#kb-label-ring" textLength="226">LES BEATS DE KILLER BEE ✦ KUMO RECORDS ✦ 33 TOURS ✦</textPath></text>
          <text className="beats-label-kanji" x="50" y="31">鉄</text>
          <text className="beats-label-side" x="50" y="68">FACE B</text>
          <circle cx="50" cy="50" r="3.2" fill="#0c0a0d" />
        </svg>
      </div>
      <div className="beats-vinyl-sheen" />
    </div>
    <svg className="beats-arm" viewBox="0 0 120 200">
      <circle cx="92" cy="30" r="22" fill="#17141a" stroke="#2c272f" strokeWidth="2" />
      <g className="beats-arm-swing">
        <rect x="84" y="2" width="16" height="26" rx="5" fill="#8f8a86" />
        <path d="M92 30 L58 150" stroke="#f4ead8" strokeWidth="6" strokeLinecap="round" />
        <path d="M58 150 L44 172" stroke="#f4ead8" strokeWidth="6" strokeLinecap="round" />
        <rect x="30" y="160" width="24" height="34" rx="5" fill="#d7ab3f" stroke="#0c0a0d" strokeWidth="2" transform="rotate(32 42 177)" />
        <circle cx="92" cy="30" r="9" fill="#f4ead8" />
        <circle cx="92" cy="30" r="3.5" fill="#0c0a0d" />
      </g>
    </svg>
  </div>;
}
