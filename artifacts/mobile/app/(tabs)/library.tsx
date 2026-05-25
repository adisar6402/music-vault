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

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { songs, addSongs, deleteSong, currentSong, isLoading } = useMusic();
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = songs;
    if (favOnly) list = list.filter((s) => s.favorite);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q)
      );
    }
    return list;
  }, [songs, search, favOnly]);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleDelete = (song: Song) => {
    Alert.alert("Delete Song", `Remove "${song.title}" from your vault?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteSong(song.id),
      },
    ]);
  };

  const handleAdd = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await addSongs();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 16,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.title,
              { color: colors.foreground, fontFamily: "Inter_700Bold" },
            ]}
          >
            Library
          </Text>
          <TouchableOpacity
            onPress={handleAdd}
            disabled={isLoading}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Feather name="plus" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={[styles.searchBar, { backgroundColor: colors.card }]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search songs, artists..."
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.searchInput,
              { color: colors.foreground, fontFamily: "Inter_400Regular" },
            ]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filters}>
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
            <Feather
              name="heart"
              size={14}
              color={favOnly ? "#fff" : colors.mutedForeground}
            />
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
          <Text
            style={[
              styles.songCount,
              { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
            ]}
          >
            {filtered.length} song{filtered.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SongItem
            song={item}
            queue={filtered}
            onLongPress={handleDelete}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: currentSong ? 140 : 80 },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather
              name={favOnly ? "heart" : "music"}
              size={48}
              color={colors.mutedForeground}
            />
            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              {favOnly
                ? "No favorites yet"
                : search
                ? "No songs found"
                : "No songs in your vault"}
            </Text>
          </View>
        }
      />

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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: { fontSize: 28 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, height: 44 },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterText: { fontSize: 13 },
  songCount: { fontSize: 13, marginLeft: "auto" },
  list: { paddingTop: 8, paddingHorizontal: 4 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 16,
  },
  emptyText: { fontSize: 16 },
  miniPlayerWrapper: { position: "absolute", left: 0, right: 0 },
});
