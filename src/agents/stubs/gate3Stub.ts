import type { AgentFn } from '../../lib/pipelineTypes';
import type { StubConfig } from './stubConfig';

export const createGate3Stub = (config: StubConfig): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Beginning FINAL editorial audit...',
      'Running full completeness checklist...',
      'Verifying all 1500+ character minimums...',
      'Checking sentence length distribution...',
      'Confirming all terms defined for international audience...',
      'Validating 5 Ws + How in every story...',
      'Checking continent angle and country attribution...',
      'Verifying bias consistency throughout...',
      'Final approval decision...',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, (config.delayMs || 800) / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const decision = config.gate3Decision || 'APPROVE';
    const metadata = {
      approval_status: decision,
      stories: Array.from({ length: 8 }, (_, i) => ({
        story_id: i + 1,
        rules: [
          { rule_name: 'MINIMUM_LENGTH', status: 'PASS' },
          { rule_name: 'SENTENCE_LENGTH', status: 'PASS' },
          { rule_name: 'DEFINED_TERMS', status: 'PASS' },
          { rule_name: 'FIVE_WS', status: 'PASS' },
          { rule_name: 'CONTINENT_ANGLE', status: 'PASS' },
        ],
      })),
      rewriter_instructions: decision === 'REJECT' ? 'Improve transitional narration between blocks.' : undefined,
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
