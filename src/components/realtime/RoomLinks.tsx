import { useMemo, useState } from "react";
import qrcode from "qrcode-generator";
import type { PlayerId } from "../../types";

/** Un QR code dessiné en SVG : net à toutes les tailles, sans image à charger. */
function QrCode({ value }: { value: string }) {
  const { size, path } = useMemo(() => {
    const code = qrcode(0, "M");
    code.addData(value);
    code.make();
    const count = code.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) for (let col = 0; col < count; col++) if (code.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
    return { size: count, path: d };
  }, [value]);
  return <svg className="rt-qr" viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label="QR code" shapeRendering="crispEdges">
    <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" /><path d={path} fill="#000" />
  </svg>;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1600); } catch { /* presse-papiers refusé : l'adresse reste affichée */ }
  };
  return <button type="button" className="ay-button rt-copy" onClick={copy}>{copied ? "Copié" : "Copier le lien"}</button>;
}

/**
 * Comment chacun rejoint la room : un QR code par joueur, à scanner avec son
 * téléphone, et l'adresse de l'écran live à ouvrir dans OBS.
 */
export function RoomLinks({ room, names }: { room: string; names: Record<PlayerId, string> }) {
  const link = (path: string) => `${window.location.origin}${path}`;
  const players: [PlayerId, string][] = [["player1", link(`/player?room=${room}&player=1`)], ["player2", link(`/player?room=${room}&player=2`)]];
  const live = link(`/live?room=${room}`);
  return <section className="rt-links" aria-label="Rejoindre la room">
    <p className="ay-kicker">Connexion des joueurs et du live</p>
    <div>
      {players.map(([id, url]) => <article key={id} className={id}>
        <QrCode value={url} />
        <h3>{names[id]}</h3>
        <p>Scanne pour ouvrir ton écran</p>
        <CopyButton value={url} />
      </article>)}
      <article className="rt-live">
        <h3>Écran live</h3>
        <p>À ouvrir comme source « Navigateur » dans OBS ou TikTok Live Studio</p>
        <code>{live}</code>
        <CopyButton value={live} />
      </article>
    </div>
  </section>;
}
