import { disc, makeCanvas, px, pxo, text, tri } from "./art";
import { EnemySpawn, Interactable, Pickup, Platform, SceneId, VIEW_H, VIEW_W } from "./types";

export interface Scene {
  id: SceneId;
  title: string;
  width: number;
  ground: number;
  theme: "outdoor" | "indoor";
  platforms: Platform[];
  interactables: Interactable[];
  spawn: number;
  enemies: EnemySpawn[];
  pickups: Pickup[];
  draw(ctx: CanvasRenderingContext2D, cam: number, t: number): void;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const OL = "#6b4430";
const G_OUT = 224;
const G_IN = 220;

/* ------------------------------------------------------------------ */
/* 共通パーツ                                                           */
/* ------------------------------------------------------------------ */

/** 背景は 4px ブロック単位で描く（レファレンスのような大きなドット感） */
const B = 4;
const snap = (v: number) => Math.round(v / B) * B;

/** ブロック単位の円 */
function bdisc(ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, r: number) {
  cx = snap(cx);
  cy = snap(cy);
  for (let dy = -r; dy < r; dy += B) {
    const yy = dy + B / 2;
    const half = snap(Math.sqrt(Math.max(0, r * r - yy * yy)));
    if (half > 0) px(ctx, color, cx - half, cy + dy, half * 2, B);
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const c = s >= 1 ? 4 : 3;
  x = Math.round(x / c) * c;
  y = Math.round(y / c) * c;
  px(ctx, "#ffffff", x + 3 * c, y, 3 * c, c);
  px(ctx, "#ffffff", x + 1 * c, y + c, 7 * c, c);
  px(ctx, "#ffffff", x, y + 2 * c, 9 * c, c);
  px(ctx, "#d6ecff", x + 1 * c, y + 3 * c, 7 * c, c);
}

function drawPine(ctx: CanvasRenderingContext2D, x: number, ground: number, h: number, c1: string, c2: string) {
  x = snap(x);
  ground = snap(ground);
  px(ctx, "#8a5a36", x - 2, ground - 4, 4, 4);
  const n = Math.max(3, Math.floor(h / 8));
  for (let i = 0; i < n; i++) {
    const w = 8 + (n - 1 - i) * 8;
    px(ctx, i % 2 ? c1 : c2, x - w / 2, ground - 4 - (i + 1) * 8, w, 8);
  }
  px(ctx, c1, x - 2, ground - 4 - (n + 1) * 8 + 4, 4, 4);
}

function drawRoundTree(ctx: CanvasRenderingContext2D, x: number, ground: number, s: number) {
  x = snap(x);
  const th = snap(20 * s);
  px(ctx, "#8a5a36", x - 4, ground - th, 8, th);
  px(ctx, "#6b4430", x, ground - th, 4, th);
  const cy = ground - th - 8;
  const r = snap(14 * s) + 4;
  bdisc(ctx, "#2e8b3d", x + 4, cy + 4, r);
  bdisc(ctx, "#44b04b", x, cy, r);
  bdisc(ctx, "#6bd25f", x - 8, cy - 8, r / 2);
}

interface BuildingStyle {
  w: number;
  h: number;
  wall: string;
  wallDk: string;
  roof: string;
  roofDk: string;
  door: string;
  sign: string;
  signBg: string;
  signFg: string;
}

function drawBuilding(ctx: CanvasRenderingContext2D, cx: number, ground: number, s: BuildingStyle) {
  const x0 = cx - s.w / 2;
  const top = ground - s.h;
  // 壁（段ごとの帯で石/板の質感）
  px(ctx, s.wall, x0, top, s.w, s.h);
  for (let y = top + 8; y < ground - 4; y += 12) px(ctx, s.wallDk, x0, y, s.w, 4);
  px(ctx, s.wallDk, x0, top, 4, s.h);
  px(ctx, s.wallDk, x0 + s.w - 4, top, 4, s.h);
  // 屋根（4px 階段）
  const rows = 6;
  for (let i = 0; i < rows; i++) {
    const w = s.w - 24 + i * 8;
    px(ctx, i % 2 ? s.roofDk : s.roof, cx - w / 2, top - (rows - i) * B, w, B);
  }
  px(ctx, s.roofDk, cx - (s.w + 16) / 2, top, s.w + 16, 4);
  // 看板
  const sw = Math.max(40, s.sign.length * 8 + 12);
  px(ctx, "#00000033", cx - sw / 2, top + 10, sw, 14);
  px(ctx, s.signBg, cx - sw / 2, top + 8, sw, 14);
  text(ctx, s.sign, cx, top + 19, s.signFg, 8, "center");
  // ドア
  px(ctx, s.wallDk, cx - 12, ground - 32, 24, 32);
  px(ctx, s.door, cx - 8, ground - 28, 16, 28);
  px(ctx, "#00000026", cx, ground - 28, 2, 28);
  px(ctx, "#fcd34d", cx + 4, ground - 14, 4, 4);
  // 窓
  for (const dx of [-(s.w / 2 - 16), s.w / 2 - 16]) {
    const wx = cx + dx - 8;
    px(ctx, s.wallDk, wx - 2, ground - 42, 20, 20);
    px(ctx, "#ffe9a0", wx, ground - 40, 16, 16);
    px(ctx, "#f2a93a", wx + 7, ground - 40, 2, 16);
    px(ctx, "#f2a93a", wx, ground - 33, 16, 2);
  }
  // 石段
  px(ctx, "#d6d3d1", cx - 16, ground - 4, 32, 4);
}

function drawPlatformBlock(ctx: CanvasRenderingContext2D, p: Platform) {
  px(ctx, "#c98a4b", p.x, p.y, p.w, 12);
  px(ctx, "#a86b35", p.x, p.y + 8, p.w, 4);
  for (let x = p.x + 8; x < p.x + p.w - 4; x += 16) px(ctx, "#b9783d", x, p.y + 4, 4, 4);
  px(ctx, "#5fcf4f", p.x, p.y, p.w, 4);
  px(ctx, "#8fe86f", p.x, p.y, p.w, 2);
  for (let x = p.x + 4; x < p.x + p.w - 4; x += 12) px(ctx, "#5fcf4f", x, p.y + 4, 4, 4);
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, ground: number, color: string) {
  x = snap(x);
  px(ctx, "#3a9a45", x, ground - 6, 2, 6);
  px(ctx, color, x - 2, ground - 10, 6, 4);
  px(ctx, color, x, ground - 12, 2, 8);
  px(ctx, "#fff3a8", x, ground - 9, 2, 2);
}

/** 画面右へ向かう小さな「↑」プロンプト（ゲーム側で使用） */
export function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, bright: boolean) {
  const c = bright ? "#fde047" : "#fef3c7";
  px(ctx, OL, x - 5, y - 1, 11, 4);
  px(ctx, OL, x - 3, y - 4, 7, 4);
  px(ctx, OL, x - 1, y - 6, 3, 3);
  px(ctx, c, x - 1, y - 5, 3, 3);
  px(ctx, c, x - 3, y - 3, 7, 3);
  px(ctx, c, x - 4, y, 9, 2);
  px(ctx, bright ? "#f59e0b" : "#fcd34d", x - 4, y + 1, 9, 1);
}

/* ------------------------------------------------------------------ */
/* 村 (屋外)                                                            */
/* ------------------------------------------------------------------ */

const VILLAGE_W = 1400;

function createVillage(): Scene {
  const platforms: Platform[] = [
    { x: 330, y: 182, w: 48, oneWay: true },
    { x: 396, y: 152, w: 48, oneWay: true },
    { x: 462, y: 122, w: 48, oneWay: true },
    { x: 880, y: 182, w: 48, oneWay: true },
    { x: 946, y: 152, w: 48, oneWay: true },
    { x: 1012, y: 122, w: 48, oneWay: true },
    { x: 1250, y: 168, w: 72, oneWay: true },
    { x: 1260, y: 108, w: 52, oneWay: true },
  ];
  const pickups: Pickup[] = [];
  const addArc = (x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) pickups.push({ x: x + i * 14, y: y - Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 8 });
  };
  addArc(334, 168, 3);
  addArc(400, 138, 3);
  addArc(466, 108, 3);
  addArc(884, 168, 3);
  addArc(950, 138, 3);
  addArc(1016, 108, 3);
  addArc(1256, 154, 5);
  addArc(1266, 94, 3);
  addArc(540, G_OUT - 12, 6);

