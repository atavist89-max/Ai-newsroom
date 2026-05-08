import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { PipelineRunner } from '../../lib/pipeline';
import { createAgentMap } from '../../agents';
import type { PipelineState, StageId, StageRecord } from '../../lib/pipelineTypes';
import type { SessionConfig } from '../../lib/sessionConfig';
import StageStrip from './StageStrip';
import StageDetail from './StageDetail';
import { getPodcastPlaybackUrl, copyPodcastToDocuments } from '../../lib/fileManager';
import { loadTestMode } from '../../lib/apiConfig';
import { getPodcastFileName } from '../../lib/sessionConfig';
import { Play, Square, Loader2, AlertCircle, CheckCircle2, Headphones, Pause } from 'lucide-react';

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
    editorLoops: 0,
    segmentLoopIndex: -1,
    hasRunTopicLoop: false,
  });

  const [podcastUrl, setPodcastUrl] = useState<string | null>(null);
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runnerRef = useRef<PipelineRunner | null>(null);

  // Load test mode preference on mount
  useEffect(() => {
    loadTestMode().then(setTestMode);
  }, []);

  // Auto-select the current running stage
  useEffect(() => {
    if (state.status === 'running' && state.currentStageId) {
      setState((prev) => ({ ...prev, selectedStageId: state.currentStageId as StageId }));
    }
  }, [state.currentStageId, state.status]);

  const handleRun = useCallback(() => {
    const outputFileName = getPodcastFileName(sessionConfig);

    const agents = createAgentMap();
    const runner = new PipelineRunner(agents, {
      onStateChange: (newState) => {
        setState((prev) => ({ ...prev, ...newState, selectedStageId: prev.selectedStageId }));
      },
      onComplete: async (draft) => {
        console.log('Pipeline complete:', draft);
        console.log('[PipelinePanel] Looking for podcast file:', outputFileName);
        // Try to get a playable URL for the produced podcast
        try {
          const url = await getPodcastPlaybackUrl(outputFileName);
          console.log('[PipelinePanel] Podcast URL result:', url ? 'found' : 'null');
          if (url) {
            setPodcastUrl(url);
          } else {
            console.warn('[PipelinePanel] Podcast file is empty or missing:', outputFileName);
          }
        } catch (err) {
          console.error('Failed to load podcast:', err);
        }
        // Auto-export to Documents/Newsroom (best-effort)
        try {
          const exported = await copyPodcastToDocuments(outputFileName);
          if (exported) {
            console.log('[PipelinePanel] Podcast exported to Documents/Newsroom');
          } else {
            console.log('[PipelinePanel] Podcast export to Documents failed — file remains in browser storage');
          }
        } catch (err) {
          console.error('[PipelinePanel] Export error:', err);
        }
      },
      onError: (error) => {
        console.error('Pipeline error:', error);
      },
    });

    runnerRef.current = runner;
    runner.run(sessionConfig, testMode);
  }, [sessionConfig, testMode]);

  const handleStop = useCallback(() => {
    runnerRef.current?.stop();
  }, []);

  const handleRerunFromStage = useCallback(
    (stageId: string) => {
      const outputFileName = getPodcastFileName(sessionConfig);
      const agents = createAgentMap();
      const runner = new PipelineRunner(agents, {
        onStateChange: (newState) => {
          setState((prev) => ({ ...prev, ...newState, selectedStageId: prev.selectedStageId }));
        },
        onComplete: async (draft) => {
          console.log('Pipeline complete:', draft);
          try {
            const url = await getPodcastPlaybackUrl(outputFileName);
            if (url) {
              setPodcastUrl(url);
            }
          } catch (err) {
            console.error('Failed to load podcast:', err);
          }
          try {
            const exported = await copyPodcastToDocuments(outputFileName);
            if (exported) {
              console.log('[PipelinePanel] Podcast exported to Documents/Newsroom');
            } else {
              console.log('[PipelinePanel] Podcast export to Documents failed — file remains in app-private storage');
            }
          } catch (err) {
            console.error('[PipelinePanel] Export error:', err);
          }
        },
        onError: (error) => {
          console.error('Pipeline error:', error);
        },
      });

      runnerRef.current = runner;
      runner.runFromStage(stageId as StageId, sessionConfig, state, testMode);
    },
    [sessionConfig, state, testMode]
  );

  const handleSelectStage = useCallback((id: string) => {
    setState((prev) => ({ ...prev, selectedStageId: id as StageId }));
  }, []);

  const handlePlayPodcast = useCallback(() => {
    if (!podcastUrl) return;
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlayingPodcast(true);
      return;
    }
    const audio = new Audio(podcastUrl);
    audio.addEventListener('ended', () => setIsPlayingPodcast(false));
    audio.addEventListener('pause', () => setIsPlayingPodcast(false));
    audio.addEventListener('error', () => setIsPlayingPodcast(false));
    audioRef.current = audio;
    audio.play();
    setIsPlayingPodcast(true);
  }, [podcastUrl]);

  const handlePausePodcast = useCallback(() => {
    audioRef.current?.pause();
    setIsPlayingPodcast(false);
  }, []);

  // Clean up audio ref on unmount
  useEffect(() => {
    return () => {
      audioRef.current = null;
    };
  }, []);

  const selectedStage = state.stages.find((s) => s.id === state.selectedStageId) ||
    (state.selectedStageId === 'topicLoop'
      ? { id: 'topicLoop', name: 'Topic Loop', icon: 'LayoutGrid', status: 'running', startTime: Date.now(), iteration: 1 } as unknown as StageRecord
      : null);

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
          {state.editorLoops > 0 && (
            <span>Editor loops: {state.editorLoops}</span>
          )}
        </div>
      </div>

      {/* Run / Stop / Play Podcast buttons */}
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

        {state.status === 'complete' && podcastUrl && (
          <button
            onClick={isPlayingPodcast ? handlePausePodcast : handlePlayPodcast}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border',
              isPlayingPodcast
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-300 hover:bg-amber-600/30'
                : 'bg-blue-600/20 border-blue-500/50 text-blue-300 hover:bg-blue-600/30'
            )}
          >
            {isPlayingPodcast ? <Pause className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
            {isPlayingPodcast ? 'Pause' : 'Play Podcast'}
          </button>
        )}
        {state.status === 'complete' && !podcastUrl && (
          <span className="flex items-center gap-2 px-4 py-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-500/30 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            Podcast file missing — check browser console
          </span>
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
          onRerunFromStage={handleRerunFromStage}
          topicLoop={state.topicLoop}
        />
      )}

      {/* Stage Detail */}
      <StageDetail stage={selectedStage} topicLoop={state.topicLoop} />
    </div>
  );
}
