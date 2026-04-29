import type { SessionConfig } from '../lib/sessionConfig';
import { formatSessionContextForLLM } from '../lib/sessionConfig';
import {
  THEME_COMPLETENESS_REQUIREMENTS,
} from './shared/completenessRequirements';
import { biasAgent1Instructions, biasEditorialGuidelines } from '../data/bias';
import type { NewsArticle } from '../lib/newsSearch';

function replacePlaceholders(template: string, config: SessionConfig): string {
  return template
    .replace(/\[COUNTRY_NAME\]/g, config.geography.country.name)
    .replace(/\[CONTINENT_NAME\]/g, config.geography.continent.name)
    .replace(/\[COUNTRY_LANGUAGE\]/g, config.geography.country.language)
    .replace(/\[BIAS_LABEL\]/g, config.editorial.biasLabel);
}

function buildArticleContext(articles: NewsArticle[], label: string): string {
  if (articles.length === 0) {
    return `**${label}**: No articles found.`;
  }
  const lines = articles.map((a, i) => {
    const date = a.publishedAt ? ` (${a.publishedAt})` : '';
    return `${i + 1}. **${a.title}**${date}\n   Source: ${a.source}\n   ${a.description}`;
  });
  return `**${label}** (${articles.length} articles):

${lines.join('\n\n')}`;
}

export interface TopicArticleGroup {
  topic: string;
  localArticles: NewsArticle[];
  continentArticles: NewsArticle[];
}

