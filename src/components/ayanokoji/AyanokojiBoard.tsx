import { useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import type { PublicRound } from "../../ayanokoji/types";
import { characterImage } from "../../ayanokoji/characterImages";

interface Props {
  round: PublicRound;
  order: string[];
  /** Appelé avec le nouvel ordre quand le joueur échange deux cartes. Absent : plateau en lecture seule. */
  onReorder?: (order: string[]) => void;
  locked?: boolean;
  /** Correction : un booléen par lien, et le nombre de liens déjà dévoilés. */
  correctLinks?: boolean[];
  revealed?: number;
  /** Les cartes restent face cachée tant que la manche n'est pas lancée. */
  hidden?: boolean;
}

const DRAG_THRESHOLD = 8;
const MOVE_MS = 300;

/**
 * Le plateau : six cartes et, entre elles, les cinq liens.
 *
 * Les cartes gardent leur identité d'un rendu à l'autre. Quand l'ordre change,
 * chaque carte glisse de son ancienne place vers la nouvelle (technique FLIP) :
 * sur le live comme chez le joueur, on voit le mouvement, pas un remplacement.
 * Deux gestes pour échanger : glisser une carte sur une autre, ou toucher l'une
 * puis l'autre. Le glisser est suivi à la main, sans le drag-and-drop HTML, qui
 * ne fonctionne pas au doigt.
 */
export function AyanokojiBoard({ round, order, onReorder, locked = false, correctLinks, revealed = 0, hidden = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [activeLink, setActiveLink] = useState<number | null>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const rects = useRef(new Map<string, DOMRect>());
  const drag = useRef<{ id: string; x: number; y: number; moved: boolean } | null>(null);
  const interactive = Boolean(onReorder) && !locked && !hidden;
  const signature = order.join();

  useLayoutEffect(() => {
    for (const [id, element] of cards.current) {
      const next = element.getBoundingClientRect();
      const previous = rects.current.get(id);
      if (previous && (Math.abs(previous.left - next.left) > 1 || Math.abs(previous.top - next.top) > 1)) {
        element.animate(
          [{ transform: `translate(${previous.left - next.left}px, ${previous.top - next.top}px) scale(1.06)`, zIndex: 3 }, { transform: "none", zIndex: 3 }],
          { duration: MOVE_MS, easing: "cubic-bezier(0.2, 1.3, 0.35, 1)" },
        );
        element.classList.remove("is-moved");
        void element.offsetWidth;
        element.classList.add("is-moved");
      }
      rects.current.set(id, next);
    }
  }, [signature]);

  // Un redimensionnement déplace tout : on reprend les positions sans animer
  useLayoutEffect(() => {
    const remeasure = () => { for (const [id, element] of cards.current) rects.current.set(id, element.getBoundingClientRect()); };
    window.addEventListener("resize", remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, []);

  const swap = (a: string, b: string) => {
    if (!onReorder || a === b) return;
    onReorder(order.map(id => (id === a ? b : id === b ? a : id)));
  };

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (!interactive || event.button > 0) return;
    drag.current = { id, x: event.clientX, y: event.clientY, moved: false };
    // La capture garde le geste sur la carte même si le doigt en sort ; sans elle, le geste reste utilisable
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* pointeur non capturable */ }
  }
  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (!current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    current.moved = true;
    const element = event.currentTarget;
    element.classList.add("is-dragging");
    element.style.transform = `translate(${dx}px, ${dy}px) scale(1.08) rotate(${Math.max(-6, Math.min(6, dx / 14))}deg)`;
  }
  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    drag.current = null;
    if (!current) return;
    const element = event.currentTarget;
    if (!current.moved) {
      // Un simple toucher : on sélectionne, ou on échange avec la carte déjà sélectionnée
      if (!selected) setSelected(current.id);
      else { if (selected !== current.id) swap(selected, current.id); setSelected(null); }
      return;
    }
    // La carte part de là où on la lâche, pas de sa case d'origine
    rects.current.set(current.id, element.getBoundingClientRect());
    element.classList.remove("is-dragging");
    element.style.transform = "";
    const target = document.elementsFromPoint(event.clientX, event.clientY)
      .map(node => (node as HTMLElement).closest?.<HTMLElement>("[data-card]"))
      .find(node => node && node.dataset.card !== current.id && cards.current.get(node.dataset.card ?? "") === node);
    setSelected(null);
    if (target?.dataset.card) swap(current.id, target.dataset.card);
    else {
      // Lâchée dans le vide : elle revient à sa place
      const home = element.getBoundingClientRect();
      const from = rects.current.get(current.id);
      if (from) element.animate([{ transform: `translate(${from.left - home.left}px, ${from.top - home.top}px)` }, { transform: "none" }], { duration: MOVE_MS, easing: "cubic-bezier(0.2, 1.3, 0.35, 1)" });
      rects.current.set(current.id, home);
    }
  }

  const byId = new Map(round.characters.map(character => [character.id, character]));
  return <div className={"ay-board" + (interactive ? " is-interactive" : "") + (locked ? " is-locked" : "") + (hidden ? " is-hidden" : "") + (selected ? " has-selection" : "")}>
    <div className="ay-chain">
      {order.map((id, index) => {
        const character = byId.get(id);
        const image = hidden ? undefined : character?.image ?? characterImage(id);
        const link = round.links[index];
        const shown = correctLinks !== undefined && index < revealed;
        return [
          <button key={id} type="button" data-card={id} disabled={!interactive} style={{ ["--n" as string]: index }}
            ref={element => { if (element) cards.current.set(id, element); else cards.current.delete(id); }}
            className={"ay-card" + (selected === id ? " is-selected" : "") + (image ? " has-image" : "")}
            aria-pressed={interactive ? selected === id : undefined}
            aria-label={hidden ? `Carte ${index + 1}, face cachée` : `${character?.name}, place ${index + 1}`}
            onPointerDown={event => onPointerDown(event, id)} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
            onPointerCancel={event => { drag.current = null; event.currentTarget.classList.remove("is-dragging"); event.currentTarget.style.transform = ""; }}>
            <span className="ay-card-rank" aria-hidden="true">{index + 1}</span>
            {image && <img src={image} alt="" draggable={false} />}
            <span className="ay-card-initial" aria-hidden="true">{hidden ? "?" : [...(character?.name ?? "?")][0]}</span>
            <span className="ay-card-name">{hidden ? "" : character?.name}</span>
          </button>,
          link && <button key={link.id} type="button" style={{ ["--n" as string]: index }}
            className={"ay-link" + (shown ? (correctLinks[index] ? " is-correct" : " is-wrong") : "") + (activeLink === index ? " is-open" : "")}
            aria-label={`Lien ${index + 1} : ${link.label}${link.description ? `. ${link.description}` : ""}${shown ? (correctLinks[index] ? ". Relation valide" : ". Relation invalide") : ""}`}
            onClick={() => setActiveLink(activeLink === index ? null : index)}>
            <span className="ay-link-line" aria-hidden="true" />
            <span className="ay-link-label">{link.label}</span>
            {shown && <span className="ay-link-verdict" aria-hidden="true">{correctLinks[index] ? "✓" : "✕"}</span>}
          </button>,
        ];
      })}
    </div>
    {activeLink !== null && round.links[activeLink]?.description && <p className="ay-link-help" role="status">
      <b>{round.links[activeLink].label}</b> {round.links[activeLink].description}
    </p>}
  </div>;
}

/** La chaîne parfaite, affichée d'un trait à la fin de la révélation. */
export function AyanokojiSolution({ round, solution }: { round: PublicRound; solution: string[] }) {
  const byId = new Map(round.characters.map(character => [character.id, character.name]));
  return <p className="ay-solution" aria-label="La chaîne parfaite">
    {solution.map((id, index) => <span key={id} style={{ ["--i" as string]: index }}>
      {index > 0 && <i aria-hidden="true">→</i>}<b>{byId.get(id)}</b>
    </span>)}
  </p>;
}
