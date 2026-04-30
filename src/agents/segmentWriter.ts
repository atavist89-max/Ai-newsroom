import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildSegmentWriterPrompt } from '../prompts/segmentWriter';
import { writeSegment, writeFullScript, readAllSegments, type SegmentId } from '../lib/fileManager';
import { parseFullScript, assembleFullScript, type Segment } from '../lib/scriptParser';
import { validateMechanical, buildMechanicalFeedback } from '../lib/mechanicalValidator';

const INDEX_TO_SEGMENT: SegmentId[] = [
  'topic1', 'topic2', 'topic3',
  'topic4', 'topic5', 'topic6', 'topic7',
];

const ALL_SEGMENT_IDS: SegmentId[] = [
  'intro', 'topic1', 'topic2', 'topic3', 'topic4', 'topic5', 'topic6', 'topic7', 'outro',
];

const MAX_MECHANICAL_RETRIES = 3;

export function createSegmentWriter(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, segmentLoopIndex, feedback } = ctx;

    if (segmentLoopIndex < 0 || segmentLoopIndex >= INDEX_TO_SEGMENT.length) {
      throw new Error(`Segment Writer received invalid segmentLoopIndex: ${segmentLoopIndex}`);
    }

    const targetSegmentId = INDEX_TO_SEGMENT[segmentLoopIndex];

    const rewriterInstructions =
      feedback && typeof feedback === 'object' && 'rewriter_instructions' in feedback
        ? String((feedback as Record<string, unknown>).rewriter_instructions)
        : 'Fix the identified issues in the target segment.';

    // Read all segments for context
    onReasoningChunk(`Reading segment files for context...\n`);
    const allSegments = await readAllSegments();

    // Build context: target segment + adjacent segments for transitions
    const contextSegments: Record<SegmentId, string> = {} as Record<SegmentId, string>;
    contextSegments[targetSegmentId] = allSegments[targetSegmentId];

    const idx = ALL_SEGMENT_IDS.indexOf(targetSegmentId);
    if (idx > 0) {
      const prevId = ALL_SEGMENT_IDS[idx - 1];
      contextSegments[prevId] = allSegments[prevId];
    }
    if (idx < ALL_SEGMENT_IDS.length - 1) {
      const nextId = ALL_SEGMENT_IDS[idx + 1];
      contextSegments[nextId] = allSegments[nextId];
    }

    // LLM rewrite loop with mechanical validation
    let llmReasoning = '';
    let mechanicalRetries = 0;
    let finalSegmentContent = '';
    let finalPrompt = '';
    let finalDiagnostics: string[] = [];

    while (true) {
      // Build prompt (first pass uses original feedback, retries use mechanical failure data)
      const promptInstructions =
        mechanicalRetries > 0
          ? `${rewriterInstructions}\n\nMECHANICAL CORRECTION NEEDED (attempt ${mechanicalRetries}/${MAX_MECHANICAL_RETRIES}):\n${buildMechanicalFeedback(validateMechanical(finalSegmentContent))}\n\nFix the mechanical issues above while preserving all content fixes.`
          : rewriterInstructions;

      onReasoningChunk(
        mechanicalRetries > 0
          ? `Mechanical check failed. Retrying ${targetSegmentId} (${mechanicalRetries}/${MAX_MECHANICAL_RETRIES})...\n`
          : `Building segment rewrite prompt for ${targetSegmentId}...\n`
      );

      const prompt = buildSegmentWriterPrompt(
        sessionConfig,
        contextSegments,
        targetSegmentId,
        promptInstructions,
        ctx.iteration
      );
      finalPrompt = prompt;

      // Stream to LLM
      onReasoningChunk(
        mechanicalRetries > 0
          ? `Sending ${targetSegmentId} to Segment Writer for mechanical correction...\n\n`
          : `Sending ${targetSegmentId} to Segment Writer for targeted rewrite...\n\n`
      );

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

      llmReasoning += reasoning;
      finalDiagnostics = diagnostics;

      // Parse rewritten segment
      onReasoningChunk('Parsing rewritten segment...\n');
      const rewrittenSegments = parseFullScript(response);
      const targetSegment = rewrittenSegments.find((s) => s.id === targetSegmentId);

      if (!targetSegment) {
        throw new Error(`Segment Writer could not parse ${targetSegmentId} from LLM response`);
      }

      finalSegmentContent = targetSegment.content;

      // Validate mechanically
      onReasoningChunk(`Running mechanical validation on rewritten ${targetSegmentId}...\n`);
      const mechanicalResult = validateMechanical(finalSegmentContent);
      const mechFeedback = buildMechanicalFeedback(mechanicalResult);
      onReasoningChunk(`${mechFeedback}\n`);

      if (mechanicalResult.pass || mechanicalRetries >= MAX_MECHANICAL_RETRIES) {
        if (!mechanicalResult.pass) {
          onReasoningChunk(`⚠️ Mechanical check still fails after ${MAX_MECHANICAL_RETRIES} retries. Proceeding with best effort.\n`);
        }
        break; // Exit loop
      }

      mechanicalRetries++;
      onReasoningChunk(`Mechanical check failed. Building corrective prompt for retry ${mechanicalRetries}...\n`);
    }

    // Write the final segment back to files
    await writeSegment(targetSegmentId, finalSegmentContent);
    onReasoningChunk(`Updated ${targetSegmentId}.txt (${finalSegmentContent.length} chars)\n`);

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
      reasoning: llmReasoning,
      prompt: finalPrompt,
      metadata: {
        rewrittenSegmentId: targetSegmentId,
        mechanicalRetries,
        streamDiagnostics: finalDiagnostics,
      },
    };
  };
}
