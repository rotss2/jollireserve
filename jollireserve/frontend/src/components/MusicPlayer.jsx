import { useState, useRef, useEffect } from "react";
import { useMusic } from "../context/MusicContext";

export function getMusicState() { return {}; }
export function subscribeMusicState() { return () => {}; }

function fmt(s) {
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

const ctrlBtn = {
  background: "transparent", border: "none", color: "#fff",
  fontSize: "1rem", cursor: "pointer", width: 34, height: 34,
  borderRadius: "50%", display: "flex", alignItems: "center",
  justifyContent: "center", opacity: 0.85,
};

function TrackRow({ track, index, active, playing, onPlay }) {
  return (
    <button onClick={onPlay} style={{
      width: "100%", display: "flex", alignItems: "center", gap: "0.65rem",
      padding: "0.4rem 1rem", border: "none", cursor: "pointer", textAlign: "left",
      background: active ? "rgba(232,53,42,0.15)" : "transparent",
      transition: "background 0.12s",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "0.35rem", flexShrink: 0,
        background: track.cover ? `url(${track.cover}) center/cover no-repeat` : (active ? "#e8352a" : "rgba(255,255,255,0.07)"),
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "0.65rem", color: "#fff", fontWeight: 700,
      }}>
        {!track.cover && (playing ? "▶" : index + 1)}
      </div>
      <div style={{ overflow: "hidden", flex: 1 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: active ? 700 : 500, color: active ? "#ff7b6b" : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {track.title}
        </div>
        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.32)", marginTop: "0.05rem" }}>
          {track.artist}
        </div>
      </div>
      {active && playing && (
        <span style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 10, flexShrink: 0 }}>
          {[1, 2, 3].map((i) => (
            <span key={i} style={{ width: 2.5, borderRadius: 2, background: "#e8352a", display: "block", animation: `bar${i} 0.5s ease-in-out ${i * 0.12}s infinite alternate` }} />
          ))}
        </span>
      )}
    </button>
  );
}

