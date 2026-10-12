import { create } from 'zustand';
import { CHARACTERS } from '../content/characters';
import { floorLabel, ROOT_BASE } from '../content/floors';
import type { PerkDef } from '../content/perks';
import { getScene } from '../content/scenes';
import { loadFrom, saveTo, type SlotId } from '../core/save';
import { createInitialState } from '../core/state';
import type { CharId, GameState, Phase, Trigger } from '../core/types';
import * as A from '../systems/actions';
import {
  act,
  forceResult,
  stepEnemy,
  useLink,
  type BattleAction,
  type BattleState,
  type LinkCommand,
} from '../systems/battle';
import { endDay, nightStart } from '../systems/calendar';
import { determineEnding } from '../systems/ending';
import { findEvent, markSeen, type EventContext } from '../systems/events';
import { chooseOption, startScene, stepScene, type SceneRuntime } from '../systems/scene';
import { processPhaseSchedule } from '../systems/schedule';
import {
  advanceFloor,
  applyPerk,
  buyWithStones,
  canContinue,
  clearFloor,
  enterNode,
  exitRun,
  finishBattle,
  nextFloorFor,
  resolveEvent,
  startRun,
  type TowerRun,
} from '../systems/tower';

export type Mode = 'title' | 'hub' | 'adv' | 'tower' | 'battle' | 'ending';

export interface Popup {
  title: string;
  lines: string[];
  kind: 'result' | 'report' | 'system';
}

export const ADULT_BUILD = import.meta.env.VITE_ADULT === 'true';

interface GameStore {
  state: GameState;
  mode: Mode;
  scene: SceneRuntime | null;
  sceneQueue: string[];
  afterScenes: (() => void)[];
  sceneReturn: Mode;
  run: TowerRun | null;
  battle: BattleState | null;
  popups: Popup[];
  log: string[];
  /** 회상 재생 중이면 재생 전 상태. 끝나면 되돌린다 */
  replaySnapshot: GameState | null;
}

export const useGame = create<GameStore>(() => ({
  state: createInitialState(),
  mode: 'title',
  scene: null,
  sceneQueue: [],
  afterScenes: [],
  sceneReturn: 'hub',
  run: null,
  battle: null,
  popups: [],
  log: [],
  replaySnapshot: null,
}));

const get = () => useGame.getState();
const set = (p: Partial<GameStore>) => useGame.setState(p);

/** 게임 상태를 복사해서 고친 뒤 반영한다 */
export function mutate<R>(fn: (s: GameState) => R): R {
  const s = structuredClone(get().state);
  const r = fn(s);
  set({ state: s });
  return r;
}

function mutateRun<R>(fn: (s: GameState, run: TowerRun) => R): R {
  const s = structuredClone(get().state);
  const run = structuredClone(get().run!);
  const r = fn(s, run);
  set({ state: s, run });
  return r;
}

export function popup(title: string, lines: string[], kind: Popup['kind'] = 'result') {
  if (lines.length === 0) return;
  set({ popups: [...get().popups, { title, lines, kind }] });
}

export function closePopup() {
  set({ popups: get().popups.slice(1) });
}

function addLog(lines: string[]) {
  set({ log: [...get().log, ...lines].slice(-60) });
}

// ───────────────────────── 씬

function beginNextScene() {
  const [id, ...rest] = get().sceneQueue;
  if (!id) {
    const callbacks = get().afterScenes;
    const snapshot = get().replaySnapshot;
    set({ scene: null, mode: get().sceneReturn, afterScenes: [], ...(snapshot ? { state: snapshot, replaySnapshot: null } : {}) });
    for (const cb of callbacks) cb();
    return;
  }
  const s = structuredClone(get().state);
  const rt = startScene(getScene(id), s.settings.adult);
  if (!s.seenScenes.includes(id)) s.seenScenes.push(id);
  stepScene(s, rt);
  set({ state: s, scene: rt, sceneQueue: rest, mode: 'adv' });
  if (rt.done) beginNextScene();
}

/** 씬을 큐에 넣는다. then 은 큐가 다 끝난 뒤 실행 */
export function playScene(id: string, then?: () => void) {
  const g = get();
  const idle = g.mode !== 'adv';
  set({
    sceneQueue: [...g.sceneQueue, id],
    afterScenes: then ? [...g.afterScenes, then] : g.afterScenes,
    sceneReturn: idle ? (g.mode === 'title' || g.mode === 'ending' ? 'hub' : g.mode) : g.sceneReturn,
  });
  if (idle) beginNextScene();
}

