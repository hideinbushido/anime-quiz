import type { PlayerId } from "../../types";
import type { FeudSlot } from "../../feud/types";

/** Les trois erreurs possibles d'un joueur : des croix qui se remplissent. */
export function FeudStrikes({ count, max }: { count: number; max: number }) {
  return <span className="fd-strikes" role="img" aria-label={`${count} erreur${count > 1 ? "s" : ""} sur ${max}`}>
    {Array.from({ length: max }, (_, index) => <i key={index} className={index < count ? "is-hit" : ""} aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M5 5l14 14M19 5L5 19" /></svg>
    </i>)}
  </span>;
}

interface RowProps {
  slot: FeudSlot;
  names: Record<PlayerId, string>;
  /** La valeur est-elle tombée ? Avant, la case montre « ??? ». */
  valueShown: boolean;
  /** Pendant la révélation, une réponse non trouvée attend son tour avant de se montrer. */
  labelShown: boolean;
  /** La case vient d'être retournée : elle joue son entrée. */
  fresh?: boolean;
}

/** Une case du tableau : cachée, trouvée par un joueur, ou révélée sans propriétaire. */
export function FeudAnswerRow({ slot, names, valueShown, labelShown, fresh }: RowProps) {
  const open = slot.label !== null && labelShown;
  return <li className={"fd-row" + (open ? " is-open" : "") + (slot.foundBy ? ` ${slot.foundBy}` : open ? " is-orphan" : "") + (fresh ? " is-fresh" : "") + (valueShown ? " is-valued" : "")}>
    <span className="fd-rank">{slot.rank}</span>
    <span className="fd-answer">
      {open ? <>
        <strong>{slot.label}</strong>
        <em>{slot.foundBy ? names[slot.foundBy] : "Non trouvé"}</em>
      </> : <span className="fd-veil" aria-label="Réponse cachée" />}
    </span>
    <span className="fd-value" key={valueShown ? "v" : "q"}>{valueShown && slot.points !== null ? slot.points : "???"}</span>
  </li>;
}
