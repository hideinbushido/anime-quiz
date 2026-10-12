import { useCallback, useRef, useState, type AnimationEvent, type ReactNode } from "react";

type Phase = "close" | "open";

/**
 * La coupe d'or : la transition signature entre deux écrans.
 * `cut(action)` referme l'écran en deux moitiés, exécute `action` une fois
 * l'écran masqué, puis rouvre sur le nouvel écran.
 */
export function useGoldCut(): { cut: (action: () => void) => void; overlay: ReactNode } {
  const [phase, setPhase] = useState<Phase | null>(null);
  const pending = useRef<(() => void) | null>(null);

  const cut = useCallback((action: () => void) => {
    // Une coupe déjà en cours : on n'empile pas, l'action passe tout de suite
    if (pending.current) { action(); return; }
    pending.current = action;
    setPhase("close");
  }, []);

  function onEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (phase === "close") {
      pending.current?.();
      setPhase("open");
    } else {
      pending.current = null;
      setPhase(null);
    }
  }

  const overlay = phase && <div className={`zk-cut zk-cut-${phase}`} onAnimationEnd={onEnd} aria-hidden="true">
    <span className="zk-cut-half zk-cut-a" />
    <span className="zk-cut-half zk-cut-b" />
    <img className="zk-cut-seal" src="/logo-zenkai.png" alt="" />
  </div>;

  return { cut, overlay };
}
