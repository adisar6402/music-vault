import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

interface AlbumArtProps {
  colors: [string, string];
  size: number;
  borderRadius?: number;
}

export function AlbumArt({ colors, size, borderRadius = 12 }: AlbumArtProps) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { width: size, height: size, borderRadius }]}
    >
      <View style={styles.iconWrapper}>
        <Feather name="music" size={size * 0.35} color="rgba(255,255,255,0.6)" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  iconWrapper: {
    opacity: 0.8,
  },
});
