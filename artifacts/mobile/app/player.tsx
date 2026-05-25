import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumArt } from "@/components/AlbumArt";
import { QueueSheet } from "@/components/QueueSheet";
import { VolumeSlider } from "@/components/VolumeSlider";
import { SLEEP_OPTIONS, SPEED_OPTIONS, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";
import { useLayout } from "@/hooks/useLayout";

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
}

function haptic(style: "light" | "medium" = "light") {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(
      style === "medium" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
  }
}

function useWaveform(songId: string | undefined, count = 55) {
  return useMemo(() => {
    if (!songId) return [];
    const seed = songId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: count }, (_, i) => {
      const v = Math.abs(
        Math.sin(seed * 0.017 + i * 0.41) * 0.55 +
        Math.sin(seed * 0.009 + i * 0.87) * 0.35 +
        Math.sin(i * 0.23) * 0.1
      );
      return 5 + v * 28;
    });
  }, [songId, count]);
}

const SWIPE_THRESHOLD = 70;

export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useLayout();
  const {
    currentSong, isPlaying, position, duration,
    shuffle, repeat, volume, playlists, playbackSpeed, sleepTimerEnd,
    pauseResume, playNext, playPrev, toggleShuffle, toggleRepeat,
    seekTo, setVolumeLevel, toggleFavorite, addToPlaylist,
    setPlaybackSpeed, setSleepTimer,
  } = useMusic();

  const artScale = useRef(new Animated.Value(1)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const isSwiping = useRef(false);
  const progressWidthRef = useRef(0);

  const [showQueue, setShowQueue] = useState(false);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showSleep, setShowSleep] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);

  const waveformBars = useWaveform(currentSong?.id);
  const progress = duration > 0 ? position / duration : 0;
  const topPad = Platform.OS === "web" ? 20 : insets.top;
  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 12;
  const artSize = layout.isDesktop ? 240 : layout.isTablet ? 280 : Math.min(layout.width - 80, 260);

  const sleepRemaining = sleepTimerEnd
    ? Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000))
    : null;

  // Album art pulse
  useEffect(() => {
    Animated.spring(artScale, {
      toValue: isPlaying ? 1 : 0.86,
      useNativeDriver: true,
      tension: 90,
      friction: 8,
    }).start();
  }, [isPlaying, artScale]);

  // Desktop keyboard shortcuts
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); pauseResume(); }
      if (e.code === "ArrowRight") { e.preventDefault(); seekTo(Math.min(position + 10000, duration)); }
      if (e.code === "ArrowLeft") { e.preventDefault(); seekTo(Math.max(position - 10000, 0)); }
      if (e.code === "KeyN") playNext();
      if (e.code === "KeyP") playPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pauseResume, seekTo, playNext, playPrev, position, duration]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderGrant: () => { isSwiping.current = false; },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 8) isSwiping.current = true;
        swipeX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(swipeX, { toValue: -420, duration: 130, useNativeDriver: true }).start(() => {
            swipeX.setValue(0); playNext(); haptic();
          });
        } else if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(swipeX, { toValue: 420, duration: 130, useNativeDriver: true }).start(() => {
            swipeX.setValue(0); playPrev(); haptic();
          });
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
          if (!isSwiping.current) { pauseResume(); haptic("medium"); }
        }
      },
    })
  ).current;

  if (!currentSong) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.topBtn, { marginTop: topPad + 8, marginLeft: 20, backgroundColor: colors.card }]}
        >
          <Feather name="chevron-down" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.emptyCenter}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.card }]}>
            <Feather name="music" size={40} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Nothing playing
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Pick a song from your library to start
          </Text>
        </View>
      </View>
    );
  }

  // ── Shared control blocks ──────────────────────────────────────────────────

  const SongInfoRow = (
    <View style={styles.songInfoRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.songTitle, { color: "#fff", fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
          {currentSong.title}
        </Text>
        <Text style={[styles.songArtist, { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
          {currentSong.artist}
        </Text>
      </View>
      <TouchableOpacity onPress={() => { haptic(); toggleFavorite(currentSong.id); }} hitSlop={10}>
        <Feather
          name={currentSong.favorite ? "heart" : "heart"}
          size={24}
          color={currentSong.favorite ? "#ef4444" : "rgba(255,255,255,0.35)"}
        />
      </TouchableOpacity>
    </View>
  );

  const WaveformBar = (
    <View>
      <TouchableOpacity
        activeOpacity={1}
        onLayout={(e) => { progressWidthRef.current = e.nativeEvent.layout.width; }}
        onPress={(e) => {
          const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / progressWidthRef.current));
          seekTo(ratio * duration);
        }}
      >
        <View style={styles.waveform}>
          {waveformBars.map((h, i) => {
            const active = i / waveformBars.length <= progress;
            return (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height: h,
                    backgroundColor: active
                      ? currentSong.gradientColors[0]
                      : "rgba(255,255,255,0.13)",
                    opacity: active ? 1 : 0.7,
                  },
                ]}
              />
            );
          })}
        </View>
      </TouchableOpacity>
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular" }]}>
          {formatTime(position)}
        </Text>
        <Text style={[styles.timeText, { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular" }]}>
          {formatTime(duration)}
        </Text>
      </View>
    </View>
  );

  const MainControls = (
    <View style={styles.controls}>
      {/* Shuffle */}
      <TouchableOpacity onPress={() => { haptic(); toggleShuffle(); }} hitSlop={12} style={styles.sideControl}>
        <Feather name="shuffle" size={20} color={shuffle ? "#a855f7" : "rgba(255,255,255,0.38)"} />
        {shuffle && <View style={[styles.dot, { backgroundColor: "#a855f7" }]} />}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { haptic(); playPrev(); }} hitSlop={10}>
        <Feather name="skip-back" size={30} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { haptic("medium"); pauseResume(); }} activeOpacity={0.85}>
        <LinearGradient colors={["#a855f7", "#7c3aed"]} style={styles.playBtn}>
          <Feather name={isPlaying ? "pause" : "play"} size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => { haptic(); playNext(); }} hitSlop={10}>
        <Feather name="skip-forward" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Repeat — 3 clear states */}
      <TouchableOpacity onPress={() => { haptic(); toggleRepeat(); }} hitSlop={12} style={styles.sideControl}>
        {repeat === "none" && (
          <Feather name="repeat" size={20} color="rgba(255,255,255,0.38)" />
        )}
        {repeat === "all" && (
          <Feather name="repeat" size={20} color="#a855f7" />
        )}
        {repeat === "one" && (
          <View style={styles.repeatOneWrap}>
            <Feather name="repeat" size={20} color="#a855f7" />
            <View style={[styles.repeatOneBadge, { backgroundColor: "#a855f7" }]}>
              <Text style={[styles.repeatOneNum, { color: "#fff" }]}>1</Text>
            </View>
          </View>
        )}
        {repeat !== "none" && <View style={[styles.dot, { backgroundColor: "#a855f7" }]} />}
      </TouchableOpacity>
    </View>
  );

  const ActionBar = (
    <View style={[styles.actionBar, { borderTopColor: "rgba(255,255,255,0.08)" }]}>
      {[
        { icon: "list", label: "Queue", onPress: () => setShowQueue(true), active: false },
        { icon: "zap", label: playbackSpeed !== 1 ? `${playbackSpeed}×` : "Speed", onPress: () => setShowSpeed(true), active: playbackSpeed !== 1 },
        { icon: "moon", label: sleepRemaining != null ? `${sleepRemaining}m` : "Sleep", onPress: () => setShowSleep(true), active: sleepTimerEnd != null },
        { icon: "plus-circle", label: "Playlist", onPress: () => setShowPlaylist(true), active: false },
      ].map((item) => (
        <TouchableOpacity key={item.label} onPress={item.onPress} style={styles.actionBtn}>
          <Feather
            name={item.icon as "list"}
            size={20}
            color={item.active ? "#a855f7" : "rgba(255,255,255,0.45)"}
          />
          <Text style={[styles.actionLabel, {
            color: item.active ? "#a855f7" : "rgba(255,255,255,0.45)",
            fontFamily: "Inter_400Regular",
          }]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── Desktop (side-by-side) ─────────────────────────────────────────────────
  if (layout.isDesktop) {
    return (
      <View style={[styles.container, { backgroundColor: "#000" }]}>
        <LinearGradient
          colors={[currentSong.gradientColors[0], "#050505"]}
          start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.65)" }]} />

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBtn} hitSlop={8}>
            <Feather name="chevron-down" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.topLabel, { color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" }]}>
            Now Playing
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Desktop layout: art | controls */}
        <View style={styles.desktopLayout}>
          <Animated.View
            style={{ transform: [{ scale: artScale }, { translateX: swipeX }] }}
            {...panResponder.panHandlers}
          >
            <AlbumArt colors={currentSong.gradientColors} size={artSize} borderRadius={24} />
          </Animated.View>

          <View style={styles.desktopRight}>
            {SongInfoRow}
            <View style={{ height: 24 }} />
            {WaveformBar}
            <View style={{ height: 24 }} />
            {MainControls}
            <View style={{ height: 20 }} />
            <VolumeSlider value={volume} onChange={setVolumeLevel} />
            <View style={{ height: 20 }} />
            {ActionBar}
          </View>
        </View>
      </View>
    );
  }

  // ── Mobile / Tablet (scrollable column) ───────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <LinearGradient
        colors={[currentSong.gradientColors[0], "#060606"]}
        start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.62)" }]} />

      {/* Top bar — always visible, not inside scroll */}
      <View style={[styles.topBar, { paddingTop: topPad + 8, paddingHorizontal: 24 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn} hitSlop={8}>
          <Feather name="chevron-down" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.topLabel, { color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" }]}>
          Now Playing
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Scrollable content so nothing gets cut off */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: botPad }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Album art + swipe */}
        <Animated.View
          style={[styles.artWrapper, { transform: [{ scale: artScale }, { translateX: swipeX }] }]}
          {...panResponder.panHandlers}
        >
          <AlbumArt colors={currentSong.gradientColors} size={artSize} borderRadius={24} />
          <Text style={[styles.swipeHint, { color: "rgba(255,255,255,0.25)", fontFamily: "Inter_400Regular" }]}>
            ← swipe to change song →
          </Text>
        </Animated.View>

        <View style={styles.controlsPad}>
          {SongInfoRow}
          <View style={{ height: 20 }} />
          {WaveformBar}
          <View style={{ height: 20 }} />
          {MainControls}
          <View style={{ height: 16 }} />
          <VolumeSlider value={volume} onChange={setVolumeLevel} />
          <View style={{ height: 4 }} />
          {ActionBar}
        </View>
      </ScrollView>

      {/* Modals */}
      <QueueSheet visible={showQueue} onClose={() => setShowQueue(false)} />
      <SpeedModal
        visible={showSpeed}
        current={playbackSpeed}
        onSelect={(s) => { setPlaybackSpeed(s); setShowSpeed(false); haptic(); }}
        onClose={() => setShowSpeed(false)}
      />
      <SleepModal
        visible={showSleep}
        remaining={sleepRemaining}
        hasTimer={!!sleepTimerEnd}
        onSelect={(m) => { setSleepTimer(m); setShowSleep(false); haptic(); }}
        onClose={() => setShowSleep(false)}
      />
      <PlaylistModal
        visible={showPlaylist}
        playlists={playlists}
        currentSongId={currentSong.id}
        onAdd={(pid) => { addToPlaylist(pid, currentSong.id); setShowPlaylist(false); haptic(); }}
        onClose={() => setShowPlaylist(false)}
      />
    </View>
  );
}

// ── Sub-modals ────────────────────────────────────────────────────────────────

function SpeedModal({
  visible, current, onSelect, onClose,
}: { visible: boolean; current: number; onSelect: (s: number) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.pickerCard, { backgroundColor: "#1a1a1a" }]}>
          <Text style={[styles.pickerTitle, { color: "#fff", fontFamily: "Inter_700Bold" }]}>Playback Speed</Text>
          <View style={styles.speedGrid}>
            {SPEED_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => onSelect(s)}
                style={[
                  styles.speedChip,
                  { backgroundColor: current === s ? "#a855f7" : "rgba(255,255,255,0.07)" },
                ]}
              >
                <Text style={[styles.speedChipText, {
                  color: current === s ? "#fff" : "rgba(255,255,255,0.6)",
                  fontFamily: current === s ? "Inter_700Bold" : "Inter_400Regular",
                }]}>
                  {s === 1 ? "Normal" : `${s}×`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function SleepModal({
  visible, remaining, hasTimer, onSelect, onClose,
}: { visible: boolean; remaining: number | null; hasTimer: boolean; onSelect: (m: number | null) => void; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.pickerCard, { backgroundColor: "#1a1a1a" }]}>
          <Text style={[styles.pickerTitle, { color: "#fff", fontFamily: "Inter_700Bold" }]}>Sleep Timer</Text>
          <Text style={[styles.pickerSub, { color: "rgba(255,255,255,0.4)", fontFamily: "Inter_400Regular" }]}>
            Pause music automatically after
          </Text>
          {SLEEP_OPTIONS.map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => onSelect(m)}
              style={[styles.sleepRow, { borderColor: "rgba(255,255,255,0.08)" }]}
            >
              <Feather name="moon" size={15} color="#a855f7" />
              <Text style={[styles.sleepRowText, { color: "#fff", fontFamily: "Inter_500Medium" }]}>
                {m} minutes
              </Text>
              {remaining != null && Math.abs(remaining - m) <= 1 && (
                <View style={[styles.activePill, { backgroundColor: "#a855f7" }]}>
                  <Text style={[styles.activePillText, { color: "#fff" }]}>{remaining}m left</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {hasTimer && (
            <TouchableOpacity
              onPress={() => onSelect(null)}
              style={[styles.sleepRow, { borderColor: "rgba(239,68,68,0.2)" }]}
            >
              <Feather name="x-circle" size={15} color="#ef4444" />
              <Text style={[styles.sleepRowText, { color: "#ef4444", fontFamily: "Inter_500Medium" }]}>
                Cancel timer
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function PlaylistModal({
  visible, playlists, currentSongId, onAdd, onClose,
}: {
  visible: boolean;
  playlists: { id: string; name: string; songIds: string[] }[];
  currentSongId: string;
  onAdd: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.sheetCard, { backgroundColor: "#1a1a1a" }]}>
          <View style={styles.sheetHandle}>
            <View style={[styles.handle, { backgroundColor: "rgba(255,255,255,0.18)" }]} />
          </View>
          <Text style={[styles.pickerTitle, { color: "#fff", fontFamily: "Inter_700Bold", marginBottom: 12 }]}>
            Add to Playlist
          </Text>
          {playlists.length === 0 ? (
            <Text style={[styles.pickerSub, { color: "rgba(255,255,255,0.35)", textAlign: "center", padding: 24, fontFamily: "Inter_400Regular" }]}>
              No playlists yet. Create one in the Playlists tab.
            </Text>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 280 }}
              renderItem={({ item }) => {
                const added = item.songIds.includes(currentSongId);
                return (
                  <TouchableOpacity
                    onPress={() => !added && onAdd(item.id)}
                    style={[styles.plRow, { borderBottomColor: "rgba(255,255,255,0.06)" }]}
                  >
                    <LinearGradient
                      colors={added ? ["#a855f7", "#7c3aed"] : ["#2a2a2a", "#2a2a2a"]}
                      style={styles.plRowIcon}
                    >
                      <Feather name={added ? "check" : "music"} size={14} color={added ? "#fff" : "rgba(255,255,255,0.4)"} />
                    </LinearGradient>
                    <Text style={[styles.plRowText, {
                      color: added ? "#a855f7" : "#fff",
                      fontFamily: added ? "Inter_600SemiBold" : "Inter_400Regular",
                    }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.plRowCount, { color: "rgba(255,255,255,0.3)", fontFamily: "Inter_400Regular" }]}>
                      {item.songIds.length}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyIconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20 },
  emptyText: { fontSize: 14, textAlign: "center" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  topLabel: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },

  // Desktop
  desktopLayout: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 64,
    paddingHorizontal: 60,
    paddingBottom: 32,
  },
  desktopRight: { flex: 1, maxWidth: 420 },

  // Mobile scroll
  scrollContent: { paddingHorizontal: 28 },
  artWrapper: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.7,
    shadowRadius: 32,
    elevation: 20,
  },
  swipeHint: { fontSize: 11, letterSpacing: 0.4, marginTop: 12, textTransform: "uppercase" },
  controlsPad: {},

  // Song info
  songInfoRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  songTitle: { fontSize: 22, lineHeight: 28 },
  songArtist: { fontSize: 14, marginTop: 3 },

  // Waveform
  waveform: { flexDirection: "row", alignItems: "flex-end", height: 38, gap: 2 },
  waveBar: { flex: 1, minWidth: 2, borderRadius: 2 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  timeText: { fontSize: 12 },

  // Controls row
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideControl: { alignItems: "center", minWidth: 36 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 3, alignSelf: "center" },
  playBtn: {
    width: 66, height: 66, borderRadius: 33,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55, shadowRadius: 16,
    elevation: 12,
  },
  repeatOneWrap: { position: "relative" },
  repeatOneBadge: {
    position: "absolute", top: -5, right: -7,
    width: 14, height: 14, borderRadius: 7,
    alignItems: "center", justifyContent: "center",
  },
  repeatOneNum: { fontSize: 8, fontWeight: "700" },

  // Action bar
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionBtn: { alignItems: "center", gap: 6, paddingVertical: 4 },
  actionLabel: { fontSize: 11 },

  // Modals / overlays
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center", justifyContent: "center",
  },
  pickerCard: {
    width: "85%", maxWidth: 340, borderRadius: 22, padding: 24, gap: 14,
  },
  pickerTitle: { fontSize: 17, textAlign: "center" },
  pickerSub: { fontSize: 13, textAlign: "center" },

  speedGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  speedChip: {
    paddingHorizontal: 18, paddingVertical: 11,
    borderRadius: 12, minWidth: 86, alignItems: "center",
  },
  speedChipText: { fontSize: 14 },

  sleepRow: {
    flexDirection: "row", alignItems: "center",
    gap: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sleepRowText: { fontSize: 15, flex: 1 },
  activePill: {
    paddingHorizontal: 10, paddingVertical: 3,
    borderRadius: 10,
  },
  activePillText: { fontSize: 11, fontWeight: "600" },

  sheetCard: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24,
  },
  sheetHandle: { alignItems: "center", marginBottom: 12 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  plRow: {
    flexDirection: "row", alignItems: "center",
    gap: 14, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  plRowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  plRowText: { fontSize: 15, flex: 1 },
  plRowCount: { fontSize: 12 },
});
