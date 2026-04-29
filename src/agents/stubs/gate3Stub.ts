import type { AgentFn } from '../../lib/pipelineTypes';
import type { StubConfig } from './stubConfig';

export const createGate3Stub = (config: StubConfig): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Beginning FINAL editorial audit...',
      'Running full completeness checklist...',
      'Verifying all 2000+ character minimums...',
      'Checking sentence length distribution...',
      'Confirming all terms defined for international audience...',
      'Validating multiple developments per theme...',
      'Checking continent angle and country attribution...',
      'Verifying cross-theme coherence and transitions...',
      'Verifying bias consistency throughout...',
      'Final approval decision...',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, (config.delayMs || 800) / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const decision = config.gate3Decision || 'APPROVED';

    const allRules: Array<{ rule_name: string; status: 'PASS' | 'FAIL'; details?: string; rejection_reason?: string }> = [
      { rule_name: 'MINIMUM_LENGTH', status: 'PASS' },
      { rule_name: 'MULTIPLE_DEVELOPMENTS', status: 'PASS' },
      { rule_name: 'SENTENCE_LENGTH', status: 'PASS' },
      { rule_name: 'DEFINED_TERMS', status: 'PASS' },
      { rule_name: 'COHERENCE', status: 'PASS' },
      { rule_name: 'SOURCE_ATTRIBUTION', status: 'PASS' },
      { rule_name: 'BIAS_CONSISTENCY', status: 'PASS' },
    ];

    // If rejecting, flip some rules to FAIL with rejection_reasons
    if (decision === 'REJECTED') {
      allRules[1].status = 'FAIL';
      allRules[1].rejection_reason =
        'Theme 3 (Technology) only covers one development (a new smartphone launch). It needs at least 2 more angles — policy implications, market impact, or competitor reactions — to meet the 3-development minimum.';

      allRules[6].status = 'FAIL';
      allRules[6].rejection_reason =
        'The Editorial Segment reads neutral despite Moderate-Left bias being selected. Strengthen framing around policy impact on working families and add more activist voices.';
    }

    const failReasons = allRules
      .filter((r) => r.status === 'FAIL')
      .map((r) => r.rejection_reason)
      .filter((r): r is string => !!r);

    const rewriterInstructions =
      decision === 'REJECTED'
        ? `FINAL REJECTION — apply these fixes before resubmitting:\n${failReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : 'All requirements passed. Script approved for production.';

    const metadata = {
      approval_status: decision as 'APPROVED' | 'REJECTED',
      themes: Array.from({ length: 6 }, (_, i) => ({
        theme_id: i + 1,
        rules: allRules,
      })),
      rewriter_instructions: rewriterInstructions,
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
