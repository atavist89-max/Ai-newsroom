import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import type { SegmentId } from '../lib/fileManager';
import type { MechanicalAudit } from '../lib/pipelineTypes';

export function buildSegmentEditorPrompt(
  config: SessionConfig,
  segmentContent: string,
  targetSegmentId: SegmentId,
  targetStoryId: number,
  topicName: string,
  mechanicalAudit: MechanicalAudit,
  iteration: number = 1
): string {
  const isEditorial = targetSegmentId === 'editorial';
  const geographyLabel = targetStoryId <= 5
    ? `Local articles = only ${config.geography.country.name} stories`
    : `Continent articles = only ${config.geography.continent.name} countries with continent angle`;

  // Build mechanical results display
  const mechStatus = mechanicalAudit.pass ? '✓ PASS' : '✗ FAIL';
  const mechLength = `${mechanicalAudit.length.actual} / ${mechanicalAudit.length.required} chars`;
  const mechSentence = `avg ${mechanicalAudit.sentenceStructure.avgWords} words, ${mechanicalAudit.sentenceStructure.percentInRange}% in 15-30 range (${mechanicalAudit.sentenceStructure.sentencesInRange}/${mechanicalAudit.sentenceStructure.sentencesAnalyzed} sentences)`;

  const mechanicalBlock = `## MECHANICAL CHECK RESULTS (performed automatically by code)

These objective checks have already been run. You do NOT evaluate them — they are provided for context only.

- **Overall**: ${mechStatus}
- **Length**: ${mechLength} ${mechanicalAudit.length.pass ? '(PASS)' : '(FAIL — need ≥2000)'}
- **Sentence Structure**: ${mechSentence} ${mechanicalAudit.sentenceStructure.pass ? '(PASS)' : '(FAIL — need avg >15, ≥60% in range)'}

Your job is to evaluate ONLY the 5 qualitative content rules below.`;

  const editorialRules = isEditorial
    ? `    { "story_id": ${targetStoryId}, "rules": [
        { "rule_name": "EDITORIAL_SEGMENT_PRESENT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_PLACEMENT", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_LENGTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_BIAS_INTENSITY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_ANALYSIS", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "EDITORIAL_SEGMENT_CLOSURE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ] }`
    : `    { "story_id": ${targetStoryId}, "rules": [
        { "rule_name": "DEPTH", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "ACCESSIBILITY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "FORWARD_CLOSE", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "SOURCE_ATTRIBUTION", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." },
        { "rule_name": "GEOGRAPHY", "status": "PASS" | "FAIL", "details": "...", "rejection_reason": "..." }
      ] }`;

  const evaluationSteps = isEditorial
    ? `Step 1: Evaluate EDITORIAL SEGMENT — **PRESENT**. Does it exist and is it clearly labeled?
Step 2: Evaluate EDITORIAL SEGMENT — **PLACEMENT**. Is it after the continent block and before the sign-off?
Step 3: Evaluate EDITORIAL SEGMENT — **LENGTH**. Is it ≥2500 characters?
Step 4: Evaluate EDITORIAL SEGMENT — **BIAS INTENSITY**. Is the ${config.editorial.biasLabel} perspective applied MORE prominently than in news articles?
Step 5: Evaluate EDITORIAL SEGMENT — **ANALYSIS**. Does it connect and analyze articles from BOTH ${config.geography.country.name} and ${config.geography.continent.name}?
Step 6: Evaluate EDITORIAL SEGMENT — **CLOSURE**. Does it provide closure and wrap up the podcast?`
    : `Step 1: Evaluate Story ${targetStoryId} (${targetSegmentId}, topic: ${topicName}) — **DEPTH**. Does it explain the ONE major development with full context (background, why it matters, who is involved, and what happens next)?
Step 2: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **ACCESSIBILITY**. Would a zero-knowledge listener follow without Googling? Are all terms defined on first mention?
Step 3: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **FORWARD_CLOSE**. Does it end with "what to watch" or "what happens next"?
Step 4: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **SOURCE_ATTRIBUTION**. Are specific sources cited by name in the text?
Step 5: Evaluate Story ${targetStoryId} (${targetSegmentId}) — **GEOGRAPHY**. ${geographyLabel}.`;

  return `## ROLE
You are a senior podcast editor performing a focused article audit. You evaluate ONLY the single article segment provided below. You do NOT check transitions to other segments or bias consistency across the script — those are handled by the Full Script Editor.

${formatSessionContextForLLM(config)}

${mechanicalBlock}

## SEGMENT TO AUDIT (Iteration ${iteration})

${isEditorial ? 'Editorial Segment' : `Story ${targetStoryId} (${targetSegmentId}, topic: ${topicName})`}

\`\`\`
${segmentContent}
\`\`\`

## EVALUATION SEQUENCE — FOLLOW THESE STEPS IN EXACT ORDER

**CRITICAL: Work through each step sequentially. Do not skip steps. Record your PASS/FAIL verdict for each step as you go, then move to the next.**

${evaluationSteps}

Step ${isEditorial ? 7 : 6}: Tally results and apply ROUTING RULES.

## ROUTING RULES

You have exactly TWO possible outcomes. No third option. No escape hatch.

**APPROVED** — Use ONLY when:
- Every rule evaluated has 0 FAILs.

→ Set: approval_status: "APPROVED", has_feedback: false, rewrite_scope: "", failed_segments: []

**REJECTED** — Use when ANY of the following is true:
- One or more rules have ≥1 FAIL.

→ Set: approval_status: "REJECTED", has_feedback: true, rewrite_scope: "SEGMENTS", failed_segments: [${targetStoryId}]

Step ${isEditorial ? 8 : 7}: Build the JSON output.

## JSON OUTPUT FORMAT

Produce EXACTLY one JSON object. No markdown, no extra text.

\`\`\`json
{
  "approval_status": "APPROVED" | "REJECTED",
  "has_feedback": true | false,
  "rewrite_scope": "" | "SEGMENTS",
  "failed_segments": [${targetStoryId}],
  "stories": [
${editorialRules}
  ],
  "rewriter_instructions": "Specific, actionable fixes. Or: 'All requirements passed. No changes needed.'"
}
\`\`\`

## CRITICAL RULES

- "has_feedback" MUST match approval_status exactly: "APPROVED" → false, "REJECTED" → true. No exceptions.
- Include "rejection_reason" for EVERY FAIL rule. Be specific: quote the problematic text, explain why it fails, and say exactly what to change.
- "rewriter_instructions" is your catch-all for any feedback that does NOT fit the specific rules above. It must be actionable enough that a writer can fix the draft without re-reading the criteria.
- If all rules pass and you have no extra observations, set rewriter_instructions to "All requirements passed. No changes needed."
`;
}
