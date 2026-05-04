# AI Newsroom

**Your personal AI news producer. In your pocket.**

Choose from 37 countries supported by Brave Search. Pick three news topics, a voice, a music style, and an editorial angle. Then watch a team of AI agents research local sources, write, edit, fact-check, and produce a professional news podcast — all automatically, right on your phone.

A full newsroom in your pocket. No waiting for established media to report. Just you, your API keys, and a fully autonomous pipeline that turns raw global events into a polished, curated audio broadcast tailored exactly to your perspective.

---

## What It Does

Tired of waiting for mainstream media to cover the stories you care about? Want news curated for your interests, told in your voice, from the perspective you choose?

**AI Newsroom puts a full newsroom in your pocket.**

You configure:
- **Country** — 37 countries supported by Brave Search, with local language and native news sources
- **Timeframe** — Daily briefing, weekly review, or monthly roundup
- **Topics** — Exactly 3 from politics, economy, sport, technology, crime, and more
- **Voice** — Four distinct AI voices with personalities and preview audio
- **Music** — Custom intro, outro, stings, and transitions
- **Editorial Perspective** — From extreme left to extreme right, or dead-center moderate

Then you hit **Run Full Pipeline**. The agents go to work.

---

## The Agents

The pipeline is built around seven specialized agents. Each has a single job, and they pass work to each other like a real newsroom:

| # | Agent | What It Does | Why It Matters |
|---|---|---|---|
| 1A | **Article Researcher** | Searches Brave Search for 8 article slots (5 local + 3 continental), scores candidates with a lightweight LLM, fetches full text via 3-tier fallback, and writes `selected_articles.json` | This is where the raw information comes from. It enforces strict timeframe filtering, scores articles on Impact/Prominence/Rarity/Conflict (1–10), and collects 1 main + 1–2 backup sources per slot for multi-angle coverage |
| 1B | **Script Writer** | Reads `selected_articles.json`, uses a thinking/reasoning model to write the full script as XML-tagged segments — 8 articles + intro/outro/editorial | The creative writer. Uses main sources as the backbone and backup sources for quotes, corroboration, and alternative angles. Produces all segment files in one pass |
| 2 | **Full Script Editor** | Checks the entire script for structural completeness, cross-topic coherence, and consistent bias framing | Catches problems the Writer can't see — like a topic that contradicts another, or a bias that drifts halfway through. Acts as the executive editor |
| 3 | **Full Script Writer** | Rewrites the full script based on the Editor's feedback, preserving all topic content while fixing framing and transitions | The fixer for script-wide problems. Never touches individual topics that have already passed their own audits |
| 4 | **Segment Editor** | Audits one article at a time — checking length, sentence structure, depth, accessibility, sourcing, and geography | The line editor. Runs mechanical checks (pure code, instant) plus qualitative rules (LLM). Every article must pass before moving on |
| 5 | **Segment Writer** | Rewrites a single article when the Segment Editor rejects it, using adjacent segments for transition context | The specialist. Focuses on one article at a time, fixing exactly what the editor flagged without breaking what already works |
| 6 | **Assembler** | Pure code — reads all segment files and concatenates them into the final `full_script.txt` | The production assistant. No AI involved. Just reliable, repeatable assembly |
| 7 | **Audio Producer** | Strips XML tags, generates narration via OpenAI TTS, mixes music stings between segments, and produces a single MP3 file | The sound engineer. Handles voice synthesis, audio mixing, gap timing, and incremental MP3 encoding to keep memory usage low |

---

