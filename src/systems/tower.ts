import { CHARACTERS } from '../content/characters';
import {
  MAIN_TOP,
  ROOT_BASE,
  ROOT_FLOORS,
  TRIALS,
  effectiveFloor,
  floorKind,
  floorLabel,
  isRoot,
  villageName,
  zoneOf,
} from '../content/floors';
import { OTHER_PERKS, RELICS, STAT_PERKS, relicPerk, type PerkDef } from '../content/perks';
import { TITLES } from '../content/titles';
import { chance, pick, pickWeighted, randInt, shuffle } from '../core/rng';
import { recruitedIds } from '../core/state';
import type { CharId, GameState, Phase } from '../core/types';
import { addAffection } from './bond';
import { allyUnit, createBattle, enemyUnit, shadowUnit, type BattleState, type Unit } from './battle';
import { collectBonuses, gainExp, memberStats } from './stats';

export type NodeType =
  | 'start'
  | 'battle'
  | 'elite'
  | 'treasure'
  | 'event'
  | 'rest'
  | 'exit'
  | 'boss'
  | 'hidden'
  | 'trial'
  | 'village'
  | 'personal';

export const NODE_INFO: Record<NodeType, { icon: string; label: string; cost: number }> = {
  start: { icon: '🚩', label: '입구', cost: 0 },
  battle: { icon: '⚔️', label: '전투', cost: 2 },
  elite: { icon: '💀', label: '정예', cost: 3 },
  treasure: { icon: '💎', label: '마석 광맥', cost: 1 },
  event: { icon: '❓', label: '이벤트', cost: 1 },
  rest: { icon: '⛺', label: '휴식', cost: 1 },
  exit: { icon: '🚪', label: '출구', cost: 1 },
  boss: { icon: '👑', label: '수호자', cost: 3 },
  hidden: { icon: '✨', label: '히든', cost: 1 },
  trial: { icon: '🔱', label: '시련', cost: 3 },
  village: { icon: '🏮', label: '마을', cost: 0 },
  personal: { icon: '💗', label: '개인 시련', cost: 3 },
};

export interface MapNode {
  id: number;
  layer: number;
  col: number;
  type: NodeType;
  next: number[];
  visited: boolean;
  hidden?: boolean;
  personal?: CharId;
}

export interface FloorMap {
  floor: number;
  nodes: MapNode[];
  current: number;
  layers: number;
}

export interface BattleStage {
  allies: CharId[];
  enemies: string[] | 'shadows';
  linkStart?: number;
  /** 소수 인원 시련에서 적 HP 보정 */
  enemyHpMult?: number;
}

export interface BattleContext {
  kind: 'normal' | 'elite' | 'boss' | 'trial' | 'personal';
  nodeId: number;
  stages: BattleStage[];
  stageIndex: number;
  personal?: CharId;
}

export interface TowerRun {
  floor: number;
  map: FloorMap;
  timeLeft: number;
  timeMax: number;
  duration: 'half' | 'full';
  startPhase: Exclude<Phase, 'night'>;
  party: CharId[];
  hp: Record<string, number>;
  mp: Record<string, number>;
  stones: number;
  floorsCleared: number[];
  log: string[];
  pendingPerks: PerkDef[] | null;
  floorDone: boolean;
  battleCtx: BattleContext | null;
  event: string | null;
  atVillage: boolean;
}

// ───────────────────────── 맵 생성

const COLS: Record<number, number[]> = { 1: [1], 2: [0.5, 1.5], 3: [0, 1, 2], 4: [0, 0.67, 1.33, 2] };

export function hiddenSight(s: GameState, party: CharId[]): boolean {
  return s.guild.facilities.info >= 2 || party.includes('ria') || collectBonuses(s).hiddenSight;
}