  const L: { sky?: HTMLCanvasElement; far?: HTMLCanvasElement; mid?: HTMLCanvasElement; near?: HTMLCanvasElement } = {};

  const ensure = () => {
    if (L.near) return;
    // sky
    {
      const { c, ctx } = makeCanvas(VIEW_W, VIEW_H);
      const cols = ["#79c6ff", "#8cd1ff", "#a2dcff", "#b9e7ff", "#d0f1ff", "#e4f9ff"];
      cols.forEach((col, i) => px(ctx, col, 0, i * 45, VIEW_W, 46));
      bdisc(ctx, "#fff1a0", 400, 48, 28);
      bdisc(ctx, "#ffe066", 400, 48, 20);
      L.sky = c;
    }
    // far mountains
    {
      const f = 0.12;
      const w = VIEW_W + (VILLAGE_W - VIEW_W) * f;
      const { c, ctx } = makeCanvas(w, VIEW_H);
      for (let x = 0; x < w; x += B) {
        const h = Math.pow(Math.abs(Math.sin(x / 64 + 0.6)), 0.85) * 78 + 14 * Math.sin(x / 17) + 26;
        const y = snap(196 - h);
        px(ctx, "#b0dcf8", x, y, B, 100);
        px(ctx, "#d4eefe", x, y, B, B);
      }
      L.far = c;
    }
    // mid hills + pines
    {
      const f = 0.4;
      const w = VIEW_W + (VILLAGE_W - VIEW_W) * f;
      const { c, ctx } = makeCanvas(w, VIEW_H);
      const r = rng(7);
      const hillY = (x: number) => snap(206 - (22 * Math.sin(x / 80) + 12 * Math.sin(x / 31 + 1) + 22));
      for (let x = 0; x < w; x += B) {
        const y = hillY(x);
        px(ctx, "#8fe39e", x, y, B, 100);
        px(ctx, "#b6f2bd", x, y, B, B);
      }
      for (let x = 16; x < w; x += snap(28 + r() * 24)) {
        drawPine(ctx, x, hillY(x) + 8, 32 + Math.floor(r() * 16), "#45b97e", "#5fcf98");
      }
      L.mid = c;
    }
    // near
    {
      const { c, ctx } = makeCanvas(VILLAGE_W, VIEW_H);
      const r = rng(21);
      // 奥の木
      for (const tx of [40, 340, 560, 830, 960, 1275, 1360]) drawRoundTree(ctx, tx, G_OUT, 0.9 + r() * 0.5);
      // 建物
      drawBuilding(ctx, 230, G_OUT, {
        w: 88, h: 56, wall: "#f5dfae", wallDk: "#e3c88d", roof: "#e4574f", roofDk: "#c23f3a",
        door: "#8a5a36", sign: "HOME", signBg: "#7c4a1e", signFg: "#fde68a",
      });
      drawBuilding(ctx, 700, G_OUT, {
        w: 120, h: 66, wall: "#c3bfd3", wallDk: "#a29db8", roof: "#4467b8", roofDk: "#33519a",
        door: "#5b3a29", sign: "GUILD", signBg: "#1e3a8a", signFg: "#bfdbfe",
      });
      // ギルドの旗
      for (const fx of [645, 755]) {
        px(ctx, OL, fx, G_OUT - 100, 2, 40);
        pxo(ctx, "#ef4444", OL, fx + 2, G_OUT - 98, 12, 14);
        px(ctx, "#fde047", fx + 6, G_OUT - 94, 4, 4);
      }
      drawBuilding(ctx, 1130, G_OUT, {
        w: 104, h: 60, wall: "#4b3880", wallDk: "#3a2a6a", roof: "#e0479e", roofDk: "#b82f7e",
        door: "#1e1b4b", sign: "ARCADE", signBg: "#0f0a24", signFg: "#67e8f9",
      });
      // 地面（草 2 段 + 土。4px ブロック）
      px(ctx, "#e7b878", 0, G_OUT + 4, VILLAGE_W, VIEW_H - G_OUT);
      px(ctx, "#6bc94f", 0, G_OUT, VILLAGE_W, 8);
      px(ctx, "#8fe86f", 0, G_OUT, VILLAGE_W, 4);
      for (let x = 0; x < VILLAGE_W; x += B) {
        if (r() < 0.35) px(ctx, "#6bc94f", x, G_OUT + 8, B, B);
        if (r() < 0.2) px(ctx, "#8fe86f", x, G_OUT, B, B * 0 + 2);
      }
      for (let i = 0; i < 90; i++) {
        const gx = snap(r() * VILLAGE_W);
        const gy = snap(G_OUT + 14 + r() * (VIEW_H - G_OUT - 18));
        px(ctx, r() < 0.5 ? "#d49a5c" : "#f6d6a3", gx, gy, B, B);
      }
      // 石畳の小道
      for (const bx of [230, 700, 1130]) {
        for (let i = -16; i <= 8; i += 8) px(ctx, "#e9e4dc", bx + i, G_OUT + 4, 8, 4);
      }
      // 柵
      for (const [fx0, fx1] of [[300, 330], [520, 580], [1180, 1240]]) {
        px(ctx, "#b9783d", fx0, G_OUT - 8, fx1 - fx0, 4);
        for (let x = fx0; x <= fx1; x += 8) px(ctx, "#d9a56a", x, G_OUT - 12, 4, 12);
      }
      // 花
      for (let i = 0; i < 70; i++) {
        const fx = Math.floor(r() * VILLAGE_W);
        if (Math.abs(fx - 230) < 20 || Math.abs(fx - 700) < 20 || Math.abs(fx - 1130) < 20) continue;
        drawFlower(ctx, fx, G_OUT, ["#f472b6", "#fbbf24", "#fff", "#c084fc"][Math.floor(r() * 4)]);
      }
      // チュートリアル看板
      px(ctx, OL, 69, G_OUT - 26, 4, 26);
      px(ctx, OL, 125, G_OUT - 26, 4, 26);
      pxo(ctx, "#c9915b", OL, 58, G_OUT - 66, 82, 44);
      px(ctx, "#a56d3d", 58, G_OUT - 28, 82, 4);
      text(ctx, "← → 이동", 66, G_OUT - 54, "#3b1d0a", 8);
      text(ctx, "SPACE 점프", 66, G_OUT - 44, "#3b1d0a", 8);
      text(ctx, "Z  공격", 66, G_OUT - 34, "#3b1d0a", 8);
      text(ctx, "↑  들어가기", 66, G_OUT - 24, "#7f1d1d", 8);
      // 浮島
      for (const p of platforms) drawPlatformBlock(ctx, p);
      // 右端の看板
      px(ctx, OL, 1368, G_OUT - 20, 3, 20);
      pxo(ctx, "#c9915b", OL, 1352, G_OUT - 36, 36, 16);
      text(ctx, "END", 1370, G_OUT - 25, "#3b1d0a", 8, "center");
      L.near = c;
    }
  };

