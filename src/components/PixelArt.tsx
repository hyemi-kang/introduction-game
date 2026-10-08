import { memo } from "react";

export type Palette = Record<string, string>;

interface Props {
  rows: string[];
  palette: Palette;
  size?: number;
  className?: string;
  title?: string;
}

/** 文字グリッド → SVG ピクセルアート。'.' は透明 */
export const PixelArt = memo(function PixelArt({ rows, palette, size = 4, className, title }: Props) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const rects: React.ReactNode[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = palette[row[x]];
      if (c) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={c} />);
    }
  });
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w * size}
      height={h * size}
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  );
});

export const heartRows = [
  ".11...11.",
  "1221.1221",
  "122212221",
  "122222221",
  ".1222221.",
  "..12221..",
  "...121...",
  "....1....",
];
export const heartFull: Palette = { "1": "#4a0d0d", "2": "#ef4444" };
export const heartEmpty: Palette = { "1": "#1f2937", "2": "#4b5563" };

export const coinRows = [
  "..1111..",
  ".122221.",
  "12233221",
  "12322321",
  "12322321",
  "12233221",
  ".122221.",
  "..1111..",
];
export const coinPal: Palette = { "1": "#92400e", "2": "#fbbf24", "3": "#fde68a" };

export const bugRows = [
  "..1....1..",
  "...1..1...",
  "..111111..",
  ".11222211.",
  "1122222211",
  "1.122221.1",
  "1.122221.1",
  "..122221..",
  "...1111...",
  "..1....1..",
];
export const bugPal: Palette = { "1": "#14301a", "2": "#84cc16", "3": "#ffffff" };
export const goldBugPal: Palette = { "1": "#78350f", "2": "#fbbf24", "3": "#ffffff" };

export const bombRows = [
  "......3...",
  ".....31...",
  "....11....",
  "..111111..",
  ".11222211.",
  "1122222211",
  "1222222221",
  "1222222221",
  ".12222221.",
  "..111111..",
];
export const bombPal: Palette = { "1": "#0b0b14", "2": "#475569", "3": "#f97316" };

export const footRows = [
  ".1111.",
  "122221",
  "122221",
  "122221",
  ".1221.",
  "..11..",
  ".111..",
  ".121..",
  ".111..",
];
export const footPal: Palette = { "1": "#5b2a12", "2": "#8a4a22" };

const iconPal: Palette = { "1": "#3b1d0a", "2": "#ef4444", "3": "#fde047", "4": "#ffffff", "5": "#60a5fa", "6": "#a16207" };

export const iconRows: Record<string, string[]> = {
  flag: [
    "1111111..",
    "1222221..",
    "1222221..",
    "1111111..",
    "1........",
    "1........",
    "1........",
    "1........",
  ],
  book: [
    ".1111111.",
    "15555551.",
    "15444551.",
    "15555551.",
    "15444551.",
    "15555551.",
    ".1111111.",
  ],
  code: [
    "1.......1",
    ".1.....1.",
    "..1.1.1..",
    "...111...",
    "..1.1.1..",
    ".1.....1.",
    "1.......1",
  ],
  briefcase: [
    "...111...",
    "...1.1...",
    "111111111",
    "166666661",
    "163333361",
    "166666661",
    "111111111",
  ],
  trophy: [
    "113333311",
    "133333331",
    "133333331",
    ".1333331.",
    "..13331..",
    "...131...",
    "..11111..",
  ],
  star: [
    "....1....",
    "...131...",
    "111333111",
    ".1333331.",
    "..13331..",
    ".131.131.",
    ".11...11.",
  ],
};
export const iconPalette = iconPal;
