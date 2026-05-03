/**
 * Fast fallback test — 3 countries, 2 topics, 3 URLs each.
 * Completes within 60s window.
 */

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
if (!BRAVE_API_KEY) { console.error("ERROR: Set BRAVE_API_KEY"); process.exit(1); }

const BRAVE_BASE_URL = "https://api.search.brave.com/res/v1/web/search";

async function braveSearch(query: string, count = 10) {
  const url = new URL(BRAVE_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(count, 20)));
  url.searchParams.set("safesearch", "off");
  url.searchParams.set("freshness", "week");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "X-Subscription-Token": BRAVE_API_KEY! },
  });
  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  const data = await res.json();
  return data.web?.results ?? [];
}

async function jinaFetch(url: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`, {
      signal: ctrl.signal, headers: { Accept: "text/plain" },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, text: "", err: `HTTP ${res.status}` };
    const text = await res.text();
    const wc = text.split(/\s+/).filter((w) => w.length > 0).length;
    const low = text.toLowerCase();
    if (wc < 80) return { ok: false, text, err: `short ${wc}w` };
    if (low.includes("subscribe to continue") || low.includes("log in to read") || low.includes("access denied"))
      return { ok: false, text, err: "paywall" };
    return { ok: true, text, wc };
  } catch (e: any) {
    return { ok: false, text: "", err: e.name === "AbortError" ? "timeout" : e.message };
  }
}

async function directFetch(url: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      signal: ctrl.signal, redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    clearTimeout(t);
    if (!res.ok) return { ok: false, text: "", err: `HTTP ${res.status}` };
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return { ok: false, text: "", err: `ctype ${ct}` };
    const html = await res.text();
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&\w+;/g, " ")
      .replace(/\s+/g, " ").trim();
    const wc = text.split(/\s+/).filter((w) => w.length > 0).length;
    const low = text.toLowerCase();
    if (wc < 80) return { ok: false, text, err: `short ${wc}w` };
    if (low.includes("subscribe to continue") || low.includes("log in to read") || low.includes("access denied"))
      return { ok: false, text, err: "paywall" };
    return { ok: true, text, wc };
  } catch (e: any) {
    return { ok: false, text: "", err: e.name === "AbortError" ? "timeout" : e.message };
  }
}

const TESTS = [
  { country: "Sweden", continent: "Europe", topics: ["politik", "ekonomi"] },
  { country: "United Kingdom", continent: "Europe", topics: ["politics", "economy"] },
  { country: "United States", continent: "North America", topics: ["politics", "economy"] },
  { country: "Germany", continent: "Europe", topics: ["politik", "wirtschaft"] },
];

async function run() {
  const rows: any[] = [];
  let total = 0;

  for (const t of TESTS) {
    for (const topic of t.topics) {
      for (const scope of ["local", "continent"]) {
        const q = scope === "local" ? `${topic} ${t.country} news` : `${topic} ${t.continent} news`;
        console.log(`\n🔍 ${t.country} ${scope.toUpperCase()} — ${topic}`);
        const res = await braveSearch(q, 10);
        for (const r of res.slice(0, 3)) {
          const url = r.url;
          const src = new URL(url).hostname;
          total++;
          console.log(`  ${src}`);

          const jina = await jinaFetch(url);
          let tier = 0, wc = 0, preview = "";

          if (jina.ok) {
            tier = 1; wc = jina.wc; preview = jina.text.slice(0, 100);
            console.log(`    T1 Jina   → OK (${wc}w)`);
          } else {
            console.log(`    T1 Jina   → FAIL (${jina.err})`);
            const direct = await directFetch(url);
            if (direct.ok) {
              tier = 2; wc = direct.wc; preview = direct.text.slice(0, 100);
              console.log(`    T2 Direct → OK (${wc}w)`);
            } else {
              console.log(`    T2 Direct → FAIL (${direct.err})`);
              const descWc = (r.description || "").split(/\s+/).filter((w: string) => w.length > 0).length;
              if (descWc >= 20) {
                tier = 3; wc = descWc; preview = (r.description || "").slice(0, 100);
                console.log(`    T3 Desc   → OK (${wc}w)`);
              } else {
                console.log(`    T3 Desc   → FAIL (${descWc}w)`);
              }
            }
          }

          rows.push({ country: t.country, topic, scope, url, source: src, title: r.title, tier, wc, preview: preview.replace(/\n/g, " ") });
        }
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("FALLBACK TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`Total URLs: ${total}\n`);

  const t1 = rows.filter((r) => r.tier === 1).length;
  const t2 = rows.filter((r) => r.tier === 2).length;
  const t3 = rows.filter((r) => r.tier === 3).length;
  const t0 = rows.filter((r) => r.tier === 0).length;

  console.log(`Tier 1 (Jina)          ${t1}/${total} (${((t1 / total) * 100).toFixed(1)}%)`);
  console.log(`Tier 2 (Direct fetch)  ${t2}/${total} (${((t2 / total) * 100).toFixed(1)}%)`);
  console.log(`Tier 3 (Description)   ${t3}/${total} (${((t3 / total) * 100).toFixed(1)}%)`);
  console.log(`Tier 0 (Total failure) ${t0}/${total} (${((t0 / total) * 100).toFixed(1)}%)`);
  console.log(`\nRecovery with fallbacks: ${((1 - t0 / total) * 100).toFixed(1)}%`);

  console.log("\n--- By Country ---");
  for (const c of [...new Set(rows.map((r) => r.country))]) {
    const subset = rows.filter((r) => r.country === c);
    const ok = subset.filter((r) => r.tier >= 1).length;
    console.log(`  ${c.padEnd(20)} ${((ok / subset.length) * 100).toFixed(0)}% (${ok}/${subset.length})`);
  }

  console.log("\n--- Sources rescued by Tier 2 ---");
  for (const r of rows.filter((r) => r.tier === 2)) {
    console.log(`  ${r.source} — ${r.title.slice(0, 55)}`);
  }

  const fs = await import("fs");
  fs.writeFileSync("/workspaces/Ai-newsroom/scripts/fallback-results-fast.json", JSON.stringify(rows, null, 2));
  console.log("\nSaved to fallback-results-fast.json");
}

run().catch((e) => { console.error(e); process.exit(1); });
