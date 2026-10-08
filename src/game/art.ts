export const FONT = '"Galmuri9", "DotGothic16", monospace';

export function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

export function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** 縁取り付き矩形 */
export function pxo(ctx: CanvasRenderingContext2D, fill: string, outline: string, x: number, y: number, w: number, h: number) {
  px(ctx, outline, x - 1, y - 1, w + 2, h + 2);
  px(ctx, fill, x, y, w, h);
}

/** ピクセル円（塗り） */
export function disc(ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, r: number) {
  ctx.fillStyle = color;
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy) + 0.5);
    ctx.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1);
  }
}

/** ピクセル三角形（頂点が上） */
export function tri(ctx: CanvasRenderingContext2D, color: string, cx: number, baseY: number, halfW: number, h: number) {
  ctx.fillStyle = color;
  for (let i = 0; i < h; i++) {
    const w = Math.round((halfW * (i + 1)) / h);
    ctx.fillRect(Math.round(cx - w), Math.round(baseY - h + i), w * 2, 1);
  }
}

export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  color: string,
  size = 8,
  align: CanvasTextAlign = "left",
  shadow?: string,
) {
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, Math.round(x), Math.round(y));
}

export function lerpColor(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `rgb(${r},${g},${bl})`;
}

/* ------------------------------------------------------------------ */
/* 主人公                                                              */
/* ------------------------------------------------------------------ */

export interface HeroPose {
  dir: 1 | -1;
  moving: boolean;
  air: boolean;
  /** 経過秒（アニメ用） */
  t: number;
  /** 攻撃進行 0..1。攻撃中でなければ -1 */
  atk: number;
  /** 空中での上昇(-1) / 下降(1) / 0 */
  vy?: number;
}

// 레퍼런스(거북이 도트)처럼: 윤곽선 없는 큼직한 단색 도트. 1칸 = 3px
const HERO_CELL = 3;
const OL = "#7a4e2a"; // かかし等の縁取り（柔らかい茶色）
const T_PAL: Record<string, string> = {
  G: "#44b04b", // 등껍질
  g: "#2f8f3d", // 등껍질 무늬
  L: "#8fcf3f", // 피부
  l: "#6aa82e", // 배
  E: "#111111", // 눈
};
const T_BODY = [
  "...GGGG.....",
  "..GGgGGG....",
  ".GGGGGGG.LL.",
  ".GGgGGgGLLEL",
  ".GGGGGGGLLLL",
  "LLGGGGGGGLL.",
  ".lllllllll..",
];
const T_LEGS = {
  stand: ".LL.....LL..",
  stepA: "..LL...LL...",
  stepB: ".LL...LL....",
  air: "..LL...LL...",
  fall: ".L.......L..",
};

function blit(ctx: CanvasRenderingContext2D, rows: string[], pal: Record<string, string>, x0: number, y0: number, cell: number) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const c = pal[row[x]];
      if (c) px(ctx, c, x0 + x * cell, y0 + y * cell, cell, cell);
    }
  }
}

/** (fx, fy) = 足元中央。向きは dir で左右反転 */
export function drawHero(ctx: CanvasRenderingContext2D, fx: number, fy: number, o: HeroPose) {
  ctx.save();
  ctx.translate(Math.round(fx), Math.round(fy));
  ctx.scale(o.dir, 1);

  const run = o.moving && !o.air;
  const frame = run ? Math.floor(o.t * 8) % 4 : 0;
  const hop = run && frame % 2 === 1 ? -HERO_CELL : 0;
  const blink = Math.floor(o.t * 1.2) % 6 === 0 && Math.floor(o.t * 14) % 3 === 0;

  const legs = o.air
    ? (o.vy ?? 0) > 0
      ? T_LEGS.fall
      : T_LEGS.air
    : run
      ? [T_LEGS.stand, T_LEGS.stepA, T_LEGS.stand, T_LEGS.stepB][frame]
      : T_LEGS.stand;

  const rows = [...T_BODY, legs];
  const pal = { ...T_PAL, E: blink ? T_PAL.L : T_PAL.E };
  const x0 = -6 * HERO_CELL;
  const y0 = -rows.length * HERO_CELL + hop;
  blit(ctx, rows, pal, x0, y0, HERO_CELL);

  // 攻撃：甲羅の前で剣を振り下ろす
  if (o.atk >= 0) {
    const ang = (-115 + 165 * Math.min(1, o.atk * 1.25)) * (Math.PI / 180);
    ctx.save();
    ctx.translate(9, -13 + hop);
    ctx.rotate(ang);
    px(ctx, "#8a5a36", -2, -2, 4, 7); // 柄
    px(ctx, "#f2b632", -5, -5, 10, 3); // 鍔
    px(ctx, "#e8eef7", -2, -26, 4, 21); // 刀身
    px(ctx, "#aab6c8", 0, -26, 2, 21);
    px(ctx, "#ffffff", -2, -26, 2, 6);
    ctx.restore();
  }

  ctx.restore();
}

