import { CHARACTERS, STAGE_NAMES } from '../content/characters';
import { recruitedIds } from '../core/state';
import { endingLabel } from '../systems/ending';
import { won } from '../systems/economy';
import { toTitle, useGame } from '../game/store';

export function Ending() {
  const s = useGame((g) => g.state);
  const id = s.ending ?? 'normal';
  return (
    <div className="title-screen">
      <div className="title-card panel" style={{ background: 'rgba(13,16,32,0.85)' }} data-testid="ending">
        <div className="title-tower" style={{ height: 120 }} />
        <h1 style={{ fontSize: 26 }}>{endingLabel(id)}</h1>
        <div className="col" style={{ textAlign: 'left', margin: '14px 0' }}>
          <div>
            최고 기록 <b>{s.tower.record}층</b>
            {s.tower.rootRecord > 0 && ` · 역탑 B${s.tower.rootRecord}`}
          </div>
          <div>
            상환 {won(s.guild.repaid)} · 남은 빚 {won(s.guild.debt)}
          </div>
          <div>명성 {s.guild.fame} · 칭호 {s.tower.titles.length}개 · 유물 {s.tower.relics.length}개</div>
          {recruitedIds(s).map((c) => (
            <div key={c} className="muted">
              {CHARACTERS[c].name} — {STAGE_NAMES[s.members[c].stage]} (호감 {Math.floor(s.members[c].affection)})
            </div>
          ))}
        </div>
        <button className="primary" onClick={toTitle}>
          타이틀로
        </button>
      </div>
    </div>
  );
}
