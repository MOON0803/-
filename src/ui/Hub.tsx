import { useState } from 'react';
import { CHARACTERS, STAGE_NAMES } from '../content/characters';
import { FACILITIES } from '../content/facilities';
import { floorLabel, MAIN_TOP, ROOT_BASE, ROOT_FLOORS } from '../content/floors';
import { GIFT_IDS, ITEMS } from '../content/items';
import { PLACES } from '../content/places';
import { combatantIds, recruitedIds } from '../core/state';
import { dateInfo, formatDate, PHASE_LABEL } from '../core/time';
import type { CharId, GameState } from '../core/types';
import type { TrainStat } from '../systems/actions';
import { canDate, moodOf, MOOD_LABEL } from '../systems/bond';
import { rankOf, won } from '../systems/economy';
import { ACTIVITY_LABEL } from '../systems/schedule';
import { memberStats } from '../systems/stats';
import { nextFloorFor, timeBudget } from '../systems/tower';
import { doAction, doDate, doNight, finishGameEarly, sleep, startTower, useGame } from '../game/store';
import { Bar, CharDot, Modal } from './common';
import { Phone } from './Phone';

export function Hud() {
  const s = useGame((g) => g.state);
  const d = dateInfo(s.time.day);
  return (
    <div className="hud" data-testid="hud">
      <span>
        <b>{formatDate(s.time.day)}</b> <span className="muted">Ch{d.chapter} {d.season}</span>
      </span>
      <span className="phase">{PHASE_LABEL[s.time.phase]}</span>
      <span>💰 {won(s.guild.funds)}</span>
      <span className="muted">빚 {won(s.guild.debt)}</span>
      <span>💎 {s.guild.stones}</span>
      <span>⭐ {s.guild.fame}</span>
      <span>
        🏛 <b>{rankOf(s.tower.record)}</b>등급
      </span>
      <span>
        🗼 <b>{s.tower.record}</b>층{s.tower.rootRecord > 0 && ` · B${s.tower.rootRecord}`}
      </span>
      {s.guild.warnings > 0 && <span className="bad">⚠ 경고 {s.guild.warnings}</span>}
    </div>
  );
}

function Building() {
  const s = useGame((g) => g.state);
  const phase = s.time.phase;
  const weekday = dateInfo(s.time.day).weekday;
  const where = (pred: (c: CharId) => boolean) =>
    recruitedIds(s)
      .filter(pred)
      .map((c) => CHARACTERS[c].short)
      .join(' · ');
  const act = (c: CharId) => (phase === 'night' ? null : s.members[c].schedule[weekday][phase]);
  const f = s.guild.facilities;
  const rows = [
    { name: '옥상', label: f.rooftop ? `옥상 정원 Lv${f.rooftop}` : '옥상 (미건설)', who: '' },
    { name: '4층', label: '숙소', who: phase === 'night' ? where((c) => s.members[c].recruited) : where((c) => act(c) === 'rest') },
    { name: '3층', label: '거실 · 주방', who: phase === 'night' ? '' : where((c) => act(c) === 'free') },
    { name: '2층', label: `사무실 · 의무실 Lv${f.infirmary}`, who: where((c) => s.members[c].injuryDays > 0) && `🩹 ${where((c) => s.members[c].injuryDays > 0)}` },
    { name: '1층', label: `카페 「여명」 Lv${f.cafe}`, who: phase === 'night' ? '' : where((c) => act(c) === 'cafe' || (c === 'daeun' && !s.members.daeun.combatant)) },
    {
      name: 'B1',
      label: `훈련장 Lv${f.training}${f.bath ? ` · 욕탕 Lv${f.bath}` : ''}`,
      who: phase === 'night' ? '' : where((c) => (act(c) ?? '').startsWith('train')),
    },
  ];
  return (
    <div className="panel building">
      <div className={`sky ${phase}`}>
        <div className="tower" />
      </div>
      {rows.map((r) => (
        <div key={r.name} className="floor-row">
          <span>
            <b>{r.name}</b> <span className="muted">{r.label}</span>
          </span>
          <span className="who">{r.who}</span>
        </div>
      ))}
      {s.guild.construction && (
        <div className="muted" style={{ fontSize: 13 }}>
          🏗 {FACILITIES[s.guild.construction.id].name} Lv{s.guild.construction.targetLevel} 공사 중 (
          {s.guild.construction.daysLeft}일 남음)
        </div>
      )}
    </div>
  );
}