## The Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FULL PIPELINE FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  STEP 1A: ARTICLE RESEARCHER                    │
│  Search → Score → Fetch (3-tier fallback)       │
│  Write selected_articles.json                   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  STEP 1B: SCRIPT WRITER                         │
│  Read selected_articles.json → Write XML        │
│  segments (article1–8 + intro/outro/editorial)  │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  STEP 2: FULL SCRIPT EDITOR  (Pass 1)           │
│  Check: segments present, coherence, bias       │
└─────────────────────────────────────────────────┘
                           │
        ┌─────────────┴──────────────────────────────────┐
        │      APPROVED                      REJECTED    │
        │                                                ▼
        │                                        ┌─────────────────────────┐
        ▼                                        │  STEP 2a: FULL SCRIPT   │
   ╔════════════════════════════════════════╗    │  WRITER                 │
   ║  PARALLEL ARTICLE LOOP                 ║    │  Fix script-wide issues │
   ║  (Steps 3–3a, all articles at once)    ║    │                         │
   ║                                        ║    │  └─► back to Step 2     │
   ║  Step 3:  Segment Editor               ║    └─────────────────────────┘
   ║           (Articles 1–9 simultaneously)║
   ║           ├─ APPROVED ─► done          ║
   ║           └─ REJECTED ─► Step 3a       ║
   ║                                        ║
   ║  Step 3a: Segment Writer               ║
   ║           (per-article, eager retry)   ║
   ║           └─► back to Step 3           ║
   ║                                        ║
   ║  Round-based stall recovery:           ║
   ║  stalled articles retry together       ║
   ║  after each wave settles               ║
   ╚═════════════════╤══════════════════════╝
                     │
                     │  after all articles approved
                     ▼                            
            ┌─────────────────┐
            │  STEP 4         │
            │  ASSEMBLER      │
            │  (pure code)    │
            │  Concatenate    │
            │  all segments   │
            └─────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│  STEP 5: FULL SCRIPT EDITOR  (Pass 2)        │
│  Verify coherence & bias after rewrites      │
└──────────────────────────────────────────────┘
                      │
        ┌─────────────┴───────────────────────┐
        │      APPROVED             REJECTED  │
        ▼                                     ▼
┌─────────────────┐       ┌─────────────────────────┐
│  STEP 6         │       │  STEP 5a: FULL SCRIPT   │
│  AUDIO PRODUCER │       │  WRITER                 │
│  (agent6)       │       │  Fix script-wide issues │
│  Strip XML →    │       │                         │
│  Generate audio │       │  └─► back to Step 5     │
└─────────────────┘       │                         │
        │                 └─────────────────────────┘
        ▼
       ✅ COMPLETE               
```

---

## Pipeline in Detail

### Step 1A — Article Researcher

The Article Researcher is the entry point. It takes your session configuration and performs a multi-phase research pipeline:

1. **Bucket search**: 8 search buckets are queried via Brave Search:
   - 3 topic-specific local buckets (`{topic} {country}`)
   - 2 wildcard local buckets (`news {country}`, `breaking {country}`)
   - 3 topic-specific continent buckets (`{topic} {continent}`)
   Search terms are automatically translated into the country's primary language. The `freshness` param adjusts based on timeframe (`day`/`week`/`month`).

2. **Scoring**: A lightweight LLM scores each candidate article on Impact, Prominence, Rarity, and Conflict (1–10). The gate requires average ≥7.0 with no criterion below 6.0. Up to 2 re-fetches are attempted per failing bucket.

3. **Fetching**: Full article text is retrieved via a **3-tier fallback chain**:
   - **Tier 1**: Jina AI Reader (`r.jina.ai/http://...`) — best quality, but rate-limits aggressively
   - **Tier 2**: Direct fetch with browser headers + HTML stripping — rescues most premium sources (Guardian, BBC, AP, NYT, CNBC, Politico.eu, Spiegel, etc.)
   - **Tier 3**: Brave Search description fallback — last resort, preserves at least title/source/summary
   
   Real-world recovery rate: **89.6%** overall (Jina alone: ~30%).

4. **Selection**: Each of the 8 slots gets 1 main article (truncated to 2000 words) + 1–2 backup articles (truncated to 500 words) covering the same broad story. Backups provide quotes, corroboration, and alternative angles.

5. **Output**: Writes `selected_articles.json` to disk containing all sources with metadata (title, source, URL, word count, fetch tier, scope, topic).

### Step 1B — Script Writer

The Script Writer reads `selected_articles.json` and uses a **thinking/reasoning model** (e.g., `o3-mini`, `claude-sonnet-4-20250514`) to write the full script:

- Uses main sources as the narrative backbone
- Weaves in backup sources for quotes, corroboration, and alternative angles
- Writes XML-tagged segments: `<segment id="intro">`, `<segment id="article1">` through `<segment id="article8">`, `<segment id="editorial">` (optional), `<segment id="outro">`
- Articles 1–5 are local, articles 6–8 are continental
- Also writes `full_script.txt` — the concatenation of all segments

Every segment file is written to app-private storage via `@capacitor/filesystem` in `Directory.Data/newsroom/`. This means even if the app crashes mid-run, the files persist and can be inspected.

### Step 2 — Full Script Editor (Pass 1)

This is the first gate. The Editor reads `full_script.txt` and performs a **script-wide audit** with three checks only:

