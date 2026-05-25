import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
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
import { MoodTagSheet } from "@/components/MoodTagSheet";
import { SongContextMenu } from "@/components/SongContextMenu";
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

const MOOD_META: Record<string, { label: string; desc: string; icon: string; color: string }> = {
  chill:   { label: "Chill",   desc: "Relaxed & laid-back vibes",    icon: "😌", color: "#0ea5e9" },
  focus:   { label: "Focus",   desc: "Deep work & concentration",     icon: "🧠", color: "#8b5cf6" },
  workout: { label: "Workout", desc: "High energy — let's go!",       icon: "🔥", color: "#f97316" },
  sleep:   { label: "Sleep",   desc: "Wind down & drift off",         icon: "🌙", color: "#6366f1" },
};

function RecentCard({ song, onPlay, onLongPress }: { song: Song; onPlay: (s: Song) => void; onLongPress: (s: Song) => void }) {
  const colors = useColors();
  const { isTablet, isDesktop } = useLayout();
  const size = isDesktop || isTablet ? 155 : 120;
  return (
    <TouchableOpacity
      onPress={() => onPlay(song)}
      onLongPress={() => onLongPress(song)}
      activeOpacity={0.8}
      style={[styles.recentCard, { width: size }]}
    >
      <AlbumArt colors={song.gradientColors} size={size} borderRadius={16} />
      {song.mood && (
        <View style={[styles.moodBadge, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <Text style={styles.moodBadgeText}>{MOOD_META[song.mood]?.icon}</Text>
        </View>
      )}
      <Text style={[styles.recentTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={2}>
        {song.title}
      </Text>
      <Text style={[styles.recentArtist, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
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
    songs, playlists, addSongs, playSong, deleteSong, currentSong,
    currentMood, setCurrentMood, isLoading,
  } = useMusic();

  const [contextSong, setContextSong] = useState<Song | null>(null);
  const [moodSong, setMoodSong] = useState<Song | null>(null);

  const recentSongs = useMemo(
    () => [...songs].sort((a, b) => b.addedAt - a.addedAt).slice(0, 12),
    [songs]
  );

  const filteredSongs = useMemo(() => {
    if (currentMood === "all") return songs;
    return songs.filter((s) => s.mood === currentMood);
  }, [songs, currentMood]);

  // Counts for mood tabs
  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of songs) {
      if (s.mood) counts[s.mood] = (counts[s.mood] ?? 0) + 1;
    }
    return counts;
  }, [songs]);

  const topPadding = Platform.OS === "web" ? 24 : insets.top;
  const botPadding = layout.isDesktop ? 40 : currentSong ? 160 : 100;
  const hPad = layout.isDesktop ? 40 : 20;

  const handleAdd = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addSongs();
  };

  const handlePlay = (song: Song) => {
    const queue = filteredSongs.length > 0 ? filteredSongs : songs;
    playSong(song, queue);
  };

  const handleLongPress = (song: Song) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextSong(song);
  };

  const moodInfo = currentMood !== "all" ? MOOD_META[currentMood] : null;
  const hasMoodSongs = filteredSongs.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 20, paddingBottom: botPadding, paddingHorizontal: hPad },
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

        {/* ── Mood section ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Mood
          </Text>
          {songs.length > 0 && (
            <Text style={[styles.moodHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Hold a song to tag it
            </Text>
          )}
        </View>

        <View style={styles.moodWrapper}>
          <MoodSelector
            selected={currentMood}
            onChange={setCurrentMood}
            counts={moodCounts}
          />
        </View>

        {/* Mood active banner */}
        {currentMood !== "all" && moodInfo && (
          <View style={styles.moodBanner}>
            {hasMoodSongs ? (
              <LinearGradient
                colors={[`${moodInfo.color}22`, `${moodInfo.color}08`]}
                style={[styles.moodBannerInner, { borderColor: `${moodInfo.color}33` }]}
              >
                <Text style={styles.moodBannerIcon}>{moodInfo.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moodBannerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                    {moodInfo.label} — {filteredSongs.length} song{filteredSongs.length !== 1 ? "s" : ""}
                  </Text>
                  <Text style={[styles.moodBannerDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {moodInfo.desc}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => playSong(filteredSongs[0], filteredSongs)}
                  style={[styles.moodPlayBtn, { backgroundColor: moodInfo.color }]}
                >
                  <Feather name="play" size={14} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>
            ) : (
              <View style={[styles.moodBannerInner, styles.moodBannerEmpty, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={styles.moodBannerIcon}>{moodInfo.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.moodBannerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    No {moodInfo.label} songs yet
                  </Text>
                  <Text style={[styles.moodBannerDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Long-press any song in your library to tag it as {moodInfo.label}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── Recently added ── */}
        {recentSongs.length > 0 && currentMood === "all" && (
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
              renderItem={({ item }) => (
                <RecentCard song={item} onPlay={handlePlay} onLongPress={handleLongPress} />
              )}
            />
          </View>
        )}

        {/* ── Mood-filtered songs ── */}
        {currentMood !== "all" && hasMoodSongs && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              {moodInfo?.icon} {moodInfo?.label} Playlist
            </Text>
            {filteredSongs.map((song) => (
              <SongItem
                key={song.id}
                song={song}
                queue={filteredSongs}
                onLongPress={handleLongPress}
              />
            ))}
          </View>
        )}

        {/* ── All songs (desktop quick access) ── */}
        {layout.isDesktop && currentMood === "all" && songs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                All Songs
              </Text>
              <Text style={[styles.countLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {songs.length} songs
              </Text>
            </View>
            {songs.slice(0, 10).map((song) => (
              <SongItem key={song.id} song={song} queue={songs} onLongPress={handleLongPress} />
            ))}
          </View>
        )}

        {/* ── Playlists preview ── */}
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
            <View style={layout.isDesktop ? styles.desktopPlGrid : styles.plGrid}>
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
                  <LinearGradient colors={["rgba(168,85,247,0.2)", "rgba(168,85,247,0.05)"]} style={styles.plIcon}>
                    <Feather name="music" size={18} color={colors.primary} />
                  </LinearGradient>
                  <Text style={[styles.plName, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
                    {pl.name}
                  </Text>
                  <Text style={[styles.plCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {pl.songIds.length} songs
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Empty vault ── */}
        {songs.length === 0 && (
          <View style={styles.empty}>
            <LinearGradient colors={["#7c3aed", "#a855f7"]} style={styles.emptyIcon}>
              <Feather name="music" size={48} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Your vault is empty
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Upload MP3 files to start listening offline.{"\n"}
              {Platform.OS === "web" ? "You can also drag & drop files anywhere." : ""}
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

      {!layout.isDesktop && (
        <View style={[styles.miniPlayerWrapper, { bottom: 84 }]}>
          <MiniPlayer />
        </View>
      )}

      {/* Long-press context menu */}
      <SongContextMenu
        song={contextSong}
        onClose={() => setContextSong(null)}
        onTagMood={() => {
          setMoodSong(contextSong);
          setContextSong(null);
        }}
        onDelete={contextSong ? () => deleteSong(contextSong.id) : undefined}
      />

      {/* Mood tag sheet */}
      <MoodTagSheet
        song={moodSong}
        onClose={() => setMoodSong(null)}
      />
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 20 },
  moodHint: { fontSize: 12 },
  moodWrapper: { marginLeft: -20, marginRight: -20, marginBottom: 16 },

  moodBanner: { marginBottom: 8 },
  moodBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  moodBannerEmpty: {},
  moodBannerIcon: { fontSize: 32 },
  moodBannerTitle: { fontSize: 15 },
  moodBannerDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  moodPlayBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },

  section: { marginTop: 28 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  countLabel: { fontSize: 13 },
  seeAll: { fontSize: 14 },
  recentList: { gap: 14, paddingBottom: 4 },
  recentCard: { position: "relative" },
  moodBadge: {
    position: "absolute",
    top: 8, right: 8,
    width: 26, height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  moodBadgeText: { fontSize: 13 },
  recentTitle: { fontSize: 13, marginTop: 10, lineHeight: 18 },
  recentArtist: { fontSize: 12, marginTop: 3 },

  desktopPlGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  desktopPlCard: { width: "31%", padding: 20, borderRadius: 16, gap: 10 },
  plGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  plCard: { width: "47%", padding: 16, borderRadius: 16, gap: 8 },
  plIcon: { width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  plName: { fontSize: 14 },
  plCount: { fontSize: 12 },

  empty: { alignItems: "center", paddingTop: 60, gap: 18 },
  emptyIcon: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 24, textAlign: "center" },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22, maxWidth: 300 },
  emptyBtn: { marginTop: 4, paddingHorizontal: 36, paddingVertical: 14, borderRadius: 30 },
  emptyBtnText: { fontSize: 16 },
  miniPlayerWrapper: { position: "absolute", left: 8, right: 8 },
});
