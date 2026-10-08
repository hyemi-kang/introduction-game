"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Quest, Shot } from "@/data/profile";

const RANK_COLOR: Record<Quest["rank"], string> = { S: "#a855f7", A: "#ef4444", B: "#3b82f6", C: "#22c55e" };

type R = (x: number, y: number, w: number, h: number, f: string) => React.ReactNode;
const rect: R = (x, y, w, h, f) => <rect key={`${x}-${y}-${w}-${h}-${f}`} x={x} y={y} width={w} height={h} fill={f} />;

/** 画像が無いとき用のドット絵風サンプル画面（160x90） */
function Mock({ kind, accent }: { kind: Shot["kind"]; accent: string }) {
  const bg = "#fffdf5";
  const ink = "#3b1d0a";
  const line = "#c9b99a";
  const parts: React.ReactNode[] = [rect(0, 0, 160, 90, bg), rect(0, 0, 160, 8, accent), rect(4, 2, 28, 4, "#ffffff"), rect(120, 2, 8, 4, "#ffffff88"), rect(132, 2, 8, 4, "#ffffff88"), rect(144, 2, 8, 4, "#ffffff88")];

  if (kind === "hero") {
    parts.push(rect(0, 8, 160, 44, "#8fd3ff"), rect(0, 40, 160, 12, "#6bc94f"), rect(100, 14, 16, 16, "#ffe066"));
    parts.push(rect(10, 28, 20, 12, "#b0dcf8"), rect(24, 22, 24, 18, "#b0dcf8"), rect(60, 30, 36, 10, "#8fe39e"));
    parts.push(rect(16, 16, 56, 6, ink), rect(16, 26, 36, 3, ink + "99"));
    parts.push(rect(60, 34, 20, 18, "#e0524a"), rect(56, 30, 28, 6, "#b93a34"), rect(66, 42, 6, 10, "#8a5a36"));
    parts.push(rect(10, 58, 44, 24, "#ffffff"), rect(58, 58, 44, 24, "#ffffff"), rect(106, 58, 44, 24, "#ffffff"));
    [10, 58, 106].forEach((x, i) => {
      parts.push(rect(x, 58, 44, 12, [accent, "#f2b632", "#44b04b"][i]), rect(x + 3, 74, 28, 3, line));
    });
  } else if (kind === "cards") {
    parts.push(rect(6, 12, 40, 6, "#ffffff"), rect(6, 12, 40, 1, line), rect(50, 12, 14, 6, accent), rect(68, 12, 14, 6, line));
    [0, 1, 2].forEach((c) =>
      [0, 1].forEach((r) => {
        const x = 6 + c * 50;
        const y = 24 + r * 32;
        parts.push(rect(x, y, 46, 28, "#ffffff"), rect(x, y, 46, 1, line), rect(x, y, 46, 16, ["#f2b632", "#e0524a", "#44b04b", "#3b82f6", "#a855f7", "#14b8a6"][c + r * 3]));
        parts.push(rect(x + 3, y + 19, 30, 3, ink + "aa"), rect(x + 3, y + 24, 20, 2, line));
      }),
    );
  } else if (kind === "page") {
    parts.push(rect(8, 14, 62, 50, accent + "55"), rect(14, 22, 50, 34, accent), rect(22, 30, 14, 14, "#ffffff55"), rect(44, 40, 12, 12, "#ffffff44"));
    parts.push(rect(78, 16, 60, 6, ink), rect(78, 28, 70, 3, line), rect(78, 34, 66, 3, line), rect(78, 40, 72, 3, line), rect(78, 46, 50, 3, line));
    parts.push(rect(78, 54, 30, 10, accent), rect(82, 58, 22, 2, "#ffffff"));
    [8, 40, 72, 104].forEach((x) => parts.push(rect(x, 70, 28, 14, "#ffffff"), rect(x, 70, 28, 1, line), rect(x + 3, 74, 18, 2, line)));
  } else if (kind === "chart") {
    parts.push(rect(10, 14, 2, 64, ink), rect(10, 76, 140, 2, ink));
    [30, 46, 38, 58, 50, 64, 44].forEach((h, i) => parts.push(rect(18 + i * 19, 76 - h, 12, h, i % 2 ? accent : accent + "aa")));
    [0, 1, 2].forEach((i) => parts.push(rect(12, 28 + i * 16, 138, 1, line)));
    parts.push(rect(104, 14, 40, 10, "#ffffff"), rect(104, 14, 40, 1, line), rect(108, 18, 10, 3, accent), rect(122, 18, 18, 3, line));
  } else if (kind === "chat") {
    const bub = (x: number, y: number, w: number, me: boolean) => {
      parts.push(rect(x, y, w, 12, me ? accent : "#ffffff"), rect(x, y, w, 1, line));
      parts.push(rect(x + 4, y + 4, w - 12, 2, me ? "#ffffff" : ink + "88"));
    };
    parts.push(rect(0, 8, 28, 82, "#4a154b"));
    [0, 1, 2, 3].forEach((i) => parts.push(rect(6, 16 + i * 10, 16, 3, "#ffffff55")));
    bub(34, 14, 70, false);
    bub(60, 30, 80, true);
    bub(34, 46, 90, false);
    bub(70, 62, 70, true);
  } else {
    parts.push(rect(0, 8, 160, 82, "#1e1b3a"));
    const cols = ["#f472b6", "#67e8f9", "#a3e635", "#fde047", "#c4b5fd"];
    for (let i = 0; i < 9; i++) {
      const indent = [0, 8, 8, 16, 16, 8, 0, 8, 0][i];
      parts.push(rect(8, 14 + i * 8, 4, 3, "#ffffff33"), rect(16 + indent, 14 + i * 8, 14 + ((i * 17) % 50), 3, cols[i % cols.length]));
      if (i % 3 === 0) parts.push(rect(90 + (i % 2) * 10, 14 + i * 8, 24, 3, cols[(i + 2) % cols.length]));
    }
    parts.push(rect(128, 14, 24, 24, accent + "55"), rect(132, 18, 16, 3, "#ffffff"), rect(132, 24, 12, 3, "#ffffff88"));
  }

  return (
    <svg viewBox="0 0 160 90" className="block h-full w-full" shapeRendering="crispEdges" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {parts}
    </svg>
  );
}

