import { useState } from 'react';
import { CHARACTERS, STAGE_NAMES, STAGE_THRESHOLDS, callName } from '../content/characters';
import { FACILITIES, FACILITY_ORDER } from '../content/facilities';
import { TRIALS, ZONES, floorLabel, zoneOf } from '../content/floors';
import { CONSUMABLE_IDS, GIFT_IDS, ITEMS } from '../content/items';
import { RELICS } from '../content/perks';
import { PLACE_MAP } from '../content/places';
import { SCENES } from '../content/scenes';
import { TITLES, MAX_EQUIPPED_TITLES } from '../content/titles';
import { SLOTS, SLOT_LABEL, slotInfo } from '../core/save';
import { combatantIds, recruitedIds } from '../core/state';
import { dateInfo } from '../core/time';
import type { Activity, CharId } from '../core/types';
import { answerMessage, rankingTable } from '../systems/calendar';
import { canBuild, quarterTarget, rankOf, repay, sellStones, startBuild, weeklyCosts, won } from '../systems/economy';
import { endingLabel } from '../systems/ending';
import { ACTIVITIES, ACTIVITY_LABEL } from '../systems/schedule';
import { expToNext, memberStats } from '../systems/stats';
import { ADULT_BUILD, loadGame, mutate, popup, replayScene, saveGame, toTitle, useGame } from '../game/store';
import { Bar, CharDot } from './common';

type AppId = 'schedule' | 'talk' | 'tower' | 'guild' | 'facility' | 'bank' | 'shop' | 'notebook' | 'album' | 'settings';

const APPS: { id: AppId; icon: string; name: string }[] = [
  { id: 'schedule', icon: '📅', name: '일정' },
  { id: 'talk', icon: '💬', name: '헌터톡' },
  { id: 'tower', icon: '🗼', name: '탑' },
  { id: 'guild', icon: '🛡', name: '길드' },
  { id: 'facility', icon: '🏗', name: '시설' },
  { id: 'bank', icon: '🏦', name: '뱅킹' },
  { id: 'shop', icon: '🛍', name: '쇼핑' },
  { id: 'notebook', icon: '📒', name: '수첩' },
  { id: 'album', icon: '🖼', name: '앨범' },
  { id: 'settings', icon: '⚙', name: '설정' },
];