  const cloudSeeds = [
    { x: 40, y: 40, s: 1.2, v: 4 },
    { x: 220, y: 70, s: 0.9, v: 6 },
    { x: 330, y: 28, s: 1.0, v: 3 },
    { x: 130, y: 100, s: 0.7, v: 5 },
  ];

  return {
    id: "village",
    title: "HEMI VILLAGE",
    width: VILLAGE_W,
    ground: G_OUT,
    theme: "outdoor",
    platforms,
    pickups,
    spawn: 150,
    enemies: [
      { kind: "slime", x: 300, range: 60 },
      { kind: "slime", x: 560, range: 70 },
      { kind: "slime", x: 860, range: 60 },
      { kind: "slime", x: 1010, range: 50 },
      { kind: "slime", x: 1290, range: 60 },
    ],
    interactables: [
      { id: "door-home", x: 230, w: 24, label: "HOME", hintY: G_OUT - 40, to: { scene: "home", x: 66 } },
      { id: "door-guild", x: 700, w: 24, label: "GUILD", hintY: G_OUT - 40, to: { scene: "guild", x: 66 } },
      { id: "door-arcade", x: 1130, w: 24, label: "ARCADE", hintY: G_OUT - 40, to: { scene: "arcade", x: 66 } },
    ],
    draw(ctx, cam, t) {
      ensure();
      ctx.drawImage(L.sky!, 0, 0);
      for (const c of cloudSeeds) {
        const x = ((c.x + t * c.v) % (VIEW_W + 100)) - 50 - cam * 0.05;
        drawCloud(ctx, Math.round(x), c.y, c.s);
      }
      ctx.drawImage(L.far!, -Math.round(cam * 0.12), 0);
      ctx.drawImage(L.mid!, -Math.round(cam * 0.4), 0);
      ctx.drawImage(L.near!, -Math.round(cam), 0);
      // 鳥
      for (let i = 0; i < 2; i++) {
        const bx = ((t * 22 + i * 220) % (VIEW_W + 60)) - 30;
        const by = 60 + i * 28 + Math.sin(t * 2 + i) * 4;
        const flap = Math.floor(t * 6 + i) % 2;
        px(ctx, OL, bx - 3, by + (flap ? -1 : 1), 3, 1);
        px(ctx, OL, bx, by, 1, 1);
        px(ctx, OL, bx + 1, by + (flap ? -1 : 1), 3, 1);
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* 室内共通（村と同じ 4px ブロック・縁取りなしの単色ドット）             */
/* ------------------------------------------------------------------ */

function drawExitDoor(ctx: CanvasRenderingContext2D, x: number, color: string) {
  px(ctx, "#6b4430", x - 16, G_IN - 48, 32, 48);
  px(ctx, color, x - 12, G_IN - 44, 24, 44);
  px(ctx, "#00000026", x - 12, G_IN - 44, 24, 4);
  px(ctx, "#ffffff22", x - 8, G_IN - 36, 4, 28);
  px(ctx, "#fcd34d", x + 4, G_IN - 22, 4, 4);
  text(ctx, "EXIT", x, G_IN - 52, "#fde68a", 7, "center", "#6b4430");
}

function floorBlocks(ctx: CanvasRenderingContext2D, base: string, line: string, chip: string, seed: number) {
  px(ctx, base, 0, G_IN, VIEW_W, VIEW_H - G_IN);
  px(ctx, line, 0, G_IN, VIEW_W, 4);
  for (let y = G_IN + 16; y < VIEW_H; y += 16) px(ctx, line, 0, y, VIEW_W, 2);
  const r = rng(seed);
  for (let i = 0; i < 36; i++) px(ctx, chip, snap(r() * VIEW_W), snap(G_IN + 8 + r() * 40), 8, 4);
}

/* ------------------------------------------------------------------ */
/* HOME                                                                 */
/* ------------------------------------------------------------------ */

function createHome(): Scene {
  let layer: HTMLCanvasElement | undefined;
  const ensure = () => {
    if (layer) return;
    const { c, ctx } = makeCanvas(VIEW_W, VIEW_H);
    // 壁
    px(ctx, "#f6e3b4", 0, 0, VIEW_W, G_IN);
    for (let x = 0; x < VIEW_W; x += 32) px(ctx, "#efd79c", x, 0, 16, G_IN);
    px(ctx, "#b9783d", 0, 0, VIEW_W, 12);
    px(ctx, "#8a5a36", 0, 12, VIEW_W, 4);
    // 腰壁
    px(ctx, "#b9783d", 0, G_IN - 32, VIEW_W, 4);
    px(ctx, "#d9a56a", 0, G_IN - 28, VIEW_W, 28);
    for (let x = 0; x < VIEW_W; x += 40) px(ctx, "#c98a4b", x, G_IN - 28, 4, 28);
    floorBlocks(ctx, "#c98a4b", "#a86b35", "#d9a56a", 5);
    drawExitDoor(ctx, 44, "#a86b35");
    // ベッド
    px(ctx, "#8a5a36", 78, G_IN - 36, 8, 36);
    px(ctx, "#a86b35", 78, G_IN - 16, 72, 16);
    px(ctx, "#5aa9e6", 86, G_IN - 28, 64, 16);
    px(ctx, "#3f8fd0", 86, G_IN - 16, 64, 4);
    for (let x = 100; x < 146; x += 12) px(ctx, "#8cc8f5", x, G_IN - 24, 4, 4);
    px(ctx, "#ffffff", 88, G_IN - 32, 20, 8);
    // 窓
    px(ctx, "#b9783d", 228, 28, 52, 60);
    px(ctx, "#8fd3ff", 232, 32, 44, 48);
    px(ctx, "#b7e6ff", 232, 32, 44, 16);
    px(ctx, "#b9783d", 252, 32, 4, 48);
    px(ctx, "#b9783d", 232, 52, 44, 4);
    px(ctx, "#8a5a36", 224, 88, 60, 4);
    px(ctx, "#e0524a", 228, 28, 12, 56);
    px(ctx, "#e0524a", 268, 28, 12, 56);
    px(ctx, "#b93a34", 236, 28, 4, 56);
    px(ctx, "#b93a34", 268, 28, 4, 56);
    // 本棚
    px(ctx, "#8a5a36", 164, G_IN - 76, 44, 76);
    px(ctx, "#6b4430", 168, G_IN - 72, 36, 68);
    const cols = ["#e0524a", "#3b82f6", "#44b04b", "#f2b632", "#a855f7", "#14b8a6"];
    const r = rng(9);
    for (let i = 0; i < 4; i++) {
      const sy = G_IN - 72 + i * 17;
      let bx = 168;
      while (bx < 200) {
        const bh = 8 + Math.floor(r() * 2) * 4;
        px(ctx, cols[Math.floor(r() * cols.length)], bx, sy + 13 - bh, 4, bh);
        bx += 4;
      }
      px(ctx, "#8a5a36", 168, sy + 13, 36, 4);
    }
    // 観葉植物
    px(ctx, "#d2602a", 216, G_IN - 12, 16, 12);
    bdisc(ctx, "#2e8b3d", 224, G_IN - 24, 12);
    bdisc(ctx, "#44b04b", 220, G_IN - 28, 8);
    // 壁の地図
    px(ctx, "#8a5a36", 296, 54, 4, 8);
    px(ctx, "#8a5a36", 340, 54, 4, 8);
    px(ctx, "#b9783d", 288, 58, 64, 52);
    px(ctx, "#f3dfa2", 292, 62, 56, 44);
    px(ctx, "#6bc94f", 296, 66, 20, 12);
    px(ctx, "#6bc94f", 320, 82, 24, 16);
    px(ctx, "#8fd3ff", 316, 70, 8, 16);
    for (let i = 0; i < 6; i++) px(ctx, "#e0524a", 298 + i * 6, 90 - (i % 3) * 4, 4, 4);
    px(ctx, "#e0524a", 336, 68, 4, 12);
    px(ctx, "#e0524a", 332, 72, 12, 4);
    // ラグ
    px(ctx, "#ef7b7b", 244, G_IN + 8, 96, 12);
    px(ctx, "#fda4a4", 248, G_IN + 12, 88, 4);
    // 机 + PC
    px(ctx, "#c98a4b", 392, G_IN - 28, 68, 8);
    px(ctx, "#a86b35", 396, G_IN - 20, 8, 20);
    px(ctx, "#a86b35", 448, G_IN - 20, 8, 20);
    px(ctx, "#2b3350", 408, G_IN - 60, 40, 32);
    px(ctx, "#0f1630", 412, G_IN - 56, 32, 24);
    px(ctx, "#4b5563", 424, G_IN - 32, 8, 4);
    // 椅子
    px(ctx, "#e0524a", 366, G_IN - 24, 16, 8);
    px(ctx, "#e0524a", 366, G_IN - 44, 4, 20);
    px(ctx, "#8a5a36", 372, G_IN - 16, 4, 16);
    layer = c;
  };
  return {
    id: "home",
    title: "MY HOME",
    width: VIEW_W,
    ground: G_IN,
    theme: "indoor",
    platforms: [],
    pickups: [],
    spawn: 66,
    enemies: [],
    interactables: [
      { id: "exit", x: 44, w: 26, label: "밖으로 나가기", hintY: G_IN - 74, to: { scene: "village", x: 230 } },
      { id: "shelf", x: 186, w: 44, label: "책장 · 스킬", hintY: G_IN - 86, overlay: "skills" },
      { id: "map", x: 320, w: 60, label: "지도 · 나의 발자취", hintY: 48, overlay: "journey" },
      { id: "desk", x: 425, w: 70, label: "책상 · 내 정보", hintY: G_IN - 70, overlay: "profile" },
    ],
    draw(ctx, _cam, t) {
      ensure();
      ctx.drawImage(layer!, 0, 0);
      // 窓の外を流れる雲
      px(ctx, "#ffffff", 232 + (Math.floor(t * 2) % 8) * 4, 40, 12, 4);
      px(ctx, "#ffffff", 236 + (Math.floor(t * 2) % 8) * 4, 36, 8, 4);
      // モニターのコード
      const lines = [
        ["#f472b6", 3],
        ["#67e8f9", 6],
        ["#a3e635", 4],
        ["#fde047", 7],
        ["#c4b5fd", 5],
      ] as const;
      lines.forEach(([col, len], i) => {
        const shown = Math.min(len, Math.max(0, Math.floor((t * 5 + i * 2) % 12) - i));
        px(ctx, col, 416 + (i % 2) * 4, G_IN - 54 + i * 4, shown * 4, 2);
      });
      if (Math.floor(t * 2) % 2 === 0) px(ctx, "#ffffff", 436, G_IN - 38, 4, 4);
    },
  };
}

/* ------------------------------------------------------------------ */
/* GUILD                                                                */
/* ------------------------------------------------------------------ */

function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, seed: number) {
  const f = Math.sin(t * 12 + seed) > 0 ? 4 : 0;
  px(ctx, "rgba(251,146,60,0.18)", x - 12, y - 24, 24, 28);
  px(ctx, "#f97316", x - 4, y - 8, 8, 8);
  px(ctx, "#f97316", x - 4, y - 12 - f, 8, 8);
  px(ctx, "#fbbf24", x - 2, y - 12 - f, 4, 8);
  px(ctx, "#fff3a8", x - 2, y - 6, 4, 4);
}

function createGuild(): Scene {
  let layer: HTMLCanvasElement | undefined;
  const ensure = () => {
    if (layer) return;
    const { c, ctx } = makeCanvas(VIEW_W, VIEW_H);
    // 石壁
    px(ctx, "#a29db8", 0, 0, VIEW_W, G_IN);
    for (let y = 8, row = 0; y < G_IN; y += 16, row++) {
      px(ctx, "#8a84a3", 0, y + 12, VIEW_W, 4);
      for (let x = (row % 2) * 24; x < VIEW_W; x += 48) px(ctx, "#8a84a3", x, y, 4, 12);
    }
    px(ctx, "#4b4560", 0, 0, VIEW_W, 12);
    px(ctx, "#6f6883", 0, 12, VIEW_W, 4);
    floorBlocks(ctx, "#6f6883", "#5d5670", "#807997", 13);
    // 赤い絨毯
    px(ctx, "#d94a4a", 70, G_IN + 4, 380, 12);
    px(ctx, "#f2b632", 70, G_IN + 16, 380, 2);
    drawExitDoor(ctx, 44, "#6b4430");
    // 壁の紋章
    for (const bx of [108, 380]) {
      px(ctx, "#4467b8", bx - 12, 16, 24, 36);
      px(ctx, "#33519a", bx - 12, 48, 24, 4);
      px(ctx, "#f2b632", bx - 4, 24, 8, 8);
      px(ctx, "#f2b632", bx - 8, 36, 16, 4);
      px(ctx, "#4467b8", bx - 8, 52, 16, 4);
      px(ctx, "#4467b8", bx - 4, 56, 8, 4);
    }
    // トーチ台
    for (const tx of [182, 262]) px(ctx, "#6b4430", tx - 2, 66, 4, 14);
    // カウンター
    px(ctx, "#a86b35", 118, G_IN - 28, 90, 28);
    px(ctx, "#d9a56a", 118, G_IN - 32, 90, 4);
    for (let x = 126; x < 204; x += 20) px(ctx, "#8a5a36", x, G_IN - 20, 12, 16);
    // 掲示板
    px(ctx, "#8a5a36", 268, 76, 92, 76);
    px(ctx, "#c98a4b", 272, 80, 84, 68);
    for (let y = 88; y < 148; y += 12) px(ctx, "#b9783d", 272, y, 84, 2);
    const paper = ["#fef3c7", "#e0f2fe", "#fce7f3", "#ecfccb", "#fef9c3", "#ede9fe"];
    const spots = [
      [278, 84],
      [306, 88],
      [334, 84],
      [282, 114],
      [310, 116],
      [336, 112],
    ];
    spots.forEach(([sx, sy], i) => {
      px(ctx, paper[i], sx, sy, 20, 24);
      for (let ly = 0; ly < 3; ly++) px(ctx, "#8b93a1", sx + 4, sy + 8 + ly * 4, 12 - ly * 2, 2);
      px(ctx, "#e0524a", sx + 8, sy + 2, 4, 4);
    });
    layer = c;
  };

  const npcSpeech = ["어서와요, 모험가!", "게시판에서 퀘스트를 골라봐요", "저 허수아비도 때려봐요!"];

  return {
    id: "guild",
    title: "ADVENTURER'S GUILD",
    width: VIEW_W,
    ground: G_IN,
    theme: "indoor",
    platforms: [],
    pickups: [],
    spawn: 66,
    enemies: [{ kind: "dummy", x: 430, range: 0 }],
    interactables: [
      { id: "exit", x: 44, w: 26, label: "밖으로 나가기", hintY: G_IN - 74, to: { scene: "village", x: 700 } },
      { id: "board", x: 314, w: 96, label: "퀘스트 게시판", hintY: 64, overlay: "board" },
    ],
    draw(ctx, _cam, t) {
      ensure();
      ctx.drawImage(layer!, 0, 0);
      drawFlame(ctx, 182, 66, t, 0);
      drawFlame(ctx, 262, 66, t, 2);
      // 受付NPC
      const nx = 160;
      const nb = Math.floor(t * 2) % 2 ? 0 : 4;
      px(ctx, "#8e5bd6", nx - 8, G_IN - 44 + nb, 16, 12);
      px(ctx, "#f1c9a0", nx - 8, G_IN - 60 + nb, 16, 16);
      px(ctx, "#f2b632", nx - 12, G_IN - 64 + nb, 24, 8);
      px(ctx, "#f2b632", nx - 8, G_IN - 72 + nb, 16, 8);
      px(ctx, "#111111", nx - 4, G_IN - 52 + nb, 4, 4);
      px(ctx, "#111111", nx + 4, G_IN - 52 + nb, 4, 4);
      px(ctx, "#d9a56a", 118, G_IN - 32, 90, 4);
      // 吹き出し
      const msg = npcSpeech[Math.floor(t / 3) % npcSpeech.length];
      const bw = Math.max(64, msg.length * 7 + 12);
      const bx = Math.round(nx - bw / 2);
      const by = G_IN - 102 + (Math.floor(t * 2) % 2 ? 0 : 2);
      px(ctx, "#00000030", bx + 2, by + 2, bw, 16);
      px(ctx, "#ffffff", bx, by, bw, 16);
      px(ctx, "#ffffff", nx - 2, by + 16, 8, 4);
      text(ctx, msg, bx + bw / 2, by + 11, "#1f2937", 8, "center");
    },
  };
}

/* ------------------------------------------------------------------ */
/* ARCADE                                                               */
/* ------------------------------------------------------------------ */

function createArcade(): Scene {
  let layer: HTMLCanvasElement | undefined;
  const cabinets = [
    { x: 130, color: "#3b82f6" },
    { x: 190, color: "#44b04b" },
    { x: 400, color: "#f2b632" },
    { x: 446, color: "#ec4899" },
  ];
  const ensure = () => {
    if (layer) return;
    const { c, ctx } = makeCanvas(VIEW_W, VIEW_H);
    px(ctx, "#2b1d5a", 0, 0, VIEW_W, G_IN);
    for (let x = 0; x < VIEW_W; x += 32) px(ctx, "#3a2a74", x, 0, 4, G_IN);
    for (let y = 8; y < G_IN; y += 32) px(ctx, "#3a2a74", 0, y, VIEW_W, 4);
    // 床（チェッカー）
    for (let y = G_IN, row = 0; y < VIEW_H; y += 16, row++) {
      for (let x = 0, col = 0; x < VIEW_W; x += 32, col++) px(ctx, (row + col) % 2 ? "#3b2a78" : "#2f2163", x, y, 32, 16);
    }
    px(ctx, "#67e8f9", 0, G_IN, VIEW_W, 4);
    drawExitDoor(ctx, 44, "#4338ca");
    const cab = (x: number, color: string, big = false) => {
      const w = big ? 44 : 36;
      const h = big ? 80 : 64;
      px(ctx, "#4a4290", x - w / 2, G_IN - h, w, h);
      px(ctx, color, x - w / 2, G_IN - h, w, 8);
      px(ctx, "#1c1740", x - w / 2 + 4, G_IN - h + 12, w - 8, big ? 32 : 24);
      px(ctx, "#322b6e", x - w / 2 + 4, G_IN - h * 0.4, w - 8, 8);
      px(ctx, "#e0524a", x - 10, G_IN - h * 0.4 + 2, 4, 4);
      px(ctx, "#fde047", x + 2, G_IN - h * 0.4 + 2, 4, 4);
      px(ctx, "#67e8f9", x + 8, G_IN - h * 0.4 + 2, 4, 4);
      px(ctx, color, x - w / 2, G_IN - 8, w, 4);
    };
    for (const cb of cabinets) cab(cb.x, cb.color);
    cab(310, "#ef4444", true);
    px(ctx, "#0f0a24", 284, G_IN - 96, 52, 12); // マーキー
    px(ctx, "#0f0a24", 188, 24, 104, 28); // ネオン看板の台
    layer = c;
  };

  return {
    id: "arcade",
    title: "NEON ARCADE",
    width: VIEW_W,
    ground: G_IN,
    theme: "indoor",
    platforms: [],
    pickups: [],
    spawn: 66,
    enemies: [],
    interactables: [
      { id: "exit", x: 44, w: 26, label: "밖으로 나가기", hintY: G_IN - 74, to: { scene: "village", x: 1130 } },
      { id: "bugs", x: 310, w: 48, label: "BUG SQUASH · 미니게임", hintY: G_IN - 104, overlay: "bugs" },
    ],
    draw(ctx, _cam, t) {
      ensure();
      ctx.drawImage(layer!, 0, 0);
      const flick = Math.sin(t * 25) > 0.92 ? 0.35 : 1;
      ctx.globalAlpha = flick;
      px(ctx, "rgba(244,114,182,0.18)", 176, 16, 128, 44);
      text(ctx, "ARCADE", 240, 45, "#f9a8d4", 16, "center");
      text(ctx, "ARCADE", 240, 44, "#ec4899", 16, "center");
      ctx.globalAlpha = 1;
      text(ctx, "BUG SQUASH", 310, G_IN - 86, Math.floor(t * 3) % 2 ? "#fde047" : "#ffffff", 8, "center");
      const screen = (x: number, w: number, y: number, h: number, seed: number, bug = false) => {
        px(ctx, "#0b0820", x, y, w, h);
        if (bug) {
          [-12, 0, 12].forEach((hx, i) => {
            px(ctx, "#3b2a78", 310 + hx - 4, y + h - 8, 8, 4);
            if (Math.floor(t * 2 + i * 1.7) % 3 === 0) {
              px(ctx, "#a3e635", 310 + hx - 4, y + h - 16, 8, 8);
              px(ctx, "#0b0820", 310 + hx - 2, y + h - 14, 2, 2);
              px(ctx, "#0b0820", 310 + hx + 2, y + h - 14, 2, 2);
            }
          });
          return;
        }
        const cols = ["#22d3ee", "#a3e635", "#f472b6", "#fde047"];
        for (let i = 0; i < 4; i++) {
          const k = Math.floor(t * 4 + seed + i * 3);
          px(ctx, cols[k % cols.length], x + 4 + ((k * 8 + i * 12) % (w - 12)), y + 4 + ((k * 4 + i * 8) % (h - 12)), 4, 4);
        }
      };
      screen(130 - 14, 28, G_IN - 52, 24, 0);
      screen(190 - 14, 28, G_IN - 52, 24, 1);
      screen(400 - 14, 28, G_IN - 52, 24, 2);
      screen(446 - 14, 28, G_IN - 52, 24, 3);
      screen(288, 44, G_IN - 68, 32, 4, true);
    },
  };
}

export function createScene(id: SceneId): Scene {
  switch (id) {
    case "village":
      return createVillage();
    case "home":
      return createHome();
    case "guild":
      return createGuild();
    case "arcade":
      return createArcade();
  }
}
