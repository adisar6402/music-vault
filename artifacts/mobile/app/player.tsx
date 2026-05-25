import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumArt } from "@/components/AlbumArt";
import { useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";
import { useLayout } from "@/hooks/useLayout";

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SWIPE_THRESHOLD = 80;

export default function PlayerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useLayout();
  const {
    currentSong, isPlaying, position, duration,
    shuffle, repeat, volume,
    pauseResume, playNext, playPrev,
    toggleShuffle, toggleRepeat, seekTo, setVolumeLevel,
  } = useMusic();

  const artScale = useRef(new Animated.Value(isPlaying ? 1 : 0.9)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const isSwiping = useRef(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const progressBarRef = useRef<View>(null);
  const progressBarWidth = useRef(0);

  useEffect(() => {
    Animated.spring(artScale, {
      toValue: isPlaying ? 1 : 0.88,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [isPlaying, artScale]);

  const handlePlayPause = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    pauseResume();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => { isSwiping.current = false; },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 10) isSwiping.current = true;
        swipeX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(swipeX, { toValue: -400, duration: 150, useNativeDriver: true }).start(() => {
            swipeX.setValue(0);
            playNext();
          });
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(swipeX, { toValue: 400, duration: 150, useNativeDriver: true }).start(() => {
            swipeX.setValue(0);
            playPrev();
          });
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true }).start();
          if (!isSwiping.current) handlePlayPause();
        }
      },
    })
  ).current;

  const progress = duration > 0 ? (isSeeking ? seekPosition : position) / duration : 0;
  const artSize = layout.isDesktop ? 260 : layout.isTablet ? 300 : 280;

  const topPad = Platform.OS === "web" ? 24 : insets.top;
  const botPad = Platform.OS === "web" ? 32 : insets.bottom;

  if (!currentSong) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.topBtn, { marginTop: topPad + 16, marginLeft: 20 }]}>
          <Feather name="chevron-down" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.noSongCenter}>
          <Feather name="music" size={64} color={colors.mutedForeground} />
          <Text style={[styles.noSong, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            No song playing
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Blurred gradient background */}
      <LinearGradient
        colors={[...currentSong.gradientColors, "#000000"]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]} />

      <View style={[styles.inner, layout.isDesktop && styles.innerDesktop]}>
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.topBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
          >
            <Feather name="chevron-down" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <Text style={[styles.nowPlayingLabel, { color: "rgba(255,255,255,0.55)", fontFamily: "Inter_400Regular" }]}>
              Now Playing
            </Text>
            <Text style={[styles.nowPlayingTitle, { color: "#fff", fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {currentSong.title}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Main content */}
        <View style={[styles.mainContent, layout.isDesktop && styles.mainContentDesktop]}>
          {/* Album art */}
          <Animated.View
            style={[
              styles.artWrapper,
              { transform: [{ scale: artScale }, { translateX: swipeX }] },
              layout.isDesktop && styles.artWrapperDesktop,
            ]}
            {...panResponder.panHandlers}
          >
            <AlbumArt colors={currentSong.gradientColors} size={artSize} borderRadius={24} />
          </Animated.View>

          {/* Right side (desktop) or below art (mobile) */}
          <View style={[styles.controlsSection, layout.isDesktop && styles.controlsSectionDesktop]}>
            {/* Song info */}
            <View style={styles.songInfo}>
              <Text
                style={[styles.songTitle, { color: "#fff", fontFamily: "Inter_700Bold" }]}
                numberOfLines={1}
              >
                {currentSong.title}
              </Text>
              <Text
                style={[styles.songArtist, { color: "rgba(255,255,255,0.6)", fontFamily: "Inter_400Regular" }]}
                numberOfLines={1}
              >
                {currentSong.artist}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressSection}>
              <TouchableOpacity
                activeOpacity={1}
                onLayout={(e) => { progressBarWidth.current = e.nativeEvent.layout.width; }}
                onPress={(e) => {
                  const x = e.nativeEvent.locationX;
                  const ratio = Math.max(0, Math.min(1, x / progressBarWidth.current));
                  const ms = ratio * duration;
                  seekTo(ms);
                }}
                style={styles.progressBarTouchable}
              >
                <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress * 100}%` as unknown as number },
                    ]}
                  />
                  <View
                    style={[
                      styles.progressThumb,
                      { left: `${Math.min(95, progress * 100)}%` as unknown as number },
                    ]}
                  />
                </View>
              </TouchableOpacity>
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" }]}>
                  {formatTime(position)}
                </Text>
                <Text style={[styles.timeText, { color: "rgba(255,255,255,0.5)", fontFamily: "Inter_400Regular" }]}>
                  {formatTime(duration)}
                </Text>
              </View>
            </View>

            {/* Main controls */}
            <View style={styles.controls}>
              <TouchableOpacity onPress={toggleShuffle} hitSlop={12}>
                <Feather
                  name="shuffle"
                  size={22}
                  color={shuffle ? "#a855f7" : "rgba(255,255,255,0.45)"}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={playPrev} hitSlop={8}>
                <Feather name="skip-back" size={34} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity onPress={handlePlayPause} activeOpacity={0.85}>
                <LinearGradient
                  colors={["#a855f7", "#7c3aed"]}
                  style={styles.playBtnGrad}
                >
                  <Feather name={isPlaying ? "pause" : "play"} size={30} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={playNext} hitSlop={8}>
                <Feather name="skip-forward" size={34} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleRepeat} hitSlop={12}>
                <View>
                  <Feather
                    name="repeat"
                    size={22}
                    color={repeat !== "none" ? "#a855f7" : "rgba(255,255,255,0.45)"}
                  />
                  {repeat === "one" && (
                    <View style={styles.repeatBadge}>
                      <Text style={[styles.repeatBadgeText, { color: "#a855f7" }]}>1</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Volume */}
            <View style={[styles.volumeRow, { paddingBottom: botPad + 16 }]}>
              <Feather name="volume" size={16} color="rgba(255,255,255,0.4)" />
              <TouchableOpacity
                style={styles.volumeTrackTouch}
                onPress={(e) => {
                  const x = e.nativeEvent.locationX;
                  const tw = e.nativeEvent.target;
                  // Simple toggle for volume control
                  const newVol = volume > 0.66 ? 0.33 : volume > 0.33 ? 0.66 : 1;
                  setVolumeLevel(newVol);
                }}
                activeOpacity={1}
              >
                <View style={[styles.volumeTrack, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                  <LinearGradient
                    colors={["#a855f7", "#7c3aed"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.volumeFill, { width: `${volume * 100}%` as unknown as number }]}
                  />
                </View>
              </TouchableOpacity>
              <Feather name="volume-2" size={16} color="rgba(255,255,255,0.4)" />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1 },
  innerDesktop: {},
  noSongCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  noSong: { fontSize: 18 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: { flex: 1, alignItems: "center", paddingHorizontal: 12 },
  nowPlayingLabel: { fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  nowPlayingTitle: { fontSize: 14, marginTop: 2 },

  mainContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
  },
  mainContentDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 60,
    paddingHorizontal: 60,
  },

  artWrapper: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
    marginTop: 20,
    marginBottom: 32,
  },
  artWrapperDesktop: {
    marginTop: 0,
    marginBottom: 0,
    flexShrink: 0,
  },

  controlsSection: {
    width: "100%",
    gap: 0,
  },
  controlsSectionDesktop: {
    flex: 1,
    maxWidth: 420,
    gap: 0,
  },

  songInfo: {
    gap: 6,
    marginBottom: 28,
  },
  songTitle: { fontSize: 26 },
  songArtist: { fontSize: 16 },

  progressSection: { marginBottom: 32 },
  progressBarTouchable: { paddingVertical: 10 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    position: "relative",
    overflow: "visible",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#fff",
  },
  progressThumb: {
    position: "absolute",
    top: -7,
    marginLeft: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  timeText: { fontSize: 12 },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  playBtnGrad: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  repeatBadge: {
    position: "absolute",
    bottom: -9,
    right: -2,
  },
  repeatBadgeText: { fontSize: 9, fontWeight: "700" },

  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  volumeTrackTouch: { flex: 1 },
  volumeTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  volumeFill: { height: 4, borderRadius: 2 },
});
