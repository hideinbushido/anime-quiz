import { useEffect, useRef, useState } from "react";
import type { PlayerId } from "../../types";
import { useRoom } from "../../realtime/roomContext";

/** Sans image depuis ce délai, la caméra est considérée coupée : la photo de profil revient. */
const STALE_MS = 3500;

/**
 * Le cadre d'un joueur sur le live : sa caméra quand il l'a activée sur son
 * écran, sinon sa photo de profil, sinon son initiale. Les images arrivent
 * plusieurs fois par seconde et sont posées directement dans la balise.
 */
export function PlayerFrame({ player, name, image }: { player: PlayerId; name: string; image: string | null }) {
  const { cams } = useRoom();
  const picture = useRef<HTMLImageElement>(null);
  const [live, setLive] = useState(() => cams.latest(player) !== null);

  useEffect(() => {
    let timer = 0;
    const show = (frame: string | null) => {
      window.clearTimeout(timer);
      if (frame && picture.current) picture.current.src = frame;
      setLive(Boolean(frame));
      if (frame) timer = window.setTimeout(() => setLive(false), STALE_MS);
    };
    show(cams.latest(player));
    const stop = cams.subscribe(player, show);
    return () => { stop(); window.clearTimeout(timer); };
  }, [cams, player]);

  return <span className={`pf ${player}` + (live ? " is-live" : "")} role="img" aria-label={name}>
    <span className="pf-view">
      {image ? <img className="pf-photo" src={image} alt="" /> : <b className="pf-initial">{name.charAt(0)}</b>}
      <img className="pf-cam" ref={picture} alt="" />
    </span>
    <i className="pf-corner" aria-hidden="true" /><i className="pf-corner" aria-hidden="true" /><i className="pf-corner" aria-hidden="true" /><i className="pf-corner" aria-hidden="true" />
    {live && <em className="pf-rec" aria-hidden="true">Live</em>}
  </span>;
}
