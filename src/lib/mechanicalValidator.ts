export interface MechanicalResult {
  pass: boolean;
  length: {
    pass: boolean;
    actual: number;
    required: number;
  };
  sentenceStructure: {
    pass: boolean;
    avgWords: number;
    percentInRange: number;
    sentencesAnalyzed: number;
    sentencesInRange: number;
  };
}

/**
 * Validates mechanical rules on a segment:
 * - Length: ≥2000 characters
 * - Sentence structure: ≥60% of sentences are 15-30 words, average >15 words
 */
export function validateMechanical(content: string): MechanicalResult {
  // Length check
  const actualLength = content.length;
  const lengthPass = actualLength >= 2000;

  // Sentence structure check
  const sentences = content
    .replace(/[.!?]+\s*/g, '.|')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const wordCounts = sentences.map(
    (s) => s.split(/\s+/).filter((w) => w.length > 0).length
  );

  const avgWords =
    wordCounts.length > 0
      ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
      : 0;

  const inRange = wordCounts.filter((c) => c >= 15 && c <= 30).length;
  const percentInRange =
    sentences.length > 0 ? (inRange / sentences.length) * 100 : 0;
  const sentencePass = percentInRange >= 60 && avgWords > 15;

  return {
    pass: lengthPass && sentencePass,
    length: { pass: lengthPass, actual: actualLength, required: 2000 },
    sentenceStructure: {
      pass: sentencePass,
      avgWords: Math.round(avgWords * 10) / 10,
      percentInRange: Math.round(percentInRange * 10) / 10,
      sentencesAnalyzed: sentences.length,
      sentencesInRange: inRange,
    },
  };
}

/**
 * Builds actionable feedback string from mechanical validation result.
 */
export function buildMechanicalFeedback(result: MechanicalResult): string {
  if (result.pass) {
    return `✓ MECHANICAL: All checks passed. (${result.length.actual} chars, avg ${result.sentenceStructure.avgWords} words, ${result.sentenceStructure.percentInRange}% in range).`;
  }

  const parts: string[] = [];

  if (!result.length.pass) {
    const needed = result.length.required - result.length.actual;
    parts.push(
      `LENGTH: ${result.length.actual} characters (need ${result.length.required}). Add ${needed} more characters of content.`
    );
  }

  if (!result.sentenceStructure.pass) {
    const avgIssue = result.sentenceStructure.avgWords <= 15;
    const rangeIssue = result.sentenceStructure.percentInRange < 60;

    if (avgIssue && rangeIssue) {
      parts.push(
        `SENTENCE STRUCTURE: Average ${result.sentenceStructure.avgWords} words per sentence (need >15). Only ${result.sentenceStructure.percentInRange}% of sentences are 15-30 words (need ≥60%). Of ${result.sentenceStructure.sentencesAnalyzed} sentences, ${result.sentenceStructure.sentencesInRange} are in range. Combine short sentences and break up long ones.`
      );
    } else if (avgIssue) {
      parts.push(
        `SENTENCE STRUCTURE: Average ${result.sentenceStructure.avgWords} words per sentence (need >15). Combine short choppy sentences into longer, more complex ones.`
      );
    } else {
      parts.push(
        `SENTENCE STRUCTURE: Only ${result.sentenceStructure.percentInRange}% of sentences are 15-30 words (need ≥60%). Of ${result.sentenceStructure.sentencesAnalyzed} sentences, ${result.sentenceStructure.sentencesInRange} are in range. Adjust sentence lengths to hit the 15-30 word sweet spot.`
      );
    }
  }

  return parts.join('\n');
}
