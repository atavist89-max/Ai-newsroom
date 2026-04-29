# Implementation Plan: Full Segment Architecture (Option A)

## Goal
Replace the current monolithic draft pipeline with a file-based segment system. Agent 1 writes individual segment files (`intro.txt`, `Topic1.txt`...`Topic7.txt`, `outro.txt`) via `@capacitor/filesystem`. The Full Script Editor audits both cross-segment coherence and per-segment quality. Routing branches to either Full Script Writer (rewrite everything) or Segment Writer (rewrite only failing segments), followed by Assembler concatenation back into `full_script.txt`.

## Architecture

### File Layout (app private directory)
```
Directory.Data/newsroom/
  full_script.txt          # Assembled complete script
  intro.txt                # Intro segment
  Topic1.txt               # Topic 1 segment
  ...
  Topic7.txt               # Topic 7 segment
  outro.txt                # Outro segment
```

### XML Segment Format
Agent 1 outputs:
```xml
<segment id="intro">
  Good morning, this is AI Newsroom...
</segment>
<segment id="topic1" topic="Politics">
  In breaking news...
</segment>
...
<segment id="outro">
  That's all for today...
</segment>
```
Audio Producer strips XML tags via regex before TTS.

## Implementation Steps

### Step 1: Infrastructure — fileManager.ts + scriptParser.ts
- `src/lib/fileManager.ts`: Write/read/list/delete files in `Directory.Data/newsroom/`. Handles permissions. Supports both private (`Directory.Data`) and external (`Directory.Documents`) storage based on user toggle. Uses `@capacitor/filesystem`.
- `src/lib/scriptParser.ts`: `parseFullScript(text)` → `Segment[]`; `assembleFullScript(segments)` → string; `stripXmlTags(text)` → string; `extractSegment(id, text)` → string.

### Step 2: Update Agent 1 — Write segment files
- Modify `src/agents/agent1.ts`: After streaming completes, parse draft into segments, write each to individual `.txt` file via `fileManager.writeSegment()`, then assemble and write `full_script.txt`.
- Update `src/prompts/agent1.ts`: Add XML segment output instructions.

### Step 3: Rename Gate 1 → Full Script Editor
- Rename `src/agents/gate1.ts` → `src/agents/fullScriptEditor.ts`
- Rename `src/prompts/gate1.ts` → `src/prompts/fullScriptEditor.ts`
- Update prompt to include `rewrite_scope` field: `"FULL_SCRIPT"` or `"SEGMENTS"`, plus `failed_segments: number[]` when scope is SEGMENTS.
- Update prompt to audit both per-segment quality and cross-segment coherence.

### Step 4: Rename Agent 3 → Full Script Writer
- Rename `src/agents/agent3.ts` → `src/agents/fullScriptWriter.ts`
- Rename `src/prompts/agent3.ts` → `src/prompts/fullScriptWriter.ts`
- Update to read `full_script.txt`, rewrite entire script, write updated segment files.

### Step 5: Create Segment Writer + Segment Editor
- `src/agents/segmentWriter.ts`: Reads specific failing `TopicN.txt` files + adjacent segments for transition context. Rewrites only those segments. Does NOT modify approved segments.
- `src/agents/segmentEditor.ts`: Audits rewritten segments only (not full script). Checks per-segment quality within the context of adjacent segments.
- `src/prompts/segmentWriter.ts` + `src/prompts/segmentEditor.ts`: Scoped prompts.

### Step 6: Create Assembler stage
- `src/agents/assembler.ts`: Pure code — reads all `intro.txt` + `Topic1-7.txt` + `outro.txt`, concatenates into `full_script.txt`. No LLM call. Routes back to Full Script Editor for cross-theme re-verify.

### Step 7: Update pipeline routing
- Update `src/lib/pipelineTypes.ts`: New stage IDs: `'agent1' | 'fullScriptEditor' | 'fullScriptWriter' | 'segmentWriter' | 'segmentEditor' | 'assembler' | 'gate2' | 'agent5' | 'gate3' | 'agent6'`
- Update `src/lib/pipeline.ts` `getNextStage()`:
  - `agent1` → `fullScriptEditor`
  - `fullScriptEditor`: `rewrite_scope: "FULL_SCRIPT"` or cross-segment issues → `fullScriptWriter`
  - `fullScriptEditor`: `rewrite_scope: "SEGMENTS"` → `segmentWriter`
  - `fullScriptWriter` → `fullScriptEditor`
  - `segmentWriter` → `segmentEditor`
  - `segmentEditor`: REJECTED → `segmentWriter`
  - `segmentEditor`: APPROVED → `assembler`
  - `assembler` → `fullScriptEditor` (re-verify cross-segment coherence after partial rewrite)
  - `fullScriptEditor` (after assembler, APPROVED) → `gate2`
  - `gate2` APPROVED → `gate3` → `agent6` → COMPLETE

### Step 8: Update UI — StageDetail tabs + Config toggle
- Update `src/components/pipeline/StageDetail.tsx`: Handle new stage IDs. Assembler shows file list.
- Update `src/components/ConfigureApiScreen.tsx`: Add "File Storage Access" toggle. On Android, requests `READ_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE` permissions via Capacitor. Falls back to private `Directory.Data` if denied. Stores preference in `@capacitor/preferences`.
- Update `AndroidManifest.xml`: Add `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` permissions.

### Step 9: Test and build
- Run TypeScript checks: `npx tsc --noEmit`
- Sync Capacitor: `npx cap sync android`
- Build APK: push to `AI-Newsroom-Full-App` branch

## Files to Modify
- `src/lib/fileManager.ts` (new)
- `src/lib/scriptParser.ts` (new)
- `src/lib/pipelineTypes.ts`
- `src/lib/pipeline.ts`
- `src/agents/agent1.ts`
- `src/agents/gate1.ts` → `src/agents/fullScriptEditor.ts`
- `src/agents/agent3.ts` → `src/agents/fullScriptWriter.ts`
- `src/agents/segmentWriter.ts` (new)
- `src/agents/segmentEditor.ts` (new)
- `src/agents/assembler.ts` (new)
- `src/prompts/agent1.ts`
- `src/prompts/gate1.ts` → `src/prompts/fullScriptEditor.ts`
- `src/prompts/agent3.ts` → `src/prompts/fullScriptWriter.ts`
- `src/prompts/segmentWriter.ts` (new)
- `src/prompts/segmentEditor.ts` (new)
- `src/components/pipeline/StageDetail.tsx`
- `src/components/ConfigureApiScreen.tsx`
- `android/app/src/main/AndroidManifest.xml`

## Trade-offs
- **+** Segment-level rewrites save API tokens when only 1-2 themes fail
- **+** Individual segment files enable manual editing in future
- **+** Assembler re-verify catches transition issues after partial rewrites
- **−** More stages = more code complexity
- **−** File I/O adds latency (but minimal — local filesystem)