1. **Structural completeness**: All segments present (intro, topic1–7, outro), XML tags intact
2. **Cross-topic coherence**: Transitions between topics, logical progression, cross-references, tone consistency
3. **Bias consistency**: Headlines, topic order, language, source selection, and framing all align with the chosen editorial perspective

The Editor returns a binary `APPROVED` / `REJECTED` decision. If rejected, it produces `rewriter_instructions` — specific, actionable fixes. The Full Script Writer then receives these instructions and rewrites the script.

**Important**: The Full Script Writer only fixes script-wide issues. It explicitly preserves all topic segment content because those segments have not yet been individually audited. It rewrites intro, outro, transition bridges, and bias framing only.

After the Writer finishes, the draft goes **back to the Full Script Editor (Pass 1)** for re-audit. This loop repeats until the script passes.

### Step 3 — Parallel Topic Loop

After Pass 1 approves, **all topics launch simultaneously** as independent workers. Each topic runs its own edit → (if rejected) → write → re-edit loop until it passes.

The UI shows a live mini-grid of colored dots — one per topic — updating in real time.

**Per-topic flow:**

1. **Segment Editor** reads the individual `TopicN.txt` file (not `full_script.txt`)

   **Mechanical validation** (pure code, microseconds, zero LLM cost):
   - **Length**: ≥2000 characters
   - **Sentence structure**: ≥60% of sentences are 15–30 words; average >15 words
   
   Results are shown in the UI with exact counts.

   **Qualitative audit** (LLM, 5 rules):
   - **DEPTH**: ≥3 distinct developments, events, or angles
   - **ACCESSIBILITY**: Zero-knowledge listener can follow without Googling. Every term, acronym, organization defined on first mention
   - **FORWARD_CLOSE**: Ends with "what to watch" or "what happens next"
   - **SOURCE_ATTRIBUTION**: Specific sources cited by name in the text
   - **GEOGRAPHY**: Local topics = only chosen-country stories; Continental topics = only continent-country stories

   **Combined result**: mechanical PASS + ALL 5 qualitative rules PASS → APPROVED. Any failure → REJECTED → Step 3a.

2. **Segment Writer** (called only when rejected) receives **combined feedback** (mechanical data + qualitative analysis), rewrites the topic addressing all issues, then loops back to Segment Editor for re-audit.

**Stall recovery:** If an API call throws a retryable error (429 rate limit, timeout, network), that topic marks itself `stalled` and exits. After all active workers settle, a **retry wave** launches all stalled topics together. This repeats until every topic is approved or hits the max-attempts limit (5).

**Article labels:**
- Article 1: `{topic0}, {country}` (local)
- Article 2: `{topic1}, {country}` (local)
- Article 3: `{topic2}, {country}` (local)
- Article 4: `Wildcard Local 1` (local)
- Article 5: `Wildcard Local 2` (local)
- Article 6: `{topic0}, {continent}` (continental)
- Article 7: `{topic1}, {continent}` (continental)
- Article 8: `{topic2}, {continent}` (continental)
- Article 9: `Editorial` (optional)

### Step 4 — Assembler

Pure code stage — no LLM call. Reads all individual segment files (`intro.txt`, `article1.txt`–`article8.txt`, `editorial.txt`, `outro.txt`), concatenates them in order, and writes the final `full_script.txt`.

The Assembler also detects missing segments and warns if any segment file is empty.

### Step 5 — Full Script Editor (Pass 2)

Reads the assembled `full_script.txt` after all topic rewrites. Performs the same 3 script-wide checks as Pass 1. Verifies that the per-topic rewrites did not break coherence or bias consistency.

If rejected, the Full Script Writer fixes the script-wide issues while explicitly preserving all topic content. The Full Script Editor re-audits.

**The topic loop does NOT re-run** — individual topics have already passed audit. Only script-wide framing is adjusted.

If approved, the pipeline proceeds to the Audio Producer.

### Step 6 — Audio Producer

Reads all individual segment files (`intro.txt`, `Topic1-7.txt`, `outro.txt`), strips XML tags and music cue placeholders (`[INTRO: ...]`, `[STORY STING: ...]`, etc.).

**Text-to-Speech**: Calls OpenAI TTS API (`gpt-4o-mini-tts`) with the selected voice and voice-specific instructions to generate per-segment MP3s. Long segments are automatically chunked at ~3000 characters to stay within TTS limits.

