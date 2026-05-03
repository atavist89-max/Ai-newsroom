import { useState } from 'react';
import { cn } from '../../lib/utils';
import type { StageRecord, AuditResult, RuleResult, TopicLoopState, TopicStatus } from '../../lib/pipelineTypes';
import { FileText, Zap, ScrollText, Clock, ExternalLink, FileCheck, ClipboardCheck } from 'lucide-react';

interface Agent1Metadata {
  firstDraft?: string;
  selectionReport?: string;
  localArticlesFound?: number;
  continentArticlesFound?: number;
  topicGroups?: Array<{
    topic: string;
    localCount: number;
    continentCount: number;
    localArticles: Array<{ title: string; source: string; url: string }>;
    continentArticles: Array<{ title: string; source: string; url: string }>;
  }>;
  selectedArticles?: Array<{
    key: string;
    title: string;
    source: string;
    scope: string;
    topic: string;
    tier: number;
    wordCount: number;
    backupCount: number;
  }>;
  articleCount?: number;
  sourcesUsed?: string[];
  fallbackUsed?: boolean;
  streamDiagnostics?: string[];
}

interface StageDetailProps {
  stage: StageRecord | null;
  topicLoop?: TopicLoopState;
}

type TabId = 'articles' | 'stream' | 'output' | 'audit' | 'prompt';

export default function StageDetail({ stage, topicLoop }: StageDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('stream');

  if (!stage) {
    return (
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center text-slate-500 text-sm">
        Select a stage above to view details
      </div>
    );
  }

  // Special render for Topic Loop
  if (stage.id === 'topicLoop' && topicLoop) {
    return <TopicLoopDetail topicLoop={topicLoop} />;
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

  const isResearchOrWriter = stage.id === 'articleResearch' || stage.id === 'scriptWriter';
  const isGate = stage.id.startsWith('gate') || stage.id === 'fullScriptEditor' || stage.id === 'segmentEditor';
  const metadata = stage.metadata as Agent1Metadata | undefined;
  const auditResult = stage.metadata as AuditResult | undefined;

  const tabs: { id: TabId; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'articles', label: 'Articles', icon: FileText, show: stage.id === 'articleResearch' },
    { id: 'stream', label: 'Stream', icon: Zap, show: true },
    { id: 'output', label: 'Agent Output', icon: FileCheck, show: isResearchOrWriter || stage.id === 'assembler' },
    { id: 'audit', label: 'Audit', icon: ClipboardCheck, show: isGate },
    { id: 'prompt', label: 'Prompt', icon: ScrollText, show: !!stage.prompt },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  // If current tab is hidden, switch to first visible
  const effectiveTab = visibleTabs.find((t) => t.id === activeTab) ? activeTab : visibleTabs[0]?.id ?? 'stream';

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

      {/* Tab Bar */}
      <div className="flex border-b border-slate-700">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = effectiveTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="max-h-[500px] overflow-auto">
        {effectiveTab === 'articles' && <ArticlesTab metadata={metadata} />}
        {effectiveTab === 'stream' && <StreamTab stage={stage} />}
        {effectiveTab === 'output' && <OutputTab stage={stage} metadata={metadata} />}
        {effectiveTab === 'audit' && <AuditTab stage={stage} audit={auditResult} />}
        {effectiveTab === 'prompt' && <PromptTab prompt={stage.prompt ?? ''} />}
      </div>
    </div>
  );
}