export function advanceScene() {
  const g = get();
  if (!g.scene || g.scene.choice) return;
  const s = structuredClone(g.state);
  const rt = structuredClone(g.scene);
  stepScene(s, rt);
  set({ state: s, scene: rt });
  if (rt.done) beginNextScene();
}

export function chooseInScene(idx: number) {
  const g = get();
  if (!g.scene?.choice) return;
  const s = structuredClone(g.state);
  const rt = structuredClone(g.scene);
  chooseOption(s, rt, idx);
  set({ state: s, scene: rt });
  if (rt.done) beginNextScene();
}

export function skipScene() {
  const g = get();
  if (!g.scene) return;
  const s = structuredClone(g.state);
  const rt = structuredClone(g.scene);
  for (let i = 0; i < 2000 && !rt.done; i++) {
    if (rt.choice) break;
    stepScene(s, rt);
  }
  set({ state: s, scene: rt });
  if (rt.done) beginNextScene();
}

/** 회상: 씬을 다시 보되 게임 상태는 바뀌지 않는다 */
export function replayScene(id: string) {
  if (get().mode === 'adv') return;
  set({ replaySnapshot: structuredClone(get().state) });
  playScene(id);
}

/** 조건에 맞는 이벤트가 있으면 씬을 재생하고 true */
export function triggerEvent(trigger: Trigger, ctx: EventContext = {}, then?: () => void): boolean {
  const ev = findEvent(get().state, trigger, ctx);
  if (!ev) return false;
  mutate((s) => markSeen(s, ev));
  playScene(ev.scene, then);
  return true;
}

// ───────────────────────── 시작 / 세이브

export function newGame(name: string, seed?: number) {
  const s = createInitialState(name.trim() || undefined, seed ?? (Date.now() >>> 0), ADULT_BUILD);
  set({ state: s, mode: 'hub', run: null, battle: null, scene: null, sceneQueue: [], afterScenes: [], popups: [], log: [], replaySnapshot: null });
  morningStart();
}

export function loadGame(slot: SlotId): boolean {
  const s = loadFrom(slot);
  if (!s) return false;
  if (!ADULT_BUILD) s.settings.adult = false;
  set({ state: s, mode: s.ending ? 'ending' : 'hub', run: null, battle: null, scene: null, sceneQueue: [], afterScenes: [], popups: [], log: [], replaySnapshot: null });
  // 오토세이브는 아침 이벤트 직전에 찍히므로, 불러온 뒤 아침 이벤트를 다시 확인한다
  if (!s.ending && s.time.phase === 'morning') triggerEvent('morning', {}, morningStart);
  return true;
}

export function saveGame(slot: SlotId): boolean {
  const g = get();
  if (g.mode !== 'hub') return false;
  return saveTo(slot, g.state);
}

export function toTitle() {
  set({ mode: 'title', run: null, battle: null, scene: null, sceneQueue: [], afterScenes: [], popups: [] });
}

// ───────────────────────── 하루 흐름

function morningStart() {
  const s = get().state;
  if (s.ending) return startEnding();
  saveTo('auto', s);
  // 아침 이벤트는 하나씩, 끝나면 다시 확인한다
  triggerEvent('morning', {}, morningStart);
}

function nextPhase(from: Phase) {
  mutate((s) => {
    s.time.phase = from === 'morning' ? 'afternoon' : 'night';
  });
  if (from === 'afternoon') enterNight();
}

function enterNight() {
  const msg = mutate((s) => nightStart(s));
  if (msg) addLog([msg]);
  triggerEvent('night');
}

/** 주인공 행동이 끝나면 이번 페이즈의 멤버 스케줄을 돌리고 다음 페이즈로 */
function endPhase(exclude: CharId[] = []) {
  const phase = get().state.time.phase;
  if (phase === 'night') return sleep();
  const lines = mutate((s) => processPhaseSchedule(s, phase, exclude));
  if (lines.length) addLog(lines);
  nextPhase(phase);
}

export function sleep() {
  const report = mutate((s) => endDay(s));
  const lines = [...report.lines];
  if (report.weekly) lines.push('', '── 주간 결산 ──', ...report.weekly);
  if (report.quarter) lines.push('', '── 분기 심사 ──', ...report.quarter);
  set({ log: [] });
  popup(report.title, lines, 'report');
  morningStart();
}

