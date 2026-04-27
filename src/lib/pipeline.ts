import type {
  AgentMap,
  AgentContext,
  PipelineState,
  PipelineCallbacks,
  StageId,
  StageRecord,
  StageStatus,
} from './pipelineTypes';
import { STAGE_DEFINITIONS } from './pipelineTypes';
import type { SessionConfig } from './sessionConfig';

const MAX_RETRIES = 3;

function createInitialStages(): StageRecord[] {
  return STAGE_DEFINITIONS.map((def) => ({
    ...def,
    status: 'pending' as StageStatus,
    iteration: 0,
    reasoning: '',
    output: '',
  }));
}

function createInitialState(): PipelineState {
  return {
    status: 'idle',
    currentStageId: null,
    selectedStageId: null,
    stages: createInitialStages(),
    currentDraft: '',
    finalDraft: null,
    error: null,
    factCheckLoops: 0,
    finalCheckLoops: 0,
  };
}

export class PipelineRunner {
  private state: PipelineState;
  private callbacks: PipelineCallbacks;
  private agents: AgentMap;
  private abortController: AbortController | null = null;

  constructor(agents: AgentMap, callbacks: PipelineCallbacks) {
    this.agents = agents;
    this.callbacks = callbacks;
    this.state = createInitialState();
  }

  private updateState(partial: Partial<PipelineState>) {
    this.state = { ...this.state, ...partial };
    this.callbacks.onStateChange(this.state);
  }

  private updateStage(stageId: StageId, partial: Partial<StageRecord>) {
    const stages = this.state.stages.map((s) =>
      s.id === stageId ? { ...s, ...partial } : s
    );
    this.updateState({ stages });
  }

  async run(sessionConfig: SessionConfig) {
    this.abortController = new AbortController();
    this.updateState({
      ...createInitialState(),
      status: 'running',
    });

    try {
      let stage: StageId = 'agent1';
      let draft = '';
      let feedback: unknown = undefined;

      while (true) {
        if (this.abortController.signal.aborted) {
          throw new Error('Pipeline aborted by user');
        }

        const result = await this.executeStage(
          stage,
          sessionConfig,
          draft,
          feedback
        );

        draft = result.draft;
        feedback = result.metadata;

        // Determine next stage
        const next = this.getNextStage(stage, result.metadata);

        if (next === 'COMPLETE' || next === null) {
          this.updateState({
            status: 'complete',
            currentStageId: null,
            finalDraft: draft,
          });
          this.callbacks.onComplete(draft);
          return;
        }

        stage = next;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.updateState({ status: 'error', error: message });
      this.callbacks.onError(message);
    }
  }

  stop() {
    this.abortController?.abort();
  }

  getState(): PipelineState {
    return this.state;
  }

  private async executeStage(
    stageId: StageId,
    sessionConfig: SessionConfig,
    currentDraft: string,
    feedback: unknown
  ) {
    const agent = this.agents[stageId];

    // Increment iteration
    const existingStage = this.state.stages.find((s) => s.id === stageId)!;
    const iteration = existingStage.iteration + 1;

    this.updateStage(stageId, {
      status: 'running',
      iteration,
      reasoning: '',
      output: '',
      startedAt: new Date().toISOString(),
    });
    this.updateState({ currentStageId: stageId });

    const ctx: AgentContext = {
      sessionConfig,
      currentDraft,
      feedback,
    };

    let retries = 0;
    while (true) {
      try {
        const reasoningChunks: string[] = [];

        const result = await agent(ctx, (chunk) => {
          reasoningChunks.push(chunk);
          this.updateStage(stageId, {
            reasoning: reasoningChunks.join(''),
          });
        });

        const status = this.inferStatus(stageId, result.metadata);

        this.updateStage(stageId, {
          status,
          output: result.draft,
          metadata: result.metadata,
          completedAt: new Date().toISOString(),
        });

        return result;
      } catch (err) {
        retries++;
        if (retries >= MAX_RETRIES) {
          this.updateStage(stageId, {
            status: 'error',
            output: `Failed after ${MAX_RETRIES} attempts: ${err instanceof Error ? err.message : String(err)}`,
            completedAt: new Date().toISOString(),
          });
          throw err;
        }
        // Wait before retry
        await new Promise((r) => setTimeout(r, 1000 * retries));
      }
    }
  }

  private inferStatus(stageId: StageId, metadata: unknown): StageStatus {
    if (!metadata || typeof metadata !== 'object') return 'completed';

    const m = metadata as Record<string, unknown>;

    if (stageId === 'gate1' || stageId === 'gate3') {
      const status = m.approval_status;
      if (status === 'REJECTED') return 'rejected';
      return 'completed';
    }

    if (stageId === 'gate2') {
      const status = m.overall_status;
      if (status === 'ISSUES_FOUND') return 'rejected';
      return 'completed';
    }

    return 'completed';
  }

  private getNextStage(current: StageId, metadata: unknown): StageId | 'COMPLETE' {
    if (!metadata || typeof metadata !== 'object') {
      // Fallback: just proceed linearly
      const flow: StageId[] = ['agent1', 'gate1', 'agent3', 'gate2', 'agent5', 'gate3', 'agent6'];
      const idx = flow.indexOf(current);
      if (idx === -1 || idx === flow.length - 1) return 'COMPLETE';
      return flow[idx + 1];
    }

    const m = metadata as Record<string, unknown>;

    switch (current) {
      case 'agent1':
        return 'gate1';

      case 'gate1': {
        if (m.approval_status === 'REJECTED') {
          this.updateState({
            finalCheckLoops: this.state.finalCheckLoops + 1,
          });
          return 'agent1';
        }
        return 'agent3';
      }

      case 'agent3':
        return 'gate2';

      case 'gate2': {
        if (m.overall_status === 'ISSUES_FOUND') {
          this.updateState({
            factCheckLoops: this.state.factCheckLoops + 1,
          });
          return 'agent5';
        }
        return 'gate3';
      }

      case 'agent5':
        return 'agent3';

      case 'gate3': {
        if (m.approval_status === 'REJECTED') {
          this.updateState({
            finalCheckLoops: this.state.finalCheckLoops + 1,
          });
          return 'agent3';
        }
        return 'agent6';
      }

      case 'agent6':
        return 'COMPLETE';

      default:
        return 'COMPLETE';
    }
  }
}