export function generateFloor(s: GameState, floor: number, party: CharId[]): FloorMap {
  const kind = floorKind(floor);
  const zone = zoneOf(floor);
  const layers: NodeType[][] = [];

  if (kind === 'lobby') layers.push(['start'], ['battle'], ['exit']);
  else if (kind === 'village') layers.push(['start'], ['village'], ['exit']);
  else if (kind === 'trial') layers.push(['start'], ['trial'], ['exit']);
  else if (kind === 'guardian' || kind === 'rootBoss') {
    layers.push(['start'], shuffle(s, ['battle', 'treasure']), shuffle(s, ['battle', 'event']), ['rest'], ['boss']);
  } else {
    const L = randInt(s, zone.layers[0], zone.layers[1]);
    layers.push(['start']);
    for (let i = 1; i < L - 1; i++) {
      const count = randInt(s, 2, 3);
      const row: NodeType[] = [];
      for (let k = 0; k < count; k++) {
        row.push(
          pickWeighted<NodeType>(s, [
            ['battle', 50],
            ['elite', floor >= 3 ? 10 : 0],
            ['treasure', 15],
            ['event', 15],
            ['rest', i >= 2 ? 10 : 0],
          ]),
        );
      }
      if (!row.includes('battle')) row[0] = 'battle';
      layers.push(row);
    }
    layers.push(['exit']);
  }

  const nodes: MapNode[] = [];
  let id = 0;
  const byLayer: MapNode[][] = layers.map((row, li) => {
    const cols = COLS[Math.min(4, row.length)];
    return row.map((type, k) => {
      const n: MapNode = { id: id++, layer: li, col: cols[k] ?? k, type, next: [], visited: li === 0 };
      nodes.push(n);
      return n;
    });
  });

  // 히든 노드와 개인 시련 (탐색층 중간 단계에 추가)
  if (kind === 'explore' && layers.length >= 4) {
    const mid = () => randInt(s, 1, layers.length - 2);
    if (chance(s, 0.35)) {
      const li = mid();
      const n: MapNode = { id: id++, layer: li, col: 2.6, type: 'hidden', next: [], visited: false, hidden: true };
      nodes.push(n);
      byLayer[li].push(n);
    }
    const personal = party.find(
      (c) =>
        CHARACTERS[c].personalTrialFloor === floor && s.members[c].stage >= 3 && !s.members[c].personalTrialCleared,
    );
    if (personal) {
      const li = mid();
      const n: MapNode = { id: id++, layer: li, col: -0.6, type: 'personal', next: [], visited: false, personal };
      nodes.push(n);
      byLayer[li].push(n);
    }
  }

  for (let li = 0; li < byLayer.length - 1; li++) {
    const cur = byLayer[li];
    const nxt = byLayer[li + 1];
    for (const n of cur) {
      const near = nxt.filter((m) => Math.abs(m.col - n.col) <= 1.01);
      const targets = near.length ? near : [nxt.reduce((a, m) => (Math.abs(m.col - n.col) < Math.abs(a.col - n.col) ? m : a))];
      n.next = targets.map((m) => m.id);
    }
    for (const m of nxt) {
      if (!cur.some((n) => n.next.includes(m.id))) {
        const nearest = cur.reduce((a, n) => (Math.abs(n.col - m.col) < Math.abs(a.col - m.col) ? n : a));
        nearest.next.push(m.id);
      }
    }
  }

  return { floor, nodes, current: 0, layers: byLayer.length };
}

export function reachable(map: FloorMap): MapNode[] {
  const cur = map.nodes[map.current];
  return cur.next.map((id) => map.nodes[id]);
}

// ───────────────────────── 등반 시작/종료

export function timeBudget(s: GameState, duration: 'half' | 'full'): number {
  return (duration === 'full' ? 12 : 6) + collectBonuses(s).timeBonus + (s.guild.facilities.info >= 3 ? 1 : 0);
}

export function nextFloorFor(s: GameState, root: boolean): number {
  if (root) return ROOT_BASE + Math.min(ROOT_FLOORS, s.tower.rootRecord + 1);
  if (s.tower.record >= MAIN_TOP && s.flags.endless === true) return Math.max(MAIN_TOP + 1, s.tower.endlessRecord + 1);
  return Math.min(MAIN_TOP, s.tower.record + 1);
}

