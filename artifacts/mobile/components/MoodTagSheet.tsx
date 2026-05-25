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

import { Mood, Song, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

const MOODS: { key: Mood | null; label: string; icon: string; desc: string; gradient: [string, string] }[] = [
  { key: null,       label: "None",    icon: "🚫", desc: "Remove mood tag",        gradient: ["#374151", "#1f2937"] },
  { key: "chill",    label: "Chill",   icon: "😌", desc: "Relaxed, laid-back",      gradient: ["#0ea5e9", "#0369a1"] },
  { key: "focus",    label: "Focus",   icon: "🧠", desc: "Deep work & studying",    gradient: ["#8b5cf6", "#6d28d9"] },
  { key: "workout",  label: "Workout", icon: "🔥", desc: "High energy & pumped",    gradient: ["#f97316", "#c2410c"] },
  { key: "sleep",    label: "Sleep",   icon: "🌙", desc: "Calm & sleep-inducing",   gradient: ["#1e3a5f", "#0f172a"] },
];

interface MoodTagSheetProps {
  song: Song | null;
  onClose: () => void;
}

export function MoodTagSheet({ song, onClose }: MoodTagSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setSongMood } = useMusic();
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

  const handleSelect = (mood: Mood | null) => {
    setSongMood(song.id, mood);
    onClose();
  };

  const botPad = Platform.OS === "web" ? 24 : insets.bottom + 12;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: "#111", transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>

        {/* Song header */}
        <View style={styles.songHeader}>
          <View style={[styles.songIconWrap, { backgroundColor: colors.card }]}>
            <Text style={styles.songIconEmoji}>🎵</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.songTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={[styles.songArtist, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {song.artist}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
          CHOOSE A MOOD
        </Text>

        {/* Mood options */}
        <View style={styles.moodGrid}>
          {MOODS.map((m) => {
            const isActive = song.mood === m.key;
            return (
              <TouchableOpacity
                key={String(m.key)}
                onPress={() => handleSelect(m.key)}
                activeOpacity={0.75}
                style={[
                  styles.moodCard,
                  {
                    borderColor: isActive ? "#a855f7" : "rgba(255,255,255,0.07)",
                    borderWidth: isActive ? 2 : 1,
                  },
                ]}
              >
                <LinearGradient
                  colors={m.gradient}
                  style={styles.moodCardGrad}
                >
                  <Text style={styles.moodIcon}>{m.icon}</Text>
                  <View style={styles.moodTextWrap}>
                    <Text style={[styles.moodLabel, { fontFamily: "Inter_700Bold" }]}>
                      {m.label}
                    </Text>
                    <Text style={[styles.moodDesc, { fontFamily: "Inter_400Regular" }]}>
                      {m.desc}
                    </Text>
                  </View>
                  {isActive && (
                    <View style={[styles.checkBadge, { backgroundColor: "#a855f7" }]}>
                      <Feather name="check" size={11} color="#fff" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

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
    paddingHorizontal: 20,
  },
  handleRow: { alignItems: "center", paddingTop: 12, paddingBottom: 4 },
  handle: { width: 36, height: 4, borderRadius: 2 },

  songHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  songIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  songIconEmoji: { fontSize: 22 },
  songTitle: { fontSize: 16 },
  songArtist: { fontSize: 13, marginTop: 2 },

  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 12,
  },

  moodGrid: { gap: 10 },
  moodCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  moodCardGrad: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  moodIcon: { fontSize: 28 },
  moodTextWrap: { flex: 1 },
  moodLabel: { fontSize: 16, color: "#fff" },
  moodDesc: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
