import type { AgentFn } from '../lib/pipelineTypes';
import { readAllSegments } from '../lib/fileManager';
import { producePodcast } from '../lib/audioAssembler';
import { loadTtsApiKey } from '../lib/apiConfig';
import { voiceInstructions } from '../data/voices';
import { musicStyles } from '../data/music';
import { getPodcastFileName } from '../lib/sessionConfig';

export function createAudioProducer(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig } = ctx;
    const voice = sessionConfig.content.voice;
    const musicSuite = sessionConfig.content.musicSuite;

    onReasoningChunk('Audio Producer activated. Loading final approved script segments...\n');

    // Load all segments
    const segments = await readAllSegments();
    const nonEmptySegments = Object.entries(segments).filter(([, content]) => content.trim().length > 0);
    onReasoningChunk(`Loaded ${nonEmptySegments.length} non-empty segments.\n`);

    if (nonEmptySegments.length === 0) {
      throw new Error('No segment files found. The pipeline must generate segments before audio production.');
    }

    onReasoningChunk(`Voice selected: ${voice.label} (${voice.voiceId})\n`);
    if (musicSuite) {
      const musicName = (id: string) => musicStyles.find(s => s.id === id)?.name ?? id;
      onReasoningChunk(`Music suite: Intro=${musicName(musicSuite.intro)}, Outro=${musicName(musicSuite.outro)}, Story=${musicName(musicSuite.storySting)}, Block=${musicName(musicSuite.blockSting)}\n`);
    } else {
      onReasoningChunk('No music suite configured. Producing narration only.\n');
    }

    // Load TTS API key
    const ttsApiKey = await loadTtsApiKey();
    if (!ttsApiKey.trim()) {
      throw new Error('No TTS API key configured. Please add your OpenAI TTS API key in Configure API.');
    }

    const instructions = voiceInstructions[voice.voiceId] ?? '';

    // Generate filename from session config
    const outputFileName = getPodcastFileName(sessionConfig);

    // Produce podcast (file is written incrementally to disk)
    const result = await producePodcast(
      segments,
      voice,
      musicSuite,
      ttsApiKey,
      instructions,
      (msg) => onReasoningChunk(msg + '\n'),
      outputFileName
    );

    onReasoningChunk(`Saved ${result.podcastFileName}\n`);

    const draft = `## AUDIO PRODUCTION COMPLETE

**Final Podcast:** ${result.podcastFileName}
**Duration:** ${formatDuration(result.durationSeconds)}
**Format:** MP3 (44.1kHz stereo, 128kbps)
**Segments processed:** ${result.segmentCount}

### Voice
${voice.label} (${voice.gender}, ${voice.accent})

${musicSuite ? `### Music Suite
- Intro: ${musicSuite.intro}
- Outro: ${musicSuite.outro}
- Story Sting: ${musicSuite.storySting}
- Block Sting: ${musicSuite.blockSting}` : '### Music Suite: None configured'}

### Critical Rule Enforced
Music and narration NEVER overlap. All segments play sequentially with ${0.5}s gaps.
`;

    return {
      draft,
      reasoning: '',
      metadata: {
        podcastFileName: result.podcastFileName,
        durationSeconds: result.durationSeconds,
        segmentCount: result.segmentCount,
        voiceId: voice.voiceId,
        voiceLabel: voice.label,
      },
    };
  };
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}