export function buildAgent1Prompt(
  config: SessionConfig,
  topicGroups: TopicArticleGroup[],
  iteration: number = 1
): string {
  const completenessReqs = replacePlaceholders(THEME_COMPLETENESS_REQUIREMENTS, config);
  const biasInstructions = biasAgent1Instructions[config.editorial.biasId];
  const biasGuidelines = biasEditorialGuidelines[config.editorial.biasId];

  const countrySources = config.geography.country.newsSources.join(', ');
  const continentSources = config.geography.continent.newsSources.map(s => s.name).join(', ');

  // Build per-topic article context
  const topicContexts = topicGroups.map((group, idx) => {
    const localCtx = buildArticleContext(group.localArticles, `Local: ${config.geography.country.name} — ${group.topic}`);
    const continentCtx = buildArticleContext(group.continentArticles, `Continent: ${config.geography.continent.name} — ${group.topic}`);
    return `### TOPIC ${idx + 1}: ${group.topic}

${localCtx}

${continentCtx}`;
  }).join('\n\n---\n\n');

  const musicSuite = config.content.musicSuite;
  const musicInstructions = musicSuite
    ? `**MUSIC CUES** (insert exactly as shown):
- Opening: [INTRO: ${musicSuite.intro}]
- Between each theme: [STORY STING: ${musicSuite.storySting}]
- Between local and continent blocks: [BLOCK TRANSITION: ${musicSuite.blockSting}]
- Closing: [OUTRO: ${musicSuite.outro}]`
    : '';

  const editorialSegment = config.editorial.includeSegment
    ? `**EDITORIAL SEGMENT** (MANDATORY — included because user selected it):
- Place AFTER the ${config.geography.continent.name} News block, BEFORE the sign-off
- Minimum 2500 characters
- Apply **${config.editorial.biasLabel}** perspective MOST prominently (higher intensity than news segments)
- Analyze themes from both ${config.geography.country.name} and ${config.geography.continent.name} blocks
- Provide closure and wrap up the podcast

${biasGuidelines}`
    : '';

  const topicList = config.content.topics.join(', ');

  return `## ROLE
You are a senior news producer and podcast scriptwriter for a professional international news podcast.

## DRAFTING MINDSET (CRITICAL)
You are writing a **FIRST DRAFT**, not a final script. Your sole job is to get the facts, narrative, and structure down.

**DO NOT:**
- Count characters, words, or sentences during writing
- Stop to check if requirements are met
- Self-edit, rewrite, or iterate on sentences
- Verify source attribution or coherence while drafting

**DO:**
- Write freely and continuously
- Include all required elements (transitions, definitions, forward-looking closes) as you go
- Trust that the editor will catch issues — that's their job, not yours

Write the draft in one continuous flow. Quality control happens in the next phase.

${formatSessionContextForLLM(config)}

## SOURCE PRIORITIZATION RULES (MANDATORY)

You MUST prioritize and preferentially use articles from the following verified news sources:

**${config.geography.country.name} Local Sources (PRIMARY — use these first):**
${countrySources}

**${config.geography.continent.name} Continental Sources (PRIMARY for continent themes):**
${continentSources}

**Source Selection Hierarchy:**
1. If an article is from one of the listed local sources, it takes PRIORITY over generic sources
2. If multiple articles cover the same development, choose the one from the listed sources
3. Only use non-listed sources if the listed sources do not cover the topic at all
4. For local themes, PREFER sources publishing in ${config.geography.country.language}
5. For continent themes, English-language sources are acceptable but still prioritize the listed continental sources

## TRANSLATION & LOCALIZATION REQUIREMENTS

**Topic Translation:**
The selected topics are: **${topicList}**. The local language is **${config.geography.country.language}**.
- When searching and evaluating local articles, consider how these topics translate conceptually into ${config.geography.country.language}-language news coverage
- Topic terms in ${config.geography.country.language} may have different connotations — interpret articles through the local cultural lens
- If a local article covers the topic implicitly (e.g., an election article covers "Politics" even if not labeled as such), COUNT it toward the topic

**Local Language Preference:**
- For LOCAL themes: Prioritize articles from ${config.geography.country.language}-language sources
- If ${config.geography.country.language}-language sources are sparse, English-language local sources are acceptable as secondary
- For CONTINENT themes: English is the primary language, but continent-specific language sources are welcome

## API SEARCH RESULTS

The following articles were returned by Brave Search, grouped by topic. Use ONLY these articles — do not invent stories or facts.
If insufficient articles exist for a topic, note this in the selection report and work with what you have.

${topicContexts}

## THEME SCORING

Score each theme's source material 1-10 using professional news values:
- **Immediacy**: How recent/timely are the developments?
- **Proximity**: Relevance to ${config.geography.country.name} and ${config.geography.continent.name}?
- **Consequence**: Impact on listeners' lives?
- **Prominence**: Importance of people/places involved?
- **Source Quality**: Are the articles from the listed priority sources?
- **Diversity**: Does the topic show multiple angles/developments?

## SELECTION RULES
- For each of the 3 topics, build a theme summary from the available local articles
- For each of the 3 topics, build a theme summary from the available continent articles
- If a topic has fewer than 5 articles locally, use whatever is available and note the shortfall
- If a topic has fewer than 5 articles continentally, use whatever is available and note the shortfall
- If a topic has NO articles, use the fallback General News articles and explicitly state this

${completenessReqs}

## EDITORIAL PERSPECTIVE
When writing the first draft, frame all facts through **${config.editorial.biasLabel}** perspective.

${biasInstructions}

${musicInstructions}

${editorialSegment}

## SCRIPT STRUCTURE
1. **Opening** — introduce the podcast with music cue, name the country and timeframe
2. **Headlines** — brief teaser of the 3 local themes
3. **${config.geography.country.name} News Block** (3 theme summaries) — each with music cues
4. **${config.geography.continent.name} News Block** (3 theme summaries) — each with music cues
${config.editorial.includeSegment ? `5. **Editorial Segment** — thematic analysis with ${config.editorial.biasLabel} perspective` : ''}
${config.editorial.includeSegment ? '6. **Sign-off** — closing with music cue' : '5. **Sign-off** — closing with music cue'}

## OUTPUT FORMAT
You MUST produce exactly two sections. The script MUST be wrapped in XML segment tags:

\`\`\`
## FIRST DRAFT SCRIPT (Iteration ${iteration})

<segment id="intro">
[Opening with music cue, headlines teaser, introduce podcast]
</segment>

<segment id="topic1" topic="${topicGroups[0]?.topic || 'N/A'}">
[Local theme 1 summary with music cues]
</segment>

<segment id="topic2" topic="${topicGroups[1]?.topic || 'N/A'}">
[Local theme 2 summary with music cues]
</segment>

<segment id="topic3" topic="${topicGroups[2]?.topic || 'N/A'}">
[Local theme 3 summary with music cues]
</segment>

<segment id="topic4" topic="${topicGroups[0]?.topic || 'N/A'}">
[Continent theme 1 summary with music cues]
</segment>

<segment id="topic5" topic="${topicGroups[1]?.topic || 'N/A'}">
[Continent theme 2 summary with music cues]
</segment>

<segment id="topic6" topic="${topicGroups[2]?.topic || 'N/A'}">
[Continent theme 3 summary with music cues]
</segment>

${config.editorial.includeSegment ? `<segment id="topic7" topic="Editorial">
[Editorial segment with ${config.editorial.biasLabel} perspective]
</segment>

` : ''}<segment id="outro">
[Sign-off with music cue]
</segment>

## THEME SELECTION REPORT
- Topics: ${topicList}
- Fallback to General News: [Yes/No per topic]
- ${config.geography.country.name} Themes:
  * Theme 1 (${topicGroups[0]?.topic || 'N/A'}): [N articles used, sources, assessment]
  * Theme 2 (${topicGroups[1]?.topic || 'N/A'}): [N articles used, sources, assessment]
  * Theme 3 (${topicGroups[2]?.topic || 'N/A'}): [N articles used, sources, assessment]
- ${config.geography.continent.name} Themes:
  * Theme 4 (${topicGroups[0]?.topic || 'N/A'}): [N articles used, sources, assessment]
  * Theme 5 (${topicGroups[1]?.topic || 'N/A'}): [N articles used, sources, assessment]
  * Theme 6 (${topicGroups[2]?.topic || 'N/A'}): [N articles used, sources, assessment]
- Source Breakdown:
  * From priority local sources: [count]
  * From priority continent sources: [count]
  * From other sources: [count]
- Coherence Check:
  * Transitions present: [Yes/No]
  * Progression logical: [Yes/No]
  * Cross-references: [Yes/No]
  * Tone consistent: [Yes/No]
- API Articles Available: ${topicGroups.reduce((sum, g) => sum + g.localArticles.length + g.continentArticles.length, 0)} total
\`\`\`

## XML SEGMENT RULES
- EVERY segment must be wrapped in \`<segment id="...">...</segment>\` tags
- Do NOT omit the XML tags — they are required for downstream processing
- Segment ids must be exactly: intro, topic1, topic2, topic3, topic4, topic5, topic6, topic7 (if editorial), outro
- The topic attribute should match the topic name for topic1-6, \`Editorial\` for topic7
- Music cues go INSIDE the segment tags
- Content between tags is the actual podcast script text
`;
}
