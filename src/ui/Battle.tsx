import { useEffect, useRef, useState } from 'react';
import { CONSUMABLE_IDS, ITEMS } from '../content/items';
import { SKILLS } from '../content/skills';
import { LINK_COMMANDS, canUseLink, canUseSkill, current, timeline, type LinkCommand, type Unit } from '../systems/battle';
import { battleAct, battleEnemyStep, battleFinish, battleLink, useGame } from '../game/store';
import { Bar, CharDot } from './common';
import { Hud } from './Hub';

type Pending =
  | { kind: 'attack' }
  | { kind: 'skill'; skillId: string; side: 'foe' | 'friend' | 'dead' }
  | { kind: 'item'; itemId: string; side: 'friend' | 'dead' }
  | { kind: 'burst' }
  | null;

function buffText(u: Unit) {
  const parts = u.buffs.map((b) => `${b.stat}${b.amount > 0 ? '↑' : '↓'}${b.turns}`);
  if (u.taunt) parts.push(`도발${u.taunt}`);
  if (u.poison) parts.push(`독${u.poison.turns}`);
  if (u.evade) parts.push('회피');
  if (u.defending) parts.push('방어');
  return parts.join(' ');
}

export function Battle() {
  const b = useGame((g) => g.battle);
  const [pending, setPending] = useState<Pending>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const actor = b ? current(b) : undefined;

  // 적 턴은 자동으로 진행
  useEffect(() => {
    if (!b || b.result || !actor || actor.side !== 'enemy') return;
    const t = setTimeout(battleEnemyStep, 450);
    return () => clearTimeout(t);
  }, [b, actor]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [b?.log.length]);

  useEffect(() => setPending(null), [b?.turn]);

  if (!b) return null;
  const enemies = b.units.filter((u) => u.side === 'enemy');
  const allies = b.units.filter((u) => u.side === 'ally');
  const myTurn = actor?.side === 'ally' && !b.result;

  const targetable = (u: Unit) => {
    if (!pending || !myTurn) return false;
    if (pending.kind === 'attack' || pending.kind === 'burst') return u.side === 'enemy' && u.alive;
    if (pending.side === 'foe') return u.side === 'enemy' && u.alive;
    if (pending.side === 'dead') return u.side === 'ally' && !u.alive;
    return u.side === 'ally' && u.alive;
  };

  const pickTarget = (u: Unit) => {
    if (!pending || !targetable(u)) return;
    if (pending.kind === 'attack') battleAct({ kind: 'attack', target: u.uid });
    else if (pending.kind === 'skill') battleAct({ kind: 'skill', skillId: pending.skillId, target: u.uid });
    else if (pending.kind === 'item') battleAct({ kind: 'item', itemId: pending.itemId, target: u.uid });
    else battleLink('burst', u.uid);
    setPending(null);
  };

  const chooseSkill = (id: string) => {
    const sk = SKILLS[id];
    const t = sk.parts[0].target;
    if (t === 'foe') setPending({ kind: 'skill', skillId: id, side: 'foe' });
    else if (t === 'friend') setPending({ kind: 'skill', skillId: id, side: 'friend' });
    else battleAct({ kind: 'skill', skillId: id });
  };

  const useItem = (id: string) => {
    const it = ITEMS[id];
    setPending({ kind: 'item', itemId: id, side: it.use?.revivePct ? 'dead' : 'friend' });
  };

  const linkCmd = (cmd: LinkCommand) => {
    if (cmd === 'burst' && actor?.burst && SKILLS[actor.burst].parts.some((p) => p.target === 'foe')) {
      setPending({ kind: 'burst' });
      return;
    }
    battleLink(cmd);
  };

  const UnitCard = ({ u }: { u: Unit }) => (
    <div
      className={`unit ${u.alive ? '' : 'dead'} ${u.uid === b.turn ? 'active' : ''} ${targetable(u) ? 'targetable' : ''}`}
      onClick={() => pickTarget(u)}
      data-testid={`unit-${u.uid}`}
    >
      <div className="icon">{u.side === 'ally' ? <CharDot id={u.charId!} size={38} /> : u.icon}</div>
      <div className="nm">
        {u.name} {u.rank === 'boss' && '👑'}
        {u.rank === 'elite' && '💀'}
      </div>
      <Bar value={u.hp} max={u.maxHp} />
      <div className="st">
        HP {u.hp}/{u.maxHp}
        {u.side === 'ally' && ` · MP ${u.mp}/${u.maxMp}`}
      </div>
      {u.side === 'ally' && <Bar value={u.mp} max={u.maxMp} kind="mp" />}
      <div className="buffs muted">{buffText(u)}</div>
    </div>
  );

  return (
    <>
      <Hud />
      <div className="battle" data-testid="battle">
        <div className="row">
          <h3 className="grow" style={{ margin: 0 }}>
            ⚔ {b.title}
          </h3>
          <div className="timeline">
            <span className="muted">턴 순서</span>
            {timeline(b, 8).map((u, i) => (
              <span key={i} className={`t ${u.side}`}>
                {u.side === 'enemy' ? u.icon : ''}
                {u.name}
              </span>
            ))}
          </div>
        </div>

        <div className="units">
          {enemies.map((u) => (
            <UnitCard key={u.uid} u={u} />
          ))}
        </div>

        <div className="panel">
          <div className="row" style={{ marginBottom: 8 }}>
            <b>🔗 링크 게이지</b>
            <span className="grow">
              <Bar value={b.link} max={100} kind="link" />
            </span>
            <span>{Math.floor(b.link)}/100</span>
          </div>
          {b.result ? (
            <div className="row">
              <h3 className={b.result === 'win' ? 'good' : 'bad'} style={{ margin: 0 }}>
                {b.result === 'win' ? '🏆 승리!' : '☠ 전멸…'}
              </h3>
              <button className="primary" onClick={battleFinish} data-testid="battle-continue">
                계속
              </button>
            </div>
          ) : myTurn && actor ? (
            <div className="col">
              <div>
                <b>{actor.name}</b>의 차례
                {pending && <span className="warn"> — 대상을 선택하세요 <button className="small ghost" onClick={() => setPending(null)}>취소</button></span>}
              </div>
              <div className="row">
                <button onClick={() => setPending({ kind: 'attack' })} data-testid="cmd-attack">
                  ⚔ 공격
                </button>
                {actor.skills.map((id) => (
                  <button key={id} disabled={!canUseSkill(actor, id)} onClick={() => chooseSkill(id)} title={SKILLS[id].desc}>
                    {SKILLS[id].name} <span className="muted">MP{SKILLS[id].mp}</span>
                  </button>
                ))}
                <button onClick={() => battleAct({ kind: 'defend' })}>🛡 방어</button>
              </div>
              <div className="row">
                {CONSUMABLE_IDS.filter((id) => (b.items[id] ?? 0) > 0).map((id) => (
                  <button key={id} className="small" onClick={() => useItem(id)} title={ITEMS[id].desc}>
                    {ITEMS[id].name} ×{b.items[id]}
                  </button>
                ))}
              </div>
              <div className="row" style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  지휘 (턴 소모 없음, 턴당 1회)
                </span>
                {(Object.keys(LINK_COMMANDS) as LinkCommand[]).map((cmd) => {
                  const err = canUseLink(b, cmd);
                  const name = cmd === 'burst' && actor.burst ? `💥 ${SKILLS[actor.burst].name}` : LINK_COMMANDS[cmd].name;
                  return (
                    <button
                      key={cmd}
                      className="small"
                      disabled={!!err}
                      title={`${LINK_COMMANDS[cmd].desc}${err ? ` — ${err}` : ''}`}
                      onClick={() => linkCmd(cmd)}
                    >
                      {name} <span className="muted">{LINK_COMMANDS[cmd].cost}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="muted">적의 차례…</div>
          )}
        </div>

        <div className="units">
          {allies.map((u) => (
            <UnitCard key={u.uid} u={u} />
          ))}
        </div>

        <div className="panel battle-log" ref={logRef}>
          {b.log.join('\n')}
        </div>
      </div>
    </>
  );
}
