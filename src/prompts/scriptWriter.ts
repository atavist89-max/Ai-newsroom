import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import type { SelectedArticlesMap } from '../lib/fileManager';

export function buildScriptWriterPrompt(
  config: SessionConfig,
  articles: SelectedArticlesMap,
  iteration: number = 1
): string {
  // Build article blocks
  const articleBlocks = Object.entries(articles)
    .sort(([a], [b]) => a.localeCompare(b)) // article1, article2, ...
    .map(([key, slot]) => {
      const backupsXml = slot.backups
        .map(
          (b, i) => `  <backup${i + 1} source="${b.source}" tier="${b.tier}" wordCount="${b.wordCount}">
${b.text}
  </backup${i + 1}>`
        )
        .join('\n');

      return `<article slot="${key}" scope="${slot.scope}" topic="${slot.topic}">
  <main source="${slot.main.source}" tier="${slot.main.tier}" wordCount="${slot.main.wordCount}">
${slot.main.text}
  </main>
${backupsXml}
</article>`;
    })
    .join('\n\n');

  return `## ROLE
You are a senior podcast scriptwriter. Write a complete podcast script.

${formatSessionContextForLLM(config)}

## ARTICLES (Iteration ${iteration})

${articleBlocks}

## WRITING RULES

- Write ONE segment per article slot. 8 segments total.
- Each segment must be ≥2,000 characters.
- Use the MAIN source as the primary narrative backbone.
- Use BACKUP sources for: additional quotes, conflicting angles, corroborating facts, or deeper context.
- Each segment must explain the ONE major development with full context (DEPTH).
- A zero-knowledge listener must be able to follow without Googling (ACCESSIBILITY).
- End each segment with "what to watch" or "what happens next" (FORWARD_CLOSE).
- Cite specific sources by name, including backup sources where relevant (SOURCE_ATTRIBUTION).
- Local articles = stories from ${config.geography.country.name}.
- Continent articles = stories from ${config.geography.continent.name}.
- Maintain ${config.editorial.biasLabel} perspective throughout.

## OUTPUT FORMAT

Produce EXACTLY these XML segments in this order. No extra text outside the tags.

<segment id="intro">
[Intro: welcome, what this episode covers, hook the listener. 300-500 characters.]
</segment>

<segment id="article1" topic="${articles.article1?.topic ?? ''}">
[Segment 1]
</segment>

<segment id="article2" topic="${articles.article2?.topic ?? ''}">
[Segment 2]
</segment>

<segment id="article3" topic="${articles.article3?.topic ?? ''}">
[Segment 3]
</segment>

<segment id="article4" topic="${articles.article4?.topic ?? ''}">
[Segment 4]
</segment>

<segment id="article5" topic="${articles.article5?.topic ?? ''}">
[Segment 5]
</segment>

<segment id="article6" topic="${articles.article6?.topic ?? ''}">
[Segment 6]
</segment>

<segment id="article7" topic="${articles.article7?.topic ?? ''}">
[Segment 7]
</segment>

<segment id="article8" topic="${articles.article8?.topic ?? ''}">
[Segment 8]
</segment>

${config.editorial.includeSegment ? `<segment id="editorial" topic="Editorial">
[Optional editorial: synthesize the day's top stories into a closing analysis. 2,500+ characters.]
</segment>

` : ''}<segment id="outro">
[Outro: sign-off, call to action, where to find more. 200-400 characters.]
</segment>

## CRITICAL RULES

- Do NOT output markdown code blocks around the XML.
- Each <segment> must have a matching </segment>.
- Do not add extra segments.
- Do not skip any segment.`;
}