**Music mixing**: Fetches music sting files (intro, story, block, outro) from `./audio/` and renders each segment through the Web Audio API — music sting → 0.5s gap → narration — ensuring music and narration never overlap.

**MP3 encoding**: Encodes to MP3 incrementally using `lamejs` and appends each segment to disk, keeping peak memory under ~26 MB regardless of podcast length.

The finished file is named dynamically (e.g. `United States Daily Report - 2026-04-27.mp3`) and written to app-private storage. A **Play Podcast** button appears in the UI when complete.

### Rejection Loops

**Full Script Editor → Full Script Writer loop (Pass 1):**
- Full Script Editor (Pass 1) checks script-wide coherence, bias consistency, and structural completeness.
- If ANY issue is found, it rejects and the Full Script Writer receives the entire script + `rewriter_instructions`, rewrites everything top-to-bottom, parses XML segments, and writes all files back.
- The draft goes **back to Full Script Editor (Pass 1)** for re-evaluation.
- **No limit** on iterations — correctness is prioritized over speed.

**Parallel Topic Loop (Segment Editor → Segment Writer):**
- After Full Script Editor (Pass 1) approves, **all topics launch simultaneously** as independent workers.
- Each topic runs: **Segment Editor → (if rejected) → Segment Writer → re-audit**. This eager loop repeats until the topic passes.
- If an API call throws a retryable error (429, timeout, network), the topic marks itself `stalled` and exits. After all active workers settle, a **retry wave** launches all stalled topics together.
- Topics never block each other. Fast topics finish immediately; slow topics get retries without holding up the pipeline.
- **Per-topic attempts capped at 5** — after 5 edit/write cycles, the topic aborts to prevent runaway API costs.

**Full Script Editor → Full Script Writer loop (Pass 2):**
- After all topics pass and the Assembler concatenates segments, the Full Script Editor runs a **second pass** to verify that the per-topic rewrites did not break script-wide coherence or bias.
- If rejected, the Full Script Writer fixes the script-wide issues while explicitly preserving all topic segment content. The Full Script Editor re-audits.
- **The topic loop does NOT re-run** — individual topics have already passed audit. Only script-wide framing is adjusted.
- If approved, the pipeline proceeds to the Audio Producer.

**Key behaviors:**
- **Rejection loops have no limit** — the pipeline prioritizes correctness over speed
- **Per-topic attempts capped at 5** — after 5 edit/write cycles, the topic aborts to prevent runaway API costs
- **API failures retry 3 times per call** — then mark topic as stalled for round-based recovery
- **Session context is ephemeral** — configuration exists only in memory for the current run; close the app and it disappears
- **Segment files persist** — Every segment is written to app-private storage. Even if the app closes mid-run, the files remain for inspection.
- **Test mode** — A "Skip Editor Loop" toggle in Configure API bypasses all editors and the assembler, routing Article Researcher → Script Writer → Audio Producer directly. Fast for testing the TTS/audio pipeline without burning API credits on editorial loops.

---

## Technical Architecture

### Frontend

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React 18 + TypeScript | UI components, state management, event handling |
| Styling | Tailwind CSS | Utility-first styling for rapid, consistent UI development |
| Maps | Leaflet + react-leaflet | Interactive country selection map with continent bounding boxes |
| Build | Vite | Fast dev server and optimized production builds |
| Notifications | `@capacitor/local-notifications` | Background pipeline progress notifications on mobile |

### Mobile

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Capacitor (Android) | Wraps the web app as a native Android APK with full hardware access |
| Storage | `@capacitor/filesystem` | App-private file I/O for segment files, full scripts, and podcast MP3s |
| Settings | `@capacitor/preferences` | Persistent key-value storage for API keys and app settings |

### Pipeline Runtime

The pipeline is orchestrated by `PipelineRunner` (`src/lib/pipeline.ts`), a state machine class that manages stage execution, retry logic, and the parallel topic loop.

**State machine:**
- Stages are defined in `STAGE_DEFINITIONS` (`src/lib/pipelineTypes.ts`)
- Each stage has: `id`, `name`, `description`, `icon`, `status`, `iteration`, `reasoning`, `output`, `prompt`, `metadata`
- The runner maintains `PipelineState` with the current stage, selected stage, stage records, draft content, and topic loop state

