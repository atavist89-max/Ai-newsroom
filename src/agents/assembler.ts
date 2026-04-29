import type { AgentFn } from '../lib/pipelineTypes';
import { readAllSegments, writeFullScript } from '../lib/fileManager';
import { assembleFullScript, type Segment } from '../lib/scriptParser';

/**
 * Assembler: Pure code stage — no LLM call.
 * Reads all segment files, concatenates into full_script.txt.
 * Routes back to Full Script Editor for cross-theme re-verify.
 */
export function createAssembler(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig } = ctx;

    onReasoningChunk('Assembler: Reading all segment files...\n');
    const allSegments = await readAllSegments();

    // Build segment array
    const segments: Segment[] = [
      { id: 'intro', content: allSegments.intro },
      { id: 'topic1', topic: sessionConfig.content.topics[0], content: allSegments.topic1 },
      { id: 'topic2', topic: sessionConfig.content.topics[1], content: allSegments.topic2 },
      { id: 'topic3', topic: sessionConfig.content.topics[2], content: allSegments.topic3 },
      { id: 'topic4', topic: sessionConfig.content.topics[0], content: allSegments.topic4 },
      { id: 'topic5', topic: sessionConfig.content.topics[1], content: allSegments.topic5 },
      { id: 'topic6', topic: sessionConfig.content.topics[2], content: allSegments.topic6 },
    ];

    if (sessionConfig.editorial.includeSegment) {
      segments.push({ id: 'topic7', topic: 'Editorial', content: allSegments.topic7 });
    }

    segments.push({ id: 'outro', content: allSegments.outro });

    // Check for missing segments
    const missing = segments.filter((s) => !s.content || s.content.trim().length === 0);
    if (missing.length > 0) {
      const missingIds = missing.map((s) => s.id).join(', ');
      onReasoningChunk(`⚠️ WARNING: Missing segments detected: ${missingIds}\n`);
    }

    // Assemble full script
    const fullScript = assembleFullScript(segments);
    await writeFullScript(fullScript);

    onReasoningChunk(`Assembled full script: ${fullScript.length} characters across ${segments.length} segments.\n`);

    return {
      draft: fullScript,
      reasoning: `Assembled ${segments.length} segments into full_script.txt. Total length: ${fullScript.length} characters.`,
      prompt: '', // No LLM prompt for assembler
      metadata: {
        segmentCount: segments.length,
        totalLength: fullScript.length,
        missingSegments: missing.map((s) => s.id),
      },
    };
  };
}
