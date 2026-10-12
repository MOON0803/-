import { describe, expect, it } from 'vitest';
import { createInitialState } from '../core/state';
import { deserialize, serialize } from '../core/save';
import { endDay } from '../systems/calendar';
import { explainEvent, findEvent } from '../systems/events';
import { act, allyUnit, createBattle, current, enemyUnit, canUseLink, useLink } from '../systems/battle';
import { enterNode, generateFloor, startRun, reachable } from '../systems/tower';
import type { GameState } from '../core/types';

function withParty(s: GameState, stage = 1) {
  for (const c of ['harin', 'chaea'] as const) {
    s.members[c].recruited = true;
    s.members[c].stage = stage;
  }
  return s;
}

describe('tower map', () => {
  it('every visible node is reachable from the start and the floor can be finished', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const floor of [1, 2, 5, 10, 11, 17, 28, 35, 44, 50, 101, 105]) {
        const s = withParty(createInitialState('t', seed));
        const map = generateFloor(s, floor, ['harin', 'chaea']);
        const seen = new Set<number>([0]);
        const queue = [0];
        while (queue.length) {
          const id = queue.shift()!;
          for (const n of map.nodes[id].next) if (!seen.has(n)) (seen.add(n), queue.push(n));
        }
        for (const n of map.nodes) expect(seen.has(n.id), `floor ${floor} seed ${seed} node ${n.id}`).toBe(true);
        const last = map.nodes.filter((n) => n.layer === map.layers - 1);
        expect(last).toHaveLength(1);
        expect(['exit', 'boss']).toContain(last[0].type);
      }
    }
  });

  it('the bond wall refuses a party without two stage-3 members and costs no time', () => {
    const s = withParty(createInitialState('t', 5), 2);
    const run = startRun(s, ['harin', 'chaea'], 'full', 'morning', 35);
    const trial = reachable(run.map)[0];
    expect(trial.type).toBe('trial');
    const out = enterNode(s, run, trial.id);
    expect(out.kind).toBe('blocked');
    expect(run.timeLeft).toBe(run.timeMax);

    s.members.harin.stage = 3;
    s.members.chaea.stage = 3;
    const run2 = startRun(s, ['harin', 'chaea'], 'full', 'morning', 35);
    expect(enterNode(s, run2, reachable(run2.map)[0].id).kind).toBe('battle');
  });

  it('a personal-trial node appears only for a stage-3 heroine on her floor', () => {
    const s = withParty(createInitialState('t', 9), 3);
    expect(generateFloor(s, 13, ['harin']).nodes.some((n) => n.type === 'personal')).toBe(true);
    expect(generateFloor(s, 14, ['harin']).nodes.some((n) => n.type === 'personal')).toBe(false);
    s.members.harin.stage = 2;
    expect(generateFloor(s, 13, ['harin']).nodes.some((n) => n.type === 'personal')).toBe(false);
  });
});

describe('calendar and economy', () => {
  it('weekly settlement happens on Sunday night', () => {
    const s = createInitialState('t', 1);
    s.time.day = 6;
    const before = s.guild.funds;
    const r = endDay(s);
    expect(r.weekly).not.toBeNull();
    expect(s.time.day).toBe(7);
    expect(s.guild.funds).toBeLessThan(before + 1_000_000);
  });

  it('missing two quarter goals ends the game badly', () => {
    const s = createInitialState('t', 1);
    s.time.day = 83;
    endDay(s);
    expect(s.guild.warnings).toBe(1);
    expect(s.ending).toBeNull();
    s.time.day = 167;
    endDay(s);
    expect(s.guild.warnings).toBe(2);
    expect(s.ending).toBe('bad');
  });

  it('save files round-trip', () => {
    const s = withParty(createInitialState('도연', 77));
    s.flags.test = 3;
    expect(deserialize(serialize(s))).toEqual(s);
  });
});

describe('events', () => {
  it('the intro fires on day 0 and why explains unmet conditions', () => {
    const s = createInitialState('t', 1);
    expect(findEvent(s, 'morning')?.id).toBe('intro');
    const why = explainEvent(s, 'harin_stage2');
    expect(why.some((l) => l.startsWith('✗'))).toBe(true);
  });
});

describe('battle', () => {
  it('delays cannot chain-lock a unit between its turns', () => {
    const s = createInitialState('t', 11);
    s.members.chaea.recruited = true;
    const chaea = allyUnit(s, 'chaea');
    chaea.spd = 999;
    const b = createBattle(s, [chaea], [enemyUnit('turtle', 1, 0)], 't');
    expect(current(b)?.uid).toBe('a_chaea');
    const enemy = b.units.find((u) => u.side === 'enemy')!;
    const before = enemy.next;
    b.link = 100;
    useLink(b, 'tactic', s);
    act(b, { kind: 'skill', skillId: 'smoke' }, s);
    const once = enemy.next - before;
    expect(once).toBeGreaterThan(0);
    // 전술 지시로 한 번 더 행동해도, 적이 행동하기 전에는 다시 지연되지 않는다
    expect(current(b)?.uid).toBe('a_chaea');
    act(b, { kind: 'skill', skillId: 'smoke' }, s);
    expect(enemy.next - before).toBeCloseTo(once);
  });

  it('link burst needs relationship stage 3', () => {
    const s = withParty(createInitialState('t', 12), 2);
    const b = createBattle(s, [allyUnit(s, 'harin')], [enemyUnit('slime', 1, 0)], 't');
    b.link = 100;
    while (current(b)?.side !== 'ally') b.units.find((u) => u.side === 'enemy')!.next += 1000, (b.turn = 'a_harin');
    expect(canUseLink(b, 'burst')).not.toBeNull();
    b.units[0].stage = 3;
    expect(canUseLink(b, 'burst')).toBeNull();
    useLink(b, 'burst', s);
    expect(b.link).toBe(0);
  });
});

describe('store flow', () => {
  it('album replay does not change game state', async () => {
    const store = await import('../game/store');
    store.newGame('도연', 1);
    // 인트로를 끝까지 넘긴다
    for (let i = 0; i < 500 && store.useGame.getState().mode === 'adv'; i++) {
      const g = store.useGame.getState();
      if (g.scene?.choice) store.chooseInScene(0);
      else store.advanceScene();
    }
    const before = structuredClone(store.useGame.getState().state);
    store.replayScene('harin_stage2');
    for (let i = 0; i < 500 && store.useGame.getState().mode === 'adv'; i++) {
      const g = store.useGame.getState();
      if (g.scene?.choice) store.chooseInScene(0);
      else store.advanceScene();
    }
    expect(store.useGame.getState().state).toEqual(before);
  });
});
