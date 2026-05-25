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

  // Refs for current values (avoids stale closures in callbacks)
  const queueRef = useRef<Song[]>([]);
  const queueIndexRef = useRef(0);
  const repeatRef = useRef<RepeatMode>("none");
  const shuffleRef = useRef(false);
  const volumeRef = useRef(1);

  // Audio backend refs
  const nativeSoundRef = useRef<Audio.Sound | null>(null);
  const webPlayerRef = useRef<WebAudioPlayer | null>(null);
  const loadAndPlayRef = useRef<((song: Song) => Promise<void>) | null>(null);

  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Init audio mode on native
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

  // Load persisted data
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

  const unloadAudio = useCallback(async () => {
    if (Platform.OS === "web") {
      if (webPlayerRef.current) {
        await webPlayerRef.current.unload();
      }
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
      if (!webPlayerRef.current) {
        webPlayerRef.current = new WebAudioPlayer();
      }
      await webPlayerRef.current.load(playableUri, (status) => {
        setPosition(status.positionMillis);
        if (status.durationMillis > 0) setDuration(status.durationMillis);
        setIsPlaying(status.isPlaying);
        if (status.didJustFinish) {
          handleSongFinish();
        }
      });
      setIsPlaying(true);
    } else {
      const { sound } = await Audio.Sound.createAsync(
        { uri: playableUri },
        { shouldPlay: true, volume: volumeRef.current }
      );
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setPosition(status.positionMillis ?? 0);
        if (status.durationMillis) setDuration(status.durationMillis);
        setIsPlaying(status.isPlaying);
        if (status.didJustFinish) {
          handleSongFinish();
        }
      });
      nativeSoundRef.current = sound;
      setIsPlaying(true);
    }
  }, [unloadAudio, handleSongFinish]);

  // Keep ref in sync
  useEffect(() => {
    loadAndPlayRef.current = loadAndPlay;
  }, [loadAndPlay]);

  const playSong = useCallback(async (song: Song, q?: Song[]) => {
    const newQueue = q ?? [song];
    const idx = newQueue.findIndex((s) => s.id === song.id);
    setQueue(newQueue);
    setQueueIndex(idx >= 0 ? idx : 0);
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
      : Math.min(idx + 1, q.length - 1);
    if (nextIdx >= q.length) return;
    const next = q[nextIdx];
    setQueueIndex(nextIdx);
    setCurrentSong(next);
    await loadAndPlay(next);
  }, [loadAndPlay]);

  const playPrev = useCallback(async () => {
    const q = queueRef.current;
    const idx = queueIndexRef.current;
    if (position > 3000) {
      if (Platform.OS === "web") {
        await webPlayerRef.current?.seek(0);
      } else {
        await nativeSoundRef.current?.setPositionAsync(0);
      }
      return;
    }
    const prevIdx = Math.max(0, idx - 1);
    const prev = q[prevIdx];
    setQueueIndex(prevIdx);
    setCurrentSong(prev);
    await loadAndPlay(prev);
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
    setVolume(v);
    volumeRef.current = v;
    if (Platform.OS === "web") {
      await webPlayerRef.current?.setVolume(v);
    } else {
      try { await nativeSoundRef.current?.setVolumeAsync(v); } catch {}
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
            id: file.id,
            title,
            artist,
            uri: storedUri,
            duration: 0,
            favorite: false,
            addedAt: Date.now(),
            mood: null,
            gradientColors: getGradientColors(file.id),
          });
        } catch (err) {
          console.warn("[MusicVault] Failed to store file:", file.name, err);
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
    setSongs((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveToStorage(SONGS_KEY, updated);
      return updated;
    });
    setPlaylists((prev) => {
      const updated = prev.map((p) => ({
        ...p,
        songIds: p.songIds.filter((sid) => sid !== id),
      }));
      saveToStorage(PLAYLISTS_KEY, updated);
      return updated;
    });
  }, [songs, currentSong, unloadAudio]);

  const toggleFavorite = useCallback((id: string) => {
    setSongs((prev) => {
      const updated = prev.map((s) => s.id === id ? { ...s, favorite: !s.favorite } : s);
      saveToStorage(SONGS_KEY, updated);
      return updated;
    });
  }, []);

  const setSongMood = useCallback((id: string, mood: Mood | null) => {
    setSongs((prev) => {
      const updated = prev.map((s) => s.id === id ? { ...s, mood } : s);
      saveToStorage(SONGS_KEY, updated);
      return updated;
    });
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const p: Playlist = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      name,
      songIds: [],
      createdAt: Date.now(),
    };
    setPlaylists((prev) => {
      const updated = [p, ...prev];
      saveToStorage(PLAYLISTS_KEY, updated);
      return updated;
    });
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveToStorage(PLAYLISTS_KEY, updated);
      return updated;
    });
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) => p.id === id ? { ...p, name } : p);
      saveToStorage(PLAYLISTS_KEY, updated);
      return updated;
    });
  }, []);

  const addToPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) =>
        p.id === playlistId && !p.songIds.includes(songId)
          ? { ...p, songIds: [...p.songIds, songId] }
          : p
      );
      saveToStorage(PLAYLISTS_KEY, updated);
      return updated;
    });
  }, []);

  const removeFromPlaylist = useCallback((playlistId: string, songId: string) => {
    setPlaylists((prev) => {
      const updated = prev.map((p) =>
        p.id === playlistId
          ? { ...p, songIds: p.songIds.filter((id) => id !== songId) }
          : p
      );
      saveToStorage(PLAYLISTS_KEY, updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    return () => { unloadAudio(); };
  }, [unloadAudio]);

  return (
    <MusicContext.Provider
      value={{
        songs, playlists, currentSong, isPlaying,
        position, duration, shuffle, repeat, volume, queue,
        currentMood, isLoading,
        addSongs, deleteSong, toggleFavorite, setSongMood,
        createPlaylist, deletePlaylist, renamePlaylist,
        addToPlaylist, removeFromPlaylist,
        playSong, pauseResume, playNext, playPrev,
        toggleShuffle, toggleRepeat, seekTo, setVolumeLevel,
        setCurrentMood,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within MusicProvider");
  return ctx;
}
