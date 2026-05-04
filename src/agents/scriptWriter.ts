import type { AgentFn } from '../lib/pipelineTypes';
import { loadApiConfig, streamLLM } from '../lib/apiConfig';
import { buildScriptWriterPrompt } from '../prompts/scriptWriter';
import { readSelectedArticles, writeSegment, writeFullScript } from '../lib/fileManager';
import { parseFullScript, assembleFullScript } from '../lib/scriptParser';

export function createScriptWriter(): AgentFn {
  return async (ctx, onReasoningChunk, _onUpdate) => {
    const { sessionConfig } = ctx;

    onReasoningChunk('Reading selected articles from disk...\n');
    const articles = await readSelectedArticles();

    const articleCount = Object.keys(articles).length;
    if (articleCount === 0) {
      throw new Error('No selected articles found. Run Article Researcher first.');
    }

    onReasoningChunk(`Loaded ${articleCount} article slots.\n`);

    // Build prompt
    onReasoningChunk('Building script writer prompt...\n');
    const prompt = buildScriptWriterPrompt(sessionConfig, articles, ctx.iteration);

    _onUpdate?.({ prompt });

    // Stream to thinking model
    onReasoningChunk('Sending to thinking model for script generation...\n');

    let draft = '';
    let reasoning = '';
    const apiConfig = await loadApiConfig();

    const { diagnostics } = await streamLLM(apiConfig.thinking, prompt, {
      onReasoningChunk: (chunk) => {
        reasoning += chunk;
        onReasoningChunk(chunk);
      },
      onContentChunk: (chunk) => {
        draft += chunk;
        onReasoningChunk(chunk);
      },
      onError: (err) => {
        throw err;
      },
      onDone: () => {
        onReasoningChunk('\nDraft generation complete.\n');
      },
    });

    // Parse output
    onReasoningChunk('Parsing output...\n');
    const segments = parseFullScript(draft);

    if (segments.length > 0) {
      for (const seg of segments) {
        await writeSegment(seg.id, seg.content);
        onReasoningChunk(`  Wrote ${seg.id}.txt (${seg.content.length} chars)\n`);
      }

      const fullScript = assembleFullScript(segments);
      await writeFullScript(fullScript);
      onReasoningChunk(`  Wrote full_script.txt (${fullScript.length} chars)\n`);
    } else {
      onReasoningChunk('  No XML segments found — writing draft as single block\n');
      await writeFullScript(draft);
    }

    return {
      draft,
      reasoning,
      prompt,
      metadata: {
        segmentsWritten: segments.length,
        articleCount,
        streamDiagnostics: diagnostics,
      },
    };
  };
}
