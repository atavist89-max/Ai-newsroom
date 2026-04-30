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
import { PipelineService } from './pipelineService';
import { PipelineNotifications } from './pipelineNotifications';

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
    editorLoops: 0,
    segmentLoopIndex: -1,
  };
}

export class PipelineRunner {
  private state: PipelineState;
  private callbacks: PipelineCallbacks;
  private agents: AgentMap;
  private sessionConfig: SessionConfig | null = null;
  private abortController: AbortController | null = null;

  constructor(agents: AgentMap, callbacks: PipelineCallbacks) {
    this.agents = agents;
    this.callbacks = callbacks;
    this.state = createInitialState();
  }

  private updateState(partial: Partial<PipelineState>) {
    this.state = { ...this.state, ...partial };
    this.callbacks.onStateChange(this.state);
    this.updateNotification();
  }

  private updateNotification() {
    if (this.state.status !== 'running') return;
    const stage = this.state.currentStageId
      ? this.state.stages.find((s) => s.id === this.state.currentStageId)
      : null;
    const stageName = stage?.name ?? 'Starting...';
    const statusText = stage?.status === 'running'
      ? `${stageName} in progress...`
      : `Moving to ${stageName}...`;
    PipelineNotifications.update(statusText);
  }

  private updateStage(stageId: StageId, partial: Partial<StageRecord>) {
    const stages = this.state.stages.map((s) =>
      s.id === stageId ? { ...s, ...partial } : s
    );
    this.updateState({ stages });
  }

  async run(sessionConfig: SessionConfig) {
    this.abortController = new AbortController();
    await PipelineNotifications.start('Starting pipeline...');
    await PipelineService.start();
    this.updateState({
      ...createInitialState(),
      status: 'running',
    });

    try {
      this.sessionConfig = sessionConfig;
      let stage: StageId = 'agent1';
      let draft = '';
      let feedback: unknown = undefined;

      while (true) {
        if (this.abortController.signal.aborted) {
          throw new Error('Pipeline aborted by user');
        }

        console.log(`[Pipeline] >>> Stage ${stage} starting — draft length: ${draft.length}`);

        const result = await this.executeStage(
          stage,
          sessionConfig,
          draft,
          feedback
        );

        draft = result.draft;
        feedback = result.metadata;

        const preview = result.draft.length > 200
          ? `${result.draft.slice(0, 100)} ... ${result.draft.slice(-100)}`
          : result.draft;
        console.log(`[Pipeline] <<< Stage ${stage} completed — output draft length: ${result.draft.length}`);
        console.log(`[Pipeline] Draft preview: ${preview}`);

        // Determine next stage
        const next = this.getNextStage(stage, result.metadata);

        if (next === 'COMPLETE' || next === null) {
          this.updateState({
            status: 'complete',
            currentStageId: null,
            finalDraft: draft,
          });
          await PipelineNotifications.stop();
          await PipelineService.stop();
          this.callbacks.onComplete(draft);
          return;
        }

        stage = next;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.updateState({ status: 'error', error: message });
      await PipelineNotifications.stop();
      await PipelineService.stop();
      this.callbacks.onError(message);
    }
  }

  stop() {
    this.abortController?.abort();
    PipelineNotifications.stop();
    PipelineService.stop();
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
      prompt: undefined,
      metadata: undefined,
      startedAt: new Date().toISOString(),
    });
    this.updateState({ currentStageId: stageId });

    const ctx: AgentContext = {
      sessionConfig,
      currentDraft,
      iteration,
      segmentLoopIndex: this.state.segmentLoopIndex,
      feedback,
    };

    let retries = 0;
    while (true) {
      try {
        const reasoningChunks: string[] = [];

        const result = await agent(
          ctx,
          (chunk) => {
            if (this.abortController?.signal.aborted) {
              throw new Error('Pipeline aborted by user');
            }
            reasoningChunks.push(chunk);
            this.updateStage(stageId, {
              reasoning: reasoningChunks.join(''),
            });
          },
          (partial) => {
            if (this.abortController?.signal.aborted) {
              throw new Error('Pipeline aborted by user');
            }
            this.updateStage(stageId, partial);
          }
        );

        const status = this.inferStatus(stageId, result.metadata);

        this.updateStage(stageId, {
          status,
          output: result.draft,
          prompt: result.prompt,
          metadata: result.metadata,
          completedAt: new Date().toISOString(),
        });

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Don't retry on user abort
        if (message === 'Pipeline aborted by user') {
          this.updateStage(stageId, {
            status: 'error',
            output: 'Aborted by user',
            completedAt: new Date().toISOString(),
          });
          throw err;
        }
        retries++;
        if (retries >= MAX_RETRIES) {
          this.updateStage(stageId, {
            status: 'error',
            output: `Failed after ${MAX_RETRIES} attempts: ${message}`,
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

    if (stageId === 'fullScriptEditor' || stageId === 'segmentEditor') {
      const status = m.approval_status;
      if (status === 'REJECTED') return 'rejected';
      return 'completed';
    }

    return 'completed';
  }

  private getNextStage(current: StageId, metadata: unknown): StageId | 'COMPLETE' {
    if (!metadata || typeof metadata !== 'object') {
      // Fallback: linear flow
      const flow: StageId[] = [
        'agent1', 'fullScriptEditor', 'fullScriptWriter',
        'segmentWriter', 'segmentEditor', 'assembler', 'agent6',
      ];
      const idx = flow.indexOf(current);
      if (idx === -1 || idx === flow.length - 1) return 'COMPLETE';
      return flow[idx + 1];
    }

    const m = metadata as Record<string, unknown>;
    const totalTopics = this.sessionConfig?.editorial.includeSegment ? 7 : 6;

    switch (current) {
      case 'agent1':
        return 'fullScriptEditor';

      case 'fullScriptEditor': {
        if (m.approval_status === 'REJECTED') {
          this.updateState({
            editorLoops: this.state.editorLoops + 1,
          });
          return 'fullScriptWriter';
        }
        // APPROVED: first pass (segmentLoopIndex === -1) → start topic loop
        // APPROVED: second pass (segmentLoopIndex !== -1) → done
        if (this.state.segmentLoopIndex === -1) {
          this.updateState({ segmentLoopIndex: 0 });
          return 'segmentEditor';
        }
        return 'agent6';
      }

      case 'fullScriptWriter':
        return 'fullScriptEditor';

      case 'segmentWriter':
        return 'segmentEditor';

      case 'segmentEditor': {
        if (m.approval_status === 'REJECTED') {
          this.updateState({
            editorLoops: this.state.editorLoops + 1,
          });
          return 'segmentWriter';
        }
        // APPROVED: advance to next topic or finish loop
        const maxIndex = totalTopics - 1;
        if (this.state.segmentLoopIndex < maxIndex) {
          this.updateState({
            segmentLoopIndex: this.state.segmentLoopIndex + 1,
          });
          return 'segmentEditor';
        }
        return 'assembler';
      }

      case 'assembler': {
        // Reset segment loop for second fullScriptEditor pass
        this.updateState({ segmentLoopIndex: -1 });
        return 'fullScriptEditor';
      }

      case 'agent6':
        return 'COMPLETE';

      default:
        return 'COMPLETE';
    }
  }
}
