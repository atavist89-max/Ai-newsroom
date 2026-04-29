import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildSegmentEditorPrompt } from '../prompts/segmentEditor';
import { parseFullScriptEditorOutput } from './fullScriptEditorParse';
import { readAllSegments, type SegmentId } from '../lib/fileManager';
import { assembleFullScript, type Segment } from '../lib/scriptParser';

export function createSegmentEditor(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, feedback } = ctx;

    // Extract which segments were rewritten
    const rewrittenSegmentIds =
      feedback && typeof feedback === 'object' && Array.isArray((feedback as Record<string, unknown>).rewrittenSegmentIds)
        ? (feedback as Record<string, unknown>).rewrittenSegmentIds as SegmentId[]
        : [];

    if (rewrittenSegmentIds.length === 0) {
      throw new Error('Segment Editor received no rewritten segment IDs — nothing to audit');
    }

    // Read all segments (including unchanged ones for context)
    onReasoningChunk(`Reading segments for targeted audit...\n`);
    const allSegments = await readAllSegments();

    // Build full script from segments for the audit
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

    const fullScript = assembleFullScript(segments);

    // Build prompt focused on rewritten segments
    onReasoningChunk('Building segment audit prompt...\n');
    const prompt = buildSegmentEditorPrompt(
      sessionConfig,
      fullScript,
      rewrittenSegmentIds,
      ctx.iteration
    );

    // Stream to LLM
    onReasoningChunk('Sending segments to Segment Editor for audit...\n\n');

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
        onReasoningChunk('\nSegment audit complete. Parsing results...\n');
      },
    });

    // Parse audit result
    const auditResult = parseFullScriptEditorOutput(response);

    // Stream summary
    const statusLine = auditResult.approval_status === 'APPROVED'
      ? `✓ APPROVED${auditResult.has_feedback ? ' (with feedback)' : ' (clean pass)'}`
      : '✗ REJECTED';
    onReasoningChunk(`\n${statusLine}\n`);

    if (auditResult.has_feedback && auditResult.rewriter_instructions) {
      onReasoningChunk(`\nFeedback:\n${auditResult.rewriter_instructions}\n`);
    }

    return {
      draft: fullScript,
      reasoning,
      prompt,
      metadata: { ...auditResult, streamDiagnostics: diagnostics },
    };
  };
}
