import { useEffect, useState } from 'react';
import { CHAR_IDS } from '../core/types';
import { CHARACTERS } from '../content/characters';
import { advanceScene, chooseInScene, skipScene, useGame } from '../game/store';
import { backgroundCss, colorsOf, Modal, Portrait } from './common';

const SPEAKER_IDS: Record<string, string> = Object.fromEntries(CHAR_IDS.map((c) => [CHARACTERS[c].short, c]));

export function Adv() {
  const rt = useGame((g) => g.scene);
  const playerName = useGame((g) => g.state.playerName);
  const [showLog, setShowLog] = useState(false);
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        advanceScene();
      }
      if (e.key === 'Control') skipScene();
      if (e.key === 'l' || e.key === 'L') setShowLog((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!auto || !rt?.say) return;
    const t = setTimeout(advanceScene, 900 + rt.say.text.length * 45);
    return () => clearTimeout(t);
  }, [auto, rt?.say]);

  if (!rt) return null;
  const who = rt.say?.who;
  const isSys = who === '__sys';
  const speakerColor = who && !isSys ? colorsOf(who === playerName ? 'player' : (SPEAKER_IDS[who] ?? who)).accent : undefined;

  return (
    <div className="adv" onClick={() => advanceScene()} data-testid="adv">
      <div className="adv-bg" style={{ background: backgroundCss(rt.bg) }}>
        <span className="bglabel">
          {rt.bg} {rt.rating !== 'all' && <span className="tag">{rt.rating.toUpperCase()}</span>}
        </span>
      </div>
      <div className="portraits">
        {rt.shown.map((p) => (
          <Portrait key={p.id} id={p.id} costume={p.costume} expr={p.expr} />
        ))}
      </div>
      <div className="adv-tools" onClick={(e) => e.stopPropagation()}>
        <button className="small" onClick={() => setShowLog(true)}>
          로그
        </button>
        <button className={`small ${auto ? 'primary' : ''}`} onClick={() => setAuto((v) => !v)}>
          오토
        </button>
        <button className="small" onClick={skipScene} data-testid="skip">
          스킵 ▶▶
        </button>
      </div>
      {rt.choice && (
        <div className="choices" onClick={(e) => e.stopPropagation()}>
          {rt.choice.map((c, i) => (
            <button key={i} onClick={() => chooseInScene(i)} data-testid={`choice-${i}`}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="textbox">
        {who && !isSys && (
          <div className="name" style={{ background: speakerColor }}>
            {who}
          </div>
        )}
        <div className={`text ${isSys ? 'sys' : ''}`}>
          {isSys ? `◇ ${rt.say?.text}` : (rt.say?.text ?? '')}
        </div>
        <div className="muted" style={{ position: 'absolute', right: 14, bottom: 8, fontSize: 12 }}>
          클릭 / Space ▼
        </div>
      </div>
      {showLog && (
        <div onClick={(e) => e.stopPropagation()}>
          <Modal onClose={() => setShowLog(false)}>
            <h3>대사 로그</h3>
            {rt.history.map((h, i) => (
              <div key={i} className="report-line">
                {h.who && h.who !== '__sys' ? <b>{h.who}: </b> : null}
                <span className={h.who === '__sys' ? 'sys' : ''}>{h.text}</span>
              </div>
            ))}
          </Modal>
        </div>
      )}
    </div>
  );
}
