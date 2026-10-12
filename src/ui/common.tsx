import type { ReactNode } from 'react';
import { CHARACTERS, PROTAGONIST } from '../content/characters';
import { CHAR_IDS, type CharId } from '../core/types';
import { closePopup, useGame } from '../game/store';

export function Bar({ value, max, kind = '' }: { value: number; max: number; kind?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`bar ${kind}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Modal({ children, onClose, wide }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel modal" style={wide ? { width: 'min(820px, 100%)' } : undefined} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

/** 결과·정산·탑의 목소리 팝업 (씬 재생 중에는 기다린다) */
export function PopupLayer() {
  const popups = useGame((g) => g.popups);
  const mode = useGame((g) => g.mode);
  const p = popups[0];
  if (!p || mode === 'adv') return null;
  return (
    <div className="overlay" onClick={closePopup}>
      <div
        className={`panel modal ${p.kind === 'system' ? 'sys-window' : ''}`}
        onClick={(e) => e.stopPropagation()}
        data-testid="popup"
      >
        <h3>{p.kind === 'system' ? `◇ ${p.title}` : p.title}</h3>
        <div className="col" style={{ gap: 2 }}>
          {p.lines.map((l, i) => (
            <div key={i} className={p.kind === 'system' ? 'sys-line' : 'report-line'}>
              {l}
            </div>
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          {popups.length > 1 && <span className="muted">+{popups.length - 1}</span>}
          <button className="primary" onClick={closePopup} autoFocus>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

const NPC_COLORS: Record<string, { hair: string; eye: string; accent: string; name: string }> = {
  player: { ...PROTAGONIST.color, name: '도연' },
  baek: { hair: '#555', eye: '#222', accent: '#1d1d1d', name: '백승철' },
  minseo: { hair: '#2b2b38', eye: '#6b8', accent: '#3f5f7f', name: '강민서' },
};

const EXPR: Record<string, string> = {
  neutral: '·_·',
  smile: '^‿^',
  blush: '///',
  sad: 'ㅠ_ㅠ',
  angry: '>_<',
  surprised: 'O_O',
  serious: '-_-',
};

export function colorsOf(id: string) {
  if ((CHAR_IDS as readonly string[]).includes(id)) {
    const c = CHARACTERS[id as CharId];
    return { ...c.color, name: c.short };
  }
  return NPC_COLORS[id] ?? { hair: '#777', eye: '#333', accent: '#555', name: id };
}

/** 플레이스홀더 스탠딩. 아트가 들어오면 static / layered / live2d 백엔드로 교체 (GDD §13.2) */
export function Portrait({ id, costume, expr }: { id: string; costume: string; expr: string }) {
  const c = colorsOf(id);
  return (
    <div className="portrait" title={`${id} / ${costume} / ${expr}`}>
      <div className="head">
        <div className="hair" style={{ background: c.hair }} />
        <div className="face" style={{ color: c.eye }}>
          {EXPR[expr] ?? '·_·'}
        </div>
      </div>
      <div className="body" style={{ background: `linear-gradient(180deg, ${c.accent}, ${c.hair})` }} />
      <div className="label">
        {c.name} · {costume}
      </div>
    </div>
  );
}

export function CharDot({ id, size = 26 }: { id: string; size?: number }) {
  const c = colorsOf(id);
  return <span className="dot" style={{ width: size, height: size, background: `linear-gradient(135deg, ${c.hair}, ${c.accent})` }} />;
}

const BG: Record<string, string> = {
  euljiro_morning: 'linear-gradient(180deg, #9cc3ff, #f2e3c9)',
  euljiro_night: 'linear-gradient(180deg, #0b0f26, #3a2b4a)',
  office_day: 'linear-gradient(180deg, #c9b79a, #7d6a52)',
  office_night: 'linear-gradient(180deg, #2a2438, #120f1c)',
  rooftop_day: 'linear-gradient(180deg, #8ec5ff, #e8f1ff 60%, #9aa 100%)',
  rooftop_night: 'radial-gradient(ellipse at 75% 10%, rgba(255,255,255,0.35), transparent 30%), linear-gradient(180deg, #070a1f, #23285a)',
  cafe_day: 'linear-gradient(180deg, #e9c99b, #8d6340)',
  cafe_night: 'linear-gradient(180deg, #4b3326, #1c120c)',
  dorm_night: 'linear-gradient(180deg, #2d2440, #120e1d)',
  bath_night: 'linear-gradient(180deg, #2c4f5d, #0e1d24)',
  training_night: 'linear-gradient(180deg, #303540, #111318)',
  hangang_night: 'linear-gradient(180deg, #0c1636, #1d3d6b 70%, #0b1a2e)',
  namsan_night: 'radial-gradient(ellipse at 50% 20%, rgba(255,210,150,0.35), transparent 40%), linear-gradient(180deg, #0a0f2a, #2b2350)',
  cheonggye_night: 'linear-gradient(180deg, #0b1230, #263b6a 60%, #0f1d38)',
  amusement_night: 'radial-gradient(circle at 30% 30%, rgba(255,120,200,0.35), transparent 30%), linear-gradient(180deg, #160c2c, #3b1d4f)',
  association: 'linear-gradient(180deg, #d8dde6, #8f98a8)',
  tower_lobby: 'radial-gradient(ellipse at 50% 0%, #ffffff, #c9d2f0 40%, #59607d)',
  village_lantern: 'radial-gradient(circle at 50% 40%, rgba(255,190,110,0.5), transparent 50%), linear-gradient(180deg, #24411f, #0f1d0d)',
  village_inn: 'linear-gradient(180deg, #5a3b22, #20140b)',
  sealed_room: 'radial-gradient(circle at 50% 50%, rgba(155,231,196,0.45), transparent 45%), linear-gradient(180deg, #102a22, #050d0b)',
  zone1: 'linear-gradient(180deg, #4a4856, #1e1d27)',
  zone2: 'linear-gradient(180deg, #2d6b55, #0f231e)',
  zone3: 'linear-gradient(180deg, #1f4f80, #0b1a2e)',
  zone4: 'linear-gradient(180deg, #a8783c, #2e2213)',
  zone5: 'linear-gradient(180deg, #9cc8f2, #3b5f96)',
  root: 'radial-gradient(circle at 50% 70%, rgba(255,60,110,0.35), transparent 40%), linear-gradient(180deg, #3a0f24, #12050c)',
};

export function hasBackground(id: string): boolean {
  return id in BG;
}

export function backgroundCss(id: string): string {
  return BG[id] ?? 'linear-gradient(180deg, #1a1f3d, #0d1020)';
}
