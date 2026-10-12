import { useId, type ReactNode } from "react";

/**
 * Les logos animés des épreuves. Chaque médaillon met en scène le personnage
 * qui donne son nom à l'épreuve, redessiné ici en aplats or : aucune image
 * officielle n'est utilisée. Les animations sont dans `gold.css` (.zk-emblem).
 */
const INK = "#0a0806";
const PAPER = "#fbf6e9";

/* Killer Bee, le rappeur : lunettes noires, bandeau, bouc blanc, tresses blondes.
   Derrière lui, huit barres de son battent la mesure — les huit queues du Hachibi. */
function KillerBee({ gold }: { gold: string }) {
  return <>
    {[70, 104, 84, 124, 124, 84, 104, 70].map((h, i) => <rect key={i} className="zk-beat" style={{ ["--i" as string]: i }}
      x={22 + i * 21} y={178 - h} width="13" height={h} rx="6.5" fill={gold} />)}
    <path d="M34 200q6-44 46-50h40q40 6 46 50Z" fill="#1c150c" stroke={gold} strokeWidth="3" />
    <path d="M60 157l15-6 32 49H88Z" fill={PAPER} opacity="0.92" />
    <rect x="86" y="126" width="28" height="28" fill="#6b4a20" />
    <path d="M68 86q0-40 32-40t32 40v18q0 30-32 36-32-6-32-36Z" fill="#7d5826" stroke={gold} strokeWidth="3" />
    {/* les tresses plaquées */}
    <path d="M67 82q-3-46 33-46t33 46q-9-20-33-20t-33 20Z" fill="#f3d67e" stroke={INK} strokeWidth="1.5" />
    <path d="M80 42q-6 12-7 26M91 37q-3 12-3 25M100 36v25M109 37q3 12 3 25M120 42q6 12 7 26" stroke={INK} strokeWidth="2" fill="none" />
    {/* le bandeau frontal */}
    <path d="M66 74h68v13H66Z" fill={PAPER} stroke={INK} strokeWidth="2" />
    <rect x="86" y="76" width="28" height="9" rx="1.5" fill="#cfc8b4" stroke={INK} strokeWidth="1.5" />
    {/* les lunettes, et le reflet qui les traverse */}
    <path d="M71 96h26l-4 16q-9 4-18-1ZM129 96h-26l4 16q9 4 18-1Z" fill={INK} stroke={gold} strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M96 99h8" stroke={gold} strokeWidth="3" />
    <g className="zk-glint" stroke={PAPER} strokeWidth="2.5" strokeLinecap="round">
      <path d="M78 108l7-9" /><path d="M110 108l7-9" />
    </g>
    {/* la corne tatouée sur la joue, la bouche, le bouc */}
    <path d="M75 117q5 7 12 4-5-1-6-7Z" fill="#fff6d2" />
    <path d="M91 126q9 5 18 0" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    <path d="M90 131h20l-10 17Z" fill={PAPER} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
  </>;
}

/* Ayanokoji, le manipulateur : regard éteint sous sa frange, col d'uniforme.
   Il tient au bout de ses fils un roi et un pion — ce sont « les liens ». */
