import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumArt } from "@/components/AlbumArt";
import { MiniPlayer } from "@/components/MiniPlayer";
import { MoodSelector } from "@/components/MoodSelector";
import { Song, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function RecentCard({ song, onPlay }: { song: Song; onPlay: (s: Song) => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={() => onPlay(song)}
      activeOpacity={0.8}
      style={styles.recentCard}
    >
      <AlbumArt colors={song.gradientColors} size={120} borderRadius={14} />
      <Text
        style={[
          styles.recentTitle,
          { color: colors.foreground, fontFamily: "Inter_600SemiBold" },
        ]}
        numberOfLines={2}
      >
        {song.title}
      </Text>
      <Text
        style={[
          styles.recentArtist,
          { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
        ]}
        numberOfLines={1}
      >
        {song.artist}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    songs,
    playlists,
    addSongs,
    playSong,
    currentSong,
    currentMood,
    setCurrentMood,
    isLoading,
  } = useMusic();

  const recentSongs = useMemo(() => {
    return [...songs]
      .sort((a, b) => b.addedAt - a.addedAt)
      .slice(0, 10);
  }, [songs]);

  const filteredSongs = useMemo(() => {
    if (currentMood === "all") return songs;
    return songs.filter((s) => s.mood === currentMood);
  }, [songs, currentMood]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleAdd = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await addSongs();
  };

  const handlePlay = (song: Song) => {
    playSong(song, filteredSongs.length > 0 ? filteredSongs : songs);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 16, paddingBottom: currentSong ? 140 : 80 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text
              style={[
                styles.greeting,
                { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
              ]}
            >
              {greeting()}
            </Text>
            <Text
              style={[
                styles.appName,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              MusicVault
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.8}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="plus" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Mood selector */}
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Mood
          </Text>
        </View>
        <MoodSelector selected={currentMood} onChange={setCurrentMood} />

        {/* Recently added */}
        {recentSongs.length > 0 && (
          <View style={styles.sectionTop}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              Recently Added
            </Text>
            <FlatList
              data={recentSongs}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(s) => s.id}
              contentContainerStyle={styles.recentList}
              renderItem={({ item }) => (
                <RecentCard song={item} onPlay={handlePlay} />
              )}
            />
          </View>
        )}

        {/* Playlists preview */}
        {playlists.length > 0 && (
          <View style={styles.sectionTop}>
            <View style={styles.row}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
              >
                Playlists
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/playlists")}>
                <Text
                  style={[
                    styles.seeAll,
                    { color: colors.primary, fontFamily: "Inter_500Medium" },
                  ]}
                >
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playlistRow}
            >
              {playlists.slice(0, 6).map((pl) => (
                <TouchableOpacity
                  key={pl.id}
                  onPress={() => router.push(`/playlist/${pl.id}`)}
                  activeOpacity={0.8}
                  style={[styles.plCard, { backgroundColor: colors.card }]}
                >
                  <Feather name="music" size={22} color={colors.primary} />
                  <Text
                    style={[
                      styles.plName,
                      {
                        color: colors.foreground,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {pl.name}
                  </Text>
                  <Text
                    style={[
                      styles.plCount,
                      {
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                      },
                    ]}
                  >
                    {pl.songIds.length} songs
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Empty state */}
        {songs.length === 0 && (
          <View style={styles.empty}>
            <View
              style={[styles.emptyIcon, { backgroundColor: colors.card }]}
            >
              <Feather name="music" size={48} color={colors.primary} />
            </View>
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, fontFamily: "Inter_700Bold" },
              ]}
            >
              Your vault is empty
            </Text>
            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              Tap the + button to add your music files
            </Text>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={isLoading}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={[
                    styles.emptyBtnText,
                    { color: "#fff", fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Add Music
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Mini player */}
      <View
        style={[
          styles.miniPlayerWrapper,
          { bottom: Platform.OS === "web" ? 84 + 34 : 84 },
        ]}
      >
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  appName: { fontSize: 28 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { paddingHorizontal: 20, marginBottom: 12 },
  sectionTop: { marginTop: 28 },
  sectionTitle: { fontSize: 20, marginBottom: 14, paddingHorizontal: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  seeAll: { fontSize: 14 },
  recentList: { paddingHorizontal: 20, gap: 16 },
  recentCard: { width: 120 },
  recentTitle: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  recentArtist: { fontSize: 12, marginTop: 3 },
  playlistRow: { paddingHorizontal: 20, gap: 12 },
  plCard: {
    width: 140,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  plName: { fontSize: 14, lineHeight: 20 },
  plCount: { fontSize: 12 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, textAlign: "center" },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
  },
  emptyBtnText: { fontSize: 16 },
  miniPlayerWrapper: { position: "absolute", left: 0, right: 0 },
});
