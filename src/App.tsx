import { useState, useCallback, useMemo, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Mic2, Music, Globe, Clock, FileText, Copy, Check, Radio, Newspaper, Scale, Play, Pause } from 'lucide-react';
import { cn } from './lib/utils';
import { countries, continents } from './data/countries';
import { timeframes } from './data/timeframes';
import { topics } from './data/topics';
import { voices } from './data/voices';
import { musicStyles, defaultMusicSuite } from './data/music';
import { biasOptions, biasAgent1Instructions, biasEditorialGuidelines } from './data/bias';
import { BiasSelector } from './components/BiasSelector';
import { CountryMap } from './components/CountryMap';
import { CountrySearch } from './components/CountrySearch';
import type { Country, Continent, Timeframe, Topic as TopicType, Voice, MusicSuite, BiasPosition, MusicStyle } from './types';

function App() {
  // Selection states
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [selectedContinent, setSelectedContinent] = useState<Continent>(Object.values(continents)[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('daily');
  const [selectedTopics, setSelectedTopics] = useState<TopicType[]>(['General News']);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(voices[0]);
  const [selectedMusicSuite, setSelectedMusicSuite] = useState<MusicSuite>(defaultMusicSuite);
  const [selectedBias, setSelectedBias] = useState<BiasPosition>('moderate');
  const [includeEditorialSegment, setIncludeEditorialSegment] = useState(false);
  const [copied, setCopied] = useState(false);

  // Audio preview state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [playingMusic, setPlayingMusic] = useState<{ category: string; styleId: string } | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Generate prompt
  const promptResult = useMemo(() => {
    return generateAgentSwarmPrompt({
      country: selectedCountry,
      continent: selectedContinent,
      timeframe: selectedTimeframe,
      topics: selectedTopics,
      voice: selectedVoice,
      musicSuite: selectedMusicSuite,
      bias: selectedBias,
      includeEditorialSegment
    });
  }, [selectedCountry, selectedContinent, selectedTimeframe, selectedTopics, selectedVoice, selectedMusicSuite, selectedBias, includeEditorialSegment]);

  // Handle country selection
  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    const continent = continents[country.continentCode];
    if (continent) {
      setSelectedContinent(continent);
    }
    toast.success(`Selected ${country.name}`);
  }, []);

  // Handle topic toggle
  const handleTopicToggle = useCallback((topic: TopicType) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== topic);
      }
      if (prev.length >= 3) return prev;
      return [...prev, topic];
    });
  }, []);

  // Voice preview handler
  const handleVoicePreview = useCallback(async (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current = null;
    }
    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      return;
    }
    try {
      const audio = new Audio(`./audio/voices/${voice.id}.mp3`);
      voiceAudioRef.current = audio;
      audio.addEventListener('ended', () => {
        setPlayingVoiceId(null);
        voiceAudioRef.current = null;
      });
      audio.addEventListener('error', () => {
        console.error('Error playing audio preview');
        setPlayingVoiceId(null);
        voiceAudioRef.current = null;
      });
      setPlayingVoiceId(voice.id);
      await audio.play();
    } catch {
      setPlayingVoiceId(null);
    }
  }, [playingVoiceId]);

  // Music preview handler
  const handleMusicPreview = useCallback(async (category: string, style: MusicStyle, e: React.MouseEvent) => {
    e.stopPropagation();
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }
    if (playingMusic?.category === category && playingMusic?.styleId === style.id) {
      setPlayingMusic(null);
      return;
    }
    try {
      const audioPrefix = category === 'storySting' ? 'story' : category === 'blockSting' ? 'block' : category;
      const audio = new Audio(`./audio/${audioPrefix}_${style.id}.mp3`);
      musicAudioRef.current = audio;
      audio.addEventListener('ended', () => {
        setPlayingMusic(null);
        musicAudioRef.current = null;
      });
      audio.addEventListener('error', () => {
        console.error('Error playing audio preview');
        setPlayingMusic(null);
        musicAudioRef.current = null;
      });
      setPlayingMusic({ category, styleId: style.id });
      await audio.play();
    } catch {
      setPlayingMusic(null);
    }
  }, [playingMusic]);

  // Copy prompt to clipboard
  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(promptResult);
      setCopied(true);
      toast.success('Prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy prompt');
    }
  }, [promptResult]);

