import { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";

const JAMENDO_CLIENT_ID = "7b8ca424";

// ---------------------------------------------------------------------------
// Search queries — Jamendo will find the closest matching tracks
// Each entry searches by song name; results are real streamable audio
// ---------------------------------------------------------------------------
const SEARCH_QUERIES = [
  // OPM vibes via tags
  { search: "kathang isip",        label: "Kathang Isip style" },
  { search: "bossa nova cafe",     label: "Bossa Nova Cafe" },
  { search: "acoustic love song",  label: "Acoustic Love" },
  { search: "chill lofi beats",    label: "Chill Lo-Fi" },
  { search: "romantic piano",      label: "Romantic Piano" },
  { search: "indie folk guitar",   label: "Indie Folk Guitar" },
  { search: "soft pop ballad",     label: "Soft Pop Ballad" },
  { search: "summer vibes pop",    label: "Summer Vibes" },
  { search: "coffee shop music",   label: "Coffee Shop" },
  { search: "relaxing jazz",       label: "Relaxing Jazz" },
];

// Genre playlists using Jamendo tags
const GENRE_PLAYLISTS = [
  { label: "Chill OPM Vibes", tags: "pop+acoustic+love",      search: "" },
  { label: "Café Lounge",      tags: "lounge+jazz+cafe",        search: "" },
  { label: "Acoustic Feels",   tags: "acoustic+folk+singer",   search: "" },
  { label: "Lo-Fi Study",      tags: "lofi+chill+relax",       search: "" },
  { label: "Romantic",         tags: "romantic+love+ballad",   search: "" },
];

async function fetchByTags(tags, limit = 30) {
  try {
    const url =
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}` +
      `&format=json&limit=${limit}&fuzzytags=${tags}` +
      `&audioformat=mp32&boost=popularity_total&include=musicinfo&imagesize=100`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || [])
      .filter((t) => t.audio)
      .map((t) => ({
        id: t.id,
        title: t.name,
        artist: t.artist_name,
        src: t.audio,
        cover: t.album_image || null,
        duration: Number(t.duration) || 0,
      }));
  } catch (e) {
    console.error("Jamendo fetch failed", e);
    return [];
  }
}

async function searchTracks(query, limit = 30) {
  try {
    const url =
      `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}` +
      `&format=json&limit=${limit}&namesearch=${encodeURIComponent(query)}` +
      `&audioformat=mp32&include=musicinfo&imagesize=100`;
    const res = await fetch(url);
    const data = await res.json();
    return (data.results || [])
      .filter((t) => t.audio)
      .map((t) => ({
        id: t.id,
        title: t.name,
        artist: t.artist_name,
        src: t.audio,
        cover: t.album_image || null,
        duration: Number(t.duration) || 0,
      }));
  } catch (e) {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const MusicContext = createContext(null);
export const useMusic = () => useContext(MusicContext);

export function MusicProvider({ children }) {
  const audioRef        = useRef(new Audio());
  const [tracks, setTracks]         = useState([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [volume, setVolumeState]    = useState(70);
  const [progress, setProgress]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const [loading, setLoading]       = useState(true);
  const [genreIndex, setGenreIndex] = useState(0);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery]     = useState("");
  const [searching, setSearching]         = useState(false);

  const track = tracks[trackIndex] || null;

  // Setup audio element events once
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume / 100;

    const onPlay    = () => setIsPlaying(true);
    const onPause   = () => setIsPlaying(false);
    const onEnded   = () => skipNext(true);
    const onTime    = () => setProgress(audio.currentTime);
    const onMeta    = () => setDuration(audio.duration || 0);
    const onError   = () => {
      console.warn("Audio error — skipping track");
      skipNext(true);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
  }, []);

  // Load genre playlist
  useEffect(() => {
    setLoading(true);
    fetchByTags(GENRE_PLAYLISTS[genreIndex].tags).then((result) => {
      setTracks(result);
      setTrackIndex(0);
      setLoading(false);
      // Don't autoplay on genre switch unless already playing
    });
  }, [genreIndex]);

  // When trackIndex or tracks change, load the new src
  useEffect(() => {
    const t = tracks[trackIndex];
    if (!t?.src) return;
    const audio = audioRef.current;
    const wasPlaying = isPlaying;
    audio.pause();
    audio.src = t.src;
    audio.load();
    setProgress(0);
    setDuration(0);
    if (wasPlaying) {
      audio.play().catch(console.error);
    }
  }, [trackIndex, tracks]);

  // skipNext defined outside useEffect to avoid stale closure
  function skipNext(autoplay = false) {
    setTrackIndex((i) => {
      const next = (i + 1) % (tracks.length || 1);
      const t = tracks[next];
      if (t?.src) {
        const audio = audioRef.current;
        audio.src = t.src;
        audio.load();
        if (autoplay) audio.play().catch(console.error);
      }
      return next;
    });
  }

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPlaying]);

  const goTo = useCallback((index, list = null, autoplay = true) => {
    const targetList = list || tracks;
    const t = targetList[index];
    if (list) setTracks(list);
    setTrackIndex(index);
    const audio = audioRef.current;
    audio.pause();
    audio.src = t.src;
    audio.load();
    setProgress(0);
    if (autoplay) {
      audio.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [tracks]);

  const prev = useCallback(() => {
    setTrackIndex((i) => {
      const next = (i - 1 + tracks.length) % tracks.length;
      const t = tracks[next];
      const audio = audioRef.current;
      audio.src = t.src;
      audio.load();
      audio.play().catch(console.error);
      return next;
    });
  }, [tracks]);

  const next = useCallback(() => {
    setTrackIndex((i) => {
      const n = (i + 1) % tracks.length;
      const t = tracks[n];
      const audio = audioRef.current;
      audio.src = t.src;
      audio.load();
      audio.play().catch(console.error);
      return n;
    });
  }, [tracks]);

  const setVolume = useCallback((v) => {
    setVolumeState(v);
    audioRef.current.volume = v / 100;
  }, []);

  const seek = useCallback((pct) => {
    const audio = audioRef.current;
    if (!audio.duration) return;
    audio.currentTime = (pct / 100) * audio.duration;
    setProgress(audio.currentTime);
  }, []);

  const stopMusic = useCallback(() => {
    audioRef.current.pause();
    audioRef.current.src = "";
    setIsPlaying(false);
  }, []);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchTracks(q);
    setSearchResults(results);
    setSearching(false);
  }, []);

  const switchGenre = useCallback((i) => {
    setGenreIndex(i);
    setSearchQuery("");
    setSearchResults([]);
  }, []);

  return (
    <MusicContext.Provider value={{
      tracks, track, trackIndex, isPlaying, volume, progress, duration,
      loading, genreIndex, genres: GENRE_PLAYLISTS,
      searchResults, searchQuery, searching,
      togglePlay, goTo, prev, next, setVolume, seek,
      stopMusic, handleSearch, switchGenre,
    }}>
      {children}
    </MusicContext.Provider>
  );
}