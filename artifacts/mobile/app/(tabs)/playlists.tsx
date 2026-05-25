import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayer } from "@/components/MiniPlayer";
import { PlaylistCard } from "@/components/PlaylistCard";
import { useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";
import { useLayout } from "@/hooks/useLayout";

export default function PlaylistsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const layout = useLayout();
  const { playlists, songs, createPlaylist, deletePlaylist, renamePlaylist, currentSong } =
    useMusic();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");

  const topPadding = Platform.OS === "web" ? 24 : insets.top;
  const contentPadding = layout.isDesktop ? 40 : 20;

  const handleCreate = () => {
    if (!newName.trim()) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    createPlaylist(newName.trim());
    setNewName("");
    setModalVisible(false);
  };

  const handleLongPress = (id: string, name: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(name, "What would you like to do?", [
      {
        text: "Rename",
        onPress: () => {
          Alert.prompt("Rename Playlist", "Enter a new name", (text) => {
            if (text?.trim()) renamePlaylist(id, text.trim());
          }, "plain-text", name);
        },
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete Playlist", `Delete "${name}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => deletePlaylist(id) },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 20, paddingHorizontal: contentPadding }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              Playlists
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#fff" />
            {layout.isDesktop && (
              <Text style={[styles.addBtnLabel, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                New Playlist
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={playlists}
        keyExtractor={(p) => p.id}
        numColumns={layout.isDesktop ? 2 : 1}
        key={layout.isDesktop ? "desktop" : "mobile"}
        renderItem={({ item }) => (
          <View style={layout.isDesktop ? styles.desktopCardWrapper : undefined}>
            <PlaylistCard
              playlist={item}
              songs={songs}
              onPress={() => router.push(`/playlist/${item.id}`)}
              onLongPress={() => handleLongPress(item.id, item.name)}
            />
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          {
            paddingHorizontal: contentPadding,
            paddingBottom: layout.isDesktop ? 40 : currentSong ? 160 : 100,
          },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Feather name="list" size={42} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              No playlists yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Create a playlist to organize your music
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={[styles.createBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.createBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                Create Playlist
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      {!layout.isDesktop && (
        <View style={[styles.miniPlayerWrapper, { bottom: 84 }]}>
          <MiniPlayer />
        </View>
      )}

      {/* Create modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
              New Playlist
            </Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Give it a name..."
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  color: colors.foreground,
                  borderColor: colors.border,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              autoFocus
              onSubmitEditing={handleCreate}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => { setModalVisible(false); setNewName(""); }}
                style={[styles.modalBtn, { backgroundColor: colors.secondary }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.modalBtnText, { color: "#fff", fontFamily: "Inter_600SemiBold" }]}>
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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
  list: { paddingTop: 4 },
  desktopCardWrapper: { flex: 1, margin: 6 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 16 },
  emptyIcon: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 22 },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  createBtn: { marginTop: 4, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 30 },
  createBtnText: { fontSize: 15 },
  miniPlayerWrapper: { position: "absolute", left: 8, right: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "85%",
    maxWidth: 420,
    borderRadius: 22,
    padding: 28,
    gap: 18,
  },
  modalTitle: { fontSize: 20, textAlign: "center" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  modalBtnText: { fontSize: 15 },
});
