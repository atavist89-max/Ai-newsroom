import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildSegmentWriterPrompt } from '../prompts/segmentWriter';
import { writeSegment, writeFullScript, readAllSegments, type SegmentId } from '../lib/fileManager';
import { parseFullScript, assembleFullScript, type Segment } from '../lib/scriptParser';

const STORY_ID_TO_SEGMENT: Record<number, SegmentId> = {
  1: 'topic1',
  2: 'topic2',
  3: 'topic3',
  4: 'topic4',
  5: 'topic5',
  6: 'topic6',
  7: 'topic7',
};

export function createSegmentWriter(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, feedback } = ctx;

    // Extract failed segments from editor feedback
    const failedSegments =
      feedback && typeof feedback === 'object' && Array.isArray((feedback as Record<string, unknown>).failed_segments)
        ? (feedback as Record<string, unknown>).failed_segments as number[]
        : [];

    const rewriterInstructions =
      feedback && typeof feedback === 'object' && 'rewriter_instructions' in feedback
        ? String((feedback as Record<string, unknown>).rewriter_instructions)
        : 'Fix the identified issues in the failing segments.';

    if (failedSegments.length === 0) {
      throw new Error('Segment Writer received no failed segments — nothing to rewrite');
    }

    // Read all segments for context
    onReasoningChunk(`Reading segment files for context...\n`);
    const allSegments = await readAllSegments();

    // Read adjacent segments for transition context
    const segmentIdsToRewrite = failedSegments.map((n) => STORY_ID_TO_SEGMENT[n]).filter(Boolean) as SegmentId[];

    // Build context: failing segments + adjacent segments for transitions
    const contextSegments: Record<SegmentId, string> = {} as Record<SegmentId, string>;
    for (const id of segmentIdsToRewrite) {
      contextSegments[id] = allSegments[id];
      // Add adjacent segment before for transition context
      const idx = ['intro', 'topic1', 'topic2', 'topic3', 'topic4', 'topic5', 'topic6', 'topic7', 'outro'].indexOf(id);
      if (idx > 0) {
        const prevId = ['intro', 'topic1', 'topic2', 'topic3', 'topic4', 'topic5', 'topic6', 'topic7', 'outro'][idx - 1] as SegmentId;
        if (!contextSegments[prevId]) contextSegments[prevId] = allSegments[prevId];
      }
      // Add adjacent segment after for transition context
      if (idx < 8) {
        const nextId = ['intro', 'topic1', 'topic2', 'topic3', 'topic4', 'topic5', 'topic6', 'topic7', 'outro'][idx + 1] as SegmentId;
        if (!contextSegments[nextId]) contextSegments[nextId] = allSegments[nextId];
      }
    }

    // Build prompt
    onReasoningChunk(`Building segment rewrite prompt for: ${segmentIdsToRewrite.join(', ')}...\n`);
    const prompt = buildSegmentWriterPrompt(sessionConfig, contextSegments, segmentIdsToRewrite, rewriterInstructions, ctx.iteration);

    // Stream to LLM
    onReasoningChunk(`Sending segments to Segment Writer for targeted rewrite...\n\n`);

    let response = '';
    let reasoning = '';
    const apiConfig = await loadApiConfig();

    const { diagnostics } = await streamLLM(apiConfig, prompt, {
      onReasoningChunk: (chunk) => {
        reasoning += chunk;
        onReasoningChunk(chunk);
      },
      onContentChunk: (chunk) => {
        response += chunk;
        onReasoningChunk(chunk);
      },
      onError: (err) => {
        throw err;
      },
      onDone: () => {
        onReasoningChunk('\nSegment rewrite complete.\n');
      },
    });

    // Parse rewritten segments from response
    onReasoningChunk('Parsing rewritten segments...\n');
    const rewrittenSegments = parseFullScript(response);

    // Write only the rewritten segments back to files
    for (const seg of rewrittenSegments) {
      if (segmentIdsToRewrite.includes(seg.id)) {
        await writeSegment(seg.id, seg.content);
        onReasoningChunk(`Updated ${seg.id}.txt (${seg.content.length} chars)\n`);
      }
    }

    // Read all segments (including unchanged ones) and assemble full script
    const updatedSegments = await readAllSegments();
    const segments: Segment[] = [
      { id: 'intro', content: updatedSegments.intro },
      { id: 'topic1', topic: sessionConfig.content.topics[0], content: updatedSegments.topic1 },
      { id: 'topic2', topic: sessionConfig.content.topics[1], content: updatedSegments.topic2 },
      { id: 'topic3', topic: sessionConfig.content.topics[2], content: updatedSegments.topic3 },
      { id: 'topic4', topic: sessionConfig.content.topics[0], content: updatedSegments.topic4 },
      { id: 'topic5', topic: sessionConfig.content.topics[1], content: updatedSegments.topic5 },
      { id: 'topic6', topic: sessionConfig.content.topics[2], content: updatedSegments.topic6 },
    ];
    if (sessionConfig.editorial.includeSegment) {
      segments.push({ id: 'topic7', topic: 'Editorial', content: updatedSegments.topic7 });
    }
    segments.push({ id: 'outro', content: updatedSegments.outro });

    const fullScript = assembleFullScript(segments);
    await writeFullScript(fullScript);

    return {
      draft: fullScript,
      reasoning,
      prompt,
      metadata: {
        rewrittenSegmentIds: segmentIdsToRewrite,
        streamDiagnostics: diagnostics,
      },
    };
  };
}
