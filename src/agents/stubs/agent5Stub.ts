import type { AgentFn } from '../../lib/pipelineTypes';

export const createAgent5Stub = (delayMs: number = 800): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Fact-check identified issues. Activating recovery protocol...',
      `Searching ${ctx.sessionConfig.geography.country.name} sources for replacement facts...`,
      `Translating search terms to ${ctx.sessionConfig.geography.country.language}...`,
      'Evaluating alternative stories...',
      'Selecting best replacement that maintains narrative flow...',
      'Preparing writer instructions...',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, delayMs / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const metadata = {
      recovery_actions: [
        {
          story_id: 1,
          action: 'REPLACED',
          new_headline: '[Replacement headline with verified facts]',
          replacement_sources: ctx.sessionConfig.geography.country.newsSources.slice(0, 2),
          source_languages: [ctx.sessionConfig.geography.country.language, 'English'],
          writer_instructions: 'Replace Story 1 with the new headline and facts provided above. Ensure transition to Story 2 remains smooth.',
        },
      ],
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
