"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef } from "react";

export const CONTROLS: [string, string][] = [
  ["← →  /  A D", "이동"],
  ["SPACE", "점프 (↓+SPACE: 내려가기)"],
  ["Z  /  X", "공격"],
  ["↑  /  E", "들어가기 · 조사하기"],
  ["M", "소리 on/off"],
];

const ROWS: { keys: string[]; label: string }[] = [
  { keys: ["←", "→"], label: "이동" },
  { keys: ["Space"], label: "점프" },
  { keys: ["Z"], label: "공격" },
  { keys: ["↑"], label: "들어가기" },
];

/** 移動・ジャンプ・攻撃のどれかが押されたらヒントを消す */
const DISMISS = new Set(["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space", "KeyZ", "KeyX", "KeyJ", "KeyC"]);

/** 右下にうっすら出る操作ガイド。遊び始めると自然にフェードアウトする */
export default function ControlHint({ onDone }: { onDone?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const gone = useRef(false);

  useLayoutEffect(() => {
    gsap.fromTo(ref.current, { opacity: 0, y: 8 }, { opacity: 0.55, y: 0, duration: 1.2, delay: 0.6, ease: "power2.out" });
    return () => {
      gsap.killTweensOf(ref.current);
    };
  }, []);

  useEffect(() => {
    const dismiss = () => {
      if (gone.current) return;
      gone.current = true;
      gsap.to(ref.current, { opacity: 0, y: 6, duration: 1.2, delay: 0.4, ease: "power1.inOut", overwrite: true, onComplete: onDone });
    };
    const key = (e: KeyboardEvent) => {
      if (DISMISS.has(e.code)) dismiss();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", dismiss);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", dismiss);
    };
  }, [onDone]);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute bottom-[34px] right-3 z-10 flex flex-col items-end gap-1.5 text-[11px] text-white sm:bottom-10 sm:right-4"
      style={{ opacity: 0, textShadow: "0 1px 2px rgba(60,40,20,.55)" }}
    >
      {ROWS.map((r) => (
        <div key={r.label} className="flex items-center gap-1.5">
          <span className="opacity-90">{r.label}</span>
          {r.keys.map((k) => (
            <kbd key={k} className="keycap">
              {k}
            </kbd>
          ))}
        </div>
      ))}
    </div>
  );
}
