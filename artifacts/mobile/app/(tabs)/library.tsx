import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayer } from "@/components/MiniPlayer";
import { SongItem } from "@/components/SongItem";
import { Song, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";
import { useLayout } from "@/hooks/useLayout";

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const { songs, addSongs, deleteSong, currentSong, isLoading } = useMusic();
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = songs;
    if (favOnly) list = list.filter((s) => s.favorite);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
      );
    }
    return list;
  }, [songs, search, favOnly]);

  const topPadding = Platform.OS === "web" ? 24 : insets.top;
  const contentPadding = layout.isDesktop ? 40 : 20;

  const handleDelete = (song: Song) => {
    Alert.alert("Delete Song", `Remove "${song.title}" from your vault?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteSong(song.id) },
    ]);
  };

  const handleAdd = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addSongs();
  };

  // Desktop: 2-column grid
  const numColumns = layout.isDesktop ? 1 : 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Fixed header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 20,
            paddingHorizontal: contentPadding,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Library
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {songs.length} song{songs.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={isLoading}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="upload" size={16} color="#fff" />
                {layout.isDesktop && (
                  <Text style={[styles.addBtnLabel, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                    Upload
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search songs, artists..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters row */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            onPress={() => setFavOnly((v) => !v)}
            style={[
              styles.filterPill,
              {
                backgroundColor: favOnly ? colors.primary : colors.card,
                borderColor: favOnly ? colors.primary : colors.border,
              },
            ]}
          >
            <Feather name="heart" size={13} color={favOnly ? "#fff" : colors.mutedForeground} />
            <Text
              style={[
                styles.filterText,
                {
                  color: favOnly ? "#fff" : colors.mutedForeground,
                  fontFamily: favOnly ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              Favorites
            </Text>
          </TouchableOpacity>
          {filtered.length !== songs.length && (
            <Text style={[styles.filterCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        numColumns={numColumns}
        renderItem={({ item }) => (
          <SongItem song={item} queue={filtered} onLongPress={handleDelete} />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: contentPadding - 16,
            paddingBottom: layout.isDesktop ? 40 : currentSong ? 160 : 100,
          },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather
              name={favOnly ? "heart" : search ? "search" : "music"}
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {favOnly ? "No favorites yet" : search ? "No songs found" : "Your library is empty"}
            </Text>
            {!favOnly && !search && (
              <TouchableOpacity
                onPress={handleAdd}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.emptyBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                  Add Songs
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

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
  header: { paddingBottom: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 30 },
  subtitle: { fontSize: 13, marginTop: 3 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  addBtnLabel: { fontSize: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, height: 48 },
  filtersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: { fontSize: 13 },
  filterCount: { fontSize: 13, marginLeft: "auto" },
  list: { paddingTop: 8 },
  empty: { alignItems: "center", paddingTop: 80, gap: 16 },
  emptyText: { fontSize: 16 },
  emptyBtn: { marginTop: 4, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  emptyBtnText: { fontSize: 15 },
  miniPlayerWrapper: { position: "absolute", left: 8, right: 8 },
});
