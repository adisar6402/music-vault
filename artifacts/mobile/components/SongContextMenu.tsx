import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
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

const MOOD_EMOJI: Record<string, string> = {
  chill: "😌",
  focus: "🧠",
  workout: "🔥",
  sleep: "🌙",
};

interface SongContextMenuProps {
  song: Song | null;
  onClose: () => void;
  onTagMood: () => void;
  onDelete?: () => void;
  onAddToPlaylist?: () => void;
}

export function SongContextMenu({
  song,
  onClose,
  onTagMood,
  onDelete,
  onAddToPlaylist,
}: SongContextMenuProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { toggleFavorite, playSong } = useMusic();
  const slideAnim = useRef(new Animated.Value(600)).current;

  const visible = song !== null;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 600,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [visible, slideAnim]);

  if (!song) return null;

  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 12;

  const actions = [
    {
      icon: "play",
      label: "Play Now",
      color: "#a855f7",
      onPress: () => { playSong(song); onClose(); },
    },
    {
      icon: "heart",
      label: song.favorite ? "Remove from Favorites" : "Add to Favorites",
      color: song.favorite ? "#ef4444" : colors.foreground,
      onPress: () => { toggleFavorite(song.id); onClose(); },
    },
    {
      icon: "tag",
      label: song.mood
        ? `Mood: ${song.mood.charAt(0).toUpperCase() + song.mood.slice(1)} ${MOOD_EMOJI[song.mood] ?? ""}`
        : "Tag a Mood",
      color: song.mood ? "#a855f7" : colors.foreground,
      onPress: () => { onTagMood(); },
    },
    ...(onAddToPlaylist ? [{
      icon: "plus-circle",
      label: "Add to Playlist",
      color: colors.foreground,
      onPress: () => { onAddToPlaylist(); onClose(); },
    }] : []),
    ...(onDelete ? [{
      icon: "trash-2",
      label: "Delete Song",
      color: "#ef4444",
      onPress: () => { onDelete(); onClose(); },
    }] : []),
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: "#111", transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Song preview */}
        <View style={styles.songRow}>
          <AlbumArt colors={song.gradientColors} size={52} borderRadius={12} />
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.songTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}
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
        </View>

        {/* Actions */}
        <View style={[styles.actionsWrap, { borderColor: "rgba(255,255,255,0.06)" }]}>
          {actions.map((action, idx) => (
            <TouchableOpacity
              key={action.label}
              onPress={action.onPress}
              activeOpacity={0.7}
              style={[
                styles.actionRow,
                idx < actions.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: "rgba(255,255,255,0.06)",
                },
              ]}
            >
              <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>
                <Feather name={action.icon as "play"} size={17} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: action.color, fontFamily: "Inter_500Medium" }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={onClose}
          style={[styles.cancelBtn, { backgroundColor: "rgba(255,255,255,0.06)" }]}
        >
          <Text style={[styles.cancelText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <View style={{ height: botPad }} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
  },
  handleRow: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  songRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
    marginBottom: 10,
  },
  songTitle: { fontSize: 16 },
  songArtist: { fontSize: 13, marginTop: 3 },
  actionsWrap: { borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", marginBottom: 12 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 15 },
  cancelBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 4,
  },
  cancelText: { fontSize: 15 },
});
