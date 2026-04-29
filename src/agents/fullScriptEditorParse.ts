import type { AuditResult } from '../lib/pipelineTypes';


export function parseFullScriptEditorOutput(raw: string): AuditResult {
  // Try to extract JSON from markdown code block first
  const jsonMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  const jsonText = jsonMatch ? jsonMatch[1].trim() : raw.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // Try to find JSON object boundaries in raw text
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        parsed = JSON.parse(objectMatch[0]);
      } catch {
        throw new Error('Failed to parse Gate 1 audit JSON. Raw output:\n' + raw.slice(0, 500));
      }
    } else {
      throw new Error('Failed to parse Gate 1 audit JSON. Raw output:\n' + raw.slice(0, 500));
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Gate 1 output is not a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  // Validate required fields
  if (!obj.approval_status || (obj.approval_status !== 'APPROVED' && obj.approval_status !== 'REJECTED')) {
    throw new Error('Full Script Editor output missing valid approval_status');
  }

  if (!Array.isArray(obj.stories)) {
    throw new Error('Full Script Editor output missing stories array');
  }

  if (typeof obj.rewriter_instructions !== 'string') {
    throw new Error('Full Script Editor output missing rewriter_instructions');
  }

  // Normalize has_feedback
  const hasFeedback = obj.has_feedback === true || obj.approval_status === 'REJECTED';

  // Validate each story
  const stories = obj.stories.map((story: unknown, idx: number) => {
    if (!story || typeof story !== 'object' || !Array.isArray((story as Record<string, unknown>).rules)) {
      throw new Error(`Full Script Editor story ${idx + 1} missing rules array`);
    }
    const s = story as Record<string, unknown>;
    const rules = (s.rules as unknown[]).map((rule: unknown, rIdx: number) => {
      if (!rule || typeof rule !== 'object') {
        throw new Error(`Full Script Editor story ${idx + 1} rule ${rIdx + 1} is not an object`);
      }
      const r = rule as Record<string, unknown>;
      return {
        rule_name: String(r.rule_name ?? 'UNKNOWN'),
        status: (r.status === 'FAIL' ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
        details: r.details ? String(r.details) : undefined,
        rejection_reason: r.rejection_reason ? String(r.rejection_reason) : undefined,
      };
    });
    return {
      story_id: Number(s.story_id ?? idx + 1),
      rules,
    };
  });

  // Parse rewrite_scope and failed_segments
  const rewriteScope = obj.rewrite_scope === 'SEGMENTS' ? 'SEGMENTS' : 'FULL_SCRIPT';
  const failedSegments = Array.isArray(obj.failed_segments)
    ? (obj.failed_segments as unknown[]).map((n) => Number(n)).filter((n) => !isNaN(n) && n >= 1 && n <= 7)
    : undefined;

  return {
    approval_status: obj.approval_status as 'APPROVED' | 'REJECTED',
    has_feedback: hasFeedback,
    stories,
    rewriter_instructions: String(obj.rewriter_instructions),
    rewrite_scope: rewriteScope,
    failed_segments: rewriteScope === 'SEGMENTS' ? failedSegments : undefined,
  };
}
