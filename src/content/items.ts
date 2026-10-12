export interface ItemDef {
  id: string;
  name: string;
  kind: 'gift' | 'consumable';
  /** 원 단위 가격 (쇼핑 앱) */
  price: number;
  /** 탑 마을 가격 (마석) */
  stonePrice?: number;
  desc: string;
  use?: { healPct?: number; mpPct?: number; revivePct?: number; allies?: boolean };
}

const items: ItemDef[] = [
  { id: 'potion', name: '포션', kind: 'consumable', price: 30_000, stonePrice: 3, desc: '아군 1명 HP 40% 회복', use: { healPct: 0.4 } },
  { id: 'hi_potion', name: '하이 포션', kind: 'consumable', price: 80_000, stonePrice: 8, desc: '아군 1명 HP 80% 회복', use: { healPct: 0.8 } },
  { id: 'ether', name: '마나 포션', kind: 'consumable', price: 40_000, stonePrice: 4, desc: '아군 1명 MP 50% 회복', use: { mpPct: 0.5 } },
  { id: 'phoenix', name: '피닉스 깃털', kind: 'consumable', price: 150_000, stonePrice: 15, desc: '쓰러진 아군 1명을 HP 40%로 부활', use: { revivePct: 0.4 } },
  { id: 'protein_bar', name: '단백질바', kind: 'gift', price: 15_000, desc: '운동하는 사람의 친구' },
  { id: 'ramen_set', name: '라면 세트', kind: 'gift', price: 20_000, desc: '을지로 편의점 한정 5종 세트' },
  { id: 'gift_card', name: '상품권', kind: 'gift', price: 50_000, desc: '현금과 거의 같은 무언가' },
  { id: 'game_console', name: '게임기', kind: 'gift', price: 350_000, desc: '휴대용 최신 기종' },
  { id: 'flowers', name: '꽃다발', kind: 'gift', price: 40_000, desc: '계절 꽃으로 묶은 다발' },
  { id: 'wine', name: '와인', kind: 'gift', price: 60_000, desc: '향이 좋은 레드 와인' },
  { id: 'bath_salt', name: '입욕제', kind: 'gift', price: 30_000, desc: '라벤더 향 입욕제 세트' },
  { id: 'dessert', name: '편의점 디저트', kind: 'gift', price: 10_000, desc: '신상 푸딩과 롤케이크' },
  { id: 'gadget', name: '신기한 가전', kind: 'gift', price: 150_000, desc: '말하는 무드등. 왜 말을 하는지는 모른다' },
  { id: 'stationery', name: '고급 만년필', kind: 'gift', price: 120_000, desc: '장부 쓰는 손이 즐거워진다' },
  { id: 'coffee_beans', name: '스페셜티 원두', kind: 'gift', price: 40_000, desc: '에티오피아 내추럴' },
  { id: 'perfume', name: '향수', kind: 'gift', price: 90_000, desc: '달콤한 머스크' },
  { id: 'plush', name: '고양이 인형', kind: 'gift', price: 30_000, desc: '표정이 묘하게 무심하다' },
  { id: 'book', name: '소설책', kind: 'gift', price: 20_000, desc: '요즘 서점 1위' },
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]));
export const GIFT_IDS = items.filter((i) => i.kind === 'gift').map((i) => i.id);
export const CONSUMABLE_IDS = items.filter((i) => i.kind === 'consumable').map((i) => i.id);
