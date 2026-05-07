import { useState } from 'react';
import { Toaster } from 'sonner';
import NewsroomScreen from './components/NewsroomScreen';
import ConfigureApiScreen from './components/ConfigureApiScreen';
import ScreenTabs from './components/ScreenTabs';
import type { SessionConfig } from './lib/sessionConfig';

type Screen = 'newsroom' | 'configure';

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('newsroom');
  const [sessionContext, setSessionContext] = useState<SessionConfig | null>(null);

  return (
    <div className="min-h-[100dvh] bg-black flex justify-center">
      <div className="w-full max-w-[430px] md:aspect-[9/19.5] md:max-h-[95dvh] md:rounded-[2rem] md:border-[8px] md:border-slate-800 md:overflow-hidden shadow-2xl bg-slate-950 relative">
        <div className="min-h-[100dvh] md:min-h-full md:overflow-y-auto">
          <Toaster position="top-right" theme="dark" />
          <ScreenTabs activeScreen={activeScreen} onChange={setActiveScreen} />
          {activeScreen === 'newsroom' && <NewsroomScreen sessionContext={sessionContext} onSessionContextChange={setSessionContext} />}
          {activeScreen === 'configure' && <ConfigureApiScreen />}
        </div>
      </div>
    </div>
  );
}

export default App;
