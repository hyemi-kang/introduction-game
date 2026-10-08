"use client";

import gsap from "gsap";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { journey } from "@/data/profile";
import { footPal, footRows, iconPalette, iconRows } from "./PixelArt";
import Overlay from "./Overlay";

const MAP_W = 800;
const MAP_H = 420;
const NODES: [number, number][] = [
  [90, 330],
  [220, 190],
  [380, 300],
  [520, 150],
  [640, 290],
  [720, 110],
];
const STEP = 24;

type Pt = { x: number; y: number };

/** Catmull-Rom で滑らかな折れ線を作る */
function sampleSpline(points: [number, number][], per = 40): Pt[] {
  const out: Pt[] = [];
  const p = [points[0], ...points, points[points.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0[0], p1[0], p2[0], p3[0]), y: f(p0[1], p1[1], p2[1], p3[1]) });
    }
  }
  out.push({ x: points[points.length - 1][0], y: points[points.length - 1][1] });
  return out;
}

function buildTrail() {
  const dense = sampleSpline(NODES);
  // 各ノードに対応する dense インデックス
  const nodeDense = NODES.map((_, i) => (i === NODES.length - 1 ? dense.length - 1 : i * 40));
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].y - dense[i - 1].y));
  const total = cum[cum.length - 1];

  const feet: { x: number; y: number; rot: number; left: boolean }[] = [];
  const nodeStep: number[] = [];
  let di = 0;
  let nextNode = 0;
  for (let d = 0, k = 0; d <= total; d += STEP, k++) {
    while (di < dense.length - 2 && cum[di + 1] < d) di++;
    const a = dense[di];
    const b = dense[Math.min(di + 1, dense.length - 1)];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const left = k % 2 === 0;
    const off = (left ? -1 : 1) * 5;
    feet.push({
      x: a.x + Math.cos(ang + Math.PI / 2) * off,
      y: a.y + Math.sin(ang + Math.PI / 2) * off,
      rot: (ang * 180) / Math.PI + 90,
      left,
    });
    while (nextNode < NODES.length && cum[nodeDense[nextNode]] <= d + STEP / 2 && cum[nodeDense[nextNode]] >= d - STEP / 2) {
      nodeStep[nextNode] = k;
      nextNode++;
    }
  }
  nodeStep[NODES.length - 1] = feet.length - 1;
  for (let i = 0; i < NODES.length; i++) if (nodeStep[i] === undefined) nodeStep[i] = Math.min(feet.length - 1, Math.round(cum[nodeDense[i]] / STEP));
  const pathD = dense.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return { feet, nodeStep, pathD };
}

function PixelIcon({ name, size = 2.4 }: { name: string; size?: number }) {
  const rows = iconRows[name] ?? iconRows.star;
  const w = Math.max(...rows.map((r) => r.length));
  return (
    <g transform={`translate(${(-w * size) / 2} ${(-rows.length * size) / 2})`}>
      {rows.flatMap((row, y) =>
        Array.from(row).map((ch, x) =>
          iconPalette[ch] ? <rect key={`${x}-${y}`} x={x * size} y={y * size} width={size + 0.2} height={size + 0.2} fill={iconPalette[ch]} /> : null,
        ),
      )}
    </g>
  );
}

const footW = 6;
const footH = 9;

