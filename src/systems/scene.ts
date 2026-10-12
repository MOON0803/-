import { CHARACTERS, STAGE_THRESHOLDS, callName } from '../content/characters';
import { CHAR_IDS, type CharId, type GameState } from '../core/types';
import { combatantIds } from '../core/state';
import { addAffection, addIntimacy } from './bond';
import { catchUpLevel } from './stats';

// ───────────────────────── 파서

export type ScnNode =
  | { t: 'say'; who: string | null; text: string; line: number }
  | { t: 'cmd'; name: string; args: string[]; line: number }
  | { t: 'choice'; options: { text: string; body: ScnNode[] }[]; line: number };

export type Rating = 'all' | 'r15' | 'r18';

export interface SceneDef {
  id: string;
  rating: Rating;
  body: ScnNode[];
}

interface RawLine {
  indent: number;
  text: string;
  line: number;
}

const SPEAKER = /^(\{player\}|[^\s:[\]]{1,12}):\s*(.*)$/;
const ONLY_CMDS = /^(\[[^\]]*\]\s*)+$/;

function unquote(t: string): string {
  const s = t.trim();
  return s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s;
}

function parseCmds(text: string, line: number): ScnNode[] {
  const out: ScnNode[] = [];
  for (const m of text.matchAll(/\[([^\]]*)\]/g)) {
    const inner = m[1].trim();
    const sp = inner.indexOf(' ');
    const name = sp === -1 ? inner : inner.slice(0, sp);
    const rest = sp === -1 ? '' : inner.slice(sp + 1).trim();
    out.push({ t: 'cmd', name, args: name === 'sys' ? [rest] : rest ? rest.split(/\s+/) : [], line });
  }
  return out;
}

function parseBlock(lines: RawLine[], start: number, indent: number): [ScnNode[], number] {
  const nodes: ScnNode[] = [];
  let i = start;
  while (i < lines.length) {
    const l = lines[i];
    if (l.indent < indent) break;
    if (l.text === '[choice]') {
      const options: { text: string; body: ScnNode[] }[] = [];
      i++;
      while (i < lines.length && lines[i].indent > l.indent && lines[i].text.startsWith('* ')) {
        const opt = lines[i];
        const [body, ni] = parseBlock(lines, i + 1, opt.indent + 1);
        options.push({ text: unquote(opt.text.slice(2)), body });
        i = ni;
      }
      nodes.push({ t: 'choice', options, line: l.line });
      continue;
    }
    if (ONLY_CMDS.test(l.text)) nodes.push(...parseCmds(l.text, l.line));
    else {
      const m = l.text.match(SPEAKER);
      nodes.push(m ? { t: 'say', who: m[1], text: m[2], line: l.line } : { t: 'say', who: null, text: l.text, line: l.line });
    }
    i++;
  }
  return [nodes, i];
}

