import type { SegmentId } from './fileManager';
import { ALL_SEGMENT_IDS } from './fileManager';

export interface Segment {
  id: SegmentId;
  topic?: string;
  content: string;
}

/**
 * Parse a full script containing XML <segment> tags into individual segments.
 */
export function parseFullScript(text: string): Segment[] {
  const segments: Segment[] = [];
  const regex = /<segment\s+id="([^"]+)"(?:\s+topic="([^"]+)")?\s*>([\s\S]*?)<\/segment>/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const id = match[1] as SegmentId;
    const topic = match[2];
    const content = match[3].trim();
    segments.push({ id, topic, content });
  }

  return segments;
}

/**
 * Assemble segments into a full script with XML tags.
 */
export function assembleFullScript(segments: Segment[]): string {
  return segments
    .map((seg) => {
      const topicAttr = seg.topic ? ` topic="${seg.topic}"` : '';
      return `<segment id="${seg.id}"${topicAttr}>\n${seg.content}\n</segment>`;
    })
    .join('\n\n');
}

/**
 * Strip XML tags from a script for TTS / audio production.
 */
export function stripXmlTags(text: string): string {
  return text.replace(/<segment\s+[^>]*>[\s\S]*?<\/segment>/g, (match) => {
    // Extract just the content between the tags
    const contentMatch = match.match(/<segment\s+[^>]*>([\s\S]*?)<\/segment>/);
    return contentMatch ? contentMatch[1].trim() : '';
  });
}

/**
 * Extract a single segment by ID from a full script.
 */
export function extractSegment(id: SegmentId, text: string): Segment | null {
  const segments = parseFullScript(text);
  return segments.find((s) => s.id === id) ?? null;
}

/**
 * Build a full script from a record of segment contents.
 * Uses the standard segment IDs and topics.
 */
export function buildFullScriptFromSegments(
  segmentContents: Record<SegmentId, string>,
  topics: string[],
  includeEditorial: boolean,
  selectedArticles?: Record<string, { topic: string }>
): string {
  const segments: Segment[] = [
    { id: 'intro', content: segmentContents.intro },
    { id: 'article1', topic: topics[0], content: segmentContents.article1 },
    { id: 'article2', topic: topics[1], content: segmentContents.article2 },
    { id: 'article3', topic: topics[2], content: segmentContents.article3 },
    { id: 'article4', topic: selectedArticles?.['article4']?.topic || 'Local Wildcard', content: segmentContents.article4 },
    { id: 'article5', topic: selectedArticles?.['article5']?.topic || 'Local Wildcard', content: segmentContents.article5 },
    { id: 'article6', topic: topics[0], content: segmentContents.article6 },
    { id: 'article7', topic: topics[1], content: segmentContents.article7 },
    { id: 'article8', topic: topics[2], content: segmentContents.article8 },
  ];

  if (includeEditorial) {
    segments.push({ id: 'editorial', topic: 'Editorial', content: segmentContents.editorial });
  }

  segments.push({ id: 'outro', content: segmentContents.outro });

  return assembleFullScript(segments);
}

/**
 * Convert a parsed full script back into a Record<SegmentId, string>.
 */
export function segmentsToRecord(segments: Segment[]): Record<SegmentId, string> {
  const record = {} as Record<SegmentId, string>;
  for (const id of ALL_SEGMENT_IDS) {
    record[id] = '';
  }
  for (const seg of segments) {
    record[seg.id] = seg.content;
  }
  return record;
}

/**
 * Wrap plain text in segment tags. Useful when converting old-style drafts.
 */
export function wrapInSegment(id: SegmentId, content: string, topic?: string): string {
  const topicAttr = topic ? ` topic="${topic}"` : '';
  return `<segment id="${id}"${topicAttr}>\n${content}\n</segment>`;
}
