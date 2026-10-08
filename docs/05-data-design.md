# 05. 데이터 설계서

이 앱에는 서버·DB가 없다. 데이터는 **정적 콘텐츠(코드 내 상수)**, **런타임 상태(메모리)**, **브라우저 저장(1건)** 의 세 종류다.

> ⚠ **개인정보 주의**: `src/data/profile.ts` 의 값은 전부 **예시용 가짜 데이터**입니다. 실제 이름·연락처·경력으로 바꿀 때는 공개 범위를 확인하세요.

## 1. 데이터 분류

| 분류 | 위치 | 수명 | 비고 |
|---|---|---|---|
| 정적 콘텐츠 | `src/data/profile.ts` | 빌드 시 고정 | 소개 내용. 수정 시 재빌드/HMR |
| 런타임 상태 (게임) | `Game` 인스턴스 / `GameRoot` state | 페이지를 닫을 때까지 | 체력·코인·레벨·위치 등. **새로고침하면 초기화** |
| 브라우저 저장 | `localStorage` | 영구 | BUG SQUASH 최고 기록 1건 |
| 쿠키 / 서버 저장 / 외부 API | — | — | 사용하지 않음 |

## 2. 정적 콘텐츠 스키마 (`src/data/profile.ts`)

### 2.1 `profile`

| 필드 | 타입 | 설명 | 사용처 |
|---|---|---|---|
| `name` | string | 이름 | STATUS 제목 |
| `nickname` | string | 별명 (따옴표로 표시) | STATUS |
| `title` | string | 직함 (`Lv.{level} {title}`) | STATUS |
| `level` | number | 표시용 레벨 (**게임 내 레벨과 별개**) | STATUS |
| `guild` / `location` | string | 소속 / 위치 | STATUS |
| `intro` | string | 자기소개 (타이프라이터로 표시) | STATUS |
| `stats[]` | `{label, name, value(0-100), color}` | 능력치 바 (4개 권장) | STATUS |
| `info[]` | `[항목, 값][]` | 기본 정보 행 | STATUS |
| `contacts[]` | `{label, value, href}` | 연락처 링크 (새 탭) | STATUS |

### 2.2 `skills[]`

```ts
{ group: string; icon: string; items: { name: string; lv: 1|2|3|4|5 }[] }
```
카테고리별 카드로 표시한다. `lv` 는 5칸 중 채워지는 칸 수.

### 2.3 `journey[]` (발자취 지도)

```ts
interface Milestone {
  year: string;   // 지도 위 라벨 (예: "2019", "NOW")
  title: string;
  desc: string;
  icon: "flag" | "book" | "code" | "briefcase" | "trophy" | "star";
}
```

**제약 (중요)**: 지도 위 좌표는 `JourneyMap.tsx` 의 `NODES`(6개)로 **고정**되어 있다. `journey` 의 항목 수는 **6개**여야 한다. 개수를 바꾸려면 `NODES` 좌표도 같은 개수로 수정해야 한다.

### 2.4 `quests[]` (길드 게시판)

```ts
interface Quest {
  id: string;                 // 고유 ID
  title: string;
  rank: "S" | "A" | "B" | "C";
  status: "CLEAR" | "IN PROGRESS";
  period: string;
  role: string;
  summary: string;            // 카드 1줄 요약 + 상세 본문
  details: string[];          // 상세의 ◆ 항목
  tags: string[];             // 카드엔 앞 3개, 상세엔 전체
  link?: { label: string; href: string };
  shots: Shot[];              // 1장 이상 필요 (카드 썸네일은 shots[0])
  color: string;              // 종이 색 (CSS 색상)
}

interface Shot {
  src?: string;               // 예: "/quests/hansik-1.png" (public/ 기준). 없으면 SAMPLE 화면
  caption: string;
  kind: "hero" | "cards" | "page" | "chart" | "chat" | "code";  // SAMPLE 화면의 종류
}
```

현재 등록된 퀘스트 6건 (예시):

