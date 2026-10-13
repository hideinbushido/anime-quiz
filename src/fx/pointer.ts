/**
 * La présence du pointeur sur le site : tout ce qu'on voit lui répond.
 *  - `--px` / `--py` (de -1 à 1) sur la page : les plans de l'accueil glissent
 *    à des vitesses différentes, et le trait d'or se pousse à la main ;
 *  - les tuiles et les cartes s'inclinent vers le pointeur ;
 *  - le bouton principal de chaque écran est aimanté ;
 *  - le sceau Zenkai s'attrape et se lance comme une toupie.
 * Rien ne suit le pointeur directement : tout le rattrape avec de l'élan.
 * Réservé aux appareils à souris, et coupé si l'appareil demande moins de mouvement.
 */
const TILT = ".menu-logo-tile, .duel-results article, .rt-links article, .rules-epreuve, .rt-launch-emblem, .zk-picker-emblem, .arena-player";
const MAGNET = ".arena-cta, .btn-primary, .rules-cta, .rt-launch .is-primary";
const SPIN = ".arena-vs-seal, .rules-cover-seal, .recap-seal";
const TILT_DEG = 7;
const MAGNET_PULL = 0.28;

interface Lean { rx: number; ry: number; tx: number; ty: number; goalRx: number; goalRy: number; goalTx: number; goalTy: number }
interface Top { angle: number; speed: number; held: boolean; last: number; lastAt: number }

export function startPointerFx(): () => void {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
  const still = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!fine.matches || still.matches) return () => undefined;

  const root = document.documentElement;
  const leans = new Map<HTMLElement, Lean>();
  const tops = new Map<HTMLElement, Top>();
  let goalX = 0, goalY = 0, x = 0, y = 0, frame = 0, hovered: HTMLElement | null = null, grabbed: HTMLElement | null = null;

  const lean = (element: HTMLElement) => {
    let state = leans.get(element);
    if (!state) { state = { rx: 0, ry: 0, tx: 0, ty: 0, goalRx: 0, goalRy: 0, goalTx: 0, goalTy: 0 }; leans.set(element, state); }
    return state;
  };
  const release = (element: HTMLElement | null) => { if (element) Object.assign(lean(element), { goalRx: 0, goalRy: 0, goalTx: 0, goalTy: 0 }); };
  const angleTo = (element: HTMLElement, event: PointerEvent) => {
    const box = element.getBoundingClientRect();
    return Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2)) * 180 / Math.PI;
  };

  const onMove = (event: PointerEvent) => {
    goalX = (event.clientX / window.innerWidth) * 2 - 1;
    goalY = (event.clientY / window.innerHeight) * 2 - 1;
    if (grabbed) {
      const top = tops.get(grabbed);
      if (top) {
        const now = performance.now(), angle = angleTo(grabbed, event);
        let turn = angle - top.last;
        if (turn > 180) turn -= 360; else if (turn < -180) turn += 360;
        top.angle += turn;
        top.speed = turn / Math.max(1, now - top.lastAt) * 1000;
        top.last = angle; top.lastAt = now;
      }
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    const next = target?.closest<HTMLElement>(`${TILT}, ${MAGNET}`) ?? null;
    if (next !== hovered) { release(hovered); hovered = next; }
    if (!next || (next as HTMLButtonElement).disabled) return;
    const box = next.getBoundingClientRect();
    const fx = (event.clientX - box.left) / box.width - 0.5, fy = (event.clientY - box.top) / box.height - 0.5;
    const state = lean(next);
    if (next.matches(MAGNET)) { state.goalTx = fx * box.width * MAGNET_PULL; state.goalTy = fy * box.height * MAGNET_PULL; }
    else { state.goalRy = fx * TILT_DEG * 2; state.goalRx = -fy * TILT_DEG * 2; }
    next.style.setProperty("--gx", `${((fx + 0.5) * 100).toFixed(1)}%`);
    next.style.setProperty("--gy", `${((fy + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => { release(hovered); hovered = null; goalX = 0; goalY = 0; };

  const onDown = (event: PointerEvent) => {
    const seal = event.target instanceof Element ? event.target.closest<HTMLElement>(SPIN) : null;
    if (!seal) return;
    event.preventDefault();
    grabbed = seal;
    const top = tops.get(seal) ?? { angle: 0, speed: 0, held: true, last: 0, lastAt: 0 };
    Object.assign(top, { held: true, speed: 0, last: angleTo(seal, event), lastAt: performance.now() });
    tops.set(seal, top);
    seal.dataset.held = "true";
  };
  const onUp = () => {
    if (!grabbed) return;
    const top = tops.get(grabbed);
    if (top) { top.held = false; if (performance.now() - top.lastAt > 90) top.speed = 0; }
    delete grabbed.dataset.held;
    grabbed = null;
  };

  let before = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - before) / 1000);
    before = now;
    if (Math.abs(goalX - x) > 0.0005 || Math.abs(goalY - y) > 0.0005) {
      x += (goalX - x) * 0.07; y += (goalY - y) * 0.07;
      root.style.setProperty("--px", x.toFixed(4));
      root.style.setProperty("--py", y.toFixed(4));
    }
    for (const [element, state] of leans) {
      if (!element.isConnected) { leans.delete(element); continue; }
      state.rx += (state.goalRx - state.rx) * 0.12; state.ry += (state.goalRy - state.ry) * 0.12;
      state.tx += (state.goalTx - state.tx) * 0.14; state.ty += (state.goalTy - state.ty) * 0.14;
      const rest = Math.abs(state.rx) + Math.abs(state.ry) < 0.02 && Math.abs(state.tx) + Math.abs(state.ty) < 0.1;
      if (rest && element !== hovered) {
        element.style.removeProperty("transform");
        delete element.dataset.leaning;
        leans.delete(element);
        continue;
      }
      element.dataset.leaning = "true";
      element.style.transform = state.goalTx || state.tx || state.ty
        ? `translate(${state.tx.toFixed(2)}px, ${state.ty.toFixed(2)}px)`
        : `perspective(900px) rotateX(${state.rx.toFixed(2)}deg) rotateY(${state.ry.toFixed(2)}deg)`;
    }
    for (const [element, top] of tops) {
      if (!element.isConnected) { tops.delete(element); continue; }
      if (!top.held) {
        // Une toupie : elle garde son élan, puis s'essouffle
        top.angle += top.speed * dt;
        top.speed *= Math.exp(-dt * 0.9);
        if (Math.abs(top.speed) < 4) top.speed = 0;
      }
      element.style.transform = `rotate(${top.angle.toFixed(2)}deg)`;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  document.addEventListener("pointerleave", onLeave);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.removeEventListener("pointerleave", onLeave);
    for (const element of [...leans.keys(), ...tops.keys()]) element.style.removeProperty("transform");
    root.style.removeProperty("--px");
    root.style.removeProperty("--py");
  };
}
