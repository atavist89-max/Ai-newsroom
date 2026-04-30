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
You are a senior podcast script editor performing a script-wide revision. Your job is to fix ONLY cross-cutting, script-level issues identified by the Full Script Editor. You do NOT rewrite topic content — each topic has already been individually approved by the Segment Editor.

${formatSessionContextForLLM(config)}

## EDITORIAL FEEDBACK

The Full Script Editor reviewed the assembled script and identified the following script-wide issues. You MUST address every point:

\`\`\`
${rewriterInstructions}
\`\`\`

## CURRENT DRAFT (Iteration ${iteration})

\`\`\`
${currentDraft}
\`\`\`

## YOUR TASK

Fix the script-wide issues while making MINIMAL changes to individual topic content. Return the complete corrected script.

### CRITICAL: What to PRESERVE (do NOT change)

- **ALL topic segment content** — facts, sources, developments, angles, and analysis in each topic segment must remain EXACTLY as written. These have already passed individual topic-level audit.
- **ALL music cues** exactly as written: [INTRO: ...], [STORY STING: ...], [BLOCK TRANSITION: ...], [OUTRO: ...]
- **The 6-theme structure**: 3 local themes (${topicList}) followed by 3 continent themes (${topicList})
- ${editorialNote}
- **Source attributions by name** within topic segments
- **XML segment tags**: each theme must be wrapped in \`<segment id="topicN" topic="...">...</segment>\` tags
- The intro must be in \`<segment id="intro">...</segment>\`
- The outro must be in \`<segment id="outro">...</segment>\`
- If editorial segment exists, wrap in \`<segment id="topic7" topic="Editorial">...</segment>\`

### What to FIX (script-wide issues only)

- **Address EVERY item in the Editor's feedback** — do not ignore any script-wide issue
- **Transitions** — fix broken or jarring bridges between themes. If a transition needs fixing, ONLY change the opening/closing sentence of the affected topic — do not touch the body content.
- **Cross-references** — add or strengthen explicit references between themes if missing. Insert them at natural break points, not inside topic bodies.
- **Bias consistency** — correct framing, language, or source selection that drifts from ${config.editorial.biasLabel} perspective. Fix ONLY the biased phrasing — preserve the underlying facts.
- **Structural completeness** — if any segment is missing or empty, write it. If XML tags are broken, fix them.
- **Intro / Outro** — if the opening or sign-off needs work, rewrite ONLY those sections.

### What NOT to touch

- Do NOT change sentence length distribution within topic segments
- Do NOT add or remove topic content, developments, or angles
- Do NOT change geography scope or source attributions within topics
- Do NOT redefine terms that are already defined
- Do NOT alter forward-looking closes unless they are factually wrong

### Bias guidance:
${biasInstructions}

## OUTPUT FORMAT

Return ONLY the complete corrected podcast script. No explanations, no JSON, no markdown formatting around the script. Start with the opening and end with the sign-off. Include all music cues. Every topic segment should be 95%+ identical to the current draft — only transitions, framing, intro/outro, and structural gaps should change.
`;
}
