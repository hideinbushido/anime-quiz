// Logo "Quiz'Animanga" : enseigne d'arcade avec cadre d'ampoules clignotantes
// et joystick, décliné en version compacte (navbar) et géante (écran-titre).

const LOGO_KEYFRAMES = `
  @keyframes qaBulbH { 0% { background-position-x: 0; } 100% { background-position-x: 24px; } }
  @keyframes qaBulbV { 0% { background-position-y: 0; } 100% { background-position-y: 24px; } }
  @keyframes qaBulbPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
  @keyframes qaFlicker { 0%, 18%, 22%, 25%, 52%, 54%, 100% { opacity: 1; } 20%, 24%, 53% { opacity: 0.72; } }
  @keyframes qaWiggle { 0%, 100% { transform: rotate(-8deg); } 50% { transform: rotate(8deg); } }
  @keyframes qaFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
`;

function Joystick({ scale = 1 }: { scale?: number }) {
  const w = 118 * scale;
  const h = 146 * scale;
  return (
    <div style={{ position: "relative", width: w, height: h, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 6 * scale,
          transform: "translateX(-50%)",
          width: 104 * scale,
          height: 36 * scale,
          borderRadius: "50%",
          background: "radial-gradient(60% 100% at 50% 30%, #1b1740, #0a0818)",
          border: `${3 * scale}px solid #21e6ff`,
          boxShadow: "0 0 16px rgba(33,230,255,.6), inset 0 -4px 11px rgba(0,0,0,.6)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 22 * scale,
          transform: "translateX(-50%)",
          width: 62 * scale,
          height: 76 * scale,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "50% 100%",
            animation: "qaWiggle 2.4s ease-in-out infinite",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 0,
              transform: "translateX(-50%)",
              width: 17 * scale,
              height: 60 * scale,
              borderRadius: 9 * scale,
              background: "linear-gradient(#eef0ff,#7b80ad)",
              boxShadow: "0 0 8px rgba(255,255,255,.5)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              transform: "translateX(-50%)",
              width: 56 * scale,
              height: 56 * scale,
              borderRadius: "50%",
              background: "radial-gradient(35% 35% at 38% 30%, #ffd0e8, #ff2d95 58%, #b0135f)",
              boxShadow:
                "0 0 16px #ff2d95, 0 0 34px rgba(255,45,149,.7), inset 0 -7px 14px rgba(0,0,0,.35)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface Props {
  className?: string;
}

export function LogoHeader({ className = "" }: Props) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "10px 18px",
        borderRadius: 14,
        background: "linear-gradient(180deg,#140f33,#0a0818)",
        border: "1px solid rgba(255,45,149,.4)",
        boxShadow:
          "0 0 18px rgba(255,45,149,.25), 0 6px 18px rgba(0,0,0,.4), inset 0 0 24px rgba(0,0,0,.5)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{LOGO_KEYFRAMES}</style>

      <div
        style={{
          position: "absolute",
          left: 11,
          right: 11,
          top: 6,
          height: 7,
          backgroundImage: "radial-gradient(circle, #ffe23d 42%, transparent 46%)",
          backgroundSize: "20px 7px",
          backgroundRepeat: "repeat-x",
          filter: "drop-shadow(0 0 4px #ffe23d)",
          animation: "qaBulbH 1.2s linear infinite, qaBulbPulse 1.6s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 11,
          right: 11,
          bottom: 6,
          height: 7,
          backgroundImage: "radial-gradient(circle, #ffe23d 42%, transparent 46%)",
          backgroundSize: "20px 7px",
          backgroundRepeat: "repeat-x",
          filter: "drop-shadow(0 0 4px #ffe23d)",
          animation:
            "qaBulbH 1.2s linear infinite reverse, qaBulbPulse 1.6s ease-in-out infinite",
        }}
      />

      <Joystick scale={0.42} />

      <div style={{ display: "flex", flexDirection: "column", gap: 1, position: "relative", zIndex: 1 }}>
        <span
          style={{
            fontFamily: "'Press Start 2P'",
            fontSize: 10,
            color: "#21e6ff",
            letterSpacing: 1,
            textShadow: "0 0 5px #21e6ff, 0 0 12px rgba(33,230,255,.5)",
          }}
        >
          QUIZ'
        </span>
        <span
          style={{
            fontFamily: "'Bungee'",
            fontSize: 24,
            lineHeight: 0.95,
            color: "#ff2d95",
            textShadow: "0 2px 0 #7a0d43, 0 0 12px rgba(255,45,149,.7)",
            animation: "qaFlicker 7s infinite",
          }}
        >
          ANIMANGA
        </span>
      </div>
    </div>
  );
}

export function LogoHero({ className = "" }: Props) {
  return (
    <div
      className={"qa-logo-hero" + (className ? ` ${className}` : "")}
      style={{
        position: "relative",
        padding: "40px 52px 34px",
        borderRadius: 22,
        background: "linear-gradient(180deg,#140f33,#0a0818)",
        border: "2px solid rgba(255,45,149,.5)",
        boxShadow:
          "0 0 0 5px rgba(12,10,30,.92), 0 0 34px rgba(255,45,149,.4), 0 24px 60px rgba(0,0,0,.6), inset 0 0 44px rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 32,
      }}
    >
      <style>{LOGO_KEYFRAMES}</style>

      {/* cadre d'ampoules sur les 4 côtés */}
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          top: 10,
          height: 9,
          backgroundImage: "radial-gradient(circle, #ffe23d 42%, transparent 46%)",
          backgroundSize: "24px 9px",
          backgroundRepeat: "repeat-x",
          filter: "drop-shadow(0 0 5px #ffe23d)",
          animation: "qaBulbH 1.2s linear infinite, qaBulbPulse 1.6s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 20,
          right: 20,
          bottom: 10,
          height: 9,
          backgroundImage: "radial-gradient(circle, #ffe23d 42%, transparent 46%)",
          backgroundSize: "24px 9px",
          backgroundRepeat: "repeat-x",
          filter: "drop-shadow(0 0 5px #ffe23d)",
          animation:
            "qaBulbH 1.2s linear infinite reverse, qaBulbPulse 1.6s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          bottom: 20,
          left: 10,
          width: 9,
          backgroundImage: "radial-gradient(circle, #ffe23d 42%, transparent 46%)",
          backgroundSize: "9px 24px",
          backgroundRepeat: "repeat-y",
          filter: "drop-shadow(0 0 5px #ffe23d)",
          animation: "qaBulbV 1.2s linear infinite, qaBulbPulse 1.6s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 20,
          bottom: 20,
          right: 10,
          width: 9,
          backgroundImage: "radial-gradient(circle, #ffe23d 42%, transparent 46%)",
          backgroundSize: "9px 24px",
          backgroundRepeat: "repeat-y",
          filter: "drop-shadow(0 0 5px #ffe23d)",
          animation:
            "qaBulbV 1.2s linear infinite reverse, qaBulbPulse 1.6s ease-in-out infinite",
        }}
      />

      <Joystick />

      <div style={{ display: "flex", flexDirection: "column", gap: 3, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            right: -18,
            top: -40,
            animation: "qaFloat 3s ease-in-out infinite",
          }}
        >
          <div
            style={{
              padding: "9px 16px",
              borderRadius: 16,
              background: "#0a0818",
              border: "2px solid #21e6ff",
              boxShadow: "0 0 12px #21e6ff, 0 0 28px rgba(33,230,255,.5)",
              fontFamily: "'Bungee'",
              fontSize: 24,
              color: "#ffe23d",
              textShadow: "0 0 9px rgba(255,226,61,.8)",
              lineHeight: 1,
            }}
          >
            ?!
          </div>
          <div
            style={{
              position: "absolute",
              left: 18,
              bottom: -9,
              width: 16,
              height: 16,
              background: "#0a0818",
              borderRight: "2px solid #21e6ff",
              borderBottom: "2px solid #21e6ff",
              transform: "rotate(45deg)",
              boxShadow: "3px 3px 9px rgba(33,230,255,.3)",
            }}
          />
        </div>

        <span
          className="qa-quiz-label"
          style={{
            fontFamily: "'Press Start 2P'",
            color: "#21e6ff",
            letterSpacing: 3,
            textShadow: "0 0 7px #21e6ff, 0 0 18px rgba(33,230,255,.6)",
          }}
        >
          QUIZ'
        </span>
        <span
          className="qa-animanga-label"
          style={{
            fontFamily: "'Bungee'",
            lineHeight: 0.92,
            color: "#ff2d95",
            textShadow:
              "0 3px 0 #7a0d43, 0 5px 0 #57082f, 0 8px 14px rgba(0,0,0,.6), 0 0 22px rgba(255,45,149,.8), 0 0 56px rgba(255,45,149,.5)",
            animation: "qaFlicker 7s infinite",
          }}
        >
          ANIMANGA
        </span>
      </div>
    </div>
  );
}
