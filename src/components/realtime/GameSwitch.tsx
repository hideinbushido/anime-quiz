import type { RoomGame } from "../../feud/types";
import { useRoom } from "../../realtime/roomContext";

const GAMES: { id: RoomGame; label: string }[] = [
  { id: "ayanokoji", label: "Les Liens d'Ayanokoji" },
  { id: "feud", label: "Les Pensées d'Anya" },
  { id: "dossier", label: "Le Dossier de L" },
];

/**
 * Le choix de l'épreuve, en haut de chaque régie. Changer d'épreuve bascule le
 * live et les écrans des joueurs ; chaque partie reste en l'état et se retrouve
 * en y revenant.
 */
export function GameSwitch() {
  const { game, send } = useRoom();
  return <nav className="rt-switch" aria-label="Épreuve affichée sur le live">
    <span>Épreuve à l'écran</span>
    {GAMES.map(item => <button key={item.id} type="button" className={"ay-button" + (game === item.id ? " is-current" : "")} aria-pressed={game === item.id}
      onClick={() => { if (game !== item.id) send({ type: "room:game", game: item.id }); }}>{item.label}</button>)}
  </nav>;
}
