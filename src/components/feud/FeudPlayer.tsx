import { useRef, type ChangeEvent } from "react";
import type { PlayerId } from "../../types";
import type { FeudPlayerView } from "../../feud/types";
import { useFeud } from "../../feud/useFeud";
import { ConnectionNotice } from "../ayanokoji/AyanokojiParts";
import { CamToggle } from "../realtime/CamToggle";
import { StageFx } from "../fx/StageFx";
import { FeudAnswerRow, FeudAvatar, FeudStrikes } from "./FeudParts";
import { shrinkPhoto } from "../../realtime/avatar";

/**
 * L'écran du joueur. Pas de buzzer ici : on répond à voix haute, et c'est le
 * présentateur qui donne la main. Le joueur suit la question, le tableau des
 * réponses déjà trouvées, ses erreurs et à qui c'est de répondre. Aucune
 * réponse cachée ni aucune valeur n'arrive sur cet écran.
 */
export function FeudPlayer({ player }: { player: PlayerId }) {
  const { view, status, error, send } = useFeud<FeudPlayerView>(player);
  const picker = useRef<HTMLInputElement>(null);
  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { send({ type: "room:avatar", image: await shrinkPhoto(file) }); } catch { /* fichier illisible : la photo actuelle reste */ }
  };

  if (!view) return <main className={`ay-screen fd-player ${player}`}><ConnectionNotice status={status} error={error} /></main>;
  const opponent: PlayerId = player === "player1" ? "player2" : "player1";
  const { phase } = view;
  const out = view.strikes[player] >= view.maxStrikes;
  const over = ["roundEnded", "revealingPoints", "roundComplete", "gameComplete"].includes(phase);
  const mine = view.buzzWinner === player;

  const [label, hint, tone] = phase === "gameComplete" ? ["Épreuve terminée", "Le score final est sur le live.", "is-over"]
    : over ? ["Manche terminée", phase === "roundEnded" ? "Les points arrivent sur le live…" : "Regarde le live.", "is-over"]
    : out ? ["3 strikes", "Hors manche", "is-out"]
    : mine ? ["À toi de répondre", "Donne ta réponse à voix haute.", "is-mine"]
    : view.buzzWinner ? [`${view.names[opponent]} répond`, "En attente du présentateur…", "is-theirs"]
    : ["Une idée ?", "Dis-le à voix haute : le présentateur te donne la main.", "is-open"];

  return <main className={`ay-screen fd-player fd-player-board ${player} ${tone}`}>
    <header className="fd-player-head">
      <button type="button" className="fd-photo" onClick={() => picker.current?.click()} aria-label="Changer ma photo de profil">
        <FeudAvatar player={player} name={view.names[player]} image={view.avatars[player]} />
        <span>{view.avatars[player] ? "Changer la photo" : "Ajouter ma photo"}</span>
      </button>
      <input ref={picker} type="file" accept="image/*" hidden onChange={onPhoto} />
      <h1>{view.names[player]}</h1>
      <p className="ay-kicker">{view.title}</p>
      <p className="fd-round">Manche <b>{view.roundNumber}</b>/{view.roundCount}</p>
    </header>
    <StageFx density={0.5} />
    <ConnectionNotice status={status} error={error} />
    <CamToggle />

    <p className="fd-player-state" role="status"><strong key={label}>{label}</strong><span>{hint}</span></p>

    <p className="fd-question">{view.question}</p>
    <ol className="fd-list fd-player-list">
      {view.slots.map(slot => <FeudAnswerRow key={slot.rank} slot={slot} names={view.names} avatars={view.avatars}
        valueShown={slot.points !== null} labelShown fresh={view.event.kind === "correct" && view.event.rank === slot.rank} />)}
    </ol>

    <dl className="fd-player-stats">
      <div><dt>Strikes</dt><dd><FeudStrikes count={view.strikes[player]} max={view.maxStrikes} /></dd></div>
      <div><dt>Trouvées</dt><dd><b>{view.foundCount[player]}</b></dd></div>
      <div><dt>{view.names[opponent]}</dt><dd><b>{view.foundCount[opponent]}</b></dd></div>
      {(view.roundNumber > 1 || phase === "roundComplete" || phase === "gameComplete") && <div><dt>Total</dt><dd><b>{phase === "revealingPoints" ? "…" : view.totals[player]}</b></dd></div>}
    </dl>

    {phase === "gameComplete" && view.result && <p className="fd-player-result">
      {view.result.winner === null ? "Égalité" : view.result.winner === player ? "Tu gagnes l'épreuve" : `${view.names[opponent]} gagne l'épreuve`}
      <b>{view.totals[player]} – {view.totals[opponent]}</b>
    </p>}
  </main>;
}