| id | 제목 | 랭크 | 상태 | shots |
|---|---|---|---|---|
| hansik | 한식 소개 페이지 | A | CLEAR | 3 |
| pixel-village | 이 자기소개 게임 | S | IN PROGRESS | 3 |
| ledger | 모바일 가계부 | B | CLEAR | 2 |
| automation | 업무 자동화 봇 | B | CLEAR | 2 |
| hackathon | 해커톤 우수상 | A | CLEAR | 2 |
| oss | 오픈소스 기여 | C | IN PROGRESS | 2 |

- 종이의 기울기는 순서(6종류 순환)로 정해진다. 6건을 넘겨도 동작하지만 기울기는 반복된다.
- `hansik` 의 링크는 **플레이스홀더**(`https://github.com/your-id/hansik-introduction`)다. 실제 저장소 URL로 교체해야 한다.
- 이미지 로드에 실패하면 자동으로 SAMPLE 화면으로 대체된다.

## 3. 런타임 상태

### 3.1 `HudState` (엔진 → React)

| 필드 | 초기값 | 설명 |
|---|---|---|
| `hp` / `maxHp` | 5 / 5 | 체력. 최대 8 |
| `coins` | 0 | 코인 |
| `level` | 1 | 게임 내 레벨 |
| `exp` / `expNext` | 0 / 30 | 경험치와 다음 레벨 필요량 |

### 3.2 엔진 내부 상태 (`Game`)

| 상태 | 설명 |
|---|---|
| `p` (플레이어) | 위치·속도·방향·접지/코요테/점프 버퍼·공격 타이머·무적·체력 |
| `enemies[]` | 종류·위치·체력·상태·재출현 타이머 |
| `coins[]` / `particles[]` / `floaters[]` | 코인·파티클·데미지 숫자 |
| `scene` / `scenes`(Map) | 현재 씬 / 씬 캐시 |
| `cam` / `shake` / `hitstop` / `fade` | 카메라·연출 |
| `paused` / `locked` / `interactLock` | 일시정지 / 전환 중 입력 잠금 / 오버레이 직후 입력 무시 |

### 3.3 React 상태 (`GameRoot`)

`open`, `hud`, `prompt`, `banner`, `damageTick`, `muted`, `touch`, `hint`, `ready`, `started`, 그리고 `seenHome`(ref). 상세는 [02 기본 설계서](02-basic-design.md) 4.3.

## 4. 브라우저 저장

| 키 | 값 | 쓰는 곳 | 읽는 곳 | 실패 시 |
|---|---|---|---|---|
| `pixel-village:bugsquash-best` | 최고 점수 (정수 문자열) | BUG SQUASH 종료 시(신기록일 때) | BUG SQUASH 열 때 | 예외를 삼키고 0으로 취급 (저장 생략) |

삭제하려면 개발자 도구 → Application → Local Storage 에서 해당 키를 지운다.

## 5. 에셋 파일

| 종류 | 현황 |
|---|---|
| 이미지 | 없음 (스프라이트·배경은 코드로 그림). 퀘스트 스크린샷만 `public/quests/` 에 **선택적으로** 추가 |
| 음원 | 없음 (Web Audio로 합성) |
| 폰트 | `public/fonts/Galmuri9.woff2`, `Galmuri11.woff2` (+ 라이선스 `OFL-Galmuri.md`). `globals.css` 의 `@font-face` 로 참조 |
| 아이콘(UI) | `PixelArt` 컴포넌트가 문자 그리드로 SVG 생성 (하트·코인·벌레·폭탄·스피커 등) |

## 6. 변경 시 영향 범위

| 변경 | 영향 |
|---|---|
| `profile` 수정 | STATUS 화면만 |
| `skills` 수정 | SKILLS 화면만 |
| `journey` 수정 | 지도 화면 (항목 수 6 유지) |
| `quests` 추가/삭제 | 게시판 목록. 6의 배수가 아니어도 그리드가 자동 줄바꿈 |
| `shots` 에 `src` 추가 | 해당 퀘스트의 썸네일·갤러리 |
