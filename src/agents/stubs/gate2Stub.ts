import type { AgentFn } from '../../lib/pipelineTypes';
import type { StubConfig } from './stubConfig';

export const createGate2Stub = (config: StubConfig): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Beginning fact-check verification...',
      `Extracting factual claims from ${ctx.sessionConfig.geography.country.name} stories...`,
      'Cross-referencing against local sources...',
      `Extracting factual claims from ${ctx.sessionConfig.geography.continent.name} stories...`,
      'Cross-referencing against continental sources...',
      'Verifying dates fall within coverage window...',
      'Compiling verification report...',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, (config.delayMs || 800) / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const decision = config.gate2Decision || 'PASS';
    const metadata = {
      check_date: ctx.sessionConfig.dates.today,
      coverage_period: `${ctx.sessionConfig.dates.earliestDate} to ${ctx.sessionConfig.dates.today}`,
      script_phase: 'Phase 2 COMPLETE',
      overall_status: decision,
      stories: [
        {
          story_id: 1,
          section: `${ctx.sessionConfig.geography.country.name} Local`,
          headline: '[Headline from script]',
          original_language: ctx.sessionConfig.geography.country.language,
          grade: decision === 'PASS' ? 'FACT_CHECKED_FULLY_CORRECT' : 'FACT_CHECK_FAILED',
          verified_sources: ctx.sessionConfig.geography.country.newsSources.slice(0, 2),
          source_languages: [ctx.sessionConfig.geography.country.language, 'English'],
          source_dates: [ctx.sessionConfig.dates.today],
          unverified_claims: decision === 'PASS' ? [] : ['Specific claim not found in sources'],
          researcher_action: decision === 'PASS' ? 'NONE' : 'REPLACE_STORY',
          notes: `All core facts verified in ${ctx.sessionConfig.geography.country.language} sources.`,
        },
      ],
    };

    return { draft: ctx.currentDraft, reasoning, metadata };
  };
};
