import { cn } from '../lib/utils';

type Screen = 'newsroom' | 'configure';

interface ScreenTabsProps {
  activeScreen: Screen;
  onChange: (screen: Screen) => void;
}

export default function ScreenTabs({ activeScreen, onChange }: ScreenTabsProps) {
  return (
    <div className="w-full flex border-b border-slate-800 bg-slate-900/50">
      <button
        onClick={() => onChange('newsroom')}
        className={cn(
          'flex-1 py-3 text-sm font-medium transition-all text-center',
          activeScreen === 'newsroom'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        )}
      >
        Newsroom
      </button>
      <button
        onClick={() => onChange('configure')}
        className={cn(
          'flex-1 py-3 text-sm font-medium transition-all text-center',
          activeScreen === 'configure'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        )}
      >
        Configure API
      </button>
    </div>
  );
}
