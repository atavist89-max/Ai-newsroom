# AI Newsroom Podcast Producer

A web application that generates sophisticated agent swarm prompts for automated news podcast production. Configure your news source, topics, voice, and music, then generate a complete prompt for Kimi Agent to produce professional BBC-style news podcasts.

**Live Demo:** https://ccn7h2z5m53rm.ok.kimi.link

---

## Branches

This repository has three active branches:

| Branch | Description | Platform |
|--------|-------------|----------|
| `main` | Original web application | Web |
| `AI-Newsroom-Mobile` | Self-contained Android APK | Android |
| `AI-Newsroom-Full-App` | Full app with live LLM integration | Android |

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
- **Daily Briefing** - 24-hour news window
- **Weekly Review** - 7-day news roundup  
- **Monthly Roundup** - 30-day comprehensive review

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
- **Adam** - Professional male, American accent
- **Bella** - Professional female, American accent
- **Josh** - Authoritative male, British accent
- **Rachel** - Warm female, American accent
- **Play/Pause preview buttons** for each voice

### Music Suite
Customize your podcast's audio identity:
- **Intro Music** - Orchestral, Modern, Nordic, BBC, Contemporary
- **Outro Music** - Matching intro style
- **Story Sting** - Short transition between stories
- **Block Transition** - Between major sections
- **Play/Pause preview buttons** for each music slot
- Dropdowns now properly update music selection state

### Editorial Settings
- **5-Position Bias Slider** - Extreme Left → Moderate Left → Moderate → Moderate Right → Extreme Right
- **Color Gradient** - Red → Purple → Blue visual indicator
- **Bias Definition Panel** - Shows how the selected perspective affects headlines, story order, language, and quotes
- **Editorial Segment Toggle** - Optional in-depth thematic analysis section with conditional prompt generation

---

## Mobile App (Android APK)

Both `AI-Newsroom-Mobile` and `AI-Newsroom-Full-App` branches produce self-contained Android APKs via GitHub Actions. The web assets are bundled directly into the APK and run in a native Android WebView — no external web server required.

### Downloading the APK

1. Go to the **Actions** tab in this GitHub repository
2. Select the **Build Android APK** workflow
3. Choose the branch you want (`AI-Newsroom-Mobile` or `AI-Newsroom-Full-App`)
4. Open the latest successful run
5. Download the artifact:
   - `AI-Newsroom-Mobile` → `ai-newsroom-mobile-debug`
   - `AI-Newsroom-Full-App` → `ai-newsroom-full-app-debug`
6. Extract the ZIP and install `app-debug.apk` on your Android device
   - You may need to enable **Install from unknown sources** in your device settings

---

## AI-Newsroom-Mobile Branch

