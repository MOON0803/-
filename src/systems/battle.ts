import { CHARACTERS } from '../content/characters';
import { ENEMIES, type EnemyDef } from '../content/enemies';
import { effectiveFloor } from '../content/floors';
import { ITEMS } from '../content/items';
import { SKILLS, type BuffStat, type Effect, type SkillDef, type SkillPart } from '../content/skills';
import { chance, nextRandom, pick, randRange, type RngHolder } from '../core/rng';
import type { CharId, GameState } from '../core/types';
import { collectBonuses, memberStats } from './stats';

export interface Buff {
  stat: BuffStat;
  amount: number;
  turns: number;
}

export interface Unit {
  uid: string;
  side: 'ally' | 'enemy';
  charId?: CharId;
  enemyId?: string;
  name: string;
  icon: string;
  rank: 'ally' | 'normal' | 'elite' | 'boss';
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  atk: number;
  mag: number;
  def: number;
  spd: number;
  crit: number;
  skills: string[];
  burst?: string;
  stage: number;
  burstPower: number;
  next: number;
  buffs: Buff[];
  alive: boolean;
  defending: boolean;
  taunt: number;
  evade: number;
  poison: { pct: number; turns: number } | null;
  actions: number;
  /** 자기 턴 사이에 지연은 한 번만 받는다 (연속 지연으로 턴이 영원히 안 오는 것 방지) */
  delayed: boolean;
  pattern?: EnemyDef['pattern'];
}

export interface BattleState {
  units: Unit[];
  turn: string | null;
  log: string[];
  link: number;
  linkUsed: boolean;
  extraTurn: boolean;
  linkRate: number;
  result: 'win' | 'lose' | null;
  items: Record<string, number>;
  god: boolean;
  oneshot: boolean;
  title: string;
}

export type LinkCommand = 'cheer' | 'mana' | 'aid' | 'tactic' | 'burst';

export const LINK_COMMANDS: Record<LinkCommand, { name: string; cost: number; desc: string }> = {
  cheer: { name: '격려', cost: 20, desc: '현재 멤버 공격 +25%·속도 +20% (3턴)' },
  mana: { name: '마력 공유', cost: 20, desc: '현재 멤버 MP 40% 회복' },
  aid: { name: '응급 링크', cost: 30, desc: '현재 멤버 HP 35% 회복' },
  tactic: { name: '전술 지시', cost: 30, desc: '이번 행동 후 한 번 더 행동' },
  burst: { name: '링크 버스트', cost: 100, desc: '관계 단계 3 이상 멤버 전용 필살기' },
};

export type BattleAction =
  | { kind: 'attack'; target?: string }
  | { kind: 'skill'; skillId: string; target?: string }
  | { kind: 'defend' }
  | { kind: 'item'; itemId: string; target?: string };

const BASE_ATTACK: SkillDef = {
  id: 'attack',
  name: '공격',
  mp: 0,
  desc: '',
  parts: [{ target: 'foe', effects: [{ kind: 'damage', scale: 'atk', mult: 1 }] }],
};

// ───────────────────────── 유닛 생성

/** 피로 80 이상이면 전투 성능 −15% */
export const TIRED_PENALTY = 0.85;

export function allyUnit(s: GameState, c: CharId, hp?: number, mp?: number): Unit {
  const st = memberStats(s, c);
  const def = CHARACTERS[c];
  const m = s.members[c];
  const tired = m.fatigue >= 80 ? TIRED_PENALTY : 1;
  return {
    uid: `a_${c}`,
    side: 'ally',
    charId: c,
    name: def.short,
    icon: '',
    rank: 'ally',
    maxHp: st.hp,
    hp: Math.min(st.hp, hp ?? st.hp),
    maxMp: st.mp,
    mp: Math.min(st.mp, mp ?? st.mp),
    atk: Math.round(st.atk * tired),
    mag: Math.round(st.mag * tired),
    def: Math.round(st.def * tired),
    spd: Math.round(st.spd * tired),
    crit: def.crit,
    skills: def.skills,
    burst: def.burst,
    stage: m.stage,
    burstPower: m.personalTrialCleared ? 1.5 : 1,
    next: 0,
    buffs: [],
    alive: (hp ?? st.hp) > 0,
    defending: false,
    taunt: 0,
    evade: 0,
    poison: null,
    actions: 0,
    delayed: false,
  };
}

