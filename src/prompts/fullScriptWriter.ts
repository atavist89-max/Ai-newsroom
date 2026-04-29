import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import { biasAgent1Instructions } from '../data/bias';

export function buildFullScriptWriterPrompt(
  config: SessionConfig,
  currentDraft: string,
  rewriterInstructions: string,
  iteration: number = 1
): string {
  const biasInstructions = biasAgent1Instructions[config.editorial.biasId];
  const topicList = config.content.topics.join(', ');

  const editorialNote = config.editorial.includeSegment
    ? `The script includes an EDITORIAL SEGMENT after the ${config.geography.continent.name} News block. Preserve it.`
    : `The script does NOT include an Editorial Segment. Do not add one.`;

  return `## ROLE
You are a senior podcast scriptwriter and editor. Your job is to rewrite a first-draft news podcast script based on editorial feedback. You improve the script while preserving its structure, music cues, and editorial perspective.

${formatSessionContextForLLM(config)}

## EDITORIAL FEEDBACK

The Phase 1 Editor reviewed the draft and provided the following feedback. You MUST address every point:

\`\`\`
${rewriterInstructions}
\`\`\`

## CURRENT DRAFT (Iteration ${iteration})

\`\`\`
${currentDraft}
\`\`\`

## YOUR TASK

Rewrite the ENTIRE script from top to bottom. Do not return a summary of changes — return the complete rewritten script.

### What to preserve:
- ALL music cues exactly as written: [INTRO: ...], [STORY STING: ...], [BLOCK TRANSITION: ...], [OUTRO: ...]
- The 6-theme structure: 3 local themes (${topicList}) followed by 3 continent themes (${topicList})
- ${editorialNote}
- The opening and sign-off structure
- Source attributions by name
- XML segment tags: each theme must be wrapped in \`<segment id="topicN" topic="...">...</segment>\` tags
- The intro must be in \`<segment id="intro">...</segment>\`
- The outro must be in \`<segment id="outro">...</segment>\`
- If editorial segment exists, wrap in \`<segment id="topic7" topic="Editorial">...</segment>\`

### What to improve:
- **Address EVERY item in the Editor's feedback** — do not ignore any rejection_reason
- **Active voice** — convert passive constructions to active where it improves clarity
- **Oral readability** — optimize for spoken delivery; use contractions, vary sentence rhythm
- **Sentence length** — ensure 60%+ of sentences are 15-30 words; average >15 words
- **Transitions** — strengthen bridges between themes; each theme after the first should open with a 1-sentence bridge
- **Cross-references** — add or strengthen explicit references between themes if missing
- **Term definitions** — define ALL local terms, acronyms, and organizations on first mention
- **Forward-looking closes** — every theme must end with "what to watch" or "what happens next"
- **Bias consistency** — maintain ${config.editorial.biasLabel} perspective throughout; do not drift to neutral or opposite framing

### Bias guidance:
${biasInstructions}

## OUTPUT FORMAT

Return ONLY the complete rewritten podcast script. No explanations, no JSON, no markdown formatting around the script. Start with the opening and end with the sign-off. Include all music cues.
`;
}
