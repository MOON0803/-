import { CHARACTERS, STAGE_THRESHOLDS } from '../content/characters';
import { EVENT_MAP } from '../content/events';
import { FACILITIES } from '../content/facilities';
import { ITEMS } from '../content/items';
import { SCENES } from '../content/scenes';
import { TITLES } from '../content/titles';
import { deserialize, serialize } from '../core/save';
import { combatantIds } from '../core/state';
import { CHAR_IDS, type CharId, type FacilityId, type GameState, type Phase, type StatKey } from '../core/types';
import { endDay } from '../systems/calendar';
import { explainEvent } from '../systems/events';
import { parseScn, resolveChar } from '../systems/scene';
import { startRun } from '../systems/tower';
import { battleForce, exitTower, mutate, playScene, popup, replayScene, useGame } from '../game/store';
import { hasBackground } from '../ui/common';
import { simulate, type SimPolicy } from './sim';

export interface CommandDef {
  usage: string;
  desc: string;
  run: (args: string[]) => string | string[];
}

function charsArg(arg: string | undefined): CharId[] {
  if (arg === 'all') return combatantIds(useGame.getState().state).length ? [...CHAR_IDS] : [];
  const c = arg ? resolveChar(arg) : null;
  if (!c) throw new Error(`캐릭터를 모르겠습니다: ${arg} (${CHAR_IDS.join(', ')}, all)`);
  return [c];
}

function relative(cur: number, arg: string | undefined): number {
  if (arg === undefined) throw new Error('값이 필요합니다');
  const n = Number(arg.replace(/[,_]/g, ''));
  if (!Number.isFinite(n)) throw new Error(`숫자가 아닙니다: ${arg}`);
  return arg.startsWith('+') || arg.startsWith('-') ? cur + n : n;
}

