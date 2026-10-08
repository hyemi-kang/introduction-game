/**
 * ここにある情報はすべて「例」です（架空の人物・架空のURL）。
 * 実際の公開前に、自分の情報へ書き換えてください。
 */

export const profile = {
  name: "김픽셀",
  nickname: "PIXEL",
  title: "Frontend Mage",
  level: 27,
  guild: "Web Adventurers",
  location: "Seoul / Tokyo",
  intro:
    "화면 위에서 살아 움직이는 UI를 만드는 프론트엔드 개발자입니다. 애니메이션과 사용자 경험에 진심이고, 작은 디테일 하나가 서비스의 인상을 바꾼다고 믿어요.",
  stats: [
    { label: "STR", name: "구현력", value: 82, color: "#ff8a8a" },
    { label: "DEX", name: "애니메이션", value: 91, color: "#6ee7a0" },
    { label: "INT", name: "설계", value: 74, color: "#bfe0ff" },
    { label: "LUK", name: "호기심", value: 88, color: "#f59e0b" },
  ],
  info: [
    ["직업", "Frontend Developer"],
    ["주무기", "React / TypeScript"],
    ["취미", "픽셀 아트 · 한식 탐방"],
    ["좌우명", "작게 만들고, 빠르게 보여주자"],
  ] as [string, string][],
  contacts: [
    { label: "GitHub", value: "github.com/your-id", href: "https://github.com/your-id" },
    { label: "Mail", value: "hello@example.com", href: "mailto:hello@example.com" },
    { label: "Blog", value: "blog.example.com", href: "https://blog.example.com" },
  ],
};

export const skills = [
  {
    group: "FRONTEND",
    icon: "⚔",
    items: [
      { name: "React", lv: 5 },
      { name: "Next.js", lv: 4 },
      { name: "TypeScript", lv: 4 },
      { name: "Tailwind CSS", lv: 5 },
    ],
  },
  {
    group: "ANIMATION",
    icon: "✦",
    items: [
      { name: "GSAP", lv: 4 },
      { name: "Framer Motion", lv: 3 },
      { name: "Canvas / SVG", lv: 4 },
    ],
  },
  {
    group: "BACKEND & TOOLS",
    icon: "⚒",
    items: [
      { name: "Node.js", lv: 3 },
      { name: "PostgreSQL", lv: 3 },
      { name: "Git / GitHub", lv: 4 },
      { name: "Figma", lv: 3 },
    ],
  },
];

export interface Milestone {
  year: string;
  title: string;
  desc: string;
  icon: "flag" | "book" | "code" | "briefcase" | "trophy" | "star";
}

/** 발자취 맵の地点（例） */
export const journey: Milestone[] = [
  { year: "2019", title: "모험의 시작", desc: "컴퓨터공학과에 입학. 처음으로 HTML 한 줄을 써서 화면에 글자를 띄웠다.", icon: "flag" },
  { year: "2020", title: "첫 번째 코드", desc: "JavaScript 스터디에 참여해 투두 앱을 완성. 만드는 즐거움을 알게 되었다.", icon: "book" },
  { year: "2021", title: "팀 프로젝트", desc: "교내 해커톤에서 팀장을 맡아 React로 서비스를 출시. 협업과 Git 흐름을 배웠다.", icon: "code" },
  { year: "2022", title: "인턴 수습 모험가", desc: "스타트업 프론트엔드 인턴. 실제 사용자가 쓰는 화면을 처음 배포했다.", icon: "briefcase" },
  { year: "2024", title: "정식 길드 입단", desc: "SI 기업에 입사. 요구사항 정의부터 운영까지 서비스의 전체 흐름을 경험.", icon: "trophy" },
  { year: "NOW", title: "나만의 마을 건설 중", desc: "애니메이션 중심의 인터랙티브 포트폴리오를 제작하며 새로운 모험을 이어가는 중.", icon: "star" },
];

export interface Shot {
  /** 実際のスクリーンショット (public/ 配下。例: "/quests/hansik-1.png")。未設定ならサンプル画面を表示 */
  src?: string;
  caption: string;
  kind: "hero" | "cards" | "page" | "chart" | "chat" | "code";
}

export interface Quest {
  id: string;
  title: string;
  rank: "S" | "A" | "B" | "C";
  status: "CLEAR" | "IN PROGRESS";
  period: string;
  role: string;
  summary: string;
  details: string[];
  tags: string[];
  link?: { label: string; href: string };
  shots: Shot[];
  color: string;
}

