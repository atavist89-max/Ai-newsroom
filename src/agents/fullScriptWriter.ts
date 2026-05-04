import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildFullScriptWriterPrompt } from '../prompts/fullScriptWriter';
import { clearAllSegments, writeSegment, writeFullScript } from '../lib/fileManager';
import { parseFullScript, assembleFullScript } from '../lib/scriptParser';

export function createFullScriptWriter(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, currentDraft, feedback } = ctx;

    if (!currentDraft || currentDraft.length === 0) {
      throw new Error('Agent 3 received empty draft — nothing to rewrite');
    }

    // Extract rewriter instructions from editor feedback
    const rewriterInstructions =
      feedback && typeof feedback === 'object' && 'rewriter_instructions' in feedback
        ? String((feedback as Record<string, unknown>).rewriter_instructions)
        : 'Polish the script for active voice, oral readability, and narrative flow.';

    // STEP 1: Build prompt
    onReasoningChunk('Building rewrite prompt with editor feedback...\n');
    const prompt = buildFullScriptWriterPrompt(sessionConfig, currentDraft, rewriterInstructions, ctx.iteration);

    // STEP 2: Stream to LLM
    onReasoningChunk('Sending draft to Writer for rewrite...\n\n');

    let draft = '';
    let reasoning = '';
    const apiConfig = await loadApiConfig();

    const { diagnostics } = await streamLLM(apiConfig.thinking, prompt, {
      onReasoningChunk: (chunk) => {
        reasoning += chunk;
        onReasoningChunk(chunk);
      },
      onContentChunk: (chunk) => {
        draft += chunk;
        // Stream draft content to reasoning for visual feedback
        onReasoningChunk(chunk);
      },
      onError: (err) => {
        throw err;
      },
      onDone: () => {
        onReasoningChunk('\nRewrite complete.\n');
      },
    });

    // STEP 3: Parse segments and write to files
    onReasoningChunk('Parsing rewritten segments...\n');
    const segments = parseFullScript(draft);

    if (segments.length > 0) {
      await clearAllSegments();
      for (const seg of segments) {
        await writeSegment(seg.id, seg.content);
        onReasoningChunk(`  Wrote ${seg.id}.txt (${seg.content.length} chars)\n`);
      }
      const fullScript = assembleFullScript(segments);
      await writeFullScript(fullScript);
      onReasoningChunk(`  Wrote full_script.txt (${fullScript.length} chars)\n`);
    } else {
      onReasoningChunk('  No XML segments found — writing draft as single block\n');
      await writeFullScript(draft);
    }

    return {
      draft,
      reasoning,
      prompt,
      metadata: { streamDiagnostics: diagnostics, segmentsWritten: segments.length },
    };
  };
}
