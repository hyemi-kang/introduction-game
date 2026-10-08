"use client";

import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
  /** 閉じる前に呼ばれる（アニメ用） */
  bg?: string;
  hideFrame?: boolean;
}

/** 開閉アニメ付きのピクセル窓。Esc で閉じる */
export default function Overlay({ title, onClose, children, width = "min(920px, 94vw)", bg }: Props) {
  const backRef = useRef<HTMLDivElement>(null);
  const winRef = useRef<HTMLDivElement>(null);
  const closing = useRef(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(backRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(
        winRef.current,
        { scale: 0.4, y: 60, opacity: 0, rotate: -3 },
        { scale: 1, y: 0, opacity: 1, rotate: 0, duration: 0.55, ease: "back.out(1.7)" },
      );
    });
    return () => ctx.revert();
  }, []);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    gsap
      .timeline({ onComplete: onClose })
      .to(winRef.current, { scale: 0.5, y: 40, opacity: 0, rotate: 3, duration: 0.28, ease: "power2.in" }, 0)
      .to(backRef.current, { opacity: 0, duration: 0.28 }, 0);
  }, [onClose]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [close]);

  return (
    <div
      ref={backRef}
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#6cb8f0]/55 p-3 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={winRef}
        className="px-box flex max-h-[92vh] flex-col"
        style={{ width, ["--bg" as string]: bg ?? "#4a86d6" }}
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3 border-b-4 border-[#e8a556]/70 bg-[linear-gradient(#ffcf6b,#f7a93a)] px-4 py-2">
          <h2 className="text-sm tracking-widest text-[#5a3416]">▶ {title}</h2>
          <button className="px-btn red" onClick={close} aria-label="닫기 (Esc)">
            ✕ ESC
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
