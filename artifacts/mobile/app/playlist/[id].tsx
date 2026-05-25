import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayer } from "@/components/MiniPlayer";
import { SongItem } from "@/components/SongItem";
import { Song, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

export default function PlaylistDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    playlists,
    songs,
    addToPlaylist,
    removeFromPlaylist,
    deletePlaylist,
    currentSong,
    playSong,
  } = useMusic();

  const [showAddModal, setShowAddModal] = useState(false);

  const playlist = playlists.find((p) => p.id === id);
  const playlistSongs = useMemo(() => {
    if (!playlist) return [];
    return playlist.songIds
      .map((sid) => songs.find((s) => s.id === sid))
      .filter(Boolean) as Song[];
  }, [playlist, songs]);

  const availableToAdd = useMemo(() => {
    if (!playlist) return [];
    return songs.filter((s) => !playlist.songIds.includes(s.id));
  }, [songs, playlist]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!playlist) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Playlist not found</Text>
      </View>
    );
  }

  const handlePlayAll = () => {
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], playlistSongs);
    }
  };

  const handleRemove = (song: Song) => {
    Alert.alert("Remove Song", `Remove "${song.title}" from this playlist?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeFromPlaylist(playlist.id, song.id),
      },
    ]);
  };

  const handleDeletePlaylist = () => {
    Alert.alert("Delete Playlist", `Delete "${playlist.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deletePlaylist(playlist.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "Inter_700Bold" },
          ]}
          numberOfLines={1}
        >
          {playlist.name}
        </Text>
        <TouchableOpacity onPress={handleDeletePlaylist} hitSlop={10}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      {/* Subheader */}
      <View style={styles.subHeader}>
        <Text
          style={[
            styles.songCountText,
            { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
          ]}
        >
          {playlistSongs.length} song{playlistSongs.length !== 1 ? "s" : ""}
        </Text>
        <View style={styles.subActions}>
          {playlistSongs.length > 0 && (
            <TouchableOpacity
              onPress={handlePlayAll}
              style={[styles.playAllBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="play" size={14} color="#fff" />
              <Text
                style={[
                  styles.playAllText,
                  { color: "#fff", fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Play All
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={[styles.addSongsBtn, { borderColor: colors.border }]}
          >
            <Feather name="plus" size={14} color={colors.foreground} />
            <Text
              style={[
                styles.addSongsText,
                { color: colors.foreground, fontFamily: "Inter_500Medium" },
              ]}
            >
              Add
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={playlistSongs}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <SongItem
            song={item}
            queue={playlistSongs}
            onLongPress={handleRemove}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: currentSong ? 140 : 80 },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="music" size={40} color={colors.mutedForeground} />
            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_400Regular",
                },
              ]}
            >
              No songs in this playlist
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
            >
              <Text
                style={[
                  styles.addBtnText,
                  { color: "#fff", fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Add Songs
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View
        style={[
          styles.miniPlayerWrapper,
          { bottom: Platform.OS === "web" ? 34 : 0 },
        ]}
      >
        <MiniPlayer />
      </View>

      {/* Add songs modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalSheet, { backgroundColor: colors.card }]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
              >
                Add Songs
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={availableToAdd}
              keyExtractor={(s) => s.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    addToPlaylist(playlist.id, item.id);
                  }}
                  style={[
                    styles.addSongRow,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.addSongTitle,
                      {
                        color: colors.foreground,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={[
                      styles.addSongArtist,
                      {
                        color: colors.mutedForeground,
                        fontFamily: "Inter_400Regular",
                      },
                    ]}
                  >
                    {item.artist}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={[
                    styles.noSongs,
                    { color: colors.mutedForeground, fontFamily: "Inter_400Regular" },
                  ]}
                >
                  All songs are already in this playlist
                </Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 20, flex: 1, textAlign: "center", marginHorizontal: 16 },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  songCountText: { fontSize: 14 },
  subActions: { flexDirection: "row", gap: 10 },
  playAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  playAllText: { fontSize: 13 },
  addSongsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  addSongsText: { fontSize: 13 },
  list: { paddingHorizontal: 4, paddingTop: 4 },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 16,
  },
  emptyText: { fontSize: 16 },
  addBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addBtnText: { fontSize: 14 },
  miniPlayerWrapper: { position: "absolute", left: 0, right: 0 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  modalTitle: { fontSize: 18 },
  addSongRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  addSongTitle: { fontSize: 15 },
  addSongArtist: { fontSize: 13 },
  noSongs: { padding: 20, textAlign: "center" },
});
