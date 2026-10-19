// Safe JSON wrapper over AsyncStorage: failures never throw (storage may be blocked or empty). Cross-cutting.
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readStored<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export async function writeStored(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best effort: preferences simply fall back to defaults next launch.
  }
}
