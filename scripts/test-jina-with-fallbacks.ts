/**
 * Jina Fetchability Test WITH Fallbacks (Option B Simulation)
 *
 * Tiers:
 *   1. Jina AI Reader
 *   2. Direct fetch with browser headers + HTML stripping
 *   3. Brave description (already available from search)
 *
 * Run with:
 *   BRAVE_API_KEY=xxx npx tsx scripts/test-jina-with-fallbacks.ts
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
  braveDescription: string;
  tier1Jina: { status: "success" | "fail"; wordCount: number; error?: string };
  tier2Direct: { status: "success" | "fail"; wordCount: number; error?: string };
  tier3Brave: { status: "success" | "fail"; wordCount: number };
  finalTier: 1 | 2 | 3 | 0;
  finalWordCount: number;
  finalPreview: string;
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

async function jinaFetch(url: string): Promise<{ text: string; status: "success" | "fail"; error?: string }> {
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
      return { text: "", status: "fail", error: `HTTP ${res.status}` };
    }

    const text = await res.text();
    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    const lower = text.toLowerCase();

    if (wordCount < 80) {
      return { text, status: "fail", error: `Only ${wordCount} words` };
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
      return { text, status: "fail", error: "Paywall/bot wall detected" };
    }

    return { text, status: "success" };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { text: "", status: "fail", error: "8s timeout" };
    }
    return { text: "", status: "fail", error: err.message };
  }
}

async function directFetch(url: string): Promise<{ text: string; status: "success" | "fail"; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { text: "", status: "fail", error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return { text: "", status: "fail", error: `Content-Type: ${contentType}` };
    }

    const html = await res.text();

    // Simple HTML stripping — remove script/style, then tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();

    const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
    const lower = text.toLowerCase();

    if (wordCount < 80) {
      return { text, status: "fail", error: `Only ${wordCount} words after stripping` };
    }
    if (
      lower.includes("subscribe to continue") ||
      lower.includes("log in to read") ||
      lower.includes("sign up to read") ||
      lower.includes("please enable javascript") ||
      lower.includes("access denied")
    ) {
      return { text, status: "fail", error: "Paywall detected in raw text" };
    }

    return { text, status: "success" };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { text: "", status: "fail", error: "8s timeout" };
    }
    return { text: "", status: "fail", error: err.message };
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
      for (const scope of ["local", "continent"] as const) {
        const query = scope === "local"
          ? `${topic} ${testCase.countryName} news`
          : `${topic} ${testCase.continent} news`;

        console.log(`\n🔍 ${testCase.countryName} ${scope.toUpperCase()} — ${topic}`);
        try {
          const searchResults = await braveSearch(query, 10);
          for (const r of searchResults.slice(0, 3)) {
            const url = r.url;
            const source = new URL(url).hostname;
            const braveDescription = r.description || "";
            totalFetched++;

            console.log(`  ${source}`);

            // Tier 1: Jina
            const jina = await jinaFetch(url);
            let finalTier: 1 | 2 | 3 | 0 = 0;
            let finalWordCount = 0;
            let finalPreview = "";

            if (jina.status === "success") {
              finalTier = 1;
              finalWordCount = jina.text.split(/\s+/).filter((w) => w.length > 0).length;
              finalPreview = jina.text.slice(0, 120);
              console.log(`    T1 Jina        → SUCCESS (${finalWordCount} words)`);
            } else {
              console.log(`    T1 Jina        → FAIL (${jina.error})`);

              // Tier 2: Direct fetch
              const direct = await directFetch(url);
              if (direct.status === "success") {
                finalTier = 2;
                finalWordCount = direct.text.split(/\s+/).filter((w) => w.length > 0).length;
                finalPreview = direct.text.slice(0, 120);
                console.log(`    T2 Direct      → SUCCESS (${finalWordCount} words)`);
              } else {
                console.log(`    T2 Direct      → FAIL (${direct.error})`);

                // Tier 3: Brave description
                const descWords = braveDescription.split(/\s+/).filter((w) => w.length > 0).length;
                if (descWords >= 20) {
                  finalTier = 3;
                  finalWordCount = descWords;
                  finalPreview = braveDescription.slice(0, 120);
                  console.log(`    T3 Description → SUCCESS (${finalWordCount} words)`);
                } else {
                  console.log(`    T3 Description → FAIL (only ${descWords} words)`);
                }
              }
            }

            results.push({
              country: testCase.countryName,
              topic,
              scope,
              url,
              source,
              title: r.title,
              braveDescription,
              tier1Jina: {
                status: jina.status === "success" ? "success" : "fail",
                wordCount: jina.text ? jina.text.split(/\s+/).filter((w) => w.length > 0).length : 0,
                error: jina.error,
              },
              tier2Direct: {
                status: "fail",
                wordCount: 0,
              },
              tier3Brave: {
                status: braveDescription.split(/\s+/).filter((w) => w.length > 0).length >= 20 ? "success" : "fail",
                wordCount: braveDescription.split(/\s+/).filter((w) => w.length > 0).length,
              },
              finalTier,
              finalWordCount,
              finalPreview: finalPreview.replace(/\n/g, " "),
            });

            // Re-populate tier2 info for the record
            const last = results[results.length - 1];
            if (finalTier === 2) {
              // We need to fetch again or cache — for simplicity, re-run direct or estimate
              // Actually, let's just re-run it since we need the data
              const directRetry = await directFetch(url);
              last.tier2Direct = {
                status: directRetry.status === "success" ? "success" : "fail",
                wordCount: directRetry.text ? directRetry.text.split(/\s+/).filter((w) => w.length > 0).length : 0,
                error: directRetry.error,
              };
            } else if (finalTier === 1) {
              // Still run direct to record the fail
              const directRetry = await directFetch(url);
              last.tier2Direct = {
                status: directRetry.status === "success" ? "success" : "fail",
                wordCount: directRetry.text ? directRetry.text.split(/\s+/).filter((w) => w.length > 0).length : 0,
                error: directRetry.error,
              };
            }
          }
        } catch (err: any) {
          console.error(`  Brave search failed: ${err.message}`);
        }
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log("FETCHABILITY WITH FALLBACKS (OPTION B SIMULATION)");
  console.log("=".repeat(70));
  console.log(`Total URLs tested: ${totalFetched}\n`);

  // Tier 1 only
  const t1Success = results.filter((r) => r.tier1Jina.status === "success").length;
  console.log(`Tier 1 (Jina only):           ${t1Success}/${totalFetched} (${((t1Success / totalFetched) * 100).toFixed(1)}%)`);

  // Tier 1 + Tier 2
  const t2Success = results.filter((r) => r.finalTier === 1 || r.finalTier === 2).length;
  console.log(`Tier 1+2 (Jina + Direct):     ${t2Success}/${totalFetched} (${((t2Success / totalFetched) * 100).toFixed(1)}%)`);

  // Tier 1 + Tier 2 + Tier 3
  const t3Success = results.filter((r) => r.finalTier >= 1).length;
  console.log(`Tier 1+2+3 (+ Description):   ${t3Success}/${totalFetched} (${((t3Success / totalFetched) * 100).toFixed(1)}%)`);

  // Breakdown by final tier
  const byTier: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const r of results) byTier[r.finalTier]++;

  console.log("\n--- Final Tier Distribution ---");
  console.log(`  Tier 1 (Full text via Jina)     ${byTier[1]} (${((byTier[1] / totalFetched) * 100).toFixed(1)}%)`);
  console.log(`  Tier 2 (Full text via Direct)   ${byTier[2]} (${((byTier[2] / totalFetched) * 100).toFixed(1)}%)`);
  console.log(`  Tier 3 (Partial via Brave desc) ${byTier[3]} (${((byTier[3] / totalFetched) * 100).toFixed(1)}%)`);
  console.log(`  Tier 0 (Total failure)          ${byTier[0]} (${((byTier[0] / totalFetched) * 100).toFixed(1)}%)`);

  // By country
  console.log("\n--- By Country (Tier 1+2+3) ---");
  const byCountry: Record<string, { total: number; success: number }> = {};
  for (const r of results) {
    if (!byCountry[r.country]) byCountry[r.country] = { total: 0, success: 0 };
    byCountry[r.country].total++;
    if (r.finalTier >= 1) byCountry[r.country].success++;
  }
  for (const [country, stats] of Object.entries(byCountry)) {
    const pct = ((stats.success / stats.total) * 100).toFixed(1);
    console.log(`  ${country.padEnd(20)} ${pct}% (${stats.success}/${stats.total})`);
  }

  // Word counts by tier
  const t1Words = results.filter((r) => r.finalTier === 1).map((r) => r.finalWordCount);
  const t2Words = results.filter((r) => r.finalTier === 2).map((r) => r.finalWordCount);
  const t3Words = results.filter((r) => r.finalTier === 3).map((r) => r.finalWordCount);

  console.log("\n--- Word Count by Tier ---");
  if (t1Words.length > 0) {
    const avg = t1Words.reduce((a, b) => a + b, 0) / t1Words.length;
    console.log(`  Tier 1 avg: ${avg.toFixed(0)} words (${t1Words.length} articles)`);
  }
  if (t2Words.length > 0) {
    const avg = t2Words.reduce((a, b) => a + b, 0) / t2Words.length;
    console.log(`  Tier 2 avg: ${avg.toFixed(0)} words (${t2Words.length} articles)`);
  }
  if (t3Words.length > 0) {
    const avg = t3Words.reduce((a, b) => a + b, 0) / t3Words.length;
    console.log(`  Tier 3 avg: ${avg.toFixed(0)} words (${t3Words.length} articles)`);
  }

  // Sources that Tier 2 rescued
  console.log("\n--- Sources Rescued by Tier 2 (Direct Fetch) ---");
  const rescued = results.filter((r) => r.finalTier === 2);
  for (const r of rescued) {
    console.log(`  ${r.source} — ${r.title.slice(0, 60)}`);
  }

  // Save
  const fs = await import("fs");
  const outPath = "/workspaces/Ai-newsroom/scripts/jina-fallback-results.json";
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to: ${outPath}`);
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
