import type { PlayerId } from "../../types";
import type { AttributeConfig, GuessResult, PublicTurn, TargetCard } from "../../dossier/types";
import { DOSSIER_ICONS } from "../../dossier/icons";

/**
 * Les valeurs d'une colonne « en icônes » : une image par valeur (voir
 * `src/dossier/icons.ts`). Sans aucune valeur, la case montre un tiret.
 */
function CellIcons({ attribute, values }: { attribute: string; values: string[] }) {
  if (!values.length) return <span className="ds-icons is-empty" aria-hidden="true">—</span>;
  return <span className="ds-icons">{values.map(value => {
    const file = DOSSIER_ICONS[`${attribute}:${value}`];
    return file ? <img key={value} src={`/dossier/icones/${file}`} alt={value} title={value} /> : <b key={value}>{value}</b>;
  })}</span>;
}

const STATE_LABEL = { correct: "correspond", partial: "en partie", wrong: "ne correspond pas" } as const;

/** Le portrait d'un personnage, ou son initiale tant qu'aucune image n'est fournie. */
export function DossierAvatar({ name, image }: { name: string; image?: string }) {
  return <span className="ds-avatar" aria-hidden="true">{image ? <img src={image} alt="" /> : name.charAt(0)}</span>;
}

interface RowProps {
  guess: GuessResult;
  attributes: AttributeConfig[];
  player: PlayerId;
  playerName: string;
  /** La ligne vient d'être révélée : ses cases se retournent une à une. */
  fresh?: boolean;
  /** Affiche le nom de chaque colonne dans la case (écran joueur) plutôt qu'en tête de tableau. */
  labelled?: boolean;
}

/** Une proposition corrigée : le personnage, puis une case par colonne, verte, orange ou rouge. */
export function DossierGuessRow({ guess, attributes, player, playerName, fresh, labelled }: RowProps) {
  return <div className={`ds-row ${player}` + (fresh ? " is-fresh" : "") + (guess.found ? " is-found" : "")}>
    <div className="ds-who">
      <DossierAvatar name={guess.name} image={guess.image} />
      <p><strong>{guess.name}</strong><em>{playerName}</em></p>
      {guess.found && <b className="ds-found">Personnage trouvé</b>}
    </div>
    <ul className="ds-cells">
      {guess.cells.map((cell, index) => {
        const config = attributes.find(attribute => attribute.key === cell.key);
        const label = config?.label ?? cell.key;
        return <li key={cell.key} className={`ds-cell is-${cell.state}`} style={{ ["--i" as string]: index }} aria-label={`${label} : ${cell.value}, ${STATE_LABEL[cell.state]}`}>
          {labelled && <small>{label}</small>}
          {config?.display === "icons" ? <CellIcons attribute={cell.key} values={cell.values} />
            : <span>{cell.value}{cell.direction && <i aria-hidden="true">{cell.direction === "up" ? "▲" : "▼"}</i>}</span>}
        </li>;
      })}
    </ul>
  </div>;
}

/** Un tour : les deux propositions, révélées ensemble. `first` choisit la ligne mise en avant. */
export function DossierTurnBlock({ turn, attributes, names, fresh, labelled, first = "player1" }: {
  turn: PublicTurn; attributes: AttributeConfig[]; names: Record<PlayerId, string>; fresh?: boolean; labelled?: boolean; first?: PlayerId;
}) {
  const order: PlayerId[] = first === "player1" ? ["player1", "player2"] : ["player2", "player1"];
  return <li className={"ds-turn" + (fresh ? " is-fresh" : "")}>
    <p className="ds-turn-number">Tour {turn.number}</p>
    {order.map(id => <DossierGuessRow key={id} guess={turn.guesses[id]} attributes={attributes} player={id} playerName={names[id]} fresh={fresh} labelled={labelled} />)}
  </li>;
}

/** La fiche du personnage mystère : montrée à tous au debrief, au présentateur dès le début. */
export function DossierTarget({ target, kicker }: { target: TargetCard; kicker: string }) {
  return <section className="ds-target">
    <DossierAvatar name={target.name} image={target.image} />
    <div>
      <p className="ay-kicker">{kicker}</p>
      <h2>{target.name}</h2>
      <dl>{target.cells.map(cell => <div key={cell.key}><dt>{cell.label}</dt><dd>{cell.value}</dd></div>)}</dl>
    </div>
  </section>;
}

/** Le score de l'épreuve : les rounds gagnés par chacun. */
export function DossierScore({ names, wins, draws }: { names: Record<PlayerId, string>; wins: Record<PlayerId, number>; draws: number }) {
  return <p className="ds-score" aria-label={`${names.player1} ${wins.player1}, ${names.player2} ${wins.player2}`}>
    <span className="player1">{names.player1} <b>{wins.player1}</b></span>
    <i aria-hidden="true">–</i>
    <span className="player2"><b>{wins.player2}</b> {names.player2}</span>
    {draws > 0 && <small>{draws} égalité{draws > 1 ? "s" : ""}</small>}
  </p>;
}