export function Phone() {
  const [app, setApp] = useState<AppId | null>(null);
  const unread = useGame((g) => g.state.messages.filter((m) => m.answered === null).length);
  const cur = APPS.find((a) => a.id === app);
  return (
    <div className="phone" data-testid="phone">
      <div className="notch" />
      {!cur ? (
        <div className="apps">
          {APPS.map((a) => (
            <button key={a.id} className="app-icon" onClick={() => setApp(a.id)} data-testid={`app-${a.id}`}>
              <span className="ic">{a.icon}</span>
              {a.name}
              {a.id === 'talk' && unread > 0 && <span className="badge">{unread}</span>}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="app-head">
            <button className="small ghost" onClick={() => setApp(null)}>
              ‹ 홈
            </button>
            <h3>
              {cur.icon} {cur.name}
            </h3>
          </div>
          <div className="app-body">
            {app === 'schedule' && <ScheduleApp />}
            {app === 'talk' && <TalkApp />}
            {app === 'tower' && <TowerApp />}
            {app === 'guild' && <GuildApp />}
            {app === 'facility' && <FacilityApp />}
            {app === 'bank' && <BankApp />}
            {app === 'shop' && <ShopApp />}
            {app === 'notebook' && <NotebookApp />}
            {app === 'album' && <AlbumApp />}
            {app === 'settings' && <SettingsApp />}
          </div>
        </>
      )}
    </div>
  );
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

function ScheduleApp() {
  const s = useGame((g) => g.state);
  const fighters = combatantIds(s);
  const [sel, setSel] = useState<CharId | null>(fighters[0] ?? null);
  const today = dateInfo(s.time.day).weekday;
  if (!sel) return <div className="muted">배정할 멤버가 없습니다.</div>;
  const setAct = (day: number, phase: 'morning' | 'afternoon', act: Activity) =>
    mutate((st) => {
      st.members[sel].schedule[day][phase] = act;
    });
  const copyToAll = () =>
    mutate((st) => {
      for (const c of combatantIds(st)) st.members[c].schedule = structuredClone(st.members[sel].schedule);
    });
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        {fighters.map((c) => (
          <button key={c} className={`small ${sel === c ? 'primary' : ''}`} onClick={() => setSel(c)}>
            {CHARACTERS[c].short}
          </button>
        ))}
      </div>
      <table className="sched">
        <thead>
          <tr>
            <th></th>
            <th>오전</th>
            <th>오후</th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, i) => (
            <tr key={d} style={i === today ? { background: 'rgba(138,125,255,0.15)' } : undefined}>
              <td>{d}</td>
              {(['morning', 'afternoon'] as const).map((p) => (
                <td key={p}>
                  <select value={s.members[sel].schedule[i][p]} onChange={(e) => setAct(i, p, e.target.value as Activity)}>
                    {ACTIVITIES.map((a) => (
                      <option key={a} value={a}>
                        {ACTIVITY_LABEL[a]}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="small" onClick={copyToAll}>
          이 스케줄을 모두에게 복사
        </button>
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        「등반 대기」 멤버는 탑 등반 시 기본 파티로 선택됩니다. 같은 활동을 몰아 넣으면 스트레스가 쌓입니다.
        {s.members.daeun.recruited && !s.members.daeun.combatant && ' 다은은 카페 매니저로 고정입니다.'}
      </p>
    </div>
  );
}

function TalkApp() {
  const msgs = useGame((g) => g.state.messages);
  const s = useGame((g) => g.state);
  const list = [...msgs].reverse();
  if (list.length === 0) return <div className="muted">아직 메시지가 없습니다. 밤이 되면 연락이 오기도 합니다.</div>;
  return (
    <div>
      {list.map((m) => (
        <div key={m.uid} className="card">
          <div className="row">
            <CharDot id={m.from} size={20} />
            <b>{CHARACTERS[m.from].short}</b>
            <span className="muted" style={{ fontSize: 12 }}>
              {dateInfo(m.day).month}월 {dateInfo(m.day).week}주
            </span>
          </div>
          <div className="bubble">{m.text}</div>
          {m.answered === null ? (
            <div className="col" style={{ gap: 4 }}>
              {m.replies.map((r, i) => (
                <button
                  key={i}
                  className="small"
                  onClick={() => mutate((st) => answerMessage(st, m.uid, i))}
                >
                  {r.text}
                </button>
              ))}
            </div>
          ) : m.answered >= 0 ? (
            <>
              <div className="bubble me">{m.replies[m.answered].text}</div>
              <div className="bubble">{m.replies[m.answered].response}</div>
            </>
          ) : (
            <div className="muted" style={{ fontSize: 12 }}>
              (읽씹함)
            </div>
          )}
        </div>
      ))}
      <div className="muted" style={{ fontSize: 12 }}>
        {s.playerName}의 헌터톡
      </div>
    </div>
  );
}

function TowerApp() {
  const s = useGame((g) => g.state);
  const rows = rankingTable(s);
  const [tab, setTab] = useState<'record' | 'rank' | 'title'>('record');
  const toggleTitle = (id: string) =>
    mutate((st) => {
      const eq = st.tower.equipped;
      if (eq.includes(id)) st.tower.equipped = eq.filter((x) => x !== id);
      else if (eq.length < MAX_EQUIPPED_TITLES) eq.push(id);
    });
  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        {(['record', 'rank', 'title'] as const).map((t) => (
          <button key={t} className={`small ${tab === t ? 'primary' : ''}`} onClick={() => setTab(t)}>
            {{ record: '등반 기록', rank: '랭킹', title: '칭호·유물' }[t]}
          </button>
        ))}
      </div>
      {tab === 'record' && (
        <div>
          <div className="card">
            최고 기록 <b>{s.tower.record}층</b> · 협회 {rankOf(s.tower.record)}등급
            {s.tower.rootRecord > 0 && <div>역탑 기록 B{s.tower.rootRecord}</div>}
            {s.tower.endlessRecord > 0 && <div>무한층 기록 {s.tower.endlessRecord}층</div>}
            <div className="muted" style={{ fontSize: 12 }}>
              다음 층: {floorLabel(Math.min(50, s.tower.record + 1))} · {zoneOf(Math.min(50, s.tower.record + 1)).name}
            </div>
          </div>
          {ZONES.map((z) => (
            <div key={z.id} className="card" style={{ opacity: s.tower.record + 1 >= z.from ? 1 : 0.45 }}>
              <b>
                구간 {z.id} {z.name}
              </b>{' '}
              <span className="muted">
                {z.from}~{z.to}층
              </span>
              <Bar value={Math.max(0, Math.min(z.to, s.tower.record) - z.from + 1)} max={z.to - z.from + 1} />
              <div className="muted" style={{ fontSize: 12 }}>
                {z.village ? `마을: ${z.village.floor}층 「${z.village.name}」 · ` : ''}
                시련:{' '}
                {Object.values(TRIALS)
                  .filter((t) => t.floor >= z.from && t.floor <= z.to)
                  .map((t) => `${t.floor}층 ${t.name}${s.tower.clearedTrials.includes(t.floor) ? ' ✓' : ''}`)
                  .join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'rank' && (
        <div>
          {rows.map((r, i) => (
            <div key={r.name} className="row" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)', fontWeight: r.mine ? 700 : 400, color: r.mine ? 'var(--accent2)' : undefined }}>
              <span style={{ width: 24 }}>{i + 1}</span>
              <span className="grow">{r.name} 길드</span>
              <span>{r.floor}층</span>
            </div>
          ))}
        </div>
      )}
      {tab === 'title' && (
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
            칭호는 {MAX_EQUIPPED_TITLES}개까지 장착할 수 있습니다.
          </div>
          {TITLES.map((t) => {
            const owned = s.tower.titles.includes(t.id);
            const on = s.tower.equipped.includes(t.id);
            return (
              <div key={t.id} className="card" style={{ opacity: owned ? 1 : 0.45 }}>
                <div className="row">
                  <b className="grow">「{owned ? t.name : '???'}」</b>
                  {owned && (
                    <button className={`small ${on ? 'primary' : ''}`} onClick={() => toggleTitle(t.id)}>
                      {on ? '장착 중' : '장착'}
                    </button>
                  )}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {t.condText} · {t.effectText}
                </div>
              </div>
            );
          })}
          <h4>유물</h4>
          {s.tower.relics.length === 0 && <div className="muted">아직 없음. 층 특전이나 히든 노드에서 얻습니다.</div>}
          {s.tower.relics.map((r) => (
            <div key={r} className="card">
              <b>{RELICS[r].name}</b> <span className="muted">{RELICS[r].desc}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GuildApp() {
  const s = useGame((g) => g.state);
  return (
    <div>
      {recruitedIds(s).map((c) => {
        const m = s.members[c];
        const d = CHARACTERS[c];
        const st = memberStats(s, c);
        const next = m.stage < 5 ? STAGE_THRESHOLDS[m.stage + 1] : null;
        return (
          <div key={c} className="card">
            <div className="row">
              <CharDot id={c} />
              <b className="grow">
                {d.name} <span className="muted">({d.age})</span>
              </b>
              <span className="tag">{m.personalTrialCleared ? d.awakenedClass : d.className}</span>
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {m.combatant ? `Lv${m.level} (EXP ${m.exp}/${expToNext(m.level)}) · ` : '비전투 · '}
              HP {st.hp} · MP {st.mp} · 공 {st.atk} · 마 {st.mag} · 방 {st.def} · 속 {st.spd} · 접객 {st.chm}
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              💗 {STAGE_NAMES[m.stage]} (링크 Lv{m.stage}) · 호감 {Math.floor(m.affection)}
              {next ? ` / 다음 단계 ${next}` : ''} · 호칭 「{callName(c, m.stage)}」
            </div>
            <Bar value={m.affection} max={1000} kind="aff" />
            {m.stage >= 4 && (
              <div style={{ fontSize: 12 }}>
                친밀 {m.intimacy}/100 <Bar value={m.intimacy} max={100} kind="link" />
              </div>
            )}
            {m.stage >= 3 && (
              <div className="muted" style={{ fontSize: 12 }}>
                개인 시련 「{d.personalTrialName}」 ({d.personalTrialFloor}층 히든): {m.personalTrialCleared ? '클리어 ✓' : '미클리어 — 이 멤버를 파티에 넣고 해당 층에 가면 나타납니다'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FacilityApp() {
  const s = useGame((g) => g.state);
  return (
    <div>
      {s.guild.construction && (
        <div className="card warn">
          🏗 {FACILITIES[s.guild.construction.id].name} Lv{s.guild.construction.targetLevel} 공사 중 — {s.guild.construction.daysLeft}일 남음
        </div>
      )}
      {FACILITY_ORDER.map((id) => {
        const f = FACILITIES[id];
        const lv = s.guild.facilities[id];
        const chk = canBuild(s, id);
        return (
          <div key={id} className="card">
            <div className="row">
              <b className="grow">
                {f.name} <span className="muted">Lv{lv}/{f.maxLevel} · {f.location}</span>
              </b>
              {lv < f.maxLevel && (
                <button
                  className="small"
                  disabled={!chk.ok}
                  onClick={() => {
                    mutate((st) => startBuild(st, id));
                    popup('공사 시작', [`${f.name} Lv${lv + 1} 공사를 시작했다. (${chk.cost!.days}일)`]);
                  }}
                >
                  {lv === 0 ? '건설' : '증축'}
                </button>
              )}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              현재: {f.effect(lv)}
              {chk.cost && (
                <>
                  <br />
                  다음: {f.effect(lv + 1)} — {won(chk.cost.funds)} + 마석 {chk.cost.stones} · {chk.cost.days}일
                  {!chk.ok && <span className="bad"> ({chk.reason})</span>}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BankApp() {
  const s = useGame((g) => g.state);
  const ch = dateInfo(s.time.day).chapter;
  const t = quarterTarget(ch);
  const cost = weeklyCosts(s);
  const [sell, setSell] = useState(0);
  return (
    <div>
      <div className="card">
        <div>
          잔고 <b>{won(s.guild.funds)}</b>
        </div>
        <div>
          남은 빚 <b className="bad">{won(s.guild.debt)}</b> · 상환 누계 {won(s.guild.repaid)}
        </div>
        <div style={{ marginTop: 6 }}>
          이번 분기 목표 (Ch{ch}): 상환 누계 {won(t.repaid)}
          <Bar value={s.guild.repaid} max={t.repaid} />
          최고 층 {s.tower.record} / {t.floorLabel}
          <Bar value={s.tower.record} max={t.floor} kind="time" />
        </div>
      </div>
      <div className="card">
        <b>상환</b>
        <div className="row" style={{ marginTop: 6 }}>
          {[1_000_000, 10_000_000, 50_000_000].map((v) => (
            <button
              key={v}
              className="small"
              disabled={s.guild.funds <= 0 || s.guild.debt <= 0}
              onClick={() => {
                const paid = mutate((st) => repay(st, v));
                popup('상환', [`${won(paid)} 상환했다.`]);
              }}
            >
              {won(v)}
            </button>
          ))}
          <button
            className="small"
            disabled={s.guild.funds <= 0 || s.guild.debt <= 0}
            onClick={() => {
              const paid = mutate((st) => repay(st, st.guild.funds));
              popup('상환', [`${won(paid)} 상환했다.`]);
            }}
          >
            전액
          </button>
        </div>
      </div>
      <div className="card">
        <b>마석 매각</b> <span className="muted">보유 {s.guild.stones}개 · 이번 주 시세 {won(s.guild.stonePrice)}</span>
        <div className="row" style={{ marginTop: 6 }}>
          <input type="number" min={0} max={s.guild.stones} value={sell} onChange={(e) => setSell(Number(e.target.value))} style={{ width: 90 }} />
          <button
            className="small"
            disabled={sell <= 0}
            onClick={() => {
              const w = mutate((st) => sellStones(st, sell));
              setSell(0);
              popup('마석 매각', [`+${won(w)}`]);
            }}
          >
            매각
          </button>
          <button
            className="small"
            disabled={s.guild.stones <= 0}
            onClick={() => {
              const w = mutate((st) => sellStones(st, st.guild.stones));
              popup('마석 매각', [`전부 매각 +${won(w)}`]);
            }}
          >
            전부
          </button>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          마석은 시설 건설 재료로도 씁니다. 시세는 매주 바뀝니다.
        </div>
      </div>
      <div className="card muted" style={{ fontSize: 13 }}>
        주간 지출 예정: 급여 {won(cost.salaries)} · 유지비 {won(cost.upkeep)} · 이자 {won(cost.interest)} = <b>{won(cost.total)}</b>
        <br />
        누적 카페 순익 {won(s.guild.cafeTotal)}
      </div>
    </div>
  );
}

function ShopApp() {
  const s = useGame((g) => g.state);
  const buy = (id: string) =>
    mutate((st) => {
      const it = ITEMS[id];
      if (st.guild.funds < it.price) return;
      st.guild.funds -= it.price;
      st.inventory[id] = (st.inventory[id] ?? 0) + 1;
    });
  const section = (ids: string[], title: string) => (
    <>
      <h4>{title}</h4>
      {ids.map((id) => (
        <div key={id} className="row card" style={{ padding: 8 }}>
          <span className="grow">
            <b>{ITEMS[id].name}</b> <span className="muted" style={{ fontSize: 12 }}>{ITEMS[id].desc}</span>
            <div className="muted" style={{ fontSize: 12 }}>보유 {s.inventory[id] ?? 0}</div>
          </span>
          <button className="small" disabled={s.guild.funds < ITEMS[id].price} onClick={() => buy(id)}>
            {won(ITEMS[id].price)}
          </button>
        </div>
      ))}
    </>
  );
  return (
    <div>
      {section(CONSUMABLE_IDS, '소모품')}
      {section(GIFT_IDS, '선물')}
    </div>
  );
}

function NotebookApp() {
  const s = useGame((g) => g.state);
  return (
    <div>
      {recruitedIds(s).map((c) => {
        const d = CHARACTERS[c];
        const m = s.members[c];
        const name = (id: string) => ITEMS[id]?.name ?? PLACE_MAP[id]?.name ?? id;
        return (
          <div key={c} className="card">
            <div className="row">
              <CharDot id={c} />
              <b>{d.name}</b>
              <span className="muted">
                {d.age} · {d.className} ({d.role})
              </span>
            </div>
            <div style={{ fontSize: 13, margin: '4px 0' }}>{d.profile}</div>
            <div style={{ fontSize: 12 }}>
              ❤ 좋아함: {m.knownLikes.length ? m.knownLikes.map(name).join(', ') : '???'}
            </div>
            <div style={{ fontSize: 12 }}>
              ✕ 싫어함: {m.knownDislikes.length ? m.knownDislikes.map(name).join(', ') : '???'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AlbumApp() {
  const s = useGame((g) => g.state);
  const seen = s.seenScenes.filter((id) => SCENES[id]);
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
        회상: 본 장면을 다시 볼 수 있습니다 ({seen.length}/{Object.keys(SCENES).length})
      </div>
      {seen.map((id) => (
        <div key={id} className="row card" style={{ padding: 8 }}>
          <span className="grow">
            {id.startsWith('ending_') ? endingLabel(id.replace('ending_', '')) : id}{' '}
            {SCENES[id].rating !== 'all' && <span className="tag">{SCENES[id].rating.toUpperCase()}</span>}
          </span>
          <button className="small" onClick={() => replayScene(id)}>
            보기
          </button>
        </div>
      ))}
    </div>
  );
}

function SettingsApp() {
  const s = useGame((g) => g.state);
  const mode = useGame((g) => g.mode);
  const [, force] = useState(0);
  return (
    <div>
      <h4>세이브 / 로드</h4>
      {SLOTS.map((slot) => {
        const info = slotInfo(slot);
        return (
          <div key={slot} className="row card" style={{ padding: 8 }}>
            <span className="grow">
              <b>{SLOT_LABEL[slot]}</b>
              <div className="muted" style={{ fontSize: 12 }}>
                {info ? `${info.summary} · ${new Date(info.savedAt).toLocaleString()}` : '비어 있음'}
              </div>
            </span>
            {slot !== 'auto' && (
              <button
                className="small"
                disabled={mode !== 'hub'}
                onClick={() => {
                  saveGame(slot);
                  force((n) => n + 1);
                }}
              >
                저장
              </button>
            )}
            <button className="small" disabled={!info} onClick={() => loadGame(slot)}>
              불러오기
            </button>
          </div>
        );
      })}
      <h4>설정</h4>
      <div className="card">
        {ADULT_BUILD ? (
          <label className="row">
            <input
              type="checkbox"
              checked={s.settings.adult}
              onChange={(e) =>
                mutate((st) => {
                  st.settings.adult = e.target.checked;
                })
              }
            />
            성인 콘텐츠 표시
          </label>
        ) : (
          <div className="muted" style={{ fontSize: 13 }}>
            전연령 빌드입니다. 성인 씬은 대체 연출로 표시됩니다. (성인 빌드: <code>npm run dev:adult</code>)
          </div>
        )}
      </div>
      <button onClick={toTitle}>타이틀로</button>
    </div>
  );
}
