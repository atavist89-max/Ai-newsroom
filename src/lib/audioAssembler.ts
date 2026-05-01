import type { SegmentId } from './fileManager';
import type { Voice } from '../types';
import { validateMechanical } from './mechanicalValidator';
import { MUSIC_ID_TO_FILE_PREFIX } from '../data/music';

const SAMPLE_RATE = 44100;
const GAP_SECONDS = 0.5;
const PODCAST_FILENAME = 'podcast.wav';
const TTS_CHAR_LIMIT = 4000;
const TTS_CHUNK_TARGET = 3000;

function getMusicFilePath(category: 'intro' | 'outro' | 'storySting' | 'blockSting', styleId: string): string {
  const prefix = MUSIC_ID_TO_FILE_PREFIX[styleId] ?? styleId;
  const categoryPrefix = category === 'storySting' ? 'story' : category === 'blockSting' ? 'block' : category;
  return `./audio/${categoryPrefix}_${prefix}.mp3`;
}

/**
 * Strip XML segment tags and music cue placeholders from script text.
 */
export function stripXmlAndCues(text: string): string {
  if (!text) return '';
  return text
    // Remove XML segment tags
    .replace(/<segment\s+id="[^"]*"[^>]*>/gi, '')
    .replace(/<\/segment>/gi, '')
    // Remove music cue placeholders like [INTRO: Orchestral A], [STORY STING: ...], etc.
    .replace(/\[(?:INTRO|STORY STING|BLOCK TRANSITION|OUTRO):\s*[^\]]+\]/gi, '')
    // Remove any other bracketed cues
    .replace(/\[[^\]]+\]/g, '')
    // Clean up whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Fetch an MP3 file from a URL and decode it into an AudioBuffer.
 */
async function fetchAudioBuffer(url: string, sampleRate: number): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${url} (HTTP ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const ctx = new AudioContext({ sampleRate });
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }
}

/**
 * Call OpenAI TTS API and decode the resulting MP3 into an AudioBuffer.
 */
