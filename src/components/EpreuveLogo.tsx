import type { CSSProperties } from "react";
import { EpreuveEmblem } from "./EpreuveEmblem";
import { EPREUVE_LOGOS } from "../epreuveLogos";


/** Le logo d'une épreuve. Celle qui n'a pas encore son badge reçoit l'emblème dessiné, pour ne jamais laisser une carte vide. */
export function EpreuveLogo({ epreuveId, className = "" }: { epreuveId: string; className?: string }) {
  const file = EPREUVE_LOGOS[epreuveId];
  if (!file) return <EpreuveEmblem epreuveId={epreuveId} className={className} />;
  const src = `/logos-epreuves/${file}.webp`;
  // Le reflet d'or qui traverse le logo est découpé à sa silhouette : il lui faut l'image comme masque
  return <span className={"zk-logo " + className} style={{ ["--logo" as string]: `url("${src}")` } as CSSProperties}>
    <img src={src} alt="" width={640} height={640} draggable={false} />
  </span>;
}
