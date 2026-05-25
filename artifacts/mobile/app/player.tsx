import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
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
  const {
    currentSong,
    isPlaying,
    position,
    duration,
    shuffle,
    repeat,
    volume,
    pauseResume,
    playNext,
    playPrev,
    toggleShuffle,
    toggleRepeat,
    seekTo,
    setVolumeLevel,
  } = useMusic();

  const artScale = useRef(new Animated.Value(isPlaying ? 1 : 0.88)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const isSwiping = useRef(false);

  useEffect(() => {
    Animated.spring(artScale, {
      toValue: isPlaying ? 1 : 0.88,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
  }, [isPlaying, artScale]);

  const handlePlayPause = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    pauseResume();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderGrant: () => {
        isSwiping.current = false;
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 10) isSwiping.current = true;
        swipeX.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(swipeX, {
            toValue: -400,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            swipeX.setValue(0);
            playNext();
          });
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } else if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(swipeX, {
            toValue: 400,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            swipeX.setValue(0);
            playPrev();
          });
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        } else {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          if (!isSwiping.current) {
            handlePlayPause();
          }
        }
      },
    })
  ).current;

  const progress = duration > 0 ? position / duration : 0;

  const repeatIcon =
    repeat === "one" ? "repeat" : repeat === "all" ? "repeat" : "repeat";
  const repeatLabel =
    repeat === "none" ? "off" : repeat === "one" ? "1" : "all";

  if (!currentSong) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Text style={[styles.noSong, { color: colors.mutedForeground }]}>
          No song playing
        </Text>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={[...currentSong.gradientColors, "#000000"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.darkOverlay]} />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.topBtn, { backgroundColor: "rgba(255,255,255,0.1)" }]}
        >
          <Feather name="chevron-down" size={24} color="#fff" />
        </TouchableOpacity>
        <Text
          style={[
            styles.nowPlayingLabel,
            { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium" },
          ]}
        >
          Now Playing
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Album art with swipe */}
      <Animated.View
        style={[
          styles.artWrapper,
          { transform: [{ scale: artScale }, { translateX: swipeX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <AlbumArt
          colors={currentSong.gradientColors}
          size={280}
          borderRadius={24}
        />
      </Animated.View>

      {/* Song info */}
      <View style={styles.songInfo}>
        <Text
          style={[
            styles.songTitle,
            { color: "#fff", fontFamily: "Inter_700Bold" },
          ]}
          numberOfLines={1}
        >
          {currentSong.title}
        </Text>
        <Text
          style={[
            styles.songArtist,
            {
              color: "rgba(255,255,255,0.65)",
              fontFamily: "Inter_400Regular",
            },
          ]}
          numberOfLines={1}
        >
          {currentSong.artist}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View
          style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: "#fff",
              },
            ]}
          />
          <TouchableOpacity
            style={[
              styles.progressThumb,
              { left: `${progress * 100}%` as unknown as number },
            ]}
            onPress={async () => {}}
          />
        </View>
        <View style={styles.timeRow}>
          <Text
            style={[
              styles.timeText,
              {
                color: "rgba(255,255,255,0.6)",
                fontFamily: "Inter_400Regular",
              },
            ]}
          >
            {formatTime(position)}
          </Text>
          <Text
            style={[
              styles.timeText,
              {
                color: "rgba(255,255,255,0.6)",
                fontFamily: "Inter_400Regular",
              },
            ]}
          >
            {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={toggleShuffle}
          hitSlop={12}
          style={styles.controlSide}
        >
          <Feather
            name="shuffle"
            size={22}
            color={shuffle ? colors.primary : "rgba(255,255,255,0.5)"}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={playPrev} hitSlop={8}>
          <Feather name="skip-back" size={36} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePlayPause}
          style={[styles.playBtn]}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.primary, "#7c3aed"]}
            style={styles.playBtnGrad}
          >
            <Feather
              name={isPlaying ? "pause" : "play"}
              size={32}
              color="#fff"
            />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={playNext} hitSlop={8}>
          <Feather name="skip-forward" size={36} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={toggleRepeat}
          hitSlop={12}
          style={styles.controlSide}
        >
          <View style={styles.repeatContainer}>
            <Feather
              name={repeatIcon}
              size={22}
              color={
                repeat !== "none" ? colors.primary : "rgba(255,255,255,0.5)"
              }
            />
            {repeat !== "none" && (
              <Text
                style={[
                  styles.repeatBadge,
                  { color: colors.primary, fontFamily: "Inter_700Bold" },
                ]}
              >
                {repeatLabel}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Volume */}
      <View style={[styles.volumeRow, { paddingBottom: botPad + 20 }]}>
        <Feather name="volume" size={18} color="rgba(255,255,255,0.5)" />
        <View style={styles.volumeTrack}>
          <View
            style={[
              styles.volumeFill,
              {
                width: `${volume * 100}%`,
                backgroundColor: "rgba(255,255,255,0.8)",
              },
            ]}
          />
        </View>
        <TouchableOpacity
          onPress={() => setVolumeLevel(volume > 0.5 ? 1 : volume > 0 ? 0.5 : 0)}
          style={styles.volBtn}
        >
          <Feather name="volume-2" size={18} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center" },
  darkOverlay: { backgroundColor: "rgba(0,0,0,0.55)" },
  noSong: { marginTop: 100, fontSize: 18 },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlayingLabel: { fontSize: 14, letterSpacing: 0.5 },
  artWrapper: {
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  songInfo: {
    width: "100%",
    paddingHorizontal: 32,
    marginTop: 36,
    gap: 6,
  },
  songTitle: { fontSize: 26, textAlign: "center" },
  songArtist: { fontSize: 16, textAlign: "center" },
  progressContainer: {
    width: "100%",
    paddingHorizontal: 32,
    marginTop: 32,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    position: "relative",
    overflow: "visible",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: -6,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
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
    width: "100%",
    paddingHorizontal: 28,
    marginTop: 36,
  },
  controlSide: {
    width: 40,
    alignItems: "center",
  },
  playBtn: {
    shadowColor: "#a855f7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  playBtnGrad: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  repeatBadge: {
    position: "absolute",
    bottom: -10,
    fontSize: 9,
  },
  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 32,
    gap: 12,
    marginTop: 28,
  },
  volumeTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  volumeFill: {
    height: 3,
    borderRadius: 2,
  },
  volBtn: { padding: 4 },
});
