import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import {
  storeAudioBlob,
  getAudioBlobUrl,
  deleteAudioBlob,
} from "./webStorage";

export interface PickedFile {
  id: string;
  name: string;
  uri: string;
  size?: number;
}

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
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

export async function storeAudioFile(
  id: string,
  sourceUri: string
): Promise<string> {
  if (Platform.OS === "web") {
    const response = await fetch(sourceUri);
    const arrayBuffer = await response.arrayBuffer();
    await storeAudioBlob(id, arrayBuffer);
    return `wb://${id}`;
  } else {
    const dir = FileSystem.documentDirectory + "songs/";
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = dir + id + ".mp3";
    await FileSystem.copyAsync({ from: sourceUri, to: dest });
    return dest;
  }
}

export async function getPlayableUri(
  id: string,
  storedUri: string
): Promise<string | null> {
  if (Platform.OS === "web") {
    return await getAudioBlobUrl(id);
  }
  return storedUri;
}

export async function deleteAudioFile(
  id: string,
  storedUri: string
): Promise<void> {
  if (Platform.OS === "web") {
    await deleteAudioBlob(id);
  } else {
    try {
      await FileSystem.deleteAsync(storedUri, { idempotent: true });
    } catch {
      // ignore
    }
  }
}

export function parseFilename(filename: string): {
  title: string;
  artist: string;
} {
  const name = filename.replace(/\.[^.]+$/, "");
  const parts = name.split(" - ");
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { title: name.trim(), artist: "Unknown Artist" };
}
