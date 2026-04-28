import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import {
  THEME_COMPLETENESS_REQUIREMENTS,
  EDITOR_COMPLETENESS_AUDIT,
  COHERENCE_REQUIREMENTS,
  BIAS_VERIFICATION_CHECKLIST,
} from './shared/completenessRequirements';

function replacePlaceholders(template: string, config: SessionConfig): string {
  return template
    .replace(/\[COUNTRY_NAME\]/g, config.geography.country.name)
    .replace(/\[CONTINENT_NAME\]/g, config.geography.continent.name)
    .replace(/\[COUNTRY_LANGUAGE\]/g, config.geography.country.language)
    .replace(/\[BIAS_LABEL\]/g, config.editorial.biasLabel);
}

export function buildGate1Prompt(
  config: SessionConfig,
  draft: string
): string {
  const completenessReqs = replacePlaceholders(THEME_COMPLETENESS_REQUIREMENTS, config);
  const editorAudit = replacePlaceholders(EDITOR_COMPLETENESS_AUDIT, config);
  const coherenceReqs = replacePlaceholders(COHERENCE_REQUIREMENTS, config);
  const biasChecklist = replacePlaceholders(BIAS_VERIFICATION_CHECKLIST, config);
  const topicList = config.content.topics.join(', ');

  return `## ROLE
You are a senior podcast editor performing a Phase 1 editorial audit. You evaluate first-draft scripts against strict quality criteria. You are thorough, specific, and actionable in your feedback.

${formatSessionContextForLLM(config)}

## DRAFT TO AUDIT

The following first-draft script contains 6 theme summaries based on these topics: ${topicList}.

Themes 1-3 are LOCAL (${config.geography.country.name}) news.
Themes 4-6 are ${config.geography.continent.name} continent news.

\`\`\`
${draft}
\`\`\`

## AUDIT CRITERIA

${completenessReqs}

${editorAudit}

${coherenceReqs}

${biasChecklist}

## YOUR TASK

Evaluate EACH of the 6 themes independently, then evaluate cross-theme coherence and bias consistency.

For EACH theme (1-6), check:
1. MINIMUM_LENGTH — Is the theme ≥2000 characters?
2. MULTIPLE_DEVELOPMENTS — Does it cover ≥3 distinct angles/events?
3. SENTENCE_LENGTH — Are 60%+ of sentences 15-30 words? Is average >15 words?
4. INTERNATIONAL_CONTEXT — Would a listener from another continent understand without Googling?
5. DEFINED_TERMS — Are ALL local terms, acronyms, and organizations defined on first mention?
6. FORWARD_LOOKING_CLOSE — Does it end with "what to watch" or "what happens next"?
7. SOURCE_ATTRIBUTION — Are sources cited by name within the theme text?
8. GEOGRAPHY_CORRECTNESS — Local themes only cover ${config.geography.country.name}; continent themes only cover ${config.geography.continent.name} countries.

Then check cross-theme:
9. TRANSITIONS — Does each theme (after the first) open with a bridge to the previous?
10. PROGRESSION — Logical flow from Local Topic 1 → 2 → 3 → Continent Topic 1 → 2 → 3?
11. CROSS_REFERENCES — At least one explicit reference between themes?
12. TONE_CONSISTENCY — Same register and assumptions across all themes?
13. BIAS_CONSISTENCY — Does the entire script maintain ${config.editorial.biasLabel} perspective?

## STREAM YOUR REASONING

As you evaluate, stream your thinking in real time:
- "Checking Theme 1 (${config.content.topics[0] || 'Local'}) length... 2,340 chars. PASS."
- "Checking Theme 1 developments... 4 distinct angles. PASS."
- etc.

Be specific about word counts, character counts, and which terms are undefined.

## OUTPUT FORMAT

After your reasoning, produce EXACTLY one JSON object (no markdown, no extra text):

\`\`\`json
{
  "approval_status": "APPROVED" | "REJECTED",
  "has_feedback": true | false,
  "stories": [
    {
      "story_id": 1,
      "rules": [
        { "rule_name": "MINIMUM_LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "MULTIPLE_DEVELOPMENTS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SENTENCE_LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "INTERNATIONAL_CONTEXT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "DEFINED_TERMS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "FORWARD_LOOKING_CLOSE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SOURCE_ATTRIBUTION", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "GEOGRAPHY_CORRECTNESS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ]
    },
    { "story_id": 2, "rules": [...] },
    { "story_id": 3, "rules": [...] },
    { "story_id": 4, "rules": [...] },
    { "story_id": 5, "rules": [...] },
    { "story_id": 6, "rules": [...] }
  ],
  "rewriter_instructions": "If rejected or has_feedback: specific, actionable fixes per theme. If approved with no feedback: 'All requirements passed. No changes needed.'"
}
\`\`\`

## CRITICAL RULES

- Set "has_feedback": true if you have ANY observations, suggestions, or required changes — even minor ones.
- Set "has_feedback": false ONLY if the draft is perfect and needs absolutely zero changes.
- If approval_status is "REJECTED", has_feedback MUST be true.
- If approval_status is "APPROVED" but you have minor suggestions, set has_feedback: true.
- Include "rejection_reason" for EVERY FAIL rule. Be specific: quote the problematic text, explain why it fails, and say exactly what to change.
- "rewriter_instructions" must be actionable enough that a writer can fix the draft without re-reading the criteria.
`;
}
