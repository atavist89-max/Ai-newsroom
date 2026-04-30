import type { SessionConfig } from './sessionConfig';

export type StageId =
  | 'agent1'
  | 'fullScriptEditor'
  | 'fullScriptWriter'
  | 'segmentWriter'
  | 'segmentEditor'
  | 'assembler'
  | 'agent6';

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
  segmentLoopIndex: number;
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
  editorLoops: number;
  segmentLoopIndex: number;
  hasRunTopicLoop: boolean;
}

export interface PipelineCallbacks {
  onStateChange: (state: PipelineState) => void;
  onComplete: (finalDraft: string) => void;
  onError: (error: string) => void;
}

export interface AgentMap {
  agent1: AgentFn;
  fullScriptEditor: AgentFn;
  fullScriptWriter: AgentFn;
  segmentWriter: AgentFn;
  segmentEditor: AgentFn;
  assembler: AgentFn;
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
  /** When scope is SEGMENTS, lists which story_ids failed and need rewriting. */
  rewrite_scope?: 'FULL_SCRIPT' | 'SEGMENTS';
  /** Story IDs that failed audit (1-7). Only present when rewrite_scope === 'SEGMENTS'. */
  failed_segments?: number[];
}

export interface MechanicalAudit {
  pass: boolean;
  length: { pass: boolean; actual: number; required: number };
  sentenceStructure: {
    pass: boolean;
    avgWords: number;
    percentInRange: number;
    sentencesAnalyzed: number;
    sentencesInRange: number;
  };
}

export const STAGE_DEFINITIONS: Omit<StageRecord, 'status' | 'iteration' | 'reasoning' | 'output' | 'metadata' | 'startedAt' | 'completedAt'>[] = [
  { id: 'agent1', name: 'Researcher', shortName: 'Research', icon: 'Search' },
  { id: 'fullScriptEditor', name: 'Full Script Editor', shortName: 'Full Edit', icon: 'ClipboardCheck' },
  { id: 'fullScriptWriter', name: 'Full Script Writer', shortName: 'Full Write', icon: 'PenTool' },
  { id: 'segmentWriter', name: 'Segment Writer', shortName: 'Seg Write', icon: 'FileEdit' },
  { id: 'segmentEditor', name: 'Segment Editor', shortName: 'Seg Edit', icon: 'FileCheck' },
  { id: 'assembler', name: 'Assembler', shortName: 'Assemble', icon: 'Layers' },
  { id: 'agent6', name: 'Audio Producer', shortName: 'Audio', icon: 'Headphones' },
];