export function startRun(
  s: GameState,
  party: CharId[],
  duration: 'half' | 'full',
  startPhase: Exclude<Phase, 'night'>,
  floor: number,
): TowerRun {
  if (party.length === 0) throw new Error('파티가 비어 있습니다');
  const hp: Record<string, number> = {};
  const mp: Record<string, number> = {};
  for (const c of party) {
    const st = memberStats(s, c);
    hp[c] = st.hp;
    mp[c] = st.mp;
  }
  const max = timeBudget(s, duration);
  return {
    floor,
    map: generateFloor(s, floor, party),
    timeLeft: max,
    timeMax: max,
    duration,
    startPhase,
    party,
    hp,
    mp,
    stones: 0,
    floorsCleared: [],
    log: [`[탑의 목소리] ${floorLabel(floor)}에 입장했습니다. 등반 시간 ${max}.`],
    pendingPerks: null,
    floorDone: false,
    battleCtx: null,
    event: null,
    atVillage: false,
  };
}

export function canContinue(s: GameState, run: TowerRun): boolean {
  if (run.timeLeft <= 0) return false;
  if (isRoot(run.floor)) return run.floor < ROOT_BASE + ROOT_FLOORS;
  if (run.floor >= MAIN_TOP) return s.flags.endless === true;
  return true;
}

export function advanceFloor(s: GameState, run: TowerRun): void {
  run.floor += 1;
  run.map = generateFloor(s, run.floor, run.party);
  run.floorDone = false;
  run.pendingPerks = null;
  run.atVillage = false;
  run.log.push(`[탑의 목소리] ${floorLabel(run.floor)}에 들어섰습니다.`);
}

export interface ExitSummary {
  reason: 'voluntary' | 'sunset' | 'defeat';
  lines: string[];
}

export function exitRun(s: GameState, run: TowerRun, reason: ExitSummary['reason']): ExitSummary {
  const lines: string[] = [];
  const kept = reason === 'defeat' ? Math.floor(run.stones / 2) : run.stones;
  s.guild.stones += kept;
  if (reason === 'sunset') lines.push('[탑의 목소리] 해가 졌습니다. 등반자를 밖으로 내보냅니다.');
  if (reason === 'defeat') lines.push('[탑의 목소리] 등반자가 모두 쓰러졌습니다. 밖으로 내보냅니다.');
  lines.push(`클리어한 층: ${run.floorsCleared.length ? run.floorsCleared.map(floorLabel).join(', ') : '없음'}`);
  lines.push(`획득 마석: ${kept}개${reason === 'defeat' ? ` (절반 손실, 원래 ${run.stones}개)` : ''}`);
  for (const c of run.party) {
    const m = s.members[c];
    m.fatigue = Math.min(100, m.fatigue + (run.duration === 'full' ? 50 : 25));
    m.stress = Math.min(100, m.stress + 8);
    if (reason === 'defeat') m.injuryDays = Math.max(m.injuryDays, 3);
  }
  if (reason === 'defeat') {
    s.guild.fame = Math.max(0, s.guild.fame - 10);
    lines.push('파티 전원 부상 (3일). 명성 −10');
  }
  return { reason, lines };
}

// ───────────────────────── 노드 진입

export type NodeOutcome =
  | { kind: 'battle'; battle: BattleState }
  | { kind: 'message'; lines: string[] }
  | { kind: 'event'; eventId: string }
  | { kind: 'village'; lines: string[] }
  | { kind: 'floorClear' }
  | { kind: 'blocked'; lines: string[] };

function zoneStones(s: GameState, floor: number, mult = 1): number {
  const z = zoneOf(floor);
  return Math.round(randInt(s, z.stones[0], z.stones[1]) * mult * (1 + collectBonuses(s).stonePct));
}

function partyUnits(s: GameState, run: TowerRun, who: CharId[] = run.party): Unit[] {
  return who.map((c) => allyUnit(s, c, run.hp[c], run.mp[c]));
}

function normalGroup(s: GameState, floor: number, extraElite = false): string[] {
  const z = zoneOf(floor);
  const count = floor <= 2 ? randInt(s, 1, 2) : floor <= 10 ? randInt(s, 2, 3) : floor <= 25 ? randInt(s, 2, 4) : randInt(s, 3, 5);
  const ids = Array.from({ length: count }, () => pick(s, z.enemies));
  if (extraElite) ids[0] = pick(s, z.elites);
  return ids;
}

