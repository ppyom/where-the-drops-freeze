// 얼음 성장 수치. 여기만 바꿔서 실험한다.
// 주의: 작품 저장이 시작되면 이 값들도 재현 규칙의 일부. 바꾸면 예전 작품이 다르게 자란다.

// 격자 크기 (9:13 비율 유지)
export const W = 90
export const H = 130

// 작품당 제한 (supabase/schema.sql의 save_artwork도 같이 바꿀 것)
export const MIN_DROPS = 5 // 완성 버튼 활성 기준
export const MAX_DROPS = 200
export const MAX_SIZE_SUM = 400

// 원형 덩어리 반경² (크기 1~4). 0→1칸, 1→5칸, 2→9칸(+랜덤 4), 5→21칸
export const BLOB_R2 = [0, 0, 1, 2, 5]

// 줄기: 붙은 자리에서 위로 뻗는 길이 (크기 1~4)
export const STALK = [0, 2, 3, 5, 7]
// 줄기가 한 칸 오를 때 좌우로 휠 확률
export const STALK_BEND = 0.35

// 얼음에 닿은 뒤 랜덤하게 움직이는 최대 걸음 수
export const WALK_STEPS = 8

// 세모 시작 모양 (격자 폭 대비 비율)
export const TRI_HALF = 0.13 // 밑변 절반
export const TRI_HEIGHT = 0.14 // 높이
