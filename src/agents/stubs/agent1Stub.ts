import type { AgentFn } from '../../lib/pipelineTypes';

export const createAgent1Stub = (delayMs: number = 800): AgentFn => {
  return async (ctx, onReasoningChunk) => {
    const reasoningSteps = [
      'Analyzing session configuration...',
      `Setting coverage window: ${ctx.sessionConfig.dates.earliestDate} to ${ctx.sessionConfig.dates.today}`,
      `Identifying news sources for ${ctx.sessionConfig.geography.country.name}...`,
      `Sources found: ${ctx.sessionConfig.geography.country.newsSources.join(', ')}`,
      `Scanning ${ctx.sessionConfig.geography.continent.name} sources...`,
      'Selecting top stories by relevance and diversity...',
      'Translating local-language stories to English...',
      'Writing first draft script with BBC structure...',
    ];

    let reasoning = '';
    for (const step of reasoningSteps) {
      await new Promise((r) => setTimeout(r, delayMs / reasoningSteps.length));
      reasoning += step + '\n';
      onReasoningChunk(step + '\n');
    }

    const draft = `## FIRST DRAFT SCRIPT
[STUB] ${ctx.sessionConfig.geography.country.name} ${ctx.sessionConfig.dates.timeframeLabel}

Opening: "These are today's headlines."

${ctx.sessionConfig.geography.country.name} Block (5 stories):
- Story 1: [Translated from ${ctx.sessionConfig.geography.country.language}]
- Story 2: [Translated from ${ctx.sessionConfig.geography.country.language}]
- Story 3: [Translated from ${ctx.sessionConfig.geography.country.language}]
- Story 4: [Translated from ${ctx.sessionConfig.geography.country.language}]
- Story 5: [Translated from ${ctx.sessionConfig.geography.country.language}]

${ctx.sessionConfig.geography.continent.name} Block (3 stories):
- Story 6: [From ${ctx.sessionConfig.geography.continent.newsSources[0]?.name || 'continental source'}]
- Story 7: [From ${ctx.sessionConfig.geography.continent.newsSources[1]?.name || 'continental source'}]
- Story 8: [From ${ctx.sessionConfig.geography.continent.newsSources[2]?.name || 'continental source'}]

Sign-off.

## STORY SELECTION REPORT
- Topic Focus: ${ctx.sessionConfig.content.topics.join(', ')}
- Fallback to General News: No
- ${ctx.sessionConfig.geography.country.name} Stories Selected: 5
- ${ctx.sessionConfig.geography.continent.name} Stories Selected: 3
`;

    return { draft, reasoning };
  };
};
