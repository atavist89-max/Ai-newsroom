import type { AgentFn } from '../../lib/pipelineTypes';
import type { StubConfig } from './stubConfig';

export const createGate1Stub = (config: StubConfig): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Beginning Phase 1 editorial audit...',
      'Checking opening phrasing...',
      'Verifying music cue placements...',
      'Checking block structure and transitions...',
      'Validating continent country attribution...',
      'Checking oral readability and sentence length...',
      `Running completeness audit for ${ctx.sessionConfig.geography.country.name} stories...`,
      'All checks complete.',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, (config.delayMs || 800) / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const decision = config.gate1Decision || 'APPROVE';
    const metadata = {
      approval_status: decision,
      stories: [
        {
          story_id: 1,
          rules: [
            { rule_name: 'MINIMUM_LENGTH', status: 'PASS' },
            { rule_name: 'SENTENCE_LENGTH', status: 'PASS' },
            { rule_name: 'DEFINED_TERMS', status: 'PASS' },
            { rule_name: 'FIVE_WS', status: 'PASS' },
          ],
        },
      ],
      rewriter_instructions: decision === 'REJECT' ? 'Expand Story 2 to minimum 1500 characters.' : undefined,
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
