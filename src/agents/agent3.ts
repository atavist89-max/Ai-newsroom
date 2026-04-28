import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildAgent3Prompt } from '../prompts/agent3';

export function createAgent3(): AgentFn {
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
    const prompt = buildAgent3Prompt(sessionConfig, currentDraft, rewriterInstructions, ctx.iteration);

    // STEP 2: Stream to LLM
    onReasoningChunk('Sending draft to Writer for rewrite...\n\n');

    let draft = '';
    let reasoning = '';
    const apiConfig = await loadApiConfig();

    const { diagnostics } = await streamLLM(apiConfig, prompt, {
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

    return {
      draft,
      reasoning,
      prompt,
      metadata: { streamDiagnostics: diagnostics },
    };
  };
}
