import { useState } from 'react';
import { PROTAGONIST } from '../content/characters';
import { SLOTS, SLOT_LABEL, slotInfo } from '../core/save';
import { ADULT_BUILD, loadGame, newGame } from '../game/store';

export function Title() {
  const [name, setName] = useState(PROTAGONIST.defaultName);
  const [showLoad, setShowLoad] = useState(false);
  const auto = slotInfo('auto');
  return (
    <div className="title-screen">
      <div className="title-card panel" style={{ background: 'rgba(13,16,32,0.75)' }}>
        <div className="title-tower" />
        <h1>백탑 길드 하우스</h1>
        <div className="sub">혼자서는 오를 수 없는 탑 · 프로토타입 {ADULT_BUILD ? '(성인 빌드)' : '(전연령 빌드)'}</div>
        <div className="col">
          <label className="row" style={{ justifyContent: 'center' }}>
            주인공 이름
            <input value={name} maxLength={8} onChange={(e) => setName(e.target.value)} data-testid="name" />
          </label>
          <button className="primary" onClick={() => newGame(name)} data-testid="new-game">
            새 게임
          </button>
          <button disabled={!auto} onClick={() => loadGame('auto')}>
            이어하기 {auto && <span className="muted">— {auto.summary}</span>}
          </button>
          <button onClick={() => setShowLoad((v) => !v)}>불러오기</button>
          {showLoad &&
            SLOTS.map((slot) => {
              const info = slotInfo(slot);
              return (
                <button key={slot} className="small" disabled={!info} onClick={() => loadGame(slot)}>
                  {SLOT_LABEL[slot]} {info ? `— ${info.summary}` : '(비어 있음)'}
                </button>
              );
            })}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          모든 등장인물은 성인입니다. 플레이스홀더 아트로 구동되는 개발 빌드입니다.
          <br />
          개발 빌드에서는 <code>`</code> 키로 디버그 콘솔을 엽니다.
        </p>
      </div>
    </div>
  );
}
