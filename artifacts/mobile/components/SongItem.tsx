import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
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
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SongItem({
  song,
  queue,
  showMenu = true,
  onLongPress,
}: SongItemProps) {
  const colors = useColors();
  const { playSong, currentSong, isPlaying, toggleFavorite } = useMusic();

  const isActive = currentSong?.id === song.id;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    playSong(song, queue);
  };

  const handleFav = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleFavorite(song.id);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={() => onLongPress?.(song)}
      activeOpacity={0.7}
      style={[
        styles.container,
        { backgroundColor: isActive ? colors.card : "transparent" },
      ]}
    >
      <AlbumArt colors={song.gradientColors} size={50} borderRadius={8} />
      <View style={styles.info}>
        <Text
          style={[
            styles.title,
            {
              color: isActive ? colors.primary : colors.foreground,
              fontFamily: "Inter_600SemiBold",
            },
          ]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text
          style={[
            styles.artist,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
          numberOfLines={1}
        >
          {song.artist}
        </Text>
      </View>
      <View style={styles.actions}>
        <Text
          style={[
            styles.duration,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {formatDuration(song.duration)}
        </Text>
        {showMenu && (
          <TouchableOpacity onPress={handleFav} hitSlop={8} style={styles.fav}>
            <Feather
              name="heart"
              size={18}
              color={song.favorite ? "#ef4444" : colors.mutedForeground}
            />
          </TouchableOpacity>
        )}
        {isActive && isPlaying && (
          <View style={styles.playingDot}>
            <View
              style={[styles.dot, { backgroundColor: colors.primary }]}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 12,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
  },
  artist: {
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  duration: {
    fontSize: 12,
  },
  fav: {
    padding: 4,
  },
  playingDot: {
    width: 8,
    height: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
