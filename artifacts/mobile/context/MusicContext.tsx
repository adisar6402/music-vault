import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio, AVPlaybackStatus } from "expo-av";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import {
  deleteAudioFile,
  getPlayableUri,
  parseFilename,
  pickAudioFiles,
  storeAudioFile,
} from "@/lib/audioStorage";
import { getGradientColors } from "@/lib/gradients";
import { WebAudioPlayer } from "@/lib/webAudio";

export type Mood = "all" | "chill" | "focus" | "workout" | "sleep";
export type RepeatMode = "none" | "one" | "all";

export interface Song {
  id: string;
  title: string;
  artist: string;
  uri: string;
  duration: number;
  favorite: boolean;
  addedAt: number;
  mood: Mood | null;
  gradientColors: [string, string];
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const SLEEP_OPTIONS = [15, 30, 45, 60];

interface MusicContextType {
  songs: Song[];
  playlists: Playlist[];
  currentSong: Song | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  queue: Song[];
  currentMood: Mood;
  isLoading: boolean;
  playbackSpeed: number;
  sleepTimerEnd: number | null;

  addSongs: () => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  setSongMood: (id: string, mood: Mood | null) => void;

  createPlaylist: (name: string) => void;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (playlistId: string, songId: string) => void;
  removeFromPlaylist: (playlistId: string, songId: string) => void;

  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  pauseResume: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  seekTo: (millis: number) => Promise<void>;
  setVolumeLevel: (v: number) => Promise<void>;
  setCurrentMood: (mood: Mood) => void;
  setPlaybackSpeed: (speed: number) => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
  jumpToQueueIndex: (idx: number) => Promise<void>;
  addSongsDirect: (newSongs: Song[]) => void;
}

const MusicContext = createContext<MusicContextType | null>(null);

const SONGS_KEY = "mv_songs_v2";
const PLAYLISTS_KEY = "mv_playlists_v2";

async function loadFromStorage<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

async function saveToStorage(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("none");
  const [volume, setVolume] = useState(1);
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [currentMood, setCurrentMood] = useState<Mood>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);

  const queueRef = useRef<Song[]>([]);
  const queueIndexRef = useRef(0);
  const repeatRef = useRef<RepeatMode>("none");
  const shuffleRef = useRef(false);
  const volumeRef = useRef(1);
  const speedRef = useRef(1);