/** 일반·정예 적의 층당 성장률 (밸런싱 대상) */
export const ENEMY_SCALE = { hp: 0.3, atk: 0.24, def: 0.12, spd: 0.045, curve: 0.0016 };
/** 보스 공격 계열 보정 (밸런싱 대상) */
export const BOSS_POWER = 2.1;
/** 보스 HP 보정 (밸런싱 대상) */
export const BOSS_HP = 1.8;

export function enemyStats(def: EnemyDef, floor: number) {
  const f = effectiveFloor(floor);
  if (def.rank === 'boss') {
    const r = f / (def.nativeFloor ?? f);
    return {
      hp: Math.round(def.base.hp * Math.pow(r, 1.3) * BOSS_HP),
      atk: Math.round(def.base.atk * r * BOSS_POWER),
      mag: Math.round(def.base.mag * r * BOSS_POWER),
      def: Math.round(def.base.def * r),
      spd: Math.round(def.base.spd * Math.pow(r, 0.3)),
    };
  }
  const L = f - 1;
  const curve = ENEMY_SCALE.curve * L * L;
  return {
    hp: Math.round(def.base.hp * (1 + ENEMY_SCALE.hp * L + curve)),
    atk: Math.round(def.base.atk * (1 + ENEMY_SCALE.atk * L + curve)),
    mag: Math.round(def.base.mag * (1 + ENEMY_SCALE.atk * L + curve)),
    def: Math.round(def.base.def * (1 + ENEMY_SCALE.def * L)),
    spd: Math.round(def.base.spd * (1 + ENEMY_SCALE.spd * L)),
  };
}

export function enemyUnit(id: string, floor: number, idx: number): Unit {
  const def = ENEMIES[id];
  const st = enemyStats(def, floor);
  return {
    uid: `e${idx}_${id}`,
    side: 'enemy',
    enemyId: id,
    name: def.name,
    icon: def.icon,
    rank: def.rank,
    maxHp: st.hp,
    hp: st.hp,
    maxMp: 0,
    mp: 0,
    atk: st.atk,
    mag: st.mag,
    def: st.def,
    spd: st.spd,
    crit: def.rank === 'boss' ? 0.08 : 0.05,
    skills: def.skills,
    stage: 0,
    burstPower: 1,
    next: 0,
    buffs: [],
    alive: true,
    defending: false,
    taunt: 0,
    evade: 0,
    poison: null,
    actions: 0,
    delayed: false,
    pattern: def.pattern,
  };
}

/** 그림자: 멤버 스탯을 복제한 적 (시련용) */
export function shadowUnit(ally: Unit, idx: number, power = 0.85): Unit {
  return {
    ...ally,
    uid: `e${idx}_shadow_${ally.charId}`,
    side: 'enemy',
    enemyId: undefined,
    name: `${ally.name}의 그림자`,
    icon: '🌑',
    rank: 'elite',
    maxHp: Math.round(ally.maxHp * power * 1.6),
    hp: Math.round(ally.maxHp * power * 1.6),
    atk: Math.round(ally.atk * power),
    mag: Math.round(ally.mag * power),
    def: Math.round(ally.def * power),
    spd: Math.round(ally.spd * power),
    burst: undefined,
    buffs: [],
    alive: true,
    actions: 0,
    poison: null,
  };
}

export function createBattle(
  s: GameState,
  allies: Unit[],
  enemies: Unit[],
  title: string,
  opts: { linkStart?: number } = {},
): BattleState {
  const bonuses = collectBonuses(s);
  const avgIntimacy =
    allies.reduce((sum, u) => sum + (u.charId ? s.members[u.charId].intimacy : 0), 0) / Math.max(1, allies.length);
  const b: BattleState = {
    units: [...allies, ...enemies],
    turn: null,
    log: [],
    link: Math.min(100, (opts.linkStart ?? 0) + bonuses.linkStart),
    linkUsed: false,
    extraTurn: false,
    linkRate: 1 + bonuses.linkPct + avgIntimacy / 200,
    result: null,
    items: { ...s.inventory },
    god: s.cheats.god,
    oneshot: s.cheats.oneshot,
    title,
  };
  for (const u of b.units) u.next = (1000 / Math.max(1, u.spd)) * randRange(s, 0.6, 1);
  b.log.push(`⚔ ${title}`);
  nextTurn(b);
  return b;
}

