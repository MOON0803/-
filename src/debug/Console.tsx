import { useEffect, useRef, useState } from 'react';
import { runCommand } from './commands';

interface Line {
  text: string;
  kind: 'cmd' | 'out' | 'err';
}

export default function Console() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([{ text: '디버그 콘솔. help 로 명령 목록.', kind: 'out' }]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const outRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '`') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) inRef.current?.focus();
  }, [open]);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [lines]);

  const exec = (cmd: string) => {
    const next: Line[] = [{ text: `> ${cmd}`, kind: 'cmd' }];
    try {
      next.push(...runCommand(cmd).map((text) => ({ text, kind: 'out' as const })));
    } catch (e) {
      next.push({ text: (e as Error).message, kind: 'err' });
    }
    setLines((l) => [...l, ...next].slice(-400));
    setHistory((h) => [cmd, ...h.filter((x) => x !== cmd)].slice(0, 50));
    setHIdx(-1);
  };

  if (!open)
    return (
      <button className="debug-fab small" onClick={() => setOpen(true)} data-testid="debug-open">
        🐞 콘솔
      </button>
    );

  return (
    <div className="console" data-testid="console" onClick={(e) => e.stopPropagation()}>
      <div className="out" ref={outRef}>
        {lines.map((l, i) => (
          <div key={i} className={l.kind}>
            {l.text}
          </div>
        ))}
      </div>
      <input
        ref={inRef}
        value={input}
        placeholder="명령 입력 (help) — ` 로 닫기"
        data-testid="console-input"
        onChange={(e) => setInput(e.target.value.replace('`', ''))}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && input.trim()) {
            exec(input.trim());
            setInput('');
          } else if (e.key === 'ArrowUp') {
            const i = Math.min(history.length - 1, hIdx + 1);
            if (history[i]) {
              setHIdx(i);
              setInput(history[i]);
            }
          } else if (e.key === 'ArrowDown') {
            const i = hIdx - 1;
            setHIdx(Math.max(-1, i));
            setInput(i >= 0 ? history[i] : '');
          } else if (e.key === '`' || e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
          }
        }}
      />
    </div>
  );
}