function buildEnemies(ids: string[], floor: number): Unit[] {
  return ids.map((id, i) => enemyUnit(id, floor, i));
}

export function startStage(s: GameState, run: TowerRun): BattleState {
  const ctx = run.battleCtx!;
  const stage = ctx.stages[ctx.stageIndex];
  const allies = partyUnits(s, run, stage.allies);
  const enemies =
    stage.enemies === 'shadows' ? allies.map((a, i) => shadowUnit(a, i)) : buildEnemies(stage.enemies, run.floor);
  if (stage.enemyHpMult) {
    for (const e of enemies) {
      e.maxHp = Math.round(e.maxHp * stage.enemyHpMult);
      e.hp = e.maxHp;
    }
  }
  const total = ctx.stages.length;
  const title =
    ctx.kind === 'trial'
      ? `${TRIALS[run.floor]?.name ?? '시련'}${total > 1 ? ` (${ctx.stageIndex + 1}/${total})` : ''}`
      : ctx.kind === 'boss'
        ? `${floorLabel(run.floor)} 수호자`
        : ctx.kind === 'personal'
          ? `개인 시련: ${CHARACTERS[ctx.personal!].personalTrialName}`
          : `${floorLabel(run.floor)} ${ctx.kind === 'elite' ? '정예 ' : ''}전투`;
  return createBattle(s, allies, enemies, title, { linkStart: stage.linkStart });
}

function trialStages(s: GameState, run: TowerRun): BattleStage[] | string {
  const t = TRIALS[run.floor];
  const z = zoneOf(run.floor);
  const healthy = run.party;
  switch (t.kind) {
    case 'split': {
      if (healthy.length < 2) return [{ allies: healthy, enemies: normalGroup(s, run.floor) }];
      const half = Math.ceil(healthy.length / 2);
      return [
        { allies: healthy.slice(0, half), enemies: [pick(s, z.enemies), pick(s, z.enemies)] },
        { allies: healthy.slice(half), enemies: [pick(s, z.enemies), pick(s, z.enemies)] },
      ];
    }
    case 'solo':
      return healthy.map((c) => ({ allies: [c], enemies: 'shadows' as const }));
    case 'memory':
      return [{ allies: healthy, enemies: ['memory'], linkStart: 100 }];
    case 'bond': {
      const bonded = healthy.filter((c) => s.members[c].stage >= 3);
      if (bonded.length < 2)
        return `[탑의 목소리] 유대가 부족합니다. 링크 Lv3 이상인 등반자 둘이 필요합니다. (현재 ${bonded.length}명)`;
      const pairs: CharId[][] = [];
      for (let i = 0; i < healthy.length; i += 2) pairs.push(healthy.slice(i, i + 2));
      return pairs.map((p) => ({ allies: p, enemies: ['bond_keeper'], linkStart: 50, enemyHpMult: p.length === 1 ? 0.3 : 0.5 }));
    }
    case 'heart':
      return [{ allies: healthy, enemies: ['heart_shadow'] }];
  }
}