// ───────────────────────── 계산

export function unitByUid(b: BattleState, uid: string | null | undefined): Unit | undefined {
  return b.units.find((u) => u.uid === uid);
}

export function current(b: BattleState): Unit | undefined {
  return unitByUid(b, b.turn);
}

function eff(u: Unit, stat: BuffStat): number {
  const sum = u.buffs.filter((x) => x.stat === stat).reduce((a, x) => a + x.amount, 0);
  if (stat === 'crit') return u.crit + sum;
  return u[stat] * Math.max(0.2, 1 + sum);
}

const alive = (b: BattleState, side: Unit['side']) => b.units.filter((u) => u.side === side && u.alive);
const opposite = (side: Unit['side']): Unit['side'] => (side === 'ally' ? 'enemy' : 'ally');

function gainLink(b: BattleState, amount: number) {
  b.link = Math.min(100, b.link + amount * b.linkRate);
}

function addBuff(u: Unit, stat: BuffStat, amount: number, turns: number) {
  const existing = u.buffs.find((x) => x.stat === stat && Math.sign(x.amount) === Math.sign(amount));
  if (existing) {
    existing.amount = Math.sign(amount) * Math.max(Math.abs(existing.amount), Math.abs(amount));
    existing.turns = Math.max(existing.turns, turns);
  } else u.buffs.push({ stat, amount, turns });
}

function pickFoeFor(b: BattleState, actor: Unit, h: RngHolder): Unit | undefined {
  const foes = alive(b, opposite(actor.side));
  if (foes.length === 0) return undefined;
  const taunting = foes.filter((f) => f.taunt > 0);
  if (taunting.length) return taunting[0];
  if (actor.side === 'enemy' && nextRandom(h) < 0.55) {
    return [...foes].sort((a, z) => a.hp / a.maxHp - z.hp / z.maxHp)[0];
  }
  return pick(h, foes);
}

function dealDamage(b: BattleState, actor: Unit, target: Unit, e: Extract<Effect, { kind: 'damage' }>, power: number, h: RngHolder) {
  if (!target.alive) return;
  if (target.evade > 0) {
    target.evade -= 1;
    b.log.push(`  ${target.name}이(가) 공격을 피했다!`);
    return;
  }
  const raw = eff(actor, e.scale) * e.mult * power;
  let dmg = Math.max(raw * 0.2, raw - eff(target, 'def') * 0.5) * randRange(h, 0.9, 1.1);
  const crit = chance(h, eff(actor, 'crit') + (e.critBonus ?? 0));
  if (crit) dmg *= 1.5;
  if (target.defending) dmg *= 0.5;
  dmg = Math.max(1, Math.round(dmg));
  if (target.side === 'ally' && b.god) dmg = 0;
  if (target.side === 'enemy' && b.oneshot) dmg = target.hp;
  target.hp = Math.max(0, target.hp - dmg);
  b.log.push(`  ${target.name}에게 ${dmg} 피해${crit ? ' (치명타!)' : ''}`);
  if (target.side === 'ally') gainLink(b, 4);
  if (target.hp <= 0) {
    target.alive = false;
    target.buffs = [];
    target.poison = null;
    b.log.push(`  💥 ${target.name}이(가) 쓰러졌다.`);
  }
}