type HubAction =
  | { kind: 'talk'; char: CharId }
  | { kind: 'gift'; char: CharId; item: string }
  | { kind: 'train'; char: CharId; stat: A.TrainStat }
  | { kind: 'cafe' }
  | { kind: 'rift' }
  | { kind: 'rest' };

export function doAction(a: HubAction) {
  const phase = get().state.time.phase;
  if (phase === 'night') return;
  let lines: string[] = [];
  let title = '';
  try {
    lines = mutate((s) => {
      switch (a.kind) {
        case 'talk':
          title = `${CHARACTERS[a.char].short}와(과) 대화`;
          return A.actTalk(s, a.char);
        case 'gift':
          title = '선물';
          return A.actGift(s, a.char, a.item);
        case 'train':
          title = '훈련 지도';
          return A.actTrain(s, a.char, a.stat);
        case 'cafe':
          title = '카페 근무';
          return A.actCafe(s);
        case 'rift':
          title = '균열 소탕';
          return A.actRift(s);
        case 'rest':
          title = '휴식';
          return A.actRest(s);
      }
    });
  } catch (e) {
    popup('할 수 없습니다', [(e as Error).message]);
    return;
  }
  popup(title, lines);
  const after = () => endPhase();
  if (a.kind === 'talk' && triggerEvent('talk', { char: a.char }, after)) return;
  after();
}

export function doDate(c: CharId, place: string) {
  if (get().state.time.phase !== 'afternoon') return;
  let lines: string[];
  try {
    lines = mutate((s) => A.actDate(s, c, place));
  } catch (e) {
    popup('데이트 불가', [(e as Error).message]);
    return;
  }
  popup('데이트', lines);
  // 데이트는 오후와 밤을 쓴다
  const lines2 = mutate((s) => processPhaseSchedule(s, 'afternoon', [c]));
  if (lines2.length) addLog(lines2);
  mutate((s) => {
    s.time.phase = 'night';
  });
  if (!triggerEvent('date', { char: c }, sleep)) sleep();
}

export type NightAction = { kind: 'visit'; char: CharId } | { kind: 'rooftop' } | { kind: 'bath' } | { kind: 'living' };

export function doNight(a: NightAction) {
  if (get().state.time.phase !== 'night') return;
  if (a.kind === 'visit') {
    if (triggerEvent('visit', { char: a.char }, sleep)) return;
    const lines = mutate((s) => A.actNightVisit(s, a.char));
    popup('밤 방문', lines);
    if (get().state.members[a.char].stage >= 4) return playScene(`${a.char}_night`, sleep);
    return sleep();
  }
  const lines = mutate((s) =>
    a.kind === 'rooftop' ? A.actRooftop(s) : a.kind === 'bath' ? A.actBath(s) : A.actLivingRoom(s),
  );
  popup({ rooftop: '옥상', bath: '욕탕', living: '거실' }[a.kind], lines);
  sleep();
}

// ───────────────────────── 엔딩

export function startEnding() {
  const id = get().state.ending ?? 'normal';
  set({ mode: 'ending' });
  playScene(`ending_${id}`, () => set({ mode: 'ending' }));
}

export function finishGameEarly() {
  mutate((s) => {
    s.ending = determineEnding(s);
  });
  startEnding();
}

// ───────────────────────── 탑

export function startTower(party: CharId[], duration: 'half' | 'full', target: 'main' | 'root', startFloor?: number) {
  const phase = get().state.time.phase;
  if (phase === 'night') return;
  if (phase === 'afternoon' && duration === 'full') return;
  const s = structuredClone(get().state);
  const next = nextFloorFor(s, target === 'root');
  // 각인 이동: 이미 깬 층(파밍)이나 다음 층에서 시작
  const floor = startFloor && startFloor >= (target === 'root' ? ROOT_BASE + 1 : 1) && startFloor <= next ? startFloor : next;
  const run = startRun(s, party, duration, phase, floor);
  set({ state: s, run, mode: 'tower', battle: null });
}

function checkSunset() {
  const run = get().run;
  if (!run || run.floorDone || run.event || get().battle) return;
  if (run.timeLeft <= 0) exitTower('sunset');
}