export const quests: Quest[] = [
  {
    id: "hansik",
    title: "한식 소개 페이지",
    rank: "A",
    status: "CLEAR",
    period: "2025.03 – 2025.05",
    role: "Frontend / Design",
    summary: "한국 음식의 매력을 외국인 여행자에게 소개하는 반응형 웹사이트.",
    details: [
      "지역·종류별 한식 카드와 필터 UI 구현",
      "스크롤 연동 애니메이션으로 음식 이미지가 살아나는 연출",
      "Lighthouse 성능 점수 95+ 달성 (이미지 최적화)",
    ],
    tags: ["React", "Next.js", "Tailwind", "GSAP"],
    // TODO: 실제 저장소 URL로 교체하세요
    link: { label: "GitHub에서 보기", href: "https://github.com/your-id/hansik-introduction" },
    color: "#fef3c7",
    shots: [
      { kind: "hero", caption: "메인 화면 — 대표 한식 소개" },
      { kind: "cards", caption: "지역 · 종류별 한식 카드와 필터" },
      { kind: "page", caption: "음식 상세 페이지" },
    ],
  },
  {
    id: "pixel-village",
    title: "이 자기소개 게임",
    rank: "S",
    status: "IN PROGRESS",
    period: "2025.10 –",
    role: "Everything",
    summary: "플레이어가 직접 조작하며 둘러보는 2D 픽셀 포트폴리오.",
    details: [
      "Canvas 기반 자체 2D 플랫포머 엔진 (점프 · 공격 · 충돌)",
      "GSAP로 화면 전환, UI, 발자취 애니메이션 연출",
      "WebAudio 칩튠 BGM / 효과음",
    ],
    tags: ["Next.js", "TypeScript", "Canvas", "GSAP"],
    color: "#e0f2fe",
    shots: [
      { kind: "hero", caption: "마을 — 캐릭터를 조작해 탐험" },
      { kind: "page", caption: "길드 게시판 · 퀘스트 목록" },
      { kind: "code", caption: "자체 제작 2D 엔진 코드" },
    ],
  },
  {
    id: "ledger",
    title: "모바일 가계부",
    rank: "B",
    status: "CLEAR",
    period: "2024.06 – 2024.09",
    role: "Frontend",
    summary: "영수증 사진으로 지출을 자동 입력하는 개인용 가계부 PWA.",
    details: ["카테고리별 통계 차트", "오프라인에서도 동작하는 PWA", "월별 리포트 자동 생성"],
    tags: ["React", "PWA", "Chart"],
    color: "#fce7f3",
    shots: [
      { kind: "chart", caption: "월별 · 카테고리별 지출 통계" },
      { kind: "cards", caption: "지출 내역 리스트" },
    ],
  },
  {
    id: "automation",
    title: "업무 자동화 봇",
    rank: "B",
    status: "CLEAR",
    period: "2024.01 – 2024.03",
    role: "Backend",
    summary: "반복되는 사내 보고 업무를 자동화한 알림 봇.",
    details: ["일일 보고 취합 시간을 30분 → 3분으로 단축", "Slack 연동 슬래시 명령", "에러 시 자동 재시도"],
    tags: ["Node.js", "Slack API", "Cron"],
    color: "#ecfccb",
    shots: [
      { kind: "chat", caption: "Slack 보고 알림 봇" },
      { kind: "code", caption: "자동화 스크립트" },
    ],
  },
  {
    id: "hackathon",
    title: "해커톤 우수상",
    rank: "A",
    status: "CLEAR",
    period: "2023.11",
    role: "Team Leader",
    summary: "24시간 해커톤에서 AI 기반 학습 도우미를 개발해 우수상 수상.",
    details: ["기획부터 발표까지 24시간 완주", "팀 4명 · 역할 분담과 일정 관리", "라이브 데모 발표"],
    tags: ["React", "OpenAI API", "Team"],
    color: "#fde9d9",
    shots: [
      { kind: "hero", caption: "발표 슬라이드" },
      { kind: "page", caption: "서비스 데모 화면" },
    ],
  },
  {
    id: "oss",
    title: "오픈소스 기여",
    rank: "C",
    status: "IN PROGRESS",
    period: "2024 –",
    role: "Contributor",
    summary: "사용 중인 라이브러리의 문서 오류와 작은 버그를 수정해 PR 제출.",
    details: ["문서 번역 및 오타 수정", "접근성 관련 버그 수정 PR"],
    tags: ["GitHub", "OSS"],
    color: "#ede9fe",
    shots: [
      { kind: "code", caption: "문서 수정 Pull Request" },
      { kind: "page", caption: "Merge 된 PR 화면" },
    ],
  },
];