function applyEffect(b: BattleState, actor: Unit, target: Unit, e: Effect, power: number, h: RngHolder) {
  switch (e.kind) {
    case 'damage':
      for (let i = 0; i < (e.hits ?? 1); i++) dealDamage(b, actor, target, e, power, h);
      return;
    case 'heal': {
      if (!target.alive) return;
      const amt = Math.round(((e.mult ?? 0) * eff(actor, 'mag') + (e.pctMax ?? 0) * target.maxHp) * power);
      target.hp = Math.min(target.maxHp, target.hp + amt);
      b.log.push(`  ${target.name} HP +${amt}`);
      return;
    }
    case 'buff':
      if (target.alive) addBuff(target, e.stat, e.amount, e.turns);
      return;
    case 'debuff':
      if (target.alive) addBuff(target, e.stat, -e.amount, e.turns);
      return;
    case 'taunt':
      target.taunt = e.turns;
      return;
    case 'delay':
      if (target.alive && !target.delayed) {
        target.next += (1000 / Math.max(1, eff(target, 'spd'))) * e.pct;
        target.delayed = true;
      }
      return;
    case 'poison':
      if (target.alive) target.poison = { pct: e.pct, turns: e.turns };
      return;
    case 'evade':
      target.evade = e.turns;
      return;
    case 'revive':
      if (!target.alive) {
        target.alive = true;
        target.hp = Math.max(1, Math.round(target.maxHp * e.pct));
        b.log.push(`  ✨ ${target.name}이(가) 일어섰다!`);
      }
      return;
    case 'restoreMp':
      target.mp = Math.min(target.maxMp, target.mp + Math.round(target.maxMp * e.pct));
      return;
  }
}

function resolvePart(b: BattleState, actor: Unit, part: SkillPart, chosen: string | undefined, power: number, h: RngHolder) {
  const friends = b.units.filter((u) => u.side === actor.side);
  const foes = alive(b, opposite(actor.side));
  const chosenUnit = unitByUid(b, chosen);
  switch (part.target) {
    case 'self':
      for (const e of part.effects) applyEffect(b, actor, actor, e, power, h);
      return;
    case 'foe': {
      const t = chosenUnit && chosenUnit.side !== actor.side && chosenUnit.alive ? chosenUnit : pickFoeFor(b, actor, h);
      if (t) for (const e of part.effects) applyEffect(b, actor, t, e, power, h);
      return;
    }
    case 'allFoes':
      for (const t of foes) for (const e of part.effects) applyEffect(b, actor, t, e, power, h);
      return;
    case 'randomFoes':
      for (const e of part.effects) {
        const hits = e.kind === 'damage' ? (e.hits ?? 1) : 1;
        for (let i = 0; i < hits; i++) {
          const live = alive(b, opposite(actor.side));
          if (!live.length) break;
          const t = pick(h, live);
          applyEffect(b, actor, t, e.kind === 'damage' ? { ...e, hits: 1 } : e, power, h);
        }
      }
      return;
    case 'friend': {
      const live = friends.filter((u) => u.alive);
      const t =
        chosenUnit && chosenUnit.side === actor.side
          ? chosenUnit
          : [...live].sort((a, z) => a.hp / a.maxHp - z.hp / z.maxHp)[0];
      if (t) for (const e of part.effects) applyEffect(b, actor, t, e, power, h);
      return;
    }
    case 'allFriends':
      for (const t of friends) for (const e of part.effects) applyEffect(b, actor, t, e, power, h);
      return;
  }
}

function useSkill(b: BattleState, actor: Unit, skill: SkillDef, target: string | undefined, h: RngHolder, power = 1) {
  b.log.push(`${actor.side === 'ally' ? '▶' : '◀'} ${actor.name}의 ${skill.name}!`);
  for (const part of skill.parts) resolvePart(b, actor, part, target, power, h);
}

function checkResult(b: BattleState) {
  if (alive(b, 'enemy').length === 0) b.result = 'win';
  else if (alive(b, 'ally').length === 0) b.result = 'lose';
  if (b.result) b.log.push(b.result === 'win' ? '🏆 승리!' : '☠ 전멸…');
}

// ───────────────────────── 턴 진행