function Foot({ left }: { left: boolean }) {
  const s = 1.7;
  return (
    <g transform={`scale(${left ? -s : s} ${s}) translate(${-footW / 2} ${-footH / 2})`}>
      {footRows.flatMap((row, y) =>
        Array.from(row).map((ch, x) => (footPal[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width={1.05} height={1.05} fill={footPal[ch]} /> : null)),
      )}
    </g>
  );
}

function Decor() {
  const items = useMemo(() => {
    let a = 11;
    const r = () => {
      a = (a * 1664525 + 1013904223) % 4294967296;
      return a / 4294967296;
    };
    const arr: { kind: "tree" | "mount" | "lake"; x: number; y: number; s: number }[] = [];
    for (let i = 0; i < 34; i++) {
      const x = 20 + r() * (MAP_W - 40);
      const y = 20 + r() * (MAP_H - 40);
      // 道の近くは避ける
      if (NODES.some(([nx, ny]) => Math.hypot(nx - x, ny - y) < 60)) continue;
      arr.push({ kind: r() < 0.55 ? "tree" : r() < 0.7 ? "mount" : "lake", x, y, s: 0.8 + r() * 0.7 });
    }
    return arr;
  }, []);
  return (
    <g opacity={0.5}>
      {items.map((it, i) =>
        it.kind === "tree" ? (
          <g key={i} transform={`translate(${it.x} ${it.y}) scale(${it.s})`}>
            <rect x={-1} y={4} width={3} height={5} fill="#7a4e34" />
            <rect x={-6} y={-4} width={13} height={9} fill="#3f8f55" />
            <rect x={-4} y={-8} width={9} height={5} fill="#4fa968" />
          </g>
        ) : it.kind === "mount" ? (
          <g key={i} transform={`translate(${it.x} ${it.y}) scale(${it.s})`}>
            <polygon points="-14,8 0,-12 14,8" fill="#8a7a6a" />
            <polygon points="-4,-4 0,-12 4,-4" fill="#fff" />
          </g>
        ) : (
          <g key={i} transform={`translate(${it.x} ${it.y}) scale(${it.s})`}>
            <rect x={-14} y={-4} width={28} height={9} fill="#7cc0f7" />
            <rect x={-8} y={-8} width={16} height={4} fill="#7cc0f7" />
            <rect x={-6} y={0} width={6} height={1} fill="#fff" />
          </g>
        ),
      )}
    </g>
  );
}

export default function JourneyMap({ onClose }: { onClose: () => void }) {
  const trail = useMemo(buildTrail, []);
  const svgRef = useRef<SVGSVGElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);
  const [run, setRun] = useState(0);

  useLayoutEffect(() => {
    const svg = svgRef.current!;
    const q = gsap.utils.selector(svg);
    const feet = q("[data-foot]");
    const nodes = q("[data-node]");
    const rings = q("[data-ring]");
    const marker = q("[data-marker]")[0];

    gsap.set(feet, { opacity: 0, scale: 0.2, transformOrigin: "0 0" });
    gsap.set(nodes, { scale: 0, transformOrigin: "0 0" });
    gsap.set(rings, { opacity: 0 });
    gsap.set(marker, { opacity: 0, x: trail.feet[0].x, y: trail.feet[0].y });
    gsap.set(q("[data-trailpath]"), { opacity: 0.25 });
    setActive(0);
    setDone(false);

    const reveal = (i: number) => {
      setActive(i);
      gsap.to(nodes[i], { scale: 1, duration: 0.55, ease: "elastic.out(1.1, 0.4)" });
      gsap.fromTo(
        rings[i],
        { opacity: 0.9, attr: { r: 8 }, strokeWidth: 4 },
        { opacity: 0, attr: { r: 40 }, strokeWidth: 1, duration: 0.8, ease: "power2.out" },
      );
    };

    const prog = { v: 0 };
    let shown = -1;
    const place = () => {
      const i = Math.min(trail.feet.length - 1, Math.floor(prog.v));
      while (shown < i) {
        shown++;
        const f = trail.feet[shown];
        gsap.set(feet[shown], { x: f.x, y: f.y, rotation: f.rot });
        gsap.to(feet[shown], { opacity: 0.95, scale: 1, duration: 0.3, ease: "back.out(3)" });
      }
      const f = trail.feet[i];
      gsap.set(marker, { x: f.x, y: f.y });
    };

    const tl = gsap.timeline({
      delay: 0.5,
      onComplete: () => setDone(true),
    });
    tl.add(() => reveal(0));
    tl.set(marker, { opacity: 1 });
    for (let i = 1; i < NODES.length; i++) {
      const from = trail.nodeStep[i - 1];
      const to = trail.nodeStep[i];
      tl.fromTo(
        prog,
        { v: from },
        { v: to, duration: Math.max(0.4, (to - from) * 0.1), ease: "none", onUpdate: place, immediateRender: false },
        i === 1 ? "+=0.7" : "+=0.9",
      );
      tl.add(() => reveal(i));
    }
    tl.to(marker, { y: "-=6", repeat: 5, yoyo: true, duration: 0.15, ease: "steps(1)" });
    tlRef.current = tl;
    return () => {
      tl.kill();
      gsap.killTweensOf([...feet, ...nodes, ...rings, marker, svg]);
    };
  }, [trail, run]);

  const skip = () => {
    const tl = tlRef.current;
    if (!tl) return;
    tl.progress(1);
    setActive(NODES.length - 1);
    const svg = svgRef.current!;
    gsap.set(svg.querySelectorAll("[data-foot]"), { opacity: 0.95, scale: 1 });
    gsap.set(svg.querySelectorAll("[data-node]"), { scale: 1 });
    trail.feet.forEach((f, i) => gsap.set(svg.querySelectorAll("[data-foot]")[i], { x: f.x, y: f.y, rotation: f.rot }));
    const last = trail.feet[trail.feet.length - 1];
    gsap.set(svg.querySelector("[data-marker]"), { x: last.x, y: last.y, opacity: 1 });
    setDone(true);
  };

  const m = journey[active];

  return (
    <Overlay title="MAP — 나의 발자취" onClose={onClose} bg="#3a2a1a" width="min(960px, 96vw)">
      <div className="flex flex-col gap-4 p-3 sm:p-5">
        <div className="px-box parchment overflow-hidden" style={{ ["--bg" as string]: "#f3dfa2", ["--bd" as string]: "#5b3a1a" }}>
          <svg ref={svgRef} viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="mx-auto block h-auto max-h-[44vh] w-full" shapeRendering="crispEdges">
            <rect width={MAP_W} height={MAP_H} fill="none" stroke="#a16207" strokeWidth={6} opacity={0.35} />
            <Decor />
            <path data-trailpath d={trail.pathD} fill="none" stroke="#8a4a22" strokeWidth={3} strokeDasharray="2 8" />

            {trail.feet.map((f, i) => (
              <g key={i} data-foot>
                <Foot left={f.left} />
              </g>
            ))}

            {NODES.map(([x, y], i) => (
              <g key={i} transform={`translate(${x} ${y})`} onClick={() => done && setActive(i)} style={{ cursor: done ? "pointer" : "default" }}>
                <circle data-ring r={8} fill="none" stroke="#ef4444" />
                <g data-node>
                  <rect x={-17} y={-17} width={34} height={34} fill="#3b1d0a" />
                  <rect x={-14} y={-14} width={28} height={28} fill={i === active ? "#fde047" : "#f3dfa2"} />
                  <PixelIcon name={journey[i].icon} />
                  <rect x={-24} y={22} width={48} height={15} fill="#3b1d0a" />
                  <text y={34} textAnchor="middle" fontSize={11} fill="#fde68a" fontFamily="Galmuri9, monospace">
                    {journey[i].year}
                  </text>
                </g>
              </g>
            ))}

            {/* 歩く主人公のマーカー */}
            <g data-marker opacity={0}>
              <ellipse cx={0} cy={0} rx={9} ry={3} fill="#00000040" />
              <rect x={-6} y={-22} width={12} height={10} fill="#f7d1ac" stroke="#35507a" strokeWidth={1.5} />
              <rect x={-6} y={-22} width={12} height={4} fill="#6b4226" />
              <rect x={-5} y={-12} width={10} height={9} fill="#4f8df5" stroke="#35507a" strokeWidth={1.5} />
              <rect x={-5} y={-13} width={10} height={2} fill="#ef4444" />
            </g>
          </svg>
        </div>

        <div className="px-box flex flex-col gap-2 p-4 sm:flex-row sm:items-center" style={{ ["--bg" as string]: "#35507a" }}>
          <div className="min-w-0 flex-1" key={active}>
            <p className="text-xs text-yellow-300">
              {m.year} · {active + 1}/{journey.length}
            </p>
            <h3 className="mt-1 text-lg">{m.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-white/80">{m.desc}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            {!done && (
              <button className="px-btn ghost" onClick={skip}>
                SKIP ▶▶
              </button>
            )}
            {done && (
              <button className="px-btn" onClick={() => setRun((n) => n + 1)}>
                ↻ REPLAY
              </button>
            )}
          </div>
        </div>
        {done && <p className="text-center text-xs text-white/50">지도의 아이콘을 눌러 각 시기의 이야기를 볼 수 있어요</p>}
      </div>
    </Overlay>
  );
}