The mobile branch converts the webapp into a native Android app using [Capacitor](https://capacitorjs.com/). All original features and functionality are preserved exactly as they are in the web version — the only change is the platform.

**What was added:**
- Capacitor integration (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)
- Android platform project in `android/`
- GitHub Action workflow that builds the APK on every push
- Fully self-contained APK with all assets bundled

---

## AI-Newsroom-Full-App Branch

The full app branch extends the mobile app with live LLM integration. Instead of just generating a prompt to copy, the app can connect directly to an LLM provider and run the agent in real time.

### New Screens

The app now has three tabs at the top of the screen:

#### 1. Newsroom
The original screen — identical in every way to the webapp. Configure your podcast, generate the prompt, and copy it to the clipboard.

#### 2. Newsroom 2 (Live LLM)
Same configuration UI as Newsroom, but with a live LLM connection:
- **Run Agent** button sends your configuration directly to a connected LLM
- **Agent Output** window displays the LLM's response in real time
- **Reasoning Chain** — collapsible section that appears if the model returns reasoning (e.g., DeepSeek R1, o1)
- Loading spinner and error messages during the API call

The prompt sent to the LLM includes:
- **STEP 0**: Python date-range calculation using your selected timeframe
- Full **Configuration Summary**: country, language, continent, timeframe, topics, voice, editorial perspective, editorial segment toggle

#### 3. Configure API
Set up and test your LLM provider:
- **API Provider** dropdown: OpenAI, Anthropic, Google Gemini, OpenRouter, Custom/Local
- **API Key** input with password masking and reveal toggle
- **Base URL** (optional) for proxies, local models (Ollama), or Azure OpenAI
- **Model** input for the chat completion model identifier
- **Save Configuration** — stores settings using native Android `SharedPreferences` (survives app restarts)
- **Test Connection** — sends a minimal ping to verify your key works

### Persistent Storage
API credentials are stored using `@capacitor/preferences`, which writes to native Android `SharedPreferences`. This means:
- Your API key survives app restarts
- Your API key survives app updates
- Your API key is not wiped by cache clears
- Your API key never leaves your device except to the provider you selected

### LLM API Format
Newsroom 2 uses the OpenAI-compatible `/chat/completions` format. This provides broad compatibility out of the box with:
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
- **Excludes** selected country stories from continent block

### Agent 2: The Editor (Quality Gate)
Reviews scripts for:
- BBC broadcast standards
- Story completeness (1500+ characters minimum)
- International audience understanding
- Term definitions and context
- 5 Ws + How coverage
- Sentence length distribution (60% between 15-30 words)
- Continent-specific angles for continental news

### Agent 3: The Writer
- Polishes scripts for active voice
- Ensures oral readability
- Maintains BBC style
- Adds transitional narration

### Agent 4: Fact Checker
- Verifies all claims against multiple sources
- Flags factual inaccuracies
- Triggers replacement story search if needed

### Agent 5: Researcher (Conditional)
- Only activated if fact-check fails
- Finds replacement stories from the correct coverage period
- Ensures narrative continuity

### Agent 6: Audio Producer
- **STEP 1**: Generate narration using Mandarin TTS with English language
- **STEP 2**: Mix music with narration (MUSIC AND NARRATION NEVER OVERLAP)
- **STEP 3**: Produce final MP3

---

## Hard Requirements (Non-Negotiable)

Every story must meet these criteria:

1. **Minimum 1500 characters** - Ensures sufficient detail
2. **60% of sentences 15-30 words** - Natural speech rhythm
3. **Average sentence length >15 words** - Prevents choppy delivery
4. **All terms defined** - No unexplained local references
5. **5 Ws + How answered** - Complete information
6. **International context** - Assume zero prior knowledge
7. **Continent angle** - Continental news must have continent-specific perspective
8. **"In [country]..." start** - Continental news must specify country

---

## Usage

### Web (main branch)
1. **Select a country** from the searchable dropdown (with flags)
2. **Choose timeframe** (Daily/Weekly/Monthly)
3. **Select topics** (up to 3)
4. **Pick a voice** for narration (with audio preview)
5. **Configure music suite** for transitions (with audio preview)
6. **Set editorial perspective** (5-position bias slider)
7. **Toggle editorial segment** (optional analysis section)
8. **Click "Copy Podcast Prompt"**
9. **Paste into Kimi Agent** to generate the podcast

### Mobile App (AI-Newsroom-Full-App)
1. Go to **Configure API** and enter your LLM API key + provider + model
2. Save and test the connection
3. Switch to **Newsroom 2**
4. Configure your podcast settings
5. Tap **Run Agent**
6. View the LLM response in the **Agent Output** window

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

### Deployment
Static site deployed to production environment.

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
├── android/                  # Capacitor Android project (mobile branches)
│   ├── app/                  # Android app module
│   ├── build.gradle          # Root Gradle build file
│   └── ...
├── src/
│   ├── components/           # React UI components
│   │   ├── BiasSelector.tsx  # Editorial bias slider & definition panel
│   │   ├── ConfigureApiScreen.tsx  # API provider configuration (Full App)
│   │   ├── CountryMap.tsx    # Interactive Leaflet map
│   │   ├── CountrySearch.tsx # Searchable country dropdown with flags
│   │   ├── NewsroomScreen.tsx      # Original newsroom screen
│   │   ├── Newsroom2Screen.tsx     # Live LLM integration screen (Full App)
│   │   └── ScreenTabs.tsx    # Full-width tab navigation (Full App)
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
│   │   ├── apiConfig.ts      # API config persistence & LLM calls (Full App)
│   │   └── utils.ts          # Utility helpers
│   ├── App.tsx               # Main application component with tab router
│   ├── index.css             # Global Tailwind styles
│   ├── main.tsx              # React entry point
│   └── types.ts              # Shared TypeScript interfaces
├── .github/workflows/        # GitHub Actions
│   └── build-android.yml     # APK build workflow
├── capacitor.config.ts       # Capacitor configuration (mobile branches)
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

### AI-Newsroom-Full-App (Latest)
- **Newsroom 2** — Live LLM integration screen with Run Agent button
- **Configure API** — Provider selector, API key, base URL, model input with persistent storage
- **Tab Navigation** — Full-width top tabs: Newsroom | Newsroom 2 | Configure API
- **Agent Output Window** — Displays LLM responses with collapsible Reasoning Chain support
- **Native Persistence** — API credentials stored in Android SharedPreferences via Capacitor Preferences
- **OpenAI-Compatible API** — Universal chat completions format for broad provider support
- **Dynamic Agent Prompt** — STEP 0 date range + configuration summary sent to LLM
- **Loading & Error States** — Visual feedback during API calls

### AI-Newsroom-Mobile
- **Android APK** — Self-contained mobile app via Capacitor
- **GitHub Action** — Automated APK builds on every push
- **Bundled Assets** — All web assets embedded in the APK, no external server needed
- **App Name** — "AI Newsroom Full App"

### Latest Web Updates (April 18, 2026)
- **Bias Selector** - 5-position editorial perspective slider (Extreme Left → Extreme Right)
- **Editorial Segment Toggle** - Optional conditional editorial analysis section
- **Bias Definition Panel** - Shows perspective details below the slider
- **News Sources in Summary** - Configuration summary now displays country & continent news sources
- **Voice & Music Previews** - Play/Pause buttons to preview voices and music styles
- **Interactive Map Restored** - Country highlighted green, continent highlighted yellow, auto-pan/zoom
- **Full World Country List** - Restored from 51 to 196 countries with flag emojis
- **Searchable Country Dropdown** - Mobile-optimized autocomplete with live filtering
- **Fact Checker Fix** - Replaced hardcoded "yesterday" with dynamic coverage period respecting timeframe selection
- **Music Suite State Fix** - Dropdowns now properly update music selection

### Previous Updates
- Audio Producer: Mandarin TTS now mandatory in STEP 2
- Audio Producer: Added rule - music and narration must NEVER overlap
- Removed non-functional download button
- Added "Crime" topic
- Changed sentence length requirement to statistical distribution (60% between 15-30 words)
- Added continent-specific angle requirements
- Fixed map z-index overlay issue
- Made all editor requirements hard and non-negotiable
- Added Mandarin TTS with English language instruction

---

*This README is kept up to date with all project changes.*
