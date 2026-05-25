import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { AlbumArt } from "@/components/AlbumArt";
import { Playlist, Song } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

interface PlaylistCardProps {
  playlist: Playlist;
  songs: Song[];
  onPress: () => void;
  onLongPress?: () => void;
}

export function PlaylistCard({
  playlist,
  songs,
  onPress,
  onLongPress,
}: PlaylistCardProps) {
  const colors = useColors();
  const playlistSongs = playlist.songIds
    .map((id) => songs.find((s) => s.id === id))
    .filter(Boolean) as Song[];

  const previewSong = playlistSongs[0];

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: colors.card }]}
    >
      <View style={styles.artContainer}>
        {previewSong ? (
          <AlbumArt
            colors={previewSong.gradientColors}
            size={64}
            borderRadius={10}
          />
        ) : (
          <LinearGradient
            colors={["#2a2a2a", "#1a1a1a"]}
            style={[styles.emptyArt, { borderRadius: 10 }]}
          >
            <Feather name="music" size={24} color={colors.mutedForeground} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.info}>
        <Text
          style={[
            styles.name,
            { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
          ]}
          numberOfLines={1}
        >
          {playlist.name}
        </Text>
        <Text
          style={[
            styles.count,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {playlist.songIds.length} song{playlist.songIds.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 12,
    gap: 14,
    marginBottom: 10,
  },
  artContainer: {},
  emptyArt: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
  },
  count: {
    fontSize: 13,
  },
});