function parseValue(v: string): unknown {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  const n = Number(v);
  if (v !== '' && Number.isFinite(n)) return n;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

function walk(obj: unknown, path: string): { parent: Record<string, unknown>; key: string } {
  const parts = path.split('.');
  let cur = obj as Record<string, unknown>;
  for (const p of parts.slice(0, -1)) {
    if (cur[p] === undefined || typeof cur[p] !== 'object') throw new Error(`경로 없음: ${path}`);
    cur = cur[p] as Record<string, unknown>;
  }
  return { parent: cur, key: parts[parts.length - 1] };
}

const st = () => useGame.getState().state;

export const COMMANDS: Record<string, CommandDef> = {
  help: {
    usage: 'help [명령]',
    desc: '명령 목록 / 도움말',
    run: ([name]) =>
      name && COMMANDS[name]
        ? [`${COMMANDS[name].usage}`, `  ${COMMANDS[name].desc}`]
        : Object.values(COMMANDS).map((c) => `${c.usage.padEnd(36)} ${c.desc}`),
  },
  get: {
    usage: 'get <경로>',
    desc: '상태 값 읽기 (예: get guild.funds, get members.harin)',
    run: ([path]) => {
      if (!path) return JSON.stringify(st(), null, 2).slice(0, 4000);
      const { parent, key } = walk(st(), path);
      return JSON.stringify(parent[key], null, 2);
    },
  },
  set: {
    usage: 'set <경로> <값>',
    desc: '상태 값 쓰기 (예: set guild.fame 3000)',
    run: ([path, ...rest]) => {
      if (!path || rest.length === 0) throw new Error('사용법: set <경로> <값>');
      const v = parseValue(rest.join(' '));
      mutate((s) => {
        const { parent, key } = walk(s, path);
        parent[key] = v;
      });
      return `${path} = ${JSON.stringify(v)}`;
    },
  },
  money: {
    usage: 'money set|add <n>',
    desc: '자금',
    run: ([op, v]) => {
      const n = mutate((s) => (s.guild.funds = op === 'add' ? s.guild.funds + Number(v) : relative(s.guild.funds, v)));
      return `자금 = ${n.toLocaleString()}원`;
    },
  },
  debt: {
    usage: 'debt set <n>',
    desc: '빚',
    run: ([, v]) => `빚 = ${mutate((s) => (s.guild.debt = Math.max(0, relative(s.guild.debt, v)))).toLocaleString()}원`,
  },
  stone: {
    usage: 'stone add <n>',
    desc: '마석',
    run: ([, v]) => `마석 = ${mutate((s) => (s.guild.stones = Math.max(0, s.guild.stones + Number(v))))}`,
  },
  item: {
    usage: 'item add <id> [n]',
    desc: `아이템 (${Object.keys(ITEMS).join(', ')})`,
    run: ([, id, n]) => {
      if (!ITEMS[id]) throw new Error(`아이템 없음: ${id}`);
      return `${ITEMS[id].name} = ${mutate((s) => (s.inventory[id] = (s.inventory[id] ?? 0) + Number(n ?? 1)))}`;
    },
  },
  fame: {
    usage: 'fame set <n>',
    desc: '명성',
    run: ([op, v]) => `명성 = ${mutate((s) => (s.guild.fame = relative(s.guild.fame, op === 'set' ? v : op)))}`,
  },
  aff: {
    usage: 'aff <캐릭터> <n|+n|-n>',
    desc: '호감 (단계는 바뀌지 않음 — stage 명령 사용)',
    run: ([c, v]) =>
      charsArg(c).map((id) => `${CHARACTERS[id].short} 호감 = ${mutate((s) => (s.members[id].affection = Math.max(0, Math.min(1000, relative(s.members[id].affection, v)))))}`),
  },
  intim: {
    usage: 'intim <캐릭터> <n>',
    desc: '친밀',
    run: ([c, v]) =>
      charsArg(c).map((id) => `${CHARACTERS[id].short} 친밀 = ${mutate((s) => (s.members[id].intimacy = Math.max(0, Math.min(100, relative(s.members[id].intimacy, v)))))}`),
  },
  stage: {
    usage: 'stage <캐릭터> <0~5>',
    desc: '관계 단계 (호감도 최소치로 맞춤)',
    run: ([c, v]) =>
      charsArg(c).map((id) => {
        const n = Math.max(0, Math.min(5, Number(v)));
        mutate((s) => {
          s.members[id].stage = n;
          s.members[id].affection = Math.max(s.members[id].affection, STAGE_THRESHOLDS[n]);
        });
        return `${CHARACTERS[id].short} 단계 = ${n}`;
      }),
  },
  stat: {
    usage: 'stat <캐릭터> <스탯> <n>',
    desc: '추가 스탯(bonus) 설정: hp mp atk mag def spd chm',
    run: ([c, k, v]) =>
      charsArg(c).map((id) => `${CHARACTERS[id].short} ${k} 보너스 = ${mutate((s) => (s.members[id].bonus[k as StatKey] = relative(s.members[id].bonus[k as StatKey], v)))}`),
  },
  level: {
    usage: 'level <캐릭터|all> <n>',
    desc: '레벨',
    run: ([c, v]) => charsArg(c).map((id) => `${CHARACTERS[id].short} Lv = ${mutate((s) => (s.members[id].level = Math.max(1, relative(s.members[id].level, v))))}`),
  },
  cond: {
    usage: 'cond <캐릭터|all> reset',
    desc: '피로·스트레스·부상 초기화',
    run: ([c]) => {
      const ids = charsArg(c);
      mutate((s) => ids.forEach((id) => Object.assign(s.members[id], { fatigue: 0, stress: 0, injuryDays: 0 })));
      return '컨디션 초기화';
    },
  },
  recruit: {
    usage: 'recruit <캐릭터|all>',
    desc: '즉시 영입 (다은은 전투원으로)',
    run: ([c]) => {
      const ids = c === 'all' ? [...CHAR_IDS] : charsArg(c);
      mutate((s) =>
        ids.forEach((id) => {
          const m = s.members[id];
          m.recruited = true;
          m.combatant = true;
          m.stage = Math.max(1, m.stage);
          m.affection = Math.max(100, m.affection);
        }),
      );
      return `영입: ${ids.map((id) => CHARACTERS[id].short).join(', ')}`;
    },
  },
  day: {
    usage: 'day +<n> | day goto <n>',
    desc: '날짜 이동 (하루씩 정산하며 넘김)',
    run: ([a, b]) => {
      const target = a === 'goto' ? Number(b) : st().time.day + Number(a);
      const out = mutate((s) => {
        let n = 0;
        while (s.time.day < target && !s.ending && n < 400) {
          endDay(s);
          n++;
        }
        return n;
      });
      return `${out}일 진행 → ${st().time.day}일차${st().ending ? ` (엔딩: ${st().ending})` : ''}`;
    },
  },
  phase: {
    usage: 'phase <morning|afternoon|night>',
    desc: '페이즈 변경',
    run: ([p]) => {
      if (!['morning', 'afternoon', 'night'].includes(p)) throw new Error('morning | afternoon | night');
      mutate((s) => (s.time.phase = p as Phase));
      return `페이즈 = ${p}`;
    },
  },
  facility: {
    usage: 'facility <id> <lv>',
    desc: `시설 레벨 즉시 설정 (${Object.keys(FACILITIES).join(', ')})`,
    run: ([id, lv]) => {
      if (!FACILITIES[id as FacilityId]) throw new Error(`시설 없음: ${id}`);
      mutate((s) => (s.guild.facilities[id as FacilityId] = Math.min(FACILITIES[id as FacilityId].maxLevel, Number(lv))));
      return `${FACILITIES[id as FacilityId].name} Lv${st().guild.facilities[id as FacilityId]}`;
    },
  },
  flag: {
    usage: 'flag set|unset|list [이름] [값]',
    desc: '스토리 플래그',
    run: ([op, name, v]) => {
      if (op === 'list' || !op) return Object.entries(st().flags).map(([k, val]) => `${k} = ${val}`);
      if (op === 'set') mutate((s) => (s.flags[name] = v === undefined ? true : (parseValue(v) as boolean)));
      if (op === 'unset') mutate((s) => delete s.flags[name]);
      return `${op} ${name}`;
    },
  },
  floor: {
    usage: 'floor record <n> | floor goto <n>',
    desc: '등반 기록 설정 / 해당 층으로 바로 등반 시작',
    run: ([op, v]) => {
      const n = Number(v);
      if (op === 'record') {
        mutate((s) => (s.tower.record = Math.max(0, Math.min(50, n))));
        return `최고 기록 = ${st().tower.record}층`;
      }
      if (op === 'goto') {
        const g = useGame.getState();
        const s = structuredClone(g.state);
        if (s.time.phase === 'night') s.time.phase = 'morning';
        const party = combatantIds(s)
          .filter((c) => s.members[c].injuryDays === 0)
          .slice(0, 4);
        if (!party.length) throw new Error('파티가 없습니다 (recruit 사용)');
        const run = startRun(s, party, 'full', s.time.phase as 'morning', n);
        useGame.setState({ state: s, run, mode: 'tower', battle: null });
        return `${n}층으로 이동 (파티: ${party.join(', ')})`;
      }
      throw new Error('floor record <n> | floor goto <n>');
    },
  },
  tower: {
    usage: 'tower time <n> | tower exit',
    desc: '등반 시간 조정 / 즉시 귀환',
    run: ([op, v]) => {
      const g = useGame.getState();
      if (!g.run) throw new Error('탑 안이 아닙니다');
      if (op === 'time') {
        const run = { ...g.run, timeLeft: Number(v), timeMax: Math.max(g.run.timeMax, Number(v)) };
        useGame.setState({ run });
        return `등반 시간 = ${v}`;
      }
      if (op === 'exit') {
        exitTower('voluntary');
        return '귀환';
      }
      throw new Error('tower time <n> | tower exit');
    },
  },
  title: {
    usage: 'title give <id>|all',
    desc: `칭호 지급 (${TITLES.map((t) => t.id).join(', ')})`,
    run: ([, id]) => {
      const ids = id === 'all' ? TITLES.map((t) => t.id) : [id];
      mutate((s) => ids.forEach((t) => !s.tower.titles.includes(t) && s.tower.titles.push(t)));
      return `칭호 지급: ${ids.join(', ')}`;
    },
  },
  event: {
    usage: 'event <id>',
    desc: '이벤트 즉시 실행 (조건 무시)',
    run: ([id]) => {
      const ev = EVENT_MAP[id];
      if (!ev) throw new Error(`이벤트 없음: ${id}`);
      mutate((s) => !s.seenEvents.includes(id) && s.seenEvents.push(id));
      playScene(ev.scene);
      return `이벤트 ${id} → 씬 ${ev.scene}`;
    },
  },
  scene: {
    usage: 'scene <id>',
    desc: '씬만 재생 (scene list 로 목록)',
    run: ([id]) => {
      if (id === 'list' || !id) return Object.keys(SCENES).sort();
      if (!SCENES[id]) throw new Error(`씬 없음: ${id}`);
      replayScene(id);
      return `씬 ${id} (상태 변화 없음)`;
    },
  },
  why: {
    usage: 'why <이벤트id>',
    desc: '이벤트가 왜 안 뜨는지 조건별로 출력',
    run: ([id]) => explainEvent(st(), id),
  },
  gallery: {
    usage: 'gallery unlock all',
    desc: '회상 전체 해금',
    run: () => {
      mutate((s) => (s.seenScenes = [...new Set([...s.seenScenes, ...Object.keys(SCENES)])]));
      return `${Object.keys(SCENES).length}개 씬 해금`;
    },
  },
  battle: {
    usage: 'battle win|lose',
    desc: '현재 전투 즉시 종료',
    run: ([r]) => {
      if (!useGame.getState().battle) throw new Error('전투 중이 아닙니다');
      battleForce(r === 'lose' ? 'lose' : 'win');
      return `전투 ${r}`;
    },
  },
  god: {
    usage: 'god on|off',
    desc: '아군 무적',
    run: ([v]) => {
      mutate((s) => (s.cheats.god = v !== 'off'));
      const b = useGame.getState().battle;
      if (b) useGame.setState({ battle: { ...b, god: v !== 'off' } });
      return `god ${v !== 'off' ? 'on' : 'off'}`;
    },
  },
  oneshot: {
    usage: 'oneshot on|off',
    desc: '적 일격사',
    run: ([v]) => {
      mutate((s) => (s.cheats.oneshot = v !== 'off'));
      const b = useGame.getState().battle;
      if (b) useGame.setState({ battle: { ...b, oneshot: v !== 'off' } });
      return `oneshot ${v !== 'off' ? 'on' : 'off'}`;
    },
  },
  rng: {
    usage: 'rng seed <n>',
    desc: '난수 시드 고정',
    run: ([, v]) => `rng = ${mutate((s) => (s.rng = Number(v) >>> 0))}`,
  },
  save: {
    usage: 'save dump | save load <json>',
    desc: '세이브 JSON 내보내기·불러오기',
    run: ([op, ...rest]) => {
      if (op === 'dump') {
        const json = serialize(st());
        navigator.clipboard?.writeText(json).catch(() => undefined);
        return [`(클립보드에 복사됨, ${json.length}자)`, json.slice(0, 500) + '…'];
      }
      if (op === 'load') {
        const s: GameState = deserialize(rest.join(' '));
        useGame.setState({ state: s, mode: 'hub', run: null, battle: null });
        return '불러옴';
      }
      throw new Error('save dump | save load <json>');
    },
  },
  sim: {
    usage: 'sim <주> [tower|cafe|balance] [apply]',
    desc: '자동 진행 시뮬레이션 (apply 를 붙이면 결과를 게임에 반영)',
    run: ([w, policy, apply]) => {
      const r = simulate(st(), Number(w ?? 4), (policy as SimPolicy) ?? 'balance');
      if (apply === 'apply') useGame.setState({ state: r.state, mode: 'hub', run: null, battle: null });
      return r.lines;
    },
  },
  portrait: {
    usage: 'portrait <캐릭터> [의상] [표정]',
    desc: '스탠딩 미리보기 (neutral smile blush sad angry surprised serious)',
    run: ([c, costume = 'casual', expr = 'neutral']) => {
      const [sc] = parseScn(`# scene: __portrait\n[bg dorm_night]\n[show ${c} ${costume} ${expr}]\n[sys 스탠딩 미리보기: ${c} / ${costume} / ${expr}]`);
      SCENES.__portrait = sc;
      replayScene('__portrait');
      return `미리보기 ${c}`;
    },
  },
  assets: {
    usage: 'assets check',
    desc: '씬이 참조하는 배경 중 아직 에셋(플레이스홀더 포함)이 없는 것',
    run: () => {
      const bgs = new Set<string>();
      for (const sc of Object.values(SCENES)) {
        const visit = (nodes: typeof sc.body) =>
          nodes.forEach((n) => {
            if (n.t === 'cmd' && n.name === 'bg' && n.args[0]) bgs.add(n.args[0]);
            if (n.t === 'choice') n.options.forEach((o) => visit(o.body));
          });
        visit(sc.body);
      }
      const missing = [...bgs].filter((b) => !hasBackground(b));
      const missingScenes = Object.values(EVENT_MAP).filter((e) => !SCENES[e.scene]).map((e) => e.scene);
      return [
        `배경 ${bgs.size}종 참조 · 플레이스홀더 없음 ${missing.length}종${missing.length ? `: ${missing.join(', ')}` : ''}`,
        `이벤트가 참조하는데 없는 씬: ${missingScenes.length ? missingScenes.join(', ') : '없음'}`,
        '(실제 이미지 에셋은 아직 없음 — 전부 CSS 플레이스홀더)',
      ];
    },
  },
  ui: {
    usage: 'ui popup <text>',
    desc: '팝업 테스트',
    run: ([, ...t]) => {
      popup('테스트', [t.join(' ')], 'system');
      return 'ok';
    },
  },
};

export function runCommand(line: string): string[] {
  const [name, ...args] = line.trim().split(/\s+/);
  if (!name) return [];
  const cmd = COMMANDS[name];
  if (!cmd) return [`알 수 없는 명령: ${name} (help)`];
  const out = cmd.run(args);
  return Array.isArray(out) ? out : [out];
}
