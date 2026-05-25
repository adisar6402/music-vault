import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AlbumArt } from "@/components/AlbumArt";
import { useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";
import { useLayout } from "@/hooks/useLayout";

export function MiniPlayer() {
  const colors = useColors();
  const router = useRouter();
  const layout = useLayout();
  const { currentSong, isPlaying, pauseResume, playNext, position, duration } = useMusic();
  const slideAnim = useRef(new Animated.Value(120)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentSong ? 0 : 120,
      useNativeDriver: true,
      tension: 120,
      friction: 14,
    }).start();
  }, [currentSong, slideAnim]);

  // Never show on desktop (sidebar handles it)
  if (layout.isDesktop) return null;
  if (!currentSong) return null;

  const progress = duration > 0 ? position / duration : 0;

  const handlePlayPause = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pauseResume();
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      {Platform.OS === "ios" ? (
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1c1c1c" }]} />
      )}

      {/* Progress bar at top */}
      <View style={[styles.progressStrip, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${progress * 100}%` as unknown as number, backgroundColor: colors.primary },
          ]}
        />
      </View>

      <TouchableOpacity
        onPress={() => router.push("/player")}
        activeOpacity={0.95}
        style={styles.inner}
      >
        <AlbumArt colors={currentSong.gradientColors} size={46} borderRadius={10} />
        <View style={styles.info}>
          <Text
            style={[styles.title, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
            numberOfLines={1}
          >
            {currentSong.title}
          </Text>
          <Text
            style={[styles.artist, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            numberOfLines={1}
          >
            {currentSong.artist}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={handlePlayPause}
            hitSlop={10}
            style={[styles.playBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              playNext();
            }}
            hitSlop={10}
          >
            <Feather name="skip-forward" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 14,
  },
  progressStrip: {
    height: 2,
    width: "100%",
  },
  progressFill: {
    height: 2,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  info: { flex: 1 },
  title: { fontSize: 14 },
  artist: { fontSize: 12, marginTop: 2 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