/** 実画像があれば画像、無ければ（または読み込み失敗なら）サンプル画面 */
export function ShotView({ shot, quest, className = "" }: { shot: Shot; quest: Quest; className?: string }) {
  const [failed, setFailed] = useState(false);
  const real = !!shot.src && !failed;
  return (
    <div className={`relative overflow-hidden bg-[#fffdf5] ${className}`}>
      {real ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shot.src} alt={shot.caption} className="pixelated h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <>
          <Mock kind={shot.kind} accent={RANK_COLOR[quest.rank]} />
          <span className="absolute bottom-1 right-1 bg-black/55 px-1 text-[9px] text-white/90">SAMPLE</span>
        </>
      )}
    </div>
  );
}

/** 詳細用ギャラリー（前後ボタン・ドット・拡大表示） */
export function ShotGallery({ quest }: { quest: Quest }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const n = quest.shots.length;
  const shot = quest.shots[idx];

  useLayoutEffect(() => {
    gsap.fromTo(frameRef.current, { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.25, ease: "power2.out" });
  }, [idx]);

  const go = (d: number) => setIdx((i) => (i + d + n) % n);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft") go(-1);
      else if (e.code === "ArrowRight") go(1);
      else if (e.code === "Escape" && zoom) {
        e.stopPropagation();
        setZoom(false);
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, n]);

  return (
    <div data-reveal className="flex flex-col gap-2">
      <div className="relative">
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="block w-full cursor-zoom-in border-4 border-[#3b1d0a] p-0"
          aria-label="이미지 크게 보기"
        >
          <div ref={frameRef}>
            <ShotView shot={shot} quest={quest} className="aspect-video max-h-[240px] w-full" />
          </div>
        </button>
        {n > 1 && (
          <>
            <button type="button" className="px-btn absolute left-1 top-1/2 -translate-y-1/2 !px-2.5" onClick={() => go(-1)} aria-label="이전 이미지">
              ◀
            </button>
            <button type="button" className="px-btn absolute right-1 top-1/2 -translate-y-1/2 !px-2.5" onClick={() => go(1)} aria-label="다음 이미지">
              ▶
            </button>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span>
          🖼 {shot.caption}
          <span className="ml-2 opacity-50">(클릭하면 크게 보기)</span>
        </span>
        <span className="flex gap-1">
          {quest.shots.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`${i + 1}번 이미지`}
              className="h-2.5 w-2.5 border-0 p-0"
              style={{ background: i === idx ? "#3b1d0a" : "#3b1d0a44" }}
            />
          ))}
        </span>
      </div>

      {zoom && <Lightbox shot={shot} quest={quest} onClose={() => setZoom(false)} />}
    </div>
  );
}

function Lightbox({ shot, quest, onClose }: { shot: Shot; quest: Quest; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    gsap.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    gsap.fromTo(boxRef.current, { scale: 0.6 }, { scale: 1, duration: 0.35, ease: "back.out(1.6)" });
  }, []);
  return createPortal(
    <div ref={ref} className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div ref={boxRef} className="w-[min(900px,94vw)] border-4 border-[#3b1d0a] bg-[#3b1d0a] text-white" onClick={(e) => e.stopPropagation()}>
        <ShotView shot={shot} quest={quest} className="aspect-video w-full" />
        <div className="flex items-center justify-between px-3 py-2 text-sm">
          <span>{shot.caption}</span>
          <button type="button" className="px-btn red" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
