import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { searchTopicLocal, searchTopicContinent } from '../lib/newsSearch';
import { buildAgent1Prompt, type TopicArticleGroup } from '../prompts/agent1';
import { parseAgent1Output } from './agent1Parse';
import { getTopicSearchTerm } from '../data/topics';

function getFreshness(timeframeId: string): string {
  switch (timeframeId) {
    case 'daily': return 'day';
    case 'weekly': return 'week';
    case 'monthly': return 'month';
    default: return 'week';
  }
}

export function createAgent1(): AgentFn {
  return async (ctx, onReasoningChunk, onUpdate) => {
    const { sessionConfig } = ctx;
    const country = sessionConfig.geography.country;
    const continent = sessionConfig.geography.continent;
    const topics = sessionConfig.content.topics;
    const freshness = getFreshness(sessionConfig.dates.timeframeId);

    // We need exactly 3 topics
    if (topics.length !== 3) {
      throw new Error(`Exactly 3 topics are required. Got: ${topics.length}`);
    }

    const topicGroups: TopicArticleGroup[] = [];

    // STEP 1: Search local and continent news for each topic
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      const topicTerm = getTopicSearchTerm(topic, country.language);

      onReasoningChunk(`Searching local news for Topic ${i + 1}: ${topic} (${topicTerm})...\n`);

      const localArticles = await searchTopicLocal({
        countryCode: country.code,
        countryName: country.name,
        topicQuery: topicTerm,
        freshness,
        pageSize: 10,
      });

      onReasoningChunk(`  Found ${localArticles.length} local articles.\n`);

      onReasoningChunk(`Searching continent news for Topic ${i + 1}: ${topic}...\n`);

      const continentArticles = await searchTopicContinent({
        continentName: continent.name,
        topicQuery: topicTerm,
        freshness,
        pageSize: 10,
      });

      onReasoningChunk(`  Found ${continentArticles.length} continent articles.\n`);

      topicGroups.push({
        topic,
        localArticles,
        continentArticles,
      });
    }

    const totalLocal = topicGroups.reduce((sum, g) => sum + g.localArticles.length, 0);
    const totalContinent = topicGroups.reduce((sum, g) => sum + g.continentArticles.length, 0);

    onReasoningChunk(
      `Total: ${totalLocal} local articles, ${totalContinent} continent articles across ${topics.length} topics.\n`
    );

    // STEP 2: Build prompt
    onReasoningChunk('Building prompt with session context and requirements...\n');
    const prompt = buildAgent1Prompt(sessionConfig, topicGroups, ctx.iteration);

    // Publish articles and prompt to UI before LLM call so user can inspect them
    onUpdate?.({
      prompt,
      metadata: {
        topicGroups: topicGroups.map(g => ({
          topic: g.topic,
          localCount: g.localArticles.length,
          continentCount: g.continentArticles.length,
          localArticles: g.localArticles.slice(0, 10).map(a => ({ title: a.title, source: a.source, url: a.url })),
          continentArticles: g.continentArticles.slice(0, 10).map(a => ({ title: a.title, source: a.source, url: a.url })),
        })),
      },
    });

    // STEP 3: Stream to LLM
    onReasoningChunk('Sending to LLM for first draft generation...\n');

    let draft = '';
    let reasoning = '';
    const apiConfig = await loadApiConfig();

    const { diagnostics } = await streamLLM(apiConfig, prompt, {
      onReasoningChunk: (chunk) => {
        reasoning += chunk;
        onReasoningChunk(chunk);
      },
      onContentChunk: (chunk) => {
        draft += chunk;
        // Stream draft content to reasoning so user sees real-time progress
        // (most LLMs don't emit reasoning_content, so this gives visual feedback)
        onReasoningChunk(chunk);
      },
      onError: (err) => {
        throw err;
      },
      onDone: () => {
        onReasoningChunk('\nDraft generation complete.\n');
      },
    });

    // STEP 4: Parse output
    onReasoningChunk('Parsing output...\n');
    const parsed = parseAgent1Output(draft);

    return {
      draft,
      reasoning,
      prompt,
      metadata: {
        firstDraft: parsed.draftScript,
        selectionReport: parsed.selectionReport,
        localArticlesFound: totalLocal,
        continentArticlesFound: totalContinent,
        topicGroups: topicGroups.map(g => ({
          topic: g.topic,
          localCount: g.localArticles.length,
          continentCount: g.continentArticles.length,
          localArticles: g.localArticles.slice(0, 10).map(a => ({ title: a.title, source: a.source, url: a.url })),
          continentArticles: g.continentArticles.slice(0, 10).map(a => ({ title: a.title, source: a.source, url: a.url })),
        })),
        sourcesUsed: parsed.sources,
        fallbackUsed: parsed.fallbackUsed,
        streamDiagnostics: diagnostics,
      },
    };
  };
}
