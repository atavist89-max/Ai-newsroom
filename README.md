# AI Newsroom

**Your personal AI news producer. In your pocket.**

Pick any country on Earth. Select three news topics, how you want them told, and who you want telling it. Then watch a team of six AI agents research local sources, synthesize themes, edit them, fact-check every claim, and polish the final script — all in real time, right on your phone.

No newsroom. No subscription. No backend. Just you, your API keys, and a fully autonomous pipeline that turns raw global events into a professional news podcast tailored exactly to your perspective.

---

## What It Does

Imagine waking up in Berlin and wanting to know what's happening in Nairobi — but not from a Western lens, and not from sanitized headlines. You want the local perspective, translated and contextualized for an international audience, delivered by a voice you chose, with the editorial angle you prefer.

**AI Newsroom makes that happen in under 5 minutes.**

You configure:
- **Country** — 195 countries with local language and native news sources
- **Timeframe** — Daily briefing, weekly review, or monthly roundup
- **Topics** — Exactly 3 from politics, economy, sport, technology, crime, and more
- **Voice** — Professional narrators with distinct accents and personalities
- **Music** — Custom intro, outro, stings, and transitions
- **Editorial Perspective** — From extreme left to extreme right, or dead-center moderate

Then you hit **Run Full Pipeline**. Seven AI agents go to work:

| # | Agent | Status | What It Does |
|---|---|---|---|
| 1 | **Researcher** | ✅ Real | Queries Brave Search for local + continent news across your 3 topics, writes the first draft as XML segments (`intro.txt`, `Topic1-6.txt`, `outro.txt`) with music cues and editorial framing |
| 2 | **Full Script Editor** | ✅ Real | Checks script-wide coherence, bias consistency, and structural completeness (all segments present). Binary pass/fail — no per-theme audit. Runs twice: once after Researcher, once after Assembler. |
| 3 | **Full Script Writer** | ✅ Real | Receives script-wide feedback, fixes ONLY coherence/bias/structural issues. Explicitly preserves all topic segment content (which has already passed individual audit). Rewrites intro, outro, transitions, and bias framing only. |
| 4 | **Segment Writer** | ✅ Real | Called ONLY when a topic fails Segment Editor audit. Rewrites one topic at a time. Reads target segment + adjacent segments for transition context. |
| 5 | **Segment Editor** | ✅ Real | Audits one topic at a time in the sequential topic loop (starts first — topics already exist from Researcher). Evaluates only the 7 topic-level requirements. Reads the individual `topicN.txt` file, NOT `full_script.txt`. |
| 6 | **Assembler** | ✅ Real | Pure code stage — concatenates all segment files into `full_script.txt`. Routes to Full Script Editor for second-pass coherence/bias verification. |
| 7 | **Audio Producer** | ⏳ Stub | Strips XML tags, generates narration with the selected voice, mixes music stings, and assembles the final MP3 |

Each agent streams its reasoning in real time. You can tap any stage to see exactly what it's thinking, the **full prompt** that was sent to the LLM, the **first draft** (for the Researcher), and the **structured audit** (for Editors). If an editor rejects a theme, you see the specific rule that failed and why — the writer gets that feedback, fixes it, and resubmits. The pipeline loops until everything passes.

**This is not a chatbot. This is a production pipeline.**

---

## The Pipeline

The AI Newsroom pipeline is a state machine that orchestrates seven specialized agents. It runs fully automatically, handles rejection loops without limits, retries failed API calls up to 3 times before aborting, and writes every segment to individual files via `@capacitor/filesystem`.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FULL PIPELINE FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│  STEP 1: RESEARCHER                         │
│  Query news → Write draft segments          │
└─────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────┐
│  STEP 2: FULL SCRIPT EDITOR  (Pass 1)       │
│  Check: segments present, coherence, bias   │
└─────────────────────────────────────────────┘
                           │
        ┌─────────────┴──────────────────────────────────┐
        │      APPROVED                      REJECTED    │
        ▼                                                ▼
