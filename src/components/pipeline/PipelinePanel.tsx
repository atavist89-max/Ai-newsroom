import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { PipelineRunner } from '../../lib/pipeline';
import { createAgentMap } from '../../agents';
import type { PipelineState, StageId } from '../../lib/pipelineTypes';
import type { SessionConfig } from '../../lib/sessionConfig';
import StageStrip from './StageStrip';
import StageDetail from './StageDetail';
import { Play, Square, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PipelinePanelProps {
  sessionConfig: SessionConfig;
}

export default function PipelinePanel({ sessionConfig }: PipelinePanelProps) {
  const [state, setState] = useState<PipelineState>({
    status: 'idle',
    currentStageId: null,
    selectedStageId: null,
    stages: [],
    currentDraft: '',
    finalDraft: null,
    error: null,
    factCheckLoops: 0,
    finalCheckLoops: 0,
  });

  const runnerRef = useRef<PipelineRunner | null>(null);

  // Auto-select the current running stage
  useEffect(() => {
    if (state.status === 'running' && state.currentStageId) {
      setState((prev) => ({ ...prev, selectedStageId: state.currentStageId as StageId }));
    }
  }, [state.currentStageId, state.status]);

  const handleRun = useCallback(() => {
    const agents = createAgentMap();
    const runner = new PipelineRunner(agents, {
      onStateChange: (newState) => {
        setState((prev) => ({ ...prev, ...newState }));
      },
      onComplete: (draft) => {
        console.log('Pipeline complete:', draft);
      },
      onError: (error) => {
        console.error('Pipeline error:', error);
      },
    });

    runnerRef.current = runner;
    runner.run(sessionConfig);
  }, [sessionConfig]);

  const handleStop = useCallback(() => {
    runnerRef.current?.stop();
  }, []);

  const handleSelectStage = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedStageId: id as StageId }));
  }, []);

  const selectedStage = state.stages.find((s) => s.id === state.selectedStageId) || null;

  return (
    <div className="space-y-3">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state.status === 'idle' && (
            <span className="text-xs text-slate-500">Ready to run</span>
          )}
          {state.status === 'running' && (
            <>
              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400">
                {state.currentStageId
                  ? `Running ${state.stages.find((s) => s.id === state.currentStageId)?.name || ''}...`
                  : 'Starting...'}
              </span>
            </>
          )}
          {state.status === 'complete' && (
            <>
              <CheckCircle2 className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">Pipeline complete</span>
            </>
          )}
          {state.status === 'error' && (
            <>
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400">Error: {state.error}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {state.factCheckLoops > 0 && (
            <span>Fact loops: {state.factCheckLoops}</span>
          )}
          {state.finalCheckLoops > 0 && (
            <span>Final loops: {state.finalCheckLoops}</span>
          )}
        </div>
      </div>

      {/* Run / Stop buttons */}
      <div className="flex gap-2">
        {state.status === 'running' ? (
          <button
            onClick={handleStop}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/50 text-red-300 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-all"
          >
            <Square className="w-4 h-4" />
            Stop Pipeline
          </button>
        ) : (
          <button
            onClick={handleRun}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              state.status === 'complete'
                ? 'bg-green-600/20 border border-green-500/50 text-green-300 hover:bg-green-600/30'
                : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700'
            )}
          >
            {state.status === 'complete' ? (
              <>
                <Play className="w-4 h-4" />
                Run Again
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Full Pipeline
              </>
            )}
          </button>
        )}
      </div>

      {/* Stage Strip */}
      {state.stages.length > 0 && (
        <StageStrip
          stages={state.stages}
          currentStageId={state.currentStageId}
          selectedStageId={state.selectedStageId}
          pipelineStatus={state.status}
          onSelectStage={handleSelectStage}
        />
      )}

      {/* Stage Detail */}
      <StageDetail stage={selectedStage} />
    </div>
  );
}