function MemberChip({ s, c, onClick, extra }: { s: GameState; c: CharId; onClick?: () => void; extra?: string }) {
  const m = s.members[c];
  const d = CHARACTERS[c];
  const body = (
    <>
      <CharDot id={c} />
      <span className="grow">
        <b>{d.short}</b>{' '}
        <span className="muted" style={{ fontSize: 12 }}>
          {m.combatant ? `Lv${m.level}` : '비전투'} · {STAGE_NAMES[m.stage]} · 호감 {Math.floor(m.affection)}
          {m.stage >= 4 ? ` · 친밀 ${m.intimacy}` : ''}
        </span>
        <div style={{ fontSize: 12 }} className="muted">
          피로 {Math.round(m.fatigue)} · 스트레스 {Math.round(m.stress)} · 기분 {MOOD_LABEL[moodOf(m)]}
          {m.injuryDays > 0 && <span className="bad"> · 부상 {m.injuryDays}일</span>}
          {extra && <span> · {extra}</span>}
        </div>
      </span>
    </>
  );
  return onClick ? (
    <button className="member-chip" onClick={onClick} style={{ width: '100%', textAlign: 'left' }} data-testid={`pick-${c}`}>
      {body}
    </button>
  ) : (
    <div className="member-chip">{body}</div>
  );
}

type Picker =
  | { kind: 'talk' | 'gift' | 'train' | 'date' | 'visit' }
  | { kind: 'giftItem'; char: CharId }
  | { kind: 'trainStat'; char: CharId }
  | { kind: 'datePlace'; char: CharId }
  | { kind: 'tower' }
  | null;