**Stage execution (`executeStage`):**
1. Look up the agent function from the `AgentMap`
2. Increment iteration counter
3. Set status to `running`
4. Build `AgentContext` with session config, current draft, iteration, segment loop index, and feedback
5. Call the agent with two callbacks:
   - `onReasoningChunk`: Appends to the stage's reasoning stream (displayed in real-time UI)
   - `onUpdate`: Partial updates to the stage record (prompt, output, metadata)
6. Agent returns `AgentOutput` with `draft`, `reasoning`, `prompt`, and `metadata`
7. Infer status from metadata (e.g., `approval_status === 'REJECTED'` → `rejected`)
8. Update stage record with final status, output, prompt, metadata, and completion time
9. **Retry logic**: If the agent throws, retry up to 3 times with exponential backoff (1s, 2s, 3s). User abort is not retried.

**Stage routing (`getNextStage`):**
- `articleResearch` → `scriptWriter`
- `scriptWriter` → `fullScriptEditor` (or `agent6` in test mode)
- `fullScriptEditor` (rejected) → `fullScriptWriter` → back to `fullScriptEditor`
- `fullScriptEditor` (approved, first pass) → triggers parallel article loop → `assembler`
- `fullScriptEditor` (approved, second pass) → `agent6`
- `assembler` → `fullScriptEditor` (second pass)
- `agent6` → `COMPLETE`

**Parallel article loop (`runParallelTopicLoop`):**
1. Creates `TopicStatus` array with 8 or 9 articles (9 if editorial segment enabled)
2. **Phase 1 — Eager launch**: Creates a worker Promise for each article via `runTopicWorker`, then `Promise.allSettled`
3. **Phase 2 — Round-based retry**: While stalled articles exist, increment wave number, reset stalled articles to `pending`, and relaunch workers
4. Each `runTopicWorker` runs an infinite loop:
   - Check max attempts (5)
   - Run `segmentEditor` → if approved, return. If rejected, run `segmentWriter` → loop back
   - Retryable errors (429, timeout, network) mark article as `stalled` and exit worker
5. Article updates are batched via a 50ms debounce timer to prevent UI thrashing

### Agents

All agents implement the `AgentFn` interface:

```typescript
type AgentFn = (
  ctx: AgentContext,
  onReasoningChunk: (chunk: string) => void,
  onUpdate?: (partial: Partial<StageRecord>) => void
) => Promise<AgentOutput>;
```

**Agent 1A — Article Researcher (`src/agents/articleResearcher.ts`)**
- Queries Brave Search for 8 article buckets (3 topic locals + 2 wildcard locals + 3 topic continents)
- Scores candidates with lightweight LLM via `callLLM` with `lightweightModel` override
- Fetches full text via `fetchArticle` (`src/lib/articleFetcher.ts`) with 3-tier fallback
- Gates on avg≥7.0, min≥6.0; up to 2 re-fetches per failing bucket
- Writes `selected_articles.json` via `writeSelectedArticles` (`src/lib/fileManager.ts`)
- Metadata includes: article count, selected articles list with scope/topic/tier/wordCount

**Agent 1B — Script Writer (`src/agents/scriptWriter.ts`)**
- Reads `selected_articles.json` from disk via `readSelectedArticles`
- Uses thinking/reasoning model via `streamLLM` with `thinkingModel` override
- Builds prompt via `buildScriptWriterPrompt` (`src/prompts/scriptWriter.ts`)
- Parses XML segments via `parseFullScript` (`src/lib/scriptParser.ts`)
- Writes segments to disk via `writeSegment` / `writeFullScript`
- Metadata includes: segment count, total length, segment names

**Agent 2 — Full Script Editor (`src/agents/fullScriptEditor.ts`)**
- Reads `full_script.txt` from disk
- Builds prompt via `buildFullScriptEditorPrompt`
- Streams LLM response
- Parses structured audit via `parseFullScriptEditorOutput`
- Returns `AuditResult` with `approval_status`, `has_feedback`, `rewriter_instructions`
- Does NOT modify the draft — passes it through unchanged

**Agent 3 — Full Script Writer (`src/agents/fullScriptWriter.ts`)**
- Extracts `rewriter_instructions` from editor feedback
- Builds prompt via `buildFullScriptWriterPrompt`
- Streams LLM response
- Parses XML segments, clears old segments, writes new ones
- Reassembles `full_script.txt`

