import { CHARACTERS } from '../content/characters';
import { TRIALS, floorKind, floorLabel, villageName, zoneOf } from '../content/floors';
import { CONSUMABLE_IDS, ITEMS } from '../content/items';
import { memberStats } from '../systems/stats';
import {
  NODE_INFO,
  TOWER_EVENT_MAP,
  canContinue,
  hiddenSight,
  type FloorMap,
  type MapNode,
} from '../systems/tower';
import { chooseTowerEvent, choosePerk, exitTower, leaveVillage, moveNode, nextFloor, towerTitle, useGame, villageBuy } from '../game/store';
import { Bar, CharDot, Modal } from './common';
import { Hud } from './Hub';
import type { GameState } from '../core/types';

function nodePos(map: FloorMap, n: MapNode) {
  const x = 12 + ((n.col + 0.6) / 3.2) * 76;
  const y = 92 - (n.layer / Math.max(1, map.layers - 1)) * 84;
  return { x, y };
}

function MapView({ s }: { s: GameState }) {
  const run = useGame((g) => g.run)!;
  const map = run.map;
  const cur = map.nodes[map.current];
  const sight = hiddenSight(s, run.party);
  const preview = s.guild.facilities.info >= 1;
  const locked = run.floorDone || !!run.event || !!run.pendingPerks || run.atVillage;
  const visible = (n: MapNode) => !n.hidden || sight;

  return (
    <div className="map" style={{ height: Math.max(420, map.layers * 90) }} data-testid="map">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        {map.nodes.filter(visible).flatMap((n) =>
          n.next
            .map((id) => map.nodes[id])
            .filter(visible)
            .map((m) => {
              const a = nodePos(map, n);
              const b = nodePos(map, m);
              const active = n.id === cur.id && !locked;
              return (
                <line
                  key={`${n.id}-${m.id}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={active ? '#6be09a' : 'rgba(200,210,255,0.25)'}
                  strokeWidth={active ? 0.8 : 0.5}
                  strokeDasharray={m.hidden ? '1.5 1.5' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
              );
            }),
        )}
      </svg>
      {map.nodes.filter(visible).map((n) => {
        const { x, y } = nodePos(map, n);
        const reach = !locked && cur.next.includes(n.id) && run.timeLeft > 0;
        const known = preview || n.visited || cur.next.includes(n.id) || n.type === 'exit' || n.type === 'boss';
        const info = NODE_INFO[n.type];
        return (
          <button
            key={n.id}
            className={`node ${n.visited ? 'visited' : ''} ${n.id === cur.id ? 'current' : ''} ${reach ? 'reach' : ''} ${n.hidden ? 'hiddenNode' : ''}`}
            style={{ left: `${x}%`, top: `${y}%` }}
            disabled={!reach}
            onClick={() => moveNode(n.id)}
            title={known ? `${info.label} (시간 ${info.cost})` : '???'}
            data-testid={`node-${n.id}`}
            data-type={n.type}
          >
            {known ? (n.type === 'personal' && n.personal ? '💗' : info.icon) : '❔'}
            {reach && <span className="cost">⏳{info.cost}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Tower() {
  const s = useGame((g) => g.state);
  const run = useGame((g) => g.run);
  if (!run) return null;
  const zone = zoneOf(run.floor);
  const kind = floorKind(run.floor);
  const trial = TRIALS[run.floor];
  const ev = run.event ? TOWER_EVENT_MAP[run.event] : null;
  const zoneClass = run.floor > 100 ? 'zoneroot' : `zone${zone.id}`;

  return (
    <>
      <Hud />
      <div className="tower-wrap">
        <div className={`panel ${zoneClass}`} style={{ position: 'relative' }}>
          <div className="row">
            <h2 className="grow" style={{ margin: 0 }} data-testid="floor-title">
              {towerTitle(run)}{' '}
              <span className="muted" style={{ fontSize: 14 }}>
                {zone.name}
                {kind === 'trial' && trial ? ` · 🔱 ${trial.name}` : ''}
                {kind === 'guardian' || kind === 'rootBoss' ? ' · 👑 수호자층' : ''}
                {kind === 'village' ? ` · 🏮 ${villageName(run.floor)}` : ''}
              </span>
            </h2>
          </div>
          {kind === 'trial' && trial && <div className="sys-window panel" style={{ padding: 8, margin: '8px 0', fontSize: 13 }}>◇ {trial.rule}</div>}
          <div className="row" style={{ fontSize: 13 }}>
            <span>⏳ 등반 시간 {Math.max(0, run.timeLeft)}/{run.timeMax}</span>
            <span className="grow">
              <Bar value={run.timeLeft} max={run.timeMax} kind="time" />
            </span>
            <span>💎 +{run.stones}</span>
          </div>
          <MapView s={s} />
          <div className="muted" style={{ fontSize: 12 }}>
            초록 테두리 노드로 이동합니다. 해가 지면(등반 시간 0) 강제로 귀환합니다. 정보실 Lv1부터 노드 종류가 미리 보입니다.
          </div>
        </div>

        <div className="col">
          <div className="panel">
            <h4>파티</h4>
            {run.party.map((c) => {
              const st = memberStats(s, c);
              return (
                <div key={c} className="row" style={{ marginBottom: 6 }}>
                  <CharDot id={c} size={22} />
                  <span style={{ width: 40 }}>{CHARACTERS[c].short}</span>
                  <span className="grow">
                    <Bar value={run.hp[c]} max={st.hp} />
                    <Bar value={run.mp[c]} max={st.mp} kind="mp" />
                  </span>
                  <span className="muted" style={{ fontSize: 11, width: 70, textAlign: 'right' }}>
                    {run.hp[c]}/{st.hp}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="panel col">
            {run.floorDone ? (
              <>
                <div className="good">✓ {floorLabel(run.floor)} 돌파</div>
                <button className="primary" disabled={!canContinue(s, run) || !!run.pendingPerks} onClick={nextFloor} data-testid="next-floor">
                  다음 층으로 ▲
                </button>
              </>
            ) : null}
            <button onClick={() => exitTower('voluntary')} data-testid="leave">
              귀환하기
            </button>
          </div>

          <div className="panel">
            <h4>등반 기록</h4>
            <div className="log" style={{ maxHeight: 260 }}>
              {[...run.log].reverse().map((l, i) => (
                <div key={i} style={l.startsWith('[탑의 목소리]') ? { color: 'var(--sys)' } : undefined}>
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {ev && (
        <Modal>
          <h3>❓ {ev.title}</h3>
          <p>{ev.text}</p>
          <div className="col">
            {ev.choices.map((c, i) => (
              <button key={i} onClick={() => chooseTowerEvent(i)}>
                {c.label}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {run.pendingPerks && <PerkModal />}
      {run.atVillage && <VillageModal />}
    </>
  );
}

function PerkModal() {
  const run = useGame((g) => g.run)!;
  return (
    <div className="overlay">
      <div className="panel modal sys-window" data-testid="perks">
        <h3>◇ 층 특전 — {floorLabel(run.floor)} 최초 돌파</h3>
        <p className="sys-line">[탑의 목소리] 보상을 하나 선택하십시오.</p>
        <div className="col">
          {run.pendingPerks!.map((p) => (
            <button key={p.id} onClick={() => choosePerk(p)} style={{ textAlign: 'left' }}>
              <b>{p.name}</b> <span className="muted">— {p.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VillageModal() {
  const s = useGame((g) => g.state);
  const run = useGame((g) => g.run)!;
  const total = s.guild.stones + run.stones;
  return (
    <Modal wide>
      <h3>🏮 안전층 마을 「{villageName(run.floor)}」</h3>
      <p className="muted">파티가 완전히 회복됐다. 탑 전용 상점에서 마석으로 물건을 살 수 있다. (보유 마석 {total})</p>
      <div className="col" style={{ gap: 6 }}>
        {CONSUMABLE_IDS.map((id) => {
          const price = ITEMS[id].stonePrice ?? 0;
          return (
            <div key={id} className="row card" style={{ padding: 8 }}>
              <span className="grow">
                <b>{ITEMS[id].name}</b> <span className="muted">{ITEMS[id].desc} · 보유 {s.inventory[id] ?? 0}</span>
              </span>
              <button
                className="small"
                disabled={total < price}
                onClick={() => villageBuy(id, price)}
              >
                💎 {price}
              </button>
            </div>
          );
        })}
      </div>
      <button className="primary" style={{ marginTop: 10 }} onClick={leaveVillage} data-testid="leave-village">
        마을을 나선다
      </button>
    </Modal>
  );
}
