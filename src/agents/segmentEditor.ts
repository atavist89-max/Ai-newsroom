import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildSegmentEditorPrompt } from '../prompts/segmentEditor';
import { parseFullScriptEditorOutput } from './fullScriptEditorParse';
import { readSegment, type SegmentId } from '../lib/fileManager';
import { validateMechanical, buildMechanicalFeedback } from '../lib/mechanicalValidator';

const INDEX_TO_SEGMENT: SegmentId[] = [
  'article1', 'article2', 'article3', 'article4', 'article5',
  'article6', 'article7', 'article8', 'editorial',
];

export function createSegmentEditor(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, segmentLoopIndex, currentDraft } = ctx;

    if (segmentLoopIndex < 0 || segmentLoopIndex >= INDEX_TO_SEGMENT.length) {
      throw new Error(`Segment Editor received invalid segmentLoopIndex: ${segmentLoopIndex}`);
    }

    const targetSegmentId = INDEX_TO_SEGMENT[segmentLoopIndex];
    const targetStoryId = segmentLoopIndex + 1;
    const topicName = targetSegmentId === 'editorial'
      ? 'Editorial'
      : sessionConfig.content.topics[segmentLoopIndex % 3] ?? 'Unknown';

    // Read the target segment from disk
    onReasoningChunk(`Reading segment ${targetSegmentId} for focused audit...\n`);
    const segmentContent = await readSegment(targetSegmentId);

    if (!segmentContent || segmentContent.trim().length === 0) {
      throw new Error(`Segment Editor found empty segment: ${targetSegmentId}`);
    }

    // STEP 1: Run mechanical validation (pure code, fast)
    onReasoningChunk(`Running mechanical checks on ${targetSegmentId}...\n`);
    const mechanicalResult = validateMechanical(segmentContent);
    const mechanicalFeedback = buildMechanicalFeedback(mechanicalResult);
    onReasoningChunk(`${mechanicalFeedback}\n`);

    // STEP 2: Build prompt with mechanical results included
    onReasoningChunk('Building segment audit prompt...\n');
    const prompt = buildSegmentEditorPrompt(
      sessionConfig,
      segmentContent,
      targetSegmentId,
      targetStoryId,
      topicName,
      mechanicalResult,
      ctx.iteration
    );

    // STEP 3: Stream to LLM for qualitative audit
    onReasoningChunk(`Sending segment ${targetSegmentId} to Segment Editor for qualitative audit...\n\n`);

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
        onReasoningChunk('\nQualitative audit complete. Parsing results...\n');
      },
    });

    // STEP 4: Parse qualitative audit result
    const qualitativeResult = parseFullScriptEditorOutput(response);

    // STEP 5: Combine mechanical + qualitative results
    const overallApproved = mechanicalResult.pass && qualitativeResult.approval_status === 'APPROVED';
    const combinedInstructions = overallApproved
      ? 'All requirements passed. No changes needed.'
      : [mechanicalFeedback, qualitativeResult.rewriter_instructions]
          .filter((s) => s && s.length > 0 && !s.includes('All requirements passed'))
          .join('\n\n');

    const combinedResult = {
      approval_status: overallApproved ? 'APPROVED' as const : 'REJECTED' as const,
      has_feedback: !overallApproved,
      stories: qualitativeResult.stories,
      rewriter_instructions: combinedInstructions,
      rewrite_scope: overallApproved ? undefined : 'SEGMENTS' as const,
      failed_segments: overallApproved ? undefined : [targetStoryId],
    };

    // Stream summary
    const statusLine = combinedResult.approval_status === 'APPROVED'
      ? `✓ ${targetSegmentId} APPROVED (mechanical + qualitative)`
      : `✗ ${targetSegmentId} REJECTED (${mechanicalResult.pass ? 'qualitative' : 'mechanical'} failed)`;
    onReasoningChunk(`\n${statusLine}\n`);

    if (combinedResult.has_feedback) {
      onReasoningChunk(`\nCombined Feedback:\n${combinedResult.rewriter_instructions}\n`);
    }

    return {
      draft: currentDraft,
      reasoning,
      prompt,
      metadata: {
        ...combinedResult,
        mechanicalResult,
        streamDiagnostics: diagnostics,
      },
    };
  };
}
