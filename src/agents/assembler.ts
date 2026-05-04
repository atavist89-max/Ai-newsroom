import type { AgentFn } from '../lib/pipelineTypes';
import { readAllSegments, writeFullScript, readSelectedArticles } from '../lib/fileManager';
import { assembleFullScript, type Segment } from '../lib/scriptParser';

/**
 * Assembler: Pure code stage — no LLM call.
 * Reads all segment files, concatenates into full_script.txt.
 * Routes to Audio Producer (agent6) after assembly.
 */
export function createAssembler(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig } = ctx;

    onReasoningChunk('Assembler: Reading all segment files...\n');
    const allSegments = await readAllSegments();
    const selectedMap = await readSelectedArticles();

    // Build segment array
    const segments: Segment[] = [
      { id: 'intro', content: allSegments.intro },
      { id: 'article1', topic: sessionConfig.content.topics[0], content: allSegments.article1 },
      { id: 'article2', topic: sessionConfig.content.topics[1], content: allSegments.article2 },
      { id: 'article3', topic: sessionConfig.content.topics[2], content: allSegments.article3 },
      { id: 'article4', topic: selectedMap['article4']?.topic || 'Local Wildcard', content: allSegments.article4 },
      { id: 'article5', topic: selectedMap['article5']?.topic || 'Local Wildcard', content: allSegments.article5 },
      { id: 'article6', topic: sessionConfig.content.topics[0], content: allSegments.article6 },
      { id: 'article7', topic: sessionConfig.content.topics[1], content: allSegments.article7 },
      { id: 'article8', topic: sessionConfig.content.topics[2], content: allSegments.article8 },
    ];

    if (sessionConfig.editorial.includeSegment) {
      segments.push({ id: 'editorial', topic: 'Editorial', content: allSegments.editorial });
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
