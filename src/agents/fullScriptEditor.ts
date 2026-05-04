import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildFullScriptEditorPrompt } from '../prompts/fullScriptEditor';
import { parseFullScriptEditorOutput } from './fullScriptEditorParse';

export function createFullScriptEditor(): AgentFn {
  return async (ctx, onReasoningChunk) => {
    const { sessionConfig, currentDraft } = ctx;

    if (!currentDraft || currentDraft.length === 0) {
      throw new Error('Gate 1 received empty draft — nothing to audit');
    }

    // STEP 1: Build prompt
    onReasoningChunk('Building editorial audit prompt...\n');
    const prompt = buildFullScriptEditorPrompt(sessionConfig, currentDraft, ctx.iteration);

    // STEP 2: Stream to LLM
    onReasoningChunk('Sending draft to editor for Phase 1 audit...\n\n');

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
        // Stream audit progress to reasoning for visual feedback
        onReasoningChunk(chunk);
      },
      onError: (err) => {
        throw err;
      },
      onDone: () => {
        onReasoningChunk('\nAudit complete. Parsing results...\n');
      },
    });

    // STEP 3: Parse output
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
      draft: currentDraft, // Editor does not rewrite — passes through unchanged
      reasoning,
      prompt,
      metadata: { ...auditResult, streamDiagnostics: diagnostics },
    };
  };
}