function nextTurn(b: BattleState) {
  checkResult(b);
  if (b.result) {
    b.turn = null;
    return;
  }
  for (let guard = 0; guard < 50; guard++) {
    const live = b.units.filter((u) => u.alive);
    const u = live.sort((a, z) => a.next - z.next)[0];
    b.turn = u.uid;
    u.defending = false;
    u.delayed = false;
    if (u.side === 'ally') b.linkUsed = false;
    if (u.poison) {
      const dmg = Math.max(1, Math.round(u.maxHp * u.poison.pct));
      u.hp = Math.max(0, u.hp - (u.side === 'ally' && b.god ? 0 : dmg));
      b.log.push(`  ☠ ${u.name} 중독 피해 ${dmg}`);
      u.poison.turns -= 1;
      if (u.poison.turns <= 0) u.poison = null;
      if (u.hp <= 0) {
        u.alive = false;
        b.log.push(`  💥 ${u.name}이(가) 쓰러졌다.`);
        checkResult(b);
        if (b.result) {
          b.turn = null;
          return;
        }
        continue;
      }
    }
    return;
  }
}

function endTurn(b: BattleState, u: Unit) {
  u.actions += 1;
  for (const x of u.buffs) x.turns -= 1;
  u.buffs = u.buffs.filter((x) => x.turns > 0);
  if (u.taunt > 0) u.taunt -= 1;
  if (u.side === 'ally') gainLink(b, 8);
  if (b.extraTurn && u.side === 'ally' && u.alive) {
    b.extraTurn = false;
    b.log.push(`  ⚡ ${u.name}, 한 번 더!`);
    checkResult(b);
    if (b.result) b.turn = null;
    return;
  }
  u.next += 1000 / Math.max(1, eff(u, 'spd'));
  nextTurn(b);
}

export function canUseSkill(u: Unit, skillId: string): boolean {
  const sk = SKILLS[skillId];
  return !!sk && u.mp >= sk.mp;
}

/** 현재 턴의 아군이 행동한다 */
export function act(b: BattleState, action: BattleAction, h: RngHolder): void {
  const u = current(b);
  if (!u || u.side !== 'ally' || b.result) return;
  switch (action.kind) {
    case 'attack':
      useSkill(b, u, BASE_ATTACK, action.target, h);
      break;
    case 'skill': {
      const sk = SKILLS[action.skillId];
      if (!sk || u.mp < sk.mp) return;
      u.mp -= sk.mp;
      useSkill(b, u, sk, action.target, h);
      break;
    }
    case 'defend':
      u.defending = true;
      b.log.push(`▶ ${u.name}은(는) 방어 자세를 취했다.`);
      break;
    case 'item': {
      const def = ITEMS[action.itemId];
      if (!def?.use || (b.items[action.itemId] ?? 0) <= 0) return;
      const t = unitByUid(b, action.target) ?? u;
      if (def.use.revivePct) {
        if (t.alive) return;
        t.alive = true;
        t.hp = Math.round(t.maxHp * def.use.revivePct);
      } else {
        if (!t.alive) return;
        if (def.use.healPct) t.hp = Math.min(t.maxHp, t.hp + Math.round(t.maxHp * def.use.healPct));
        if (def.use.mpPct) t.mp = Math.min(t.maxMp, t.mp + Math.round(t.maxMp * def.use.mpPct));
      }
      b.items[action.itemId] -= 1;
      b.log.push(`▶ ${u.name}이(가) ${def.name}을(를) ${t.name}에게 사용했다.`);
      break;
    }
  }
  checkResult(b);
  if (b.result) {
    b.turn = null;
    return;
  }
  endTurn(b, u);
}

export function canUseLink(b: BattleState, cmd: LinkCommand): string | null {
  const u = current(b);
  if (!u || u.side !== 'ally' || b.result) return '지금은 사용할 수 없다';
  if (b.linkUsed) return '이번 턴에 이미 사용했다';
  if (b.link < LINK_COMMANDS[cmd].cost) return '링크 게이지 부족';
  if (cmd === 'burst' && (u.stage < 3 || !u.burst)) return '관계 단계 3 이상 필요';
  if (cmd === 'tactic' && b.extraTurn) return '이미 지시했다';
  return null;
}

