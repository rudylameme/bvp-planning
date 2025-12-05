import { useState } from 'react';
import { Monitor, Tablet } from 'lucide-react';

export default function ModeSwitch() {
  const [mode, setMode] = useState('desktop'); // 'desktop' | 'tablette'

  return (
    <button
      onClick={() => setMode(prev => prev === 'desktop' ? 'tablette' : 'desktop')}
      className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
    >
      {mode === 'desktop' ? (
        <>
          <Monitor size={18} />
          <span className="text-sm">Desktop</span>
        </>
      ) : (
        <>
          <Tablet size={18} />
          <span className="text-sm">Tablette</span>
        </>
      )}
    </button>
  );
}
