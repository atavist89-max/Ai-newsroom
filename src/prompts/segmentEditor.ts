import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import type { SegmentId } from '../lib/fileManager';

export function buildSegmentEditorPrompt(
  config: SessionConfig,
  fullScript: string,
  rewrittenSegmentIds: SegmentId[],
  iteration: number = 1
): string {
  const topicList = config.content.topics.join(', ');
  const hasEditorialSegment = config.editorial.includeSegment;

  const editorialStoryBlock = hasEditorialSegment
    ? `    { "story_id": 7, "rules": [
        { "rule_name": "EDITORIAL_SEGMENT_PRESENT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_PLACEMENT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_BIAS_INTENSITY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_ANALYSIS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_CLOSURE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ] },`
    : '';

  return `## ROLE
You are a senior podcast editor performing a targeted segment audit. You evaluate ONLY the segments that were recently rewritten, but you assess them in the context of the full script to ensure transitions remain smooth.

${formatSessionContextForLLM(config)}

## SEGMENTS REWRITTEN IN THIS ITERATION
${rewrittenSegmentIds.join(', ')}

## FULL SCRIPT TO AUDIT (Iteration ${iteration})

Themes 1-3 are LOCAL (${config.geography.country.name}) news.
Themes 4-6 are ${config.geography.continent.name} continent news.
${hasEditorialSegment ? 'Story 7 is the EDITORIAL SEGMENT.' : 'NO Editorial Segment should be present.'}

Topics: ${topicList}

\`\`\`
${fullScript}
\`\`\`

## THEME REQUIREMENTS

Evaluate each rewritten theme against these criteria:

| # | Criterion | PASS standard | Typical FAIL |
|---|---|---|---|
| 1 | **Length** | ≥2000 characters | Under-length, superficial |
| 2 | **Depth** | Synthesizes ≥3 distinct developments, events, or angles | Only 1-2 stories covered |
| 3 | **Sentence structure** | ≥60% of sentences are 15-30 words. Average sentence length >15 words. | Too many short choppy or long rambling sentences |
| 4 | **Accessibility** | Zero-knowledge listener can follow without Googling. Every term, acronym, organization defined on first mention. | Assumes prior knowledge; undefined terms |
| 5 | **Forward close** | Ends with "what to watch" or "what happens next" | Abrupt ending, no lookahead |
| 6 | **Source attribution** | Specific sources cited by name in the text | Generic "reports say" with no source |
| 7 | **Geography** | Local themes = only ${config.geography.country.name} stories. Continent themes = only ${config.geography.continent.name} countries with continent angle. | Wrong geography mixed in |

## TRANSITION REQUIREMENTS (CRITICAL)

- The rewritten segment must transition smoothly from the preceding segment
- The rewritten segment must transition smoothly to the following segment
- Tone and register must match adjacent segments
- No jarring shifts in style, vocabulary, or knowledge assumptions

## YOUR TASK

1. Evaluate each rewritten theme (and the editorial segment if rewritten).
2. Check transitions between rewritten and adjacent segments.
3. Decide: APPROVED (rewritten segments pass and transitions are smooth) or REJECTED (issues remain).
4. Return JSON (see format below).

## OUTPUT FORMAT

Produce EXACTLY one JSON object. No markdown, no extra text.

\`\`\`json
{
  "approval_status": "APPROVED" | "REJECTED",
  "has_feedback": true | false,
  "rewrite_scope": "FULL_SCRIPT" | "SEGMENTS",
  "failed_segments": [1, 3],
  "stories": [
    {
      "story_id": 1,
      "rules": [
        { "rule_name": "LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "DEPTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SENTENCE_STRUCTURE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "ACCESSIBILITY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "FORWARD_CLOSE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SOURCE_ATTRIBUTION", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "GEOGRAPHY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ]
    },
    { "story_id": 2, "rules": [...] },
    { "story_id": 3, "rules": [...] },
    { "story_id": 4, "rules": [...] },
    { "story_id": 5, "rules": [...] },
    { "story_id": 6, "rules": [...] }${editorialStoryBlock}
  ],
  "rewriter_instructions": "Specific, actionable fixes per theme. Or: 'All requirements passed. No changes needed.'"
}
\`\`\`

## ROUTING RULES

- If all rewritten segments pass AND transitions are smooth → APPROVED, rewrite_scope: "FULL_SCRIPT", failed_segments: []
- If rewritten segments still fail OR transitions are broken → REJECTED, rewrite_scope: "SEGMENTS", failed_segments: [story IDs that still fail]
- If ≥4 segments fail OR cross-segment coherence is broken → REJECTED, rewrite_scope: "FULL_SCRIPT", failed_segments: []
`;
}
