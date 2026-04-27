import { useState, useCallback, useRef, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { Mic2, Music, Globe, Clock, Check, Radio, Newspaper, Scale, Play, Pause, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { continents } from '../data/countries';
import { timeframes } from '../data/timeframes';
import { topics } from '../data/topics';
import { voices } from '../data/voices';
import { musicStyles, defaultMusicSuite } from '../data/music';
import { biasOptions, biasAgent1Instructions } from '../data/bias';
import { BiasSelector } from './BiasSelector';
import { CountryMap } from './CountryMap';
import { CountrySearch } from './CountrySearch';
import { loadApiConfig } from '../lib/apiConfig';
import { buildSessionConfig } from '../lib/sessionConfig';
import type { SessionConfig } from '../lib/sessionConfig';
import PipelinePanel from './pipeline/PipelinePanel';
import type { Country, Continent, Timeframe, Topic as TopicType, Voice, MusicSuite, BiasPosition, MusicStyle } from '../types';

interface Newsroom2ScreenProps {
  sessionContext: SessionConfig | null;
  onSessionContextChange: (ctx: SessionConfig | null) => void;
}

export default function Newsroom2Screen({ sessionContext: _sessionContext, onSessionContextChange }: Newsroom2ScreenProps) {
  // Selection states (identical to Newsroom)
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<Continent>(Object.values(continents)[0]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('daily');
  const [selectedTopics, setSelectedTopics] = useState<TopicType[]>(['General News']);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(voices[0]);
  const [selectedMusicSuite, setSelectedMusicSuite] = useState<MusicSuite>(defaultMusicSuite);
  const [selectedBias, setSelectedBias] = useState<BiasPosition>('moderate');
  const [includeEditorialSegment, setIncludeEditorialSegment] = useState(false);

  // Audio preview state (identical to Newsroom)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [playingMusic, setPlayingMusic] = useState<{ category: string; styleId: string } | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  const [hasApiKey, setHasApiKey] = useState(true);

  // Check API key on mount
  useEffect(() => {
    loadApiConfig().then((config) => {
      setHasApiKey(!!config.apiKey.trim());
    });
  }, []);

  // Clear session context whenever configuration changes
  useEffect(() => {
    onSessionContextChange(null);
  }, [selectedCountry, selectedContinent, selectedTimeframe, selectedTopics, selectedVoice, selectedBias, includeEditorialSegment, onSessionContextChange]);



  // Handle country selection
  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country);
    const continent = continents[country.continentCode];
    if (continent) {
      setSelectedContinent(continent);
    }
    toast.success(`Selected ${country.name}`);
  }, []);

  // Handle topic toggle
  const handleTopicToggle = useCallback((topic: TopicType) => {
    setSelectedTopics(prev => {
      if (prev.includes(topic)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== topic);
      }
      if (prev.length >= 3) return prev;
      return [...prev, topic];
    });
  }, []);

  // Voice preview handler
  const handleVoicePreview = useCallback(async (voice: Voice, e: React.MouseEvent) => {
    e.stopPropagation();
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current = null;
    }
    if (playingVoiceId === voice.id) {
      setPlayingVoiceId(null);
      return;
    }
    try {
      const audio = new Audio(`./audio/voices/${voice.id}.mp3`);
      voiceAudioRef.current = audio;
      audio.addEventListener('ended', () => {
        setPlayingVoiceId(null);
        voiceAudioRef.current = null;
      });
      audio.addEventListener('error', () => {
        console.error('Error playing audio preview');
        setPlayingVoiceId(null);
        voiceAudioRef.current = null;
      });
      setPlayingVoiceId(voice.id);
      await audio.play();
    } catch {
      setPlayingVoiceId(null);
    }
  }, [playingVoiceId]);

  // Music preview handler
  const handleMusicPreview = useCallback(async (category: string, style: MusicStyle, e: React.MouseEvent) => {
    e.stopPropagation();
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }
    if (playingMusic?.category === category && playingMusic?.styleId === style.id) {
      setPlayingMusic(null);
      return;
    }
    try {
      const audioPrefix = category === 'storySting' ? 'story' : category === 'blockSting' ? 'block' : category;
      const audio = new Audio(`./audio/${audioPrefix}_${style.id}.mp3`);
      musicAudioRef.current = audio;
      audio.addEventListener('ended', () => {
        setPlayingMusic(null);
        musicAudioRef.current = null;
      });
      audio.addEventListener('error', () => {
        console.error('Error playing audio preview');
        setPlayingMusic(null);
        musicAudioRef.current = null;
      });
      setPlayingMusic({ category, styleId: style.id });
      await audio.play();
    } catch {
      setPlayingMusic(null);
    }
  }, [playingMusic]);

  const sessionConfig = selectedCountry
    ? buildSessionConfig({
        country: selectedCountry,
        continent: selectedContinent,
        timeframe: selectedTimeframe,
        topics: selectedTopics,
        voice: selectedVoice,
        bias: selectedBias,
        includeEditorialSegment,
        musicSuite: selectedMusicSuite,
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Toaster position="top-right" theme="dark" />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Newsroom</h1>
              <p className="text-sm text-slate-400">Configure your automated news podcast</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column - Configuration */}
          <div className="space-y-4">
            
            {/* Geographic Selection */}
            <Section icon={Globe} title="Geographic Selection">
              <div className="space-y-3">
                <CountrySearch value={selectedCountry} onChange={handleCountrySelect} />
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span>Continent: {selectedContinent.name}</span>
                  <span>•</span>
                  <span>{selectedCountry ? `${selectedCountry.newsSources.length} news sources` : 'No country selected'}</span>
                </div>
                <CountryMap selectedCountry={selectedCountry} selectedContinent={selectedContinent} />
              </div>
            </Section>

            {/* Timeframe */}
            <Section icon={Clock} title="Timeframe">
              <div className="grid grid-cols-3 gap-2">
                {timeframes.map(tf => (
                  <button
                    key={tf.value}
                    onClick={() => setSelectedTimeframe(tf.value)}
                    className={cn(
                      "p-3 rounded-lg border text-center transition-all",
                      selectedTimeframe === tf.value
                        ? "bg-blue-900/30 border-blue-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750"
                    )}
                  >
                    <div className="font-medium">{tf.label.split(' ')[0]}</div>
                    <div className="text-xs opacity-70">{tf.days} day{tf.days > 1 ? 's' : ''}</div>
                  </button>
                ))}
              </div>
            </Section>

            {/* Topics */}
            <Section icon={Newspaper} title="Topics">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {topics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => handleTopicToggle(topic)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm text-left transition-all border",
                      selectedTopics.includes(topic)
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                        : "bg-slate-800 border-transparent text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selected: {selectedTopics.length}/3
              </p>
            </Section>

            {/* Voice Selection */}
            <Section icon={Mic2} title="Voice Selection">
              <div className="space-y-2">
                {voices.map(voice => {
                  const isSelected = selectedVoice.id === voice.id;
                  const isPlaying = playingVoiceId === voice.id;
                  return (
                    <button
                      key={voice.id}
                      onClick={() => setSelectedVoice(voice)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                        isSelected
                          ? "bg-blue-900/30 border-blue-500"
                          : "bg-slate-800 border-slate-700 hover:bg-slate-750"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-blue-500/20" : "bg-slate-700"
                      )}>
                        <Mic2 className={cn("w-5 h-5", isSelected ? "text-blue-400" : "text-slate-400")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-medium", isSelected ? "text-white" : "text-slate-300")}>
                            {voice.label}
                          </span>
                          <span className="text-xs text-slate-500">
                            {voice.gender === 'male' ? '♂' : '♀'} {voice.accent}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 truncate">{voice.description}</p>
                      </div>
                      <button
                        onClick={(e) => handleVoicePreview(voice, e)}
                        className={cn(
                          "p-2 rounded-full transition-colors flex-shrink-0",
                          isPlaying
                            ? "bg-blue-500 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
                        )}
                        title="Preview voice"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Editorial Settings */}
            <Section icon={Scale} title="Editorial Settings">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-3">Editorial Perspective</h3>
                  <BiasSelector value={selectedBias} onChange={setSelectedBias} />
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-2">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {biasOptions.find(b => b.id === selectedBias)?.label} Perspective
                  </h4>
                  <div className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">
                    {biasAgent1Instructions[selectedBias]}
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEditorialSegment}
                      onChange={(e) => setIncludeEditorialSegment(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-300">Include Editorial Segment</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* Music Suite */}
            <Section icon={Music} title="Music Suite">
              <div className="space-y-3">
                {([
                  { key: 'intro', label: 'Intro Music' },
                  { key: 'outro', label: 'Outro Music' },
                  { key: 'storySting', label: 'Story Sting' },
                  { key: 'blockSting', label: 'Block Transition' }
                ] as const).map(slot => {
                  const selectedStyle = selectedMusicSuite[slot.key];
                  const isPlaying = playingMusic?.category === slot.key && playingMusic?.styleId === selectedStyle.id;
                  return (
                    <div key={slot.key} className="bg-slate-800 border border-slate-700 rounded-lg p-3">
                      <div className="text-sm font-medium text-slate-300 mb-2">{slot.label}</div>
                      <div className="flex gap-2">
                        <select
                          value={selectedStyle.id}
                          onChange={(e) => {
                            const style = musicStyles.find(s => s.id === e.target.value);
                            if (style) {
                              setSelectedMusicSuite(prev => ({ ...prev, [slot.key]: style }));
                            }
                          }}
                          className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {musicStyles.map(style => (
                            <option key={style.id} value={style.id}>
                              {style.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={(e) => handleMusicPreview(slot.key, selectedStyle, e)}
                          className={cn(
                            "px-3 py-2 rounded transition-colors flex items-center gap-1 flex-shrink-0",
                            isPlaying
                              ? "bg-blue-500 text-white"
                              : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
                          )}
                          title="Preview music style"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 truncate">
                        {selectedStyle.description} • {selectedStyle.mood}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>

          {/* Right Column - Output */}
          <div className="space-y-4">
            
            {/* Configuration Summary */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                Configuration Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Country</span>
                  <span className="text-white">{selectedCountry?.name ?? 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timeframe</span>
                  <span className="text-white">{timeframes.find(t => t.value === selectedTimeframe)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Topics</span>
                  <span className="text-white">{selectedTopics.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Voice</span>
                  <span className="text-white">{selectedVoice.label}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500">Country Sources</span>
                  <span className="text-white text-right">{selectedCountry ? selectedCountry.newsSources.join(', ') : '—'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500">Continent Sources</span>
                  <span className="text-white text-right">{selectedContinent.newsSources.map(s => s.name).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Editorial Perspective</span>
                  <span className="text-white">{biasOptions.find(b => b.id === selectedBias)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Include Editorial Segment</span>
                  <span className="text-white">{includeEditorialSegment ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {!hasApiKey && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-900/20 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>No API key configured. Go to Configure API to add one.</span>
              </div>
            )}

            {/* Pipeline Panel */}
            {sessionConfig ? (
              <PipelinePanel sessionConfig={sessionConfig} />
            ) : (
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-center text-sm text-slate-500">
                Select a country to run the pipeline
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// Section component
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}
