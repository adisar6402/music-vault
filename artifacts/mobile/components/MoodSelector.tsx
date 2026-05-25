import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { Mood } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";

const MOODS: { key: Mood; label: string; icon: string }[] = [
  { key: "all",     label: "All",     icon: "✦" },
  { key: "chill",   label: "Chill",   icon: "😌" },
  { key: "focus",   label: "Focus",   icon: "🧠" },
  { key: "workout", label: "Workout", icon: "🔥" },
  { key: "sleep",   label: "Sleep",   icon: "🌙" },
];

interface MoodSelectorProps {
  selected: Mood;
  onChange: (mood: Mood) => void;
  counts?: Record<string, number>;
}

export function MoodSelector({ selected, onChange, counts }: MoodSelectorProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {MOODS.map((mood) => {
        const isActive = selected === mood.key;
        const count = mood.key !== "all" ? (counts?.[mood.key] ?? 0) : undefined;
        const hasTagged = count !== undefined && count > 0;

        return (
          <TouchableOpacity
            key={mood.key}
            onPress={() => onChange(mood.key)}
            activeOpacity={0.7}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? colors.primary : colors.card,
                borderColor: isActive
                  ? colors.primary
                  : hasTagged
                  ? "rgba(168,85,247,0.35)"
                  : colors.border,
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
            {/* Show count badge if songs are tagged */}
            {hasTagged && (
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "rgba(168,85,247,0.2)" },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: isActive ? "#fff" : colors.primary },
                  ]}
                >
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    gap: 8,
    paddingVertical: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
  },
  icon: { fontSize: 14 },
  label: { fontSize: 13 },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
