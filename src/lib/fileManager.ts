import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const BASE_DIR = 'newsroom';

export type SegmentId =
  | 'intro'
  | 'article1' | 'article2' | 'article3' | 'article4' | 'article5'
  | 'article6' | 'article7' | 'article8'
  | 'editorial'
  | 'outro';

export const ALL_SEGMENT_IDS: SegmentId[] = [
  'intro',
  'article1', 'article2', 'article3', 'article4', 'article5',
  'article6', 'article7', 'article8',
  'editorial',
  'outro',
];

export const SEGMENT_FILE_NAMES: Record<SegmentId, string> = {
  intro: 'intro.txt',
  article1: 'Article1.txt',
  article2: 'Article2.txt',
  article3: 'Article3.txt',
  article4: 'Article4.txt',
  article5: 'Article5.txt',
  article6: 'Article6.txt',
  article7: 'Article7.txt',
  article8: 'Article8.txt',
  editorial: 'Editorial.txt',
  outro: 'outro.txt',
};

// Selected articles persistence
export interface ArticleSource {
  url: string;
  title: string;
  source: string;
  description: string;
  text: string;
  wordCount: number;
  tier: 1 | 2 | 3;
}

export interface SelectedArticle {
  main: ArticleSource;
  backups: ArticleSource[];
  scope: 'local' | 'continent';
  topic: string;
}

export type SelectedArticlesMap = Record<string, SelectedArticle>;

/**
 * Get the directory to use for file storage.
 * Always uses Directory.Data (app-private) because external Documents storage
 * is broken on Android 10+ due to scoped storage (EACCES).
 */
async function getTargetDirectory(): Promise<Directory> {
  return Directory.Data;
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

// Selected articles helpers

const SELECTED_ARTICLES_FILE = 'selected_articles.json';

export async function writeSelectedArticles(articles: SelectedArticlesMap): Promise<void> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${SELECTED_ARTICLES_FILE}`;
  try {
    await Filesystem.writeFile({
      path,
      data: JSON.stringify(articles, null, 2),
      directory: dir,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  } catch (err) {
    console.error(`[fileManager] Failed to write ${path}:`, err);
    throw err;
  }
}

export async function readSelectedArticles(): Promise<SelectedArticlesMap> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${SELECTED_ARTICLES_FILE}`;
  try {
    const result = await Filesystem.readFile({
      path,
      directory: dir,
      encoding: Encoding.UTF8,
    });
    return JSON.parse(result.data as string) as SelectedArticlesMap;
  } catch (err) {
    console.error(`[fileManager] Failed to read ${path}:`, err);
    return {};
  }
}

/**
 * Write an audio file as base64.
 */
export async function writeAudioFile(filename: string, base64Data: string): Promise<void> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${filename}`;
  try {
    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: dir,
      recursive: true,
    });
  } catch (err) {
    console.error(`[fileManager] Failed to write audio ${path}:`, err);
    throw err;
  }
}

/**
 * Read an audio file as base64.
 */
export async function readAudioFile(filename: string): Promise<string> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${filename}`;
  try {
    const result = await Filesystem.readFile({
      path,
      directory: dir,
    });
    return result.data as string;
  } catch (err) {
    console.error(`[fileManager] Failed to read audio ${path}:`, err);
    return '';
  }
}

/**
 * Check if an audio file exists.
 */
export async function audioFileExists(filename: string): Promise<boolean> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${filename}`;
  try {
    await Filesystem.stat({ path, directory: dir });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create an empty audio file on disk.
 */
export async function createAudioFile(filename: string): Promise<void> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${filename}`;
  try {
    await Filesystem.writeFile({
      path,
      data: '',
      directory: dir,
      recursive: true,
    });
  } catch (err) {
    console.error(`[fileManager] Failed to create audio file ${path}:`, err);
    throw err;
  }
}

/**
 * Append a binary chunk to an audio file.
 * The Uint8Array is converted to base64 for Capacitor Filesystem.
 */
export async function appendAudioChunk(filename: string, chunk: Uint8Array | Int8Array): Promise<void> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${filename}`;
  // Convert small chunk to base64 (chunk is typically a few KB)
  // Int8Array from lamejs may contain negative bytes; btoa requires Latin1 (0-255).
  // View the same buffer as Uint8Array to get unsigned byte values.
  const bytes = chunk instanceof Int8Array
    ? new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
    : chunk;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  try {
    await Filesystem.appendFile({
      path,
      data: base64,
      directory: dir,
    });
  } catch (err) {
    console.error(`[fileManager] Failed to append audio chunk to ${path}:`, err);
    throw err;
  }
}

/**
 * Export a finished podcast from app-private storage to Documents/Newsroom.
 * Returns true if the copy succeeded, false otherwise.
 */
export async function exportPodcastToDocuments(filename: string): Promise<boolean> {
  const srcPath = `${BASE_DIR}/${filename}`;
  const dstPath = `${BASE_DIR}/${filename}`;
  try {
    // Read from app-private storage
    const result = await Filesystem.readFile({
      path: srcPath,
      directory: Directory.Data,
    });
    // Write to Documents
    await Filesystem.writeFile({
      path: dstPath,
      data: result.data as string,
      directory: Directory.Documents,
      recursive: true,
    });
    return true;
  } catch (err) {
    console.error(`[fileManager] Failed to export podcast to Documents:`, err);
    return false;
  }
}

/**
 * Read an audio file as a Uint8Array.
 */
export async function readAudioFileBinary(filename: string): Promise<Uint8Array | null> {
  const dir = await getTargetDirectory();
  const path = `${BASE_DIR}/${filename}`;
  try {
    const result = await Filesystem.readFile({
      path,
      directory: dir,
    });
    const base64 = result.data as string;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (err) {
    console.error(`[fileManager] Failed to read audio binary ${path}:`, err);
    return null;
  }
}