┌───────────────┐                             ┌─────────────────────────┐
│               │                             │  STEP 2a: FULL SCRIPT   │
│  ╔════════════╧══════════════════════════╗  │  WRITER                 │
│  ║  TOPIC LOOP (Steps 3–9a)              ║  │  Fix script-wide issues │
│  ║                                       ║  │                         │
│  ║  Step 3:  Segment Editor              ║  │  └─► back to Step 2     │
│  ║           (Topic N)                   ║  └─────────────────────────┘
│  ║           ├─ APPROVED ─► next topic   ║    
│  ║           └─ REJECTED ─► Step 3a      ║   
│  ║                                       ║           
│  ║  Step 3a: Segment Writer              ║
│  ║           (Topic N)                   ║ 
│  ║           └─► back to Step 3          ║  
│  ║                                       ║ 
│  ║  Repeats for N = 1 → 7                ║
│  ╚═════════════════╤═════════════════════╝ 
│                    │                             
│                    └─► after Topic 7 approved ──
│                                                ▼
┌─────────────────┐           ┌─────────────────────────┐
│  STEP 10        │           │  STEP 3a–9a: SEGMENT    │
│  ASSEMBLER      │           │  WRITER (Topic N)       │
│  (pure code)    │           │  Rewrite failing topic  │
│  Concatenate    │           │  only, preserve rest    │
│  all TopicN.txt │           │                         │
└─────────────────┘           │  └─► back to Step 3     │
        │                     └─────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────┐
│  STEP 11: FULL SCRIPT EDITOR  (Pass 2)       │
│  Verify coherence & bias after rewrites      │
└──────────────────────────────────────────────┘
                      │
        ┌─────────────┴───────────────────────┐
        │      APPROVED             REJECTED  │      
        ▼                                     ▼
┌─────────────────┐       ┌─────────────────────────┐
│  STEP 12        │       │  STEP 11a: FULL SCRIPT  │
│  AUDIO PRODUCER │       │  WRITER                 │
│  (agent6)       │       │  Fix script-wide issues │
│  Strip XML →    │       │                         │
│  Generate audio │       │  └─► back to Step 11    │
└─────────────────┘       │                         │
        │                 └─────────────────────────┘
        ▼                       
       ✅ COMPLETE               
