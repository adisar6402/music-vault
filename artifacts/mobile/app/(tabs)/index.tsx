import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
import { SongItem } from "@/components/SongItem";
import { Song, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";
import { useLayout } from "@/hooks/useLayout";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function RecentCard({ song, onPlay }: { song: Song; onPlay: (s: Song) => void }) {
  const colors = useColors();
  const { isTablet, isDesktop } = useLayout();
  const size = isDesktop || isTablet ? 160 : 120;
  return (
    <TouchableOpacity
      onPress={() => onPlay(song)}
      activeOpacity={0.8}
      style={[styles.recentCard, { width: size }]}
    >
      <AlbumArt colors={song.gradientColors} size={size} borderRadius={16} />
      <Text
        style={[styles.recentTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
        numberOfLines={2}
      >
        {song.title}
      </Text>
      <Text
        style={[styles.recentArtist, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
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
  const layout = useLayout();
  const {
    songs, playlists, addSongs, playSong, currentSong,
    currentMood, setCurrentMood, isLoading,
  } = useMusic();

  const recentSongs = useMemo(
    () => [...songs].sort((a, b) => b.addedAt - a.addedAt).slice(0, 12),
    [songs]
  );

  const filteredSongs = useMemo(() => {
    if (currentMood === "all") return songs;
    return songs.filter((s) => s.mood === currentMood);
  }, [songs, currentMood]);

  const topPadding = Platform.OS === "web" ? 24 : insets.top;
  const bottomPadding = layout.isDesktop ? 40 : currentSong ? 160 : 100;
  const contentPadding = layout.isDesktop ? 40 : 20;

  const handleAdd = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addSongs();
  };

  const handlePlay = (song: Song) => {
    playSong(song, filteredSongs.length > 0 ? filteredSongs : songs);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 20, paddingBottom: bottomPadding, paddingHorizontal: contentPadding },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {greeting()} 👋
            </Text>
            <Text style={[styles.appName, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              MusicVault
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleAdd}
            activeOpacity={0.8}
            disabled={isLoading}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="plus" size={18} color="#fff" />
                {layout.isDesktop && (
                  <Text style={[styles.addBtnLabel, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                    Add Music
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Mood selector */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Mood
          </Text>
        </View>
        <View style={styles.moodWrapper}>
          <MoodSelector selected={currentMood} onChange={setCurrentMood} />
        </View>

        {/* Recently added */}
        {recentSongs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Recently Added
            </Text>
            <FlatList
              data={recentSongs}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(s) => s.id}
              contentContainerStyle={styles.recentList}
              renderItem={({ item }) => <RecentCard song={item} onPlay={handlePlay} />}
            />
          </View>
        )}

        {/* Quick play grid - desktop shows songs in a grid */}
        {layout.isDesktop && filteredSongs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {currentMood === "all" ? "All Songs" : `${currentMood.charAt(0).toUpperCase() + currentMood.slice(1)} Vibes`}
              </Text>
              <Text style={[styles.songCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {filteredSongs.length} songs
              </Text>
            </View>
            <View style={styles.desktopSongGrid}>
              {filteredSongs.slice(0, 8).map((song) => (
                <SongItem key={song.id} song={song} queue={filteredSongs} />
              ))}
            </View>
          </View>
        )}

        {/* Playlists preview */}
        {playlists.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                Playlists
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/playlists")}>
                <Text style={[styles.seeAll, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            <View style={layout.isDesktop ? styles.desktopPlaylistGrid : styles.playlistRow}>
              {playlists.slice(0, layout.isDesktop ? 6 : 4).map((pl) => (
                <TouchableOpacity
                  key={pl.id}
                  onPress={() => router.push(`/playlist/${pl.id}`)}
                  activeOpacity={0.8}
                  style={[
                    layout.isDesktop ? styles.desktopPlCard : styles.plCard,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <LinearGradient
                    colors={["rgba(168,85,247,0.2)", "rgba(168,85,247,0.05)"]}
                    style={styles.plCardGrad}
                  >
                    <Feather name="music" size={20} color={colors.primary} />
                  </LinearGradient>
                  <Text
                    style={[styles.plName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
                    numberOfLines={1}
                  >
                    {pl.name}
                  </Text>
                  <Text
                    style={[styles.plCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
                  >
                    {pl.songIds.length} songs
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {songs.length === 0 && (
          <View style={styles.empty}>
            <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.emptyIcon}>
              <Feather name="music" size={48} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Your vault is empty
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Upload your MP3 files to start listening offline
            </Text>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.emptyBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                  Add Music
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Mini player (mobile only) */}
      {!layout.isDesktop && (
        <View style={[styles.miniPlayerWrapper, { bottom: 84 }]}>
          <MiniPlayer />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {},
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  greeting: { fontSize: 14, marginBottom: 4 },
  appName: { fontSize: 30 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
  },
  addBtnLabel: { fontSize: 14 },
  sectionHeader: { marginBottom: 14 },
  sectionTitle: { fontSize: 20 },
  moodWrapper: { marginLeft: -20, marginRight: -20, marginBottom: 8 },
  section: { marginTop: 32 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  seeAll: { fontSize: 14 },
  songCount: { fontSize: 13 },
  recentList: { gap: 16, paddingBottom: 4 },
  recentCard: {},
  recentTitle: { fontSize: 13, marginTop: 10, lineHeight: 18 },
  recentArtist: { fontSize: 12, marginTop: 3 },
  desktopSongGrid: {},
  desktopPlaylistGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  desktopPlCard: {
    width: "31%",
    padding: 20,
    borderRadius: 16,
    gap: 10,
  },
  playlistRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  plCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  plCardGrad: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  plName: { fontSize: 14 },
  plCount: { fontSize: 12 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 18,
  },
  emptyIcon: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 24, textAlign: "center" },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 300 },
  emptyBtn: {
    marginTop: 4,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
  },
  emptyBtnText: { fontSize: 16 },
  miniPlayerWrapper: { position: "absolute", left: 8, right: 8 },
});