export function parseScn(src: string): SceneDef[] {
  const scenes: SceneDef[] = [];
  let cur: { id: string; rating: Rating; lines: RawLine[] } | null = null;
  const flush = () => {
    if (cur) scenes.push({ id: cur.id, rating: cur.rating, body: parseBlock(cur.lines, 0, 0)[0] });
  };
  src.split(/\r?\n/).forEach((rawLine, idx) => {
    const expanded = rawLine.replace(/\t/g, '  ');
    const text = expanded.trim();
    if (!text || text.startsWith('//')) return;
    const header = text.match(/^#\s*scene:\s*(\S+)(?:\s+rating:\s*(all|r15|r18))?/);
    if (header) {
      flush();
      cur = { id: header[1], rating: (header[2] as Rating) ?? 'all', lines: [] };
      return;
    }
    if (!cur) return;
    cur.lines.push({ indent: expanded.length - expanded.trimStart().length, text, line: idx + 1 });
  });
  flush();
  return scenes;
}

// ───────────────────────── 런타임

export interface Shown {
  id: string;
  costume: string;
  expr: string;
}

export interface SceneRuntime {
  sceneId: string;
  rating: Rating;
  stack: { nodes: ScnNode[]; i: number }[];
  say: { who: string | null; text: string } | null;
  choice: string[] | null;
  choiceNodes: ScnNode[][] | null;
  bg: string;
  shown: Shown[];
  done: boolean;
  faded: boolean;
  history: { who: string | null; text: string }[];
}

const CHAR_BY_SHORT: Record<string, CharId> = Object.fromEntries(CHAR_IDS.map((c) => [CHARACTERS[c].short, c]));

export function resolveChar(token: string): CharId | null {
  if ((CHAR_IDS as readonly string[]).includes(token)) return token as CharId;
  return CHAR_BY_SHORT[token] ?? null;
}

export function interpolate(s: GameState, text: string): string {
  return text
    .replace(/\{player\}/g, s.playerName)
    .replace(/\{call:(\w+)\}/g, (_, c: string) => {
      const id = resolveChar(c);
      return id ? callName(id, s.members[id].stage) : c;
    });
}

function num(arg: string | undefined, fallback = 0): number {
  if (!arg) return fallback;
  const n = Number(arg);
  return Number.isFinite(n) ? n : fallback;
}

/** 시나리오 명령 실행. 화면 관련 명령은 런타임을, 게임 관련 명령은 상태를 고친다 */
export function execCommand(s: GameState, rt: SceneRuntime | null, name: string, args: string[]): string | null {
  const c = args[0] ? resolveChar(args[0]) : null;
  switch (name) {
    case 'bg':
      if (rt) rt.bg = args[0] ?? '';
      return null;
    case 'show': {
      if (!rt) return null;
      const id = args[0];
      const entry: Shown = { id, costume: args[1] ?? 'default', expr: args[2] ?? 'neutral' };
      const idx = rt.shown.findIndex((x) => x.id === id);
      if (idx >= 0) rt.shown[idx] = entry;
      else rt.shown.push(entry);
      if (rt.shown.length > 3) rt.shown.shift();
      return null;
    }
    case 'hide':
      if (rt) rt.shown = args[0] === 'all' ? [] : rt.shown.filter((x) => x.id !== args[0]);
      return null;
    case 'aff':
      if (c) addAffection(s, c, num(args[1]));
      return null;
    case 'intim':
      if (c) addIntimacy(s, c, num(args[1]));
      return null;
    case 'stage':
      if (c) {
        const n = Math.max(0, Math.min(5, num(args[1])));
        s.members[c].stage = n;
        s.members[c].affection = Math.max(s.members[c].affection, STAGE_THRESHOLDS[n]);
      }
      return null;
    case 'recruit':
      if (c && !s.members[c].recruited) {
        const others = combatantIds(s);
        const m = s.members[c];
        m.recruited = true;
        m.stage = Math.max(m.stage, 1);
        m.affection = Math.max(m.affection, STAGE_THRESHOLDS[1]);
        catchUpLevel(s, c, others);
        return `${CHARACTERS[c].short} 합류`;
      }
      return null;
    case 'combat':
      if (c) {
        s.members[c].combatant = true;
        catchUpLevel(s, c, combatantIds(s).filter((x) => x !== c));
      }
      return null;
    case 'flag':
      if (args[0]) s.flags[args[0]] = args[1] === undefined ? true : args[1] === 'false' ? false : isNaN(Number(args[1])) ? args[1] : Number(args[1]);
      return null;
    case 'unflag':
      if (args[0]) delete s.flags[args[0]];
      return null;
    case 'money':
      s.guild.funds += num(args[0]);
      return null;
    case 'fame':
      s.guild.fame = Math.max(0, s.guild.fame + num(args[0]));
      return null;
    case 'stones':
      s.guild.stones = Math.max(0, s.guild.stones + num(args[0]));
      return null;
    case 'item':
      if (args[0]) s.inventory[args[0]] = (s.inventory[args[0]] ?? 0) + num(args[1], 1);
      return null;
    case 'title':
      if (args[0] && !s.tower.titles.includes(args[0])) s.tower.titles.push(args[0]);
      return null;
    case 'end':
      if (rt) rt.stack = [];
      return null;
    default:
      return null;
  }
}

function flattenForFade(nodes: ScnNode[]): ScnNode[] {
  const out: ScnNode[] = [];
  for (const n of nodes) {
    if (n.t === 'cmd') out.push(n);
    else if (n.t === 'choice' && n.options[0]) out.push(...flattenForFade(n.options[0].body));
  }
  return out;
}

export function startScene(scene: SceneDef, adult: boolean): SceneRuntime {
  const faded = scene.rating === 'r18' && !adult;
  const body: ScnNode[] = faded
    ? [
        ...flattenForFade(scene.body),
        { t: 'say', who: null, text: '— 두 사람의 밤이 조용히 깊어 간다. —', line: 0 },
        { t: 'say', who: null, text: '(성인 콘텐츠 OFF: 장면이 생략되었습니다)', line: 0 },
      ]
    : scene.body;
  return {
    sceneId: scene.id,
    rating: scene.rating,
    stack: [{ nodes: body, i: 0 }],
    say: null,
    choice: null,
    choiceNodes: null,
    bg: '',
    shown: [],
    done: false,
    faded,
    history: [],
  };
}

/** 다음 대사나 선택지가 나올 때까지 진행한다 */
export function stepScene(s: GameState, rt: SceneRuntime): void {
  if (rt.choice) return;
  rt.say = null;
  while (rt.stack.length) {
    const top = rt.stack[rt.stack.length - 1];
    if (top.i >= top.nodes.length) {
      rt.stack.pop();
      continue;
    }
    const node = top.nodes[top.i++];
    if (node.t === 'cmd') {
      if (node.name === 'sys') {
        rt.say = { who: '__sys', text: interpolate(s, node.args[0] ?? '') };
        rt.history.push(rt.say);
        return;
      }
      execCommand(s, rt, node.name, node.args);
      continue;
    }
    if (node.t === 'say') {
      const who = node.who === '{player}' ? s.playerName : node.who;
      rt.say = { who, text: interpolate(s, node.text) };
      rt.history.push(rt.say);
      return;
    }
    rt.choice = node.options.map((o) => interpolate(s, o.text));
    rt.choiceNodes = node.options.map((o) => o.body);
    return;
  }
  rt.done = true;
}

export function chooseOption(s: GameState, rt: SceneRuntime, idx: number): void {
  if (!rt.choice || !rt.choiceNodes?.[idx]) return;
  rt.history.push({ who: s.playerName, text: `▷ ${rt.choice[idx]}` });
  rt.stack.push({ nodes: rt.choiceNodes[idx], i: 0 });
  rt.choice = null;
  rt.choiceNodes = null;
  stepScene(s, rt);
}

/** 화면 없이 끝까지 실행 (테스트·시뮬레이션용, 선택지는 첫 번째) */
export function runSceneHeadless(s: GameState, scene: SceneDef, adult = true): SceneRuntime {
  const rt = startScene(scene, adult);
  stepScene(s, rt);
  for (let guard = 0; guard < 5000 && !rt.done; guard++) {
    if (rt.choice) chooseOption(s, rt, 0);
    else stepScene(s, rt);
  }
  return rt;
}
