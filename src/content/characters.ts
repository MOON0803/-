import type { CharId, Stats } from '../core/types';

export interface CharDef {
  id: CharId;
  name: string;
  short: string;
  age: string;
  className: string;
  awakenedClass: string;
  role: string;
  color: { hair: string; eye: string; accent: string };
  base: Stats;
  growth: Stats;
  /** 크리티컬 기본 확률 */
  crit: number;
  skills: string[];
  burst: string;
  joinLevel: number;
  weeklySalary: number;
  likes: string[];
  dislikes: string[];
  likedPlaces: string[];
  dislikedPlaces: string[];
  /** 관계 단계별 주인공 호칭 (0~5) */
  callsPlayer: [string, string, string, string, string, string];
  personalTrialFloor: number;
  personalTrialName: string;
  profile: string;
  /** 단계 이벤트를 따로 쓰지 않은 캐릭터용 짧은 대사 (템플릿 씬에서 사용) */
  lines: {
    talk: string[];
    night: string[];
  };
}

export const PROTAGONIST = {
  defaultName: '강도연',
  age: 30,
  color: { hair: '#1d1b22', eye: '#8a6cff', accent: '#6b5cd6' },
};

export const CHARACTERS: Record<CharId, CharDef> = {
  harin: {
    id: 'harin',
    name: '서하린',
    short: '하린',
    age: '27',
    className: '가디언',
    awakenedClass: '이지스',
    role: '탱커',
    color: { hair: '#d9dde6', eye: '#4c7bd9', accent: '#5b84c4' },
    base: { hp: 130, mp: 20, atk: 11, mag: 4, def: 14, spd: 8, chm: 6 },
    growth: { hp: 15, mp: 2, atk: 1.8, mag: 0.4, def: 2.2, spd: 0.5, chm: 0.2 },
    crit: 0.05,
    skills: ['shield_bash', 'taunt', 'guard_all'],
    burst: 'burst_aegis',
    joinLevel: 1,
    weeklySalary: 300_000,
    likes: ['protein_bar', 'ramen_set'],
    dislikes: ['perfume'],
    likedPlaces: ['euljiro', 'hangang'],
    dislikedPlaces: ['amusement'],
    callsPlayer: ['길드장', '길드장', '길드장', '길드장', '언니', '언니'],
    personalTrialFloor: 13,
    personalTrialName: '무너지는 다리',
    profile: '전 블랙스완 에이스 탱커. 29층에서 동료를 지키다 다쳐 방출됐다. 말수가 적고 요리는 재앙 수준.',
    lines: {
      talk: ['……라면 먹을래? 내가 끓이는 건 아니고.', '오늘 훈련, 같이 봐 줄 거지.', '길드장은 안 지쳐? 맨날 웃고 있네.'],
      night: ['잠이 안 와. ……옆에 좀 있어도 돼?', '방패 닦고 있었어. 이상하게 마음이 편해져.'],
    },
  },
  chaea: {
    id: 'chaea',
    name: '윤채아',
    short: '채아',
    age: '23',
    className: '건슬링어',
    awakenedClass: '스타 슈터',
    role: '속공 딜러',
    color: { hair: '#ff8fb1', eye: '#ffb347', accent: '#ff6f91' },
    base: { hp: 85, mp: 25, atk: 14, mag: 5, def: 7, spd: 14, chm: 16 },
    growth: { hp: 9, mp: 2.5, atk: 2.3, mag: 0.6, def: 0.9, spd: 1.1, chm: 0.4 },
    crit: 0.12,
    skills: ['rapid_fire', 'headshot', 'smoke'],
    burst: 'burst_fullfire',
    joinLevel: 1,
    weeklySalary: 250_000,
    likes: ['gift_card', 'game_console'],
    dislikes: ['flowers'],
    likedPlaces: ['hongdae', 'amusement'],
    dislikedPlaces: ['euljiro'],
    callsPlayer: ['사장님', '사장님', '사장님', '도연 언니', '도연 언니', '도연 언니'],
    personalTrialFloor: 17,
    personalTrialName: '생방송 중 사고',
    profile: '늦깎이 각성자. 편의점·배달 알바 N잡러 출신. 꿈은 등반 중계 스트리머. 돈 이야기에 눈이 반짝인다.',
    lines: {
      talk: ['사장님! 오늘 카페 팁 대박이었어요. 반띵?', '구독자 10만 되면 사장님 얼굴 공개해도 돼요?', '탑 올라갈 때 사장님 목소리 들리면 이상하게 안 무서워요.'],
      night: ['언니, 자요? ……안 자는 거 알아요.', '오늘 방송 다시보기 같이 봐요. 제 헤드샷 각도 미쳤거든요.'],
    },
  },
  seoyun: {
    id: 'seoyun',
    name: '한서윤',
    short: '서윤',
    age: '32',
    className: '힐러',
    awakenedClass: '세인트',
    role: '힐러 / 버퍼',
    color: { hair: '#7a4e3a', eye: '#58a36b', accent: '#6fbf8a' },
    base: { hp: 88, mp: 45, atk: 6, mag: 13, def: 8, spd: 10, chm: 13 },
    growth: { hp: 9.5, mp: 4, atk: 0.6, mag: 2.1, def: 1, spd: 0.7, chm: 0.3 },
    crit: 0.05,
    skills: ['heal', 'bless', 'mass_heal'],
    burst: 'burst_vow',
    joinLevel: 9,
    weeklySalary: 350_000,
    likes: ['wine', 'bath_salt'],
    dislikes: ['game_console'],
    likedPlaces: ['seongsu', 'hangang'],
    dislikedPlaces: ['hongdae'],
    callsPlayer: ['도연 씨', '도연 씨', '도연 씨', '도연 씨', '도연아', '도연아'],
    personalTrialFloor: 23,
    personalTrialName: '구하지 못한 사람',
    profile: '응급실 간호사 출신 힐러. 11층 마을 「첫 등불」에서 등반자 진료소를 하고 있었다. 술이 들어가면 대담해진다.',
    lines: {
      talk: ['또 무리했죠? 손 줘 봐요.', '도연 씨는 남 챙기느라 자기는 안 챙기더라.', '오늘은 와인 한 잔만. 진짜 한 잔만.'],
      night: ['잠 안 오면 따뜻한 거 마실래요? 아, 술 말고.', '……오늘은 내가 기대도 돼요?'],
    },
  },
  ria: {
    id: 'ria',
    name: '리아',
    short: '리아',
    age: '성인 (엘프)',
    className: '엘리멘탈리스트',
    awakenedClass: '아크메이지',
    role: '광역 마법',
    color: { hair: '#9be7c4', eye: '#e8c26b', accent: '#5fd3a5' },
    base: { hp: 72, mp: 60, atk: 4, mag: 18, def: 6, spd: 11, chm: 10 },
    growth: { hp: 8, mp: 4.5, atk: 0.4, mag: 2.6, def: 0.8, spd: 0.8, chm: 0.3 },
    crit: 0.08,
    skills: ['fireball', 'chain_lightning', 'ice_lance'],
    burst: 'burst_elements',
    joinLevel: 17,
    weeklySalary: 300_000,
    likes: ['dessert', 'gadget'],
    dislikes: ['ramen_set'],
    likedPlaces: ['seongsu', 'namsan'],
    dislikedPlaces: [],
    callsPlayer: ['계약자', '계약자', '계약자', '도연', '도연', '도연'],
    personalTrialFloor: 28,
    personalTrialName: '잠든 고향',
    profile: '20층 봉인된 방에서 잠들어 있던 엘프. 탑의 문자를 읽을 수 있다. 편의점 디저트와 배달 앱에 빠르게 중독되는 중.',
    lines: {
      talk: ['계약자여, 이 "푸딩"이라는 것은 신의 음식인가?', '탑의 문자는 노래에 가깝다. 언젠가 들려주지.', '배달 앱에 별점 5개를 주었다. 나는 공정하다.'],
      night: ['이 세계의 밤은 시끄럽고 따뜻하구나.', '잠들기 전에 이야기를 해 다오. 그대의 이야기를.'],
    },
  },
  daeun: {
    id: 'daeun',
    name: '정다은',
    short: '다은',
    age: '31',
    className: '스카우터',
    awakenedClass: '섀도 애널리스트',
    role: '디버퍼',
    color: { hair: '#2c2f3a', eye: '#c94f4f', accent: '#b5485a' },
    base: { hp: 86, mp: 35, atk: 11, mag: 10, def: 8, spd: 15, chm: 12 },
    growth: { hp: 9, mp: 3, atk: 1.6, mag: 1.4, def: 1, spd: 1.1, chm: 0.3 },
    crit: 0.1,
    skills: ['analyze', 'poison_needle', 'disrupt'],
    burst: 'burst_full_analysis',
    joinLevel: 26,
    weeklySalary: 0,
    likes: ['stationery', 'coffee_beans'],
    dislikes: ['gift_card'],
    likedPlaces: ['seongsu', 'cheonggye'],
    dislikedPlaces: ['amusement'],
    callsPlayer: ['강 길드장', '강 길드장', '강 길드장', '도연', '도연', '도연'],
    personalTrialFloor: 33,
    personalTrialName: '협회의 서류철',
    profile: '선대의 비서이자 현 사무장 겸 카페 매니저. 길드 재정을 쥐고 있다. 과거는 잘 말하지 않는다.',
    lines: {
      talk: ['이번 주 지출 보고서야. 표정 관리 해.', '커피는 내가 내릴게. 길드장이 내리면 원가가 올라가.', '……선대도 그렇게 웃었어. 무리할 때.'],
      night: ['장부가 안 맞아서. ……아니, 그냥 핑계야.', '오늘은 일 얘기 안 할게. 노력해 볼게.'],
    },
  },
  doha: {
    id: 'doha',
    name: '은도하',
    short: '도하',
    age: '26',
    className: '스위퍼',
    awakenedClass: '나이트폴',
    role: '암살 / 치명타',
    color: { hair: '#3b4a8c', eye: '#d0d6e8', accent: '#4a5fbf' },
    base: { hp: 95, mp: 30, atk: 19, mag: 6, def: 9, spd: 17, chm: 7 },
    growth: { hp: 9.5, mp: 2.5, atk: 2.6, mag: 0.5, def: 1, spd: 1.2, chm: 0.2 },
    crit: 0.22,
    skills: ['ambush', 'flurry', 'vanish'],
    burst: 'burst_nightfall',
    joinLevel: 30,
    weeklySalary: 500_000,
    likes: ['plush', 'protein_bar'],
    dislikes: ['wine'],
    likedPlaces: ['amusement', 'cheonggye'],
    dislikedPlaces: ['hongdae'],
    callsPlayer: ['강도연', '강도연', '강도연', '강도연', '언니', '언니'],
    personalTrialFloor: 38,
    personalTrialName: '산왕의 그림자',
    profile: '산왕 길드의 에이스. 35층의 벽 앞에서 3년을 보냈다. 무표정하지만 지는 걸 극도로 싫어한다.',
    lines: {
      talk: ['……이겼어. 그러니까 칭찬해.', '산왕은 강해. 근데 거긴 아무도 손을 안 잡아.', '인형? ……딱히 좋아하는 건 아니야. 가져갈게.'],
      night: ['잠깐만 있어. 말 안 해도 돼.', '강도연. ……아니, 그냥 불러 봤어.'],
    },
  },
};

export const STAGE_NAMES = ['서먹', '동료', '친구', '썸', '연인', '반려'];
export const STAGE_THRESHOLDS = [0, 100, 250, 450, 700, 950];

export function callName(id: CharId, stage: number): string {
  return CHARACTERS[id].callsPlayer[Math.max(0, Math.min(5, stage))];
}