// Generate the agent swarm prompt
  function generateAgentSwarmPrompt(config: {
    country: Country;
    continent: Continent;
    timeframe: Timeframe;
    topics: TopicType[];
    voice: Voice;
    musicSuite: MusicSuite;
    bias: BiasPosition;
    includeEditorialSegment: boolean;
  }): string {
    const today = new Date().toISOString().split('T')[0];
    const timeframeConfig = {
      daily: { label: 'Daily Briefing', days: 1 },
      weekly: { label: 'Weekly Review', days: 7 },
      monthly: { label: 'Monthly Roundup', days: 30 }
    }[config.timeframe];
    const earliestDate = new Date(Date.now() - timeframeConfig.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];


    const biasConfig = biasOptions.find(b => b.id === config.bias)!;
    const biasLabel = biasConfig.label;

    const primaryTopic = config.topics[0] || 'General News';
    const hasGeneralNews = config.topics.includes('General News');
    const fallbackTopic = hasGeneralNews ? null : 'General News';

    const countrySourcesList = config.country.newsSources.join(', ');
    const continentSourcesList = config.continent.newsSources.map(s => s.name).join(', ');
    const countrySourceBullet = config.country.newsSources.map(s => `- ${s}`).join('\n');
    const continentSourceBullet = config.continent.newsSources.map(s => `- ${s.name} (${s.language})`).join('\n');
    const countrySearchExamples = config.country.newsSources.map((s, i) => `    ${i === 0 ? '' : '+ '}${i === 0 ? 'local_results' : 'local_results +'}= web_search("${s} [TRANSLATE \"${primaryTopic}\" TO ${config.country.language} FOR SEARCH]")`).join('\n');
    const fallbackSearchExamples = fallbackTopic ? config.country.newsSources.slice(0, 2).map((s, i) => `    ${i === 0 ? '' : '+ '}${i === 0 ? 'local_results' : 'local_results +'}= web_search("${s} [TRANSLATE \"${fallbackTopic}\" TO ${config.country.language} FOR SEARCH]")`).join('\n') : '';
    const outputFilename = `${config.country.name.replace(/\s+/g, '_')}_${timeframeConfig.label.replace(/\s+/g, '_')}_${today}.mp3`;

    return `# AI NEWSROOM - Agent Swarm Prompt
## ${config.country.name} ${timeframeConfig.label} - ${today}

### Configuration
- **Country**: ${config.country.name} (${config.country.language})
- **Continent**: ${config.continent.name}
- **Timeframe**: ${timeframeConfig.label} (past ${timeframeConfig.days} day${timeframeConfig.days > 1 ? 's' : ''})
- **Topics**: ${config.topics.join(', ')}
- **Voice**: ${config.voice.label}
- **Editorial Perspective**: ${biasLabel}
- **Include Editorial Segment**: ${config.includeEditorialSegment ? 'Yes' : 'No'}

### News Sources
- **${config.country.name} sources** (${config.country.language}): ${countrySourcesList}
- **${config.continent.name} sources** (English): ${continentSourcesList}

---

### EDITORIAL PERSPECTIVE
**Selected Bias**: ${biasLabel}

**CRITICAL INSTRUCTION FOR ALL AGENTS:**
Every agent MUST maintain ${biasLabel} perspective throughout.
This affects HOW facts are presented, NOT WHICH facts are reported.
Never invent facts. Never omit relevant facts.

---

## AGENT SWARM ARCHITECTURE

### AGENT 1: NEWS RESEARCHER & FIRST DRAFT WRITER
**Role**: Investigative Researcher + Initial Script Writer
**Tools**: web_search, llm_generate
**Task**: Research news from local sources in local language, translate to English, and write the first draft script.

**STEP 0: DETERMINE DATE RANGE**

First, establish the exact date range for news coverage:

\`\`\`python
from datetime import datetime, timedelta

# Get today's date
today = datetime.now().strftime("%Y-%m-%d")

# Calculate lookback based on timeframe (${config.timeframe})
if "${config.timeframe}" == "daily":
    lookback_days = 1
elif "${config.timeframe}" == "weekly":
    lookback_days = 7
else:  # monthly
    lookback_days = 30

# Calculate the earliest date for valid news
earliest_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

print(f"Coverage period: {earliest_date} to {today}")
\`\`\`

**CRITICAL**: All subsequent news searches MUST filter for stories dated between ${earliestDate} and ${today}. Stories dated before ${earliestDate} are NOT valid for this broadcast.

**STEP 1A: SEARCH LOCAL NEWS SOURCES (in ${config.country.language})**

**TRANSLATION INSTRUCTION**: When searching local sources in ${config.country.language}, translate the English topic to ${config.country.language}. For example, "${primaryTopic}" becomes "[TRANSLATE \"${primaryTopic}\" TO ${config.country.language} FOR SEARCH]" in ${config.country.language}.

For **${config.country.name}**, search these local sources **IN ${config.country.language}**:
${countrySourceBullet}

**Primary Topic Focus**: ${primaryTopic}

\`\`\`python
# Search using ${config.country.language} keywords for local sources
# Priority 1: Primary selected topics
${countrySearchExamples}
\`\`\`

**IMPORTANT**: These searches MUST be in **${config.country.language}** to get authentic local news.

**STEP 1B: SEARCH CONTINENT NEWS SOURCES**

For **${config.continent.name}**, search these international sources:
${continentSourceBullet}

\`\`\`python
# Search continent-level news (English/international sources)
continent_results = web_search("CNN news today")
continent_results += web_search("Reuters breaking news")
continent_results += web_search("AP top stories")
\`\`\`

**STEP 1C: TOPIC FALLBACK STRATEGY**

If insufficient stories found in primary topics:

\`\`\`python
# FALLBACK: Expand to ${fallbackTopic || 'other selected topics'} if needed
if len(local_results) < 5:
    # Search ${fallbackTopic || 'additional topics'} as fallback
${fallbackSearchExamples || '    # All selected topics already searched'}
    
    # Document fallback usage
    fallback_used = True
else:
    fallback_used = False
\`\`\`

**STEP 1D: TRANSLATE TO ENGLISH**

Before proceeding, translate all ${config.country.language} content to English:

\`\`\`python
# For each ${config.country.language} story found:
for story in local_results:
    # Translate headline to English
    story.headline_en = translate(story.headline, from='${config.country.language}', to='en')
    
    # Translate article summary/content to English  
    story.content_en = translate(story.content, from='${config.country.language}', to='en')
    
    # Keep original source URL for fact checking
    story.source_url = story.url
\`\`\`

**CRITICAL**: All story content MUST be in English before writing the First Draft. The final podcast is in English.

**STEP 2: SCORE AND SELECT STORIES**

Score each translated story 1-10 using BBC news values:
- **Immediacy**: How recent/timely is the story?
- **Proximity**: Relevance to ${config.country.name} and ${config.continent.name}
- **Consequence**: Impact on listeners' lives
- **Prominence**: Importance of people/places involved
- **Human Interest**: Emotional connection, relatability

**AUTO-SELECT**: 
- Top 5 highest-scored **${config.country.name}** stories (from ${config.country.language} sources, translated)
- Top 3 highest-scored **${config.continent.name}** stories (from English sources)

**Topic Priority**: Selected topics (${config.topics.join(', ')}) > General News (fallback)

**STEP 3: WRITE FIRST DRAFT**

1. Generate initial BBC-standard script using auto-selected stories (all in English)
2. Include all music cues per configuration
3. Follow section structure: Opening → Headlines → ${config.country.name} Block → ${config.continent.name} Block${config.includeEditorialSegment ? ' → Editorial Segment' : ''} → Sign-off

**STORY COMPLETENESS REQUIREMENTS - ALL MANDATORY, NO EXCEPTIONS:**

- **MANDATORY MINIMUM LENGTH**: Each story MUST be AT LEAST 1500 characters. Stories under 1500 chars are INCOMPLETE and must be expanded.
- **MANDATORY SENTENCE LENGTH DISTRIBUTION**: At least 60% of sentences must be 15-30 words. Average sentence length must be >15 words.
- **MANDATORY INTERNATIONAL CONTEXT**: Each story MUST include comprehensive background for listeners unfamiliar with local politics/culture. NO ASSUMPTIONS of prior knowledge.
- **MANDATORY TERM DEFINITIONS**: ALL local terms, acronyms, organizations, and political concepts MUST be defined on first mention. NO UNDEFINED TERMS allowed.
- **MANDATORY 5 Ws + How**: EVERY story MUST answer Who, What, When, Where, Why, and How. Missing any = INCOMPLETE.
- **MANDATORY HISTORICAL CONTEXT**: If story references past events, historical context MUST be provided. NO EXCEPTIONS.
- **MANDATORY CONCEPT EXPLANATION**: Country-specific terminology MUST be fully explained. NO UNEXPLAINED CONCEPTS.
- **MANDATORY ZERO-KNOWLEDGE ASSUMPTION**: Write for listeners with ZERO prior knowledge of the country's political system, geography, or recent history.
- **MANDATORY CONTINENT-SPECIFIC ANGLE FOR ${config.continent.name} NEWS**: 
  - If a story is happening OUTSIDE ${config.continent.name}, it MUST have a ${config.continent.name}-specific angle (impact on ${config.continent.name}, ${config.continent.name} involvement, etc.)
  - ${config.continent.name} news stories MUST start with "In [country within ${config.continent.name}]..."
  - Stories about other continents WITHOUT a ${config.continent.name} angle are REJECTED

4. Pass to Editor

**EDITORIAL PERSPECTIVE FOR FIRST DRAFT**

When writing the first draft script, frame all facts through ${biasLabel} perspective.

**How to Apply ${biasLabel}:**

${biasAgent1Instructions[config.bias]}

**REMEMBER**: Same facts, different framing. Never invent facts. Never omit relevant facts.

${config.includeEditorialSegment ? `**EDITORIAL SEGMENT REQUIREMENTS:**
- Include Editorial Segment after ${config.continent.name} News block
- Minimum 2500 characters
- Apply ${biasLabel} perspective MOST prominently (higher intensity than news segments)
- Analyze themes from both ${config.country.name} and ${config.continent.name} blocks
- Provide closure and wrap up the podcast` : ''}

**Output Format**:
\`\`\`
## FIRST DRAFT SCRIPT
[Full script with music cues - ALL IN ENGLISH]

## STORY SELECTION REPORT
- Topic Focus: ${config.topics.join(', ')}
- Fallback to General News: [Yes/No]
- ${config.country.name} Stories Selected: [5 stories with scores and sources]
  * From primary topics: [count]
  * From fallback (General News): [count]
  * Source: [local news source] (translated from ${config.country.language})
  * Original language: ${config.country.language}
  * Date: YYYY-MM-DD
- ${config.continent.name} Stories Selected: [3 stories with scores and sources]
  * Source: [international news source] (English)
  * Original language: English
  * Date: YYYY-MM-DD
- Selection Method: Auto-selected highest scores
- Translation: All ${config.country.language} content translated to English
\`\`\`

---

### AGENT 2: THE EDITOR
**Role**: Script Editor & Quality Gate
**Task**: Edit First Draft for BBC standards and clarity.

**Edit Checklist**:
1. **Opening Phrasing**: Must end exactly with: "These are today's headlines."
2. **Music Cues**: Verify [INTRO MUSIC] and [OUTRO MUSIC] are marked with specifications.
3. **Sting Placement**: [BLOCK TRANSITION STING] between all major sections.
4. **Story Stings**: [STORY STING] only between individual stories within blocks.
5. **Transitional Narration**: Confirm presence of bridge text.
6. **Block Structure**: Verify clear separation.
7. **${config.continent.name} Country Attribution**: Every ${config.continent.name} story must mention country name in first sentence.
8. **Topic Alignment**: Verify stories align with selected topics (${config.topics.join(', ')}). Flag any off-topic stories.
9. **Timeframe Parameters**: **CRITICAL** - Verify all 8 stories fall within the ${config.timeframe} window.
10. **Oral Readability**: Check sentence length distribution. 60%+ should be 15-30 words. Average >15 words.

**EDITOR COMPLETENESS AUDIT - REJECT IF ANY REQUIREMENT FAILS:**

- **REJECT IF UNDER 1500 CHARS**: Any story under 1500 characters is AUTOMATICALLY REJECTED. Return to Writer for mandatory expansion.
- **REJECT IF <60% OF SENTENCES ARE 15-30 WORDS**: At least 60% of sentences must be 15-30 words.
- **REJECT IF AVERAGE SENTENCE LENGTH <15 WORDS**: Average sentence length must be >15 words.
- **REJECT IF INTERNATIONAL LISTENER WOULD GOOGLE**: If a listener from another continent wouldn't understand without searching, REJECT.
- **REJECT IF ANY UNDEFINED TERMS**: Every local reference, term, acronym, organization MUST be defined. Missing any = REJECT.
- **REJECT IF MISSING 5 Ws + HOW**: Who, What, When, Where, Why, How must ALL be answered. Missing any = REJECT.
- **REJECT IF UNDEFINED POLITICAL/GEOGRAPHICAL CONCEPTS**: All concepts must be defined for international audience. Undefined = REJECT.
- **REJECT IF ASSUMES PRIOR KNOWLEDGE**: Any story assuming listener knows country's internal affairs = REJECT.
- **REJECT IF ${config.country.name} STORIES IN ${config.continent.name} BLOCK**: Continent block must ONLY contain other ${config.continent.name} countries.
- **REJECT IF ${config.continent.name} NEWS LACKS CONTINENT ANGLE**: Stories happening outside ${config.continent.name} WITHOUT ${config.continent.name}-specific angle = REJECT.
- **REJECT IF ${config.continent.name} NEWS DOESN'T START WITH "In [country]..."**: Must specify which ${config.continent.name} country the story is about.

**BIAS VERIFICATION - MANDATORY:**

Verify the script correctly applies **${biasLabel}** perspective:

- [ ] Headlines reflect ${biasLabel} framing (not neutral)
- [ ] Story order prioritizes ${biasLabel} priorities
- [ ] Language choices align with ${biasLabel} terminology
- [ ] Quote selection gives voice to ${biasLabel}-aligned sources
- [ ] No contradictory framing from opposing perspectives (unless for contrast)

**REJECT IF BIAS IS INCORRECT OR INCONSISTENT:**

If the draft reads like a different bias was applied:
- Return to Agent 1 with specific feedback
- Example: "This reads Moderate, but ${biasLabel} was selected. Add more focus on policy impact on workers."

**BIAS CONSISTENCY CHECK:**
- Does the entire script maintain ${biasLabel} throughout?
- Are there sections that suddenly sound neutral or opposite-bias?
- If inconsistent: REJECT and request rewrite with consistent ${biasLabel} framing

${config.includeEditorialSegment ? `**EDITORIAL SEGMENT VERIFICATION:**

- [ ] Minimum 2500 characters
- [ ] ${biasLabel} especially prominent (more intense than news segments)
- [ ] Connects themes from both ${config.country.name} and ${config.continent.name} news
- [ ] Provides analytical closure (not just summary)
- [ ] Natural transition to sign-off
- [ ] Sentence length: 60% between 15-30 words, average >15

**REJECT IF:**
- Editorial is neutral/balanced when ${biasLabel} was selected
- Less than 2500 characters
- Doesn't reference themes from the broadcast
- Sounds like a separate piece (disconnected from news)
- Bias intensity is same as or less than news segments` : ''}

**NO APPROVAL UNTIL ALL REQUIREMENTS PASS. NO EXCEPTIONS.**

**Approval Status**: [REJECTED / CONDITIONAL / BBC CLEARED Phase 1]

---

### AGENT 3: THE WRITER
**Role**: Final Script Writer
**Task**: Produce final broadcast-ready script.

**Input**: Editor's Phase 1 BBC CLEARED script
**Output**: Final Script (Phase 2 COMPLETE)

**Writing Standards**:
1. **Active Voice**: Every sentence must use active voice (Subject-Verb-Object)
2. **No Passive Voice**: Flag and rewrite any "was," "were," "been," "being" constructions
3. **Present Tense for Current Events**: Use present tense for ongoing/developing stories
4. **Past Tense for Completed Events**: Use past tense for concluded events
5. **Oral Readability**: Natural sentence length distribution: 60%+ of sentences 15-30 words, average >15 words, simple words, no jargon
6. **BBC Style**: Objective, authoritative, no editorializing
7. **Music Cues**: Preserve all [INTRO MUSIC], [OUTRO MUSIC], [STORY STING], [BLOCK TRANSITION STING]
8. **Transitional Narration**: Maintain bridge text between sections
9. **${config.continent.name} Country Attribution**: First sentence of every ${config.continent.name} story MUST name the country

**PHASE 2: POLISH FOR ${biasLabel.toUpperCase()} IMPACT**

Polish the approved script to maximize ${biasLabel} clarity and impact:

- Strengthen ${biasLabel} framing where weak
- Ensure consistent ${biasLabel} terminology
- Verify ${biasLabel} perspective is clear in every segment
- Maintain oral readability (60% sentences 15-30 words, average >15)
- Keep all facts accurate and verifiable

${config.includeEditorialSegment ? `**EDITORIAL SEGMENT POLISH:**
- Strengthen ${biasLabel} framing for maximum impact
- Ensure thematic connections between stories are clear
- Verify minimum 2500 characters
- Maintain connection to reported stories (don't go off-topic)
- Ensure smooth transition to sign-off` : ''}

**Output Format**:
\`\`\`
## FINAL SCRIPT (Phase 2 COMPLETE)
[Full polished script]

## WRITER'S NOTES
- Active voice check: [PASS/FAIL]
- Tense consistency: [PASS/FAIL]
- Oral readability: [PASS/FAIL]
- Music cues preserved: [PASS/FAIL]
- Country attribution verified: [PASS/FAIL]
- ${biasLabel} framing consistent: [PASS/FAIL]
\`\`\`

---

### AGENT 4: FACT CHECKER
**Role**: Verification Specialist
**Task**: Verify every factual claim against official sources.

**Verification Method:** For each of the 8 stories:
1. Extract core factual claims (who, what, when, where, numbers, quotes)
2. Execute web search against **official news sources only**:
   - ${config.country.name} sources (${config.country.language}): ${countrySourcesList}
   - ${config.continent.name} sources (English): ${continentSourcesList}
3. For ${config.country.name} stories: Search in **${config.country.language}** using local sources to verify original reporting
   - **TRANSLATE search terms**: Convert English topic terms to ${config.country.language} when searching local sources
4. For ${config.continent.name} stories: Search in **English** using international sources
5. Verify each claim appears in independent sources
6. **Timeframe check:** Ensure sources date from **${earliestDate} to ${today}**
7. **${config.continent.name} Country Check:** Verify the country named in first sentence matches the actual geography

**Output Format:** Create news_fact_check.json:
\`\`\`json
{
  "check_date": "${today}",
  "coverage_period": "${earliestDate} to ${today}",
  "script_phase": "Phase 2 COMPLETE",
  "overall_status": "PASS" | "ISSUES_FOUND",
  "stories": [
    {
      "story_id": 1,
      "section": "${config.country.name} Local",
      "headline": "[Exact headline from script]",
      "original_language": "${config.country.language}",
      "grade": "FACT CHECKED FULLY CORRECT" | "FACT CHECK PARTIALLY CORRECT" | "FACT CHECK FAILED",
      "verified_sources": ["${config.country.newsSources[0] || 'Local Source'}", "${config.country.newsSources[1] || 'Local Source'}"],
      "source_languages": ["${config.country.language}", "English"],
      "source_dates": ["YYYY-MM-DD", "YYYY-MM-DD"],
      "unverified_claims": ["Specific claim not found"],
      "researcher_action": "NONE" | "VERIFY_ADDITIONAL" | "REPLACE_STORY",
      "notes": "All core facts verified in ${config.country.language} sources for the coverage period"
    }
  ]
}
\`\`\`

---

### AGENT 5: RESEARCHER (CONDITIONAL)
**Role**: Fact Recovery Specialist
**Trigger**: Only activate if Fact Checker reports ISSUES_FOUND
**Task**: Fix or replace failed stories

**For FACT CHECK FAILED Stories:**
1. Search for alternative facts that support the same narrative/theme from **${earliestDate} to ${today}** using appropriate language:
   - For ${config.country.name} stories: Search in **${config.country.language}** using sources: ${countrySourcesList}
     - **TRANSLATE**: Convert English topic terms to ${config.country.language} for local source searches
   - For ${config.continent.name} stories: Search in **English** using sources: ${continentSourcesList}
2. If hallucination is severe, search for a replacement story from **${earliestDate} to ${today}** with same topic area
3. If replacing a ${config.continent.name} story, ensure new story has clear country attribution
4. Translate any ${config.country.language} content to English before providing to Writer
5. Update JSON with replacement details

**For FACT CHECK PARTIALLY CORRECT Stories:**
1. Execute additional targeted web search for corroborating sources in the appropriate language
2. If ≥2nd source found: Update grade to FACT CHECKED FULLY CORRECT
3. If no 2nd source found: Note single-source reporting

**Output Format:**
\`\`\`json
{
  "recovery_actions": [
    {
      "story_id": 3,
      "action": "REPLACED",
      "new_headline": "[New headline]",
      "replacement_sources": ["${config.country.newsSources[0] || 'Local Source'}", "${config.continent.newsSources[0]?.name || 'CNN'}"],
      "source_languages": ["${config.country.language}", "English"],
      "writer_instructions": "Replace Story 3 with: [new headline and facts in English]"
    }
  ]
}
\`\`\`

---

### AGENT 6: AUDIO PRODUCER
**Role**: Audio Production Specialist
**Task**: Generate all audio files and assemble final podcast

#### Music Generation (using voice ID \`XB0fDUnXU5powFXDhCwa\` - Bella voice for musical generation)

**STEP 1: GENERATE MUSIC FILES**

Generate 13 separate music/audio files:

\`\`\`python
# 1. INTRO MUSIC (${config.musicSuite.intro.duration}, ${config.musicSuite.intro.description}, ${config.musicSuite.intro.mood})
intro_music = generate_speech(
    text="[${config.musicSuite.intro.description} - ${config.musicSuite.intro.duration}, ${config.musicSuite.intro.mood}]",
    voice='XB0fDUnXU5powFXDhCwa'
)
# Save as: 01_intro_music.mp3

# 2. OUTRO MUSIC (${config.musicSuite.outro.duration}, ${config.musicSuite.outro.description}, ${config.musicSuite.outro.mood})
outro_music = generate_speech(
    text="[${config.musicSuite.outro.description} - ${config.musicSuite.outro.duration}, ${config.musicSuite.outro.mood}]",
    voice='XB0fDUnXU5powFXDhCwa'
)
# Save as: 02_outro_music.mp3

# 3a. BLOCK TRANSITION STING (${config.musicSuite.blockSting.duration})
block_sting_1 = generate_speech(
    text="[${config.musicSuite.blockSting.description} - ${config.musicSuite.blockSting.duration}]",
    voice='XB0fDUnXU5powFXDhCwa'
)
# Save as: 03a_block_opening.mp3

# 3b. BLOCK TRANSITION STING (${config.musicSuite.blockSting.duration})
block_sting_2 = generate_speech(
    text="[${config.musicSuite.blockSting.description} - ${config.musicSuite.blockSting.duration}]",
    voice='XB0fDUnXU5powFXDhCwa'
)
# Save as: 03b_block_headlines.mp3

# 3c. BLOCK TRANSITION STING (${config.musicSuite.blockSting.duration})
block_sting_3 = generate_speech(
    text="[${config.musicSuite.blockSting.description} - ${config.musicSuite.blockSting.duration}]",
    voice='XB0fDUnXU5powFXDhCwa'
)
# Save as: 03c_block_country.mp3

# 3d. BLOCK TRANSITION STING (${config.musicSuite.blockSting.duration})
block_sting_4 = generate_speech(
    text="[${config.musicSuite.blockSting.description} - ${config.musicSuite.blockSting.duration}]",
    voice='XB0fDUnXU5powFXDhCwa'
)
# Save as: 03d_block_continent.mp3

# 4a-f. STORY STINGS (6 files, ${config.musicSuite.storySting.duration} each)
for i in range(6):
    story_sting = generate_speech(
        text="[${config.musicSuite.storySting.description} - ${config.musicSuite.storySting.duration}]",
        voice='XB0fDUnXU5powFXDhCwa'
    )
    # Save as: 04a_story_1.mp3 through 04f_story_6.mp3
\`\`\`

**STEP 2: GENERATE NARRATION FILES**

Generate 13 separate narration files (one per story/segment):

\`\`\`python
# 5. OPENING NARRATION
opening = generate_speech(
    text="[Opening script text - \"These are today's headlines.\"]",
    voice='${config.voice.voiceId}'
)
# Save as: 05_opening.mp3

# 6. HEADLINES NARRATION
headlines = generate_speech(
    text="[Headlines summary text]",
    voice='${config.voice.voiceId}'
)
# Save as: 06_headlines.mp3

# 7a-e. COUNTRY STORY NARRATIONS (5 files)
for i in range(5):
    country_story = generate_speech(
        text="[Country story text]",
        voice='${config.voice.voiceId}'
    )
    # Save as: 07a_country_1.mp3 through 07e_country_5.mp3

# 8a-c. CONTINENT STORY NARRATIONS (3 files)
for i in range(3):
    continent_story = generate_speech(
        text="[Continent story text]",
        voice='${config.voice.voiceId}'
    )
    # Save as: 08a_continent_1.mp3 through 08c_continent_3.mp3

# 9a-b. TRANSITION NARRATIONS (2 files)
trans_1 = generate_speech(
    text="[Transition text - \"And now, our top stories in depth...\"]",
    voice='${config.voice.voiceId}'
)
# Save as: 09a_transition_1.mp3

trans_2 = generate_speech(
    text="[Transition text - \"And now to our top stories from ${config.continent.name}.\"]",
    voice='${config.voice.voiceId}'
)
# Save as: 09b_transition_2.mp3

# 10. SIGN-OFF NARRATION
signoff = generate_speech(
    text="[Sign-off text]",
    voice='${config.voice.voiceId}'
)
# Save as: 10_signoff.mp3
\`\`\`

**STEP 3: ASSEMBLE FINAL COMBINED AUDIO**

**CRITICAL RULE: MUSIC AND NARRATION MUST NEVER OVERLAP**

Music and narration playing simultaneously sounds unprofessional. Always separate them:
- Music plays FIRST (alone) → FADE OUT → Narration plays SECOND (alone)
- NO simultaneous playback

Use Python with pydub to combine ALL audio segments into ONE final file:

\`\`\`python
from pydub import AudioSegment

# Load all audio files
intro_music = AudioSegment.from_mp3("/mnt/okcomputer/output/01_intro_music.mp3")
opening_narration = AudioSegment.from_mp3("/mnt/okcomputer/output/05_opening.mp3")
block_sting_1 = AudioSegment.from_mp3("/mnt/okcomputer/output/03a_block_opening.mp3")
headlines_narration = AudioSegment.from_mp3("/mnt/okcomputer/output/06_headlines.mp3")
# ... (load all 26 segments)

# Set levels (music at full volume, voice at full volume)
# DO NOT attenuate - they play separately, not together

# Assemble in exact order - SEQUENTIALLY, NOT OVERLAPPED:
final_audio = intro_music  # Music plays alone
final_audio += opening_narration  # Then narration plays alone
final_audio += block_sting_1  # Then sting plays alone
final_audio += headlines_narration  # Then narration plays alone
# ... (continue appending all segments in order)
final_audio += outro_music.overlay(signoff)

# Add 0.5s silence padding
silence = AudioSegment.silent(duration=500)
final_audio = silence + final_audio + silence

# Export final file
final_audio.export("/mnt/okcomputer/output/${outputFilename}", 
                   format="mp3", bitrate="320k")
\`\`\`

**CRITICAL**: The final output MUST be a single combined MP3 file at 320kbps. Do NOT output separate files.

---

## EXECUTION WORKFLOW

1. **Agent 1** (Researcher) → First Draft Script
2. **Agent 2** (Editor) → Phase 1 BBC CLEARED (or REJECTED → back to Agent 1)
3. **Agent 3** (Writer) → Phase 2 COMPLETE
4. **Agent 4** (Fact Checker) → Verification Report
5. **Agent 5** (Researcher - IF NEEDED) → Fix Issues

**CRITICAL FINAL APPROVAL GATE:**
6. **Agent 2** (Editor - FINAL CHECK) → **MUST VERIFY ALL REQUIREMENTS BEFORE AUDIO - ALL MANDATORY, NO EXCEPTIONS:**

   **REJECT IF UNDER 1500 CHARS**: Any story under 1500 characters is AUTOMATICALLY REJECTED. Return to Writer for mandatory expansion.
   
   **REJECT IF <60% OF SENTENCES ARE 15-30 WORDS**: At least 60% of sentences must be 15-30 words.
   
   **REJECT IF AVERAGE SENTENCE LENGTH <15 WORDS**: Average sentence length must be >15 words.
   
   **REJECT IF INTERNATIONAL LISTENER WOULD GOOGLE**: If a listener from another continent wouldn't understand without searching, REJECT.
   
   **REJECT IF ANY UNDEFINED TERMS**: Every local reference, term, acronym, organization MUST be defined. Missing any = REJECT.
   
   **REJECT IF MISSING 5 Ws + HOW**: Who, What, When, Where, Why, How must ALL be answered. Missing any = REJECT.
   
   **REJECT IF UNDEFINED POLITICAL/GEOGRAPHICAL CONCEPTS**: All concepts must be defined for international audience. Undefined = REJECT.
   
   **REJECT IF ASSUMES PRIOR KNOWLEDGE**: Any story assuming listener knows country's internal affairs = REJECT.
   
   **REJECT IF ${config.country.name} STORIES IN ${config.continent.name} BLOCK**: Continent block must ONLY contain other ${config.continent.name} countries.
   
   **REJECT IF ${config.continent.name} NEWS LACKS CONTINENT ANGLE**: Stories happening outside ${config.continent.name} WITHOUT ${config.continent.name}-specific angle (impact on ${config.continent.name}, ${config.continent.name} involvement) = REJECT.
   
   **REJECT IF ${config.continent.name} NEWS DOESN'T START WITH "In [country]..."**: Must specify which ${config.continent.name} country the story is about.
   
   **REJECT IF BIAS IS INCORRECT OR INCONSISTENT**: If the draft reads like a different bias was applied: REJECT.
   
   **NO APPROVAL UNTIL ALL REQUIREMENTS PASS. NO EXCEPTIONS.**
   
   **IF ANY REQUIREMENT FAILS:**
   → Return to **Agent 3 (Writer)** for fixes
   → **Agent 4 (Fact Checker)** verifies the fixes
   → **Agent 5 (Researcher - IF NEEDED)** only if Fact Checker finds NEW factual issues
   → Back to **Agent 2 (Editor)** for re-approval
   
   **LOOP:** Writer → Fact Checker → (Researcher if needed) → Editor
   **Repeat until Editor confirms ALL requirements pass**
   
   **ONLY WHEN EDITOR APPROVES ALL:** Forward to Agent 6

7. **Agent 6** (Audio Producer) → Final MP3

**NO HUMAN IN THE LOOP** - Agents communicate via structured output only.

${config.includeEditorialSegment ? `---

### EDITORIAL SEGMENT

**Position**: After Continent News block, before Sign-off

**Purpose**: Provide thematic analysis and editorial closure

**Requirements:**
- **Minimum Length**: 2500 characters
- **Bias Intensity**: HIGHEST - ${biasLabel} perspective MOST prominent here
- **Content**: Analyze main themes from ${config.country.name} and ${config.continent.name} news
- **Style**: Editorial/opinion, not neutral reporting

**Structure:**
1. **Opening Hook** (2-3 sentences)
   - Reference 2-3 key stories from the broadcast
   - Set up the analytical frame

2. **Thematic Analysis** (60% of segment)
   - Connect dots between different stories
   - Identify patterns and trends across both blocks
   - Apply ${biasLabel} interpretive lens

3. **${biasLabel} Perspective** (30% of segment)
   - Explicitly state the ${biasLabel} viewpoint
   - Why these stories matter through ${biasLabel} lens
   - What should be done (policy/cultural implications)

4. **Closing** (10% of segment)
   - Memorable final thought
   - Return to big picture
   - Transition to sign-off

**${biasLabel} Editorial Guidelines:**

${biasEditorialGuidelines[config.bias]}

**CRITICAL**: Editorial must feel like natural conclusion, connected to reported stories. Never invent facts.` : ''}
`;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Newsroom</h1>
              <p className="text-sm text-slate-400">Configure your automated news podcast</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Configuration */}
          <div className="space-y-4">
            
            {/* Geographic Selection */}
            <Section icon={Globe} title="Geographic Selection">
              <div className="space-y-3">
                <CountrySearch value={selectedCountry} onChange={handleCountrySelect} />
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Continent: {selectedContinent.name}</span>
                  <span>•</span>
                  <span>{selectedCountry.newsSources.length} news sources</span>
                </div>
                <CountryMap selectedCountry={selectedCountry} selectedContinent={selectedContinent} />
              </div>
            </Section>

            {/* Timeframe */}
            <Section icon={Clock} title="Timeframe">
              <div className="grid grid-cols-3 gap-2">
                {timeframes.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => setSelectedTimeframe(tf.value)}
                    className={cn(
                      "p-3 rounded-lg border text-center transition-all",
                      selectedTimeframe === tf.value
                        ? "bg-blue-900/30 border-blue-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                    )}
                  >
                    <div className="font-medium">{tf.label.split(' ')[0]}</div>
                    <div className="text-xs opacity-70">{tf.days} day{tf.days > 1 ? 's' : ''}</div>
                  </button>
                ))}
              </div>
            </Section>

            {/* Topics */}
            <Section icon={Newspaper} title="Topics">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {topics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => handleTopicToggle(topic)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm text-left transition-all border",
                      selectedTopics.includes(topic)
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-slate-800 border-transparent text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selected: {selectedTopics.length}/3
              </p>
            </Section>

            {/* Voice Selection */}
            <Section icon={Mic2} title="Voice Selection">
              <div className="space-y-2">
                {voices.map(voice => {
                  const isSelected = selectedVoice.id === voice.id;
                  const isPlaying = playingVoiceId === voice.id;
                  return (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                        isSelected
                          ? "bg-blue-900/30 border-blue-500"
                          : "bg-slate-800 border-slate-700 hover:bg-slate-750"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-blue-500/20" : "bg-slate-700"
                      )}>
                        <Mic2 className={cn("w-5 h-5", isSelected ? "text-blue-400" : "text-slate-400")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium", isSelected ? "text-white" : "text-slate-300")}>
                            {voice.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {voice.gender === 'male' ? '♂' : '♀'} {voice.accent}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 truncate">{voice.description}</p>
                      </div>
                      <button
                        onClick={(e) => handleVoicePreview(voice, e)}
                        className={cn(
                          "p-2 rounded-full transition-colors flex-shrink-0",
                          isPlaying
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
                        )}
                        title="Preview voice"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Editorial Settings */}
            <Section icon={Scale} title="Editorial Settings">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Editorial Perspective</h3>
                  <BiasSelector value={selectedBias} onChange={setSelectedBias} />
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {biasOptions.find(b => b.id === selectedBias)?.label} Perspective
                  </h4>
                  <div className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                    {biasAgent1Instructions[selectedBias]}
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEditorialSegment}
                      onChange={(e) => setIncludeEditorialSegment(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-300">Include Editorial Segment</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* Music Suite */}
            <Section icon={Music} title="Music Suite">
              <div className="space-y-3">
                {([
                  { key: 'intro', label: 'Intro Music' },
                  { key: 'outro', label: 'Outro Music' },
                  { key: 'storySting', label: 'Story Sting' },
                  { key: 'blockSting', label: 'Block Transition' }
                ] as const).map(slot => {
                  const selectedStyle = selectedMusicSuite[slot.key];
                  const isPlaying = playingMusic?.category === slot.key && playingMusic?.styleId === selectedStyle.id;
                  return (
                    <div key={slot.key} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                      <div className="text-sm font-medium text-slate-300 mb-2">{slot.label}</div>
                      <div className="flex gap-2">
                        <select
                          value={selectedStyle.id}
                          onChange={(e) => {
                            const style = musicStyles.find(s => s.id === e.target.value);
                            if (style) {
                              setSelectedMusicSuite(prev => ({ ...prev, [slot.key]: style }));
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {musicStyles.map(style => (
                            <option key={style.id} value={style.id}>
                              {style.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={(e) => handleMusicPreview(slot.key, selectedStyle, e)}
                          className={cn(
                            "px-3 py-2 rounded transition-colors flex items-center gap-1 flex-shrink-0",
                            isPlaying
                              ? "bg-blue-500 text-white"
                              : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
                          )}
                          title="Preview music style"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 truncate">
                        {selectedStyle.description} • {selectedStyle.mood}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-4">
            
            {/* Configuration Summary */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Configuration Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Country</span>
                  <span className="text-white">{selectedCountry.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timeframe</span>
                  <span className="text-white">{timeframes.find(t => t.value === selectedTimeframe)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Topics</span>
                  <span className="text-white">{selectedTopics.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Voice</span>
                  <span className="text-white">{selectedVoice.label}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500">Country Sources</span>
                  <span className="text-white text-right">{selectedCountry.newsSources.join(', ')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500">Continent Sources</span>
                  <span className="text-white text-right">{selectedContinent.newsSources.map(s => s.name).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Editorial Perspective</span>
                  <span className="text-white">{biasOptions.find(b => b.id === selectedBias)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Include Editorial Segment</span>
                  <span className="text-white">{includeEditorialSegment ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleCopyPrompt}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-700 transition-all"
            >
              <FileText className="w-5 h-5" />
              {copied ? 'Copied!' : 'Copy Podcast Prompt'}
            </button>

            {/* Character Counter */}
            <div className="flex justify-end px-1">
              <span className="text-xs text-slate-500">
                {promptResult.length.toLocaleString()} characters
              </span>
            </div>

            {/* Generated Prompt */}
            <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                <span className="text-sm font-medium text-slate-300">Generated Prompt</span>
                <button
                  onClick={handleCopyPrompt}
                  className="p-1.5 rounded hover:bg-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
              <pre className="p-4 text-xs text-slate-400 overflow-auto max-h-[500px] whitespace-pre-wrap">
                {promptResult}
              </pre>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Section component
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

export default App;
