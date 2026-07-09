interface Props {
  epreuveId: string;
  className?: string;
}

export function EpreuveLogoDisplay({ epreuveId, className = "" }: Props) {
  // Logo "Les Beats de Killer Bee" - Design exact du fichier original, mis a l'echelle
  // via viewBox pour tenir dans le cadre de la tuile.
  if (epreuveId === "blind-test-openings") {
    return (
      <div className={`logo-display logo-beats ${className}`}>
        <style>{`
          @keyframes eqbounce {
            0%,100%{transform:scaleY(.34)}
            50%{transform:scaleY(1)}
          }
          @keyframes floaty {
            0%,100%{transform:translateY(0)}
            50%{transform:translateY(-9px)}
          }
          @keyframes glowpulse {
            0%,100%{opacity:.5}
            50%{opacity:.95}
          }
          .beats-logo-svg {
            filter: drop-shadow(0 0 12px rgba(230, 32, 46, 0.4));
          }
          .beats-logo-svg [style*="eqbounce"],
          .beats-logo-svg .beats-eq-bar {
            transform-box: fill-box;
            transform-origin: bottom;
          }
          .beats-logo-svg .beats-note {
            transform-box: fill-box;
            transform-origin: center;
          }
        `}</style>

        <svg
          className="beats-logo-svg"
          width="100%"
          height="100%"
          viewBox="0 0 620 440"
          fill="none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <radialGradient id="beatsGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(230,32,46,.32)" />
              <stop offset="72%" stopColor="rgba(230,32,46,0)" />
            </radialGradient>
            <linearGradient id="beatGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="45%" stopColor="#ff5a63" />
              <stop offset="100%" stopColor="#e6202e" />
            </linearGradient>
            <filter id="beatsBlur" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* glow d'ambiance */}
          <ellipse
            cx="323"
            cy="207"
            rx="260"
            ry="165"
            fill="url(#beatsGlow)"
            filter="url(#beatsBlur)"
            style={{ animation: "glowpulse 3.2s ease-in-out infinite" }}
          />

          {/* notes de musique */}
          <g
            className="beats-note"
            fill="#e6202e"
            stroke="#fff"
            strokeWidth="2"
            style={{ animation: "floaty 3.4s ease-in-out infinite" }}
          >
            <ellipse cx="558" cy="40" rx="9" ry="7" />
            <rect x="565" y="14" width="4" height="27" rx="2" />
            <path d="M565 14 C574 16 578 20 578 28 C573 23 569 23 565 24 Z" />
          </g>
          <g
            className="beats-note"
            fill="#d7dae0"
            stroke="#fff"
            strokeWidth="2"
            opacity="0.85"
            style={{
              animation: "floaty 4.1s ease-in-out -.6s infinite",
              transform: "scale(.66)",
              transformOrigin: "516px 102px",
            }}
          >
            <ellipse cx="526" cy="102" rx="9" ry="7" />
            <rect x="533" y="76" width="4" height="27" rx="2" />
            <path d="M533 76 C542 78 546 82 546 90 C541 85 537 85 533 86 Z" />
          </g>

          {/* barres d'egaliseur */}
          <g style={{ filter: "drop-shadow(0 0 10px rgba(230,32,46,.55))" }}>
            {[
              { x: 22, h: 77, dur: ".82s", delay: "0s" },
              { x: 43, h: 114.8, dur: ".95s", delay: "-.2s" },
              { x: 64, h: 140, dur: ".74s", delay: "-.45s" },
              { x: 85, h: 98, dur: "1.05s", delay: "-.6s" },
              { x: 106, h: 128.8, dur: ".88s", delay: "-.3s" },
              { x: 127, h: 84, dur: "1.0s", delay: "-.7s" },
              { x: 148, h: 119, dur: ".9s", delay: "-.5s" },
              { x: 169, h: 70, dur: ".78s", delay: "-.15s" },
            ].map((bar, i) => (
              <rect
                key={i}
                className="beats-eq-bar"
                x={bar.x}
                y={308 - bar.h}
                width="13"
                height={bar.h}
                rx="5"
                fill="url(#beatGradient)"
                style={{
                  animation: `eqbounce ${bar.dur} ease-in-out ${bar.delay} infinite`,
                }}
              />
            ))}
          </g>

          {/* lockup texte "Les BEATS de KILLER BEE" - via foreignObject pour garder */}
          {/* le rendu exact (degrade texte, ombres multiples, polices, skew)      */}
          <foreignObject x="0" y="0" width="620" height="440">
            <div
              // @ts-expect-error xmlns requis pour le rendu HTML dans foreignObject
              xmlns="http://www.w3.org/1999/xhtml"
              style={{ position: "relative", width: "620px", height: "440px" }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "52%",
                  top: "50%",
                  transform: "translate(-50%,-50%) rotate(-3deg)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    alignSelf: "flex-start",
                    marginLeft: 28,
                    marginBottom: -4,
                    fontFamily: "'Permanent Marker',cursive",
                    fontSize: 44,
                    color: "#fff",
                    transform: "rotate(-7deg)",
                    textShadow: "2px 3px 0 #a5121c, 0 0 14px rgba(230,32,46,.5)",
                  }}
                >
                  Les
                </div>
                <div
                  style={{
                    fontFamily: "'Bungee',sans-serif",
                    fontSize: 138,
                    lineHeight: 0.86,
                    letterSpacing: 2,
                    transform: "skewX(-6deg)",
                    background:
                      "linear-gradient(180deg,#ffffff 0%,#ffffff 40%,#b7bcc6 52%,#eef0f3 66%,#ffffff 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    WebkitTextStroke: "2.5px #14141b",
                    textShadow:
                      "2px 2px 0 #e6202e,4px 4px 0 #c11a26,6px 6px 0 #a5121c,8px 8px 0 #7a0f18,10px 10px 0 #5e0a12,10px 14px 20px rgba(0,0,0,.5),0 0 30px rgba(255,70,80,.35)",
                  }}
                >
                  BEATS
                </div>
                <div
                  style={{
                    position: "relative",
                    marginTop: 12,
                    transform: "skewX(-6deg)",
                    background: "linear-gradient(180deg,#ff3b46,#c11a26)",
                    border: "2px solid #fff",
                    borderRadius: 6,
                    padding: "6px 24px",
                    boxShadow: "0 8px 18px rgba(0,0,0,.45), 0 0 18px rgba(230,32,46,.4)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      transform: "skewX(6deg)",
                      fontFamily: "'Anton',sans-serif",
                      fontSize: 32,
                      letterSpacing: 2,
                      color: "#fff",
                      textShadow: "2px 2px 0 #7a0f18",
                    }}
                  >
                    de KILLER BEE
                  </span>
                  <div
                    style={{
                      position: "absolute",
                      left: 28,
                      bottom: -13,
                      width: 8,
                      height: 16,
                      borderRadius: "0 0 5px 5px",
                      background: "linear-gradient(#c11a26,#7a0f18)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      right: 44,
                      bottom: -19,
                      width: 7,
                      height: 22,
                      borderRadius: "0 0 5px 5px",
                      background: "linear-gradient(#c11a26,#7a0f18)",
                    }}
                  />
                </div>
              </div>
            </div>
          </foreignObject>

          {/* lunettes de soleil posees sur "BEATS" */}
          <svg
            x="236"
            y="104"
            width="172"
            height="58"
            viewBox="0 0 190 64"
            fill="none"
            style={{ transform: "rotate(-9deg)", transformOrigin: "86px 29px" }}
          >
            <rect x="8" y="6" width="174" height="9" rx="4.5" fill="#e6202e" />
            <path
              d="M10 16 H86 L80 46 C78 55 70 58 60 58 H34 C22 58 16 50 14 40 L10 16 Z"
              fill="#0d0d12"
              stroke="#ffffff"
              strokeWidth="3"
            />
            <path
              d="M104 16 H180 L176 40 C174 50 168 58 156 58 H130 C120 58 112 55 110 46 L104 16 Z"
              fill="#0d0d12"
              stroke="#ffffff"
              strokeWidth="3"
            />
            <rect x="86" y="18" width="18" height="7" rx="3" fill="#e6202e" />
            <path
              d="M22 22 L40 48"
              stroke="rgba(255,255,255,.5)"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M118 22 L134 46"
              stroke="rgba(255,255,255,.42)"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </svg>
      </div>
    );
  }

  // Logo par défaut (emoji)
  const logos: { [key: string]: string } = {
    "citations-cultes": "💬",
    "liens-ayanokoji": "♟",
  };

  return (
    <div className={`logo-display ${className}`}>
      {logos[epreuveId] || "🎧"}
    </div>
  );
}