export function enterNode(s: GameState, run: TowerRun, nodeId: number): NodeOutcome {
  const node = run.map.nodes[nodeId];
  const cur = run.map.nodes[run.map.current];
  if (!node || !cur.next.includes(nodeId)) return { kind: 'blocked', lines: ['갈 수 없는 곳입니다.'] };
  if (node.hidden && !hiddenSight(s, run.party)) return { kind: 'blocked', lines: ['아무것도 보이지 않는다.'] };
  if (run.timeLeft <= 0) return { kind: 'blocked', lines: ['등반 시간이 없습니다.'] };

  // 시련 문은 조건을 먼저 확인한다 (시간 소모 없음)
  if (node.type === 'trial') {
    const stages = trialStages(s, run);
    if (typeof stages === 'string') return { kind: 'blocked', lines: [stages] };
    run.battleCtx = { kind: 'trial', nodeId, stages, stageIndex: 0 };
  }

  run.timeLeft -= NODE_INFO[node.type].cost;
  run.map.current = nodeId;
  node.visited = true;
  const floor = run.floor;

  switch (node.type) {
    case 'battle':
      run.battleCtx = {
        kind: 'normal',
        nodeId,
        // 1층 로비는 튜토리얼: 슬라임 한 마리
        stages: [{ allies: run.party, enemies: floorKind(floor) === 'lobby' ? ['slime'] : normalGroup(s, floor) }],
        stageIndex: 0,
      };
      return { kind: 'battle', battle: startStage(s, run) };
    case 'elite':
      run.battleCtx = {
        kind: 'elite',
        nodeId,
        stages: [{ allies: run.party, enemies: normalGroup(s, floor, true).slice(0, 2) }],
        stageIndex: 0,
      };
      return { kind: 'battle', battle: startStage(s, run) };
    case 'boss': {
      const z = zoneOf(floor);
      const enemies = [z.guardian, ...(floor >= 20 ? [pick(s, z.elites)] : [])];
      run.battleCtx = { kind: 'boss', nodeId, stages: [{ allies: run.party, enemies }], stageIndex: 0 };
      return { kind: 'battle', battle: startStage(s, run) };
    }
    case 'trial':
      return { kind: 'battle', battle: startStage(s, run) };
    case 'personal': {
      const c = node.personal!;
      const z = zoneOf(floor);
      run.battleCtx = {
        kind: 'personal',
        nodeId,
        personal: c,
        stages: [{ allies: run.party, enemies: [pick(s, z.elites), pick(s, z.elites)] }],
        stageIndex: 0,
      };
      return { kind: 'battle', battle: startStage(s, run) };
    }
    case 'treasure': {
      const n = zoneStones(s, floor, 1.6);
      run.stones += n;
      return { kind: 'message', lines: [`💎 마석 광맥을 캤다. 마석 +${n}`] };
    }
    case 'rest': {
      for (const c of run.party) {
        const st = memberStats(s, c);
        run.hp[c] = Math.min(st.hp, Math.max(1, run.hp[c]) + Math.round(st.hp * 0.35));
        run.mp[c] = Math.min(st.mp, run.mp[c] + Math.round(st.mp * 0.35));
      }
      return { kind: 'message', lines: ['⛺ 잠시 숨을 돌렸다. 파티 HP·MP 35% 회복'] };
    }
    case 'hidden': {
      const unowned = Object.keys(RELICS).filter((r) => !s.tower.relics.includes(r));
      if (unowned.length && chance(s, 0.5)) {
        const r = pick(s, unowned);
        s.tower.relics.push(r);
        return { kind: 'message', lines: [`✨ 히든 피스 발견! 유물 「${RELICS[r].name}」 획득 — ${RELICS[r].desc}`] };
      }
      const n = zoneStones(s, floor, 4);
      run.stones += n;
      return { kind: 'message', lines: [`✨ 히든 피스 발견! 숨겨진 광맥에서 마석 +${n}`] };
    }
    case 'event':
      return { kind: 'event', eventId: pickEvent(s, run) };
    case 'village': {
      for (const c of run.party) {
        const st = memberStats(s, c);
        run.hp[c] = st.hp;
        run.mp[c] = st.mp;
      }
      run.atVillage = true;
      return {
        kind: 'village',
        lines: [`🏮 안전층 마을 「${villageName(floor) ?? '마을'}」에 도착했다. 파티가 완전히 회복됐다.`],
      };
    }
    case 'exit':
      return { kind: 'floorClear' };
    case 'start':
      return { kind: 'message', lines: [] };
  }
}

// ───────────────────────── 전투 종료

/** 적 1체당 경험치 = base + perFloor × 층 (밸런싱 대상) */
export const EXP_CURVE = { base: 6, perFloor: 4 };

export interface BattleEnd {
  next: 'battle' | 'map' | 'floorClear' | 'defeat';
  battle?: BattleState;
  lines: string[];
}

