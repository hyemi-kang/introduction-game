# 07. 운영·개발 가이드

## 1. 환경 요건

| 항목 | 요건 |
|---|---|
| OS | Windows 11에서 개발·확인 (macOS/Linux도 일반적으로 동작할 것으로 예상, 미검증) |
| Node.js | 22 이상 (확인 버전: v22) |
| npm | 10 이상 (확인 버전: 10.9) |
| 브라우저 | 최신 Chromium 계열 (Edge / Chrome). 확인은 Edge |

## 2. 시작하기

```bash
cd C:\study\react\animation\introduction-game
npm install
npm run dev        # http://localhost:3000
```

| 스크립트 | 내용 |
|---|---|
| `npm run dev` | 개발 서버 (Turbopack, HMR) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 빌드 결과 실행 |
| `npm run lint` | `tsc --noEmit` (타입 검사만. ESLint는 미도입) |

환경 변수는 사용하지 않는다.

### 2.1 사내 네트워크에서 `npm install` 이 실패/지연될 때

증상: `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (SSL 증명서 검증 실패) 또는 10분 이상 걸림.

| 대처 | 방법 |
|---|---|
| 사내 루트 인증서를 Node에 알려준다 (권장) | `NODE_EXTRA_CA_CERTS=<사내 루트 CA .pem 경로>` 환경변수를 설정하고 다시 실행 |
| npm에 CA 파일 지정 | `npm config set cafile <pem 경로>` |
| 일시적 우회 (보안상 비권장) | `npm config set strict-ssl false` — 작업 후 원복할 것 |

> 사내 보안 정책에 따라 허용되는 방법이 다릅니다. 정책을 확인한 뒤 적용하세요.

## 3. 콘텐츠 편집 방법

모든 소개 내용은 `src/data/profile.ts` 에서 바꾼다. (스키마: [05 데이터 설계서](05-data-design.md))

### 3.1 프로필·스킬
`profile`, `skills` 를 수정한다. 능력치는 `stats[].value` (0~100), 스킬은 `items[].lv` (1~5).

### 3.2 경력 (발자취 지도)
`journey` 를 수정한다. **항목 수는 6개 고정**(지도 좌표 `JourneyMap.tsx` 의 `NODES` 와 일치해야 함). `icon` 은 `flag / book / code / briefcase / trophy / star`.

### 3.3 프로젝트 (길드 게시판)

1. `quests` 에 항목을 추가/수정한다 (`id` 는 고유값).
2. **링크 교체**: 한식 소개 페이지의 `link.href` 가 플레이스홀더이므로 실제 GitHub URL로 바꾼다.
3. **스크린샷 추가**
   - 이미지를 `public/quests/` 에 둔다 (16:9 권장). 예: `public/quests/hansik-1.png`
   - 해당 퀘스트의 `shots` 에 `src` 를 지정한다.
   ```ts
   shots: [
     { src: "/quests/hansik-1.png", kind: "hero", caption: "메인 화면" },
   ],
   ```
   - `kind` 는 이미지가 없을 때 보일 SAMPLE 화면의 종류다. `src` 가 있으면 SAMPLE 은 표시되지 않는다.

### 3.4 대사·문구
| 문구 | 위치 |
|---|---|
| 접수 NPC 말풍선 | `scenes.ts` `createGuild` 의 `npcSpeech` |
| 씬 이름 배너 | `scenes.ts` 각 씬의 `title` |
| 인터랙터블 라벨 | `scenes.ts` 각 씬의 `interactables[].label` |
| 조작법 문구 | `ControlHint.tsx` 의 `CONTROLS` |
| 튜토리얼 간판 | `scenes.ts` `createVillage` 의 `text(...)` 4줄 |

## 4. 수치 조정 위치

| 조정하고 싶은 것 | 위치 |
|---|---|
| 이동 속도·점프력·중력 | `engine.ts` 상단 상수 `GRAVITY / MAX_FALL / RUN / JUMP_V` |
| 공격 쿨다운·판정·데미지 | `engine.ts` `update`(0.34 등) / `attackHit` |
| 체력·무적 시간 | `engine.ts` `p.hp`, `hurtPlayer`(1.2초) |
| 경험치 곡선·최대 체력 | `engine.ts` `gainExp` |
| 슬라임 체력·재출현 | `engine.ts` `setScene`(hp) / `damageEnemy`·`updateEnemy`(12초, 160px) |
| 적 배치·코인 배치·발판 | `scenes.ts` `createVillage` (`enemies`, `addArc`, `platforms`) |
| 미니게임 시간·확률·점수 | `BugSquash.tsx` (`DURATION`, `spawn`, `onHit`, `end`) |
| 캐릭터 크기 | `art.ts` `HERO_CELL` (1칸의 px 수. 3 → 4 로 올리면 큼) |
| 캐릭터 외형 | `art.ts` `T_BODY` / `T_LEGS` / `T_PAL` (문자 그리드) |
| 도트 UI 색 | `globals.css` `.pxl-*` / `.px-*` |

수치와 동작의 상세는 [04 게임 사양서](04-game-spec.md).

## 5. 개발 시 규칙·요령

| 항목 | 내용 |
|---|---|
| 좌표 | 캔버스 좌표는 모두 480×270 기준. 월드 그래픽은 4px 블록에 맞춘다 (`snap`) |
| 배경 캐시 | 씬 배경은 오프스크린 캐시에 한 번 그린다. 배경 코드를 바꿨다면 새로고침(또는 `refreshScenes`)이 필요 |
| 새 오버레이 추가 | ① `types.ts` 의 `OverlayId` 에 추가 → ② 씬의 `interactables` 에 `overlay` 지정 → ③ `GameRoot` 에서 컴포넌트 렌더링 → ④ 닫을 때 `closeOverlay`(= `setPaused(false)`) 호출 |
| 새 씬 추가 | `types.ts` `SceneId` → `scenes.ts` 에 `createXxx` 와 `createScene` 분기 → 마을 쪽에 문(인터랙터블) 추가 |
| 오버레이 안의 키 입력 | 게임의 `Input` 은 일시정지 중 무시된다. `Esc` 는 `Overlay` 가 처리하고, 하위 UI에서 `Esc` 를 따로 쓰려면 캡처 단계에서 `stopPropagation` (예: `QuestShots`) |
| `transform` 이 걸린 요소 안의 `fixed` | `fixed` 가 기준을 잃는다. 전체 화면 요소는 `createPortal(document.body)` 로 뺀다 |
| 줄바꿈 | 파일에 CRLF/LF가 섞일 수 있다. 문자열 치환 스크립트를 쓸 때 주의 |
| 타입 검사 | 수정 후 `npx tsc --noEmit` |

## 6. 배포 메모

- 서버 기능이 없으므로 정적 호스팅/Node 호스팅 어느 쪽이든 가능 (`next build` 결과 `/` 는 정적 프리렌더).
- 환경 변수·DB·시크릿 없음.
- 공개 전 체크: [08 미해결 사항](08-issues-backlog.md)의 "공개 전 확인" 항목.

## 7. 트러블슈팅

| 증상 | 원인 / 대처 |
|---|---|
| 파란 배경만 보인다 | (과거 원인) 폰트 CDN 요청이 화면 표시를 막았던 문제 → 현재는 해결. 브라우저가 **예전 버전을 캐시**하고 있을 수 있으니 한 번 `Ctrl+Shift+R`. 계속되면 콘솔의 오류 문구와 브라우저 이름을 기록 |
| `Another next dev server is already running` | 이미 개발 서버가 떠 있음. 표시된 주소를 쓰거나 `taskkill /PID <PID> /F` 후 재실행 |
| `next dev` 실행 중 `next build` 를 돌렸더니 이상하다 | `.next` 가 충돌할 수 있다. 개발 서버를 끄고 빌드 |
| 캔버스에 붉은 글자의 오류가 표시된다 | 프레임 처리 중 예외. 같은 내용이 콘솔 `[game] frame error:` 로도 출력됨 |
| 소리가 안 난다 | 브라우저 정책상 **첫 키 입력/클릭 이후**에 시작. `M`/🔊 로 음소거 여부도 확인 |
| 도트 폰트로 보이지 않는다 | CDN(jsDelivr)에 접속 불가한 환경이면 대체 폰트가 쓰인다. 동작에는 영향 없음 |
| BUG SQUASH 기록이 사라졌다 | 브라우저의 사이트 데이터 삭제 / 시크릿 모드. `localStorage` 의 `pixel-village:bugsquash-best` |
| 콘솔에 `favicon.ico` 404 | 파비콘 미설정. 무해 |
| 콘솔에 `GSAP target not found` 경고 | 스킬 탭에서 존재하지 않는 능력치 바를 찾을 때 나오는 경고로 무해 (개발 모드) |

## 8. 의존성 업데이트 시 주의

- `next` / `react` / `tailwindcss` / `gsap` 는 캐럿(`^`) 범위. 메이저 업데이트 전에는 [06 테스트 사양서](06-test-spec.md)를 전체 실행한다.
- Tailwind 4 의 설정은 `globals.css` 의 `@theme` 와 `postcss.config.mjs` 에 있다 (`tailwind.config` 파일 없음).
