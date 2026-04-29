import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

const BASE_DIR = 'newsroom';
const PREF_KEY = 'use_external_storage';

export type SegmentId = 'intro' | 'topic1' | 'topic2' | 'topic3' | 'topic4' | 'topic5' | 'topic6' | 'topic7' | 'outro';

export const ALL_SEGMENT_IDS: SegmentId[] = [
  'intro', 'topic1', 'topic2', 'topic3', 'topic4', 'topic5', 'topic6', 'topic7', 'outro',
];

export const SEGMENT_FILE_NAMES: Record<SegmentId, string> = {
  intro: 'intro.txt',
  topic1: 'Topic1.txt',
  topic2: 'Topic2.txt',
  topic3: 'Topic3.txt',
  topic4: 'Topic4.txt',
  topic5: 'Topic5.txt',
  topic6: 'Topic6.txt',
  topic7: 'Topic7.txt',
  outro: 'outro.txt',
};

/**
 * Get the directory to use for file storage.
 * Defaults to Directory.Data (app-private, no permissions needed).
 * If user toggles external storage AND grants permission, uses Directory.Documents.
 */
async function getTargetDirectory(): Promise<Directory> {
  const { value } = await Preferences.get({ key: PREF_KEY });
  return value === 'true' ? Directory.Documents : Directory.Data;
}

/**
 * Check if external storage is enabled.
 */
export async function isExternalStorageEnabled(): Promise<boolean> {
  const { value } = await Preferences.get({ key: PREF_KEY });
  return value === 'true';
}

/**
 * Toggle external storage preference.
 */
export async function setExternalStorageEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: PREF_KEY, value: String(enabled) });
}

/**
 * Write a segment file.
 */
export async function writeSegment(id: SegmentId, content: string): Promise<void> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${SEGMENT_FILE_NAMES[id]}`;
  try {
    await Filesystem.writeFile({
      path,
      data: content,
      directory: dir,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  } catch (err) {
    console.error(`[fileManager] Failed to write ${path}:`, err);
    throw err;
  }
}

/**
 * Read a segment file.
 */
export async function readSegment(id: SegmentId): Promise<string> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${SEGMENT_FILE_NAMES[id]}`;
  try {
    const result = await Filesystem.readFile({
      path,
      directory: dir,
      encoding: Encoding.UTF8,
    });
    return result.data as string;
  } catch (err) {
    console.error(`[fileManager] Failed to read ${path}:`, err);
    return '';
  }
}

/**
 * Write the full assembled script.
 */
export async function writeFullScript(content: string): Promise<void> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/full_script.txt`;
  try {
    await Filesystem.writeFile({
      path,
      data: content,
      directory: dir,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  } catch (err) {
    console.error(`[fileManager] Failed to write ${path}:`, err);
    throw err;
  }
}

/**
 * Read the full assembled script.
 */
export async function readFullScript(): Promise<string> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/full_script.txt`;
  try {
    const result = await Filesystem.readFile({
      path,
      directory: dir,
      encoding: Encoding.UTF8,
    });
    return result.data as string;
  } catch (err) {
    console.error(`[fileManager] Failed to read ${path}:`, err);
    return '';
  }
}

/**
 * Read all segment files into a map.
 */
export async function readAllSegments(): Promise<Record<SegmentId, string>> {
  const result = {} as Record<SegmentId, string>;
  for (const id of ALL_SEGMENT_IDS) {
    result[id] = await readSegment(id);
  }
  return result;
}

/**
 * Write multiple segments at once.
 */
export async function writeAllSegments(segments: Record<SegmentId, string>): Promise<void> {
  for (const id of ALL_SEGMENT_IDS) {
    if (segments[id] !== undefined) {
      await writeSegment(id, segments[id]);
    }
  }
}

/**
 * List all files in the newsroom directory.
 */
export async function listSegmentFiles(): Promise<Array<{ name: string; size: number }>> {
  const dir = await getTargetDirectory();
  try {
    const result = await Filesystem.readdir({
      path: BASE_DIR,
      directory: dir,
    });
    return result.files.map((f) => ({
      name: f.name,
      size: f.size ?? 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete all segment files and full_script.txt.
 */
export async function clearAllSegments(): Promise<void> {
  const dir = await getTargetDirectory();
  try {
    await Filesystem.rmdir({
      path: BASE_DIR,
      directory: dir,
      recursive: true,
    });
  } catch (err) {
    console.error('[fileManager] Failed to clear segments:', err);
    // Non-fatal: directory may not exist
  }
}

/**
 * Check if the newsroom directory exists.
 */
export async function segmentsExist(): Promise<boolean> {
  const dir = await getTargetDirectory();
  try {
    await Filesystem.readdir({ path: BASE_DIR, directory: dir });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get file info for a segment.
 */
export async function getSegmentInfo(id: SegmentId): Promise<{ exists: boolean; size: number }> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${SEGMENT_FILE_NAMES[id]}`;
  try {
    const info = await Filesystem.stat({ path, directory: dir });
    return { exists: true, size: info.size ?? 0 };
  } catch {
    return { exists: false, size: 0 };
  }
}