**Agent 4 — Segment Editor (`src/agents/segmentEditor.ts`)**
- Reads target segment from disk via `readSegment`
- Runs mechanical validation via `validateMechanical` (`src/lib/mechanicalValidator.ts`)
- Builds prompt with mechanical results included
- Streams LLM for qualitative audit
- Combines mechanical + qualitative into overall APPROVED/REJECTED
- Returns combined result with `rewrite_scope: 'SEGMENTS'` and `failed_segments`

**Agent 5 — Segment Writer (`src/agents/segmentWriter.ts`)**
- Reads all segments for context
- Builds context map with target segment + adjacent segments (for transition awareness)
- LLM rewrite loop with internal mechanical validation:
  - After each LLM output, runs `validateMechanical`
  - If mechanical fails, builds corrective prompt with exact failure data
  - Retries up to 3 times for mechanical corrections
- Writes final segment back to disk
- Reassembles `full_script.txt`

**Agent 6 — Audio Producer (`src/agents/audioProducer.ts`)**
- Loads all segments from disk
- Loads TTS API key
- Calls `producePodcast` (`src/lib/audioAssembler.ts`) which:
  - Strips XML tags and music cues
  - Chunks text for TTS (~3000 chars per chunk)
  - Calls OpenAI TTS API (`gpt-4o-mini-tts`) per chunk
  - Decodes MP3s via Web Audio API
  - Fetches music stings and decodes them
  - Mixes: music sting → 0.5s silence → narration
  - Encodes to MP3 via `lamejs` incrementally
  - Appends each segment to disk via `appendAudioChunk`
- Returns podcast file name, duration, segment count

### LLM Adapter

`src/lib/llmAdapter.ts` provides model-independent LLM communication.

**`buildLlmBody(model, messages, options)`** constructs the request body:
- Accepts an explicit `model` parameter — enables per-call model overrides
- Sends `max_completion_tokens` by default (OpenAI newer standard)
- Sends `thinking: {type: 'enabled'}` for Anthropic models
- Sends `reasoning_effort: 'medium'` for OpenAI reasoning models (gpt-5*, o*)
- Thinking parameter is model-family-aware based on model name detection

**Model configuration** (`ConfigureApiScreen`):
- **Main Model**: Default model for most agents
- **Lightweight Model**: Fast/cheap model for Article Researcher scoring (e.g., `gpt-4o-mini`, `claude-3-haiku`)
- **Thinking Model**: Reasoning model for Script Writer and Editors (e.g., `o3-mini`, `claude-sonnet-4-20250514`)

**`fetchWithAdaptiveRetry(url, headers, body, maxRetries=2)`** sends the request and handles errors:
- On 4xx error, extracts error message and attempts to fix the body
- Fixes include: renaming `max_tokens` ↔ `max_completion_tokens`, stripping unsupported parameters (`temperature`, `top_p`, `thinking`, `reasoning_effort`, `frequency_penalty`, `presence_penalty`)
- Also catches "too large" token errors, parses the model's limit from the error message, and caps the value automatically
- Retries up to 2 times with corrected body
- Non-4xx errors (5xx, network) are thrown immediately

**`streamLLM(config, prompt, callbacks)`** handles SSE streaming:
- Sends POST to `/chat/completions` with `stream: true`
- Parses SSE chunks, extracting `delta.content` and `delta.reasoning_content`
- Calls `onReasoningChunk` for reasoning tokens, `onContentChunk` for content tokens
- Handles stream errors and completion

### News Search & Article Fetching

`src/lib/newsSearch.ts` wraps the Brave Search API.

**`searchTopicLocal(params)`**: Searches for `"{topic} {countryName}"` with country-specific result filtering.
**`searchTopicContinent(params)`**: Searches for `"{topic} {continentName}"` without country filtering.

Both use freshness filtering (`day`/`week`/`month`) and return up to 10 articles with title, description, source, URL, and published date.

`src/lib/articleFetcher.ts` provides **3-tier article fetching**:

1. **Jina AI Reader** (`r.jina.ai/http://...`) — highest quality full-text extraction, but returns HTTP 429 under rapid-fire calls. A 500ms delay is inserted between Jina requests.
2. **Direct fetch** — browser headers + HTML tag stripping. Rescues most premium sources (Guardian, BBC, AP, NYT, CNBC, Politico.eu, Spiegel). Hard blocks remain for `politico.com` and `reuters.com` (401/403).
3. **Brave description fallback** — uses the search result description as a last resort.

`truncateToWords(text, maxWords)` performs smart truncation at sentence boundaries.

