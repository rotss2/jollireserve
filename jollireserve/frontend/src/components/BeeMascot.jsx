// Beemascot.jsx — animated bee mascot that reacts to queue position
// Props: position (number, 1-based), status ("waiting"|"called"|"seated")

export default function Beemascot({ position, status }) {
  const isNext    = position === 1;
  const isCalled  = status === "called";
  const isSeated  = status === "seated";

  // Mood based on position
  const mood = isCalled || isSeated ? "excited"
    : isNext ? "happy"
    : position <= 3 ? "patient"
    : "sleepy";

  const messages = {
    excited: ["Your table is ready! 🎉", "Come on down! 🍔", "Buzz buzz, let's go! 🐝"],
    happy:   ["You're next! Almost there!", "Just one more moment! 🌟", "Get ready! 🎯"],
    patient: ["Almost your turn!", "Hanging in there! 🍟", "Worth the wait! ✨"],
    sleepy:  ["Just a little longer…", "Good things take time! 🍔", "We're buzzing to serve you! 🐝"],
  };

  const msg = messages[mood][Math.floor(Date.now() / 5000) % messages[mood].length];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "0.8rem",
      padding: "1.5rem 1rem",
      userSelect: "none",
    }}>
      {/* SVG Bee Mascot */}
      <div style={{
        animation: isCalled ? "beeDance 0.4s ease infinite alternate"
          : isNext ? "beeHop 0.8s ease infinite"
          : mood === "sleepy" ? "beeSway 3s ease infinite"
          : "beeFloat 2.5s ease infinite",
        fontSize: "0",
        lineHeight: 0,
      }}>
        <svg width="100" height="110" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Wings */}
          <ellipse cx="28" cy="38" rx="18" ry="10"
            fill="rgba(200,220,255,0.6)"
            stroke="rgba(150,180,255,0.4)" strokeWidth="1"
            style={{ animation: "wingFlap 0.2s ease infinite alternate", transformOrigin: "40px 38px" }}
          />
          <ellipse cx="72" cy="38" rx="18" ry="10"
            fill="rgba(200,220,255,0.6)"
            stroke="rgba(150,180,255,0.4)" strokeWidth="1"
            style={{ animation: "wingFlap 0.2s ease infinite alternate-reverse", transformOrigin: "60px 38px" }}
          />

          {/* Body */}
          <ellipse cx="50" cy="62" rx="22" ry="28" fill="#f0c93a" />
          {/* Stripes */}
          <rect x="28" y="58" width="44" height="7" rx="2" fill="#1a0a08" opacity="0.7" />
          <rect x="28" y="70" width="44" height="7" rx="2" fill="#1a0a08" opacity="0.7" />

          {/* Head */}
          <circle cx="50" cy="32" r="18" fill="#f0c93a" />
          {/* Antenna left */}
          <line x1="42" y1="15" x2="35" y2="4" stroke="#1a0a08" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="34" cy="3" r="3" fill="#e8352a" />
          {/* Antenna right */}
          <line x1="58" y1="15" x2="65" y2="4" stroke="#1a0a08" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="66" cy="3" r="3" fill="#e8352a" />

          {/* Eyes */}
          {isCalled || isNext ? (
            // Happy eyes (^ ^)
            <>
              <path d="M38 30 Q41 26 44 30" stroke="#1a0a08" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              <path d="M56 30 Q59 26 62 30" stroke="#1a0a08" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            </>
          ) : mood === "sleepy" ? (
            // Sleepy eyes (- -)
            <>
              <line x1="37" y1="30" x2="44" y2="30" stroke="#1a0a08" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="56" y1="30" x2="63" y2="30" stroke="#1a0a08" strokeWidth="2.5" strokeLinecap="round"/>
              {/* Zzz */}
              <text x="68" y="25" fontSize="8" fill="rgba(100,80,60,0.6)" fontFamily="sans-serif">z</text>
              <text x="73" y="18" fontSize="10" fill="rgba(100,80,60,0.4)" fontFamily="sans-serif">z</text>
            </>
          ) : (
            // Normal eyes (• •)
            <>
              <circle cx="41" cy="30" r="4" fill="#1a0a08"/>
              <circle cx="59" cy="30" r="4" fill="#1a0a08"/>
              <circle cx="42" cy="29" r="1.5" fill="white"/>
              <circle cx="60" cy="29" r="1.5" fill="white"/>
            </>
          )}

          {/* Smile */}
          {isCalled ? (
            <path d="M40 40 Q50 48 60 40" stroke="#1a0a08" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          ) : mood === "sleepy" ? (
            <path d="M42 40 Q50 38 58 40" stroke="#1a0a08" strokeWidth="2" strokeLinecap="round" fill="none"/>
          ) : (
            <path d="M41 40 Q50 46 59 40" stroke="#1a0a08" strokeWidth="2" strokeLinecap="round" fill="none"/>
          )}

          {/* Cheeks when happy */}
          {(isCalled || isNext) && (
            <>
              <ellipse cx="34" cy="37" rx="5" ry="3" fill="rgba(232,100,80,0.3)"/>
              <ellipse cx="66" cy="37" rx="5" ry="3" fill="rgba(232,100,80,0.3)"/>
            </>
          )}

          {/* Little legs */}
          <line x1="34" y1="75" x2="26" y2="88" stroke="#1a0a08" strokeWidth="2" strokeLinecap="round"/>
          <line x1="38" y1="80" x2="30" y2="92" stroke="#1a0a08" strokeWidth="2" strokeLinecap="round"/>
          <line x1="66" y1="75" x2="74" y2="88" stroke="#1a0a08" strokeWidth="2" strokeLinecap="round"/>
          <line x1="62" y1="80" x2="70" y2="92" stroke="#1a0a08" strokeWidth="2" strokeLinecap="round"/>

          {/* Crown for #1 */}
          {isNext && !isCalled && (
            <g transform="translate(32, -2)">
              <polygon points="18,0 14,10 8,4 10,14 26,14 28,4 22,10" fill="#f0c93a" stroke="#e8a000" strokeWidth="1"/>
            </g>
          )}
        </svg>
      </div>

      {/* Speech bubble */}
      <div style={{
        background: "var(--bg-card, rgba(255,255,255,0.8))",
        border: "1.5px solid var(--border, rgba(0,0,0,0.1))",
        borderRadius: "1rem",
        padding: "0.5rem 1rem",
        fontSize: "0.82rem",
        fontWeight: 600,
        color: "var(--text-main, #1a0a08)",
        textAlign: "center",
        maxWidth: "180px",
        position: "relative",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}>
        {msg}
        {/* Bubble tail */}
        <div style={{
          position: "absolute",
          top: "-8px", left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderBottom: "8px solid var(--border, rgba(0,0,0,0.1))",
        }}/>
        <div style={{
          position: "absolute",
          top: "-6px", left: "50%",
          transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderBottom: "7px solid var(--bg-card, rgba(255,255,255,0.8))",
        }}/>
      </div>

      <style>{`
        @keyframes beeFloat {
          0%,100% { transform: translateY(0px) rotate(-2deg); }
          50%      { transform: translateY(-8px) rotate(2deg); }
        }
        @keyframes beeHop {
          0%,100% { transform: translateY(0px) scale(1); }
          40%      { transform: translateY(-12px) scale(1.05); }
        }
        @keyframes beeDance {
          0%   { transform: rotate(-8deg) scale(1.05); }
          100% { transform: rotate(8deg) scale(1.1); }
        }
        @keyframes beeSway {
          0%,100% { transform: rotate(-3deg); }
          50%      { transform: rotate(3deg); }
        }
        @keyframes wingFlap {
          0%   { transform: scaleY(1); }
          100% { transform: scaleY(0.6); }
        }
      `}</style>
    </div>
  );
}