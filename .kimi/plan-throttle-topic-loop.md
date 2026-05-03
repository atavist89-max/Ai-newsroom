# Plan: Fix Topic Loop UI Crash

## Problem
When the parallel topic loop runs and the first Segment Writer starts, the UI disappears leaving only the background color. The pipeline backend continues running.

## Root Cause

**Primary: Unthrottled state updates from 7 parallel streaming workers overwhelm the renderer.**

- `executeTopicAgent` calls `updateTopicStatus(topicIndex, { reasoning: ... })` on **every single LLM reasoning chunk**
- With 7 topics streaming simultaneously, this produces **35–140 state updates per second**
- React 18 automatic batching only works within a single synchronous tick. LLM stream chunks arrive via `fetch` `ReadableStream` — each chunk resolves in a **separate microtask**, so they are NOT batched
- On a mobile Capacitor WebView, this volume of unbatched re-renders exhausts the JS thread or renderer memory, causing the WebView to kill the render process → blank screen

**Secondary: `TopicAuditSection` crashes on non-AuditResult metadata.**
- `TopicAuditSection` blindly casts `topic.metadata as AuditResult` and calls `audit.stories.reduce()`
- After the Segment Writer completes, `metadata` becomes writer metadata (`{ rewrittenSegmentId, mechanicalRetries, streamDiagnostics }`) — **not** an `AuditResult`
- If the user has a topic expanded at that moment, `audit.stories` is `undefined` and `.reduce()` throws a `TypeError`

## Approach

### Option A: Throttle React notifications during topic loop (Recommended)

Keep `PipelineRunner.this.state` updated synchronously (so backend logic is correct), but throttle the `onStateChange` callback to React to ~20Hz (50ms interval) while the topic loop is active. Flush any pending update immediately when the loop completes or the pipeline stops.

**Trade-offs:**
- ✅ Minimal code change — only touches `updateState` and `runParallelTopicLoop`
- ✅ Backend logic unchanged — `this.state` is always up-to-date
- ✅ UI still feels responsive — 50ms is imperceptible for status transitions
- ✅ No changes needed to agent code or components

### Option B: Debounce inside each worker

Add debouncing to the `onReasoningChunk` callback inside `executeTopicAgent`, so each worker only calls `updateTopicStatus` at most every 50ms.

**Trade-offs:**
- ❌ More complex — need per-worker debounce state
- ❌ Still allows 7 concurrent updates (one per worker) every 50ms = 140 updates/sec
- ❌ Less effective than Option A

### Option C: Virtualize / memoize the topic loop UI

Wrap `TopicLoopDetail` and `TopicLoopCard` in `React.memo` with custom comparison, so unchanged topics don't re-render.

**Trade-offs:**
- ❌ Doesn't address the root cause (frequent `setState` calls still fire)
- ❌ Adds complexity with custom comparison logic
- ❌ Mobile WebView crash is likely from JS thread exhaustion, not just React reconciliation

## Implementation (Option A)

### Step 1: Throttle state notifications in `PipelineRunner`

**File:** `src/lib/pipeline.ts`

Add to `PipelineRunner` class:
- `private topicLoopUpdateTimer: ReturnType<typeof setTimeout> | null = null`
- Modify `updateState()` to throttle `onStateChange` calls when `this.state.topicLoop?.isActive` is true
- Add `private flushTopicUpdates(): void` to immediately push pending state

```typescript
private updateState(partial: Partial<PipelineState>): void {
  this.state = { ...this.state, ...partial };
  this.notifyStateChange();
}

private notifyStateChange(): void {
  if (this.state.topicLoop?.isActive) {
    if (!this.topicLoopUpdateTimer) {
      this.topicLoopUpdateTimer = setTimeout(() => {
        this.topicLoopUpdateTimer = null;
        this.callbacks.onStateChange(this.state);
      }, 50);
    }
  } else {
    this.callbacks.onStateChange(this.state);
  }
}

private flushTopicUpdates(): void {
  if (this.topicLoopUpdateTimer) {
    clearTimeout(this.topicLoopUpdateTimer);
    this.topicLoopUpdateTimer = null;
    this.callbacks.onStateChange(this.state);
  }
}
```

### Step 2: Flush pending updates at loop completion

**File:** `src/lib/pipeline.ts`

In `runParallelTopicLoop()`, after `Promise.allSettled(workers)` and after the stall recovery loop, call `this.flushTopicUpdates()` before returning.

Also call `this.flushTopicUpdates()` in the `stop()` method so the UI gets the final state when the user aborts.

### Step 3: Harden `TopicAuditSection` against invalid metadata

**File:** `src/components/pipeline/StageDetail.tsx`

Replace the blind cast with runtime validation:

```typescript
function TopicAuditSection({ audit }: { audit: unknown }) {
  const a = audit as Record<string, unknown> | undefined;
  const stories = Array.isArray(a?.stories) ? a.stories : [];
  
  if (stories.length === 0) {
    return (
      <div className="text-[11px] text-slate-500 bg-slate-800/50 rounded p-2">
        No audit data available.
      </div>
    );
  }
  
  // ... rest of component using validated `stories` array
}
```

Update the call site in `TopicDetailRow`:
```typescript
<TopicAuditSection audit={topic.metadata} />
```

### Step 4: Add defensive guards to `TopicLoopDetail` and `TopicDetailRow`

**File:** `src/components/pipeline/StageDetail.tsx`

- In `TopicLoopDetail`: verify `topicLoop.topics` is an array before mapping
- In `TopicDetailRow`: add optional chaining for `topic.lastError` (already uses `?.` but verify)
- In `TopicDot`: ensure `topic.state` default handling covers unexpected values

### Step 5: Verify build

Run `npx tsc --noEmit` and `npx vite build` to confirm no TypeScript or bundling errors.

## Files to Modify

1. `src/lib/pipeline.ts` — throttle logic + flush calls
2. `src/components/pipeline/StageDetail.tsx` — harden `TopicAuditSection`, `TopicLoopDetail`, `TopicDetailRow`

## Estimated Time
- Implementation: 15 minutes
- Build verification: 5 minutes
