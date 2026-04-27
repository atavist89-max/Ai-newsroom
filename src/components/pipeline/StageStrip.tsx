import { cn } from '../../lib/utils';
import type { StageRecord, PipelineStatus } from '../../lib/pipelineTypes';
import {
  Search,
  ClipboardCheck,
  PenTool,
  ShieldCheck,
  Wrench,
  CheckCircle,
  Loader2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Search,
  ClipboardCheck,
  PenTool,
  ShieldCheck,
  Wrench,
  CheckCircle,
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
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-1 py-2 min-w-max">
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
                'relative flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg border min-w-[80px] max-w-[90px] transition-all',
                isActive && 'border-blue-500 bg-blue-900/30 ring-2 ring-blue-500/30',
                isCompleted && !isActive && 'border-green-500/50 bg-green-900/20',
                isRejected && !isActive && 'border-amber-500/50 bg-amber-900/20',
                isError && !isActive && 'border-red-500/50 bg-red-900/20',
                isPending && !isActive && 'border-slate-700 bg-slate-800/50 opacity-60',
                isSelected && !isActive && 'border-slate-500 bg-slate-800',
                !isSelected && !isActive && !isPending && 'hover:border-slate-600 hover:bg-slate-800'
              )}
            >
              {/* Status icon */}
              <div className="relative">
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
                  <span className="absolute -top-1.5 -right-2.5 bg-slate-700 text-slate-300 text-[9px] font-bold px-1 rounded-full">
                    ×{stage.iteration}
                  </span>
                )}
              </div>

              {/* Stage name */}
              <span
                className={cn(
                  'text-[10px] font-medium text-center leading-tight',
                  isActive && 'text-blue-300',
                  isCompleted && 'text-green-300',
                  isRejected && 'text-amber-300',
                  isError && 'text-red-300',
                  isPending && 'text-slate-500'
                )}
              >
                {stage.shortName}
              </span>

              {/* Active pulse indicator */}
              {isActive && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
