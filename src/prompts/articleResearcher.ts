export interface ScoredArticle {
  index: number;
  impact: number;
  prominence: number;
  rarity: number;
  conflict: number;
  average: number;
}

export function buildScoringPrompt(
  bucketName: string,
  articles: { title: string; description: string; source: string; url: string }[]
): string {
  const articleList = articles
    .map(
      (a, i) =>
        `${i + 1}. "${a.title}"\n   Description: ${a.description}\n   Source: ${a.source}\n   URL: ${a.url}`
    )
    .join('\n\n');

  return `You are a senior news editor scoring articles for a podcast segment.

BUCKET: ${bucketName}

SCORE EACH ARTICLE 1-10 on:
- **Impact**: How many people are affected by this story? The more, the better.
- **Prominence**: How prominent are the players in the story?
- **Rarity**: How unexpected are the elements of the story?
- **Conflict**: Opposing forces make a story more compelling.

ARTICLES TO SCORE:

${articleList}

Return STRICT JSON only. No markdown, no extra text.

\`\`\`json
[
  { "index": 0, "impact": 8, "prominence": 7, "rarity": 6, "conflict": 9, "average": 7.5 },
  ...
]
\`\`\`

Rules:
- Be discriminating. Most articles should score 4-7. Truly exceptional stories score 8-10.
- "Average" must be the arithmetic mean of the 4 scores.
- Do NOT round averages. Use one decimal place.`;
}
