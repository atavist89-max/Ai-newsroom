import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import { biasAgent1Instructions } from '../data/bias';
import type { SegmentId } from '../lib/fileManager';

export function buildSegmentWriterPrompt(
  config: SessionConfig,
  contextSegments: Record<SegmentId, string>,
  targetSegmentIds: SegmentId[],
  rewriterInstructions: string,
  _iteration: number = 1
): string {
  const biasInstructions = biasAgent1Instructions[config.editorial.biasId];

  // Build segment context block
  const segmentBlocks = Object.entries(contextSegments)
    .map(([id, content]) => {
      const isTarget = targetSegmentIds.includes(id as SegmentId);
      const label = isTarget ? '**REWRITE THIS SEGMENT**' : '**READ-ONLY (for transition context)**';
      return `### ${label} — ${id}
\`\`\`
${content}
\`\`\``;
    })
    .join('\n\n');

  return `## ROLE
You are a senior podcast scriptwriter specializing in targeted segment rewrites. You rewrite ONLY the specified failing segments while preserving all approved segments exactly as written.

${formatSessionContextForLLM(config)}

## EDITORIAL FEEDBACK

The Full Script Editor identified issues in specific segments. You MUST address every point:

\`\`\`
${rewriterInstructions}
\`\`\`

## SEGMENTS TO REWRITE

The following segments need rewriting: ${targetSegmentIds.join(', ')}

## CONTEXT (all segments for transition continuity)

${segmentBlocks}

## YOUR TASK

1. Rewrite ONLY the segments marked "REWRITE THIS SEGMENT".
2. Do NOT modify segments marked "READ-ONLY".
3. Ensure transitions between rewritten segments and their adjacent read-only segments flow naturally.
4. Maintain the same music cues, source attributions, and editorial perspective.

### What to improve:
- Address EVERY item in the Editor's feedback
- Active voice, oral readability, 15-30 word sentences
- Define all terms on first mention
- Forward-looking closes
- Maintain ${config.editorial.biasLabel} perspective

${biasInstructions}

## OUTPUT FORMAT

Return ONLY the rewritten segments, each wrapped in XML tags exactly like this:

\`\`\`
<segment id="topic1" topic="${config.content.topics[0]}">
[rewritten content for topic1]
</segment>

<segment id="topic2" topic="${config.content.topics[1]}">
[rewritten content for topic2]
</segment>
\`\`\`

Do NOT return read-only segments. Do not add explanations or JSON.
`;
}
