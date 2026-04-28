import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';

export function buildGate1Prompt(
  config: SessionConfig,
  draft: string
): string {
  const topicList = config.content.topics.join(', ');
  const hasEditorialSegment = config.editorial.includeSegment;

  const editorialSegmentAudit = hasEditorialSegment
    ? `**EDITORIAL SEGMENT REQUIREMENTS:**

The user selected "Include Editorial Segment". The draft MUST contain an Editorial Segment.

- Exists, placed after the ${config.geography.continent.name} News block and before the sign-off
- ≥2500 characters
- ${config.editorial.biasLabel} perspective applied MORE prominently than in news themes
- Analyzes and connects themes from BOTH ${config.geography.country.name} and ${config.geography.continent.name}
- Provides closure and wraps up the podcast`
    : `**EDITORIAL SEGMENT REQUIREMENTS:**

The user did NOT select "Include Editorial Segment". The draft MUST NOT contain an Editorial Segment.

- Confirm NO editorial segment exists between the continent block and sign-off`;

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

  const editorialStoryCount = hasEditorialSegment ? '7' : '6';
  const editorialTaskBlock = hasEditorialSegment
    ? 'Check the Editorial Segment (story_id 7) against Editorial Segment Requirements.'
    : 'Verify NO Editorial Segment exists.';

  return `## ROLE
You are a senior podcast editor performing a Phase 1 editorial audit. Evaluate the draft against the criteria below and return a structured JSON verdict.

${formatSessionContextForLLM(config)}

## DRAFT TO AUDIT

Themes 1-3 are LOCAL (${config.geography.country.name}) news.
Themes 4-6 are ${config.geography.continent.name} continent news.
${hasEditorialSegment ? 'Story 7 is the EDITORIAL SEGMENT.' : 'NO Editorial Segment should be present.'}

Topics: ${topicList}

\`\`\`
${draft}
\`\`\`

## THEME REQUIREMENTS

Evaluate each theme (1-6) against these criteria. A theme FAILS if it violates any requirement.

| # | Criterion | PASS standard | Typical FAIL |
|---|---|---|---|
| 1 | **Length** | ≥2000 characters | Under-length, superficial |
| 2 | **Depth** | Synthesizes ≥3 distinct developments, events, or angles | Only 1-2 stories covered |
| 3 | **Sentence structure** | ≥60% of sentences are 15-30 words. Average sentence length >15 words. | Too many short choppy or long rambling sentences |
| 4 | **Accessibility** | Zero-knowledge listener can follow without Googling. Every term, acronym, organization defined on first mention. Historical context provided where relevant. | Assumes prior knowledge; undefined terms |
| 5 | **Forward close** | Ends with "what to watch" or "what happens next" | Abrupt ending, no lookahead |
| 6 | **Source attribution** | Specific sources cited by name in the text | Generic "reports say" with no source |
| 7 | **Geography** | Local themes = only ${config.geography.country.name} stories. Continent themes = only ${config.geography.continent.name} countries with continent angle. | Wrong geography mixed in |

## COHERENCE REQUIREMENTS

A script FAILS coherence if any of these are missing:

- **Transitions**: Each theme (after first) opens with a 1-sentence bridge from the previous.
- **Progression**: Logical flow: Local Topic 1 → 2 → 3 → Continent Topic 1 → 2 → 3.
- **Cross-references**: At least one explicit reference between themes.
- **Tone consistency**: Same register and listener-knowledge assumptions throughout.

## BIAS REQUIREMENTS

The entire script must maintain ${config.editorial.biasLabel} perspective:

- Headlines reflect ${config.editorial.biasLabel} framing (not neutral)
- Theme order prioritizes ${config.editorial.biasLabel} priorities
- Language choices align with ${config.editorial.biasLabel} terminology
- Source selection gives voice to ${config.editorial.biasLabel}-aligned sources
- No contradictory framing from opposing perspectives (unless for contrast)

${editorialSegmentAudit}

## YOUR TASK

1. Evaluate each theme (1-6) against the Theme Requirements table. Be specific: quote problematic text, state counts, name undefined terms.
2. ${editorialTaskBlock}
3. Check cross-theme Coherence and Bias.
4. Decide: APPROVED (clean pass), APPROVED with feedback (minor issues), or REJECTED (must rewrite).
5. Return JSON (see format below).

## OUTPUT FORMAT

Produce EXACTLY one JSON object. No markdown, no extra text.

\`\`\`json
{
  "approval_status": "APPROVED" | "REJECTED",
  "has_feedback": true | false,
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

## CRITICAL RULES

- Set "has_feedback": true if you have ANY observations, suggestions, or required changes — even minor ones.
- Set "has_feedback": false ONLY if the draft is perfect with zero changes needed.
- If approval_status is "REJECTED", has_feedback MUST be true.
- If approval_status is "APPROVED" but you have minor suggestions, set has_feedback: true.
- Include "rejection_reason" for EVERY FAIL rule. Be specific: quote the problematic text, explain why it fails, and say exactly what to change.
- "rewriter_instructions" must be actionable enough that a writer can fix the draft without re-reading the criteria.
- There must be exactly ${editorialStoryCount} stories in the output (6 themes${hasEditorialSegment ? ' + 1 editorial segment' : ''}).
`;
}
