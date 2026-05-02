import { cn } from '../../lib/utils';
import type { StageRecord, PipelineStatus, TopicLoopState, TopicStatus } from '../../lib/pipelineTypes';
import {
  Search,
  ClipboardCheck,
  PenTool,
  CheckCircle,
  Headphones,
  Loader2,
  AlertTriangle,
  XCircle,
  FileEdit,
  FileCheck,
  Layers,
  LayoutGrid,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  Search,
  ClipboardCheck,
  PenTool,
  FileEdit,
  FileCheck,
  Layers,
  CheckCircle,
  Headphones,
  LayoutGrid,
};

interface StageStripProps {
  stages: StageRecord[];
  currentStageId: string | null;
  selectedStageId: string | null;
  pipelineStatus: PipelineStatus;
  onSelectStage: (id: string) => void;
  topicLoop?: TopicLoopState;
}

export default function StageStrip({
  stages,
  currentStageId,
  selectedStageId,
  pipelineStatus,
  onSelectStage,
  topicLoop,
}: StageStripProps) {
  return (
    <div className="w-full space-y-1.5">
      {stages.map((stage) => {
        // Special render for active topic loop
        if (stage.id === 'topicLoop' && topicLoop?.isActive) {
          return (
            <TopicLoopCard
              key={stage.id}
              topicLoop={topicLoop}
              isSelected={stage.id === selectedStageId}
              onClick={() => onSelectStage(stage.id)}
            />
          );
        }

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

// ============================================================================
// Topic Loop Card — mini grid visualization
// ============================================================================

function TopicLoopCard({
  topicLoop,
  isSelected,
  onClick,
}: {
  topicLoop: TopicLoopState;
  isSelected: boolean;
  onClick: () => void;
}) {
  const activeCount = topicLoop.topics.filter(
    (t) => t.state === 'editing' || t.state === 'rewriting'
  ).length;
  const stalledCount = topicLoop.topics.filter((t) => t.state === 'stalled').length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex flex-col gap-2 px-3 py-2.5 rounded-lg border transition-all text-left',
        activeCount > 0 && 'border-blue-500 bg-blue-900/30 ring-1 ring-blue-500/30',
        activeCount === 0 && stalledCount > 0 && 'border-amber-500/50 bg-amber-900/20',
        activeCount === 0 && stalledCount === 0 && 'border-green-500/50 bg-green-900/20',
        isSelected && activeCount === 0 && 'border-slate-500 bg-slate-800'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {activeCount > 0 ? (
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          ) : stalledCount > 0 ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-blue-300">
            Topic Loop
          </div>
          <div className="text-[10px] text-slate-500">
            {activeCount > 0
              ? `${activeCount} active, ${topicLoop.approvedCount}/${topicLoop.totalCount} approved`
              : stalledCount > 0
                ? `${stalledCount} stalled, retry wave ${topicLoop.waveNumber}`
                : `${topicLoop.approvedCount}/${topicLoop.totalCount} approved`}
          </div>
        </div>

        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
          {topicLoop.approvedCount}/{topicLoop.totalCount}
        </span>
      </div>

      {/* Mini dot grid */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {topicLoop.topics.map((topic) => (
          <TopicDot key={topic.segmentId} topic={topic} />
        ))}
      </div>
    </button>
  );
}

function TopicDot({ topic }: { topic: TopicStatus }) {
  const colorClass =
    topic.state === 'approved'
      ? 'bg-green-500'
      : topic.state === 'editing' || topic.state === 'rewriting'
        ? 'bg-amber-400 animate-pulse'
        : topic.state === 'stalled'
          ? 'bg-red-500'
          : 'bg-slate-600';

  const label =
    topic.state === 'approved'
      ? 'Approved'
      : topic.state === 'editing'
        ? 'Editing'
        : topic.state === 'rewriting'
          ? `Rewriting (attempt ${topic.attempt})`
          : topic.state === 'stalled'
            ? `Stalled: ${topic.lastError?.slice(0, 40) ?? 'error'}`
            : 'Pending';

  return (
    <span
      title={`${topic.label}: ${label}`}
      className={cn('w-2.5 h-2.5 rounded-full', colorClass)}
    />
  );
}