```

### Step-by-Step Breakdown

**Step 1 — Researcher**
Queries Brave Search for local and continent news across your 3 selected topics. Streams results to the LLM and writes the first draft as XML-tagged segments: `intro.txt`, `Topic1.txt` through `Topic7.txt`, and `outro.txt`. Also writes the assembled `full_script.txt`.

**Step 2 — Full Script Editor (Pass 1)**
Reads `full_script.txt` and performs a script-wide audit. Checks three things only: (1) all segments are present and XML tags are intact, (2) cross-theme coherence (transitions, progression, cross-references, tone), and (3) bias consistency across the entire script. Returns a binary pass/fail — no per-topic breakdown.

**Step 2a — Full Script Writer (loop on Step 2)**
Called only when Pass 1 rejects. Receives script-wide feedback and fixes ONLY coherence, bias, and structural issues. Explicitly preserves all topic segment content (those have not yet been individually audited). Rewrites intro, outro, transition bridges, and bias framing. Loops back to Step 2 for re-audit.

**Step 3 — Segment Editor (Topic N)**
Reads the individual `TopicN.txt` file (NOT `full_script.txt`).

1. **Mechanical validation** (pure code, microseconds): checks length (≥2000 chars) and sentence structure (avg >15, ≥60% in 15-30 range) automatically. Results shown in the UI with exact counts.
2. **Qualitative audit** (LLM, 5 rules): DEPTH, ACCESSIBILITY, FORWARD_CLOSE, SOURCE_ATTRIBUTION, GEOGRAPHY.
3. **Combined result**: mechanical PASS + qualitative PASS → APPROVED → next topic. Any failure → REJECTED → Step 3a.

**Step 3a — Segment Writer (Topic N)**
Called only when the Segment Editor rejects a topic. Receives **combined feedback** (mechanical data + qualitative analysis).

1. LLM rewrites the topic addressing ALL issues.
2. **Internal mechanical loop**: after LLM output, pure code validates length and sentence structure. If mechanical check fails, the writer builds a corrective prompt with exact failure data and calls the LLM again (max 3 retries).
3. Writes the final `TopicN.txt` back to disk and reassembles `full_script.txt`.
4. Loops back to Step 3 for the same topic.

**Steps 4–9 / 4a–9a — Repeat Steps 3–3a for Topics 2–7**
The sequential topic loop advances one topic at a time. Each topic is audited first; only failing topics trigger a writer. The loop continues until all 7 topics pass.

**Step 10 — Assembler**
Pure code stage — no LLM call. Reads all individual `TopicN.txt` files, concatenates them in order (intro → topic1–7 → outro), and writes the final `full_script.txt`.

**Step 11 — Full Script Editor (Pass 2)**
Reads the assembled `full_script.txt` after all topic rewrites. Performs the same 3 script-wide checks as Pass 1. Verifies that the per-topic rewrites did not break coherence or bias consistency.

**Step 11a — Full Script Writer (loop on Step 11)**
Called only when Pass 2 rejects. Same constraints as Step 2a — fixes script-wide issues only, preserves all topic content. Loops back to Step 11 for re-audit. After Pass 2 approves, the pipeline proceeds directly to Audio Producer — the topic loop does NOT re-run.

**Step 12 — Audio Producer**
Strips XML tags from `full_script.txt` for TTS. Generates narration with the selected voice, mixes music stings and transitions, and assembles the final audio file. Pipeline complete.

### Rejection Loops

**Full Script Editor → Full Script Writer loop (Pass 1):**
- Full Script Editor (Pass 1) checks script-wide coherence, bias consistency, and structural completeness (all segments present, XML tags intact).
- If ANY issue is found, it rejects and the Full Script Writer receives the entire script + `rewriter_instructions`, rewrites everything top-to-bottom, parses XML segments, and writes all files back.
- The draft goes **back to Full Script Editor (Pass 1)** for re-evaluation.

**Sequential Topic Loop (Segment Editor → Segment Writer):**
- After Full Script Editor (Pass 1) approves, the pipeline enters a sequential per-topic loop: topic 1 → topic 2 → ... → topic 7.
- For each topic, the **Segment Editor runs first** — it reads the individual `topicN.txt` file (NOT `full_script.txt`) and audits it against the 7 topic-level rules.
- If the topic **passes**, the loop advances to the **next topic** — no writer is called.
- If the topic **fails**, the Segment Writer is called. It reads the target segment + adjacent segments for transition context, rewrites only that segment, and writes it back.
- The Segment Editor then **re-audits the same topic**. If it passes, the loop advances. If it still fails, the loop stays on the same topic.

**Full Script Editor → Full Script Writer loop (Pass 2):**
- After all topics pass and the Assembler concatenates segments, the Full Script Editor runs a **second pass** to verify that the per-topic rewrites did not break script-wide coherence or bias.
- If rejected, the Full Script Writer fixes the script-wide issues while explicitly preserving all topic segment content. The Full Script Editor re-audits. If approved, the **entire topic loop re-runs from topic 1** (Option A — full re-loop for safety).
- If approved, the pipeline proceeds to the Audio Producer.

All loops are **unbounded** — the pipeline prioritizes correctness over speed.

**Key behaviors:**
- **Rejection loops have no limit** — the pipeline prioritizes correctness over speed
- **API failures retry 3 times** — then abort with a clear error
- **Session context is ephemeral** — configuration exists only in memory for the current run; close the app and it disappears
- **Segment files persist** — Every segment is written to `Directory.Data/newsroom/` via `@capacitor/filesystem`. Even if the app closes mid-run, the files remain for inspection.

### Editor Approval Rules

**Full Script Editor** (script-wide audit — runs twice):

Checks:
- **Structural completeness**: All segments present (intro, topic1–7, outro), XML tags intact
- **Coherence**: Transitions between themes, logical progression, cross-references, tone consistency
- **Bias consistency**: Headlines, theme order, language, source selection, framing all align with chosen perspective

Approval:
- `approval_status`: `"APPROVED"`, `has_feedback`: `false`
- `rewriter_instructions`: `"All requirements passed. No changes needed."`

Rejection:
- `approval_status`: `"REJECTED"`, `has_feedback`: `true`
- `rewriter_instructions`: Specific, actionable fixes for script-wide issues

**Segment Editor** (topic-level audit — runs once per topic in sequential loop):

First, a **pure-code mechanical validator** runs automatically (microseconds, zero LLM cost):
- **Length**: ≥2000 characters
- **Sentence structure**: ≥60% of sentences are 15–30 words; average >15 words

Then the **LLM evaluates 5 qualitative rules only**:

| # | Rule | PASS Standard |
|---|---|---|
| 1 | **Depth** | ≥3 distinct developments, events, or angles |
| 2 | **Accessibility** | Zero-knowledge listener can follow without Googling. Every term, acronym, organization defined on first mention |
| 3 | **Forward close** | Ends with "what to watch" or "what happens next" |
| 4 | **Source attribution** | Specific sources cited by name in the text |
| 5 | **Geography** | Local themes = only chosen-country stories; Continent themes = only continent-country stories |

Approval:
- Mechanical PASS + ALL 5 qualitative rules PASS
- `approval_status`: `"APPROVED"`, `has_feedback`: `false`, `rewrite_scope`: `""`

Rejection:
- Mechanical FAIL or ANY qualitative rule fails → `rewrite_scope`: `"SEGMENTS"`, `failed_segments`: `[current story ID]`
- `approval_status`: `"REJECTED"`, `has_feedback`: `true`
- `rewriter_instructions`: Combined mechanical data (exact counts) + qualitative feedback

### Agent Contracts

Every agent implements the same interface:

```typescript
interface AgentOutput {
  draft: string;       // The current script (or unchanged for gates)
  reasoning: string;   // Full reasoning text
  metadata?: unknown;  // JSON for gates (audit results, fact-check reports, etc.)
}
```

Gates (Editor and Fact Checker) return structured JSON:
- **Editor** → `AuditResult` with per-theme/per-rule PASS/FAIL status, `rejection_reason` for every failure, and `has_feedback` flag. If `has_feedback` is false, the Writer stage is skipped entirely.
- **Fact Checker** → `FactCheckResult` with per-theme grades and `overall_status: PASS | ISSUES_FOUND`
- **Fixer** → `RecoveryResult` with `writer_instructions` for the Writer to apply

### Permanent Requirements

Theme completeness rules and editor audit checklists live in `src/prompts/shared/completenessRequirements.ts` as session-independent constants. They include:

- Minimum **2000 characters per theme summary**
- At least **3 distinct developments, events, or angles** per theme
- **60%+ of sentences between 15–30 words**
- All local terms defined on first mention
- Zero-knowledge assumption (write for listeners with no prior context)
- Continent-specific angles for continental news
- **Cross-theme coherence** — transitions, logical progression, and explicit cross-references between themes
- **Source attribution** — cite specific sources by name within the theme text
- **Forward-looking close** — every theme ends with "what to watch"

These are the golden rules. They don't change per session.

---

## Topic-Based News Summaries

Unlike traditional newscasts that report individual stories one by one, AI Newsroom produces **thematic summaries**. For each of your 3 selected topics, you get:

- **A local theme** — synthesizing 3+ developments in your chosen country
- **A continental theme** — synthesizing 3+ developments across the continent

Each theme is ~2,000 characters and weaves together multiple sources into a coherent narrative. This approach:
- **Works with web search snippets** — no full-article API required
- **Surfaces trends and context** — not just isolated events
- **Produces better podcasts** — thematic segments flow naturally, with explicit transitions

The Researcher is explicitly instructed to **prioritize the country's listed news sources** (from `src/data/countries.ts`) and to **prefer local-language sources** for local themes. When multiple articles cover the same development, the source from the priority list wins.

---

## Mobile-First UI

The pipeline UI is designed for phones:

- **Vertical stage strip** — A scrollable column of compact stage cards on the left. Each shows an icon, short name, and status dot. Active stages pulse. Completed stages show green checks. Rejected stages show amber warnings.
- **Tap to inspect** — Tap any stage to expand its reasoning chain, the **full LLM prompt**, the **first draft** (for the Researcher), the **structured audit** (for Editors), and output below
- **Loop counters** — Badges show when a stage has run multiple times (×2, ×3...)
- **Real-time streaming** — Reasoning tokens stream in as agents think, just like watching a live terminal
- **StageDetail tabs** — Articles (Agent 1 only), Stream (live reasoning), Agent Output (parsed first draft), Audit (Editor gates — per-theme PASS/FAIL), Prompt (full LLM prompt)

---

## Technical Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Maps | Leaflet |
| Build | Vite |
| Mobile | Capacitor (Android APK) |
| Storage | `@capacitor/preferences` (settings), `@capacitor/filesystem` (segment files in `Directory.Data/newsroom/`) |
| News Search | Brave Search API (web search with `freshness` filtering) |
| LLM API | OpenAI-compatible `/chat/completions` (SSE streaming) |
| CI/CD | GitHub Actions |

### Self-Contained APK

Everything bundles into the APK. No external web server. No cloud backend. The app talks directly to your chosen LLM provider and Brave Search using your API keys.

### Supported Providers

**LLM Providers:**
- OpenAI (GPT-4o, etc.)
- Anthropic (Claude via OpenRouter or direct)
- Google Gemini
- OpenRouter (unified access to many models)
- Local/Custom endpoints (Ollama, llama.cpp, vLLM, etc.)

**News Search:**
- Brave Search API — Web search with freshness filtering (day/week/month). Free tier: 2,000 queries/month.

---

## Project Structure

```
├── ai-newsroom/              # Static assets & public files
│   ├── assets/               # Image & media assets
│   ├── audio/                # Podcast audio previews & music samples
│   ├── index.html            # Static HTML fallback
│   └── logo.png              # Application logo
├── android/                  # Capacitor Android project
│   ├── app/                  # Android app module
│   ├── build.gradle          # Root Gradle build file
│   └── ...
├── src/
│   ├── agents/               # Agent implementations
│   │   ├── agent1.ts              # News Researcher — real Brave Search + LLM, writes XML segments to files
│   │   ├── agent1Parse.ts         # Output parser for Agent 1 (6 theme sections)
│   │   ├── fullScriptWriter.ts    # Full Script Writer — rewrites entire script, writes all segments
│   │   ├── fullScriptEditor.ts    # Full Script Editor — audits full script, decides FULL_SCRIPT vs SEGMENTS routing
│   │   ├── fullScriptEditorParse.ts  # JSON parser for audit results (rewrite_scope, failed_segments)
│   │   ├── segmentWriter.ts       # Segment Writer — targeted rewrite of failing segments only
│   │   ├── segmentEditor.ts       # Segment Editor — audits rewritten segments + transitions
│   │   ├── assembler.ts           # Assembler — pure code concatenation of segments into full_script.txt
│   │   ├── stubs/                 # Stub agents for pipeline testing (Audio Producer)
│   │   │   └── agent6Stub.ts
│   │   └── index.ts               # Agent map factory
│   ├── components/           # React UI components
│   │   ├── pipeline/         # Pipeline UI components
│   │   │   ├── PipelinePanel.tsx
│   │   │   ├── StageDetail.tsx
│   │   │   └── StageStrip.tsx
│   │   ├── BiasSelector.tsx
│   │   ├── ConfigureApiScreen.tsx
│   │   ├── CountryMap.tsx
│   │   ├── CountrySearch.tsx
│   │   ├── NewsroomScreen.tsx
│   │   ├── Newsroom2Screen.tsx
│   │   └── ScreenTabs.tsx
│   ├── data/                 # Static data & configuration
│   │   ├── bias.ts
│   │   ├── countries.ts      # 195-country dataset with news sources & languages
│   │   ├── countryBounds.ts
│   │   ├── music.ts
│   │   ├── timeframes.ts
│   │   ├── topics.ts         # Topic taxonomy with translations
│   │   └── voices.ts
│   ├── lib/                  # Core logic
│   │   ├── apiConfig.ts      # API persistence, LLM calls, SSE streaming, Brave key storage
│   │   ├── newsSearch.ts     # Brave Search API wrapper with fallback chain
│   │   ├── apiConfig.ts      # API persistence, LLM calls, SSE streaming, Brave key storage
│   │   ├── fileManager.ts    # File I/O via @capacitor/filesystem (segment files, full_script.txt)
│   │   ├── newsSearch.ts     # Brave Search API wrapper with fallback chain
│   │   ├── pipeline.ts       # Pipeline runner state machine with FULL_SCRIPT / SEGMENTS routing
│   │   ├── pipelineTypes.ts  # Pipeline type definitions (AuditResult with rewrite_scope, failed_segments)
│   │   ├── scriptParser.ts   # XML segment parser, assembler, tag stripper for TTS
│   │   ├── sessionConfig.ts  # SessionConfig builder & formatter
│   │   └── utils.ts
│   ├── prompts/
│   │   ├── agent1.ts              # Agent 1 prompt builder — XML segment output instructions
│   │   ├── fullScriptWriter.ts    # Full Script Writer prompt — preserve XML tags, rewrite everything
│   │   ├── fullScriptEditor.ts    # Full Script Editor prompt — per-theme audit + rewrite_scope routing
│   │   ├── segmentWriter.ts       # Segment Writer prompt — rewrite only failing segments + transition context
│   │   ├── segmentEditor.ts       # Segment Editor prompt — audit rewritten segments + transition checks
│   │   └── shared/                # Permanent, session-independent prompt building blocks
│   │       └── completenessRequirements.ts
│   ├── App.tsx               # Main application component with tab router
│   ├── index.css
│   ├── main.tsx
│   └── types.ts              # Shared TypeScript interfaces
├── .github/workflows/
│   └── build-android.yml     # APK build workflow
├── capacitor.config.ts
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
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

1. **Configure your APIs** — Go to Configure API, add your LLM provider key AND your Brave Search API key, save and test both
2. **Configure your podcast** — Go to Newsroom 2, pick a country, timeframe, **exactly 3 topics**, voice, music, and editorial angle
3. **Run Full Pipeline** — Tap the button and watch the agents work
4. **Inspect stages** — Tap any stage card to see reasoning, the full LLM prompt, the first draft, the structured audit, and output

---

## Repository

https://github.com/atavist89-max/Ai-newsroom
