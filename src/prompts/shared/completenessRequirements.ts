/**
 * Permanent, session-independent theme completeness requirements.
 * These rules apply to ALL theme summaries regardless of configuration.
 *
 * Placeholder variables (replaced at runtime by prompt builders):
 *   [COUNTRY_NAME]      — e.g. "France"
 *   [CONTINENT_NAME]    — e.g. "Europe"
 *   [COUNTRY_LANGUAGE]  — e.g. "French"
 *   [BIAS_LABEL]        — e.g. "Moderate"
 */

export const THEME_COMPLETENESS_REQUIREMENTS = `**THEME COMPLETENESS GUIDELINES — These are the editorial standards the Editor will evaluate against:**

- **Length**: Aim for ~2000+ characters per theme. The Editor checks for under-length themes, so write freely and let the Editor catch shortfalls.
- **Sentence variety**: Mix sentence lengths naturally. Most sentences should fall in the 15–30 word range. Don't stop to count — the Editor checks this.
- **Multiple developments**: Weave together at least 3 distinct angles, events, or trends per theme. If you only have 1–2, note it in the selection report and write what you have.
- **International context**: Assume the listener has never visited [COUNTRY_NAME] and knows nothing about its politics or culture. Provide background as you go.
- **Term definitions**: Define local terms, acronyms, organizations, and political concepts on first mention. Write as if explaining to a curious outsider.
- **Historical context**: When referencing past events, give just enough background for the listener to understand why it matters now.
- **Zero-knowledge tone**: Write for someone hearing about [COUNTRY_NAME] for the first time. No "as everyone knows" or assumed context.
- **Forward-looking close**: End each theme with a "what to watch" or "what happens next" sentence.
- **Source attribution**: Name specific sources in the text (e.g., "According to Le Monde...") rather than generic "reports say."

**BIAS GUIDANCE — Frame the draft through a [BIAS_LABEL] lens:**

- Headlines and framing should reflect [BIAS_LABEL] priorities, not neutral wire-service language
- Choose language that aligns with how [BIAS_LABEL] sources talk about these issues
- When selecting which developments to emphasize, prioritize those most relevant to [BIAS_LABEL] concerns
- Give voice to [BIAS_LABEL]-aligned perspectives; avoid drifting into neutral or opposite framing
- It's fine to mention opposing views for contrast, but the overall narrative should feel like it comes from a [BIAS_LABEL] newsroom

**Do not verify, count, or self-edit against these guidelines while drafting. The Editor will audit them. Your job is to write the best first draft you can in one continuous flow.**`;