function Ayanokoji({ gold }: { gold: string }) {
  return <>
    <g className="zk-strings" stroke={gold} strokeWidth="1.6" strokeDasharray="3 5" fill="none">
      <path d="M100 6L40 92" /><path d="M100 6L160 100" />
    </g>
    <g className="zk-piece zk-piece-a" transform="translate(26 92)" stroke={gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="#1c150c">
      <path d="M14 0v11M9 5h10" /><path d="M6 15h16l-3 22H9Z" /><path d="M2 41h24" />
    </g>
    <g className="zk-piece zk-piece-b" transform="translate(148 100)" stroke={gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="#1c150c">
      <circle cx="12" cy="8" r="7" /><path d="M6 18h12l3 20H3Z" /><path d="M0 42h24" />
    </g>
    <path d="M30 200q8-40 46-48h48q38 8 46 48Z" fill="#1c150c" stroke={gold} strokeWidth="3" />
    <path d="M86 152l14 18 14-18Z" fill={PAPER} />
    <path d="M97 162h6l2 22-5 7-5-7Z" fill="#d7ab3f" stroke={INK} strokeWidth="1" />
    <path d="M76 152l24 32 24-32" stroke={gold} strokeWidth="3" fill="none" strokeLinejoin="round" />
    <rect x="88" y="124" width="24" height="30" fill="#d9b888" />
    <path d="M70 84q0-36 30-36t30 36v14q0 28-30 36-30-8-30-36Z" fill="#ecd0a2" stroke={gold} strokeWidth="3" />
    {/* la frange qui retombe sur le front */}
    <path d="M65 94q-7-56 35-56t35 56l-6-19-6 15-8-19-6 17-8-19-8 19-6-17-8 17-4-15Z" fill="#8c6618" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
    <path d="M77 95h17M106 95h17" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    {/* les yeux : mi-clos, ils glissent d'un côté à l'autre et clignent */}
    <g className="zk-eyes">
      <path d="M78 101h16M106 101h16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <g className="zk-iris" fill="#a87d22" stroke={INK} strokeWidth="1.5">
        <circle cx="86" cy="104.5" r="3.6" /><circle cx="114" cy="104.5" r="3.6" />
      </g>
    </g>
    <path d="M93 124h14" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
  </>;
}

/* Répliques Cultes : une bulle de manga qui éclate, ses guillemets, et la réplique qui s'écrit. */
function Repliques({ gold }: { gold: string }) {
  const spikes = Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2;
    const radius = i % 2 ? 68 : 90;
    return `${(100 + Math.cos(angle) * radius).toFixed(1)},${(100 + Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" ");
  return <>
    <polygon className="zk-burst" points={spikes} fill="none" stroke={gold} strokeWidth="2" opacity="0.55" />
    <g className="zk-bubble">
      <path d="M40 54h120q12 0 12 12v52q0 12-12 12h-52l-28 30 5-30H40q-12 0-12-12V66q0-12 12-12Z" fill="#1c150c" stroke={gold} strokeWidth="4" strokeLinejoin="round" />
      <g fill={gold}>
        <path d="M46 112q0-24 19-31l4 8q-9 4-9 12h10v19H46Z" />
        <path d="M78 112q0-24 19-31l4 8q-9 4-9 12h10v19H78Z" />
      </g>
      <g className="zk-lines" stroke={PAPER} strokeWidth="5" strokeLinecap="round">
        <path d="M118 78h36" pathLength="1" /><path d="M118 93h36" pathLength="1" /><path d="M118 108h20" pathLength="1" />
      </g>
    </g>
  </>;
}

const MARKS: Record<string, (gold: string) => ReactNode> = {
  "blind-test-openings": gold => <KillerBee gold={gold} />,
  "liens-ayanokoji": gold => <Ayanokoji gold={gold} />,
  "citations-cultes": gold => <Repliques gold={gold} />,
};

export function EpreuveEmblem({ epreuveId, className = "" }: { epreuveId: string; className?: string }) {
  const id = useId();
  const gold = `url(#${id}-gold)`;
  const mark = MARKS[epreuveId];
  return <svg className={"zk-emblem " + className} viewBox="0 0 200 200" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-gold`} x1="30" y1="10" x2="170" y2="190" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff6d2" />
        <stop offset="0.45" stopColor="#f3d67e" />
        <stop offset="1" stopColor="#a87d22" />
      </linearGradient>
      <radialGradient id={`${id}-night`} cx="0.5" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#2a2012" />
        <stop offset="1" stopColor="#0a0806" />
      </radialGradient>
      <clipPath id={`${id}-clip`}><circle cx="100" cy="100" r="93" /></clipPath>
    </defs>
    <circle cx="100" cy="100" r="93" fill={`url(#${id}-night)`} />
    <g clipPath={`url(#${id}-clip)`}>
      {/* Une épreuve sans logo dédié reçoit une étoile : elle reste identifiable */}
      {mark ? mark(gold) : <path d="M100 44l15 36 39 3-30 25 9 38-33-21-33 21 9-38-30-25 39-3Z" stroke={gold} strokeWidth="5" strokeLinejoin="round" />}
    </g>
    <circle cx="100" cy="100" r="95" stroke={gold} strokeWidth="4" />
    <circle className="zk-emblem-ring" cx="100" cy="100" r="86" stroke={gold} strokeWidth="1.5" strokeDasharray="2 9" opacity="0.7" />
  </svg>;
}
