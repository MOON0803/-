export interface PlaceDef {
  id: string;
  name: string;
  cost: number;
  minStage: number;
  desc: string;
}

export const PLACES: PlaceDef[] = [
  { id: 'euljiro', name: '을지로 노포 골목', cost: 30_000, minStage: 2, desc: '노가리와 맥주. 기본 데이트 코스' },
  { id: 'cheonggye', name: '청계천 산책로', cost: 0, minStage: 2, desc: '밤이면 백탑이 하얗게 빛난다' },
  { id: 'seongsu', name: '성수 카페거리', cost: 50_000, minStage: 2, desc: '카페 메뉴 아이디어를 얻을지도' },
  { id: 'hongdae', name: '홍대', cost: 50_000, minStage: 2, desc: '오락실, 코인노래방, 길거리 공연' },
  { id: 'hangang', name: '한강 공원', cost: 20_000, minStage: 2, desc: '치킨과 돗자리' },
  { id: 'namsan', name: '남산 타워', cost: 80_000, minStage: 3, desc: '백탑과 남산타워가 같이 보이는 야경' },
  { id: 'amusement', name: '놀이공원', cost: 150_000, minStage: 3, desc: '하루를 통째로 쓰는 데이트' },
];

export const PLACE_MAP: Record<string, PlaceDef> = Object.fromEntries(PLACES.map((p) => [p.id, p]));
