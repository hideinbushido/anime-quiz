interface Props {
  player: 1 | 2;
  name: string;
  onChange: (name: string) => void;
}

/** La plaque d'un joueur : son pseudo s'écrit en grand, lisible depuis le live. */
export function DuelPlayerCard({ player, name, onChange }: Props) {
  const id = player === 1 ? "player-one" : "player-two";
  const ready = Boolean(name.trim());
  return <section className={`arena-player arena-player-${player}` + (ready ? " is-ready" : "")} aria-labelledby={`${id}-label`}>
    <div className="arena-player-top">
      <label id={`${id}-label`} htmlFor={id}>Joueur {player}</label>
      <span className="arena-player-status" key={String(ready)}>{ready ? "Prêt" : "En attente"}</span>
    </div>
    <input id={id} name={id} value={name} onChange={event => onChange(event.target.value)}
      placeholder="Pseudo" maxLength={24} required autoComplete="off" spellCheck={false} aria-describedby={`${id}-hint`} />
    <span className="arena-player-rule" aria-hidden="true" />
    <p id={`${id}-hint`}>{player === 1 ? "Côté saphir" : "Côté rubis"}</p>
  </section>;
}