export function Hub() {
  const s = useGame((g) => g.state);
  const log = useGame((g) => g.log);
  const [picker, setPicker] = useState<Picker>(null);
  const phase = s.time.phase;
  const members = recruitedIds(s);
  const fighters = combatantIds(s);
  const close = () => setPicker(null);

  const dayActions = [
    { id: 'tower', t: '🗼 탑 등반', d: phase === 'morning' ? '반나절 또는 종일' : '반나절 (오후)', on: () => setPicker({ kind: 'tower' }), dis: fighters.every((c) => s.members[c].injuryDays > 0) },
    { id: 'talk', t: '💬 대화', d: '호감 +', on: () => setPicker({ kind: 'talk' }) },
    { id: 'gift', t: '🎁 선물', d: '취향에 따라 호감 ±', on: () => setPicker({ kind: 'gift' }), dis: !GIFT_IDS.some((g) => (s.inventory[g] ?? 0) > 0) },
    { id: 'train', t: '🏋 훈련 지도', d: '스탯 크게 +', on: () => setPicker({ kind: 'train' }) },
    ...(phase === 'afternoon' ? [{ id: 'date', t: '💗 데이트', d: '오후+밤 사용', on: () => setPicker({ kind: 'date' }) }] : []),
    { id: 'cafe', t: '☕ 카페 근무', d: '오늘 매출 +', on: () => doAction({ kind: 'cafe' }) },
    { id: 'rift', t: '🌀 균열 소탕', d: '부업 의뢰', on: () => doAction({ kind: 'rift' }) },
    { id: 'rest', t: '🛋 휴식', d: '그냥 쉰다', on: () => doAction({ kind: 'rest' }) },
  ];

  const nightActions = [
    { id: 'visit', t: '🚪 방 방문', d: '둘만의 시간', on: () => setPicker({ kind: 'visit' }) },
    { id: 'living', t: '🍗 거실', d: '다 같이 야식', on: () => doNight({ kind: 'living' }) },
    { id: 'rooftop', t: '🌙 옥상', d: s.guild.facilities.rooftop ? '스트레스 회복' : '미건설', on: () => doNight({ kind: 'rooftop' }), dis: !s.guild.facilities.rooftop },
    { id: 'bath', t: '♨ 욕탕', d: s.guild.facilities.bath ? '피로 회복' : '미건설', on: () => doNight({ kind: 'bath' }), dis: !s.guild.facilities.bath },
    { id: 'sleep', t: '💤 잠자기', d: '하루 정산', on: () => sleep() },
  ];

  const actions = phase === 'night' ? nightActions : dayActions;
  const canEnd = s.flags.root_cleared === true && s.guild.debt <= 0;

  return (
    <>
      <Hud />
      <div className="hub">
        <Building />
        <div className="col">
          <div className="panel">
            <h3>
              {PHASE_LABEL[phase]}에 무엇을 할까?{' '}
              <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>
                {phase === 'night' ? '밤 행동 후 하루가 끝납니다' : '행동 1회 = 이 페이즈 소모'}
              </span>
            </h3>
            <div className="actions-grid">
              {actions.map((a) => (
                <button key={a.id} className="action-btn" onClick={a.on} disabled={a.dis} data-testid={`act-${a.id}`}>
                  <div className="t">{a.t}</div>
                  <div className="d">{a.d}</div>
                </button>
              ))}
            </div>
            {canEnd && (
              <button className="primary" style={{ marginTop: 10 }} onClick={finishGameEarly}>
                🌅 엔딩 보기
              </button>
            )}
          </div>
          <div className="panel">
            <h4>길드원</h4>
            <div className="col" style={{ gap: 6 }}>
              {members.map((c) => (
                <MemberChip key={c} s={s} c={c} extra={phase !== 'night' && s.members[c].combatant ? ACTIVITY_LABEL[s.members[c].schedule[dateInfo(s.time.day).weekday][phase]] : undefined} />
              ))}
            </div>
          </div>
          {log.length > 0 && (
            <div className="panel">
              <h4>오늘의 기록</h4>
              <div className="log">
                {log.map((l, i) => (
                  <div key={i}>{l}</div>
                ))}
              </div>
            </div>
          )}
        </div>
        <Phone />
      </div>

      {picker && 'kind' in picker && ['talk', 'gift', 'train', 'date', 'visit'].includes(picker.kind) && (
        <Modal onClose={close}>
          <h3>{{ talk: '누구와 대화할까?', gift: '누구에게 선물할까?', train: '누구를 지도할까?', date: '누구와 데이트할까?', visit: '누구의 방에 갈까?' }[picker.kind as 'talk']}</h3>
          <div className="col" style={{ gap: 6 }}>
            {(picker.kind === 'train' ? fighters : members).map((c) => (
              <MemberChip
                key={c}
                s={s}
                c={c}
                onClick={() => {
                  if (picker.kind === 'talk') {
                    close();
                    doAction({ kind: 'talk', char: c });
                  } else if (picker.kind === 'gift') setPicker({ kind: 'giftItem', char: c });
                  else if (picker.kind === 'train') setPicker({ kind: 'trainStat', char: c });
                  else if (picker.kind === 'date') setPicker({ kind: 'datePlace', char: c });
                  else {
                    close();
                    doNight({ kind: 'visit', char: c });
                  }
                }}
              />
            ))}
          </div>
        </Modal>
      )}

      {picker?.kind === 'giftItem' && (
        <Modal onClose={close}>
          <h3>{CHARACTERS[picker.char].short}에게 줄 선물</h3>
          <div className="col" style={{ gap: 6 }}>
            {GIFT_IDS.filter((g) => (s.inventory[g] ?? 0) > 0).map((g) => {
              const m = s.members[picker.char];
              const known = m.knownLikes.includes(g) ? '❤ 좋아함' : m.knownDislikes.includes(g) ? '✕ 싫어함' : '';
              return (
                <button
                  key={g}
                  onClick={() => {
                    close();
                    doAction({ kind: 'gift', char: picker.char, item: g });
                  }}
                >
                  {ITEMS[g].name} ×{s.inventory[g]} <span className="muted">{known}</span>
                </button>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            선물은 스마트폰 「쇼핑」 앱에서 삽니다. 반응을 보면 수첩에 취향이 기록됩니다.
          </p>
        </Modal>
      )}

      {picker?.kind === 'trainStat' && (
        <Modal onClose={close}>
          <h3>{CHARACTERS[picker.char].short} 훈련 지도</h3>
          <div className="row">
            {(['train_atk', 'train_def', 'train_mag', 'train_spd'] as TrainStat[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  close();
                  doAction({ kind: 'train', char: picker.char, stat: t });
                }}
              >
                {ACTIVITY_LABEL[t]}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {picker?.kind === 'datePlace' && (
        <Modal onClose={close}>
          <h3>{CHARACTERS[picker.char].short}와(과) 어디 갈까?</h3>
          <div className="col" style={{ gap: 6 }}>
            {PLACES.map((p) => {
              const err = canDate(s, picker.char, p.id);
              const m = s.members[picker.char];
              const known = m.knownLikes.includes(p.id) ? ' ❤' : m.knownDislikes.includes(p.id) ? ' ✕' : '';
              return (
                <button
                  key={p.id}
                  disabled={!!err}
                  onClick={() => {
                    close();
                    doDate(picker.char, p.id);
                  }}
                  style={{ textAlign: 'left' }}
                >
                  <b>
                    {p.name}
                    {known}
                  </b>{' '}
                  <span className="muted">
                    {p.cost ? won(p.cost) : '무료'} · {p.desc}
                  </span>
                  {err && <div className="bad" style={{ fontSize: 12 }}>{err}</div>}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {picker?.kind === 'tower' && <TowerPrep onClose={close} />}
    </>
  );
}

function TowerPrep({ onClose }: { onClose: () => void }) {
  const s = useGame((g) => g.state);
  const phase = s.time.phase;
  const weekday = dateInfo(s.time.day).weekday;
  const available = combatantIds(s).filter((c) => s.members[c].injuryDays === 0);
  const defaults = available.filter((c) => phase !== 'night' && s.members[c].schedule[weekday][phase] === 'standby').slice(0, 4);
  const [party, setParty] = useState<CharId[]>(defaults.length ? defaults : available.slice(0, 4));
  const [duration, setDuration] = useState<'half' | 'full'>(phase === 'morning' ? 'full' : 'half');
  const rootOpen = s.flags.root_open === true && s.tower.rootRecord < ROOT_FLOORS;
  const [target, setTarget] = useState<'main' | 'root'>('main');
  const floor = nextFloorFor(s, target === 'root');
  const mainDone = s.tower.record >= MAIN_TOP && s.flags.endless !== true;
  const [start, setStart] = useState<number | null>(null);
  const startFloor = start ?? floor;
  // 각인 이동: 다음 층 또는 이미 깬 층 (파밍)
  const floorOptions =
    target === 'root'
      ? Array.from({ length: floor - ROOT_BASE }, (_, i) => floor - i)
      : Array.from({ length: floor }, (_, i) => floor - i);

  const toggle = (c: CharId) =>
    setParty((p) => (p.includes(c) ? p.filter((x) => x !== c) : p.length >= 4 ? p : [...p, c]));

  return (
    <Modal onClose={onClose}>
      <h3>🗼 탑 등반 준비</h3>
      <div className="col">
        <div className="row">
          <button className={target === 'main' ? 'primary' : ''} onClick={() => { setTarget('main'); setStart(null); }} disabled={mainDone}>
            백탑 {mainDone ? '(정상 도달)' : `${floorLabel(floor > ROOT_BASE ? nextFloorFor(s, false) : floor)}부터`}
          </button>
          {rootOpen && (
            <button className={target === 'root' ? 'primary' : ''} onClick={() => { setTarget('root'); setStart(null); }}>
              역탑(뿌리) {floorLabel(nextFloorFor(s, true))}부터
            </button>
          )}
        </div>
        <label className="row">
          시작 층
          <select value={startFloor} onChange={(e) => setStart(Number(e.target.value))} data-testid="start-floor">
            {floorOptions.map((f) => (
              <option key={f} value={f}>
                {floorLabel(f)} {f === floor ? '(다음 층)' : '(파밍)'}
              </option>
            ))}
          </select>
        </label>
        <div className="row">
          <button className={duration === 'half' ? 'primary' : ''} onClick={() => setDuration('half')}>
            반나절 (등반 시간 {timeBudget(s, 'half')})
          </button>
          <button className={duration === 'full' ? 'primary' : ''} onClick={() => setDuration('full')} disabled={phase !== 'morning'}>
            종일 (등반 시간 {timeBudget(s, 'full')})
          </button>
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          파티 (최대 4명) — 「등반 대기」 스케줄인 멤버가 기본 선택됩니다.
        </div>
        <div className="col" style={{ gap: 6 }}>
          {combatantIds(s).map((c) => {
            const m = s.members[c];
            const st = memberStats(s, c);
            const on = party.includes(c);
            return (
              <button
                key={c}
                className="member-chip"
                style={{ textAlign: 'left', borderColor: on ? 'var(--good)' : undefined }}
                disabled={m.injuryDays > 0}
                onClick={() => toggle(c)}
                data-testid={`party-${c}`}
              >
                <span>{on ? '☑' : '☐'}</span>
                <CharDot id={c} />
                <span className="grow">
                  <b>{CHARACTERS[c].short}</b>{' '}
                  <span className="muted" style={{ fontSize: 12 }}>
                    {CHARACTERS[c].className} Lv{m.level} · HP {st.hp} · 공 {st.atk} · 마 {st.mag} · 방 {st.def} · 속 {st.spd}
                  </span>
                  <Bar value={100 - m.fatigue} max={100} />
                </span>
              </button>
            );
          })}
        </div>
        <button
          className="primary"
          disabled={party.length === 0 || mainDone && target === 'main'}
          onClick={() => {
            onClose();
            startTower(party, duration, target, startFloor);
          }}
          data-testid="tower-go"
        >
          출발 ({party.map((c) => CHARACTERS[c].short).join(', ') || '파티 없음'})
        </button>
      </div>
    </Modal>
  );
}
