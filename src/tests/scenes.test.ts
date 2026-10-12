import { describe, expect, it } from 'vitest';
import { SCENES } from '../content/scenes';
import { EVENTS } from '../content/events';
import { createInitialState } from '../core/state';
import { parseScn, runSceneHeadless } from '../systems/scene';

describe('scn parser', () => {
  it('parses speakers, commands and nested choices', () => {
    const [sc] = parseScn(`# scene: t1   rating: r18
[bg room] [show harin casual smile]
하린: 안녕.
{player}: 응.
나레이션 한 줄.
[choice]
  * "A"
    [aff harin +5]
    하린: A!
  * "B"
    하린: B!
[stage harin 2]`);
    expect(sc.id).toBe('t1');
    expect(sc.rating).toBe('r18');
    expect(sc.body.map((n) => n.t)).toEqual(['cmd', 'cmd', 'say', 'say', 'say', 'choice', 'cmd']);
    const choice = sc.body[5];
    expect(choice.t === 'choice' && choice.options.map((o) => o.text)).toEqual(['A', 'B']);
    expect(choice.t === 'choice' && choice.options[0].body.length).toBe(2);
  });

  it('every event points to an existing scene', () => {
    const missing = EVENTS.filter((e) => !SCENES[e.scene]).map((e) => e.scene);
    expect(missing).toEqual([]);
  });

  it('every scene runs headless without throwing', () => {
    for (const sc of Object.values(SCENES)) {
      const s = createInitialState('테스트', 1);
      const rt = runSceneHeadless(s, sc);
      expect(rt.done, sc.id).toBe(true);
    }
  });

  it('intro recruits harin and sets her stage', () => {
    const s = createInitialState('도연', 1);
    runSceneHeadless(s, SCENES.intro);
    expect(s.members.harin.recruited).toBe(true);
    expect(s.members.harin.stage).toBeGreaterThanOrEqual(1);
  });

  it('r18 scene is faded in all-ages mode but still applies commands', () => {
    const s = createInitialState('도연', 1);
    s.members.harin.stage = 4;
    const rt = runSceneHeadless(s, SCENES.harin_r18_01, false);
    expect(rt.faded).toBe(true);
    expect(s.members.harin.intimacy).toBeGreaterThan(0);
    expect(rt.history.some((h) => h.text.includes('성인 콘텐츠 OFF'))).toBe(true);
  });
});
