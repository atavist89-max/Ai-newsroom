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
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Toaster position="top-right" theme="dark" />
      <ScreenTabs activeScreen={activeScreen} onChange={setActiveScreen} />
      {activeScreen === 'newsroom' && <NewsroomScreen sessionContext={sessionContext} onSessionContextChange={setSessionContext} />}
      {activeScreen === 'configure' && <ConfigureApiScreen />}
    </div>
  );
}

export default App;