export default function MusicPlayer() {
  const music = useMusic();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("playlist");
  const [pos, setPos] = useState({ x: window.innerWidth - 72, y: window.innerHeight - 80 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  function onMouseDown(e) {
    dragging.current = true;
    hasDragged.current = false;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }

  function onTouchStart(e) {
    dragging.current = true;
    hasDragged.current = false;
    const t = e.touches[0];
    dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging.current) return;
      hasDragged.current = true;
      setPos({
        x: Math.min(Math.max(e.clientX - dragOffset.current.x, 0), window.innerWidth - 56),
        y: Math.min(Math.max(e.clientY - dragOffset.current.y, 0), window.innerHeight - 56),
      });
    }
    function onTouchMove(e) {
      if (!dragging.current) return;
      hasDragged.current = true;
      const t = e.touches[0];
      setPos({
        x: Math.min(Math.max(t.clientX - dragOffset.current.x, 0), window.innerWidth - 56),
        y: Math.min(Math.max(t.clientY - dragOffset.current.y, 0), window.innerHeight - 56),
      });
      e.preventDefault();
    }
    function onEnd() { dragging.current = false; }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  function handleClick() {
    if (!hasDragged.current) setOpen((o) => !o);
  }

  if (!music) return null;

  const { tracks, track, trackIndex, isPlaying, volume, progress, duration, loading, genreIndex, genres, searchResults, searchQuery, searching, togglePlay, goTo, prev, next, setVolume, seek, handleSearch, switchGenre } = music;
  const pct = duration ? (progress / duration) * 100 : 0;

  const cardWidth = Math.min(320, window.innerWidth - 16);
  const cardLeft = Math.min(Math.max(pos.x - cardWidth + 56, 8), window.innerWidth - cardWidth - 8);
  const spaceBelow = window.innerHeight - pos.y - 56;
  const cardTop = spaceBelow > 500 ? pos.y + 60 : pos.y - 520;

  return (
    <>
      <style>{`
        @keyframes bar1{from{height:3px}to{height:12px}}
        @keyframes bar2{from{height:8px}to{height:3px}}
        @keyframes bar3{from{height:12px}to{height:5px}}
        @keyframes mp-in{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}
        .mp-scroll::-webkit-scrollbar{width:4px}
        .mp-scroll::-webkit-scrollbar-track{background:transparent}
        .mp-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
      `}</style>

      {/* Floating draggable button */}
      <div
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={handleClick}
        style={{
          position: "fixed",
          left: pos.x,
          top: pos.y,
          zIndex: 99999,
          width: 54,
          height: 54,
          borderRadius: "50%",
          background: isPlaying ? "linear-gradient(135deg,#b01209,#e8352a)" : "#1a1a1a",
          border: `2.5px solid ${isPlaying ? "rgba(232,53,42,0.7)" : "rgba(255,255,255,0.2)"}`,
          boxShadow: isPlaying ? "0 4px 24px rgba(232,53,42,0.55),0 2px 10px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.6)",
          cursor: "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {isPlaying ? (
          <span style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 16 }}>
            {[1, 2, 3].map((i) => (
              <span key={i} style={{ width: 3, borderRadius: 2, background: "#fff", display: "block", animation: `bar${i} 0.5s ease-in-out ${i * 0.12}s infinite alternate` }} />
            ))}
          </span>
        ) : (
          <span style={{ fontSize: "1.4rem", lineHeight: 1 }}>🎵</span>
        )}
      </div>

      {/* Backdrop */}
      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 99997 }} />}

      {/* Expanded card */}
      {open && (
        <div onClick={(e) => e.stopPropagation()} style={{
          position: "fixed",
          left: cardLeft,
          top: Math.max(8, cardTop),
          width: cardWidth,
          background: "#0f172a",
          borderRadius: "1.3rem",
          boxShadow: "0 20px 64px rgba(0,0,0,0.85)",
          zIndex: 99998,
          color: "#fff",
          overflow: "hidden",
          fontFamily: "'DM Sans',system-ui,sans-serif",
          animation: "mp-in 0.2s ease forwards",
          maxHeight: "85vh",
          overflowY: "auto",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.65rem 1rem 0" }}>
            <span style={{ fontSize: "0.65rem", opacity: 0.4, letterSpacing: "0.1em", textTransform: "uppercase" }}>Music Player</span>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>

          {/* Now playing */}
          <div style={{ background: "linear-gradient(135deg,#b01209,#e8352a)", padding: "0.85rem 1.1rem 1rem", margin: "0.5rem 0.6rem", borderRadius: "1rem" }}>
            <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", marginBottom: "0.8rem" }}>
              <div style={{ width: 48, height: 48, borderRadius: "0.6rem", flexShrink: 0, background: track?.cover ? `url(${track.cover}) center/cover no-repeat` : "rgba(255,255,255,0.15)", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>
                {!track?.cover && "🎵"}
              </div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.6, marginBottom: "0.2rem" }}>Now Playing · {genres[genreIndex]?.label}</div>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{loading ? "Loading…" : (track?.title || "—")}</div>
                <div style={{ fontSize: "0.68rem", opacity: 0.7, marginTop: "0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track?.artist || "—"}</div>
              </div>
            </div>
            <input type="range" min={0} max={100} value={pct} onChange={(e) => seek(Number(e.target.value))} style={{ width: "100%", accentColor: "#fff", cursor: "pointer", height: 3, marginBottom: "0.2rem" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", opacity: 0.55, marginBottom: "0.7rem" }}>
              <span>{fmt(progress)}</span><span>{fmt(duration)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.9rem", marginBottom: "0.75rem" }}>
              <button onClick={prev} style={ctrlBtn}>⏮</button>
              <button onClick={togglePlay} disabled={loading || !track} style={{ ...ctrlBtn, width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.2)", fontSize: "1.1rem", cursor: (loading || !track) ? "not-allowed" : "pointer" }}>
                {loading ? "⏳" : isPlaying ? "⏸" : "▶"}
              </button>
              <button onClick={next} style={ctrlBtn}>⏭</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.72rem", opacity: 0.5 }}>🔈</span>
              <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ flex: 1, accentColor: "#fff", cursor: "pointer", height: 3 }} />
              <span style={{ fontSize: "0.72rem", opacity: 0.5 }}>🔊</span>
            </div>
          </div>

          {/* Genre pills */}
          <div style={{ display: "flex", gap: "0.35rem", padding: "0.5rem 0.9rem", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {genres.map((g, i) => (
              <button key={i} onClick={() => switchGenre(i)} style={{ fontSize: "0.63rem", fontWeight: 700, padding: "0.2rem 0.65rem", borderRadius: 999, border: "1px solid", cursor: "pointer", background: genreIndex === i ? "#e8352a" : "transparent", borderColor: genreIndex === i ? "#e8352a" : "rgba(255,255,255,0.15)", color: genreIndex === i ? "#fff" : "rgba(255,255,255,0.4)" }}>
                {g.label}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            {[["playlist", "🎼 Playlist"], ["search", "🔍 Search"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "0.5rem 0", fontSize: "0.7rem", fontWeight: 700, background: "transparent", border: "none", cursor: "pointer", color: tab === key ? "#e8352a" : "rgba(255,255,255,0.3)", borderBottom: `2px solid ${tab === key ? "#e8352a" : "transparent"}` }}>
                {label}
              </button>
            ))}
          </div>

          {tab === "search" && (
            <div style={{ padding: "0.7rem 0.9rem" }}>
              <input autoFocus placeholder="Search any song or artist…" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                style={{ width: "100%", padding: "0.45rem 0.75rem", borderRadius: "0.6rem", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.07)", color: "#fff", fontSize: "0.78rem", outline: "none", boxSizing: "border-box" }} />
              <div className="mp-scroll" style={{ marginTop: "0.4rem", maxHeight: 200, overflowY: "auto" }}>
                {searching && <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", textAlign: "center", padding: "1rem 0" }}>Searching…</div>}
                {!searching && searchQuery && !searchResults.length && <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.72rem", textAlign: "center", padding: "1rem 0" }}>No results found</div>}
                {searchResults.map((t, i) => <TrackRow key={t.id} track={t} index={i} active={track?.id === t.id} playing={isPlaying && track?.id === t.id} onPlay={() => goTo(i, searchResults, true)} />)}
              </div>
            </div>
          )}

          {tab === "playlist" && (
            <div className="mp-scroll" style={{ maxHeight: 220, overflowY: "auto", paddingBottom: "0.5rem" }}>
              {loading
                ? <div style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.72rem", textAlign: "center", padding: "2rem 0" }}>Loading tracks…</div>
                : tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} active={track?.id === t.id} playing={isPlaying && track?.id === t.id} onPlay={() => goTo(i, null, true)} />)
              }
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: "0.58rem", color: "rgba(255,255,255,0.15)", padding: "0.4rem 0" }}>
            {!loading && `${trackIndex + 1} / ${tracks.length} tracks · Powered by Jamendo`}
          </div>
        </div>
      )}
    </>
  );
}