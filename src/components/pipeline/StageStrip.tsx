import { cn } from '../../lib/utils';
import type { StageRecord, PipelineStatus } from '../../lib/pipelineTypes';
import {
  Search,
  ClipboardCheck,
  PenTool,
  ShieldCheck,
  Wrench,
  CheckCircle,
  Headphones,
  Loader2,
  AlertTriangle,
  XCircle,
  FileEdit,
  FileCheck,
  Layers,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Search,
  ClipboardCheck,
  PenTool,
  FileEdit,
  FileCheck,
  Layers,
  ShieldCheck,
  Wrench,
  CheckCircle,
  Headphones,
};

interface StageStripProps {
  stages: StageRecord[];
  currentStageId: string | null;
  selectedStageId: string | null;
  pipelineStatus: PipelineStatus;
  onSelectStage: (id: string) => void;
}

export default function StageStrip({
  stages,
  currentStageId,
  selectedStageId,
  pipelineStatus,
  onSelectStage,
}: StageStripProps) {
  return (
    <div className="w-full space-y-1.5">
      {stages.map((stage) => {
        const Icon = iconMap[stage.icon] || Search;
        const isActive = stage.id === currentStageId && pipelineStatus === 'running';
        const isSelected = stage.id === selectedStageId;
        const isCompleted = stage.status === 'completed';
        const isRejected = stage.status === 'rejected';
        const isError = stage.status === 'error';
        const isPending = stage.status === 'pending';

        return (
          <button
            key={stage.id}
            onClick={() => onSelectStage(stage.id)}
            className={cn(
              'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left',
              isActive && 'border-blue-500 bg-blue-900/30 ring-1 ring-blue-500/30',
              isCompleted && !isActive && 'border-green-500/50 bg-green-900/20',
              isRejected && !isActive && 'border-amber-500/50 bg-amber-900/20',
              isError && !isActive && 'border-red-500/50 bg-red-900/20',
              isPending && !isActive && 'border-slate-700 bg-slate-800/50 opacity-60',
              isSelected && !isActive && 'border-slate-500 bg-slate-800',
              !isSelected && !isActive && !isPending && 'hover:border-slate-600 hover:bg-slate-800'
            )}
          >
            {/* Status icon */}
            <div className="relative flex-shrink-0">
              {isActive ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : isRejected ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : isError ? (
                <XCircle className="w-5 h-5 text-red-400" />
              ) : (
                <Icon className="w-5 h-5 text-slate-500" />
              )}

              {/* Iteration badge */}
              {stage.iteration > 1 && (
                <span className="absolute -top-1.5 -right-2 bg-slate-700 text-slate-300 text-[9px] font-bold px-1 rounded-full">
                  ×{stage.iteration}
                </span>
              )}
            </div>

            {/* Stage name + full name */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-xs font-medium',
                  isActive && 'text-blue-300',
                  isCompleted && 'text-green-300',
                  isRejected && 'text-amber-300',
                  isError && 'text-red-300',
                  isPending && 'text-slate-500'
                )}
              >
                {stage.name}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {stage.status === 'pending' && 'Waiting...'}
                {stage.status === 'running' && 'Running...'}
                {stage.status === 'completed' && 'Done'}
                {stage.status === 'rejected' && 'Rejected — sent back for fixes'}
                {stage.status === 'error' && 'Failed after 3 retries'}
              </div>
            </div>

            {/* Active pulse indicator */}
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
