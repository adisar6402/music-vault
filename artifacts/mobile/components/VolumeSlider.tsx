import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import {
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface VolumeSliderProps {
  value: number;
  onChange: (v: number) => void;
}

export function VolumeSlider({ value, onChange }: VolumeSliderProps) {
  const colors = useColors();
  const trackWidthRef = useRef(0);
  const startValueRef = useRef(value);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startValueRef.current = e.nativeEvent.locationX / trackWidthRef.current;
        onChange(Math.max(0, Math.min(1, startValueRef.current)));
      },
      onPanResponderMove: (_, g) => {
        const newVal = startValueRef.current + g.dx / trackWidthRef.current;
        onChange(Math.max(0, Math.min(1, newVal)));
      },
    })
  ).current;

  const volIcon = value === 0 ? "volume-x" : value < 0.4 ? "volume" : value < 0.75 ? "volume-1" : "volume-2";

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => onChange(value > 0 ? 0 : 1)} hitSlop={8}>
        <Feather name={volIcon} size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>

      <View
        style={styles.trackWrapper}
        onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.track, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
          <LinearGradient
            colors={["#a855f7", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${value * 100}%` as unknown as number }]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            { left: `${Math.min(95, value * 100)}%` as unknown as number },
          ]}
        />
      </View>

      <TouchableOpacity onPress={() => onChange(Math.min(1, value + 0.1))} hitSlop={8}>
        <Feather name="volume-2" size={18} color="rgba(255,255,255,0.5)" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackWrapper: {
    flex: 1,
    paddingVertical: 14,
    justifyContent: "center",
    position: "relative",
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
  thumb: {
    position: "absolute",
    top: "50%",
    marginTop: -8,
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
