# CAROM AVG SCOREBOARD V1

## 1차 범위
- 시작 화면
- 1:1 / 다인 경기 방식 선택
- 기존 Supabase players 조회
- 1:1 점수 +1/+2/-1, 실행 취소, 이닝 종료
- 실시간 AVG/HR
- 입력 이력
- 카메라/15초 리플레이 자리 및 전체화면 UI
- 경기 종료 확인
- 기존 matches 테이블 저장

## 실행
1. `.env.example`을 `.env`로 복사하고 기존 CAROM AVG Supabase 값을 입력합니다.
2. `npm install`
3. `npm run dev`

## Cloudflare Pages
- Build command: `npm run build`
- Output directory: `dist`

## 현재 주의
- 다인 경기 결과 저장은 2차 개발 대상입니다.
- 카메라/15초 리플레이는 UI 자리만 준비되어 있습니다.
- public/icons/icon-192.png와 icon-512.png는 기존 아이콘을 복사해 넣으세요.
