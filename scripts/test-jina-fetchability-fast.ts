/**
 * Jina AI Reader Fetchability Test (Fast Version)
 * Reduced scope to complete within 60s.
 *
 * Run with:
 *   BRAVE_API_KEY=xxx npx tsx scripts/test-jina-fetchability-fast.ts
 */

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
if (!BRAVE_API_KEY) {
  console.error("ERROR: Set BRAVE_API_KEY environment variable");
  process.exit(1);
}

const BRAVE_BASE_URL = "https://api.search.brave.com/res/v1/web/search";

interface TestResult {
  country: string;
  topic: string;
  scope: "local" | "continent";
  url: string;
  source: string;
  title: string;
  jinaStatus: "success" | "blocked" | "timeout" | "too_short" | "garbage" | "error";
  jinaWordCount: number;
  jinaPreview: string;
  errorMessage?: string;
}

async function braveSearch(query: string, count: number = 10): Promise<any[]> {
  const url = new URL(BRAVE_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(count, 20)));
  url.searchParams.set("safesearch", "off");
  url.searchParams.set("freshness", "week");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": BRAVE_API_KEY!,
    },
  });

  if (!res.ok) {
    throw new Error(`Brave HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return data.web?.results ?? [];
}

async function jinaFetch(url: string): Promise<{ text: string; status: TestResult["jinaStatus"]; error?: string }> {
  const jinaUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(jinaUrl, {
      signal: controller.signal,
      headers: { Accept: "text/plain" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 429) return { text: "", status: "blocked", error: "429 rate limit" };
      if (res.status === 403) return { text: "", status: "blocked", error: "403 forbidden" };
      return { text: "", status: "error", error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    const lower = text.toLowerCase();

    if (wordCount < 80) {
      return { text, status: "too_short", error: `Only ${wordCount} words` };
    }
    if (
      lower.includes("subscribe to continue") ||
      lower.includes("log in to read") ||
      lower.includes("sign up to read") ||
      lower.includes("please enable javascript") ||
      lower.includes("cookie policy") ||
      lower.includes("terms of service") ||
      lower.includes("access denied")
    ) {
      return { text, status: "blocked", error: "Paywall/bot wall detected in text" };
    }

    return { text, status: "success" };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { text: "", status: "timeout", error: "8s timeout" };
    }
    return { text: "", status: "error", error: err.message };
  }
}

const TEST_CASES = [
  { countryCode: "SE", countryName: "Sweden", continent: "Europe", topics: ["politik", "ekonomi"] },
  { countryCode: "GB", countryName: "United Kingdom", continent: "Europe", topics: ["politics", "economy"] },
  { countryCode: "US", countryName: "United States", continent: "North America", topics: ["politics", "economy"] },
  { countryCode: "DE", countryName: "Germany", continent: "Europe", topics: ["politik", "wirtschaft"] },
  { countryCode: "IN", countryName: "India", continent: "Asia", topics: ["politics", "economy"] },
];

async function runTest() {
  const results: TestResult[] = [];
  let totalFetched = 0;

  for (const testCase of TEST_CASES) {
    for (const topic of testCase.topics) {
      // Local
      const localQuery = `${topic} ${testCase.countryName} news`;
      console.log(`\n🔍 ${testCase.countryName} LOCAL — ${topic}`);
      try {
        const localResults = await braveSearch(localQuery, 10);
        for (const r of localResults.slice(0, 3)) {
          const url = r.url;
          const source = new URL(url).hostname;
          const jina = await jinaFetch(url);
          totalFetched++;
          results.push({
            country: testCase.countryName,
            topic,
            scope: "local",
            url,
            source,
            title: r.title,
            jinaStatus: jina.status,
            jinaWordCount: jina.text ? jina.text.split(/\s+/).filter((w) => w.length > 0).length : 0,
            jinaPreview: jina.text ? jina.text.slice(0, 120).replace(/\n/g, " ") : "",
            errorMessage: jina.error,
          });
          console.log(`  ${source} → ${jina.status}${jina.error ? ` (${jina.error})` : ""}`);
        }
      } catch (err: any) {
        console.error(`  Brave search failed: ${err.message}`);
      }

      // Continent
      const continentQuery = `${topic} ${testCase.continent} news`;
      console.log(`🔍 ${testCase.countryName} CONTINENT — ${topic}`);
      try {
        const continentResults = await braveSearch(continentQuery, 10);
        for (const r of continentResults.slice(0, 3)) {
          const url = r.url;
          const source = new URL(url).hostname;
          const jina = await jinaFetch(url);
          totalFetched++;
          results.push({
            country: testCase.countryName,
            topic,
            scope: "continent",
            url,
            source,
            title: r.title,
            jinaStatus: jina.status,
            jinaWordCount: jina.text ? jina.text.split(/\s+/).filter((w) => w.length > 0).length : 0,
            jinaPreview: jina.text ? jina.text.slice(0, 120).replace(/\n/g, " ") : "",
            errorMessage: jina.error,
          });
          console.log(`  ${source} → ${jina.status}${jina.error ? ` (${jina.error})` : ""}`);
        }
      } catch (err: any) {
        console.error(`  Brave search failed: ${err.message}`);
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("FETCHABILITY SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total URLs tested: ${totalFetched}`);

  const byStatus: Record<string, number> = {};
  for (const r of results) {
    byStatus[r.jinaStatus] = (byStatus[r.jinaStatus] || 0) + 1;
  }

  for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    const pct = ((count / totalFetched) * 100).toFixed(1);
    console.log(`  ${status.padEnd(12)} ${count.toString().padStart(3)} / ${totalFetched} (${pct}%)`);
  }

  const successRate = ((byStatus["success"] || 0) / totalFetched) * 100;
  console.log(`\nOverall fetchability: ${successRate.toFixed(1)}%`);

  console.log("\n--- By Country ---");
  const byCountry: Record<string, { total: number; success: number }> = {};
  for (const r of results) {
    if (!byCountry[r.country]) byCountry[r.country] = { total: 0, success: 0 };
    byCountry[r.country].total++;
    if (r.jinaStatus === "success") byCountry[r.country].success++;
  }
  for (const [country, stats] of Object.entries(byCountry)) {
    const pct = ((stats.success / stats.total) * 100).toFixed(1);
    console.log(`  ${country.padEnd(20)} ${pct}% (${stats.success}/${stats.total})`);
  }

  console.log("\n--- Top Blocked Domains ---");
  const blockedDomains: Record<string, number> = {};
  for (const r of results) {
    if (r.jinaStatus === "blocked" || r.jinaStatus === "too_short" || r.jinaStatus === "timeout") {
      blockedDomains[r.source] = (blockedDomains[r.source] || 0) + 1;
    }
  }
  const sortedBlocked = Object.entries(blockedDomains).sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [domain, count] of sortedBlocked) {
    console.log(`  ${domain.padEnd(30)} ${count}`);
  }

  const successes = results.filter((r) => r.jinaStatus === "success");
  const avgWords = successes.reduce((s, r) => s + r.jinaWordCount, 0) / (successes.length || 1);
  console.log(`\n--- Success Word Count ---`);
  console.log(`  Average: ${avgWords.toFixed(0)} words`);

  const fs = await import("fs");
  const outPath = "/workspaces/Ai-newsroom/scripts/jina-test-results.json";
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to: ${outPath}`);
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
