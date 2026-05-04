import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildSegmentWriterPrompt } from '../prompts/segmentWriter';
import { writeSegment, writeFullScript, readAllSegments, readSelectedArticles, type SegmentId } from '../lib/fileManager';
import { parseFullScript, assembleFullScript, type Segment } from '../lib/scriptParser';
import { validateMechanical, buildMechanicalFeedback } from '../lib/mechanicalValidator';

const INDEX_TO_SEGMENT: SegmentId[] = [
  'article1', 'article2', 'article3', 'article4', 'article5',
  'article6', 'article7', 'article8', 'editorial',
];

const ALL_SEGMENT_IDS: SegmentId[] = [
  'intro', 'article1', 'article2', 'article3', 'article4', 'article5', 'article6', 'article7', 'article8', 'editorial', 'outro',
];

const MAX_MECHANICAL_RETRIES = 3;

export function createSegmentWriter(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, segmentLoopIndex, feedback } = ctx;

    if (segmentLoopIndex < 0 || segmentLoopIndex >= INDEX_TO_SEGMENT.length) {
      throw new Error(`Segment Writer received invalid segmentLoopIndex: ${segmentLoopIndex}`);
    }

    const targetSegmentId = INDEX_TO_SEGMENT[segmentLoopIndex];

    // Compute topic name for the target segment
    const selectedMap = await readSelectedArticles();
    let topicName = 'Local';
    if (targetSegmentId === 'editorial') {
      topicName = 'Editorial';
    } else if (targetSegmentId.startsWith('article')) {
      const articleNum = parseInt(targetSegmentId.replace('article', ''), 10);
      if (articleNum >= 1 && articleNum <= 3) {
        topicName = sessionConfig.content.topics[articleNum - 1];
      } else if (articleNum === 4) {
        topicName = selectedMap['article4']?.topic || 'Local Wildcard';
      } else if (articleNum === 5) {
        topicName = selectedMap['article5']?.topic || 'Local Wildcard';
      } else if (articleNum === 6) {
        topicName = sessionConfig.content.topics[0];
      } else if (articleNum === 7) {
        topicName = sessionConfig.content.topics[1];
      } else if (articleNum === 8) {
        topicName = sessionConfig.content.topics[2];
      }
    }

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
        topicName,
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

      const { diagnostics } = await streamLLM(apiConfig.thinking, prompt, {
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
      { id: 'article1', topic: sessionConfig.content.topics[0], content: updatedSegments.article1 },
      { id: 'article2', topic: sessionConfig.content.topics[1], content: updatedSegments.article2 },
      { id: 'article3', topic: sessionConfig.content.topics[2], content: updatedSegments.article3 },
      { id: 'article4', topic: selectedMap['article4']?.topic || 'Local Wildcard', content: updatedSegments.article4 },
      { id: 'article5', topic: selectedMap['article5']?.topic || 'Local Wildcard', content: updatedSegments.article5 },
      { id: 'article6', topic: sessionConfig.content.topics[0], content: updatedSegments.article6 },
      { id: 'article7', topic: sessionConfig.content.topics[1], content: updatedSegments.article7 },
      { id: 'article8', topic: sessionConfig.content.topics[2], content: updatedSegments.article8 },
    ];
    if (sessionConfig.editorial.includeSegment) {
      segments.push({ id: 'editorial', topic: 'Editorial', content: updatedSegments.editorial });
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
