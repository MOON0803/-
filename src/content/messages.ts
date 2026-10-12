import type { CharId, MessageReply } from '../core/types';

export interface MessageTemplate {
  id: string;
  from: CharId;
  minStage: number;
  text: string;
  replies: MessageReply[];
}

const M = (id: string, from: CharId, minStage: number, text: string, replies: MessageReply[]): MessageTemplate => ({
  id,
  from,
  minStage,
  text,
  replies,
});

export const MESSAGES: MessageTemplate[] = [
  M('harin_1', 'harin', 1, '길드장. 냉장고에 있는 라면 내 거 아니야. 진짜로.', [
    { text: '알았어 ㅋㅋ 근데 국물 자국은?', aff: 6, response: '……그건 내 거 맞아.' },
    { text: '응 내가 먹을게', aff: 2, response: '…….' },
  ]),
  M('harin_2', 'harin', 2, '내일 몇 시에 탑 가? 몸 풀고 있을게.', [
    { text: '오전에! 같이 스트레칭 해', aff: 8, response: '응. 늦지 마.' },
    { text: '내일은 쉬자', aff: 3, response: '……그래. 그럼 라면.' },
  ]),
  M('harin_3', 'harin', 3, '옥상에서 탑 보이는데. 오늘따라 밝네. 보러 올래?', [
    { text: '지금 갈게', aff: 10, response: '담요 가져와. 두 개 말고 하나.' },
    { text: '피곤해서 먼저 잘게', aff: 1, response: '응. 잘 자, 길드장.' },
  ]),
  M('harin_4', 'harin', 4, '언니. 자?', [
    { text: '안 자. 왜?', aff: 8, response: '그냥. 목소리 듣고 싶어서. ……됐어 이제 자.' },
    { text: '하린이 생각하느라 못 자', aff: 12, response: '……그런 말 하지 마. 잠 못 자잖아.' },
  ]),
  M('chaea_1', 'chaea', 1, '사장님!! 오늘 카페 팁통에 오만원권 들어있었어요 ㄷㄷ', [
    { text: '오 대박. 반띵?', aff: 4, response: '아 그건 좀;; 3:7 어때요 제가 7' },
    { text: '채아 덕분이네. 다 가져', aff: 8, response: '사장님 사랑해요 (사업적 의미)' },
  ]),
  M('chaea_2', 'chaea', 2, '등반 중계 썸네일 골라주세요 1번 2번', [
    { text: '1번! 표정이 귀여워', aff: 8, response: '역시 사장님 안목 ㅋㅋ 1번 갑니다' },
    { text: '둘 다 별론데', aff: -2, response: '……사장님 미워요 (진심 아님)' },
  ]),
  M('chaea_3', 'chaea', 3, '언니 혹시 내일 오후 시간 돼요? 그냥요. 그냥 물어본 거예요.', [
    { text: '채아한테는 항상 시간 있지', aff: 10, response: '헐. 녹음해둘 걸.' },
    { text: '무슨 일 있어?', aff: 5, response: '아니 그냥… 놀자고요! 놀자고!' },
  ]),
  M('chaea_4', 'chaea', 4, '언니 방송 끝났어요. 이제 언니 차례예요.', [
    { text: '무슨 차례?', aff: 6, response: '나랑 놀아줄 차례요. 문 열어요 ㅎㅎ' },
    { text: '지금 갈게', aff: 10, response: '빨리요. 3분 지나면 삐짐.' },
  ]),
  M('seoyun_1', 'seoyun', 1, '도연 씨, 오늘 등반하고 어깨 안 아팠어요? 파스 문 앞에 두고 갈게요.', [
    { text: '고마워요 서윤 씨', aff: 7, response: '고마우면 오늘은 일찍 자요.' },
    { text: '괜찮아요!', aff: 3, response: '괜찮다는 사람이 제일 안 괜찮더라.' },
  ]),
  M('seoyun_2', 'seoyun', 2, '와인 한 병이 남았는데 혼자 마시긴 아깝네요.', [
    { text: '잔 두 개 들고 갈게요', aff: 9, response: '안주는 내가 할게요.' },
    { text: '내일 탑 가야 해서요', aff: 3, response: '모범생이네. 다음에 꼭이에요.' },
  ]),
  M('seoyun_4', 'seoyun', 4, '도연아. 보고 싶다는 말은 문자로 하는 거 아니지?', [
    { text: '지금 갈게', aff: 10, response: '문 열어둘게.' },
    { text: '나도 보고 싶어', aff: 8, response: '그럼 와서 말해.' },
  ]),
  M('ria_1', 'ria', 1, '계약자여. 이 "배달 앱"이라는 것이 나에게 쿠폰을 주었다. 이것은 호의인가 함정인가.', [
    { text: '호의야. 써도 돼', aff: 6, response: '그렇다면 떡볶이를 주문하겠다. 맵기는 "보통"으로.' },
    { text: '함정이야', aff: 4, response: '역시. 이 세계는 방심할 수 없군.' },
  ]),
  M('ria_3', 'ria', 3, '탑의 문자 중에 "함께"라는 단어가 유난히 많다. 그대에게 알려주고 싶었다.', [
    { text: '리아랑 같이 읽고 싶어', aff: 10, response: '……그렇다면 내일, 옥상에서.' },
    { text: '신기하다', aff: 5, response: '그렇지. 신기한 탑이다.' },
  ]),
  M('daeun_1', 'daeun', 1, '이번 주 지출 보고. 라면이 왜 이렇게 많아.', [
    { text: '하린이가…', aff: 5, response: '알아. 그냥 말해본 거야.' },
    { text: '복지야', aff: 7, response: '……복지 예산으로 잡아둘게.' },
  ]),
  M('daeun_3', 'daeun', 3, '장부 다 맞췄어. 이상하게 너한테 제일 먼저 말하고 싶었어.', [
    { text: '수고했어, 다은', aff: 10, response: '……그 말 듣고 싶었나 봐.' },
    { text: '역시 사무장님', aff: 5, response: '사무장님 말고.' },
  ]),
  M('doha_3', 'doha', 3, '강도연. 내일 훈련 상대 해.', [
    { text: '좋아. 지면 밥 사', aff: 9, response: '안 져.' },
    { text: '나 못 싸우잖아', aff: 4, response: '알아. 그냥 와서 보라고.' },
  ]),
  M('doha_4', 'doha', 4, '언니. ……불러 봤어.', [
    { text: '응, 도하야', aff: 10, response: '……됐어. 잘 자.' },
    { text: '왜 불렀어?', aff: 6, response: '이유 있어야 돼?' },
  ]),
];
