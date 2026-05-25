import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";

import { storeAudioFile, parseFilename } from "@/lib/audioStorage";
import { getGradientColors } from "@/lib/gradients";
import { Song, useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

// Web-only full-screen drag-and-drop overlay
export function DropZone() {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dropCount, setDropCount] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { addSongsDirect } = useMusic();

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    if (dragging) pulse.start();
    else { pulse.stop(); pulseAnim.setValue(1); }
    return () => pulse.stop();
  }, [dragging, pulseAnim]);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };

    let enterCount = 0;
    const onEnter = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) {
        enterCount++;
        setDragging(true);
      }
    };
    const onLeave = (e: DragEvent) => {
      e.preventDefault();
      enterCount = Math.max(0, enterCount - 1);
      if (enterCount === 0) setDragging(false);
    };
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      enterCount = 0;
      setDragging(false);

      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        f.type.startsWith("audio/") ||
        /\.(mp3|m4a|ogg|flac|wav|aac|opus)$/i.test(f.name)
      );
      if (files.length === 0) return;

      setProcessing(true);
      setDropCount(files.length);
      const newSongs: Song[] = [];

      for (const file of files) {
        try {
          const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
          const tempUrl = URL.createObjectURL(file);
          const storedUri = await storeAudioFile(id, tempUrl);
          URL.revokeObjectURL(tempUrl);
          const { title, artist } = parseFilename(file.name);
          newSongs.push({
            id, title, artist, uri: storedUri,
            duration: 0, favorite: false,
            addedAt: Date.now(), mood: null,
            gradientColors: getGradientColors(id),
          });
        } catch (err) {
          console.warn("[DropZone] Failed to store:", file.name, err);
        }
      }

      if (newSongs.length > 0) addSongsDirect(newSongs);
      setProcessing(false);
      setDropCount(0);
    };

    window.addEventListener("dragover", prevent);
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [addSongsDirect]);

  if (Platform.OS !== "web") return null;
  if (!dragging && !processing) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.box, { transform: [{ scale: pulseAnim }] }]}>
        <LinearGradient
          colors={["rgba(168,85,247,0.25)", "rgba(124,58,237,0.18)"]}
          style={styles.grad}
        >
          <Feather
            name={processing ? "loader" : "upload-cloud"}
            size={52}
            color="#a855f7"
          />
          <Text style={[styles.title, { fontFamily: "Inter_700Bold" }]}>
            {processing
              ? `Importing ${dropCount} song${dropCount !== 1 ? "s" : ""}…`
              : "Drop audio files to import"}
          </Text>
          <Text style={[styles.sub, { fontFamily: "Inter_400Regular" }]}>
            MP3, M4A, WAV, FLAC, OGG supported
          </Text>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  box: { width: "80%", maxWidth: 400 },
  grad: {
    borderRadius: 28,
    paddingVertical: 52,
    paddingHorizontal: 40,
    alignItems: "center",
    gap: 16,
    borderWidth: 2,
    borderColor: "rgba(168,85,247,0.45)",
  },
  title: { fontSize: 20, color: "#fff", textAlign: "center" },
  sub: { fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center" },
});