async function ttsToBuffer(
  text: string,
  voiceId: string,
  apiKey: string,
  instructions: string,
  sampleRate: number
): Promise<AudioBuffer> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: voiceId,
      input: text,
      instructions,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(`TTS API error: ${msg}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const ctx = new AudioContext({ sampleRate });
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }
}

/**
 * Concatenate multiple AudioBuffers sequentially with gaps into a single AudioBuffer.
 */
function concatenateBuffers(buffers: AudioBuffer[], gapSeconds: number, sampleRate: number): AudioBuffer {
  const gapSamples = Math.round(gapSeconds * sampleRate);
  const totalLength = buffers.reduce((sum, b) => sum + b.length + gapSamples, 0) - gapSamples;
  const maxChannels = Math.max(1, ...buffers.map(b => b.numberOfChannels));

  const result = new AudioContext().createBuffer(maxChannels, totalLength, sampleRate);

  let offset = 0;
  for (const buffer of buffers) {
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const sourceData = buffer.getChannelData(ch);
      const targetData = result.getChannelData(ch);
      for (let i = 0; i < sourceData.length; i++) {
        targetData[offset + i] = sourceData[i];
      }
    }
    // Mix mono into additional channels if result has more channels
    if (buffer.numberOfChannels === 1 && maxChannels > 1) {
      const sourceData = buffer.getChannelData(0);
      for (let ch = 1; ch < maxChannels; ch++) {
        const targetData = result.getChannelData(ch);
        for (let i = 0; i < sourceData.length; i++) {
          targetData[offset + i] = sourceData[i];
        }
      }
    }
    offset += buffer.length + gapSamples;
  }

  return result;
}

/**
 * Export an AudioBuffer as a WAV file ArrayBuffer.
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataLength = buffer.length * numChannels * bitsPerSample / 8;
  const headerLength = 44;
  const arrayBuffer = new ArrayBuffer(headerLength + dataLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Write interleaved sample data
  const offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let index = 0;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + index * 2, intSample, true);
      index++;
    }
  }

  return arrayBuffer;
}

export function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if text exceeds the TTS character limit.
 * Uses the same mechanical validator as the Segment Editor.
 */
function exceedsTtsLimit(text: string): boolean {
  const mech = validateMechanical(text);
  return mech.length.actual > TTS_CHAR_LIMIT;
}

/**
 * Split text into chunks under the target length, splitting at the closest period.
 * Prefers to end chunks at sentence boundaries (period + space).
 */
function splitTextAtPeriod(text: string, targetLength: number): string[] {
  if (text.length <= targetLength) return [text];

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > targetLength) {
    // Look for the last period+space before targetLength
    let splitIndex = -1;
    for (let i = targetLength; i >= 0; i--) {
      if (remaining[i] === '.' && (i + 1 >= remaining.length || remaining[i + 1] === ' ' || remaining[i + 1] === '\n')) {
        splitIndex = i + 1;
        break;
      }
    }

    // If no period found, fall back to the last space before targetLength
    if (splitIndex <= 0) {
      for (let i = targetLength; i >= 0; i--) {
        if (remaining[i] === ' ' || remaining[i] === '\n') {
          splitIndex = i;
          break;
        }
      }
    }

    // Absolute fallback: hard split at targetLength
    if (splitIndex <= 0) {
      splitIndex = targetLength;
    }

    const chunk = remaining.slice(0, splitIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

export interface ProducePodcastResult {
  podcastBase64: string;
  segmentCount: number;
  durationSeconds: number;
  podcastFileName: string;
}

/**
 * Produce a complete podcast by combining music stings and TTS narration.
 *
 * Structure:
 *   Intro Music → gap → Intro Narration
 *   Block Sting → gap → Topic1 Narration
 *   Story Sting → gap → Topic2 Narration
 *   Story Sting → gap → Topic3 Narration
 *   Block Sting → gap → Topic4 Narration
 *   Story Sting → gap → Topic5 Narration
 *   Story Sting → gap → Topic6 Narration
 *   Block Sting → gap → Topic7 Narration (if present)
 *   Outro Music → gap → Outro Narration
 */
export async function producePodcast(
  segments: Record<SegmentId, string>,
  voice: Voice,
  musicSuite: { intro: string; outro: string; storySting: string; blockSting: string } | undefined,
  ttsApiKey: string,
  voiceInstructions: string,
  onProgress: (msg: string) => void
): Promise<ProducePodcastResult> {
  const buffers: AudioBuffer[] = [];
  let segmentCount = 0;

  const hasTopic7 = segments.topic7 && segments.topic7.trim().length > 0;

  // Helper to add a music+narration pair
  const addPair = async (
    musicCategory: 'intro' | 'outro' | 'storySting' | 'blockSting',
    musicStyleId: string | undefined,
    narrationText: string,
    label: string
  ) => {
    if (musicStyleId) {
      const musicPath = getMusicFilePath(musicCategory, musicStyleId);
      onProgress(`Loading music: ${musicPath}`);
      try {
        const musicBuf = await fetchAudioBuffer(musicPath, SAMPLE_RATE);
        buffers.push(musicBuf);
        onProgress(`  Music loaded (${(musicBuf.duration).toFixed(1)}s)`);
      } catch (err) {
        onProgress(`  Music load failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (narrationText.trim().length > 0) {
      // Check if segment exceeds TTS limit using the same validator as Segment Editor
      if (exceedsTtsLimit(narrationText)) {
        const chunks = splitTextAtPeriod(narrationText, TTS_CHUNK_TARGET);
        onProgress(`Generating TTS for ${label} (${narrationText.length} chars) — split into ${chunks.length} chunks...`);
        const chunkBuffers: AudioBuffer[] = [];
        for (let i = 0; i < chunks.length; i++) {
          onProgress(`  Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
          const chunkBuf = await ttsToBuffer(
            chunks[i],
            voice.voiceId,
            ttsApiKey,
            voiceInstructions,
            SAMPLE_RATE
          );
          chunkBuffers.push(chunkBuf);
        }
        // Concatenate chunks with no gap (same narration segment)
        if (chunkBuffers.length > 0) {
          const combinedNarration = concatenateBuffers(chunkBuffers, 0, SAMPLE_RATE);
          buffers.push(combinedNarration);
          segmentCount++;
          onProgress(`  TTS done (${(combinedNarration.duration).toFixed(1)}s)`);
        }
      } else {
        onProgress(`Generating TTS for ${label} (${narrationText.length} chars)...`);
        const narrationBuf = await ttsToBuffer(
          narrationText,
          voice.voiceId,
          ttsApiKey,
          voiceInstructions,
          SAMPLE_RATE
        );
        buffers.push(narrationBuf);
        segmentCount++;
        onProgress(`  TTS done (${(narrationBuf.duration).toFixed(1)}s)`);
      }
    }
  };

  // 1. Intro
  await addPair('intro', musicSuite?.intro, stripXmlAndCues(segments.intro), 'Intro');

  // 2. Topic1 (local 1) — block sting after intro
  await addPair('blockSting', musicSuite?.blockSting, stripXmlAndCues(segments.topic1), 'Topic 1');

  // 3. Topic2 (local 2) — story sting
  await addPair('storySting', musicSuite?.storySting, stripXmlAndCues(segments.topic2), 'Topic 2');

  // 4. Topic3 (local 3) — story sting
  await addPair('storySting', musicSuite?.storySting, stripXmlAndCues(segments.topic3), 'Topic 3');

  // 5. Topic4 (continent 1) — block sting for continent transition
  await addPair('blockSting', musicSuite?.blockSting, stripXmlAndCues(segments.topic4), 'Topic 4');

  // 6. Topic5 (continent 2) — story sting
  await addPair('storySting', musicSuite?.storySting, stripXmlAndCues(segments.topic5), 'Topic 5');

  // 7. Topic6 (continent 3) — story sting
  await addPair('storySting', musicSuite?.storySting, stripXmlAndCues(segments.topic6), 'Topic 6');

  // 8. Topic7 (editorial) — block sting, if present
  if (hasTopic7) {
    await addPair('blockSting', musicSuite?.blockSting, stripXmlAndCues(segments.topic7), 'Topic 7 (Editorial)');
  }

  // 9. Outro
  await addPair('outro', musicSuite?.outro, stripXmlAndCues(segments.outro), 'Outro');

  if (buffers.length === 0) {
    throw new Error('No audio buffers were produced. All segments may be empty.');
  }

  onProgress(`Concatenating ${buffers.length} audio clips...`);
  const combined = concatenateBuffers(buffers, GAP_SECONDS, SAMPLE_RATE);
  const durationSeconds = combined.duration;

  onProgress(`Exporting ${durationSeconds.toFixed(1)}s podcast to WAV...`);
  const wavArrayBuffer = audioBufferToWav(combined);
  const podcastBase64 = arrayBufferToBase64(wavArrayBuffer);

  onProgress(`Podcast complete: ${PODCAST_FILENAME} (${(podcastBase64.length * 0.75 / 1024 / 1024).toFixed(1)} MB)`);

  return {
    podcastBase64,
    segmentCount,
    durationSeconds,
    podcastFileName: PODCAST_FILENAME,
  };
}
