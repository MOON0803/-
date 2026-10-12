import { CHAR_IDS, type CharId } from '../core/types';
import { CHARACTERS, STAGE_NAMES } from './characters';

/**
 * 아직 개별 시나리오를 쓰지 않은 씬을 만드는 템플릿.
 * .scn 파일에 같은 id 의 씬이 있으면 그쪽이 우선한다 (src/content/scenes/index.ts).
 */

interface RomanceLines {
  bg: string;
  s2: string[];
  s3: string[];
  s4: string[];
  s5: string[];
  ending: string;
}

const ROMANCE: Record<Exclude<CharId, 'harin' | 'chaea'>, RomanceLines> = {
  seoyun: {
    bg: 'dorm_night',
    s2: ['서윤: 도연 씨, 이 시간에 웬일이에요. ……와인 따 놨는데, 마침 잘 왔네.', '서윤: 병원에선 늘 누가 떠나는 걸 봤거든요. 여기선 다들 돌아와서 좋아요.'],
    s3: ['서윤: 오늘은 내가 치료받고 싶은 날이에요.', '서윤: ……도연 씨 옆에 있으면, 나도 기대도 되는 사람 같아서.'],
    s4: ['서윤: 도연아. 반말해도 돼? 이제 존댓말이 너무 멀어서.', '서윤: 좋아해. 술김 아니고, 맨정신으로.'],
    s5: ['서윤: 응급실에서 보호자 칸이 비어 있는 게 제일 무서웠어.', '서윤: 내 칸에, 네 이름 써도 돼?'],
    ending: '서윤: 다녀왔어? 오늘은 다친 데 없네. ……그래도 손은 줘 봐.',
  },
  ria: {
    bg: 'rooftop_night',
    s2: ['리아: 계약자. 이 "치킨"이라는 것을 같이 먹자. 혼자 먹으면 맛이 반이다.', '리아: 내 세계에는 "같이 먹는다"는 말이 없었다. 다들 혼자 오래 살았으니.'],
    s3: ['리아: 탑의 문자 중에 아직 읽지 못한 게 하나 있다.', '리아: ……그대 옆에 있으면 그 글자가 따뜻해진다. 이상한 일이다.'],
    s4: ['리아: 도연. 이제 계약자라 부르지 않겠다.', '리아: 천 년을 잠들어 있었던 건, 그대를 만나기 위해서였다고 믿기로 했다.'],
    s5: ['리아: 이 세계의 "동반자 등록"이라는 것은, 영원을 약속하는 의식인가?', '리아: 그렇다면 나는, 그대에게 영원을 주겠다.'],
    ending: '리아: 오늘의 디저트는 그대가 골라라. 나는 그대가 고른 것이 좋다.',
  },
  daeun: {
    bg: 'office_night',
    s2: ['다은: 장부 마감했어. ……같이 커피 마실래? 계산은 내가.', '다은: 선대가 너 얘기 자주 했어. 웃는 게 제일 위험한 애라고.'],
    s3: ['다은: 이번 분기 지출 중에 하나 빼먹었어. 네 생일 선물.', '다은: ……정확히는, 안 빼먹었어. 일부러 따로 샀어.'],
    s4: ['다은: 도연. 나 계산 없는 거 처음 해 본다.', '다은: 좋아해. 손익 같은 건 안 따질게.'],
    s5: ['다은: 동반자 등록 서류, 내가 이미 다 써 놨어. 서명만 하면 돼.', '다은: ……이건 업무 아니야.'],
    ending: '다은: 이번 달도 흑자야. ……네 덕분이라고는 안 할 거야. 우리 덕분이지.',
  },
  doha: {
    bg: 'training_night',
    s2: ['도하: 강도연. 훈련 끝났어. 칭찬해.', '도하: 산왕에선 아무도 칭찬 안 했어. 이기는 게 당연했으니까.'],
    s3: ['도하: 요즘 지는 꿈을 안 꿔. ……대신 네 꿈을 꿔.', '도하: 이상하지. 이기는 것보다 이게 좋아.'],
    s4: ['도하: 언니.', '도하: ……이렇게 부르고 싶었어. 좋아해, 언니.'],
    s5: ['도하: 동반자 등록. 내가 먼저 하자고 할 거야. 이번엔 안 져.', '도하: 언니 옆자리, 아무한테도 안 줘.'],
    ending: '도하: 언니. 오늘도 이겼어. ……칭찬해.',
  },
};

function stageScene(c: CharId, stage: number, lines: string[], bg: string): string {
  const d = CHARACTERS[c];
  const expr = stage >= 4 ? 'blush' : stage === 3 ? 'smile' : 'neutral';
  return [
    `# scene: ${c}_stage${stage}   rating: all`,
    `[bg ${bg}]`,
    `[show ${c} casual ${expr}]`,
    ...lines,
    '[choice]',
    `  * "${stage >= 4 ? '나도 같은 마음이야.' : '고마워. 나도 좋아.'}"`,
    `    [aff ${c} +20]`,
    `  * "(조용히 고개를 끄덕인다)"`,
    `    [aff ${c} +15]`,
    `[stage ${c} ${stage}]`,
    `[sys ${d.name}와(과)의 관계가 「${STAGE_NAMES[stage]}」이(가) 되었습니다.]`,
  ].join('\n');
}