A fallback chain handles search errors:
1. Primary search with translated topic term
2. Fallback to English topic term
3. Fallback to generic "news {country}"

### File Management

`src/lib/fileManager.ts` provides app-private file I/O via `@capacitor/filesystem`.

**Segments**: `intro.txt`, `article1.txt`–`article8.txt`, `editorial.txt`, `outro.txt` — stored in `Directory.Data/newsroom/`
**Selected articles**: `selected_articles.json` — main + backup sources per article slot
**Full script**: `full_script.txt` — same directory
**Podcast**: `{Country} {Timeframe} Report - {YYYY-MM-DD}.mp3` — same directory

All writes use `recursive: true` to ensure directory creation. Reads return empty string on failure (non-fatal for reads).

### Mechanical Validator

`src/lib/mechanicalValidator.ts` runs pure-code validation on segment content:

- **Length check**: `content.length >= 2000`
- **Sentence structure**: Splits on `.!?`, counts words per sentence, checks:
  - Average words per sentence > 15
  - ≥60% of sentences are 15–30 words

Returns `MechanicalResult` with pass/fail flags and exact counts. Used by both Segment Editor (audit) and Segment Writer (internal correction loop).

### Session Configuration

`src/lib/sessionConfig.ts` builds the `SessionConfig` object that is passed to every agent. It contains:

- **Meta**: generation timestamp, version
- **Dates**: today, earliest date (based on timeframe), days back, timeframe label
- **Geography**: country (name, code, language, news sources), continent (name, code, news sources with languages)
- **Content**: topics (3), voice (id, label, gender, accent), music suite (intro, outro, story sting, block sting)
- **Editorial**: bias position (extreme-left to extreme-right), include editorial segment flag

This config is computed once at pipeline start and never changes during the run. All agents read from it.

### Prompt Architecture

Prompts are built in `src/prompts/` as TypeScript functions that assemble strings from session config and requirements. There is no runtime template engine — just string concatenation.

**`src/prompts/shared/completenessRequirements.ts`** contains the golden rules:
- Minimum 2000 characters per topic summary
- At least 3 distinct developments, events, or angles per topic
- 60%+ of sentences between 15–30 words
- All local terms defined on first mention
- Zero-knowledge assumption
- Continent-specific angles for continental news
- Cross-topic coherence
- Source attribution by name
- Forward-looking close

Each agent prompt imports these requirements and embeds them verbatim. This ensures all agents work from the same rulebook.

---

## Project Structure

