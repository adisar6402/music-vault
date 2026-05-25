import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { Song, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

interface SongItemProps {
  song: Song;
  queue?: Song[];
  showMenu?: boolean;
  onLongPress?: (song: Song) => void;
}

function formatDuration(ms: number): string {
  if (!ms) return "--:--";
  const secs = Math.floor(ms / 1000);
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
}

// Pulsing equalizer bars — 3 bars that animate at different speeds
function NowPlayingBars({ color, active }: { color: string; active: boolean }) {
  const bar1 = useRef(new Animated.Value(0.3)).current;
  const bar2 = useRef(new Animated.Value(0.6)).current;
  const bar3 = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!active) {
      Animated.parallel([
        Animated.spring(bar1, { toValue: 0.2, useNativeDriver: false }),
        Animated.spring(bar2, { toValue: 0.2, useNativeDriver: false }),
        Animated.spring(bar3, { toValue: 0.2, useNativeDriver: false }),
      ]).start();
      return;
    }

    const animate = (bar: Animated.Value, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, { toValue: 1, duration, useNativeDriver: false }),
          Animated.timing(bar, { toValue: 0.2, duration, useNativeDriver: false }),
        ])
      ).start();
    };
    animate(bar1, 380);
    animate(bar2, 260);
    animate(bar3, 450);

    return () => {
      bar1.stopAnimation();
      bar2.stopAnimation();
      bar3.stopAnimation();
    };
  }, [active, bar1, bar2, bar3]);

  const heights = [bar1, bar2, bar3];

  return (
    <View style={bars.container}>
      {heights.map((h, i) => (
        <Animated.View
          key={i}
          style={[
            bars.bar,
            {
              backgroundColor: color,
              height: h.interpolate({ inputRange: [0, 1], outputRange: [3, 16] }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const bars = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 16, width: 18 },
  bar: { width: 4, borderRadius: 2 },
});

export function SongItem({ song, queue, showMenu = true, onLongPress }: SongItemProps) {
  const colors = useColors();
  const { playSong, currentSong, isPlaying, toggleFavorite } = useMusic();
  const isActive = currentSong?.id === song.id;
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Quick press scale animation
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    playSong(song, queue);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={() => onLongPress?.(song)}
        activeOpacity={0.75}
        style={[
          styles.container,
          {
            backgroundColor: isActive
              ? "rgba(168,85,247,0.1)"
              : "transparent",
            borderColor: isActive ? "rgba(168,85,247,0.2)" : "transparent",
          },
        ]}
      >
        {/* Album art with "now playing" overlay */}
        <View style={styles.artWrap}>
          <AlbumArt colors={song.gradientColors} size={50} borderRadius={10} />
          {isActive && (
            <View style={[styles.artOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
              <NowPlayingBars color="#fff" active={isPlaying} />
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text
            style={[
              styles.title,
              {
                color: isActive ? colors.primary : colors.foreground,
                fontFamily: isActive ? "Inter_700Bold" : "Inter_600SemiBold",
              },
            ]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text
            style={[styles.artist, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
            numberOfLines={1}
          >
            {song.artist}
          </Text>
        </View>

        <View style={styles.actions}>
          <Text style={[styles.duration, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {formatDuration(song.duration)}
          </Text>
          {showMenu && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleFavorite(song.id);
              }}
              hitSlop={8}
              style={styles.fav}
            >
              <Feather
                name="heart"
                size={17}
                color={song.favorite ? "#ef4444" : colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  artWrap: { position: "relative" },
  artOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 3 },
  title: { fontSize: 15 },
  artist: { fontSize: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  duration: { fontSize: 12 },
  fav: { padding: 4 },
});
