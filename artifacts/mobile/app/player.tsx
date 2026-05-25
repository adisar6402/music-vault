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
import {
  SLEEP_OPTIONS,
  SPEED_OPTIONS,
  useMusic,
} from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";
import { useLayout } from "@/hooks/useLayout";

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SWIPE_THRESHOLD = 80;

function haptic(style: "light" | "medium" = "light") {
  if (Platform.OS !== "web") {
    Haptics.impactAsync(
      style === "medium"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
  }
}

// Waveform bars derived deterministically from song id
function useWaveform(songId: string | undefined, barCount = 60) {
  return useMemo(() => {
    if (!songId) return [];
    const seed = songId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: barCount }, (_, i) => {
      const v =
        Math.abs(Math.sin(seed * 0.013 + i * 0.37) * 0.6 +
          Math.sin(seed * 0.007 + i * 0.91) * 0.4);
      return 4 + v * 26;
    });
  }, [songId, barCount]);
}

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
  const progressWidth = useRef(0);

  const [showQueue, setShowQueue] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

  const waveformBars = useWaveform(currentSong?.id);
  const progress = duration > 0 ? position / duration : 0;
  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const botPad = Platform.OS === "web" ? 32 : insets.bottom;
  const artSize = layout.isDesktop ? 260 : layout.isTablet ? 300 : 260;

  // Album art pulse on play/pause
  useEffect(() => {
    Animated.spring(artScale, {
      toValue: isPlaying ? 1 : 0.88,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [isPlaying, artScale]);

  // Swipe to change song
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => { isSwiping.current = false; },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 10) isSwiping.current = true;
        swipeX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(swipeX, { toValue: -500, duration: 140, useNativeDriver: true }).start(() => {
            swipeX.setValue(0); playNext(); haptic();
          });
        } else if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(swipeX, { toValue: 500, duration: 140, useNativeDriver: true }).start(() => {
            swipeX.setValue(0); playPrev(); haptic();
          });
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
          if (!isSwiping.current) { pauseResume(); haptic("medium"); }
        }
      },
    })
  ).current;

  // Sleep timer remaining
  const sleepRemaining = sleepTimerEnd
    ? Math.max(0, Math.ceil((sleepTimerEnd - Date.now()) / 60000))
    : null;

  if (!currentSong) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.closeBtn, { marginTop: topPad + 8, marginLeft: 20 }]}
        >
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.emptyCenter}>
          <Feather name="music" size={64} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Nothing playing
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Blurred gradient BG */}
      <LinearGradient
        colors={[currentSong.gradientColors[0], "#050505"]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 0.9 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.62)" }]} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.inner,
          { paddingTop: topPad + 8, paddingBottom: botPad + 20 },
          layout.isDesktop && styles.innerDesktop,
        ]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <Feather name="chevron-down" size={26} color="#fff" />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <Text style={[styles.topLabel, { color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" }]}>
              Now Playing
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowMoreMenu(true)}
            hitSlop={12}
            style={styles.moreBtn}
          >
            <Feather name="more-horizontal" size={22} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* ── Main layout ── */}
        <View style={[styles.mainLayout, layout.isDesktop && styles.mainLayoutDesktop]}>

          {/* Album art */}
          <Animated.View
            style={[
              styles.artWrapper,
              { transform: [{ scale: artScale }, { translateX: swipeX }] },
              layout.isDesktop && { marginBottom: 0, marginRight: 0 },
            ]}
            {...panResponder.panHandlers}
          >
            <AlbumArt
              colors={currentSong.gradientColors}
              size={artSize}
              borderRadius={28}
            />
            {/* Swipe hint text */}
            <Text style={[styles.swipeHint, { color: "rgba(255,255,255,0.3)", fontFamily: "Inter_400Regular" }]}>
              swipe or tap
            </Text>
          </Animated.View>

          {/* Controls column */}
          <View style={[styles.controlsCol, layout.isDesktop && styles.controlsColDesktop]}>

            {/* Song info row */}
            <View style={styles.songInfoRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.songTitle, { color: "#fff", fontFamily: "Inter_700Bold" }]}
                  numberOfLines={1}
                >
                  {currentSong.title}
                </Text>
                <Text
                  style={[styles.songArtist, { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" }]}
                  numberOfLines={1}
                >
                  {currentSong.artist}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => { haptic(); toggleFavorite(currentSong.id); }}
                hitSlop={10}
                style={styles.heartBtn}
              >
                <Feather
                  name="heart"
                  size={24}
                  color={currentSong.favorite ? "#ef4444" : "rgba(255,255,255,0.4)"}
                />
              </TouchableOpacity>
            </View>

            {/* ── Waveform progress ── */}
            <TouchableOpacity
              activeOpacity={1}
              onLayout={(e) => { progressWidth.current = e.nativeEvent.layout.width; }}
              onPress={(e) => {
                const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / progressWidth.current));
                seekTo(ratio * duration);
              }}
              style={styles.waveformTouchable}
            >
              <View style={styles.waveform}>
                {waveformBars.map((h, i) => {
                  const barRatio = i / waveformBars.length;
                  const isActive = barRatio <= progress;
                  return (
                    <View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          height: h,
                          backgroundColor: isActive
                            ? currentSong.gradientColors[0]
                            : "rgba(255,255,255,0.12)",
                          borderRadius: 2,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </TouchableOpacity>

            {/* Time row */}
            <View style={styles.timeRow}>
              <Text style={[styles.timeText, { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular" }]}>
                {formatTime(position)}
              </Text>
              <Text style={[styles.timeText, { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular" }]}>
                {formatTime(duration)}
              </Text>
            </View>

            {/* ── Main controls ── */}
            <View style={styles.controls}>
              {/* Shuffle */}
              <TouchableOpacity onPress={() => { haptic(); toggleShuffle(); }} hitSlop={12}>
                <View>
                  <Feather
                    name="shuffle"
                    size={22}
                    color={shuffle ? "#a855f7" : "rgba(255,255,255,0.4)"}
                  />
                  {shuffle && <View style={[styles.activeDot, { backgroundColor: "#a855f7" }]} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { haptic(); playPrev(); }} hitSlop={10}>
                <Feather name="skip-back" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Play/pause */}
              <TouchableOpacity
                onPress={() => { haptic("medium"); pauseResume(); }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#a855f7", "#7c3aed"]}
                  style={styles.playBtn}
                >
                  <Feather name={isPlaying ? "pause" : "play"} size={30} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { haptic(); playNext(); }} hitSlop={10}>
                <Feather name="skip-forward" size={32} color="#fff" />
              </TouchableOpacity>

              {/* Repeat – 3 states with clear icons */}
              <TouchableOpacity onPress={() => { haptic(); toggleRepeat(); }} hitSlop={12}>
                <View>
                  {repeat === "none" && (
                    <Feather name="repeat" size={22} color="rgba(255,255,255,0.4)" />
                  )}
                  {repeat === "all" && (
                    <Feather name="repeat" size={22} color="#a855f7" />
                  )}
                  {repeat === "one" && (
                    <View style={styles.repeatOneContainer}>
                      <Feather name="repeat" size={22} color="#a855f7" />
                      <View style={[styles.repeatOneBadge, { backgroundColor: "#a855f7" }]}>
                        <Text style={[styles.repeatOneText, { color: "#fff" }]}>1</Text>
                      </View>
                    </View>
                  )}
                  {repeat !== "none" && (
                    <View style={[styles.activeDot, { backgroundColor: "#a855f7" }]} />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* ── Volume slider ── */}
            <VolumeSlider value={volume} onChange={setVolumeLevel} />

            {/* ── Bottom action bar ── */}
            <View style={styles.actionBar}>
              {/* Queue */}
              <TouchableOpacity
                onPress={() => setShowQueue(true)}
                style={styles.actionBtn}
              >
                <Feather name="list" size={18} color="rgba(255,255,255,0.55)" />
                <Text style={[styles.actionLabel, { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" }]}>
                  Queue
                </Text>
              </TouchableOpacity>

              {/* Speed */}
              <TouchableOpacity
                onPress={() => setShowSpeedPicker(true)}
                style={styles.actionBtn}
              >
                <View style={[styles.speedBadge, { borderColor: playbackSpeed !== 1 ? "#a855f7" : "rgba(255,255,255,0.3)" }]}>
                  <Text style={[
                    styles.speedText,
                    { color: playbackSpeed !== 1 ? "#a855f7" : "rgba(255,255,255,0.55)", fontFamily: "Inter_600SemiBold" }
                  ]}>
                    {playbackSpeed === 1 ? "1×" : `${playbackSpeed}×`}
                  </Text>
                </View>
                <Text style={[styles.actionLabel, { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" }]}>
                  Speed
                </Text>
              </TouchableOpacity>

              {/* Sleep timer */}
              <TouchableOpacity
                onPress={() => setShowSleepTimer(true)}
                style={styles.actionBtn}
              >
                <View style={{ position: "relative" }}>
                  <Feather
                    name="moon"
                    size={18}
                    color={sleepTimerEnd ? "#a855f7" : "rgba(255,255,255,0.55)"}
                  />
                  {sleepRemaining !== null && (
                    <View style={[styles.timerBadge, { backgroundColor: "#a855f7" }]}>
                      <Text style={[styles.timerBadgeText, { color: "#fff" }]}>{sleepRemaining}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.actionLabel, { color: sleepTimerEnd ? "#a855f7" : "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" }]}>
                  {sleepRemaining !== null ? `${sleepRemaining}m` : "Sleep"}
                </Text>
              </TouchableOpacity>

              {/* Add to playlist */}
              <TouchableOpacity
                onPress={() => setShowAddToPlaylist(true)}
                style={styles.actionBtn}
              >
                <Feather name="plus-circle" size={18} color="rgba(255,255,255,0.55)" />
                <Text style={[styles.actionLabel, { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" }]}>
                  Playlist
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </ScrollView>

      {/* ── Queue sheet ── */}
      <QueueSheet visible={showQueue} onClose={() => setShowQueue(false)} />

      {/* ── More options menu ── */}
      <Modal visible={showMoreMenu} transparent animationType="fade" onRequestClose={() => setShowMoreMenu(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowMoreMenu(false)}>
          <View style={[styles.menuCard, { backgroundColor: "#1c1c1c" }]}>
            {[
              { icon: "heart", label: currentSong.favorite ? "Remove from Favorites" : "Add to Favorites", action: () => { toggleFavorite(currentSong.id); setShowMoreMenu(false); } },
              { icon: "plus-circle", label: "Add to Playlist", action: () => { setShowMoreMenu(false); setShowAddToPlaylist(true); } },
              { icon: "list", label: "View Queue", action: () => { setShowMoreMenu(false); setShowQueue(true); } },
              { icon: "zap", label: "Playback Speed", action: () => { setShowMoreMenu(false); setShowSpeedPicker(true); } },
              { icon: "moon", label: "Sleep Timer", action: () => { setShowMoreMenu(false); setShowSleepTimer(true); } },
            ].map((item, idx) => (
              <TouchableOpacity key={idx} onPress={item.action} style={styles.menuItem}>
                <Feather name={item.icon as "heart"} size={18} color={item.icon === "heart" && currentSong.favorite ? "#ef4444" : "#fff"} />
                <Text style={[styles.menuItemText, { color: "#fff", fontFamily: "Inter_500Medium" }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Speed picker ── */}
      <Modal visible={showSpeedPicker} transparent animationType="fade" onRequestClose={() => setShowSpeedPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSpeedPicker(false)}>
          <View style={[styles.pickerCard, { backgroundColor: "#1c1c1c" }]}>
            <Text style={[styles.pickerTitle, { color: "#fff", fontFamily: "Inter_700Bold" }]}>Playback Speed</Text>
            <View style={styles.speedGrid}>
              {SPEED_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => { setPlaybackSpeed(s); setShowSpeedPicker(false); haptic(); }}
                  style={[
                    styles.speedOption,
                    {
                      backgroundColor: playbackSpeed === s ? "#a855f7" : "rgba(255,255,255,0.08)",
                      borderColor: playbackSpeed === s ? "#a855f7" : "transparent",
                    },
                  ]}
                >
                  <Text style={[styles.speedOptionText, { color: playbackSpeed === s ? "#fff" : "rgba(255,255,255,0.6)", fontFamily: playbackSpeed === s ? "Inter_700Bold" : "Inter_400Regular" }]}>
                    {s === 1 ? "Normal" : `${s}×`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Sleep timer ── */}
      <Modal visible={showSleepTimer} transparent animationType="fade" onRequestClose={() => setShowSleepTimer(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSleepTimer(false)}>
          <View style={[styles.pickerCard, { backgroundColor: "#1c1c1c" }]}>
            <Text style={[styles.pickerTitle, { color: "#fff", fontFamily: "Inter_700Bold" }]}>Sleep Timer</Text>
            <Text style={[styles.pickerSub, { color: "rgba(255,255,255,0.45)", fontFamily: "Inter_400Regular" }]}>
              Music will pause after the selected time
            </Text>
            {SLEEP_OPTIONS.map((mins) => (
              <TouchableOpacity
                key={mins}
                onPress={() => { setSleepTimer(mins); setShowSleepTimer(false); haptic(); }}
                style={[
                  styles.sleepOption,
                  {
                    backgroundColor: sleepRemaining !== null && Math.abs(sleepRemaining - mins) <= 1
                      ? "rgba(168,85,247,0.15)"
                      : "transparent",
                    borderColor: sleepRemaining !== null && Math.abs(sleepRemaining - mins) <= 1
                      ? "#a855f7"
                      : "rgba(255,255,255,0.1)",
                  },
                ]}
              >
                <Feather name="moon" size={16} color={sleepRemaining !== null ? "#a855f7" : "rgba(255,255,255,0.5)"} />
                <Text style={[styles.sleepOptionText, { color: "#fff", fontFamily: "Inter_500Medium" }]}>
                  {mins} minutes
                </Text>
              </TouchableOpacity>
            ))}
            {sleepTimerEnd && (
              <TouchableOpacity
                onPress={() => { setSleepTimer(null); setShowSleepTimer(false); }}
                style={[styles.sleepOption, { borderColor: "#ef4444" }]}
              >
                <Feather name="x-circle" size={16} color="#ef4444" />
                <Text style={[styles.sleepOptionText, { color: "#ef4444", fontFamily: "Inter_500Medium" }]}>
                  Cancel Timer ({sleepRemaining}m left)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Add to playlist ── */}
      <Modal visible={showAddToPlaylist} transparent animationType="slide" onRequestClose={() => setShowAddToPlaylist(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddToPlaylist(false)}>
          <View style={[styles.sheetCard, { backgroundColor: "#1c1c1c" }]}>
            <View style={styles.sheetHandle}>
              <View style={[styles.handle, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
            </View>
            <Text style={[styles.pickerTitle, { color: "#fff", fontFamily: "Inter_700Bold", marginBottom: 8 }]}>
              Add to Playlist
            </Text>
            {playlists.length === 0 ? (
              <Text style={[styles.pickerSub, { color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 20, fontFamily: "Inter_400Regular" }]}>
                No playlists yet. Create one in the Playlists tab.
              </Text>
            ) : (
              <FlatList
                data={playlists}
                keyExtractor={(p) => p.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => {
                  const inPlaylist = item.songIds.includes(currentSong.id);
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        if (!inPlaylist) {
                          addToPlaylist(item.id, currentSong.id);
                          haptic();
                        }
                        setShowAddToPlaylist(false);
                      }}
                      style={[styles.playlistOption, { borderBottomColor: "rgba(255,255,255,0.06)" }]}
                    >
                      <Feather name="music" size={16} color={inPlaylist ? "#a855f7" : "rgba(255,255,255,0.4)"} />
                      <Text style={[styles.playlistOptionText, { color: inPlaylist ? "#a855f7" : "#fff", fontFamily: inPlaylist ? "Inter_600SemiBold" : "Inter_400Regular" }]}>
                        {item.name}
                      </Text>
                      {inPlaylist && (
                        <Feather name="check" size={14} color="#a855f7" />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 28 },
  innerDesktop: { paddingHorizontal: 60 },
  emptyCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 18 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  topCenter: { flex: 1, alignItems: "center" },
  topLabel: { fontSize: 12, letterSpacing: 1, textTransform: "uppercase" },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  mainLayout: { alignItems: "center" },
  mainLayoutDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 60,
  },

  artWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.7,
    shadowRadius: 36,
    elevation: 24,
    marginBottom: 36,
    alignItems: "center",
  },
  swipeHint: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 12,
    textTransform: "uppercase",
  },

  controlsCol: { width: "100%" },
  controlsColDesktop: { flex: 1, maxWidth: 440 },

  songInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  songTitle: { fontSize: 24, lineHeight: 30 },
  songArtist: { fontSize: 15, marginTop: 4 },
  heartBtn: { padding: 6 },

  // Waveform
  waveformTouchable: { paddingVertical: 8, marginBottom: 4 },
  waveform: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 36,
    gap: 2,
  },
  waveBar: { flex: 1, minWidth: 2 },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  timeText: { fontSize: 12 },

  // Controls
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 3,
  },
  playBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  repeatOneContainer: { position: "relative" },
  repeatOneBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatOneText: { fontSize: 8, fontWeight: "700" },

  // Action bar
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  actionBtn: { alignItems: "center", gap: 6 },
  actionLabel: { fontSize: 10, letterSpacing: 0.3 },
  speedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  speedText: { fontSize: 12 },
  timerBadge: {
    position: "absolute",
    top: -5,
    right: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  timerBadgeText: { fontSize: 8 },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuCard: {
    width: "80%",
    maxWidth: 320,
    borderRadius: 20,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  menuItemText: { fontSize: 15 },

  pickerCard: {
    width: "85%",
    maxWidth: 360,
    borderRadius: 22,
    padding: 24,
    gap: 16,
  },
  pickerTitle: { fontSize: 18, textAlign: "center" },
  pickerSub: { fontSize: 13, textAlign: "center", marginTop: -8 },

  speedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  speedOption: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
  },
  speedOptionText: { fontSize: 14 },

  sleepOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 2,
  },
  sleepOptionText: { fontSize: 15, flex: 1 },

  sheetCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  sheetHandle: { alignItems: "center", marginBottom: 16 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  playlistOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  playlistOptionText: { fontSize: 15, flex: 1 },
});
