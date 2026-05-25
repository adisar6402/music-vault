import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
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

export function MiniPlayer() {
  const colors = useColors();
  const router = useRouter();
  const { currentSong, isPlaying, pauseResume, playNext } = useMusic();
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentSong ? 0 : 100,
      useNativeDriver: true,
      tension: 100,
      friction: 12,
    }).start();
  }, [currentSong, slideAnim]);

  if (!currentSong) return null;

  const handlePlayPause = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    pauseResume();
  };

  const handleNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playNext();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: "#1a1a1a" }]}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push("/player")}
        activeOpacity={0.9}
        style={styles.inner}
      >
        <AlbumArt
          colors={currentSong.gradientColors}
          size={44}
          borderRadius={8}
        />
        <View style={styles.info}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
            ]}
            numberOfLines={1}
          >
            {currentSong.title}
          </Text>
          <Text
            style={[
              styles.artist,
              {
                color: colors.mutedForeground,
                fontFamily: "Inter_400Regular",
              },
            ]}
            numberOfLines={1}
          >
            {currentSong.artist}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={handlePlayPause}
            hitSlop={8}
            style={[styles.playBtn, { backgroundColor: colors.primary }]}
          >
            <Feather
              name={isPlaying ? "pause" : "play"}
              size={18}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} hitSlop={8}>
            <Feather name="skip-forward" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
  },
  artist: {
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
