import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs, useRouter } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

import { AlbumArt } from "@/components/AlbumArt";
import { useMusic } from "@/context/MusicContext";
import { useColors } from "@/hooks/useColors";
import { useLayout } from "@/hooks/useLayout";

const TAB_ROUTES = [
  { name: "index", label: "Home", icon: "home" as const, sf: "house" },
  { name: "library", label: "Library", icon: "music" as const, sf: "music.note.list" },
  { name: "playlists", label: "Playlists", icon: "list" as const, sf: "list.bullet" },
];

// ─── Desktop sidebar ──────────────────────────────────────────────────────────
function DesktopSidebar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const router = useRouter();
  const { currentSong, isPlaying, pauseResume, playNext, playPrev, position, duration } =
    useMusic();

  const progress = duration > 0 ? position / duration : 0;

  return (
    <View style={[styles.sidebar, { backgroundColor: "#0d0d0d", borderRightColor: colors.border }]}>
      {/* Logo */}
      <View style={styles.sidebarLogo}>
        <LinearGradient
          colors={["#a855f7", "#7c3aed"]}
          style={styles.sidebarLogoIcon}
        >
          <Feather name="music" size={16} color="#fff" />
        </LinearGradient>
        <Text style={[styles.sidebarLogoText, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
          MusicVault
        </Text>
      </View>

      {/* Nav items */}
      <View style={styles.sidebarNav}>
        {TAB_ROUTES.map((tab, idx) => {
          const isFocused = state.index === idx;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => navigation.navigate(tab.name)}
              activeOpacity={0.7}
              style={[
                styles.sidebarNavItem,
                isFocused && { backgroundColor: "rgba(168,85,247,0.12)" },
              ]}
            >
              <Feather
                name={tab.icon}
                size={18}
                color={isFocused ? colors.primary : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.sidebarNavLabel,
                  {
                    color: isFocused ? colors.foreground : colors.mutedForeground,
                    fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Bottom player in sidebar */}
      {currentSong && (
        <TouchableOpacity
          onPress={() => router.push("/player")}
          activeOpacity={0.85}
          style={[styles.sidebarPlayer, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.sidebarPlayerTop}>
            <AlbumArt colors={currentSong.gradientColors} size={40} borderRadius={8} />
            <View style={styles.sidebarPlayerInfo}>
              <Text
                style={[styles.sidebarSongTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}
                numberOfLines={1}
              >
                {currentSong.title}
              </Text>
              <Text
                style={[styles.sidebarSongArtist, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}
                numberOfLines={1}
              >
                {currentSong.artist}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.sidebarProgress, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.sidebarProgressFill,
                { width: `${progress * 100}%` as unknown as number, backgroundColor: colors.primary },
              ]}
            />
          </View>

          {/* Controls */}
          <View style={styles.sidebarControls}>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); playPrev(); }} hitSlop={8}>
              <Feather name="skip-back" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); pauseResume(); }}
              style={[styles.sidebarPlayBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name={isPlaying ? "pause" : "play"} size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={(e) => { e.stopPropagation(); playNext(); }} hitSlop={8}>
              <Feather name="skip-forward" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Mobile tab bar ───────────────────────────────────────────────────────────
function MobileTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";

  return (
    <View style={styles.mobileTabBarOuter}>
      {isIOS ? (
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0d0d0d" }]} />
      )}
      <View style={styles.mobileTabBar}>
        {state.routes.map((route, idx) => {
          const tab = TAB_ROUTES[idx];
          if (!tab) return null;
          const isFocused = state.index === idx;
          return (
            <TouchableOpacity
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
              style={styles.mobileTab}
            >
              {isIOS ? (
                <SymbolView
                  name={isFocused ? `${tab.sf}.fill` : tab.sf}
                  tintColor={isFocused ? colors.primary : colors.mutedForeground}
                  size={24}
                />
              ) : (
                <Feather
                  name={tab.icon}
                  size={22}
                  color={isFocused ? colors.primary : colors.mutedForeground}
                />
              )}
              <Text
                style={[
                  styles.mobileTabLabel,
                  {
                    color: isFocused ? colors.primary : colors.mutedForeground,
                    fontFamily: isFocused ? "Inter_600SemiBold" : "Inter_400Regular",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Custom tab bar ───────────────────────────────────────────────────────────
function CustomTabBar(props: BottomTabBarProps) {
  const { isDesktop } = useLayout();
  if (isDesktop) return <DesktopSidebar {...props} />;
  return <MobileTabBar {...props} />;
}

// ─── Native tab layout (iOS 26+ liquid glass) ─────────────────────────────────
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <Icon sf={{ default: "music.note.list", selected: "music.note.list" }} />
        <Label>Library</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="playlists">
        <Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <Label>Playlists</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

// ─── Classic layout ───────────────────────────────────────────────────────────
function ClassicTabLayout() {
  const { isDesktop } = useLayout();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: isDesktop
          ? { marginLeft: 240, flex: 1 }
          : { flex: 1 },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="playlists" />
    </Tabs>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export default function TabLayout() {
  const { isDesktop } = useLayout();
  if (!isDesktop && Platform.OS !== "web" && isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const SIDEBAR_WIDTH = 240;

const styles = StyleSheet.create({
  // Desktop sidebar
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    paddingTop: 24,
    paddingBottom: 16,
    zIndex: 100,
  },
  sidebarLogo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 10,
  },
  sidebarLogoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarLogoText: { fontSize: 17 },
  sidebarNav: { gap: 2, paddingHorizontal: 12 },
  sidebarNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 12,
  },
  sidebarNavLabel: { fontSize: 14 },

  sidebarPlayer: {
    marginHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sidebarPlayerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sidebarPlayerInfo: { flex: 1 },
  sidebarSongTitle: { fontSize: 13 },
  sidebarSongArtist: { fontSize: 11, marginTop: 2 },
  sidebarProgress: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  sidebarProgressFill: { height: 3 },
  sidebarControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  sidebarPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // Mobile tab bar
  mobileTabBarOuter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 0,
  },
  mobileTabBar: {
    flexDirection: "row",
    height: 84,
    paddingBottom: 20,
    paddingTop: 10,
  },
  mobileTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  mobileTabLabel: { fontSize: 10 },
});
