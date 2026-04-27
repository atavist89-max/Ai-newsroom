import { useState } from 'react';
import { Toaster } from 'sonner';
import NewsroomScreen from './components/NewsroomScreen';
import ConfigureApiScreen from './components/ConfigureApiScreen';
import ScreenTabs from './components/ScreenTabs';

type Screen = 'newsroom' | 'configure';

function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('newsroom');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <Toaster position="top-right" theme="dark" />
      <ScreenTabs activeScreen={activeScreen} onChange={setActiveScreen} />
      {activeScreen === 'newsroom' && <NewsroomScreen />}
      {activeScreen === 'configure' && <ConfigureApiScreen />}
    </div>
  );
}

export default App;
