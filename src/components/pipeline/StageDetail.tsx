import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { StageRecord } from '../../lib/pipelineTypes';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface StageDetailProps {
  stage: StageRecord | null;
}

export default function StageDetail({ stage }: StageDetailProps) {
  const [showReasoning, setShowReasoning] = useState(true);
  const [showOutput, setShowOutput] = useState(true);

  if (!stage) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center text-slate-500 text-sm">
        Select a stage above to view details
      </div>
    );
  }

  const statusLabels = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    rejected: 'Rejected',
    error: 'Error',
  };

  const statusBgColors = {
    pending: 'bg-slate-800 text-slate-400',
    running: 'bg-blue-900/50 text-blue-300',
    completed: 'bg-green-900/50 text-green-300',
    rejected: 'bg-amber-900/50 text-amber-300',
    error: 'bg-red-900/50 text-red-300',
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{stage.name}</span>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              statusBgColors[stage.status]
            )}
          >
            {statusLabels[stage.status]}
          </span>
          {stage.iteration > 1 && (
            <span className="text-xs text-slate-400">Loop #{stage.iteration}</span>
          )}
        </div>
        {stage.startedAt && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="w-3 h-3" />
            {new Date(stage.startedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Reasoning Panel */}
      {!!stage.reasoning && (
        <div className="border-b border-slate-700">
          <button
            onClick={() => setShowReasoning((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-medium text-purple-300">Reasoning</span>
            {showReasoning ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showReasoning && (
            <pre className="p-4 text-xs text-purple-300/80 overflow-auto max-h-[200px] whitespace-pre-wrap bg-slate-950/30">
              {stage.reasoning}
            </pre>
          )}
        </div>
      )}

      {/* Output Panel */}
      {!!stage.output && (
        <div>
          <button
            onClick={() => setShowOutput((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/50 hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-medium text-slate-300">Output</span>
            {showOutput ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>
          {showOutput && (
            <pre className="p-4 text-xs text-slate-300 overflow-auto max-h-[300px] whitespace-pre-wrap font-sans">
              {stage.output}
            </pre>
          )}
        </div>
      )}

      {/* Metadata (for gates) */}
      {!!stage.metadata && (
        <div className="px-4 py-3 border-t border-slate-700">
          <span className="text-xs font-medium text-slate-400">Metadata</span>
          <pre className="mt-1 text-[10px] text-slate-500 overflow-auto max-h-[150px] whitespace-pre-wrap">
            {JSON.stringify(stage.metadata, null, 2)}
          </pre>
        </div>
      )}

      {/* Empty state */}
      {!stage.reasoning && !stage.output && stage.status === 'pending' && (
        <div className="p-4 text-sm text-slate-500 text-center">
          Waiting to start...
        </div>
      )}
    </div>
  );
}
