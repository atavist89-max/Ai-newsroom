import type { AgentFn } from '../../lib/pipelineTypes';

export const createAgent3Stub = (delayMs: number = 800): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const hasFeedback = ctx.feedback !== undefined;
    const reasoningSteps = hasFeedback
      ? [
          'Received editorial feedback. Reviewing required changes...',
          'Applying corrections to affected stories...',
          'Re-polishing for oral readability...',
          'Ensuring active voice throughout...',
          'Final pass complete.',
        ]
      : [
          'Beginning Phase 2 polish...',
          'Converting passive voice to active where possible...',
          'Optimizing sentence length distribution...',
          'Strengthening transitional narration...',
          'Applying editorial perspective consistently...',
          'Final readability check complete.',
        ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, delayMs / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const draft = hasFeedback
      ? ctx.currentDraft + '\n\n[STUB: Applied feedback corrections]'
      : ctx.currentDraft + '\n\n[STUB: Phase 2 polish applied — active voice, optimized transitions]';

    return { draft, reasoning };
  };
};
