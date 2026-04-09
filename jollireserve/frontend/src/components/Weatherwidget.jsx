import { useEffect, useState } from "react";

const LAT  = 9.7322;
const LON  = 118.7371;
const CITY = "Puerto Princesa";

const WMO = {
  0:  { label: "Clear Sky",     icon: "☀️" },
  1:  { label: "Mainly Clear",  icon: "🌤️" },
  2:  { label: "Partly Cloudy", icon: "⛅" },
  3:  { label: "Overcast",      icon: "☁️" },
  45: { label: "Foggy",         icon: "🌫️" },
  48: { label: "Icy Fog",       icon: "🌫️" },
  51: { label: "Drizzle",       icon: "🌦️" },
  53: { label: "Drizzle",       icon: "🌦️" },
  55: { label: "Heavy Drizzle", icon: "🌧️" },
  61: { label: "Light Rain",    icon: "🌧️" },
  63: { label: "Rain",          icon: "🌧️" },
  65: { label: "Heavy Rain",    icon: "🌧️" },
  80: { label: "Showers",       icon: "🌦️" },
  81: { label: "Showers",       icon: "🌧️" },
  82: { label: "Heavy Showers", icon: "⛈️" },
  95: { label: "Thunderstorm",  icon: "⛈️" },
  99: { label: "Hail Storm",    icon: "⛈️" },
};

export default function WeatherWidget() {
  const [w, setW]       = useState(null);
  const [error, setErr] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,weathercode,windspeed_10m&timezone=Asia%2FManila`;
        const res  = await fetch(url);
        const data = await res.json();
        const c    = data.current;
        setW({
          temp:     Math.round(c.temperature_2m),
          humidity: c.relative_humidity_2m,
          wind:     Math.round(c.windspeed_10m),
          code:     c.weathercode,
        });
      } catch { setErr(true); }
    }
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (error) return null;
  const info = w ? (WMO[w.code] || { label: "—", icon: "🌡️" }) : null;
  const outdoorOk = w ? (w.code <= 2 && w.temp >= 22 && w.temp <= 34) : null;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.2rem", minWidth:"10rem" }}>
      {!w ? (
        <div style={{ color:"rgba(255,255,255,0.2)", fontSize:"0.7rem", letterSpacing:"0.1em" }}>Loading…</div>
      ) : (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:"0.45rem" }}>
            <span style={{ fontSize:"1.5rem", lineHeight:1 }}>{info.icon}</span>
            <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:"2rem", color:"#fff", lineHeight:1, letterSpacing:"0.04em" }}>
              {w.temp}°C
            </span>
          </div>
          <div style={{ fontSize:"0.68rem", color:"rgba(255,255,255,0.45)", letterSpacing:"0.1em", textTransform:"uppercase" }}>
            {info.label} · {CITY}
          </div>
          <div style={{ fontSize:"0.62rem", color:"rgba(255,255,255,0.3)", letterSpacing:"0.07em" }}>
            💧 {w.humidity}% &nbsp;·&nbsp; 💨 {w.wind} km/h
          </div>
          <div style={{
            marginTop:"0.25rem", fontSize:"0.62rem", fontWeight:700,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color: outdoorOk ? "#4ade80" : "#fbbf24",
            border:`1px solid ${outdoorOk ? "rgba(74,222,128,0.3)" : "rgba(251,191,36,0.3)"}`,
            padding:"0.18rem 0.6rem", borderRadius:"999px",
          }}>
            {outdoorOk ? "✓ Outdoor: Good" : "⚠ Outdoor: Check"}
          </div>
        </>
      )}
    </div>
  );
}