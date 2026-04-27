/**
 * Permanent, session-independent story completeness requirements.
 * These rules apply to ALL stories regardless of configuration.
 *
 * Placeholder variables (replaced at runtime by prompt builders):
 *   [COUNTRY_NAME]      — e.g. "France"
 *   [CONTINENT_NAME]    — e.g. "Europe"
 *   [COUNTRY_LANGUAGE]  — e.g. "French"
 *   [BIAS_LABEL]        — e.g. "Moderate"
 */

export const STORY_COMPLETENESS_REQUIREMENTS = `**STORY COMPLETENESS REQUIREMENTS - ALL MANDATORY, NO EXCEPTIONS:**

- **MANDATORY MINIMUM LENGTH**: Each story MUST be AT LEAST 1500 characters. Stories under 1500 chars are INCOMPLETE and must be expanded.
- **MANDATORY SENTENCE LENGTH DISTRIBUTION**: At least 60% of sentences must be 15-30 words. Average sentence length must be >15 words.
- **MANDATORY INTERNATIONAL CONTEXT**: Each story MUST include comprehensive background for listeners unfamiliar with local politics/culture. NO ASSUMPTIONS of prior knowledge.
- **MANDATORY TERM DEFINITIONS**: ALL local terms, acronyms, organizations, and political concepts MUST be defined on first mention. NO UNDEFINED TERMS allowed.
- **MANDATORY 5 Ws + How**: EVERY story MUST answer Who, What, When, Where, Why, and How. Missing any = INCOMPLETE.
- **MANDATORY HISTORICAL CONTEXT**: If story references past events, historical context MUST be provided. NO EXCEPTIONS.
- **MANDATORY CONCEPT EXPLANATION**: Country-specific terminology MUST be fully explained. NO UNEXPLAINED CONCEPTS.
- **MANDATORY ZERO-KNOWLEDGE ASSUMPTION**: Write for listeners with ZERO prior knowledge of the country's political system, geography, or recent history.
- **MANDATORY CONTINENT-SPECIFIC ANGLE FOR [CONTINENT_NAME] NEWS**:
  - If a story is happening OUTSIDE [CONTINENT_NAME], it MUST have a [CONTINENT_NAME]-specific angle (impact on [CONTINENT_NAME], [CONTINENT_NAME] involvement, etc.)
  - [CONTINENT_NAME] news stories MUST start with "In [country within [CONTINENT_NAME]]..."
  - Stories about other continents WITHOUT a [CONTINENT_NAME] angle are REJECTED`;

export const EDITOR_COMPLETENESS_AUDIT = `**EDITOR COMPLETENESS AUDIT - REJECT IF ANY REQUIREMENT FAILS:**

- **REJECT IF UNDER 1500 CHARS**: Any story under 1500 characters is AUTOMATICALLY REJECTED. Return to Writer for mandatory expansion.
- **REJECT IF <60% OF SENTENCES ARE 15-30 WORDS**: At least 60% of sentences must be 15-30 words.
- **REJECT IF AVERAGE SENTENCE LENGTH <15 WORDS**: Average sentence length must be >15 words.
- **REJECT IF INTERNATIONAL LISTENER WOULD GOOGLE**: If a listener from another continent wouldn't understand without searching, REJECT.
- **REJECT IF ANY UNDEFINED TERMS**: Every local reference, term, acronym, organization MUST be defined. Missing any = REJECT.
- **REJECT IF MISSING 5 Ws + HOW**: Who, What, When, Where, Why, How must ALL be answered. Missing any = REJECT.
- **REJECT IF UNDEFINED POLITICAL/GEOGRAPHICAL CONCEPTS**: All concepts must be defined for international audience. Undefined = REJECT.
- **REJECT IF ASSUMES PRIOR KNOWLEDGE**: Any story assuming listener knows country's internal affairs = REJECT.
- **REJECT IF [COUNTRY_NAME] STORIES IN [CONTINENT_NAME] BLOCK**: Continent block must ONLY contain other [CONTINENT_NAME] countries.
- **REJECT IF [CONTINENT_NAME] NEWS LACKS CONTINENT ANGLE**: Stories happening outside [CONTINENT_NAME] WITHOUT [CONTINENT_NAME]-specific angle = REJECT.
- **REJECT IF [CONTINENT_NAME] NEWS DOESN'T START WITH "In [country]..."**: Must specify which [CONTINENT_NAME] country the story is about.`;

export const BIAS_VERIFICATION_CHECKLIST = `**BIAS VERIFICATION - MANDATORY:**

Verify the script correctly applies **[BIAS_LABEL]** perspective:

- [ ] Headlines reflect [BIAS_LABEL] framing (not neutral)
- [ ] Story order prioritizes [BIAS_LABEL] priorities
- [ ] Language choices align with [BIAS_LABEL] terminology
- [ ] Quote selection gives voice to [BIAS_LABEL]-aligned sources
- [ ] No contradictory framing from opposing perspectives (unless for contrast)

**REJECT IF BIAS IS INCORRECT OR INCONSISTENT:**

If the draft reads like a different bias was applied:
- Return to Agent with specific feedback
- Example: "This reads Moderate, but [BIAS_LABEL] was selected. Add more focus on policy impact on workers."

**BIAS CONSISTENCY CHECK:**
- Does the entire script maintain [BIAS_LABEL] throughout?
- Are there sections that suddenly sound neutral or opposite-bias?
- If inconsistent: REJECT and request rewrite with consistent [BIAS_LABEL] framing`;
