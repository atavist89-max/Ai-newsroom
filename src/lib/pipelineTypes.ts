import type { SessionConfig } from './sessionConfig';

export type StageId = 'agent1' | 'gate1' | 'agent3' | 'gate2' | 'agent5' | 'gate3' | 'agent6';

export type StageStatus = 'pending' | 'running' | 'completed' | 'rejected' | 'error';

export interface StageRecord {
  id: StageId;
  name: string;
  shortName: string;
  icon: string;
  status: StageStatus;
  iteration: number;
  reasoning: string;
  output: string;
  prompt?: string;
  metadata?: unknown;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentContext {
  sessionConfig: SessionConfig;
  currentDraft: string;
  iteration: number;
  feedback?: unknown;
}

export interface AgentOutput {
  draft: string;
  reasoning: string;
  metadata?: unknown;
  prompt?: string;
}

export type AgentFn = (
  ctx: AgentContext,
  onReasoningChunk: (chunk: string) => void,
  onUpdate?: (partial: Partial<StageRecord>) => void
) => Promise<AgentOutput>;

export type PipelineStatus = 'idle' | 'running' | 'complete' | 'error';

export interface PipelineState {
  status: PipelineStatus;
  currentStageId: StageId | null;
  selectedStageId: StageId | null;
  stages: StageRecord[];
  currentDraft: string;
  finalDraft: string | null;
  error: string | null;
  factCheckLoops: number;
  finalCheckLoops: number;
}

export interface PipelineCallbacks {
  onStateChange: (state: PipelineState) => void;
  onComplete: (finalDraft: string) => void;
  onError: (error: string) => void;
}

export interface AgentMap {
  agent1: AgentFn;
  gate1: AgentFn;
  agent3: AgentFn;
  gate2: AgentFn;
  agent5: AgentFn;
  gate3: AgentFn;
  agent6: AgentFn;
}

// Structured audit types for Editor gates (Agent 2 Phase 1 & Final)
export interface RuleResult {
  rule_name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  /** Required when status === 'FAIL'. Tells the Writer WHAT to fix and WHY. */
  rejection_reason?: string;
}

export interface StoryAudit {
  story_id: number;
  rules: RuleResult[];
}

export interface AuditResult {
  approval_status: 'APPROVED' | 'REJECTED';
  stories: StoryAudit[];
  /** Aggregate guidance built from all rejection_reasons. Passed to Writer on rejection. */
  rewriter_instructions: string;
  /** True if the editor has ANY observations, even minor suggestions. False only if draft is perfect. */
  has_feedback: boolean;
}

export const STAGE_DEFINITIONS: Omit<StageRecord, 'status' | 'iteration' | 'reasoning' | 'output' | 'metadata' | 'startedAt' | 'completedAt'>[] = [
  { id: 'agent1', name: 'Researcher', shortName: 'Research', icon: 'Search' },
  { id: 'gate1', name: 'Editor (Phase 1)', shortName: 'Edit 1', icon: 'ClipboardCheck' },
  { id: 'agent3', name: 'Writer', shortName: 'Write', icon: 'PenTool' },
  { id: 'gate2', name: 'Fact Checker', shortName: 'Fact', icon: 'ShieldCheck' },
  { id: 'agent5', name: 'Researcher (Fix)', shortName: 'Fix', icon: 'Wrench' },
  { id: 'gate3', name: 'Editor (Final)', shortName: 'Final', icon: 'CheckCircle' },
  { id: 'agent6', name: 'Audio Producer', shortName: 'Audio', icon: 'Headphones' },
];