/** 주인공의 지휘. 현재 턴 멤버에게 쓰며, 턴을 소모하지 않는다 */
export function useLink(b: BattleState, cmd: LinkCommand, h: RngHolder, target?: string): void {
  if (canUseLink(b, cmd)) return;
  const u = current(b)!;
  b.link -= LINK_COMMANDS[cmd].cost;
  b.linkUsed = true;
  b.log.push(`🔗 지휘: ${LINK_COMMANDS[cmd].name} → ${u.name}`);
  switch (cmd) {
    case 'cheer':
      addBuff(u, 'atk', 0.25, 3);
      addBuff(u, 'spd', 0.2, 3);
      break;
    case 'mana':
      u.mp = Math.min(u.maxMp, u.mp + Math.round(u.maxMp * 0.4));
      break;
    case 'aid':
      u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * 0.35));
      break;
    case 'tactic':
      b.extraTurn = true;
      break;
    case 'burst':
      useSkill(b, u, SKILLS[u.burst!], target, h, u.burstPower);
      checkResult(b);
      if (b.result) b.turn = null;
      break;
  }
}

function enemyChoose(u: Unit, h: RngHolder): SkillDef {
  const skills = u.skills.map((id) => SKILLS[id]).filter(Boolean);
  if (skills.length) {
    if (u.pattern === 'every3' && u.actions % 3 === 2) return skills[0];
    if (u.pattern === 'opener' && u.actions === 0) return skills[0];
    if (chance(h, u.rank === 'normal' ? 0.25 : 0.35)) return pick(h, skills);
  }
  return BASE_ATTACK;
}

/** 현재 턴이 적이면 한 번 행동시킨다 */
export function stepEnemy(b: BattleState, h: RngHolder): void {
  const u = current(b);
  if (!u || u.side !== 'enemy' || b.result) return;
  useSkill(b, u, enemyChoose(u, h), undefined, h);
  checkResult(b);
  if (b.result) {
    b.turn = null;
    return;
  }
  endTurn(b, u);
}

/** 시뮬레이션·자동 전투용 아군 AI */
export function autoAlly(b: BattleState, h: RngHolder): void {
  const u = current(b);
  if (!u || u.side !== 'ally') return;
  if (!canUseLink(b, 'burst')) useLink(b, 'burst', h);
  if (b.result || current(b) !== u) return;
  if (u.hp / u.maxHp < 0.35 && !canUseLink(b, 'aid')) useLink(b, 'aid', h);
  const friends = alive(b, 'ally');
  const hurt = friends.filter((f) => f.hp / f.maxHp < 0.45);
  const usable = u.skills.filter((id) => canUseSkill(u, id)).map((id) => SKILLS[id]);
  const healSkill = usable.find((sk) => sk.parts.some((p) => p.effects.some((e) => e.kind === 'heal')));
  if (hurt.length && healSkill) return act(b, { kind: 'skill', skillId: healSkill.id }, h);
  if (u.hp / u.maxHp < 0.3 && (b.items.potion ?? 0) > 0) return act(b, { kind: 'item', itemId: 'potion', target: u.uid }, h);
  const dmgSkills = usable.filter((sk) => sk.parts.some((p) => p.effects.some((e) => e.kind === 'damage')));
  if (dmgSkills.length && chance(h, 0.6)) return act(b, { kind: 'skill', skillId: pick(h, dmgSkills).id }, h);
  act(b, { kind: 'attack' }, h);
}

export function runToEnd(b: BattleState, h: RngHolder, maxSteps = 2000): void {
  for (let i = 0; i < maxSteps && !b.result; i++) {
    const u = current(b);
    if (!u) break;
    if (u.side === 'enemy') stepEnemy(b, h);
    else autoAlly(b, h);
  }
  if (!b.result) b.result = 'lose';
}

export function forceResult(b: BattleState, result: 'win' | 'lose'): void {
  for (const u of b.units) {
    if ((result === 'win' && u.side === 'enemy') || (result === 'lose' && u.side === 'ally')) {
      u.hp = 0;
      u.alive = false;
    }
  }
  checkResult(b);
  b.turn = null;
}

/** 다음 N개 턴 미리보기 (타임라인 UI) */
export function timeline(b: BattleState, n = 8): Unit[] {
  const sim = b.units.filter((u) => u.alive).map((u) => ({ u, next: u.next }));
  const out: Unit[] = [];
  for (let i = 0; i < n && sim.length; i++) {
    sim.sort((a, z) => a.next - z.next);
    out.push(sim[0].u);
    sim[0].next += 1000 / Math.max(1, eff(sim[0].u, 'spd'));
  }
  return out;
}