/** 斬撃エフェクト（弧）。progress 0..1 */
export function drawSlash(ctx: CanvasRenderingContext2D, fx: number, fy: number, dir: 1 | -1, progress: number) {
  if (progress < 0.12 || progress > 0.95) return;
  const k = (progress - 0.12) / 0.83;
  ctx.save();
  ctx.translate(Math.round(fx + dir * 6), Math.round(fy - 14));
  ctx.scale(dir, 1);
  ctx.globalAlpha = 1 - k * 0.7;
  const a0 = -1.9 + k * 1.6;
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (i / steps) * 1.5;
    // 先端ほど太く・白く（3px ブロックで描く）
    const w = i > steps * 0.6 ? 6 : 3;
    for (const r of [15, 18, 21, 24]) {
      const x = Math.round((Math.cos(a) * r) / 3) * 3;
      const y = Math.round((Math.sin(a) * r + 4) / 3) * 3;
      px(ctx, r >= 21 ? "#ffffff" : r === 18 ? "#cfe9ff" : "#8cc8ff", x, y, w === 6 ? 6 : 3, 3);
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* 敵 / オブジェクト                                                    */
/* ------------------------------------------------------------------ */

const SLIME_ROWS = ["..BBBB..", ".BwBBBB.", "BBkBBkBB", "BBBBBBBB", "BBBBBBBB", "DDDDDDDD"];

export function drawSlime(ctx: CanvasRenderingContext2D, fx: number, fy: number, squash: number, flash: boolean, _t: number) {
  const pal: Record<string, string> = flash
    ? { B: "#ffffff", w: "#ffffff", k: "#ffffff", D: "#ffffff" }
    : { B: "#8fe9d0", w: "#e6fff7", k: "#2b2b3f", D: "#58cdb0" };
  ctx.save();
  ctx.translate(Math.round(fx), Math.round(fy));
  ctx.scale(1 + squash * 0.2, 1 - squash * 0.25);
  blit(ctx, SLIME_ROWS, pal, -8, -12, 2);
  ctx.restore();
}

export function drawDummy(ctx: CanvasRenderingContext2D, fx: number, fy: number, wob: number, flash: boolean) {
  ctx.save();
  ctx.translate(Math.round(fx), Math.round(fy));
  // 台
  pxo(ctx, "#8a5a36", OL, -8, -3, 16, 3);
  ctx.translate(0, -3);
  ctx.rotate(wob);
  const wood = flash ? "#ffffff" : "#c08a55";
  pxo(ctx, wood, OL, -2, -26, 4, 26);
  pxo(ctx, flash ? "#ffffff" : "#e8c27a", OL, -9, -22, 18, 5); // 腕木
  pxo(ctx, flash ? "#ffffff" : "#e8c27a", OL, -5, -34, 10, 10); // 頭（わら）
  px(ctx, OL, -3, -31, 2, 2);
  px(ctx, OL, 1, -31, 2, 2);
  px(ctx, "#ef4444", -5, -22, 10, 2);
  ctx.restore();
}

export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const phase = Math.abs(Math.cos(t * 4));
  const rx = Math.max(1, 5.5 * phase);
  const cy = Math.round(y + Math.sin(t * 3 + x) * 1.2);
  const ell = (color: string, a: number, b: number) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(Math.round(x), cy, a, b, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  ell("#b86a14", rx + 1, 6.5);
  ell("#ffd23f", rx, 5.5);
  if (rx > 2.5) {
    ell("#f5a91f", rx * 0.62, 3.6);
    px(ctx, "#fff3b0", x - rx * 0.55, cy - 3, 1, 3);
  }
}

export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, full: boolean) {
  const rows = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"];
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < 8; rx++) {
      if (row[rx] === "1") px(ctx, full ? "#ef4444" : "#4b5563", x + rx, y + ry, 1, 1);
    }
  });
}
