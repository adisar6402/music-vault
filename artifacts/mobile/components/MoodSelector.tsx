import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import { Mood } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

const MOODS: { key: Mood; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "✦" },
  { key: "chill", label: "Chill", icon: "😌" },
  { key: "focus", label: "Focus", icon: "🧠" },
  { key: "workout", label: "Workout", icon: "🔥" },
  { key: "sleep", label: "Sleep", icon: "🌙" },
];

interface MoodSelectorProps {
  selected: Mood;
  onChange: (mood: Mood) => void;
}

export function MoodSelector({ selected, onChange }: MoodSelectorProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {MOODS.map((mood) => {
        const isActive = selected === mood.key;
        return (
          <TouchableOpacity
            key={mood.key}
            onPress={() => onChange(mood.key)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? colors.primary : colors.card,
                borderColor: isActive ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={styles.icon}>{mood.icon}</Text>
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? "#fff" : colors.mutedForeground,
                  fontFamily: isActive ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}
            >
              {mood.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  icon: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
  },
});
