import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import { biasAgent1Instructions } from '../data/bias';
import type { SegmentId } from '../lib/fileManager';

export function buildSegmentWriterPrompt(
  config: SessionConfig,
  contextSegments: Record<SegmentId, string>,
  targetSegmentId: SegmentId,
  rewriterInstructions: string,
  topicName: string,
  _iteration: number = 1
): string {
  const biasInstructions = biasAgent1Instructions[config.editorial.biasId];

  // Build segment context block
  const segmentBlocks = Object.entries(contextSegments)
    .map(([id, content]) => {
      const isTarget = id === targetSegmentId;
      const label = isTarget ? '**REWRITE THIS SEGMENT**' : '**READ-ONLY (for transition context)**';
      return `### ${label} — ${id}
\`\`\`
${content}
\`\`\``;
    })
    .join('\n\n');

  return `## ROLE
You are a senior podcast scriptwriter specializing in targeted segment rewrites. You rewrite ONLY the specified segment while preserving all other segments exactly as written.

${formatSessionContextForLLM(config)}

## EDITORIAL FEEDBACK

The Segment Editor identified issues in the target segment. You MUST address every point:

\`\`\`
${rewriterInstructions}
\`\`\`

## SEGMENT TO REWRITE

The following segment needs rewriting: ${targetSegmentId}

## CONTEXT (adjacent segments for transition continuity)

${segmentBlocks}

## YOUR TASK

1. Rewrite ONLY the segment marked "REWRITE THIS SEGMENT".
2. Do NOT modify segments marked "READ-ONLY".
3. Ensure transitions between the rewritten segment and its adjacent read-only segments flow naturally.
4. Maintain the same music cues, source attributions, and editorial perspective.

### What to improve:
- Address EVERY item in the Editor's feedback
- Active voice, oral readability, 15-30 word sentences
- Define all terms on first mention
- Forward-looking closes
- Maintain ${config.editorial.biasLabel} perspective

${biasInstructions}

## OUTPUT FORMAT

Return ONLY the rewritten segment, wrapped in XML tags exactly like this:

\`\`\`
<segment id="${targetSegmentId}" topic="${topicName}">
[rewritten content]
</segment>
\`\`\`

Do NOT return read-only segments. Do not add explanations or JSON.
`;
}