export function finishBattle(s: GameState, run: TowerRun, b: BattleState): BattleEnd {
  for (const [k, v] of Object.entries(b.items)) s.inventory[k] = v;
  const ctx = run.battleCtx!;
  const lines: string[] = [];
  if (b.result !== 'win') {
    run.battleCtx = null;
    return { next: 'defeat', lines: ['☠ 파티가 전멸했다…'] };
  }

  const bonuses = collectBonuses(s);
  for (const u of b.units.filter((x) => x.side === 'ally')) {
    const c = u.charId!;
    run.hp[c] = u.alive ? Math.min(u.maxHp, u.hp + Math.round(u.maxHp * bonuses.postHealPct)) : 1;
    run.mp[c] = u.mp;
  }

  const enemies = b.units.filter((u) => u.side === 'enemy');
  const perEnemy = EXP_CURVE.base + EXP_CURVE.perFloor * effectiveFloor(run.floor);
  const exp = enemies.reduce((sum, e) => sum + perEnemy * (e.rank === 'boss' ? 6 : e.rank === 'elite' ? 2 : 1), 0);
  const stoneMult = ctx.kind === 'boss' ? 8 : ctx.kind === 'trial' ? 5 : ctx.kind === 'elite' ? 2.5 : 1;
  const stones = zoneStones(s, run.floor, stoneMult);
  run.stones += stones;
  const stage = ctx.stages[ctx.stageIndex];
  const ups: string[] = [];
  for (const c of stage.allies) {
    const n = gainExp(s, c, exp);
    if (n > 0) ups.push(`${CHARACTERS[c].short} Lv${s.members[c].level}`);
  }
  lines.push(`경험치 +${Math.round(exp)} · 마석 +${stones}`);
  if (ups.length) lines.push(`⬆ 레벨 업! ${ups.join(', ')}`);

  if (ctx.stageIndex + 1 < ctx.stages.length) {
    ctx.stageIndex += 1;
    lines.push('[탑의 목소리] 다음 시련이 시작됩니다.');
    return { next: 'battle', battle: startStage(s, run), lines };
  }

  run.battleCtx = null;
  if (ctx.kind === 'trial') {
    if (!s.tower.clearedTrials.includes(run.floor)) s.tower.clearedTrials.push(run.floor);
    lines.push(`[탑의 목소리] 「${TRIALS[run.floor].name}」을 통과했습니다.`);
    return { next: 'map', lines };
  }
  if (ctx.kind === 'personal') {
    const c = ctx.personal!;
    s.members[c].personalTrialCleared = true;
    addAffection(s, c, 40);
    lines.push(
      `[탑의 목소리] ${CHARACTERS[c].short}이(가) 「${CHARACTERS[c].personalTrialName}」을 넘어섰습니다.`,
      `[탑의 목소리] 클래스 각성: ${CHARACTERS[c].className} → ${CHARACTERS[c].awakenedClass}. 링크 버스트가 강화됩니다.`,
    );
    return { next: 'map', lines };
  }
  if (ctx.kind === 'boss') return { next: 'floorClear', lines };
  return { next: 'map', lines };
}

// ───────────────────────── 층 클리어

export interface ClearResult {
  lines: string[];
  firstClear: boolean;
  newTitles: string[];
}

function isFirstClear(s: GameState, floor: number): boolean {
  if (isRoot(floor)) return floor - ROOT_BASE > s.tower.rootRecord;
  if (floor > MAIN_TOP) return floor > s.tower.endlessRecord;
  return floor > s.tower.record;
}

export function rollPerks(s: GameState): PerkDef[] {
  const pool: PerkDef[] = [...STAT_PERKS, ...OTHER_PERKS];
  const unowned = Object.keys(RELICS).filter((r) => !s.tower.relics.includes(r));
  if (unowned.length && chance(s, 0.4)) pool.push(relicPerk(pick(s, unowned)));
  return shuffle(s, pool).slice(0, 3);
}

