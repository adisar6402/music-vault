import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { DropZone } from "@/components/DropZone";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MusicProvider } from "@/context/MusicContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="player"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="playlist/[id]"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // ✅ SEO + OPEN GRAPH (WEB ONLY FIXED)
  useEffect(() => {
    if (Platform.OS === "web") {
      document.title = "Music Vault 🎧";

      const metaTags = [
        { name: "description", content: "Offline music vault. Play, save, and enjoy music anywhere." },

        // Open Graph (FIXED PATH)
        { property: "og:title", content: "Music Vault 🎧" },
        { property: "og:description", content: "Offline music vault. Play, save, and enjoy music anywhere." },
        { property: "og:image", content: "/assets/images/og-image.png" },
        { property: "og:type", content: "website" },

        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: "Music Vault 🎧" },
        { name: "twitter:description", content: "Offline music experience built for everyone." },
        { name: "twitter:image", content: "/assets/images/og-image.png" },
      ];

      metaTags.forEach((tag) => {
        const meta = document.createElement("meta");
        Object.entries(tag).forEach(([key, value]) => {
          meta.setAttribute(key, value);
        });
        document.head.appendChild(meta);
      });
    }
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <MusicProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
                <DropZone />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </MusicProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}