export function moveNode(nodeId: number) {
  const g = get();
  if (!g.run || g.run.floorDone || g.run.event || g.run.pendingPerks) return;
  const outcome = mutateRun((s, run) => enterNode(s, run, nodeId));
  switch (outcome.kind) {
    case 'battle':
      set({ battle: outcome.battle, mode: 'battle' });
      return;
    case 'message':
      mutateRun((_s, run) => run.log.push(...outcome.lines));
      return checkSunset();
    case 'event':
      return;
    case 'village':
      mutateRun((_s, run) => run.log.push(...outcome.lines));
      return;
    case 'floorClear':
      return doFloorClear();
    case 'blocked':
      popup('탑의 목소리', outcome.lines, 'system');
      return;
  }
}

export function chooseTowerEvent(idx: number) {
  const lines = mutateRun((s, run) => resolveEvent(s, run, idx));
  mutateRun((_s, run) => run.log.push(...lines));
  popup('이벤트', lines);
  checkSunset();
}

export function villageBuy(itemId: string, price: number) {
  mutateRun((s, run) => buyWithStones(s, run, itemId, price));
}

export function leaveVillage() {
  mutateRun((_s, run) => {
    run.atVillage = false;
  });
  doFloorClear();
}

function doFloorClear() {
  const floor = get().run!.floor;
  const r = mutateRun((s, run) => clearFloor(s, run));
  mutateRun((_s, run) => run.log.push(...r.lines));
  popup('탑의 목소리', r.lines, 'system');
  triggerEvent('floorClear', { floor });
}

export function choosePerk(perk: PerkDef) {
  const line = mutateRun((s, run) => applyPerk(s, run, perk));
  mutateRun((_s, run) => run.log.push(`층 특전: ${line}`));
}

export function nextFloor() {
  const g = get();
  if (!g.run || !g.run.floorDone || g.run.pendingPerks) return;
  if (!canContinue(g.state, g.run)) return;
  mutateRun((s, run) => advanceFloor(s, run));
}

export function exitTower(reason: 'voluntary' | 'sunset' | 'defeat') {
  const g = get();
  if (!g.run) return;
  const run = g.run;
  const summary = mutate((s) => exitRun(s, run, reason));
  const phases: Exclude<Phase, 'night'>[] =
    run.duration === 'full' ? ['morning', 'afternoon'] : [run.startPhase];
  const lines: string[] = [];
  for (const p of phases) lines.push(...mutate((s) => processPhaseSchedule(s, p, run.party)));
  if (lines.length) addLog(lines);
  const endPhaseOf = phases[phases.length - 1];
  set({ run: null, battle: null, mode: 'hub' });
  popup(reason === 'voluntary' ? '귀환' : reason === 'sunset' ? '일몰 귀환' : '패배', summary.lines, 'report');
  nextPhase(endPhaseOf);
}

// ───────────────────────── 전투

function withBattle(fn: (s: GameState, b: BattleState) => void) {
  const s = structuredClone(get().state);
  const b = structuredClone(get().battle!);
  fn(s, b);
  set({ state: s, battle: b });
}

export function battleAct(a: BattleAction) {
  if (!get().battle) return;
  withBattle((s, b) => act(b, a, s));
}

export function battleLink(cmd: LinkCommand, target?: string) {
  if (!get().battle) return;
  withBattle((s, b) => useLink(b, cmd, s, target));
}

export function battleEnemyStep() {
  if (!get().battle) return;
  withBattle((s, b) => stepEnemy(b, s));
}

export function battleForce(result: 'win' | 'lose') {
  if (!get().battle) return;
  withBattle((_s, b) => forceResult(b, result));
}

export function battleFinish() {
  const g = get();
  if (!g.battle?.result || !g.run) return;
  const b = g.battle;
  const end = mutateRun((s, run) => finishBattle(s, run, b));
  mutateRun((_s, run) => run.log.push(...end.lines));
  switch (end.next) {
    case 'battle':
      set({ battle: end.battle!, mode: 'battle' });
      popup('탑의 목소리', end.lines, 'system');
      return;
    case 'map':
      set({ battle: null, mode: 'tower' });
      if (end.lines.some((l) => l.startsWith('[탑의 목소리]'))) popup('탑의 목소리', end.lines, 'system');
      return checkSunset();
    case 'floorClear':
      set({ battle: null, mode: 'tower' });
      return doFloorClear();
    case 'defeat':
      set({ battle: null, mode: 'tower' });
      return exitTower('defeat');
  }
}

export function towerTitle(run: TowerRun): string {
  return run.floor > ROOT_BASE ? `역탑 ${floorLabel(run.floor)}` : `백탑 ${floorLabel(run.floor)}`;
}
