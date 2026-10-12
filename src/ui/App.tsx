import { lazy, Suspense } from 'react';
import { useGame } from '../game/store';
import { Adv } from './Adv';
import { Battle } from './Battle';
import { PopupLayer } from './common';
import { Ending } from './Ending';
import { Hub } from './Hub';
import { Title } from './Title';
import { Tower } from './Tower';

// 릴리스 빌드에서는 디버그 콘솔 코드가 번들에서 빠진다
const DebugConsole =
  import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true' ? lazy(() => import('../debug/Console')) : null;

export function App() {
  const mode = useGame((g) => g.mode);
  const back = useGame((g) => g.sceneReturn);
  // 씬 재생 중에는 씬이 끝나고 돌아갈 화면을 뒤에 깔아 둔다
  const base = mode === 'adv' ? back : mode;
  return (
    <>
      {base === 'title' && <Title />}
      {base === 'hub' && <Hub />}
      {base === 'tower' && <Tower />}
      {base === 'battle' && <Battle />}
      {base === 'ending' && <Ending />}
      {mode === 'adv' && <Adv />}
      <PopupLayer />
      {DebugConsole && (
        <Suspense fallback={null}>
          <DebugConsole />
        </Suspense>
      )}
    </>
  );
}
