import type { Country, Continent, Timeframe, Topic, Voice, BiasPosition } from '../types';

export interface ConfigurationPromptParams {
  country: Country;
  continent: Continent;
  timeframe: Timeframe;
  topics: Topic[];
  voice: Voice;
  bias: BiasPosition;
  includeEditorialSegment: boolean;
}

export function buildConfigurationPrompt({
  country,
  continent,
  timeframe,
  topics,
  voice,
  bias,
  includeEditorialSegment,
}: ConfigurationPromptParams): string {
  const today = new Date().toISOString().split('T')[0];
  const timeframeConfig = {
    daily: { label: 'Daily Briefing', days: 1 },
    weekly: { label: 'Weekly Review', days: 7 },
    monthly: { label: 'Monthly Roundup', days: 30 },
  }[timeframe];
  const earliestDate = new Date(
    Date.now() - timeframeConfig.days * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .split('T')[0];

  return `**STEP 0: DETERMINE DATE RANGE**

First, establish the exact date range for news coverage:

\`\`\`python
from datetime import datetime, timedelta

# Get today's date
today = datetime.now().strftime("%Y-%m-%d")

# Calculate lookback based on timeframe (${timeframe})
if "${timeframe}" == "daily":
    lookback_days = 1
elif "${timeframe}" == "weekly":
    lookback_days = 7
else:  # monthly
    lookback_days = 30

# Calculate the earliest date for valid news
earliest_date = (datetime.now() - timedelta(days=lookback_days)).strftime("%Y-%m-%d")

print(f"Coverage period: {earliest_date} to {today}")
\`\`\`

### DISPLAY THE OUTPUT EXACTLY AND ONLY LIKE THIS. NO INTRODUCTIONS, NO OTHER INFORMATION, NO GROUPINGS OTHER THAN WHAT IS IN THE INSTRUCTIONS BELOW ###
Configuration 
- **Country**: ${country.name} 
- **Local Language**: ${country.language} 
- **Country News Sources**: ${country.newsSources.join(', ')}
- **Continent**: ${continent.name} 
- **Continent News Sources**: ${continent.newsSources.map(s => s.name).join(', ')}
- **Timeframe**: ${timeframeConfig.label} (past ${timeframeConfig.days} day${timeframeConfig.days > 1 ? 's' : ''}) — Coverage period: ${earliestDate} to ${today}
- **Topics**: ${topics.join(', ')} 
- **Voice**: ${voice.label} 
- **Editorial Perspective**: ${bias} 
- **Include Editorial Segment**: ${includeEditorialSegment ? 'Yes' : 'No'}
`;
}
