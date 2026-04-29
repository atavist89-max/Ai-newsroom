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
      `Running completeness audit for ${ctx.sessionConfig.geography.country.name} themes...`,
      'Checking cross-theme coherence...',
      'Verifying source attribution...',
      'All checks complete.',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, (config.delayMs || 800) / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const decision = config.gate1Decision || 'APPROVED';

    const allRules: Array<{ rule_name: string; status: 'PASS' | 'FAIL'; details?: string; rejection_reason?: string }> = [
      { rule_name: 'MINIMUM_LENGTH', status: 'PASS', details: 'All themes ≥2000 chars' },
      { rule_name: 'MULTIPLE_DEVELOPMENTS', status: 'PASS', details: 'All themes have ≥3 distinct angles' },
      { rule_name: 'SENTENCE_LENGTH', status: 'PASS', details: '60%+ sentences 15-30 words' },
      { rule_name: 'DEFINED_TERMS', status: 'PASS', details: 'All terms defined on first mention' },
      { rule_name: 'COHERENCE', status: 'PASS', details: 'Transitions, progression, cross-references present' },
      { rule_name: 'SOURCE_ATTRIBUTION', status: 'PASS', details: 'Sources cited by name within themes' },
    ];

    // If rejecting, flip some rules to FAIL with rejection_reasons
    if (decision === 'REJECTED') {
      allRules[0].status = 'FAIL';
      allRules[0].details = 'Theme 2 is 1650 characters';
      allRules[0].rejection_reason =
        'Theme 2 is only 1650 characters (minimum 2000). Expand with additional developments, direct quotes, or historical background to reach the required length.';

      allRules[3].status = 'FAIL';
      allRules[3].details = 'Theme 4 missing term definitions';
      allRules[3].rejection_reason =
        'Theme 4 uses "ECB" and "quantitative easing" without defining them for an international audience. Add parenthetical explanations on first mention.';
    }

    const failReasons = allRules
      .filter((r) => r.status === 'FAIL')
      .map((r) => r.rejection_reason)
      .filter((r): r is string => !!r);

    const rewriterInstructions =
      decision === 'REJECTED'
        ? `REJECTION FEEDBACK — apply these fixes:\n${failReasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
        : 'All requirements passed. No changes needed.';

    const metadata = {
      approval_status: decision as 'APPROVED' | 'REJECTED',
      rewrite_scope: decision === 'REJECTED' ? 'FULL_SCRIPT' : 'FULL_SCRIPT',
      failed_segments: [],
      themes: [
        {
          theme_id: 1,
          rules: allRules,
        },
      ],
      rewriter_instructions: rewriterInstructions,
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
