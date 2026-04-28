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
| 1 | **Researcher** | ✅ Real | Queries Brave Search for local + continent news across your 3 topics, builds the first draft script with music cues and editorial framing |
| 2 | **Editor (Phase 1)** | ✅ Real | Evaluates all 6 themes + optional editorial segment against 19 structured rules. Returns per-theme PASS/FAIL audit with `rewriter_instructions` |
| 3 | **Writer** | ✅ Real | Receives editor feedback, rewrites the full script preserving structure and cues. Goes back to Editor for re-evaluation |
| 4 | **Fact Checker** | ⏳ Stub | Verifies every claim against independent sources |
| 5 | **Researcher (Fix)** | ⏳ Stub | If facts fail, finds replacements and provides repair instructions |
| 6 | **Editor (Final)** | ⏳ Stub | Gives the final approval gate before audio production |
| 7 | **Audio Producer** | ⏳ Stub | Generates narration with the selected voice, mixes music stings, and assembles the final MP3 |

Each agent streams its reasoning in real time. You can tap any stage to see exactly what it's thinking, the **full prompt** that was sent to the LLM, the **first draft** (for the Researcher), and the **structured audit** (for Editors). If an editor rejects a theme, you see the specific rule that failed and why — the writer gets that feedback, fixes it, and resubmits. The pipeline loops until everything passes.

**This is not a chatbot. This is a production pipeline.**

---

## The Pipeline

The AI Newsroom pipeline is a state machine that orchestrates seven specialized agents. It runs fully automatically, handles rejection loops without limits, and retries failed API calls up to 3 times before aborting.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FULL PIPELINE FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │  Researcher │  ← Queries Brave Search, writes first draft
    │   (Agent 1) │
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Editor    │  ← Evaluates 6 themes + editorial segment
    │  (Phase 1)  │     Returns per-theme PASS/FAIL audit
    │   (Gate 1)  │
    └──────┬──────┘
           │
           ├────────────┬────────────────────────────────────┐
           │            │                                    │
           ▼            ▼ Has feedback / Rejected           │
    ┌─────────────┐  ┌─────────────┐                        │
    │   Fact      │  │   Writer    │  ← Rewrites per audit  │
    │  Checker    │  │  (Agent 3)  │     feedback, then     │
    │  (Gate 2)   │  └──────┬──────┘     returns to Editor   │
    └──────┬──────┘         │            for re-evaluation   │
           │                │                               │
    (skip) │                └───────────────────────────────┘
           │
           ▼
    ┌─────────────┐
    │   Editor    │  ← Final approval gate
    │  (Final)    │
    │  (Gate 3)   │
    └──────┬──────┘
           │
           ├────────────┬────────────────────────────────────┐
           │            │                                    │
           ▼            ▼ Rejected                           │
    ┌─────────────┐  ┌─────────────┐                        │
    │    Audio    │  │   Writer    │  ← Rewrites per final  │
    │  Producer   │  │  (Agent 3)  │     editor feedback,   │
    │  (Agent 6)  │  └──────┬──────┘     returns to Editor   │
    └──────┬──────┘         │                               │
           │                └───────────────────────────────┘
           ▼
      ✅ COMPLETE
```

### Rejection Loops

**Editor (Phase 1) ↔ Writer loop:**
- Editor audits the draft. If it finds ANY issues (`has_feedback=true`) or rejects outright, the draft goes to the Writer with specific `rewriter_instructions`.
- Writer rewrites the full script addressing every feedback point, then sends it **back to Editor (Phase 1)** for re-evaluation.
- This loop continues until the Editor returns `APPROVED` with `has_feedback=false` — at which point the Writer is skipped entirely and the draft proceeds to Fact Checker.

**Fact Checker → Fixer → Writer loop:**
- Fact Checker verifies claims. If issues are found, the Fixer finds replacements and sends repair instructions to the Writer.
- Writer applies fixes and returns to Fact Checker for re-verification.

**Editor (Final) → Writer loop:**
- Final Editor gives the last quality gate. If rejected, the Writer polishes again and resubmits.

All loops are **unbounded** — the pipeline prioritizes correctness over speed.

**Key behaviors:**
- **Rejection loops have no limit** — the pipeline prioritizes correctness over speed
- **API failures retry 3 times** — then abort with a clear error
- **Session context is ephemeral** — configuration exists only in memory for the current run; close the app and it disappears
- **All agents work from the same draft** — revisions are applied to the current version, never from scratch

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
| Storage | `@capacitor/preferences` (Android SharedPreferences) |
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
│   │   ├── agent1.ts         # News Researcher — real Brave Search + LLM implementation
│   │   ├── agent1Parse.ts    # Output parser for Agent 1 (6 theme sections)
│   │   ├── agent3.ts         # Writer — real LLM rewrite with editor feedback
│   │   ├── gate1.ts          # Editor Phase 1 — real LLM audit with structured JSON output
│   │   ├── gate1Parse.ts     # JSON parser for Editor audit results
│   │   ├── stubs/            # Configurable stub agents for pipeline testing
│   │   │   ├── agent5Stub.ts
│   │   │   ├── gate2Stub.ts
│   │   │   ├── gate3Stub.ts
│   │   │   └── stubConfig.ts
│   │   └── index.ts          # Agent map factory
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
│   │   ├── pipeline.ts       # Pipeline runner state machine
│   │   ├── pipelineTypes.ts  # Pipeline type definitions
│   │   ├── sessionConfig.ts  # SessionConfig builder & formatter
│   │   └── utils.ts
│   ├── prompts/
│   │   ├── agent1.ts         # Agent 1 prompt builder — injects SessionConfig + requirements + bias
│   │   ├── agent3.ts         # Writer prompt builder — current draft + editor feedback + rewrite instructions
│   │   ├── gate1.ts          # Editor prompt builder — per-theme audit criteria + editorial segment checks
│   │   └── shared/           # Permanent, session-independent prompt building blocks
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
