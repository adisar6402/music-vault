import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AlbumArt } from "@/components/AlbumArt";
import { Song, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

interface QueueSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function QueueSheet({ visible, onClose }: QueueSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { queue, currentSong, jumpToQueueIndex } = useMusic();
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 600,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [visible, slideAnim]);

  const currentIdx = queue.findIndex((s) => s.id === currentSong?.id);
  const upNext = queue.slice(currentIdx + 1);
  const playedSongs = currentIdx > 0 ? queue.slice(0, currentIdx) : [];

  function formatDuration(ms: number): string {
    if (!ms) return "--:--";
    const secs = Math.floor(ms / 1000);
    return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, "0")}`;
  }

  const renderSong = (song: Song, globalIdx: number, isActive: boolean) => (
    <TouchableOpacity
      key={song.id}
      onPress={() => { jumpToQueueIndex(globalIdx); onClose(); }}
      activeOpacity={0.7}
      style={[
        styles.row,
        isActive && { backgroundColor: "rgba(168,85,247,0.12)" },
      ]}
    >
      {isActive ? (
        <LinearGradient colors={["#a855f7", "#7c3aed"]} style={styles.activeIndicator}>
          <Feather name="volume-2" size={10} color="#fff" />
        </LinearGradient>
      ) : (
        <View style={[styles.indexBox, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
          <Text style={[styles.indexText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            {globalIdx + 1}
          </Text>
        </View>
      )}
      <AlbumArt colors={song.gradientColors} size={44} borderRadius={8} />
      <View style={styles.songInfo}>
        <Text
          style={[
            styles.songTitle,
            {
              color: isActive ? "#a855f7" : colors.foreground,
              fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium",
            },
          ]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text
          style={[styles.songArtist, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
          numberOfLines={1}
        >
          {song.artist}
        </Text>
      </View>
      <Text style={[styles.duration, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        {formatDuration(song.duration)}
      </Text>
    </TouchableOpacity>
  );

  const allItems: Array<{ song: Song; globalIdx: number; section?: string }> = [];
  if (currentSong && currentIdx >= 0) {
    if (playedSongs.length > 0) {
      allItems.push({ song: playedSongs[0], globalIdx: 0, section: "History" });
      playedSongs.slice(1).forEach((s, i) => allItems.push({ song: s, globalIdx: i + 1 }));
    }
    allItems.push({ song: currentSong, globalIdx: currentIdx, section: upNext.length > 0 || playedSongs.length > 0 ? "Now Playing" : "Now Playing" });
    if (upNext.length > 0) {
      allItems.push({ song: upNext[0], globalIdx: currentIdx + 1, section: "Up Next" });
      upNext.slice(1).forEach((s, i) => allItems.push({ song: s, globalIdx: currentIdx + 2 + i }));
    }
  }

  const botPad = Platform.OS === "web" ? 24 : insets.bottom;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: "#111111", transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            Queue
          </Text>
          <View style={styles.headerRight}>
            <Text style={[styles.headerCount, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {queue.length} songs
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={allItems}
          keyExtractor={(item) => `${item.song.id}-${item.globalIdx}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: botPad + 16 }}
          renderItem={({ item }) => (
            <View>
              {item.section && (
                <Text
                  style={[
                    styles.sectionLabel,
                    { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  {item.section}
                </Text>
              )}
              {renderSong(item.song, item.globalIdx, item.song.id === currentSong?.id)}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Queue is empty
              </Text>
            </View>
          }
        />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "80%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { fontSize: 18 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerCount: { fontSize: 13 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  activeIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  indexBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: { fontSize: 11 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 14 },
  songArtist: { fontSize: 12, marginTop: 2 },
  duration: { fontSize: 12 },
  empty: { alignItems: "center", padding: 40 },
  emptyText: { fontSize: 15 },
});