```
├── ai-newsroom/              # Static assets & public files
│   ├── assets/               # Image & media assets
│   ├── audio/                # Podcast audio previews & music samples
│   │   ├── voices/             # OpenAI TTS voice previews (.wav)
│   │   │   ├── onyx.wav
│   │   │   ├── fable.wav
│   │   │   ├── nova.wav
│   │   │   └── coral.wav
│   │   ├── intro_*.mp3         # Intro music stings
│   │   ├── outro_*.mp3         # Outro music stings
│   │   ├── story_*.mp3         # Story transition stings
│   │   └── block_*.mp3         # Block transition stings
│   ├── index.html            # Static HTML fallback
│   └── logo.png              # Application logo
├── android/                  # Capacitor Android project
│   ├── app/                  # Android app module
│   ├── build.gradle          # Root Gradle build file
│   └── ...
├── src/
│   ├── agents/               # Agent implementations
│   │   ├── agent1.ts              # News Researcher — Brave Search + LLM, writes XML segments
│   │   ├── agent1Parse.ts         # Output parser for Agent 1
│   │   ├── fullScriptWriter.ts    # Full Script Writer — script-wide rewrites
│   │   ├── fullScriptEditor.ts    # Full Script Editor — script-wide audit gate
│   │   ├── fullScriptEditorParse.ts  # JSON parser for audit results
│   │   ├── segmentWriter.ts       # Segment Writer — per-topic targeted rewrites
│   │   ├── segmentEditor.ts       # Segment Editor — per-topic audit gate
│   │   ├── assembler.ts           # Assembler — pure code concatenation
│   │   ├── audioProducer.ts       # Audio Producer — TTS + audio mixing
│   │   ├── stubs/                 # Stub agents for testing
│   │   │   ├── agent3Stub.ts
│   │   │   └── agent6Stub.ts
│   │   └── index.ts               # Agent map factory
│   ├── components/           # React UI components
│   │   ├── pipeline/         # Pipeline UI components
│   │   │   ├── PipelinePanel.tsx    # Main pipeline container
│   │   │   ├── StageDetail.tsx      # Expanded stage view (tabs, reasoning, prompt, audit)
│   │   │   └── StageStrip.tsx       # Vertical stage list with status dots
│   │   ├── BiasSelector.tsx
│   │   ├── ConfigureApiScreen.tsx   # API configuration screen
│   │   ├── CountryMap.tsx           # Leaflet map for country selection
│   │   ├── CountrySearch.tsx        # Searchable country dropdown
│   │   ├── NewsroomScreen.tsx       # Main newsroom configuration screen
│   │   └── ScreenTabs.tsx           # Tab navigation (Newsroom / Configure)
│   ├── data/                 # Static data & configuration
│   │   ├── bias.ts                  # Bias options and editorial instructions
│   │   ├── countries.ts             # Full country dataset (195); 37 are Brave Search supported
│   │   ├── countryBounds.ts         # Map bounding boxes per continent
│   │   ├── music.ts                 # Music styles, suites, file mappings
│   │   ├── timeframes.ts            # Daily / weekly / monthly configs
│   │   ├── topics.ts                # Topic taxonomy with multi-language search terms
│   │   └── voices.ts                # Voice configs with instructions and previews
│   ├── lib/                  # Core logic
│   │   ├── apiConfig.ts             # API persistence, LLM calls, SSE streaming, test connection
│   │   ├── audioAssembler.ts        # TTS generation, Web Audio mixing, MP3 encoding
│   │   ├── fileManager.ts           # File I/O via @capacitor/filesystem
│   │   ├── llmAdapter.ts            # Model-independent LLM request builder with adaptive retry
│   │   ├── mechanicalValidator.ts   # Pure-code segment validation (length, sentences)
│   │   ├── mp3Encoder.ts            # lamejs MP3 encoding wrapper
│   │   ├── newsSearch.ts            # Brave Search API wrapper with fallback chain
│   │   ├── pipeline.ts              # PipelineRunner state machine
│   │   ├── pipelineNotifications.ts # Capacitor local notifications for background progress
│   │   ├── pipelineService.ts       # Capacitor background service bindings
│   │   ├── pipelineTypes.ts         # Pipeline type definitions
│   │   ├── scriptParser.ts          # XML segment parser, assembler, tag stripper
│   │   ├── sessionConfig.ts         # SessionConfig builder & formatter
│   │   └── utils.ts                 # Utility helpers (cn from tailwind-merge + clsx)
│   ├── prompts/              # Prompt builders
│   │   ├── agent1.ts                # Researcher prompt
│   │   ├── fullScriptWriter.ts      # Full Script Writer prompt
│   │   ├── fullScriptEditor.ts      # Full Script Editor prompt
│   │   ├── segmentWriter.ts         # Segment Writer prompt
│   │   ├── segmentEditor.ts         # Segment Editor prompt
│   │   └── shared/                  # Shared prompt building blocks
│   │       └── completenessRequirements.ts
│   ├── App.tsx               # Main app component with tab router
│   ├── index.css             # Global styles + Tailwind directives
│   ├── main.tsx              # React root render
│   └── types.ts              # Shared TypeScript interfaces
├── .github/workflows/
│   └── build-android.yml     # GitHub Actions APK build workflow
├── capacitor.config.ts       # Capacitor configuration
├── index.html                # Vite entry HTML
├── package.json              # Dependencies & scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite build configuration
```

---

## Download

1. Go to the **Actions** tab in this GitHub repository
2. Select the **Build Android APK** workflow
3. Open the latest successful run on the `AI-Newsroom-Full-App` branch
4. Download the **`ai-newsroom-full-app-debug`** artifact
5. Extract the ZIP and install `app-debug.apk` on your Android device
   - You may need to enable **Install from unknown sources**

---

## Usage

1. **Configure your APIs** — Go to Configure API, add your LLM provider key, Brave Search API key, and OpenAI TTS key. Save and test all three.
2. **Configure your podcast** — Go to Newsroom, pick a country, timeframe, **exactly 3 topics**, voice, music, and editorial angle.
3. **Run Full Pipeline** — Tap the button and watch the agents work.
4. **Inspect stages** — Tap any stage card to see reasoning, the full LLM prompt, the first draft, the structured audit, and output.

---

## Repository

https://github.com/atavist89-max/Ai-newsroom
