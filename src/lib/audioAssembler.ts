import type { SegmentId } from './fileManager';
import type { Voice } from '../types';
import { validateMechanical } from './mechanicalValidator';
import { MUSIC_ID_TO_FILE_PREFIX } from '../data/music';
import { createMp3Encoder, encodeAudioBuffer, flushEncoder } from './mp3Encoder';
import { createAudioFile, appendAudioChunk } from './fileManager';

const SAMPLE_RATE = 44100;
const GAP_SECONDS = 0.5;
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
    .replace(/<segment\s+id="[^"]*"[^>]*>/gi, '')
    .replace(/<\/segment>/gi, '')
    .replace(/\[(?:INTRO|STORY STING|BLOCK TRANSITION|OUTRO):\s*[^\]]+\]/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Decode an MP3 ArrayBuffer using a shared AudioContext.
 */
async function decodeMp3(audioCtx: AudioContext, arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  return audioCtx.decodeAudioData(arrayBuffer);
}

/**
 * Fetch a music MP3 and decode it.
 */
async function fetchMusicBuffer(
  audioCtx: AudioContext,
  category: 'intro' | 'outro' | 'storySting' | 'blockSting',
  styleId: string
): Promise<AudioBuffer> {
  const url = getMusicFilePath(category, styleId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${url} (HTTP ${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return decodeMp3(audioCtx, arrayBuffer);
}

/**
 * Call OpenAI TTS API and decode the resulting MP3.
 */
async function ttsToBuffer(
  audioCtx: AudioContext,
  text: string,
  voiceId: string,
  apiKey: string,
  instructions: string
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
  return decodeMp3(audioCtx, arrayBuffer);
}

/**
 * Check if text exceeds the TTS character limit.
 */
function exceedsTtsLimit(text: string): boolean {
  const mech = validateMechanical(text);
  return mech.length.actual > TTS_CHAR_LIMIT;
}

/**
 * Split text into chunks under the target length, splitting at the closest period.
 */
function splitTextAtPeriod(text: string, targetLength: number): string[] {
  if (text.length <= targetLength) return [text];

  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > targetLength) {
    let splitIndex = -1;
    for (let i = targetLength; i >= 0; i--) {
      if (remaining[i] === '.' && (i + 1 >= remaining.length || remaining[i + 1] === ' ' || remaining[i + 1] === '\n')) {
        splitIndex = i + 1;
        break;
      }
    }
    if (splitIndex <= 0) {
      for (let i = targetLength; i >= 0; i--) {
        if (remaining[i] === ' ' || remaining[i] === '\n') {
          splitIndex = i;
          break;
        }
      }
    }
    if (splitIndex <= 0) {
      splitIndex = targetLength;
    }
    const chunk = remaining.slice(0, splitIndex).trim();
    if (chunk.length > 0) chunks.push(chunk);
    remaining = remaining.slice(splitIndex).trim();
  }

  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

/**
 * Render a music buffer and narration buffer into a single stereo AudioBuffer
 * with a silence gap between them.
 */
async function renderSegment(
  musicBuf: AudioBuffer | null,
  narrationBuf: AudioBuffer | null,
  gapSeconds: number,
  sampleRate: number
): Promise<AudioBuffer> {
  const musicDuration = musicBuf?.duration ?? 0;
  const narrationDuration = narrationBuf?.duration ?? 0;
  const totalDuration = musicDuration + gapSeconds + narrationDuration;
  const totalSamples = Math.ceil(totalDuration * sampleRate);

  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);

  if (musicBuf) {
    const musicSrc = offlineCtx.createBufferSource();
    musicSrc.buffer = musicBuf;
    musicSrc.connect(offlineCtx.destination);
    musicSrc.start(0);
  }

  if (narrationBuf) {
    const narrSrc = offlineCtx.createBufferSource();
    narrSrc.buffer = narrationBuf;
    narrSrc.connect(offlineCtx.destination);
    narrSrc.start(musicDuration + gapSeconds);
  }

  return offlineCtx.startRendering();
}

export interface ProducePodcastResult {
  podcastFileName: string;
  segmentCount: number;
  durationSeconds: number;
}

export const DEFAULT_PODCAST_FILENAME = 'podcast.mp3';

/**
 * Produce a complete podcast by combining music stings and TTS narration.
 * Uses streamed MP3 encoding: each segment is rendered independently and
 * appended to the output file incrementally. Peak memory is bounded by
 * one segment (~20 MB) regardless of total podcast length.
 */
export async function producePodcast(
  segments: Record<SegmentId, string>,
  voice: Voice,
  musicSuite: { intro: string; outro: string; storySting: string; blockSting: string } | undefined,
  ttsApiKey: string,
  voiceInstructions: string,
  onProgress: (msg: string) => void,
  outputFileName: string = DEFAULT_PODCAST_FILENAME
): Promise<ProducePodcastResult> {
  let segmentCount = 0;
  let totalDurationSeconds = 0;

  const hasEditorial = segments.editorial && segments.editorial.trim().length > 0;

  // One shared AudioContext for all MP3 decoding
  const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE });

  // One MP3 encoder for the entire podcast
  const mp3Encoder = createMp3Encoder(SAMPLE_RATE);

  // Create empty output file on disk
  onProgress('Creating output file...');
  await createAudioFile(outputFileName);

  // Helper to process one segment (music + narration)
  const processSegment = async (
    musicCategory: 'intro' | 'outro' | 'storySting' | 'blockSting',
    musicStyleId: string | undefined,
    narrationText: string,
    label: string
  ) => {
    let musicBuf: AudioBuffer | null = null;
    let narrationBuf: AudioBuffer | null = null;

    // Load music
    if (musicStyleId) {
      try {
        musicBuf = await fetchMusicBuffer(audioCtx, musicCategory, musicStyleId);
        onProgress(`  Music loaded (${musicBuf.duration.toFixed(1)}s)`);
      } catch (err) {
        onProgress(`  Music load failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Generate TTS
    if (narrationText.trim().length > 0) {
      if (exceedsTtsLimit(narrationText)) {
        const chunks = splitTextAtPeriod(narrationText, TTS_CHUNK_TARGET);
        onProgress(`Generating TTS for ${label} (${narrationText.length} chars) — split into ${chunks.length} chunks...`);
        // Decode all chunk MP3s via shared AudioContext
        const chunkBuffers: AudioBuffer[] = [];
        for (let i = 0; i < chunks.length; i++) {
          onProgress(`  Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
          const buf = await ttsToBuffer(audioCtx, chunks[i], voice.voiceId, ttsApiKey, voiceInstructions);
          chunkBuffers.push(buf);
        }
        // Concatenate chunk buffers into one narration buffer
        const chunkTotalSamples = chunkBuffers.reduce((sum, b) => sum + b.length, 0);
        narrationBuf = audioCtx.createBuffer(1, chunkTotalSamples, SAMPLE_RATE);
        let offset = 0;
        for (const buf of chunkBuffers) {
          const src = buf.getChannelData(0);
          const dst = narrationBuf.getChannelData(0);
          for (let i = 0; i < src.length; i++) {
            dst[offset + i] = src[i];
          }
          offset += src.length;
        }
        onProgress(`  TTS done (${(narrationBuf.duration).toFixed(1)}s)`);
      } else {
        onProgress(`Generating TTS for ${label} (${narrationText.length} chars)...`);
        narrationBuf = await ttsToBuffer(audioCtx, narrationText, voice.voiceId, ttsApiKey, voiceInstructions);
        onProgress(`  TTS done (${(narrationBuf.duration).toFixed(1)}s)`);
      }
      segmentCount++;
    }

    // Render segment (music + gap + narration)
    if (musicBuf || narrationBuf) {
      const segmentBuf = await renderSegment(musicBuf, narrationBuf, GAP_SECONDS, SAMPLE_RATE);
      totalDurationSeconds += segmentBuf.duration;

      // Encode to MP3 and append to file
      const mp3Chunk = encodeAudioBuffer(mp3Encoder, segmentBuf);
      await appendAudioChunk(outputFileName, mp3Chunk);

      // Explicitly release references for GC
      segmentBuf;
    }

    musicBuf = null;
    narrationBuf = null;
  };

  // Position-based sting logic
  const SEGMENT_ORDER: SegmentId[] = [
    'intro',
    'article1', 'article2', 'article3', 'article4', 'article5',
    'article6', 'article7', 'article8',
    'editorial',
    'outro',
  ];

  for (let i = 0; i < SEGMENT_ORDER.length; i++) {
    const segId = SEGMENT_ORDER[i];
    if (segId === 'editorial' && !hasEditorial) continue;

    const narrationText = stripXmlAndCues(segments[segId] || '');
    if (!narrationText.trim().length && segId !== 'intro' && segId !== 'outro') continue;

    let musicCategory: 'intro' | 'outro' | 'storySting' | 'blockSting' = 'storySting';
    if (segId === 'intro') musicCategory = 'intro';
    else if (segId === 'outro') musicCategory = 'outro';
    else if (segId === 'article6') musicCategory = 'blockSting';

    const label = segId === 'editorial' ? 'Editorial' : segId.charAt(0).toUpperCase() + segId.slice(1);
    onProgress(`Processing ${label}...`);
    await processSegment(musicCategory, musicSuite?.[musicCategory], narrationText, label);
  }

  // Finalize MP3 encoder
  onProgress('Finalizing MP3...');
  const finalChunk = flushEncoder(mp3Encoder);
  if (finalChunk.length > 0) {
    await appendAudioChunk(outputFileName, finalChunk);
  }

  // Clean up shared AudioContext
  await audioCtx.close();

  onProgress(`Podcast complete: ${outputFileName} (${totalDurationSeconds.toFixed(1)}s)`);

  return {
    podcastFileName: outputFileName,
    segmentCount,
    durationSeconds: totalDurationSeconds,
  };
}