export function clearFloor(s: GameState, run: TowerRun): ClearResult {
  const floor = run.floor;
  const kind = floorKind(floor);
  const lines: string[] = [];
  const first = isFirstClear(s, floor);
  run.floorsCleared.push(floor);
  run.floorDone = true;
  lines.push(`[탑의 목소리] ${floorLabel(floor)}을(를) 돌파했습니다.`);

  const big = kind === 'guardian' || kind === 'trial' || kind === 'rootBoss';
  for (const c of run.party) addAffection(s, c, big ? 15 : 5);

  const newTitles: string[] = [];
  if (first) {
    if (isRoot(floor)) s.tower.rootRecord = floor - ROOT_BASE;
    else if (floor > MAIN_TOP) s.tower.endlessRecord = floor;
    else s.tower.record = floor;

    const fameBase = zoneOf(floor).id * 5 + (big ? 30 : 0);
    const fame = Math.round(fameBase * (1 + collectBonuses(s).famePct));
    s.guild.fame += fame;
    lines.push(`최초 돌파! 명성 +${fame}`);
    if (!isRoot(floor) && floor === 35) lines.push('[탑의 목소리] 인류 최고 기록이 경신되었습니다.');
    run.pendingPerks = rollPerks(s);
    lines.push('[탑의 목소리] 층 특전을 선택하십시오.');

    for (const t of TITLES) {
      if (!s.tower.titles.includes(t.id) && t.cond(s)) {
        s.tower.titles.push(t.id);
        if (s.tower.equipped.length < 2) s.tower.equipped.push(t.id);
        newTitles.push(t.id);
        lines.push(`[탑의 목소리] 칭호 「${t.name}」을(를) 획득했습니다. (${t.effectText})`);
      }
    }
    if (kind === 'guardian' && floor < MAIN_TOP) {
      lines.push(`[탑의 목소리] 구간 「${zoneOf(floor + 1).name}」이(가) 열립니다.`);
    }
  }
  return { lines, firstClear: first, newTitles };
}

export function applyPerk(s: GameState, run: TowerRun, perk: PerkDef): string {
  run.pendingPerks = null;
  switch (perk.kind) {
    case 'stat':
      for (const c of recruitedIds(s)) s.members[c].bonus[perk.stat] += perk.amount;
      return `${perk.name}: ${perk.desc}`;
    case 'stones': {
      const n = zoneStones(s, run.floor, perk.mult);
      run.stones += n;
      return `${perk.name}: 마석 +${n}`;
    }
    case 'heal':
      for (const c of run.party) {
        const st = memberStats(s, c);
        run.hp[c] = st.hp;
        run.mp[c] = st.mp;
      }
      return `${perk.name}: 파티 완전 회복`;
    case 'relic':
      if (!s.tower.relics.includes(perk.relic)) s.tower.relics.push(perk.relic);
      return `${perk.name} 획득`;
    case 'fame':
      s.guild.fame += perk.amount;
      return `${perk.name}: 명성 +${perk.amount}`;
  }
}

// ───────────────────────── 탑 이벤트

export interface TowerEventDef {
  id: string;
  title: string;
  text: string;
  choices: { label: string; resolve: (s: GameState, run: TowerRun) => string[] }[];
  when?: (s: GameState, run: TowerRun) => boolean;
}

