import { useEffect, useRef } from "react";

const TONES = {
  gold: ["#fff6d2", "#f3d67e", "#d7ab3f", "#fbf6e9"],
  player1: ["#4b8cff", "#a9c8ff", "#fff6d2", "#f3d67e"],
  player2: ["#ff3d62", "#ffa3b4", "#fff6d2", "#f3d67e"],
};
export type FxTone = keyof typeof TONES;

/** Une gerbe à lancer : elle part quand `key` change. `rain` fait pleuvoir sur toute la largeur. */
export interface FxBurst { key: string | number; tone?: FxTone; from?: "left" | "right" | "center" | "rain" }

interface Ember { x: number; y: number; speed: number; size: number; phase: number; drift: number }
interface Spark { x: number; y: number; vx: number; vy: number; gravity: number; size: number; spin: number; angle: number; life: number; age: number; color: string; round: boolean; delay: number }

/**
 * Le décor vivant commun à tous les écrans : des braises d'or qui montent
 * derrière le contenu, deux faisceaux qui balaient la scène, et des gerbes de
 * confettis par-dessus quand quelque chose se passe (bonne réponse, victoire).
 * Rien ici ne porte d'information : tout est décoratif, et s'arrête si
 * l'appareil demande moins de mouvement.
 */
export function StageFx({ density = 1, burst = null, over = false }: { density?: number; burst?: FxBurst | null; /** Sur le site, les pages ont leur propre fond : les braises passent alors par-dessus, en lumière. */ over?: boolean }) {
  const back = useRef<HTMLCanvasElement>(null);
  const front = useRef<HTMLCanvasElement>(null);
  const queue = useRef<FxBurst[]>([]);
  const seen = useRef<string | number | null>(null);

  useEffect(() => {
    if (!burst || burst.key === seen.current) return;
    seen.current = burst.key;
    queue.current.push(burst);
  }, [burst]);

  useEffect(() => {
    const backdrop = back.current, overlay = front.current;
    const ember = backdrop?.getContext("2d"), spark = overlay?.getContext("2d");
    if (!backdrop || !overlay || !ember || !spark) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0, height = 0, frame = 0, last = performance.now(), dirty = false;
    let embers: Ember[] = [];
    const sparks: Spark[] = [];

    const resize = () => {
      const ratio = Math.min(1.5, window.devicePixelRatio || 1);
      width = window.innerWidth; height = window.innerHeight;
      for (const canvas of [backdrop, overlay]) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
      ember.setTransform(ratio, 0, 0, ratio, 0, 0);
      spark.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(Math.min(90, (width * height) / 26000) * density);
      embers = Array.from({ length: count }, () => ({
        x: Math.random() * width, y: Math.random() * height, speed: 8 + Math.random() * 26,
        size: 0.7 + Math.random() * 2.3, phase: Math.random() * 6.3, drift: (Math.random() - 0.5) * 14,
      }));
    };
    resize();
    window.addEventListener("resize", resize);
    // Le pointeur écarte les braises ; sur le site, un clic fait jaillir quelques étincelles
    const pointer = { x: -999, y: -999 };
    const onMove = (event: PointerEvent) => { pointer.x = event.clientX; pointer.y = event.clientY; };
    const onDown = (event: PointerEvent) => {
      if (!over || still) return;
      for (let index = 0; index < 16; index++) {
        const angle = Math.random() * 6.3, power = 90 + Math.random() * 260;
        sparks.push({ x: event.clientX, y: event.clientY, vx: Math.cos(angle) * power, vy: Math.sin(angle) * power - 120, gravity: 620, size: 3 + Math.random() * 5,
          spin: (Math.random() - 0.5) * 14, angle, life: 0.5 + Math.random() * 0.5, age: 0, color: TONES.gold[index % 4], round: index % 3 === 0, delay: 0 });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });

    const launch = ({ tone = "gold", from = "center" }: FxBurst) => {
      const colors = TONES[tone];
      const rain = from === "rain";
      const count = rain ? 320 : 110;
      const originX = from === "left" ? width * 0.14 : from === "right" ? width * 0.86 : width / 2;
      for (let index = 0; index < count; index++) {
        const angle = rain ? Math.PI / 2 + (Math.random() - 0.5) * 0.5 : Math.random() * Math.PI * 2;
        const power = rain ? 120 + Math.random() * 260 : 260 + Math.random() * 760;
        sparks.push({
          x: rain ? Math.random() * width : originX, y: rain ? -20 : height * 0.5,
          vx: Math.cos(angle) * power, vy: Math.sin(angle) * power - (rain ? 0 : 260), gravity: rain ? 60 : 900,
          size: 4 + Math.random() * 9, spin: (Math.random() - 0.5) * 14, angle: Math.random() * 6.3,
          life: rain ? 5 + Math.random() * 3 : 1.3 + Math.random() * 1.1, age: 0,
          color: colors[index % colors.length], round: index % 4 === 0, delay: rain ? Math.random() * 4 : 0,
        });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Sous la vidéo des règles, rien n'est dessiné : toute la machine sert à la lecture
      if (document.documentElement.dataset.intro) { frame = requestAnimationFrame(tick); return; }
      ember.clearRect(0, 0, width, height);
      ember.globalCompositeOperation = "lighter";
      for (const item of embers) {
        if (!still) {
          item.y -= item.speed * dt;
          item.x += (item.drift + Math.sin(now / 1400 + item.phase) * 10) * dt;
          if (item.y < -10) { item.y = height + 10; item.x = Math.random() * width; }
          const dx = item.x - pointer.x, dy = item.y - pointer.y, near = dx * dx + dy * dy;
          if (near < 19600 && near > 1) { const push = (1 - near / 19600) * 260 * dt / Math.sqrt(near); item.x += dx * push; item.y += dy * push; }
        }
        const glow = 0.25 + 0.3 * (1 + Math.sin(now / 700 + item.phase)) / 2;
        ember.fillStyle = `rgba(243, 214, 126, ${glow.toFixed(3)})`;
        ember.beginPath();
        ember.arc(item.x, item.y, item.size, 0, 6.3);
        ember.fill();
        ember.fillStyle = `rgba(215, 171, 63, ${(glow * 0.22).toFixed(3)})`;
        ember.beginPath();
        ember.arc(item.x, item.y, item.size * 3.4, 0, 6.3);
        ember.fill();
      }

      while (queue.current.length) { const next = queue.current.shift(); if (next && !still) launch(next); }
      if (sparks.length || dirty) {
        spark.clearRect(0, 0, width, height);
        dirty = sparks.length > 0;
        for (let index = sparks.length - 1; index >= 0; index--) {
          const item = sparks[index];
          if (item.delay > 0) { item.delay -= dt; continue; }
          item.age += dt;
          if (item.age > item.life || item.y > height + 40) { sparks.splice(index, 1); continue; }
          item.vy += item.gravity * dt;
          item.vx *= 1 - 1.4 * dt;
          item.x += item.vx * dt;
          item.y += item.vy * dt;
          item.angle += item.spin * dt;
          spark.globalAlpha = Math.min(1, (item.life - item.age) * 2.2);
          spark.fillStyle = item.color;
          spark.save();
          spark.translate(item.x, item.y);
          spark.rotate(item.angle);
          // Un confetti tourne sur lui-même : sa largeur apparente respire
          if (item.round) { spark.beginPath(); spark.arc(0, 0, item.size * 0.45, 0, 6.3); spark.fill(); }
          else spark.fillRect(-item.size / 2, -item.size * 0.28 * Math.abs(Math.cos(item.angle * 1.7)), item.size, item.size * 0.56 * Math.abs(Math.cos(item.angle * 1.7)) + 1);
          spark.restore();
        }
        spark.globalAlpha = 1;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [density, over]);

  return <>
    <div className={"fx-back" + (over ? " is-over" : "")} aria-hidden="true">
      <i className="fx-beam" /><i className="fx-beam" />
      <canvas ref={back} />
    </div>
    <canvas className="fx-front" ref={front} aria-hidden="true" />
  </>;
}