function ArticlesTab({ metadata }: { metadata: Agent1Metadata | undefined }) {
  // New format: selectedArticles from articleResearcher
  if (metadata?.selectedArticles && metadata.selectedArticles.length > 0) {
    const locals = metadata.selectedArticles.filter((a) => a.scope === 'local');
    const continents = metadata.selectedArticles.filter((a) => a.scope === 'continent');
    return (
      <div className="p-4 space-y-4">
        <div className="text-xs text-slate-300">
          <span className="font-medium">{metadata.articleCount ?? metadata.selectedArticles.length}</span> articles selected
          <span className="text-slate-500 ml-2">({locals.length} local / {continents.length} continent)</span>
        </div>
        {metadata.selectedArticles.map((article, idx) => (
          <div key={idx} className="flex items-start gap-2 px-2 py-1.5 rounded bg-slate-800/50">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-200 truncate" title={article.title}>
                {article.title}
              </div>
              <div className="text-[10px] text-slate-500">
                {article.source} · {article.topic} · {article.wordCount} words · {article.backupCount} backup{article.backupCount !== 1 ? 's' : ''}
              </div>
            </div>
            <span className={
              article.scope === 'local'
                ? 'text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-300'
                : 'text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300'
            }>
              {article.scope}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // Legacy format: topicGroups from old agent1
  if (metadata?.topicGroups && metadata.topicGroups.length > 0) {
    return (
      <div className="p-4 space-y-4">
        {metadata.topicGroups.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
                Topic {idx + 1}: {group.topic}
              </span>
              <span className="text-[10px] text-slate-500">
                {group.localCount} local / {group.continentCount} continent
              </span>
            </div>

            {group.localArticles.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase">Local Articles</span>
                {group.localArticles.map((article, i) => (
                  <ArticleRow key={`l-${i}`} article={article} />
                ))}
              </div>
            )}

            {group.continentArticles.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-medium text-slate-400 uppercase">Continent Articles</span>
                {group.continentArticles.map((article, i) => (
                  <ArticleRow key={`c-${i}`} article={article} />
                ))}
              </div>
            )}

            {idx < (metadata?.topicGroups?.length ?? 0) - 1 && <hr className="border-slate-700/50" />}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 text-sm text-slate-500 text-center">
      No articles found yet.
    </div>
  );
}

function ArticleRow({ article }: { article: { title: string; source: string; url: string } }) {
  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-200 truncate" title={article.title}>
          {article.title}
        </div>
        <div className="text-[10px] text-slate-500">{article.source}</div>
      </div>
      {article.url && (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-slate-500 hover:text-blue-400 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function StreamTab({ stage }: { stage: StageRecord }) {
  const hasReasoning = stage.reasoning && stage.reasoning.length > 0;
  const hasOutput = stage.output && stage.output.length > 0;

  return (
    <div className="p-4 space-y-4">
      {/* Real-time stream */}
      {hasReasoning && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Live Stream</span>
          <pre className="text-xs text-purple-300/90 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 min-h-[80px]">
            {stage.reasoning}
            {stage.status === 'running' && (
              <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
            )}
          </pre>
        </div>
      )}

      {/* Final output */}
      {hasOutput && stage.status !== 'running' && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Final Output</span>
          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[300px] overflow-auto">
            {stage.output}
          </pre>
        </div>
      )}

      {!hasReasoning && !hasOutput && (
        <div className="text-sm text-slate-500 text-center py-8">
          {stage.status === 'pending'
            ? 'Waiting to start...'
            : stage.status === 'running'
            ? 'Starting stream...'
            : 'No stream data available.'}
        </div>
      )}
    </div>
  );
}

function PromptTab({ prompt }: { prompt: string }) {
  return (
    <div className="p-4">
      <pre className="text-xs text-blue-300/90 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[450px] overflow-auto">
        {prompt}
      </pre>
    </div>
  );
}

function OutputTab({ stage, metadata }: { stage: StageRecord; metadata: Agent1Metadata | undefined }) {
  const diagnostics = metadata?.streamDiagnostics ?? (stage.metadata as Record<string, unknown> | undefined)?.streamDiagnostics as string[] | undefined;
  const assemblerMeta = stage.id === 'assembler' ? (stage.metadata as Record<string, unknown> | undefined) : undefined;

  if (stage.status === 'running') {
    return (
      <div className="p-4 text-sm text-slate-500 text-center">
        {stage.id === 'assembler' ? 'Assembling segments...' : 'Draft generation in progress...'}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {stage.id === 'assembler' && assemblerMeta ? (
        <div className="space-y-2">
          <div className="text-xs text-slate-300">
            <span className="font-medium">Segments:</span> {String(assemblerMeta.segmentCount ?? 0)}
          </div>
          <div className="text-xs text-slate-300">
            <span className="font-medium">Total length:</span> {String(assemblerMeta.totalLength ?? 0)} characters
          </div>
          {Array.isArray(assemblerMeta.missingSegments) && (assemblerMeta.missingSegments as string[]).length > 0 && (
            <div className="text-xs text-amber-300">
              <span className="font-medium">Missing:</span> {(assemblerMeta.missingSegments as string[]).join(', ')}
            </div>
          )}
          {stage.output && (
            <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[300px] overflow-auto leading-relaxed">
              {stage.output}
            </pre>
          )}
        </div>
      ) : stage.id === 'scriptWriter' && stage.output ? (
        <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[350px] overflow-auto leading-relaxed">
          {stage.output}
        </pre>
      ) : metadata?.firstDraft ? (
        <pre className="text-xs text-slate-200 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[350px] overflow-auto leading-relaxed">
          {metadata.firstDraft}
        </pre>
      ) : (
        <div className="text-sm text-slate-500 text-center py-4">
          No draft output.
        </div>
      )}

      {diagnostics && diagnostics.length > 0 && (
        <DiagnosticsSection diagnostics={diagnostics} />
      )}
    </div>
  );
}

function DiagnosticsSection({ diagnostics }: { diagnostics: string[] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-slate-700/50 rounded bg-slate-950/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-medium text-amber-400 uppercase tracking-wide hover:bg-slate-800/30 transition-colors"
      >
        <span>Stream Diagnostics ({diagnostics.length} lines)</span>
        <span className="text-slate-500">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <pre className="text-[10px] text-amber-300/80 whitespace-pre-wrap font-mono px-3 pb-3 max-h-[250px] overflow-auto">
          {diagnostics.join('\n')}
        </pre>
      )}
    </div>
  );
}

function AuditTab({ stage, audit }: { stage: StageRecord; audit: AuditResult | undefined }) {
  if (stage.status === 'running') {
    return (
      <div className="p-4 text-sm text-slate-500 text-center">
        Audit in progress...
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="p-4 text-sm text-slate-500 text-center">
        No audit results yet.
      </div>
    );
  }

  const totalRules = audit.stories.reduce((sum, s) => sum + s.rules.length, 0);
  const failCount = audit.stories.reduce(
    (sum, s) => sum + s.rules.filter((r) => r.status === 'FAIL').length,
    0
  );
  const hasStories = audit.stories.length > 0;

  const themeLabels = [
    'Local Article 1',
    'Local Article 2',
    'Local Article 3',
    'Local Article 4',
    'Local Article 5',
    'Continent Article 6',
    'Continent Article 7',
    'Continent Article 8',
    'Editorial Segment',
  ];

  return (
    <div className="p-4 space-y-4">
      {/* Overall Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'text-xs px-2 py-1 rounded-full font-medium',
              audit.approval_status === 'APPROVED'
                ? 'bg-green-900/50 text-green-300'
                : 'bg-red-900/50 text-red-300'
            )}
          >
            {audit.approval_status}
          </span>
          {audit.has_feedback && (
            <span className="text-xs text-amber-300 bg-amber-900/30 px-2 py-1 rounded-full">
              Has Feedback
            </span>
          )}
        </div>
        {hasStories && (
          <span className="text-[10px] text-slate-500">
            {failCount}/{totalRules} checks failed
          </span>
        )}
      </div>

      {/* Mechanical Results */}
      {(() => {
        const meta = stage.metadata as Record<string, unknown> | undefined;
        const mech = meta?.mechanicalResult as Record<string, unknown> | undefined;
        if (!mech) return null;
        const mechPass = mech.pass === true;
        const length = mech.length as Record<string, unknown> | undefined;
        const sentence = mech.sentenceStructure as Record<string, unknown> | undefined;
        return (
          <div className="bg-slate-800/30 rounded border border-slate-700/30 px-3 py-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Mechanical Checks</span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                mechPass ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
              )}>
                {mechPass ? 'PASS' : 'FAIL'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-0.5">
              {length && (
                <div className="flex items-center gap-1.5">
                  <span className={cn('w-3 h-3 flex items-center justify-center rounded-full text-[7px] font-bold', (length.pass as boolean) ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400')}>{(length.pass as boolean) ? '✓' : '✗'}</span>
                  <span>Length: {String(length.actual)} / {String(length.required)} chars</span>
                </div>
              )}
              {sentence && (
                <div className="flex items-center gap-1.5">
                  <span className={cn('w-3 h-3 flex items-center justify-center rounded-full text-[7px] font-bold', (sentence.pass as boolean) ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400')}>{(sentence.pass as boolean) ? '✓' : '✗'}</span>
                  <span>Sentences: avg {(sentence.avgWords as number)} words, {(sentence.percentInRange as number)}% in 15-30 range ({(sentence.sentencesInRange as number)}/{(sentence.sentencesAnalyzed as number)})</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Script-wide audit notice (no per-theme breakdown) */}
      {!hasStories && (
        <div className="text-xs text-slate-400 bg-slate-800/30 rounded border border-slate-700/30 px-3 py-2">
          Script-wide audit — coherence, bias, and structural completeness. No per-theme breakdown.
        </div>
      )}

      {/* Per-Theme Breakdown */}
      {hasStories && (
        <div className="space-y-3">
          {audit.stories.map((story, idx) => {
            const label = themeLabels[idx] || `Theme ${idx + 1}`;
            const storyFails = story.rules.filter((r) => r.status === 'FAIL').length;
            return (
              <div key={idx} className="bg-slate-800/50 rounded border border-slate-700/50">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700/50">
                  <span className="text-xs font-medium text-slate-200">{label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-medium',
                      storyFails === 0
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-red-900/30 text-red-400'
                    )}
                  >
                    {storyFails === 0 ? 'PASS' : `${storyFails} FAIL`}
                  </span>
                </div>
                <div className="px-3 py-2 space-y-1">
                  {story.rules.map((rule, rIdx) => (
                    <RuleRow key={rIdx} rule={rule} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rewriter Instructions */}
      {audit.rewriter_instructions && audit.rewriter_instructions.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            Rewriter Instructions
          </span>
          <pre className="text-xs text-amber-200/80 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-3 border border-slate-700/50 max-h-[200px] overflow-auto">
            {audit.rewriter_instructions}
          </pre>
        </div>
      )}

      {/* Stream Diagnostics */}
      {Array.isArray((stage.metadata as Record<string, unknown> | undefined)?.streamDiagnostics) && (
        <DiagnosticsSection diagnostics={(stage.metadata as Record<string, unknown>).streamDiagnostics as string[]} />
      )}
    </div>
  );
}

// ============================================================================
// Topic Loop Detail — expandable per-topic rows
// ============================================================================

function TopicLoopDetail({ topicLoop }: { topicLoop: TopicLoopState }) {
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">Topic Loop</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-900/50 text-blue-300">
            {topicLoop.approvedCount}/{topicLoop.totalCount} approved
          </span>
          {topicLoop.waveNumber > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-900/50 text-amber-300">
              Retry wave {topicLoop.waveNumber}
            </span>
          )}
        </div>
      </div>

      {/* Topic rows */}
      <div className="divide-y divide-slate-700/50">
        {Array.isArray(topicLoop.topics) && topicLoop.topics.map((topic) => (
          <TopicDetailRow
            key={topic.segmentId}
            topic={topic}
            isExpanded={expandedTopic === topic.index}
            onToggle={() => setExpandedTopic(
              expandedTopic === topic.index ? null : topic.index
            )}
          />
        ))}
      </div>
    </div>
  );
}

function TopicDetailRow({
  topic,
  isExpanded,
  onToggle,
}: {
  topic: TopicStatus;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const stateColor =
    topic.state === 'approved'
      ? 'text-green-400'
      : topic.state === 'editing' || topic.state === 'rewriting'
        ? 'text-amber-400'
        : topic.state === 'stalled'
          ? 'text-red-400'
          : 'text-slate-500';

  const dotColor =
    topic.state === 'approved'
      ? 'bg-green-500'
      : topic.state === 'editing' || topic.state === 'rewriting'
        ? 'bg-amber-400'
        : topic.state === 'stalled'
          ? 'bg-red-500'
          : 'bg-slate-600';

  const stateLabel =
    topic.state === 'approved'
      ? 'Approved'
      : topic.state === 'editing'
        ? 'Editing'
        : topic.state === 'rewriting'
          ? `Rewriting (attempt ${topic.attempt})`
          : topic.state === 'stalled'
            ? 'Stalled'
            : topic.state === 'rejected'
              ? 'Rejected'
              : 'Pending';

  return (
    <div className="bg-slate-900">
      {/* Summary row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-800/50 transition-colors"
      >
        <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor)} />
        <span className="text-xs font-medium text-slate-200 w-24 truncate">{topic.label}</span>
        <span className={cn('text-xs', stateColor)}>{stateLabel}</span>
        {topic.attempt > 0 && (
          <span className="text-[10px] text-slate-500 ml-auto">Attempt {topic.attempt}</span>
        )}
        <span className="text-xs text-slate-500 ml-2">
          {isExpanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {topic.lastError && (
            <div className="text-[11px] text-red-400 bg-red-900/20 rounded px-2 py-1">
              {topic.lastError}
            </div>
          )}
          {topic.reasoning && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Reasoning</div>
              <pre className="text-[11px] text-slate-300 whitespace-pre-wrap bg-slate-800/50 rounded p-2 max-h-40 overflow-y-auto">
                {topic.reasoning}
              </pre>
            </div>
          )}
          {topic.metadata != null && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Audit</div>
              <TopicAuditSection audit={topic.metadata} />
            </div>
          )}
          {topic.prompt && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Prompt</div>
              <pre className="text-[11px] text-slate-400 whitespace-pre-wrap bg-slate-800/50 rounded p-2 max-h-40 overflow-y-auto">
                {topic.prompt}
              </pre>
            </div>
          )}
          {topic.output && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Output</div>
              <pre className="text-[11px] text-slate-300 whitespace-pre-wrap bg-slate-800/50 rounded p-2 max-h-40 overflow-y-auto">
                {topic.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopicAuditSection({ audit }: { audit: unknown }) {
  const a = audit as Record<string, unknown> | undefined;
  const stories = Array.isArray(a?.stories) ? (a.stories as Array<Record<string, unknown>>) : [];
  const approvalStatus = a?.approval_status === 'APPROVED' || a?.approval_status === 'REJECTED'
    ? a.approval_status
    : 'UNKNOWN';
  const hasFeedback = Boolean(a?.has_feedback);
  const rewriterInstructions = typeof a?.rewriter_instructions === 'string'
    ? a.rewriter_instructions
    : '';

  if (stories.length === 0) {
    return (
      <div className="text-[11px] text-slate-500 bg-slate-800/50 rounded p-2">
        No audit data available.
      </div>
    );
  }

  const failCount = stories.reduce(
    (sum, s) => {
      const rules = Array.isArray(s?.rules) ? s.rules : [];
      return sum + rules.filter((r: unknown) => (r as Record<string, unknown>)?.status === 'FAIL').length;
    },
    0
  );
  const totalRules = stories.reduce(
    (sum, s) => sum + (Array.isArray(s?.rules) ? s.rules.length : 0),
    0
  );

  return (
    <div className="bg-slate-800/50 rounded border border-slate-700/50 px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-[10px] px-1.5 py-0.5 rounded font-medium',
          approvalStatus === 'APPROVED'
            ? 'bg-green-900/30 text-green-400'
            : 'bg-red-900/30 text-red-400'
        )}>
          {approvalStatus}
        </span>
        <span className="text-[10px] text-slate-500">
          {failCount}/{totalRules} failed
        </span>
      </div>
      {hasFeedback && rewriterInstructions && (
        <pre className="text-[11px] text-amber-200/80 whitespace-pre-wrap font-sans bg-slate-950/30 rounded p-2 border border-slate-700/50 max-h-32 overflow-auto">
          {rewriterInstructions}
        </pre>
      )}
      <div className="space-y-1">
        {stories.map((story, idx) => {
          const rules = Array.isArray(story?.rules) ? story.rules : [];
          return rules.map((rule: unknown, rIdx: number) => (
            <RuleRow
              key={`${idx}-${rIdx}`}
              rule={{
                rule_name: String((rule as Record<string, unknown>)?.rule_name ?? 'UNKNOWN'),
                status: ((rule as Record<string, unknown>)?.status === 'FAIL' ? 'FAIL' : 'PASS') as 'PASS' | 'FAIL',
                details: (rule as Record<string, unknown>)?.details ? String((rule as Record<string, unknown>).details) : undefined,
                rejection_reason: (rule as Record<string, unknown>)?.rejection_reason ? String((rule as Record<string, unknown>).rejection_reason) : undefined,
              }}
            />
          ));
        })}
      </div>
    </div>
  );
}

function RuleRow({ rule }: { rule: RuleResult }) {
  return (
    <div className="flex items-start gap-2 text-[11px]">
      <span
        className={cn(
          'flex-shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[8px] font-bold',
          rule.status === 'PASS'
            ? 'bg-green-900/40 text-green-400'
            : 'bg-red-900/40 text-red-400'
        )}
      >
        {rule.status === 'PASS' ? '✓' : '✗'}
      </span>
      <div className="flex-1 min-w-0">
        <span className={cn('font-medium', rule.status === 'PASS' ? 'text-slate-300' : 'text-red-300')}>
          {rule.rule_name}
        </span>
        {rule.details && (
          <span className="text-slate-500 ml-1">— {rule.details}</span>
        )}
        {rule.rejection_reason && (
          <div className="text-red-400/80 mt-0.5">{rule.rejection_reason}</div>
        )}
      </div>
    </div>
  );
}
