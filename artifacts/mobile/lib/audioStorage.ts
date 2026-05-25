import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { storeAudioBlob, getAudioBlobUrl, deleteAudioBlob } from "./webStorage";

export interface PickedFile {
  id: string;
  name: string;
  uri: string;
  size?: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export async function pickAudioFiles(): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "audio/*",
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    id: generateId(),
    name: asset.name,
    uri: asset.uri,
    size: asset.size ?? undefined,
  }));
}

export async function storeAudioFile(id: string, sourceUri: string): Promise<string> {
  if (Platform.OS === "web") {
    try {
      const response = await fetch(sourceUri);
      if (!response.ok) throw new Error(`fetch status ${response.status}`);
      const blob = await response.blob();
      await storeAudioBlob(id, blob);
      return `wb://${id}`;
    } catch (err) {
      console.warn("[audioStorage] Could not store file in IndexedDB, using temp URI:", err);
      // Fall back to keeping the original picker URI (works for current session)
      return sourceUri;
    }
  } else {
    const dir = FileSystem.documentDirectory + "songs/";
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = dir + id + ".mp3";
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  }
}

export async function getPlayableUri(id: string, storedUri: string): Promise<string | null> {
  if (Platform.OS === "web") {
    // If we have an IndexedDB copy, use it
    if (storedUri.startsWith("wb://")) {
      try {
        const url = await getAudioBlobUrl(id);
        if (url) return url;
      } catch (err) {
        console.warn("[audioStorage] IndexedDB read failed:", err);
      }
      return null;
    }
    // Otherwise the stored URI is a direct blob/https URL (fallback path)
    return storedUri;
  }
  return storedUri;
}

export async function deleteAudioFile(id: string, storedUri: string): Promise<void> {
  if (Platform.OS === "web") {
    if (storedUri.startsWith("wb://")) {
      await deleteAudioBlob(id).catch(() => {});
    }
  } else {
    try { await FileSystem.deleteAsync(storedUri, { idempotent: true }); } catch {}
  }
}

export function parseFilename(filename: string): { title: string; artist: string } {
  const name = filename.replace(/\.[^.]+$/, "");
  const parts = name.split(/\s+-\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { title: name.trim(), artist: "Unknown Artist" };
}