export const TOWER_EVENTS: TowerEventDef[] = [
  {
    id: 'stranded',
    title: '조난자',
    text: '다른 길드의 등반자가 벽에 기대 쓰러져 있다. 숨은 붙어 있다.',
    choices: [
      {
        label: '구조한다 (등반 시간 −1)',
        resolve: (s, run) => {
          run.timeLeft -= 1;
          s.guild.fame += 15;
          const n = zoneStones(s, run.floor, 1);
          run.stones += n;
          return [`등반자를 입구까지 데려다주었다. 명성 +15, 사례로 마석 +${n}`];
        },
      },
      { label: '협회에 신고만 하고 지나친다', resolve: () => ['위치를 협회 앱에 남기고 발걸음을 옮겼다.'] },
    ],
  },
  {
    id: 'chest',
    title: '수상한 상자',
    text: '이끼 낀 상자가 길 한가운데 놓여 있다. 너무 대놓고 놓여 있다.',
    choices: [
      {
        label: '연다',
        resolve: (s, run) => {
          if (chance(s, 0.6)) {
            const n = zoneStones(s, run.floor, 3);
            run.stones += n;
            return [`마석이 가득하다! 마석 +${n}`];
          }
          for (const c of run.party) run.hp[c] = Math.max(1, Math.round(run.hp[c] * 0.85));
          return ['함정이었다! 파티 HP −15%'];
        },
      },
      { label: '무시한다', resolve: () => ['수상한 건 피하는 게 상책이다.'] },
    ],
  },
  {
    id: 'glyphs',
    title: '탑의 문자',
    text: '벽 한 면에 빛나는 문자가 빼곡하다.',
    choices: [
      {
        label: '읽어 본다',
        resolve: (s, run) => {
          if (!run.party.includes('ria')) return ['…전혀 읽을 수 없다. 누군가 읽을 수 있는 사람이 있다면.'];
          for (const c of run.party) gainExp(s, c, 30 + run.floor * 4);
          addAffection(s, 'ria', 8);
          return ['리아: "\'함께 오르는 자에게 길을\'… 이라고 적혀 있다." 파티 경험치 획득, 리아 호감 +8'];
        },
      },
      { label: '지나친다', resolve: () => ['문자는 계속 희미하게 빛나고 있었다.'] },
    ],
  },
  {
    id: 'spring',
    title: '맑은 샘',
    text: '바위 틈에서 차가운 샘물이 솟는다. 마력이 느껴진다.',
    choices: [
      {
        label: '마신다',
        resolve: (s, run) => {
          for (const c of run.party) {
            const st = memberStats(s, c);
            run.hp[c] = Math.min(st.hp, run.hp[c] + Math.round(st.hp * 0.5));
            run.mp[c] = Math.min(st.mp, run.mp[c] + Math.round(st.mp * 0.5));
          }
          return ['몸이 가벼워졌다. 파티 HP·MP 50% 회복'];
        },
      },
      {
        label: '병에 담는다',
        resolve: (s) => {
          s.inventory.potion = (s.inventory.potion ?? 0) + 1;
          return ['포션 +1'];
        },
      },
    ],
  },
  {
    id: 'bargain',
    title: '탑의 거래',
    text: '[탑의 목소리] 시간을 바치십시오. 그러면 힘을 드리겠습니다.',
    choices: [
      {
        label: '받아들인다 (등반 시간 −2)',
        resolve: (s, run) => {
          run.timeLeft -= 2;
          for (const c of recruitedIds(s)) s.members[c].bonus.atk += 1;
          return ['[탑의 목소리] 거래가 성립되었습니다. 길드원 전원 공격 +1 (영구)'];
        },
      },
      { label: '거절한다', resolve: () => ['[탑의 목소리] …현명하군요.'] },
    ],
  },
  {
    id: 'stream',
    title: '방송 각',
    text: '채아: "언니, 여기 뷰 미쳤어요. 잠깐만 켜도 돼요? 딱 1분!"',
    when: (_s, run) => run.party.includes('chaea'),
    choices: [
      {
        label: '1분만이야',
        resolve: (s) => {
          s.guild.fame += 10;
          addAffection(s, 'chaea', 6);
          return ['시청자들이 탑 내부 풍경에 열광했다. 명성 +10, 채아 호감 +6'];
        },
      },
      {
        label: '집중하자',
        resolve: (s) => {
          addAffection(s, 'chaea', 2);
          return ['채아: "넵! 대신 나중에 같이 찍어요."'];
        },
      },
    ],
  },
];

export const TOWER_EVENT_MAP: Record<string, TowerEventDef> = Object.fromEntries(TOWER_EVENTS.map((e) => [e.id, e]));

function pickEvent(s: GameState, run: TowerRun): string {
  const pool = TOWER_EVENTS.filter((e) => !e.when || e.when(s, run));
  const id = pick(s, pool).id;
  run.event = id;
  return id;
}

export function resolveEvent(s: GameState, run: TowerRun, choice: number): string[] {
  const ev = run.event ? TOWER_EVENT_MAP[run.event] : null;
  run.event = null;
  if (!ev) return [];
  return ev.choices[choice]?.resolve(s, run) ?? [];
}

/** 마을 상점: 마석으로 소모품을 산다 */
export function buyWithStones(s: GameState, run: TowerRun, itemId: string, price: number): boolean {
  const total = s.guild.stones + run.stones;
  if (total < price) return false;
  const fromRun = Math.min(run.stones, price);
  run.stones -= fromRun;
  s.guild.stones -= price - fromRun;
  s.inventory[itemId] = (s.inventory[itemId] ?? 0) + 1;
  return true;
}
