# AI Newsroom Full App

An Android app that connects directly to large language models to produce automated news podcasts. Select a country, timeframe, topics, voice, and editorial perspective — then run the agent and watch the LLM generate your broadcast in real time. All configuration, audio preview, and LLM output happens inside the app.

The app is built as a self-contained Android APK using Capacitor. All web assets are bundled directly into the app — no external web server is required at runtime.

**Download the APK:** See [Android APK](#android-apk) below.

---

## Screens

The app has three main screens, switched via a full-width tab bar at the top:

### Newsroom 2 (Pipeline)

Configure your podcast and run the full agent pipeline:

- **Geographic Selection** — Searchable dropdown with 196 countries, flag emojis, and an interactive map
- **Timeframe** — Daily Briefing, Weekly Review, or Monthly Roundup
- **Topics** — Select up to 3 from: General News, Economy, Entertainment, Politics, Society, Sport, Technology, Crime
- **Voice Selection** — 4 professional narrator voices with Play/Pause audio previews
- **Music Suite** — Customize intro, outro, story stings, and block transitions with audio previews
- **Editorial Settings** — 5-position bias slider (Extreme Left → Extreme Right) with live definition panel
- **Run Full Pipeline** — Executes all 6 agent stages automatically
- **Horizontal Stage Strip** — Mobile-optimized horizontal scrollable strip showing all pipeline stages at a glance
- **Per-Stage Detail** — Tap any stage to expand its reasoning chain and output
- **Real-Time Progress** — Visual active/inactive indicators with loop counters

The **Configuration Prompt** is generated as structured JSON (`SessionConfig`) for the pipeline. All date calculations happen in TypeScript — no token-wasting Python blocks.

### Configure API

Set up and persist your LLM provider credentials:

- **API Provider** — OpenAI, Anthropic, Google Gemini, OpenRouter, or Custom/Local
- **API Key** — Password-protected input with reveal toggle
- **Base URL** (optional) — For proxies, local models (Ollama), or Azure OpenAI
- **Model** — Chat completion model identifier (e.g., `gpt-4o`, `claude-3-5-sonnet`)
- **Save Configuration** — Stored in native Android `SharedPreferences` (survives restarts and updates)
- **Test Connection** — Verifies your key works with a minimal ping

### Newsroom (Legacy)

The original prompt generator is retained as a fallback. Configure your podcast and copy the full agent swarm prompt to run in an external LLM interface. If a pipeline run has produced session context, the legacy prompt will prepend it automatically.

### Configure API

Set up and persist your LLM provider credentials:

- **API Provider** — OpenAI, Anthropic, Google Gemini, OpenRouter, or Custom/Local
- **API Key** — Password-protected input with reveal toggle
- **Base URL** (optional) — For proxies, local models (Ollama), or Azure OpenAI
- **Model** — Chat completion model identifier (e.g., `gpt-4o`, `claude-3-5-sonnet`)
- **Save Configuration** — Stored in native Android `SharedPreferences` (survives restarts and updates)
- **Test Connection** — Verifies your key works with a minimal ping

---

## Features

### Geographic Selection
- **196 countries** across all 7 continents (Europe, Africa, Asia, North America, South America, Middle East, Oceania)
- **Searchable country dropdown** with live filtering and flag emojis (🇩🇪, 🇺🇸, 🇯🇵, etc.)
- **Interactive map** highlighting selected country in green and continent in yellow
- Automatic continent detection
- Local news sources for each country
- Continental news sources for broader coverage

### Timeframe Options
- **Daily Briefing** — 24-hour news window
- **Weekly Review** — 7-day news roundup  
- **Monthly Roundup** — 30-day comprehensive review

### Topic Selection
Select up to 3 topics:
- General News
- Economy
- Entertainment
- Politics
- Society
- Sport
- Technology
- Crime

### Voice Selection
- **Adam** — Professional male, American accent
- **Bella** — Professional female, American accent
- **Josh** — Authoritative male, British accent
- **Rachel** — Warm female, American accent
- **Play/Pause preview buttons** for each voice

### Music Suite
Customize your podcast's audio identity:
- **Intro Music** — Orchestral, Modern, Nordic, BBC, Contemporary
- **Outro Music** — Matching intro style
- **Story Sting** — Short transition between stories
- **Block Transition** — Between major sections
- **Play/Pause preview buttons** for each music slot

### Editorial Settings
- **5-Position Bias Slider** — Extreme Left → Moderate Left → Moderate → Moderate Right → Extreme Right
- **Color Gradient** — Red → Purple → Blue visual indicator
- **Bias Definition Panel** — Shows how the selected perspective affects headlines, story order, language, and quotes
- **Editorial Segment Toggle** — Optional in-depth thematic analysis section

---

## Android APK

### Downloading

1. Go to the **Actions** tab in this GitHub repository
2. Select the **Build Android APK** workflow
3. Open the latest successful run on the `AI-Newsroom-Full-App` branch
4. Download the **`ai-newsroom-full-app-debug`** artifact
5. Extract the ZIP and install `app-debug.apk` on your Android device
   - You may need to enable **Install from unknown sources** in your device settings

### Persistent Storage

API credentials are stored using `@capacitor/preferences`, which writes to native Android `SharedPreferences`:
- Survives app restarts
- Survives app updates
- Not wiped by cache clears
- Never leaves your device except to the provider you selected

### LLM API Compatibility

The app uses the OpenAI-compatible `/chat/completions` format. This provides broad out-of-the-box compatibility with:
- **OpenAI** (GPT-4o, GPT-4, etc.)
- **OpenRouter** (unified access to many models)
- **Local inference servers** (Ollama, llama.cpp, vLLM, etc.)
- Most custom endpoints

Provider-specific adapters for Anthropic and Gemini direct APIs can be added in future sprints.

---

## Agent Swarm Architecture

The generated prompt orchestrates 6 AI agents working together:

### Agent 1: News Researcher
- Searches local news sources in the country's language
- Searches continental news sources in English
- Auto-selects top stories based on relevance and diversity

### Agent 2: The Editor (Quality Gate)
Runs **twice**: Phase 1 after Agent 1, and Final Check after Agent 4. Uses the same mandatory checklist both times:
- BBC broadcast standards
- Story completeness (1500+ characters minimum)
- International audience understanding
- Term definitions and context
- 5 Ws + How coverage
- Sentence length distribution (60% between 15-30 words)
- Produces structured JSON audit report with per-story/per-rule status

### Agent 3: The Writer
- Polishes scripts for active voice
- Ensures oral readability
- Maintains BBC style
- Adds transitional narration

### Agent 4: Fact Checker
- Verifies all claims against multiple sources
- Produces structured `news_fact_check.json` report
- Triggers Agent 5 if `overall_status: ISSUES_FOUND`

### Agent 5: Researcher (Conditional)
- Only activated if Agent 4 reports issues
- Produces `recovery_actions.json` with writer instructions
- Returns fixes to Agent 3 for re-integration

### Agent 6: Audio Producer (Deferred)
- Will generate narration using the selected voice
- Will mix music with narration (music and narration never overlap)
- Will produce final MP3
- **Not yet implemented** — deferred to future sprints

---

## Hard Requirements (Non-Negotiable)

Every story must meet these criteria:

1. **Minimum 1500 characters** — Ensures sufficient detail
2. **60% of sentences 15-30 words** — Natural speech rhythm
3. **Average sentence length >15 words** — Prevents choppy delivery
4. **All terms defined** — No unexplained local references
5. **5 Ws + How answered** — Complete information
6. **International context** — Assume zero prior knowledge
7. **Continent angle** — Continental news must have continent-specific perspective
8. **"In [country]..." start** — Continental news must specify country

---

## Usage

1. **Configure your API** — Go to Configure API, select your provider, enter your API key and model, then save and test
2. **Go to Newsroom 2** — Select a country, timeframe, topics, voice, music, and editorial perspective
3. **Run Full Pipeline** — Tap the Run Full Pipeline button to execute all 6 agent stages automatically
4. **Monitor Progress** — Watch the horizontal stage strip for real-time status. Tap any stage to view its reasoning and output.
5. **Copy Legacy Prompt** — Or go to Newsroom to copy the full agent swarm prompt for external use

---

## Technical Details

### Built With
- React + TypeScript
- Tailwind CSS
- Leaflet (interactive maps)
- Vite (build tool)
- Capacitor (mobile app wrapper)

### Mobile Stack
- **Capacitor** — wraps the webapp as a native Android app
- **@capacitor/preferences** — native persistent storage for API credentials
- **Android WebView** — renders the web UI
- **Gradle** — builds the Android APK
- **GitHub Actions** — CI/CD for automated APK builds

### Audio Assets
- 35 audio files included
- Music: intro, outro, story stings, block transitions
- Voice samples for preview

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
│   ├── components/           # React UI components
│   │   ├── BiasSelector.tsx  # Editorial bias slider & definition panel
│   │   ├── ConfigureApiScreen.tsx  # API provider configuration
│   │   ├── CountryMap.tsx    # Interactive Leaflet map
│   │   ├── CountrySearch.tsx # Searchable country dropdown with flags
│   │   ├── NewsroomScreen.tsx      # Newsroom screen
│   │   ├── Newsroom2Screen.tsx     # Live LLM agent screen
│   │   └── ScreenTabs.tsx    # Full-width tab navigation
│   ├── data/                 # Static data & configuration
│   │   ├── bias.ts           # Bias options & definitions
│   │   ├── countries.ts      # 196-country dataset with flags & sources
│   │   ├── countryBounds.ts  # GeoJSON bounds for map highlighting
│   │   ├── index.ts          # Data barrel exports
│   │   ├── music.ts          # Music suite configuration
│   │   ├── timeframes.ts     # Daily / Weekly / Monthly options
│   │   ├── topics.ts         # News topic categories
│   │   └── voices.ts         # Voice actor presets
│   ├── lib/
│   │   ├── apiConfig.ts      # API config persistence, LLM calls & SSE streaming
│   │   └── utils.ts          # Utility helpers
│   ├── prompts/
│   │   └── configurationPrompt.ts  # Editable LLM prompt template
│   ├── App.tsx               # Main application component with tab router
│   ├── index.css             # Global Tailwind styles
│   ├── main.tsx              # React entry point
│   └── types.ts              # Shared TypeScript interfaces
├── .github/workflows/        # GitHub Actions
│   └── build-android.yml     # APK build workflow
├── capacitor.config.ts       # Capacitor configuration
├── index.html                # Vite entry HTML
├── package.json              # Dependencies & scripts
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
├── tsconfig.node.json        # Vite-specific TS config
└── vite.config.ts            # Vite build configuration
```

---

## GitHub Repository

https://github.com/atavist89-max/Ai-newsroom

---

## Changelog

### Current Release
- **Pipeline Orchestration** — Full 6-agent workflow runner with state machine, retry logic, and loop tracking
- **Horizontal Stage Strip** — Mobile-optimized horizontal scrollable strip showing all pipeline stages with active/inactive indicators
- **Per-Stage Reasoning & Output** — Each agent has its own collapsible reasoning chain and output panel
- **Configurable Stub Agents** — All 6 agent slots use swappable stubs for $0-cost pipeline testing
- **SessionConfig JSON** — TypeScript-computed configuration context (no Python blocks), passed between agents
- **Completeness Requirements** — Story rules and editor audit checklist extracted to `src/prompts/shared/completenessRequirements.ts`
- **Real-Time SSE Streaming** — LLM response streams token-by-token via Server-Sent Events
- **Configure API** — Provider selector, API key, base URL, model input with persistent storage
- **Tab Navigation** — Full-width top tabs switching between Newsroom, Newsroom 2, and Configure API
- **Native Persistence** — API credentials stored in Android SharedPreferences via Capacitor Preferences
- **OpenAI-Compatible API** — Universal chat completions format for broad provider support
- **Self-Contained APK** — All assets bundled via Capacitor, no external server needed
- **GitHub Action Builds** — Automated APK generation on every push

### Previous Updates
- **Bias Selector** — 5-position editorial perspective slider (Extreme Left → Extreme Right)
- **Editorial Segment Toggle** — Optional conditional editorial analysis section
- **Bias Definition Panel** — Shows perspective details below the slider
- **News Sources in Summary** — Configuration summary displays country & continent news sources
- **Voice & Music Previews** — Play/Pause buttons to preview voices and music styles
- **Interactive Map** — Country highlighted green, continent highlighted yellow, auto-pan/zoom
- **Full World Country List** — 196 countries with flag emojis
- **Searchable Country Dropdown** — Mobile-optimized autocomplete with live filtering
- **Audio Producer** — Mandarin TTS with English language, music/narration separation rules
- **Added "Crime" topic**

---

*This README is kept up to date with all project changes.*