const R18_DESC = ['첫 밤', '장소 변형 (욕탕)', '캐릭터 고유 테마', '탑 마을 외박'];
const R18_BG = ['dorm_night', 'bath_night', 'dorm_night', 'village_inn'];

/**
 * 성인 씬 슬롯. 전연령 빌드(VITE_ADULT 미설정)에서는 본문 없이 명령만 남겨서
 * 번들에 성인 텍스트가 들어가지 않게 한다. 재생 시에는 대체(페이드) 연출이 나온다.
 */
function r18Slot(c: CharId, n: number): string {
  const body =
    import.meta.env.VITE_ADULT === 'true'
      ? [
          `[bg ${R18_BG[n - 1]}]`,
          `[show ${c} casual blush]`,
          `[sys R18 씬 슬롯 — ${c}_r18_0${n} · ${R18_DESC[n - 1]}]`,
          '(본문 미작성: 성인 빌드 전용 씬. 여기에 씬 스크립트와 CG가 들어간다.)',
        ]
      : [];
  return [`# scene: ${c}_r18_0${n}   rating: r18`, ...body, `[intim ${c} +10]`, `[aff ${c} +5]`].join('\n');
}

function nightRepeat(c: CharId): string {
  const body =
    import.meta.env.VITE_ADULT === 'true'
      ? ['[bg dorm_night]', `[show ${c} casual blush]`, `[sys R18 반복 씬 슬롯 — ${c}_night]`, '(본문 미작성: 친밀 상승용 짧은 밤 이벤트. 차분 CG 재사용.)']
      : [];
  return [`# scene: ${c}_night   rating: r18`, ...body, `[intim ${c} +6]`, `[aff ${c} +4]`].join('\n');
}

const MVP_ENDING: Record<'harin' | 'chaea', string> = {
  harin: '하린: 언니. 라면 끓였어. ……이번엔 진짜 내가 끓였어. 맛없어도 먹어.',
  chaea: '채아: 구독자 여러분, 오늘은 특별 게스트! 제 동반자요! ……언니 얼굴 가리지 마요!',
};

function endingLine(c: CharId): string {
  return c === 'harin' || c === 'chaea' ? MVP_ENDING[c] : ROMANCE[c].ending;
}

function heroineEnding(c: CharId, partner: boolean): string {
  const d = CHARACTERS[c];
  return [
    `# scene: ending_${partner ? 'partner' : 'lover'}_${c}`,
    '[bg rooftop_night]',
    `[show ${c} casual smile]`,
    partner
      ? `봄. 협회 창구에서 받은 동반자 등록증에는 두 사람의 이름이 나란히 적혀 있었다. ${d.name}, 그리고 {player}.`
      : `다시 봄. 옥상에서 보이는 백탑은 여전히 하얗고, 옆에는 ${d.name}이(가) 있다.`,
    endingLine(c),
    '{player}: 응. 오늘도, 내일도.',
    `[sys ${partner ? `${d.short} 반려 엔딩 — 동반자 등록` : `${d.short} 연인 엔딩 — 같은 창문`}]`,
  ].join('\n');
}

const COMMON_ENDINGS = `
# scene: ending_harem
[bg rooftop_night]
옥상에 평상이 하나 더 늘었다. 그래도 여섯 명이 앉기엔 좁다.
하린: 언니 옆자리 내 거야.
채아: 지난주에 하린 언니가 앉았잖아요! 순번제 해요, 순번제!
{player}: ……탑보다 이게 더 어렵네.
[sys 하렘 엔딩 — 모두의 탑]

# scene: ending_guild
[bg cafe_day]
카페 「여명」 벽에는 액자가 하나 걸렸다. "백탑 뿌리 공략 — 여명 길드".
다은: 빚 완납 확인서. 액자 옆에 같이 걸어 둘까?
{player}: 그건 선생님 사진 옆에 걸자.
[sys 길드 엔딩 — 여명]

# scene: ending_normal
[bg euljiro_morning]
1년이 지났다. 빚은 다 갚았지만, 탑의 끝은 아직 보지 못했다.
그래도 아침이면 카페 문을 열고, 오전이면 다시 탑에 오른다.
[sys 노멀 엔딩 — 다시, 봄]

# scene: ending_bad
[bg euljiro_night]
여명 빌딩 앞에 블랙스완 로고가 박힌 차가 섰다.
간판의 불이 꺼졌다. 백탑은 여전히 하얗게 빛나고 있었다.
[sys 배드 엔딩 — 꺼진 등불]
`;

export function templateScenes(): string {
  const parts: string[] = [COMMON_ENDINGS];
  for (const c of CHAR_IDS) {
    if (c !== 'harin' && c !== 'chaea') {
      const r = ROMANCE[c];
      parts.push(stageScene(c, 2, r.s2, r.bg), stageScene(c, 3, r.s3, r.bg), stageScene(c, 4, r.s4, r.bg), stageScene(c, 5, r.s5, r.bg));
    }
    for (let n = 1; n <= 4; n++) parts.push(r18Slot(c, n));
    parts.push(nightRepeat(c), heroineEnding(c, false), heroineEnding(c, true));
  }
  return parts.join('\n\n');
}
