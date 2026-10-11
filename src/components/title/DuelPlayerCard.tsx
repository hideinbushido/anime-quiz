interface Props {
  player: 1 | 2;
  name: string;
  onChange: (name: string) => void;
}

export function DuelPlayerCard({ player, name, onChange }: Props) {
  const id = player === 1 ? "player-one" : "player-two";
  const ready = Boolean(name.trim());
  return <section className={`arena-player arena-player-${player}`} aria-labelledby={`${id}-label`}>
    <div className="arena-player-top"><span>CHALLENGER 0{player}</span><span className={"arena-player-status" + (ready ? " is-ready" : "")}>{ready ? "✓ Prêt" : "En attente"}</span></div>
    <div className="arena-player-emblem" aria-hidden="true">
      <span className="arena-player-number">0{player}</span>
      <svg viewBox="0 0 100 100" fill="none"><path d="M50 5 89 27v46L50 95 11 73V27Z" /><path d="M50 15 80 32v36L50 85 20 68V32Z" /></svg>
      <strong>{name.trim() ? [...name.trim()][0].toLocaleUpperCase("fr") : `P${player}`}</strong>
    </div>
    <label id={`${id}-label`} htmlFor={id}>Joueur {player}</label>
    <div className="arena-input-wrap">
      <input id={id} name={id} value={name} onChange={event => onChange(event.target.value)}
        placeholder="Entre ton pseudo" maxLength={24} required autoComplete="off" spellCheck={false} aria-describedby={`${id}-hint`} />
      <span aria-hidden="true">↗</span>
    </div>
    <p id={`${id}-hint`}>Ton nom dans l'arène</p>
    <span className="arena-player-edge" aria-hidden="true" />
  </section>;
}