  const nativeSoundRef = useRef<Audio.Sound | null>(null);
  const webPlayerRef = useRef<WebAudioPlayer | null>(null);
  const loadAndPlayRef = useRef<((song: Song) => Promise<void>) | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { speedRef.current = playbackSpeed; }, [playbackSpeed]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([
        loadFromStorage<Song[]>(SONGS_KEY, []),
        loadFromStorage<Playlist[]>(PLAYLISTS_KEY, []),
      ]);
      setSongs(s);
      setPlaylists(p);
    })();
  }, []);

  // Sleep timer effect
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (sleepTimerEnd !== null) {
      const ms = sleepTimerEnd - Date.now();
      if (ms > 0) {
        sleepTimerRef.current = setTimeout(async () => {
          if (Platform.OS === "web") {
            await webPlayerRef.current?.pause();
          } else {
            await nativeSoundRef.current?.pauseAsync().catch(() => {});
          }
          setIsPlaying(false);
          setSleepTimerEnd(null);
        }, ms);
      }
    }
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [sleepTimerEnd]);

  const unloadAudio = useCallback(async () => {
    if (Platform.OS === "web") {
      if (webPlayerRef.current) await webPlayerRef.current.unload();
    } else {
      if (nativeSoundRef.current) {
        try { await nativeSoundRef.current.unloadAsync(); } catch {}
        nativeSoundRef.current = null;
      }
    }
  }, []);

  const handleSongFinish = useCallback(() => {
    const mode = repeatRef.current;
    const q = queueRef.current;
    const idx = queueIndexRef.current;

    if (mode === "one") {
      if (Platform.OS === "web") {
        webPlayerRef.current?.replay().catch(() => {});
      } else {
        nativeSoundRef.current?.replayAsync().catch(() => {});
      }
      return;
    }

    const nextIdx = shuffleRef.current
      ? Math.floor(Math.random() * q.length)
      : idx + 1;

    if (nextIdx < q.length) {
      const next = q[nextIdx];
      setQueueIndex(nextIdx);
      setCurrentSong(next);
      loadAndPlayRef.current?.(next);
    } else if (mode === "all" && q.length > 0) {
      const first = q[0];
      setQueueIndex(0);
      setCurrentSong(first);
      loadAndPlayRef.current?.(first);
    } else {
      setIsPlaying(false);
      setPosition(0);
    }
  }, []);

  const loadAndPlay = useCallback(async (song: Song) => {
    await unloadAudio();
    setPosition(0);
    setDuration(0);
    setIsPlaying(false);

    const playableUri = await getPlayableUri(song.id, song.uri);
    if (!playableUri) {
      console.warn("[MusicVault] Could not resolve playable URI for", song.id);
      return;
    }

    if (Platform.OS === "web") {
      if (!webPlayerRef.current) webPlayerRef.current = new WebAudioPlayer();
      await webPlayerRef.current.load(playableUri, (status) => {
        setPosition(status.positionMillis);
        if (status.durationMillis > 0) setDuration(status.durationMillis);
        setIsPlaying(status.isPlaying);
        if (status.didJustFinish) handleSongFinish();
      });
      await webPlayerRef.current.setPlaybackRate(speedRef.current);
      setIsPlaying(true);
    } else {
      const { sound } = await Audio.Sound.createAsync(
        { uri: playableUri },
        { shouldPlay: true, volume: volumeRef.current, rate: speedRef.current, shouldCorrectPitch: true }
      );
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis ?? 0);
        if (status.durationMillis) setDuration(status.durationMillis);
        setIsPlaying(status.isPlaying);
        if (status.didJustFinish) handleSongFinish();
      });
      nativeSoundRef.current = sound;
      setIsPlaying(true);
    }

    // Update duration on songs list if we didn't have it
    setSongs((prev) => {
      const existing = prev.find((s) => s.id === song.id);
      if (existing && existing.duration > 0) return prev;
      return prev; // duration will be updated via status callback
    });
  }, [unloadAudio, handleSongFinish]);

  useEffect(() => { loadAndPlayRef.current = loadAndPlay; }, [loadAndPlay]);

  const playSong = useCallback(async (song: Song, q?: Song[]) => {
    const newQueue = q ?? [song];
    const idx = newQueue.findIndex((s) => s.id === song.id);
    setQueue(newQueue);
    setQueueIndex(idx >= 0 ? idx : 0);
    setCurrentSong(song);
    await loadAndPlay(song);
  }, [loadAndPlay]);

  const jumpToQueueIndex = useCallback(async (idx: number) => {
    const q = queueRef.current;
    if (idx < 0 || idx >= q.length) return;
    const song = q[idx];
    setQueueIndex(idx);
    setCurrentSong(song);
    await loadAndPlay(song);
  }, [loadAndPlay]);

  const pauseResume = useCallback(async () => {
    if (Platform.OS === "web") {
      const player = webPlayerRef.current;
      if (!player) return;
      if (isPlaying) {
        await player.pause();
        setIsPlaying(false);
      } else {
        await player.play();
        setIsPlaying(true);
      }
    } else {
      if (!nativeSoundRef.current) return;
      try {
        if (isPlaying) {
          await nativeSoundRef.current.pauseAsync();
        } else {
          await nativeSoundRef.current.playAsync();
        }
      } catch {}
    }
  }, [isPlaying]);

  const playNext = useCallback(async () => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    const nextIdx = shuffleRef.current
      ? Math.floor(Math.random() * q.length)
      : idx + 1;
    if (nextIdx >= q.length) return;
    setQueueIndex(nextIdx);
    setCurrentSong(q[nextIdx]);
    await loadAndPlay(q[nextIdx]);
  }, [loadAndPlay]);

  const playPrev = useCallback(async () => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (position > 3000) {
      if (Platform.OS === "web") {
        await webPlayerRef.current?.seek(0);
      } else {
        await nativeSoundRef.current?.setPositionAsync(0).catch(() => {});
      }
      setPosition(0);
      return;
    }
    const prevIdx = Math.max(0, idx - 1);
    setQueueIndex(prevIdx);
    setCurrentSong(q[prevIdx]);
    await loadAndPlay(q[prevIdx]);
  }, [loadAndPlay, position]);

  const seekTo = useCallback(async (millis: number) => {
    if (Platform.OS === "web") {
      await webPlayerRef.current?.seek(millis);
      setPosition(millis);
    } else {
      try { await nativeSoundRef.current?.setPositionAsync(millis); } catch {}
    }
  }, []);

  const setVolumeLevel = useCallback(async (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolume(clamped);
    volumeRef.current = clamped;
    if (Platform.OS === "web") {
      await webPlayerRef.current?.setVolume(clamped);
    } else {
      try { await nativeSoundRef.current?.setVolumeAsync(clamped); } catch {}
    }
  }, []);

  const setPlaybackSpeed = useCallback(async (speed: number) => {
    setPlaybackSpeedState(speed);
    speedRef.current = speed;
    if (Platform.OS === "web") {
      await webPlayerRef.current?.setPlaybackRate(speed);
    } else {
      try {
        await nativeSoundRef.current?.setRateAsync(speed, true);
      } catch {}
    }
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      setSleepTimerEnd(null);
    } else {
      setSleepTimerEnd(Date.now() + minutes * 60 * 1000);
    }
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const toggleRepeat = useCallback(
    () => setRepeat((r) => r === "none" ? "one" : r === "one" ? "all" : "none"),
    []
  );

  const addSongs = useCallback(async () => {
    setIsLoading(true);
    try {
      const picked = await pickAudioFiles();
      if (picked.length === 0) return;
      const newSongs: Song[] = [];
      for (const file of picked) {
        try {
          const storedUri = await storeAudioFile(file.id, file.uri);
          const { title, artist } = parseFilename(file.name);
          newSongs.push({
            id: file.id, title, artist, uri: storedUri,
            duration: 0, favorite: false, addedAt: Date.now(),
            mood: null, gradientColors: getGradientColors(file.id),
          });
        } catch (err) {
          console.warn("[MusicVault] Failed to store:", file.name, err);
        }
      }
      if (newSongs.length > 0) {
        setSongs((prev) => {
          const updated = [...newSongs, ...prev];
          saveToStorage(SONGS_KEY, updated);
          return updated;
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSong = useCallback(async (id: string) => {
    const song = songs.find((s) => s.id === id);
    if (song) {
      await deleteAudioFile(id, song.uri);
      if (currentSong?.id === id) {
        await unloadAudio();
        setCurrentSong(null);
        setIsPlaying(false);
      }
    }
    setSongs((prev) => { const u = prev.filter((s) => s.id !== id); saveToStorage(SONGS_KEY, u); return u; });
    setPlaylists((prev) => {
      const u = prev.map((p) => ({ ...p, songIds: p.songIds.filter((sid) => sid !== id) }));
      saveToStorage(PLAYLISTS_KEY, u);
      return u;
    });
  }, [songs, currentSong, unloadAudio]);

  const toggleFavorite = useCallback((id: string) => {
    setSongs((prev) => {
      const u = prev.map((s) => s.id === id ? { ...s, favorite: !s.favorite } : s);
      saveToStorage(SONGS_KEY, u);
      return u;
    });
  }, []);

  const setSongMood = useCallback((id: string, mood: Mood | null) => {
    setSongs((prev) => {
      const u = prev.map((s) => s.id === id ? { ...s, mood } : s);
      saveToStorage(SONGS_KEY, u);
      return u;
    });
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const p: Playlist = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name, songIds: [], createdAt: Date.now(),
    };
    setPlaylists((prev) => { const u = [p, ...prev]; saveToStorage(PLAYLISTS_KEY, u); return u; });
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => { const u = prev.filter((p) => p.id !== id); saveToStorage(PLAYLISTS_KEY, u); return u; });
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists((prev) => { const u = prev.map((p) => p.id === id ? { ...p, name } : p); saveToStorage(PLAYLISTS_KEY, u); return u; });
  }, []);

  const addToPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists((prev) => {
      const u = prev.map((p) => p.id === playlistId && !p.songIds.includes(songId) ? { ...p, songIds: [...p.songIds, songId] } : p);
      saveToStorage(PLAYLISTS_KEY, u);
      return u;
    });
  }, []);

  const removeFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists((prev) => {
      const u = prev.map((p) => p.id === playlistId ? { ...p, songIds: p.songIds.filter((id) => id !== songId) } : p);
      saveToStorage(PLAYLISTS_KEY, u);
      return u;
    });
  }, []);

  // Used by DropZone to inject songs that were already stored
  const addSongsDirect = useCallback((newSongs: Song[]) => {
    setSongs((prev) => {
      const dedupedIds = new Set(prev.map((s) => s.id));
      const fresh = newSongs.filter((s) => !dedupedIds.has(s.id));
      if (fresh.length === 0) return prev;
      const updated = [...fresh, ...prev];
      saveToStorage(SONGS_KEY, updated);
      return updated;
    });
  }, []);

  useEffect(() => { return () => { unloadAudio(); }; }, [unloadAudio]);

  return (
    <MusicContext.Provider value={{
      songs, playlists, currentSong, isPlaying,
      position, duration, shuffle, repeat, volume, queue,
      currentMood, isLoading, playbackSpeed, sleepTimerEnd,
      addSongs, deleteSong, toggleFavorite, setSongMood,
      createPlaylist, deletePlaylist, renamePlaylist,
      addToPlaylist, removeFromPlaylist,
      playSong, pauseResume, playNext, playPrev,
      toggleShuffle, toggleRepeat, seekTo, setVolumeLevel,
      setCurrentMood, setPlaybackSpeed, setSleepTimer, jumpToQueueIndex,
      addSongsDirect,
    }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
