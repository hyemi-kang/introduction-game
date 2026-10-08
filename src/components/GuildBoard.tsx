"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { Quest, quests } from "@/data/profile";
import Overlay from "./Overlay";
import { ShotGallery, ShotView } from "./QuestShots";

const TILT = [-3, 2.2, -1.4, 3, -2.4, 1.6];
const RANK_COLOR: Record<Quest["rank"], string> = { S: "#a855f7", A: "#ef4444", B: "#3b82f6", C: "#22c55e" };

const TORN = "polygon(0 0,100% 0,100% 96%,92% 100%,84% 96%,76% 100%,68% 96%,60% 100%,52% 96%,44% 100%,36% 96%,28% 100%,20% 96%,12% 100%,4% 96%,0 100%)";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function GuildBoard({ onClose }: { onClose: () => void }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const detailRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<number | null>(null);
  const fromRect = useRef<Rect>({ left: 0, top: 0, width: 0, height: 0 });
  const busy = useRef(false);

  // 入場アニメ: 紙が上から落ちて貼られる
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(paperRefs.current.filter(Boolean), { rotation: (i: number) => TILT[i % TILT.length] });
      gsap.from(paperRefs.current.filter(Boolean), {
        y: -420,
        rotation: () => gsap.utils.random(-35, 35),
        opacity: 0,
        duration: 0.9,
        ease: "bounce.out",
        stagger: 0.13,
        delay: 0.45,
      });
      gsap.from("[data-pin]", { scale: 0, duration: 0.25, ease: "back.out(4)", stagger: 0.13, delay: 1.1 });
      gsap.from("[data-sign]", { y: -60, opacity: 0, duration: 0.7, ease: "elastic.out(1,0.5)", delay: 0.3 });
    }, boardRef);
    return () => ctx.revert();
  }, []);

  const targetRect = (): Rect => {
    const b = boardRef.current!.getBoundingClientRect();
    const w = Math.min(560, b.width - 24);
    return { left: (b.width - w) / 2, top: 12, width: w, height: b.height - 24 };
  };

  const open = (i: number) => {
    if (busy.current || sel !== null) return;
    busy.current = true;
    const el = paperRefs.current[i]!;
    const b = boardRef.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    fromRect.current = { left: r.left - b.left, top: r.top - b.top, width: r.width, height: r.height };
    setSel(i);
  };

  useLayoutEffect(() => {
    if (sel === null) return;
    const el = paperRefs.current[sel]!;
    const d = detailRef.current!;
    const to = targetRect();
    const others = paperRefs.current.filter((_, i) => i !== sel);
    gsap.set(el, { visibility: "hidden" });
    gsap
      .timeline({ onComplete: () => (busy.current = false) })
      .to(others, { opacity: 0.25, scale: 0.94, duration: 0.3 }, 0)
      .fromTo(
        d,
        { ...fromRect.current, rotation: TILT[sel % TILT.length], opacity: 1 },
        { ...to, rotation: 0, duration: 0.55, ease: "back.out(1.3)" },
        0,
      )
      .fromTo(contentRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }, 0.3)
      .from("[data-reveal]", { opacity: 0, x: -14, stagger: 0.07, duration: 0.3 }, 0.4);
  }, [sel]);

  const closeDetail = () => {
    if (busy.current || sel === null) return;
    busy.current = true;
    const el = paperRefs.current[sel]!;
    const others = paperRefs.current.filter((_, i) => i !== sel);
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(el, { visibility: "visible" });
          busy.current = false;
          setSel(null);
        },
      })
      .to(contentRef.current, { opacity: 0, duration: 0.15 }, 0)
      .to(detailRef.current, { ...fromRect.current, rotation: TILT[sel % TILT.length], duration: 0.4, ease: "power3.inOut" }, 0)
      .to(others, { opacity: 1, scale: 1, duration: 0.3 }, 0.15);
  };

  const hover = (i: number, on: boolean) => {
    if (sel !== null) return;
    const el = paperRefs.current[i];
    if (!el) return;
    gsap.to(el, { y: on ? -8 : 0, scale: on ? 1.05 : 1, rotation: on ? 0 : TILT[i % TILT.length], duration: 0.2, overwrite: "auto" });
  };

  const q = sel !== null ? quests[sel] : null;

  return (
    <Overlay title="QUEST BOARD — 길드 게시판" onClose={onClose} bg="#3a2a1a" width="min(980px, 96vw)">
      <div ref={boardRef} className="wood relative m-3 min-h-[560px] overflow-hidden p-5 pt-16 sm:m-5" style={{ boxShadow: "inset 0 0 0 6px #5b3a1a, inset 0 0 40px rgba(0,0,0,.45)" }}>
        <div
          data-sign
          className="absolute left-1/2 top-3 -translate-x-1/2 border-4 border-[#35507a] bg-[#7c4a1e] px-5 py-1 text-sm tracking-widest text-yellow-200"
        >
          ★ QUESTS ★
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
          {quests.map((qq, i) => (
            <button
              key={qq.id}
              ref={(el) => {
                paperRefs.current[i] = el;
              }}
              onClick={() => open(i)}
              onPointerEnter={() => hover(i, true)}
              onPointerLeave={() => hover(i, false)}
              className="relative flex min-h-[200px] flex-col gap-2 border-0 p-4 pt-6 text-left text-[#3b1d0a]"
              style={{ background: qq.color, clipPath: TORN }}
              aria-label={`${qq.title} 퀘스트 열기`}
            >
              <span data-pin className="absolute left-1/2 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-red-600 shadow-[0_2px_0_#7f1d1d,inset_-2px_-2px_0_#991b1b]" />
              <div className="flex items-center justify-between">
                <span className="grid h-7 w-7 place-items-center text-sm font-bold text-white" style={{ background: RANK_COLOR[qq.rank], boxShadow: "0 3px 0 rgba(0,0,0,.35)" }}>
                  {qq.rank}
                </span>
                <span
                  className="-rotate-6 border-2 px-1 text-[10px] font-bold"
                  style={{ color: qq.status === "CLEAR" ? "#15803d" : "#b45309", borderColor: qq.status === "CLEAR" ? "#15803d" : "#b45309" }}
                >
                  {qq.status}
                </span>
              </div>
              <ShotView shot={qq.shots[0]} quest={qq} className="aspect-video w-full border-2 border-[#3b1d0a]/70" />
              <h3 className="text-sm leading-snug">{qq.title}</h3>
              <p className="line-clamp-1 text-[11px] leading-snug opacity-70">{qq.summary}</p>
              <div className="mt-auto flex flex-wrap gap-1">
                {qq.tags.slice(0, 3).map((t) => (
                  <span key={t} className="bg-black/10 px-1 text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        {q && (
          <div
            ref={detailRef}
            className="absolute z-10 overflow-auto text-[#3b1d0a]"
            style={{ background: q.color, boxShadow: "10px 12px 0 rgba(0,0,0,.45), 0 0 0 4px #3b1d0a" }}
          >
            <div ref={contentRef} className="flex min-h-full flex-col gap-3 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center text-xl font-bold text-white" style={{ background: RANK_COLOR[q.rank], boxShadow: "0 4px 0 rgba(0,0,0,.35)" }}>
                    {q.rank}
                  </span>
                  <div>
                    <p className="text-[11px] opacity-60">QUEST RANK {q.rank}</p>
                    <h3 className="text-xl leading-tight">{q.title}</h3>
                  </div>
                </div>
                <button className="px-btn red shrink-0" onClick={closeDetail}>
                  ← 돌아가기
                </button>
              </div>

              <div data-reveal className="flex flex-wrap gap-x-5 gap-y-1 border-y-2 border-dashed border-[#3b1d0a]/40 py-2 text-xs">
                <span>📅 {q.period}</span>
                <span>🛡 {q.role}</span>
                <span style={{ color: q.status === "CLEAR" ? "#15803d" : "#b45309" }}>● {q.status}</span>
              </div>

              <p data-reveal className="text-sm leading-relaxed">
                {q.summary}
              </p>

              <ShotGallery key={q.id} quest={q} />

              <ul className="flex flex-col gap-1 text-sm">
                {q.details.map((dt) => (
                  <li data-reveal key={dt} className="flex gap-2">
                    <span className="text-red-700">◆</span>
                    {dt}
                  </li>
                ))}
              </ul>

              <div data-reveal className="flex flex-wrap gap-1.5">
                {q.tags.map((t) => (
                  <span key={t} className="bg-[#3b1d0a] px-2 py-0.5 text-[11px] text-yellow-200">
                    {t}
                  </span>
                ))}
              </div>

              {q.link && (
                <a data-reveal href={q.link.href} target="_blank" rel="noreferrer" className="px-btn mt-auto self-start no-underline">
                  ▶ {q.link.label}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </Overlay>
  );
}
