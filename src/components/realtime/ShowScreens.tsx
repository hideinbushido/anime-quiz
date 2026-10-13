import type { PlayerId } from "../../types";
import { useRoom } from "../../realtime/roomContext";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { FeudAvatar } from "../feud/FeudParts";
import { StageFx } from "../fx/StageFx";
import { PlayerFrame } from "./PlayerFrame";
import { CamToggle } from "./CamToggle";

const PLAYERS: PlayerId[] = ["player1", "player2"];
const LOGOS: Record<string, string> = {
  "blind-test-openings": "les-beats-de-killer-bee", "liens-ayanokoji": "les-liens-d-ayanokoji", "citations-cultes": "repliques-cultes",
  "pensees-anya": "les-pensees-d-anya", "dossier-l": "le-dossier-de-l",
};

/**
 * L'écran du live entre deux épreuves : les deux joueurs, le score du duel
 * (une épreuve gagnée, un point) et le programme avec ce qui a déjà été joué.
 */
export function ShowLive() {
  const { info, status, error } = useRoom();
  if (!info) return <main className="ay-screen sh-live"><ConnectionNotice status={status} error={error} /></main>;
  const { show, names } = info;
  const wins = show?.wins ?? { player1: 0, player2: 0 };
  const final = show?.phase === "final";
  const winner: PlayerId | null = wins.player1 === wins.player2 ? null : wins.player1 > wins.player2 ? "player1" : "player2";
  const next = show && show.phase !== "final" ? show.program[show.index] : undefined;

  return <main className={"ay-screen sh-live" + (final ? " is-final" : "") + (final && winner ? ` ${winner}` : "")}>
    <header className="sh-head">
      <img src="/logo-zenkai.png" alt="" />
      <h1>Quiz'Animanga</h1>
      <p className="ay-kicker">{final ? "Fin du live" : show?.phase === "between" ? "Le duel continue" : "Le duel va commencer"}</p>
    </header>
    <StageFx burst={final ? { key: "final", tone: winner ?? "gold", from: "rain" } : null} />
    <ConnectionNotice status={status} error={error} />

    <section className="sh-duel">
      {PLAYERS.map(id => <article key={id} className={id + (final && winner === id ? " is-winner" : "")}>
        <PlayerFrame player={id} name={names[id]} image={info.avatars[id]} />
        <h2><i className={"ay-dot" + (info.connected[id] ? " is-on" : "")} aria-hidden="true" />{names[id]}</h2>
        <b key={wins[id]}>{wins[id]}</b>
      </article>)}
      <p className="sh-versus" aria-hidden="true">VS</p>
    </section>

    {final ? <p className="sh-verdict" role="status">{winner ? `${names[winner]} remporte le live` : "Égalité : personne ne cède"}</p>
      : next ? <p className="sh-next" role="status"><span>{show?.phase === "lobby" ? "Première épreuve" : "Prochaine épreuve"}</span><strong>{next.name}</strong></p>
      : <p className="sh-next" role="status"><span>En attente</span><strong>Le présentateur prépare le programme</strong></p>}

    {show && show.program.length > 0 && <ol className="sh-program">
      {show.program.map((item, index) => {
        const lead: PlayerId | null = !item.result || item.result.player1 === item.result.player2 ? null : item.result.player1 > item.result.player2 ? "player1" : "player2";
        return <li key={item.id} className={(item.result ? "is-played " : "") + (index === show.index && !final ? "is-next " : "") + (lead ?? "")}>
          {LOGOS[item.id] ? <img src={`/logos-epreuves/${LOGOS[item.id]}.webp`} alt="" /> : <i aria-hidden="true">{index + 1}</i>}
          <strong>{item.name}</strong>
          {item.result ? <em>{item.result.player1} – {item.result.player2}</em> : <em>{index === show.index && !final ? "À suivre" : ""}</em>}
          {item.result && <b>{lead ? names[lead] : "Égalité"}</b>}
        </li>;
      })}
    </ol>}
  </main>;
}

/** Le téléphone d'un joueur entre deux épreuves : le score, et l'invitation à regarder le live. */
export function ShowPlayer({ player }: { player: PlayerId }) {
  const { info, status, error } = useRoom();
  if (!info) return <main className={`ay-screen fd-player ${player}`}><ConnectionNotice status={status} error={error} /></main>;
  const opponent: PlayerId = player === "player1" ? "player2" : "player1";
  const wins = info.show?.wins ?? { player1: 0, player2: 0 };
  const final = info.show?.phase === "final";
  const next = info.show && !final ? info.show.program[info.show.index] : undefined;
  return <main className={`ay-screen fd-player ${player} is-over`}>
    <header className="fd-player-head">
      <FeudAvatar player={player} name={info.names[player]} image={info.avatars[player]} />
      <h1>{info.names[player]}</h1>
      <p className="ay-kicker">Quiz'Animanga</p>
    </header>
    <StageFx density={0.5} />
    <ConnectionNotice status={status} error={error} />
    <CamToggle />
    <p className="sh-phone-score"><b>{wins[player]}</b><span>–</span><b>{wins[opponent]}</b></p>
    <p className="fd-player-state" role="status">
      <strong>{final ? (wins[player] === wins[opponent] ? "Égalité" : wins[player] > wins[opponent] ? "Tu gagnes le live" : `${info.names[opponent]} gagne le live`) : next ? next.name : "Tu es connecté"}</strong>
      <span>{final ? "Merci d'avoir joué." : next ? "L'épreuve arrive. Regarde le live." : "En attente du présentateur…"}</span>
    </p>
  </main>;
}
